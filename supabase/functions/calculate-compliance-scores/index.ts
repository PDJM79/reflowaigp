// supabase/functions/calculate-compliance-scores/index.ts
// Calculates practice compliance and fit-for-audit scores
// Uses JWT auth - derives practice from user, never trusts client

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireJwtAndPractice } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') {
      return errorResponse(req, 'Method not allowed', 405);
    }

    // Authenticate and get practice from user record
    const ctx = await requireJwtAndPractice(req);
    console.log(`📊 Calculating scores for practice: ${ctx.practiceId}`);

    const supabase = createServiceClient();
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const body = await req.json().catch(() => ({}));
    const startDate = body?.startDate ?? null;
    const endDate = body?.endDate ?? null;

    // Gather comprehensive compliance data using derived practice ID
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
      supabase.from('tasks').select('status, priority, due_at, completed_at').eq('practice_id', ctx.practiceId),
      supabase.from('policy_documents').select('status, next_review_date').eq('practice_id', ctx.practiceId),
      supabase.from('incidents').select('severity, created_at').eq('practice_id', ctx.practiceId),
      supabase.from('fire_safety_assessments').select('assessment_date').eq('practice_id', ctx.practiceId).order('assessment_date', { ascending: false }).limit(1),
      supabase.from('ipc_actions').select('completed_at').eq('practice_id', ctx.practiceId),
      supabase.from('training_records').select('expiry_date, is_mandatory').eq('practice_id', ctx.practiceId),
      supabase.from('dbs_checks').select('next_review_due').eq('practice_id', ctx.practiceId),
      supabase.from('complaints').select('status, ack_sent_at, final_sent_at, ack_due, final_due').eq('practice_id', ctx.practiceId),
      supabase.from('employees').select('id').eq('practice_id', ctx.practiceId).is('end_date', null),
    ]);

    // Calculate task-based compliance metrics
    const now = new Date();
    const totalTasks = tasks?.length ?? 0;
    const completedTasks = tasks?.filter(t => t.status === 'closed' || t.status === 'complete') ?? [];
    const taskCompletionRate = totalTasks > 0 
      ? Math.round((completedTasks.length / totalTasks) * 100) 
      : 0;
    
    const overdueTasks = tasks?.filter(t => 
      t.status !== 'closed' && t.status !== 'complete' && 
      t.due_at && new Date(t.due_at) < now
    ).length ?? 0;

    // Compliance score calculation (on-time = 1.0, late = 0.7, incomplete = 0)
    const completedOnTime = completedTasks.filter(t => 
      t.completed_at && t.due_at && new Date(t.completed_at) <= new Date(t.due_at)
    ).length;
    const completedLate = completedTasks.filter(t => 
      t.completed_at && t.due_at && new Date(t.completed_at) > new Date(t.due_at)
    ).length;
    
    const complianceScore = totalTasks > 0
      ? Math.round(((completedOnTime * 1.0 + completedLate * 0.7) / totalTasks) * 100)
      : 100;

    // Policy metrics
    const activePolicies = policies?.filter(p => p.status === 'active').length ?? 0;
    const policiesNeedingReview = policies?.filter(p => {
      const reviewDate = new Date(p.next_review_date);
      return reviewDate <= now;
    }).length ?? 0;
    
    // Incident metrics
    const criticalIncidents = incidents?.filter(i => i.severity === 'critical').length ?? 0;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentIncidents = incidents?.filter(i => new Date(i.created_at) >= threeMonthsAgo).length ?? 0;
    
    // Fire safety
    const latestFireAssessment = fireAssessments?.[0]?.assessment_date;
    const fireAssessmentAge = latestFireAssessment 
      ? Math.floor((Date.now() - new Date(latestFireAssessment).getTime()) / (1000 * 60 * 60 * 24)) 
      : 365;
    
    // IPC
    const ipcCompletionRate = ipcActions?.length
      ? Math.round((ipcActions.filter(a => a.completed_at).length / ipcActions.length) * 100)
      : 100;
    
    // Training & DBS
    const staffCount = employees?.length ?? 0;
    const trainingCompliance = training?.length && staffCount
      ? Math.round((training.filter(t => !t.expiry_date || new Date(t.expiry_date) > now).length / training.length) * 100)
      : 0;
    
    const dbsCompliance = dbsChecks?.length && staffCount
      ? Math.round((dbsChecks.filter(d => new Date(d.next_review_due) > now).length / dbsChecks.length) * 100)
      : 0;
    
    // Complaints SLA
    const complaintsOnTrack = complaints?.filter(c => 
      c.status === 'resolved' || 
      (c.ack_sent_at && new Date(c.ack_sent_at) <= new Date(c.ack_due))
    ).length ?? 0;
    const complaintsCompliance = complaints?.length 
      ? Math.round((complaintsOnTrack / complaints.length) * 100) 
      : 100;

    const metricsData = {
      complianceScore,
      taskCompletionRate,
      completedOnTime,
      completedLate,
      overdueTasks,
      totalTasks,
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

    // AI-powered regulatory scoring
    const systemPrompt = `You are an NHS regulatory compliance expert. Analyze the provided practice data and calculate compliance scores for three regulatory frameworks:

1. HIW (Healthcare Inspectorate Wales) - Focus on patient experience, safe care delivery, and management quality
2. CQC (Care Quality Commission) - Assess across Safe, Effective, Caring, Responsive, Well-led domains
3. QOF (Quality & Outcomes Framework) - Evaluate clinical indicators and quality improvement

Return percentage scores (0-100) for each framework with detailed breakdown and justification.`;

    const userPrompt = `Practice metrics:
- Task completion: ${taskCompletionRate}% (${overdueTasks} overdue, ${completedOnTime} on-time, ${completedLate} late)
- Compliance score: ${complianceScore}%
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
        return errorResponse(req, 'Rate limit exceeded. Please try again later.', 429);
      }
      if (aiResponse.status === 402) {
        return errorResponse(req, 'Lovable AI credits depleted. Please top up your workspace.', 402);
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    const scores = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (!scores) {
      throw new Error('No scores returned from AI');
    }

    console.log(`✅ Scores calculated for practice ${ctx.practiceId}`);

    return jsonResponse(req, { 
      ok: true, 
      scores, 
      metrics: metricsData,
      practiceId: ctx.practiceId,
    });

  } catch (e) {
    console.error('❌ calculate-compliance-scores error:', e);
    return errorResponse(req, String(e?.message ?? e), 400);
  }
});
