import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { ApprovalRequestedEmail } from "./_templates/approval-requested-email.tsx";
import { ApprovalCompletedEmail } from "./_templates/approval-completed-email.tsx";
import { getUsersWithCapability } from "../_shared/capabilities.ts";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequestPayload {
  type: "request";
  practiceId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  requestedById: string;
  requestedByName: string;
  urgency?: "high" | "medium" | "low";
}

interface ApprovalCompletedPayload {
  type: "completed";
  practiceId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  decision: "approved" | "rejected" | "pending_changes";
  approverName: string;
  approverTitle?: string;
  notes?: string;
  ownerId: string;
  ownerName: string;
}

type EmailPayload = ApprovalRequestPayload | ApprovalCompletedPayload;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: EmailPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    // Get practice details
    const { data: practice } = await supabase
      .from("practices")
      .select("name")
      .eq("id", payload.practiceId)
      .single();

    const practiceName = practice?.name || "GP Practice";
    const baseUrl = Deno.env.get("APP_URL") || "https://lovable.dev";

    if (payload.type === "request") {
      return await handleApprovalRequest(supabase, payload, practiceName, baseUrl);
    } else if (payload.type === "completed") {
      return await handleApprovalCompleted(supabase, payload, practiceName, baseUrl);
    }

    return new Response(
      JSON.stringify({ error: "Invalid payload type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-governance-approval-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleApprovalRequest(
  supabase: any,
  payload: ApprovalRequestPayload,
  practiceName: string,
  baseUrl: string
) {
  // Find all users with approve_governance capability
  const approvers = await getUsersWithCapability(supabase, payload.practiceId, 'approve_governance');

  if (approvers.length === 0) {
    console.log("No users with approve_governance capability found, skipping email");
    return new Response(
      JSON.stringify({ success: true, emailsSent: 0, notificationsCreated: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get pending approval count for context
  const { count: pendingCount } = await supabase
    .from("governance_approvals")
    .select("*", { count: "exact", head: true })
    .eq("practice_id", payload.practiceId)
    .eq("decision", "pending");

  let emailsSent = 0;
  let notificationsCreated = 0;
  const dashboardUrl = `${baseUrl}/dashboards/governance`;

  for (const approver of approvers) {
    // Check notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_frequency, policy_reminders")
      .eq("user_id", approver.id)
      .single();

    const shouldSendEmail = !prefs || prefs.email_frequency !== "none";

    // Send email if allowed
    if (shouldSendEmail && approver.email) {
      try {
        const html = await renderAsync(
          React.createElement(ApprovalRequestedEmail, {
            managerName: approver.name || "Approver",
            entityType: payload.entityType,
            entityName: payload.entityName,
            requestedByName: payload.requestedByName,
            urgency: payload.urgency || "medium",
            practiceName,
            dashboardUrl,
            pendingCount: (pendingCount || 0) + 1,
          })
        );

        const { error: emailError } = await resend.emails.send({
          from: "GP Compliance <notifications@resend.dev>",
          to: [approver.email],
          subject: `Approval Required: ${payload.entityName}`,
          html,
        });

        if (emailError) {
          console.error(`Failed to send email to ${approver.email}:`, emailError);
        } else {
          emailsSent++;
          console.log(`Email sent to ${approver.email}`);

          // Log email
          await supabase.from("email_logs").insert({
            practice_id: payload.practiceId,
            email_type: "governance_approval_request",
            recipient_email: approver.email,
            recipient_name: approver.name,
            subject: `Approval Required: ${payload.entityName}`,
            status: "sent",
            metadata: {
              entity_type: payload.entityType,
              entity_id: payload.entityId,
              entity_name: payload.entityName,
            },
          });
        }
      } catch (emailErr) {
        console.error(`Email error for ${approver.email}:`, emailErr);
      }
    }

    // Create in-app notification
    const { error: notifError } = await supabase.from("notifications").insert({
      practice_id: payload.practiceId,
      user_id: approver.id,
      title: "Approval Required",
      message: `${payload.entityName} requires your sign-off`,
      notification_type: "governance_approval_request",
      related_entity_type: payload.entityType,
      related_entity_id: payload.entityId,
      priority: payload.urgency === "high" ? "high" : "medium",
      action_url: "/dashboards/governance",
    });

    if (notifError) {
      console.error(`Failed to create notification for ${approver.id}:`, notifError);
    } else {
      notificationsCreated++;
    }
  }

  console.log(`Approval request: ${emailsSent} emails sent, ${notificationsCreated} notifications created`);

  return new Response(
    JSON.stringify({ success: true, emailsSent, notificationsCreated }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleApprovalCompleted(
  supabase: any,
  payload: ApprovalCompletedPayload,
  practiceName: string,
  baseUrl: string
) {
  // Get owner details
  const { data: owner } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("id", payload.ownerId)
    .single();

  if (!owner) {
    console.log("Owner not found, skipping notification");
    return new Response(
      JSON.stringify({ success: true, emailsSent: 0, notificationsCreated: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let emailsSent = 0;
  let notificationsCreated = 0;

  // Build view URL based on entity type
  const viewUrlMap: Record<string, string> = {
    policy: `/policies`,
    fire_safety_assessment: `/fire-safety`,
    ipc_audit: `/ipc`,
    room_assessment: `/room-assessments`,
    claim_run: `/claims`,
  };
  const viewUrl = `${baseUrl}${viewUrlMap[payload.entityType] || "/dashboard"}`;

  // Check notification preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("email_frequency")
    .eq("user_id", owner.id)
    .single();

  const shouldSendEmail = !prefs || prefs.email_frequency !== "none";

  // Send email if allowed
  if (shouldSendEmail && owner.email) {
    try {
      const html = await renderAsync(
        React.createElement(ApprovalCompletedEmail, {
          ownerName: owner.full_name || payload.ownerName,
          entityType: payload.entityType,
          entityName: payload.entityName,
          decision: payload.decision,
          approverName: payload.approverName,
          approverTitle: payload.approverTitle,
          notes: payload.notes,
          approvedAt: new Date().toISOString(),
          practiceName,
          viewUrl,
        })
      );

      const decisionLabel = payload.decision === "approved" 
        ? "Approved" 
        : payload.decision === "rejected" 
          ? "Rejected" 
          : "Changes Requested";

      const { error: emailError } = await resend.emails.send({
        from: "GP Compliance <notifications@resend.dev>",
        to: [owner.email],
        subject: `${decisionLabel}: ${payload.entityName}`,
        html,
      });

      if (emailError) {
        console.error(`Failed to send email to ${owner.email}:`, emailError);
      } else {
        emailsSent++;
        console.log(`Email sent to ${owner.email}`);

        // Log email
        await supabase.from("email_logs").insert({
          practice_id: payload.practiceId,
          email_type: "governance_approval_completed",
          recipient_email: owner.email,
          recipient_name: owner.full_name,
          subject: `${decisionLabel}: ${payload.entityName}`,
          status: "sent",
          metadata: {
            entity_type: payload.entityType,
            entity_id: payload.entityId,
            entity_name: payload.entityName,
            decision: payload.decision,
          },
        });
      }
    } catch (emailErr) {
      console.error(`Email error for ${owner.email}:`, emailErr);
    }
  }

  // Create in-app notification
  const decisionIcon = payload.decision === "approved" ? "✅" : payload.decision === "rejected" ? "❌" : "⚠️";
  const { error: notifError } = await supabase.from("notifications").insert({
    practice_id: payload.practiceId,
    user_id: owner.id,
    title: `${decisionIcon} ${payload.decision === "approved" ? "Approved" : payload.decision === "rejected" ? "Rejected" : "Changes Requested"}`,
    message: `Your ${formatEntityType(payload.entityType)} "${payload.entityName}" has been ${payload.decision.replace("_", " ")}`,
    notification_type: "governance_approval_completed",
    related_entity_type: payload.entityType,
    related_entity_id: payload.entityId,
    priority: payload.decision === "rejected" ? "high" : "medium",
    action_url: viewUrlMap[payload.entityType] || "/dashboard",
  });

  if (notifError) {
    console.error(`Failed to create notification for ${owner.id}:`, notifError);
  } else {
    notificationsCreated++;
  }

  console.log(`Approval completed: ${emailsSent} emails sent, ${notificationsCreated} notifications created`);

  return new Response(
    JSON.stringify({ success: true, emailsSent, notificationsCreated }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function formatEntityType(type: string): string {
  const typeMap: Record<string, string> = {
    policy: "policy",
    fire_safety_assessment: "fire safety assessment",
    ipc_audit: "IPC audit",
    room_assessment: "room assessment",
    claim_run: "claim",
  };
  return typeMap[type] || type.replace(/_/g, " ");
}
