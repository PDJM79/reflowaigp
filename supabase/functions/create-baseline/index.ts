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

    // If no documents uploaded, baseline is zero for all metrics
    const hasDocuments = documentIds && documentIds.length > 0;
    
    let driverDetails: Array<{ check_type: string; score: number; total: number; passed: number; impact: number }> = [];
    let complianceScore = 0;
    let fitForAuditScore = 0;
    let redFlags: Array<{ type: string; severity: string; description: string; confidence: number }> = [];
    let sourceDocumentHashes: string[] = [];

    if (hasDocuments) {
      // Calculate scores from uploaded documents
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Get document hashes
      const { data: docs } = await serviceClient
        .from("baseline_documents")
        .select("file_hash, extracted_data")
        .in("id", documentIds);
      
      sourceDocumentHashes = (docs || []).map((d: any) => d.file_hash);

      // Extract metrics from processed documents
      const extractedMetrics = (docs || [])
        .filter((d: any) => d.extracted_data?.metrics)
        .flatMap((d: any) => d.extracted_data.metrics);

      // Build driver details from extracted data
      const checkTypes = ['task_completion', 'policy_review', 'fridge_temp', 'ipc_audits', 'incident_management', 'complaint_sla'];
      const weights = { task_completion: 0.25, policy_review: 0.2, fridge_temp: 0.15, ipc_audits: 0.2, incident_management: 0.1, complaint_sla: 0.1 };

      for (const checkType of checkTypes) {
        const metric = extractedMetrics.find((m: any) => m.name === checkType);
        const score = metric?.value || 0;
        const weight = weights[checkType as keyof typeof weights];
        
        driverDetails.push({
          check_type: checkType,
          score: Math.round(score * 10) / 10,
          total: metric?.total || 0,
          passed: metric?.passed || 0,
          impact: Math.round(score * weight * 10) / 10,
        });
      }

      complianceScore = driverDetails.reduce((sum, d) => sum + d.impact, 0);
      fitForAuditScore = complianceScore;

      // Check for red flags from document analysis
      for (const doc of docs || []) {
        if (doc.extracted_data?.red_flags) {
          redFlags.push(...doc.extracted_data.red_flags);
        }
      }

      // Apply red flag deductions to fit for audit score
      if (redFlags.some((f: any) => f.severity === 'high')) {
        fitForAuditScore -= 10;
      }
      if (redFlags.some((f: any) => f.type === 'sla_breach')) {
        fitForAuditScore -= 5;
      }
      fitForAuditScore = Math.max(0, Math.min(100, fitForAuditScore));
    } else {
      // No documents = zero baseline for all metrics
      console.log("No documents uploaded - creating zero baseline");
      
      const checkTypes = ['task_completion', 'policy_review', 'fridge_temp', 'ipc_audits', 'incident_management', 'complaint_sla'];
      for (const checkType of checkTypes) {
        driverDetails.push({
          check_type: checkType,
          score: 0,
          total: 0,
          passed: 0,
          impact: 0,
        });
      }
      
      complianceScore = 0;
      fitForAuditScore = 0;
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
