import React from 'npm:react@18.3.1';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { MFAChangeEmail } from './_templates/mfa-change-email.tsx';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  action: 'enabled' | 'disabled';
  actorId: string;
  isSelf: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { userId, action, actorId, isSelf }: NotificationRequest = await req.json();

    if (!userId || !action || !actorId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending MFA ${action} notification for user ${userId}`);

    // Get target user's email
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, name, practice_id")
      .eq("id", userId)
      .single();

    if (userError || !targetUser?.email) {
      console.error("Target user error:", userError);
      return new Response(
        JSON.stringify({ error: "User not found or has no email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get actor's name if not self
    let actorName = "You";
    if (!isSelf) {
      const { data: actor } = await supabaseAdmin
        .from("users")
        .select("name, email")
        .eq("id", actorId)
        .single();
      
      actorName = actor?.name || actor?.email || "An administrator";
    }

    // Format timestamp
    const timestamp = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Europe/London',
    }).format(new Date());

    // Render the email template
    const html = await renderAsync(
      React.createElement(MFAChangeEmail, {
        userName: targetUser.name || '',
        userEmail: targetUser.email,
        action,
        changedBy: actorName,
        isSelf,
        timestamp,
      })
    );

    // Send the email
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'ReflowAI GP <security@resend.dev>',
      to: [targetUser.email],
      subject: `🔐 Two-Factor Authentication ${action === 'enabled' ? 'Enabled' : 'Disabled'} on Your Account`,
      html,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      throw emailError;
    }

    console.log(`MFA notification email sent successfully: ${emailResult?.id}`);

    // Log the email in email_logs
    await supabaseAdmin.from("email_logs").insert({
      practice_id: targetUser.practice_id,
      email_type: "mfa_change_notification",
      recipient_email: targetUser.email,
      recipient_name: targetUser.name,
      subject: `Two-Factor Authentication ${action === 'enabled' ? 'Enabled' : 'Disabled'}`,
      status: "sent",
      resend_email_id: emailResult?.id,
      metadata: {
        action,
        actor_id: actorId,
        is_self: isSelf,
      },
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-mfa-change-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
