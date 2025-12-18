import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireJwtAndPractice } from '../_shared/auth.ts';
import { getEnvOrThrow } from '../_shared/supabase.ts';

serve(async (req) => {
  // Handle CORS preflight
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  // Enforce POST method
  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    // Require authenticated user with practice context
    const { practiceId } = await requireJwtAndPractice(req);
    console.log('Generating suggestions for practice:', practiceId);

    const { section, score, target, gap, contributors, country } = await req.json();

    console.log('Suggestion request:', { section, score, target, gap, country });

    const openAIApiKey = getEnvOrThrow('OPENAI_API_KEY');

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

    return jsonResponse(req, { tips });
  } catch (error) {
    console.error('Error in suggest-improvements function:', error);
    return errorResponse(req, (error as Error).message, 500);
  }
});
