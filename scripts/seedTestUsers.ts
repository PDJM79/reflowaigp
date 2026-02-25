/**
 * Seed script: creates a test practice and one user per major role.
 *
 * Usage:
 *   npx tsx scripts/seedTestUsers.ts            # skip if data exists
 *   npx tsx scripts/seedTestUsers.ts --force    # delete and re-create
 *
 * Requires DATABASE_URL in environment (copy from .env or set inline).
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import {
  practices,
  users,
  type InsertUser,
} from "../shared/schema.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const FORCE = process.argv.includes("--force");

/** Satisfies the Phase 1 password policy: 12+ chars, upper, lower, digit, special */
const TEST_PASSWORD = "Test@2026Seed!";

const TEST_PRACTICE = {
  name: "Test Surgery (Seed)",
  country: "wales" as const,
  isActive: true,
  onboardingStage: "complete",
};

interface SeedUser {
  name: string;
  email: string;
  role: InsertUser["role"];
  isPracticeManager: boolean;
}

const SEED_USERS: SeedUser[] = [
  { name: "Phil Manager",   email: "manager@test.local",   role: "practice_manager", isPracticeManager: true  },
  { name: "Sarah NurseLead",email: "nurse.lead@test.local",role: "nurse_lead",        isPracticeManager: false },
  { name: "Dr. James GP",   email: "gp@test.local",        role: "gp",                isPracticeManager: false },
  { name: "Amy Reception",  email: "reception@test.local", role: "reception",         isPracticeManager: false },
  { name: "Tom IG Lead",    email: "ig.lead@test.local",   role: "ig_lead",           isPracticeManager: false },
  { name: "Emma Auditor",   email: "auditor@test.local",   role: "auditor",           isPracticeManager: false },
  { name: "Kate NurseHCA",  email: "hca@test.local",       role: "hca",               isPracticeManager: false },
  { name: "Lee Estates",    email: "estates@test.local",   role: "estates_lead",      isPracticeManager: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stdout.write(msg + "\n");
}

function dim(msg: string) {
  process.stdout.write(`  \x1b[2m${msg}\x1b[0m\n`);
}

function ok(msg: string) {
  process.stdout.write(`  \x1b[32m✓\x1b[0m ${msg}\n`);
}

function skip(msg: string) {
  process.stdout.write(`  \x1b[33m–\x1b[0m ${msg} (already exists, skipped)\n`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  try {
    log("\n🌱  FitForAudit test user seed\n");

    // ── 1. Practice ──────────────────────────────────────────────────────────
    log("Practice:");

    let [practice] = await db
      .select()
      .from(practices)
      .where(eq(practices.name, TEST_PRACTICE.name));

    if (practice && FORCE) {
      dim(`Deleting existing practice "${practice.name}" (--force)`);
      // Cascade deletes users too
      await db.delete(practices).where(eq(practices.id, practice.id));
      practice = undefined as any;
    }

    if (!practice) {
      [practice] = await db.insert(practices).values(TEST_PRACTICE).returning();
      ok(`Created practice "${practice.name}"  id=${practice.id}`);
    } else {
      skip(`"${practice.name}"  id=${practice.id}`);
    }

    const practiceId = practice.id;

    // ── 2. Password hash (shared across all seed users) ───────────────────────
    log("\nHashing password…");
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    ok("Done");

    // ── 3. Users ──────────────────────────────────────────────────────────────
    log("\nUsers:");

    const results: Array<{ email: string; status: "created" | "skipped" }> = [];

    for (const seed of SEED_USERS) {
      const [existing] = await db
        .select()
        .from(users)
        .where(
          and(eq(users.practiceId, practiceId), eq(users.email, seed.email))
        );

      if (existing) {
        skip(`${seed.email}  (${seed.role})`);
        results.push({ email: seed.email, status: "skipped" });
        continue;
      }

      await db.insert(users).values({
        practiceId,
        name: seed.name,
        email: seed.email,
        role: seed.role,
        isPracticeManager: seed.isPracticeManager,
        passwordHash,
        isActive: true,
      });

      ok(`${seed.email}  (${seed.role})`);
      results.push({ email: seed.email, status: "created" });
    }

    // ── 4. Summary ────────────────────────────────────────────────────────────
    const created = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    log(`
┌─────────────────────────────────────────────────┐
│  Seed complete                                  │
│  Practice ID : ${practiceId.slice(0, 36).padEnd(33)}│
│  Password    : ${TEST_PASSWORD.padEnd(33)}│
│  Created     : ${String(created).padEnd(33)}│
│  Skipped     : ${String(skipped).padEnd(33)}│
└─────────────────────────────────────────────────┘
`);
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  process.exit(1);
});
