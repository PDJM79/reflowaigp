// =============================================================================
// ReflowAI GP — Phase 6 compliance exports (PDF/CSV, incl. Annex B)
// =============================================================================
// Server-side generation of occurrence + status + evidence exports for a date
// range/module, recorded in compliance_exports. Annex B is the cleaning-filtered
// variant of the same engine.
// =============================================================================

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { sql } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";

export interface ExportRow {
  date: string;
  module: string;
  title: string;
  status: string;
  assignee: string;
  due_at: string;
  completed_at: string;
  evidence: string;
}

export interface ExportParams {
  from: string;
  to: string;
  module?: string;
  annexB?: boolean;
}

/** Occurrence rows for the export: status + assignee + evidence link, in-window. */
export async function getExportRows(practiceId: string, params: ExportParams): Promise<ExportRow[]> {
  const module = params.annexB ? "cleaning" : params.module;
  const res: any = await db.execute(sql`
    SELECT
      t.scheduled_date::text AS date,
      coalesce(t.module, '') AS module,
      t.title,
      t.status,
      coalesce(u.name, '') AS assignee,
      coalesce(to_char(t.due_at, 'YYYY-MM-DD HH24:MI'), '') AS due_at,
      coalesce(to_char(t.completed_at, 'YYYY-MM-DD HH24:MI'), '') AS completed_at,
      coalesce((
        SELECT cl.photo_url FROM cleaning_logs cl
        WHERE cl.task_id = (t.metadata->>'cleaningTaskId')::uuid
          AND cl.photo_url IS NOT NULL
          AND cl.log_date::date = t.scheduled_date
        LIMIT 1
      ), '') AS evidence
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.practice_id = ${practiceId}
      AND t.source_type IN ('logbook','cleaning','fridge')
      AND t.scheduled_date BETWEEN ${params.from} AND ${params.to}
      ${module ? sql`AND t.module = ${module}` : sql``}
    ORDER BY t.scheduled_date, t.module, t.title
  `);
  return (res.rows ?? res) as ExportRow[];
}

const HEADERS = ["Date", "Module", "Task", "Status", "Assignee", "Due", "Completed", "Evidence"];

function csvEscape(v: string): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: ExportRow[]): string {
  const lines = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push([r.date, r.module, r.title, r.status, r.assignee, r.due_at, r.completed_at, r.evidence].map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}

export function toPdf(rows: ExportRow[], meta: { title: string; subtitle: string }): Buffer {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(meta.title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(meta.subtitle, 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [HEADERS],
    body: rows.map((r) => [r.date, r.module, r.title, r.status, r.assignee, r.due_at, r.completed_at, r.evidence ? "yes" : ""]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 64, 90] },
  });
  if (rows.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text("No occurrences in the selected range.", 14, 40);
  }
  return Buffer.from(doc.output("arraybuffer"));
}

/** KF3: PDF of a claim run + its scripts (reuses the Phase 6 jsPDF engine). */
export function toClaimRunPdf(run: any, scripts: any[]): Buffer {
  const doc = new jsPDF({ orientation: "landscape" });
  const from = run.periodStart ? new Date(run.periodStart).toISOString().slice(0, 10) : "";
  const to = run.periodEnd ? new Date(run.periodEnd).toISOString().slice(0, 10) : "";
  doc.setFontSize(16);
  doc.text("Month-End Claim Run", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${from} to ${to}  |  status: ${run.status ?? "draft"}  |  ${run.totalScripts ?? scripts.length} scripts  |  ${run.totalItems ?? ""} items`, 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [["Issue date", "Drug code", "Drug name", "Qty", "Prescriber"]],
    body: scripts.map((s) => [
      s.issueDate ? String(s.issueDate).slice(0, 10) : "",
      s.drugCode ?? "", s.drugName ?? "", String(s.quantity ?? ""), s.prescriber ?? "",
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 64, 90] },
  });
  if (scripts.length === 0) {
    doc.setFontSize(11); doc.setTextColor(120);
    doc.text("No scripts in this period.", 14, 40);
  }
  return Buffer.from(doc.output("arraybuffer"));
}

/** Persist a compliance_exports row for the generated artefact. */
export async function recordExport(
  practiceId: string,
  requestedBy: string | null,
  params: ExportParams,
  format: string,
  fileRef: string,
): Promise<string> {
  const [row] = await db.insert(schema.complianceExports).values({
    practiceId,
    requestedBy,
    params: params as any,
    format,
    status: "complete",
    fileRef,
  }).returning({ id: schema.complianceExports.id });
  return row.id;
}
