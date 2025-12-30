import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateBaselineRequest {
  practiceId: string;
  baselineName: string;
  startDate: string;
  endDate: string;
  documentIds?: string[];
  rebaselineReason?: string;
  replacesBaselineId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CreateBaselineRequest = await req.json();
    const { practiceId, baselineName, startDate, endDate, documentIds, rebaselineReason, replacesBaselineId } = body;

    console.log("Creating baseline for practice:", practiceId, "from", startDate, "to", endDate);

    // Calculate scores from existing data within the date range
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch metrics for the date range
    const [tasksResult, policiesResult, incidentsResult, fridgeResult, ipcResult, complaintsResult] = await Promise.all([
      serviceClient.from("tasks").select("*").eq("practice_id", practiceId).gte("due_at", startDate).lte("due_at", endDate),
      serviceClient.from("policy_documents").select("*").eq("practice_id", practiceId),
      serviceClient.from("incidents").select("*").eq("practice_id", practiceId).gte("incident_date", startDate).lte("incident_date", endDate),
      serviceClient.from("fridge_temp_logs").select("*").eq("practice_id", practiceId).gte("log_date", startDate).lte("log_date", endDate),
      serviceClient.from("ipc_audits").select("*").eq("practice_id", practiceId).gte("audit_date", startDate).lte("audit_date", endDate),
      serviceClient.from("complaints").select("*").eq("practice_id", practiceId).gte("received_at", startDate).lte("received_at", endDate),
    ]);

    const tasks = tasksResult.data || [];
    const policies = policiesResult.data || [];
    const incidents = incidentsResult.data || [];
    const fridgeLogs = fridgeResult.data || [];
    const ipcAudits = ipcResult.data || [];
    const complaints = complaintsResult.data || [];

    // Calculate driver scores
    const driverDetails: Array<{ check_type: string; score: number; total: number; passed: number; impact: number }> = [];
    
    // Task completion score
    const completedTasks = tasks.filter((t: any) => t.status === "complete").length;
    const taskScore = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 100;
    driverDetails.push({
      check_type: "task_completion",
      score: Math.round(taskScore * 10) / 10,
      total: tasks.length,
      passed: completedTasks,
      impact: Math.round(taskScore * 0.25 * 10) / 10, // 25% weight
    });

    // Policy review score
    const activePolicies = policies.filter((p: any) => p.status === "active").length;
    const policyScore = policies.length > 0 ? (activePolicies / policies.length) * 100 : 100;
    driverDetails.push({
      check_type: "policy_review",
      score: Math.round(policyScore * 10) / 10,
      total: policies.length,
      passed: activePolicies,
      impact: Math.round(policyScore * 0.2 * 10) / 10, // 20% weight
    });

    // Fridge temp compliance
    const validFridgeLogs = fridgeLogs.filter((l: any) => l.temperature >= 2 && l.temperature <= 8).length;
    const fridgeScore = fridgeLogs.length > 0 ? (validFridgeLogs / fridgeLogs.length) * 100 : 100;
    driverDetails.push({
      check_type: "fridge_temp",
      score: Math.round(fridgeScore * 10) / 10,
      total: fridgeLogs.length,
      passed: validFridgeLogs,
      impact: Math.round(fridgeScore * 0.15 * 10) / 10, // 15% weight
    });

    // IPC compliance
    const passedIpc = ipcAudits.filter((a: any) => a.overall_result === "pass" || a.score >= 80).length;
    const ipcScore = ipcAudits.length > 0 ? (passedIpc / ipcAudits.length) * 100 : 100;
    driverDetails.push({
      check_type: "ipc_audits",
      score: Math.round(ipcScore * 10) / 10,
      total: ipcAudits.length,
      passed: passedIpc,
      impact: Math.round(ipcScore * 0.2 * 10) / 10, // 20% weight
    });

    // Incident management (inverse - fewer is better)
    const resolvedIncidents = incidents.filter((i: any) => i.status === "closed" || i.status === "resolved").length;
    const incidentScore = incidents.length > 0 ? (resolvedIncidents / incidents.length) * 100 : 100;
    driverDetails.push({
      check_type: "incident_management",
      score: Math.round(incidentScore * 10) / 10,
      total: incidents.length,
      passed: resolvedIncidents,
      impact: Math.round(incidentScore * 0.1 * 10) / 10, // 10% weight
    });

    // Complaint SLA adherence
    const slaMetComplaints = complaints.filter((c: any) => c.sla_status === "met" || c.ack_sent_at).length;
    const complaintScore = complaints.length > 0 ? (slaMetComplaints / complaints.length) * 100 : 100;
    driverDetails.push({
      check_type: "complaint_sla",
      score: Math.round(complaintScore * 10) / 10,
      total: complaints.length,
      passed: slaMetComplaints,
      impact: Math.round(complaintScore * 0.1 * 10) / 10, // 10% weight
    });

    // Calculate overall compliance score (weighted average)
    const complianceScore = driverDetails.reduce((sum, d) => sum + d.impact, 0);
    
    // Fit for audit score (stricter - deduct for any failures)
    let fitForAuditScore = complianceScore;
    const redFlags: Array<{ type: string; severity: string; description: string; confidence: number }> = [];

    // Check for red flags
    if (fridgeScore < 100) {
      const deduction = Math.round((100 - fridgeScore) * 0.1);
      fitForAuditScore -= deduction;
      redFlags.push({
        type: "fridge_temp_breach",
        severity: fridgeScore < 80 ? "high" : "medium",
        description: `${fridgeLogs.length - validFridgeLogs} fridge temperature readings out of range`,
        confidence: 0.95,
      });
    }

    if (incidents.filter((i: any) => i.severity === "major" || i.severity === "critical").length > 0) {
      fitForAuditScore -= 10;
      redFlags.push({
        type: "major_incident",
        severity: "high",
        description: "Major or critical incidents recorded during period",
        confidence: 1.0,
      });
    }

    if (complaints.filter((c: any) => c.sla_status === "breached").length > 0) {
      fitForAuditScore -= 5;
      redFlags.push({
        type: "sla_breach",
        severity: "medium",
        description: "Complaint SLA breaches detected",
        confidence: 1.0,
      });
    }

    fitForAuditScore = Math.max(0, Math.min(100, fitForAuditScore));

    // Get document hashes if any
    let sourceDocumentHashes: string[] = [];
    if (documentIds && documentIds.length > 0) {
      const { data: docs } = await serviceClient
        .from("baseline_documents")
        .select("file_hash")
        .in("id", documentIds);
      sourceDocumentHashes = (docs || []).map((d: any) => d.file_hash);
    }

    // If rebaselining, mark old baseline as superseded
    if (replacesBaselineId) {
      await serviceClient
        .from("baseline_snapshots")
        .update({ status: "superseded" })
        .eq("id", replacesBaselineId);
    }

    // Create the baseline snapshot
    const { data: baseline, error: insertError } = await serviceClient
      .from("baseline_snapshots")
      .insert({
        practice_id: practiceId,
        baseline_name: baselineName || "Baseline",
        start_date: startDate,
        end_date: endDate,
        compliance_score: Math.round(complianceScore * 10) / 10,
        fit_for_audit_score: Math.round(fitForAuditScore * 10) / 10,
        driver_details: driverDetails,
        red_flags: redFlags,
        source_document_hashes: sourceDocumentHashes,
        created_by: user.id,
        replaces_baseline_id: replacesBaselineId || null,
        rebaseline_reason: rebaselineReason || null,
        model_version: "1.0",
        pipeline_version: "1.0",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating baseline:", insertError);
      throw insertError;
    }

    console.log("Baseline created:", baseline.id);

    return new Response(JSON.stringify({ baseline }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
