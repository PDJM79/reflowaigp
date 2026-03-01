import Anthropic from '@anthropic-ai/sdk';

interface SectionTipsInput {
  section: string;
  score: number;
  target: number;
  gap: number;
  contributors: {
    C?: number;   // Coverage %
    S?: number;   // On-time %
    E?: number;   // Evidence %
    R?: number;   // Sign-off %
  };
  country: string;
}

// Cache keyed by "practiceId:section:score" — score changes invalidate automatically
const cache = new Map<string, { tips: string; generatedAt: Date }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function cacheKey(practiceId: string, input: SectionTipsInput) {
  return `${practiceId}:${input.section}:${input.score}`;
}

const REGULATORY_BODY: Record<string, string> = {
  wales:    'Health Inspectorate Wales (HIW)',
  scotland: 'Healthcare Improvement Scotland (HIS)',
  england:  'Care Quality Commission (CQC)',
};

export async function getSectionTips(
  practiceId: string,
  input: SectionTipsInput,
): Promise<{ tips: string }> {
  const key = cacheKey(practiceId, input);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.generatedAt.getTime() < CACHE_TTL_MS) {
    return { tips: cached.tips };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const regulator = REGULATORY_BODY[input.country?.toLowerCase()] ?? REGULATORY_BODY['england'];

  // Build contributor context line
  const contribLines: string[] = [];
  if (input.contributors.C !== undefined)
    contribLines.push(`Coverage (tasks completed): ${Math.round(input.contributors.C)}%`);
  if (input.contributors.S !== undefined)
    contribLines.push(`On-time completion: ${Math.round(input.contributors.S)}%`);
  if (input.contributors.E !== undefined)
    contribLines.push(`Evidence submitted: ${Math.round(input.contributors.E)}%`);
  if (input.contributors.R !== undefined)
    contribLines.push(`Manager sign-off: ${Math.round(input.contributors.R)}%`);

  const prompt = `Audit section: ${input.section}
Current score: ${input.score}/100
Target score: ${input.target}/100
Gap to close: ${input.gap} points
${contribLines.length > 0 ? `\nScore breakdown:\n${contribLines.map(l => `- ${l}`).join('\n')}` : ''}

Provide 3-4 specific, practical steps this GP surgery can take to close the ${input.gap}-point gap in "${input.section}" and meet the ${regulator} target of ${input.target}/100. Focus on the lowest-scoring contributors above. Be direct and actionable — no preamble.`;

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 350,
    system: `You are an audit readiness advisor for UK GP surgeries regulated by ${regulator}. Give concise, numbered action points that can be acted on this week. Plain text only — no markdown, no headers.`,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response from Claude');

  const tips = block.text.trim();
  cache.set(key, { tips, generatedAt: new Date() });
  return { tips };
}
