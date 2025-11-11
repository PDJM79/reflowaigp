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
    const { practiceId, dateRange } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch complaints for the period
    const { data: complaints, error: complaintsError } = await supabase
      .from('complaints')
      .select('id, category, severity, description, outcome, received_date')
      .eq('practice_id', practiceId)
      .gte('received_date', dateRange.start)
      .lte('received_date', dateRange.end);

    if (complaintsError) {
      console.error('Error fetching complaints:', complaintsError);
      throw complaintsError;
    }

    if (!complaints || complaints.length === 0) {
      return new Response(
        JSON.stringify({ 
          themes: [], 
          sentiment: { positive: 0, neutral: 0, negative: 0 },
          insights: 'No complaints to analyze for this period.',
          recommendations: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare complaint data for AI analysis
    const complaintSummary = complaints.map(c => ({
      category: c.category,
      severity: c.severity,
      description: c.description?.substring(0, 500), // Limit length
    }));

    const systemPrompt = `You are an NHS complaints analysis expert. Analyze the provided complaints data to identify:
1. Common themes and patterns across complaints
2. Overall sentiment (positive, neutral, negative percentages)
3. Key insights about recurring issues
4. Actionable recommendations for the practice

Return structured JSON with themes array (each with name, count, severity_level), sentiment object, insights string, and recommendations array.`;

    const userPrompt = `Analyze these ${complaints.length} complaints from an NHS GP practice:

${JSON.stringify(complaintSummary, null, 2)}

Identify the top 3-5 themes, calculate sentiment distribution, provide insights about patterns, and give 3-5 actionable recommendations.`;

    // Call Lovable AI with structured output
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
            name: 'analyze_complaints',
            description: 'Return structured complaint analysis',
            parameters: {
              type: 'object',
              properties: {
                themes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      count: { type: 'number' },
                      severity_level: { type: 'string', enum: ['low', 'medium', 'high'] }
                    },
                    required: ['name', 'count', 'severity_level']
                  }
                },
                sentiment: {
                  type: 'object',
                  properties: {
                    positive: { type: 'number' },
                    neutral: { type: 'number' },
                    negative: { type: 'number' }
                  },
                  required: ['positive', 'neutral', 'negative']
                },
                insights: { type: 'string' },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['themes', 'sentiment', 'insights', 'recommendations']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_complaints' } }
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
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));
    
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    const analysis = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (!analysis) {
      throw new Error('No analysis data returned from AI');
    }

    // Store the analysis in the database
    const { error: insertError } = await supabase
      .from('complaints_themes')
      .insert({
        practice_id: practiceId,
        analysis_period_start: dateRange.start,
        analysis_period_end: dateRange.end,
        themes: analysis.themes,
        sentiment: analysis.sentiment,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
      });

    if (insertError) {
      console.error('Error storing analysis:', insertError);
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-complaint-themes:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
