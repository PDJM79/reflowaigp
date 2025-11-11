import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { practiceId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather comprehensive compliance data
    const [
      { data: tasks },
      { data: policies },
      { data: incidents },
      { data: fireAssessments },
      { data: ipcActions },
      { data: training },
      { data: dbsChecks },
      { data: complaints },
      { data: employees },
    ] = await Promise.all([
      supabase.from('tasks').select('status, priority, due_at').eq('practice_id', practiceId),
      supabase.from('policy_documents').select('status, next_review_date').eq('practice_id', practiceId),
      supabase.from('incidents').select('severity, created_at').eq('practice_id', practiceId),
      supabase.from('fire_safety_assessments').select('assessment_date').eq('practice_id', practiceId).order('assessment_date', { ascending: false }).limit(1),
      supabase.from('ipc_actions').select('completed_at').eq('practice_id', practiceId),
      supabase.from('training_records').select('expiry_date, is_mandatory').eq('practice_id', practiceId),
      supabase.from('dbs_checks').select('next_review_due').eq('practice_id', practiceId),
      supabase.from('complaints').select('sla_status, severity').eq('practice_id', practiceId),
      supabase.from('employees').select('id').eq('practice_id', practiceId).is('end_date', null),
    ]);

    // Calculate metrics
    const taskCompletionRate = tasks?.length ? 
      Math.round((tasks.filter(t => t.status === 'complete').length / tasks.length) * 100) : 0;
    
    const overdueTasks = tasks?.filter(t => t.status !== 'complete' && new Date(t.due_at) < new Date()).length || 0;
    
    const activePolicies = policies?.filter(p => p.status === 'active').length || 0;
    const policiesNeedingReview = policies?.filter(p => {
      const reviewDate = new Date(p.next_review_date);
      return reviewDate <= new Date();
    }).length || 0;
    
    const criticalIncidents = incidents?.filter(i => i.severity === 'critical').length || 0;
    const recentIncidents = incidents?.filter(i => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return new Date(i.created_at) >= threeMonthsAgo;
    }).length || 0;
    
    const latestFireAssessment = fireAssessments?.[0]?.assessment_date;
    const fireAssessmentAge = latestFireAssessment ? 
      Math.floor((Date.now() - new Date(latestFireAssessment).getTime()) / (1000 * 60 * 60 * 24)) : 365;
    
    const ipcCompletionRate = ipcActions?.length ?
      Math.round((ipcActions.filter(a => a.completed_at).length / ipcActions.length) * 100) : 100;
    
    const staffCount = employees?.length || 0;
    const trainingCompliance = training?.length && staffCount ?
      Math.round((training.filter(t => !t.expiry_date || new Date(t.expiry_date) > new Date()).length / training.length) * 100) : 0;
    
    const dbsCompliance = dbsChecks?.length && staffCount ?
      Math.round((dbsChecks.filter(d => new Date(d.next_review_due) > new Date()).length / dbsChecks.length) * 100) : 0;
    
    const complaintsOnTrack = complaints?.filter(c => c.sla_status === 'on_track' || c.sla_status === 'completed').length || 0;
    const complaintsCompliance = complaints?.length ? 
      Math.round((complaintsOnTrack / complaints.length) * 100) : 100;

    const metricsData = {
      taskCompletionRate,
      overdueTasks,
      activePolicies,
      policiesNeedingReview,
      criticalIncidents,
      recentIncidents,
      fireAssessmentAge,
      ipcCompletionRate,
      trainingCompliance,
      dbsCompliance,
      complaintsCompliance,
      staffCount,
    };

    const systemPrompt = `You are an NHS regulatory compliance expert. Analyze the provided practice data and calculate compliance scores for three regulatory frameworks:

1. HIW (Healthcare Inspectorate Wales) - Focus on patient experience, safe care delivery, and management quality
2. CQC (Care Quality Commission) - Assess across Safe, Effective, Caring, Responsive, Well-led domains
3. QOF (Quality & Outcomes Framework) - Evaluate clinical indicators and quality improvement

Return percentage scores (0-100) for each framework with detailed breakdown and justification.`;

    const userPrompt = `Practice metrics:
- Task completion: ${taskCompletionRate}% (${overdueTasks} overdue)
- Active policies: ${activePolicies} (${policiesNeedingReview} need review)
- Incidents: ${recentIncidents} in last 3 months (${criticalIncidents} critical)
- Fire assessment: ${fireAssessmentAge} days old
- IPC completion: ${ipcCompletionRate}%
- Training compliance: ${trainingCompliance}%
- DBS compliance: ${dbsCompliance}%
- Complaints SLA compliance: ${complaintsCompliance}%
- Staff count: ${staffCount}

Calculate HIW, CQC, and QOF compliance scores with justifications.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'calculate_compliance',
            description: 'Calculate regulatory compliance scores',
            parameters: {
              type: 'object',
              properties: {
                hiw: {
                  type: 'object',
                  properties: {
                    overall_score: { type: 'number' },
                    patient_experience: { type: 'number' },
                    safe_effective_care: { type: 'number' },
                    management_leadership: { type: 'number' },
                    justification: { type: 'string' }
                  },
                  required: ['overall_score', 'patient_experience', 'safe_effective_care', 'management_leadership', 'justification']
                },
                cqc: {
                  type: 'object',
                  properties: {
                    overall_score: { type: 'number' },
                    safe: { type: 'number' },
                    effective: { type: 'number' },
                    caring: { type: 'number' },
                    responsive: { type: 'number' },
                    well_led: { type: 'number' },
                    justification: { type: 'string' }
                  },
                  required: ['overall_score', 'safe', 'effective', 'caring', 'responsive', 'well_led', 'justification']
                },
                qof: {
                  type: 'object',
                  properties: {
                    overall_score: { type: 'number' },
                    clinical_indicators: { type: 'number' },
                    public_health: { type: 'number' },
                    quality_improvement: { type: 'number' },
                    justification: { type: 'string' }
                  },
                  required: ['overall_score', 'clinical_indicators', 'public_health', 'quality_improvement', 'justification']
                }
              },
              required: ['hiw', 'cqc', 'qof']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'calculate_compliance' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Lovable AI credits depleted. Please top up your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    const scores = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (!scores) {
      throw new Error('No scores returned from AI');
    }

    return new Response(
      JSON.stringify({ scores, metrics: metricsData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-compliance-scores:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
