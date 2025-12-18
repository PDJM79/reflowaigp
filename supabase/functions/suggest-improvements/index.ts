import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { section, score, target, gap, contributors, country } = await req.json();

    console.log('Generating suggestions for:', { section, score, target, gap, country });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const prompt = `You are a UK GP practice audit expert. A practice in ${country} has an audit readiness score of ${score}/100 for ${section}, with a target of ${target}/100 (gap: ${gap} points).

Current metrics: ${JSON.stringify(contributors)}

Provide exactly 2 short, actionable improvement tips (one sentence each) to close this gap. Be specific to UK GP audit requirements (${country === 'Wales' ? 'HIW' : country === 'Scotland' ? 'HIS' : 'CQC'}).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise UK healthcare audit consultant. Provide exactly 2 short, practical tips (one sentence each).' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const tips = data.choices[0].message.content;

    console.log('Generated tips:', tips);

    return new Response(JSON.stringify({ tips }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in suggest-improvements function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
