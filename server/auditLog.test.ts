import { describe, test, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTableName } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

// `server/db.ts` throws on import without DATABASE_URL and opens a real pg Pool,
// so the pooled `db` is replaced before storage.ts is loaded. The mock doubles as
// the assertion target: anything that reaches the pool shows up on `poolInsert`.
const { poolInsert, poolValues } = vi.hoisted(() => {
  const poolValues = vi.fn().mockResolvedValue(undefined);
  const poolInsert = vi.fn(() => ({ values: poolValues }));
  return { poolInsert, poolValues };
});

vi.mock('./db', () => ({ db: { insert: poolInsert }, pool: {} }));

const { storage } = await import('./storage');

const PRACTICE_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_PRACTICE_ID = '22222222-2222-4222-8222-222222222222';

function cloneAuditRow() {
  return {
    practiceId: PRACTICE_ID,
    userId: null,
    entityType: 'practice',
    entityId: PRACTICE_ID,
    action: 'practice_cloned',
    afterData: { sourcePracticeId: SOURCE_PRACTICE_ID, modules: 3 },
  };
}

/** Stands in for the handle drizzle hands to a `db.transaction()` callback. */
function fakeTransaction(values = vi.fn().mockResolvedValue(undefined)) {
  const insert = vi.fn(() => ({ values }));
  return { executor: { insert } as unknown as Parameters<typeof storage.insertAuditLog>[1], insert, values };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// The clone route audits from inside a transaction. `db` is a connection pool
// and `db.transaction()` checks out its own client, so an audit write issued
// through the pool runs on a different connection, cannot see the uncommitted
// practice row, and dies on the audit_logs.practice_id foreign key — taking the
// whole clone down with it. The executor argument is what prevents that.
describe('storage.insertAuditLog — executor routing', () => {
  test('writes through the pool when no transaction is given', async () => {
    await storage.insertAuditLog(cloneAuditRow());

    expect(poolInsert).toHaveBeenCalledTimes(1);
    expect(poolValues).toHaveBeenCalledTimes(1);
  });

  test('writes through the transaction, never the pool, when one is given', async () => {
    const tx = fakeTransaction();

    await storage.insertAuditLog(cloneAuditRow(), tx.executor);

    expect(tx.insert).toHaveBeenCalledTimes(1);
    expect(tx.values).toHaveBeenCalledTimes(1);
    // The regression this file exists for. A pool write here is the FK failure
    // that made practice cloning impossible.
    expect(poolInsert).not.toHaveBeenCalled();
  });

  test('passes the audit row through unchanged', async () => {
    const tx = fakeTransaction();
    const row = cloneAuditRow();

    await storage.insertAuditLog(row, tx.executor);

    expect(tx.values).toHaveBeenCalledWith(row);
  });

  test('targets the audit_logs table', async () => {
    const tx = fakeTransaction();

    await storage.insertAuditLog(cloneAuditRow(), tx.executor);

    const [table] = tx.insert.mock.calls[0] as unknown as [PgTable];
    expect(getTableName(table)).toBe('audit_logs');
  });

  test('propagates a write failure so the surrounding transaction aborts', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('insert failed'));
    const tx = fakeTransaction(failing);

    // Fatal by design on the clone path: a practice must not commit without its
    // audit row. Swallowing this would leave a hole in the CQC/HIW trail.
    await expect(storage.insertAuditLog(cloneAuditRow(), tx.executor)).rejects.toThrow('insert failed');
  });
});

// The wiring above only helps if the routes actually use it, and a route-level
// test would need a live database this suite does not have. These read the
// source instead — narrow, but they catch the two silent regressions: dropping
// the `tx` argument (clone breaks in production, typecheck stays green) and
// making the toggle audit fatal again (user told it failed after it succeeded).
describe('practice routes — audit call sites', () => {
  // import.meta.url is not a file: URL under the jsdom environment, so this
  // resolves from the vitest root instead.
  const routes = readFileSync(resolve(process.cwd(), 'server/routes.ts'), 'utf8');
  const collapsed = routes.replace(/\s+/g, ' ');

  test('the clone audits on the transaction, not the pool', () => {
    expect(collapsed).toMatch(/action: "practice_cloned"[^;]*?\}, tx\)/);
  });

  test('the toggle audit is wrapped so a failure cannot fail the request', () => {
    const toggle = collapsed.match(/try \{ await storage\.insertAuditLog\(\{ practiceId, userId[^;]*?\}\); \} catch/);
    expect(toggle).not.toBeNull();
  });

  test('the module UPDATE filters on moduleName as well as practiceId', () => {
    // Filtering on practiceId alone toggled every module for the practice.
    expect(collapsed).toMatch(
      /\.where\(and\( eq\(practiceModules\.practiceId, practiceId\), eq\(practiceModules\.moduleName, moduleName\), \)\)/,
    );
  });

  test('no call site references the storage method that never existed', () => {
    expect(routes).not.toMatch(/createAuditLog/);
  });
});
