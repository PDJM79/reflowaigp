/**
 * CI guard: one AI provider, one region.
 *
 * Fails the build if a retired provider's hostname, SDK or key name reaches
 * source, or if a Mistral host other than the EU endpoint appears. This is what
 * makes the "do not name the retired provider, even in a comment" rule in
 * server/services/mistral.ts enforceable rather than aspirational — a well-meant
 * comment reintroducing the old key name is exactly how these migrations rot.
 *
 * KNOWN EXCEPTION, deliberate: supabase/functions/process-baseline-documents
 * still calls the Lovable AI gateway. It is the one Lovable call site with a
 * real caller and it sends filenames only, so it was left in place when the
 * other four were deleted. Lovable is therefore NOT in FORBIDDEN yet — add it
 * here in the same change that migrates that function, or the guard will start
 * lying about what it covers.
 *
 * Run: npm run check:ai-provider
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOTS = ['server', 'shared', 'supabase/functions', 'src'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);
const EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|json)$/;

// This file necessarily contains the very strings it bans.
const SELF = 'scripts/checkAiProvider.mjs';

// Assembled from fragments so the guard does not trip on its own source.
const FORBIDDEN = [
  { label: 'Anthropic API host', pattern: new RegExp(['api', 'anthropic', 'com'].join('\\.')) },
  { label: 'Anthropic SDK import', pattern: /@anthropic-ai\/sdk/ },
  { label: 'Anthropic key name', pattern: new RegExp(['ANTHROPIC', 'API', 'KEY'].join('_')) },
  { label: 'OpenAI API host', pattern: new RegExp(['api', 'openai', 'com'].join('\\.')) },
  { label: 'OpenAI key name', pattern: new RegExp(['OPENAI', 'API', 'KEY'].join('_')) },
  { label: 'Anthropic model id', pattern: /claude-[a-z0-9.-]*\d/ },
  { label: 'OpenAI model id', pattern: /\bgpt-[0-9]/ },
];

// The EU endpoint is the only Mistral host permitted. Any other mistral.ai host
// is a processing-region change and must go through DPA review, not a diff.
const MISTRAL_HOST_ALLOWED = 'api.mistral.ai';
const MISTRAL_HOST_ANY = /\b([a-z0-9-]+\.)*mistral\.ai\b/g;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return; // root does not exist in this checkout — not an error
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.test(entry)) yield full;
  }
}

const violations = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = relative('.', file).split(sep).join('/');
    if (rel === SELF) continue;

    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const { label, pattern } of FORBIDDEN) {
        if (pattern.test(line)) {
          violations.push({ rel, line: i + 1, label, text: line.trim().slice(0, 120) });
        }
      }
      for (const host of line.match(MISTRAL_HOST_ANY) ?? []) {
        if (host !== MISTRAL_HOST_ALLOWED) {
          violations.push({
            rel, line: i + 1,
            label: `non-EU Mistral host "${host}"`,
            text: line.trim().slice(0, 120),
          });
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`\nAI provider guard failed — ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line}  [${v.label}]`);
    console.error(`    ${v.text}`);
  }
  console.error('\nThis repo is Mistral-only, EU endpoint only. See server/services/mistral.ts.\n');
  process.exit(1);
}

console.log('AI provider guard passed: Mistral only, EU endpoint only.');
