import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ComputeDeltaRequest {
  practiceId: string;
  baselineId: string;
  comparisonWindowDays?: number; // default 90 days
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

    const body: ComputeDeltaRequest = await req.json();
    const { practiceId, baselineId, comparisonWindowDays = 90 } = body;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the baseline
    const { data: baseline, error: baselineError } = await serviceClient
      .from("baseline_snapshots")
      .select("*")
      .eq("id", baselineId)
      .single();

    if (baselineError || !baseline) {
      return new Response(JSON.stringify({ error: "Baseline not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate current window dates
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - comparisonWindowDays);
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    console.log("Computing delta for practice:", practiceId, "baseline:", baselineId);
    console.log("Current window:", startDateStr, "to", endDateStr);

    // Fetch current metrics
    const [tasksResult, policiesResult, incidentsResult, fridgeResult, ipcResult, complaintsResult] = await Promise.all([
      serviceClient.from("tasks").select("*").eq("practice_id", practiceId).gte("due_at", startDateStr).lte("due_at", endDateStr),
      serviceClient.from("policy_documents").select("*").eq("practice_id", practiceId),
      serviceClient.from("incidents").select("*").eq("practice_id", practiceId).gte("incident_date", startDateStr).lte("incident_date", endDateStr),
      serviceClient.from("fridge_temp_logs").select("*").eq("practice_id", practiceId).gte("log_date", startDateStr).lte("log_date", endDateStr),
      serviceClient.from("ipc_audits").select("*").eq("practice_id", practiceId).gte("audit_date", startDateStr).lte("audit_date", endDateStr),
      serviceClient.from("complaints").select("*").eq("practice_id", practiceId).gte("received_at", startDateStr).lte("received_at", endDateStr),
    ]);

    const tasks = tasksResult.data || [];
    const policies = policiesResult.data || [];
    const incidents = incidentsResult.data || [];
    const fridgeLogs = fridgeResult.data || [];
    const ipcAudits = ipcResult.data || [];
    const complaints = complaintsResult.data || [];

    // Calculate current driver scores (same logic as create-baseline)
    const currentDriverDetails: Array<{ check_type: string; score: number; total: number; passed: number; impact: number }> = [];

    // Task completion
    const completedTasks = tasks.filter((t: any) => t.status === "complete").length;
    const taskScore = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 100;
    currentDriverDetails.push({
      check_type: "task_completion",
      score: Math.round(taskScore * 10) / 10,
      total: tasks.length,
      passed: completedTasks,
      impact: Math.round(taskScore * 0.25 * 10) / 10,
    });

    // Policy review
    const activePolicies = policies.filter((p: any) => p.status === "active").length;
    const policyScore = policies.length > 0 ? (activePolicies / policies.length) * 100 : 100;
    currentDriverDetails.push({
      check_type: "policy_review",
      score: Math.round(policyScore * 10) / 10,
      total: policies.length,
      passed: activePolicies,
      impact: Math.round(policyScore * 0.2 * 10) / 10,
    });

    // Fridge temp
    const validFridgeLogs = fridgeLogs.filter((l: any) => l.temperature >= 2 && l.temperature <= 8).length;
    const fridgeScore = fridgeLogs.length > 0 ? (validFridgeLogs / fridgeLogs.length) * 100 : 100;
    currentDriverDetails.push({
      check_type: "fridge_temp",
      score: Math.round(fridgeScore * 10) / 10,
      total: fridgeLogs.length,
      passed: validFridgeLogs,
      impact: Math.round(fridgeScore * 0.15 * 10) / 10,
    });

    // IPC
    const passedIpc = ipcAudits.filter((a: any) => a.overall_result === "pass" || a.score >= 80).length;
    const ipcScore = ipcAudits.length > 0 ? (passedIpc / ipcAudits.length) * 100 : 100;
    currentDriverDetails.push({
      check_type: "ipc_audits",
      score: Math.round(ipcScore * 10) / 10,
      total: ipcAudits.length,
      passed: passedIpc,
      impact: Math.round(ipcScore * 0.2 * 10) / 10,
    });

    // Incidents
    const resolvedIncidents = incidents.filter((i: any) => i.status === "closed" || i.status === "resolved").length;
    const incidentScore = incidents.length > 0 ? (resolvedIncidents / incidents.length) * 100 : 100;
    currentDriverDetails.push({
      check_type: "incident_management",
      score: Math.round(incidentScore * 10) / 10,
      total: incidents.length,
      passed: resolvedIncidents,
      impact: Math.round(incidentScore * 0.1 * 10) / 10,
    });

    // Complaints
    const slaMetComplaints = complaints.filter((c: any) => c.sla_status === "met" || c.ack_sent_at).length;
    const complaintScore = complaints.length > 0 ? (slaMetComplaints / complaints.length) * 100 : 100;
    currentDriverDetails.push({
      check_type: "complaint_sla",
      score: Math.round(complaintScore * 10) / 10,
      total: complaints.length,
      passed: slaMetComplaints,
      impact: Math.round(complaintScore * 0.1 * 10) / 10,
    });

    const currentComplianceScore = currentDriverDetails.reduce((sum, d) => sum + d.impact, 0);

    // Fit for audit (with deductions)
    let currentFitForAuditScore = currentComplianceScore;
    if (fridgeScore < 100) {
      currentFitForAuditScore -= Math.round((100 - fridgeScore) * 0.1);
    }
    if (incidents.filter((i: any) => i.severity === "major" || i.severity === "critical").length > 0) {
      currentFitForAuditScore -= 10;
    }
    if (complaints.filter((c: any) => c.sla_status === "breached").length > 0) {
      currentFitForAuditScore -= 5;
    }
    currentFitForAuditScore = Math.max(0, Math.min(100, currentFitForAuditScore));

    // Calculate deltas
    const complianceAbsolute = Math.round((currentComplianceScore - baseline.compliance_score) * 10) / 10;
    const compliancePercent = baseline.compliance_score !== 0
      ? Math.round((complianceAbsolute / baseline.compliance_score) * 100 * 10) / 10
      : 0;
    
    const fitAbsolute = Math.round((currentFitForAuditScore - baseline.fit_for_audit_score) * 10) / 10;
    const fitPercent = baseline.fit_for_audit_score !== 0
      ? Math.round((fitAbsolute / baseline.fit_for_audit_score) * 100 * 10) / 10
      : 0;

    // Calculate per-driver deltas and find top drivers
    const baselineDrivers = baseline.driver_details as Array<any>;
    const drivers: Array<{ check_type: string; impact: number; reason: string; baseline_score: number; current_score: number }> = [];

    for (const current of currentDriverDetails) {
      const baselineDriver = baselineDrivers.find((b: any) => b.check_type === current.check_type);
      if (baselineDriver) {
        const impact = Math.round((current.score - baselineDriver.score) * 10) / 10;
        if (impact !== 0) {
          const baselineRate = baselineDriver.total > 0 
            ? Math.round((baselineDriver.passed / baselineDriver.total) * 100) 
            : 100;
          const currentRate = current.total > 0 
            ? Math.round((current.passed / current.total) * 100) 
            : 100;
          
          drivers.push({
            check_type: current.check_type,
            impact,
            reason: `Pass rate ${impact > 0 ? 'improved' : 'decreased'} from ${baselineRate}% to ${currentRate}%`,
            baseline_score: baselineDriver.score,
            current_score: current.score,
          });
        }
      }
    }

    // Sort by absolute impact (top drivers)
    drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    const topDrivers = drivers.slice(0, 5);

    // Generate narrative
    let narrative = "";
    if (complianceAbsolute > 0) {
      narrative = `Since baseline (${baseline.start_date} – ${baseline.end_date}), your compliance score is up ${complianceAbsolute} pts`;
    } else if (complianceAbsolute < 0) {
      narrative = `Since baseline (${baseline.start_date} – ${baseline.end_date}), your compliance score is down ${Math.abs(complianceAbsolute)} pts`;
    } else {
      narrative = `Since baseline (${baseline.start_date} – ${baseline.end_date}), your compliance score is unchanged`;
    }

    if (topDrivers.length > 0 && topDrivers[0].impact !== 0) {
      const topDriver = topDrivers[0];
      const driverLabel = topDriver.check_type.replace(/_/g, " ");
      narrative += ` driven primarily by ${driverLabel} ${topDriver.impact > 0 ? 'improvement' : 'decline'}.`;
    } else {
      narrative += ".";
    }

    const result = {
      baseline_id: baselineId,
      baseline: {
        start: baseline.start_date,
        end: baseline.end_date,
        compliance_score: baseline.compliance_score,
        fit_for_audit_score: baseline.fit_for_audit_score,
      },
      current: {
        start: startDateStr,
        end: endDateStr,
        compliance_score: Math.round(currentComplianceScore * 10) / 10,
        fit_for_audit_score: Math.round(currentFitForAuditScore * 10) / 10,
      },
      delta: {
        compliance_absolute: complianceAbsolute,
        compliance_percent: compliancePercent,
        fit_for_audit_absolute: fitAbsolute,
        fit_for_audit_percent: fitPercent,
      },
      drivers: topDrivers,
      narrative,
    };

    return new Response(JSON.stringify(result), {
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
