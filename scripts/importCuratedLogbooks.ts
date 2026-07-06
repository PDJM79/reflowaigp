/**
 * Importer: loads the 29 curated GP logbook JSON files into the curated library.
 *
 * Reads docs/logbooks/GP-MOD-*.json and upserts:
 *   - one curated_sections row per module (keyed by module code)
 *   - one curated_logbooks row per logbook (keyed by logbook code)
 *
 * Idempotent: re-running produces zero duplicates (upsert on the unique `code`).
 * Applies the Phase 1 frequency -> (cadence, triggers) normalisation, preserves
 * each step's `nations` inside the steps JSONB, maps applicable_to, and keeps
 * module provenance. Inert after import: no practice has a selection, so nothing
 * generates.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/importCuratedLogbooks.ts
 *
 * Requires DATABASE_URL and the migration (20260705_phase1_logbook_schema.up.sql)
 * to have been applied.
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { curatedSections, curatedLogbooks } from "../shared/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const LOGBOOKS_DIR = process.env.LOGBOOKS_DIR || "docs/logbooks";

// ─── Frequency normalisation (Phase 2 spec, implemented exactly as written) ────

type Cadence =
  | "daily" | "weekly" | "fortnightly" | "monthly" | "termly" | "quarterly"
  | "six_monthly" | "biennial" | "annual" | "triennial" | "five_yearly"
  | "periodic_review" | "ad_hoc";
type Trigger = "event" | "on_change" | "onboarding";

interface Normalised { cadence: Cadence; triggers: Trigger[]; }

const FREQUENCY_MAP: Record<string, Normalised> = {
  daily:                             { cadence: "daily",           triggers: [] },
  weekly:                            { cadence: "weekly",          triggers: [] },
  monthly:                           { cadence: "monthly",         triggers: [] },
  quarterly:                         { cadence: "quarterly",       triggers: [] },
  annual:                            { cadence: "annual",          triggers: [] },
  every_6_months:                    { cadence: "six_monthly",     triggers: [] },
  termly:                            { cadence: "termly",          triggers: [] },
  biennial:                          { cadence: "biennial",        triggers: [] },
  every_5_years:                     { cadence: "five_yearly",     triggers: [] },
  every_2_to_5_years:                { cadence: "periodic_review", triggers: [] },
  per_use:                           { cadence: "ad_hoc",          triggers: ["event"] },
  per_occurrence:                    { cadence: "ad_hoc",          triggers: ["event"] },
  per_disposal:                      { cadence: "ad_hoc",          triggers: ["event"] },
  new_starters:                      { cadence: "ad_hoc",          triggers: ["onboarding"] },
  per_use_and_monthly_balance_check: { cadence: "monthly",         triggers: ["event"] },
  annual_and_on_change:              { cadence: "annual",          triggers: ["on_change"] },
  new_starters_and_triennial:        { cadence: "triennial",       triggers: ["onboarding"] },
};

function normaliseFrequency(raw: string): Normalised {
  const mapped = FREQUENCY_MAP[raw];
  if (!mapped) {
    throw new Error(`Unmapped frequency value: ${JSON.stringify(raw)}`);
  }
  return mapped;
}

// ─── JSON shapes (only the fields we consume) ──────────────────────────────────

interface RawStep {
  step_number: number;
  nations: string;
  description: string;
  photo_evidence_optional?: boolean;
  photo_guidance?: string;
}
interface RawLogbook {
  logbook_id: string;
  title: string;
  applicable_to: string[];
  applicable_condition?: string;
  frequency: string;
  frequency_detail?: string;
  steps: RawStep[];
}
interface RawModule {
  module_id: string;
  module_name: string;
  source_school_module: string | null;
  comparison_status: string;
  primary_legislation: Record<string, unknown>;
  enforcing_body: Record<string, unknown>;
  responsible_role: string;
  applicable_to: string[];
  applicable_condition?: string;
  notes?: string;
  logbooks: RawLogbook[];
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Module numeric order from GP-MOD-001 -> 1
function moduleSortOrder(moduleId: string): number {
  const m = moduleId.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  try {
    const files = readdirSync(LOGBOOKS_DIR)
      .filter((f) => /^GP-MOD-.*\.json$/.test(f))
      .sort();

    if (files.length === 0) {
      throw new Error(`No GP-MOD-*.json files found in ${LOGBOOKS_DIR}`);
    }
    console.log(`\n📚  Curated logbook import — ${files.length} module files from ${LOGBOOKS_DIR}\n`);

    let sectionCount = 0;
    let logbookCount = 0;
    const cadencesWritten = new Set<string>();
    const triggersWritten = new Set<string>();
    const unmapped: string[] = [];

    for (const file of files) {
      const mod: RawModule = JSON.parse(readFileSync(join(LOGBOOKS_DIR, file), "utf-8"));

      // Upsert the section (module). Keyed by unique code.
      const [section] = await db
        .insert(curatedSections)
        .values({
          code: mod.module_id,
          name: mod.module_name,
          slug: slugify(mod.module_name),
          sortOrder: moduleSortOrder(mod.module_id),
          responsibleRole: mod.responsible_role,
          primaryLegislation: mod.primary_legislation,
          enforcingBody: mod.enforcing_body,
          applicableTo: mod.applicable_to,
          applicableCondition: mod.applicable_condition ?? null,
          notes: mod.notes ?? null,
          provenance: {
            source_school_module: mod.source_school_module,
            comparison_status: mod.comparison_status,
          },
          updatedAt: sql`now()`,
        })
        .onConflictDoUpdate({
          target: curatedSections.code,
          set: {
            name: mod.module_name,
            slug: slugify(mod.module_name),
            sortOrder: moduleSortOrder(mod.module_id),
            responsibleRole: mod.responsible_role,
            primaryLegislation: mod.primary_legislation,
            enforcingBody: mod.enforcing_body,
            applicableTo: mod.applicable_to,
            applicableCondition: mod.applicable_condition ?? null,
            notes: mod.notes ?? null,
            provenance: {
              source_school_module: mod.source_school_module,
              comparison_status: mod.comparison_status,
            },
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: curatedSections.id });
      sectionCount++;

      let orderWithinModule = 0;
      for (const lb of mod.logbooks) {
        const { cadence, triggers } = normaliseFrequency(lb.frequency);
        cadencesWritten.add(cadence);
        triggers.forEach((t) => triggersWritten.add(t));

        await db
          .insert(curatedLogbooks)
          .values({
            sectionId: section.id,
            code: lb.logbook_id,
            title: lb.title,
            applicableTo: lb.applicable_to,
            applicableCondition: lb.applicable_condition ?? null,
            cadence,
            triggers,
            frequencyRaw: lb.frequency,
            frequencyDetail: lb.frequency_detail ?? null,
            steps: lb.steps, // preserves per-step `nations`, description, photo flags
            sortOrder: orderWithinModule++,
            updatedAt: sql`now()`,
          })
          .onConflictDoUpdate({
            target: curatedLogbooks.code,
            set: {
              sectionId: section.id,
              title: lb.title,
              applicableTo: lb.applicable_to,
              applicableCondition: lb.applicable_condition ?? null,
              cadence,
              triggers,
              frequencyRaw: lb.frequency,
              frequencyDetail: lb.frequency_detail ?? null,
              steps: lb.steps,
              sortOrder: orderWithinModule,
              updatedAt: sql`now()`,
            },
          });
        logbookCount++;
      }
    }

    console.log(`  Sections upserted : ${sectionCount}`);
    console.log(`  Logbooks upserted : ${logbookCount}`);
    console.log(`  Cadences written  : ${[...cadencesWritten].sort().join(", ")}`);
    console.log(`  Triggers written  : ${[...triggersWritten].sort().join(", ") || "(none)"}`);
    if (unmapped.length) console.log(`  UNMAPPED          : ${unmapped.join(", ")}`);
    console.log("\n✓  Import complete (inert — no practice has a selection).\n");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n❌  Import failed:", err.message);
  if (err.cause) console.error("Cause:", (err.cause as Error).message ?? err.cause);
  process.exit(1);
});
