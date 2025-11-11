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

    // Gather context about the practice
    const [
      { data: tasks },
      { data: incidents },
      { data: complaints },
      { data: fireActions },
      { data: ipcActions },
      { data: dbsChecks },
      { data: training },
    ] = await Promise.all([
      supabase.from('tasks').select('status, priority, due_at').eq('practice_id', practiceId).limit(50),
      supabase.from('incidents').select('severity, incident_category').eq('practice_id', practiceId).limit(20),
      supabase.from('complaints').select('severity, sla_status').eq('practice_id', practiceId).limit(20),
      supabase.from('fire_safety_actions').select('severity, completed_at').eq('practice_id', practiceId).is('completed_at', null),
      supabase.from('ipc_actions').select('severity, completed_at').eq('practice_id', practiceId).is('completed_at', null),
      supabase.from('dbs_checks').select('next_review_due').eq('practice_id', practiceId),
      supabase.from('training_records').select('expiry_date, is_mandatory').eq('practice_id', practiceId),
    ]);

    // Calculate key metrics
    const overdueTasks = tasks?.filter(t => t.status !== 'complete' && new Date(t.due_at) < new Date()).length || 0;
    const criticalIncidents = incidents?.filter(i => i.severity === 'critical').length || 0;
    const overdueComplaints = complaints?.filter(c => c.sla_status === 'overdue').length || 0;
    const criticalFireActions = fireActions?.filter(a => a.severity === 'critical').length || 0;
    const dbsDueSoon = dbsChecks?.filter(d => {
      const dueDate = new Date(d.next_review_due);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      return dueDate <= sixMonthsFromNow;
    }).length || 0;
    const trainingExpiringSoon = training?.filter(t => {
      if (!t.expiry_date || !t.is_mandatory) return false;
      const expiry = new Date(t.expiry_date);
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
      return expiry <= ninetyDaysFromNow;
    }).length || 0;

    const contextSummary = {
      overdueTasks,
      criticalIncidents,
      overdueComplaints,
      openFireActions: fireActions?.length || 0,
      criticalFireActions,
      openIPCActions: ipcActions?.length || 0,
      dbsDueSoon,
      trainingExpiringSoon,
    };

    const systemPrompt = `You are an NHS practice management AI assistant. Based on the practice's current state, suggest 3-5 high-priority actionable tasks that would improve compliance, safety, or operational efficiency. Each suggestion should include a clear title, priority level (low/medium/high), and category.`;

    const userPrompt = `Current practice status:
- ${overdueTasks} overdue tasks
- ${criticalIncidents} critical incidents
- ${overdueComplaints} overdue complaints
- ${openFireActions} open fire safety actions (${criticalFireActions} critical)
- ${openIPCActions} open infection control actions
- ${dbsDueSoon} DBS checks due within 6 months
- ${trainingExpiringSoon} mandatory training certificates expiring within 90 days

Suggest 3-5 high-priority tasks to address the most urgent issues. Focus on compliance, patient safety, and regulatory readiness.`;

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
            name: 'suggest_tasks',
            description: 'Return 3-5 actionable task suggestions',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                      category: { type: 'string' },
                      reasoning: { type: 'string' }
                    },
                    required: ['title', 'priority', 'category', 'reasoning']
                  }
                }
              },
              required: ['suggestions']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_tasks' } }
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
    const suggestions = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (!suggestions) {
      throw new Error('No suggestions returned from AI');
    }

    return new Response(
      JSON.stringify({ ...suggestions, context: contextSummary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-tasks:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
