import type { RequestHandler } from "express";
import { db } from "./db";
import { auditLogs } from "@shared/schema";

const AUDITED_METHODS = new Set(["POST", "PATCH", "DELETE"]);

const METHOD_TO_ACTION: Record<string, string> = {
  POST: "create",
  PATCH: "update",
  DELETE: "delete",
};

interface ParsedEntity {
  entityType: string;
  entityId: string | null;
}

function parseEntity(url: string): ParsedEntity | null {
  // /api/practices/{practiceId}/{entityType}[/{entityId}][/...]
  const entityMatch = url.match(
    /\/api\/practices\/[0-9a-f-]{36}\/([a-z-]+)(?:\/([0-9a-f-]{36}))?/i,
  );
  if (entityMatch) {
    return { entityType: entityMatch[1], entityId: entityMatch[2] ?? null };
  }
  // /api/practices/{practiceId}  (the practice record itself)
  const practiceMatch = url.match(/\/api\/practices\/([0-9a-f-]{36})(?:[?#]|$)/);
  if (practiceMatch) {
    return { entityType: "practice", entityId: practiceMatch[1] };
  }
  return null;
}

/**
 * Intercepts mutating API responses and writes an append-only audit log row.
 * Must be mounted after session middleware so req.session is populated.
 * Failures are logged to console and never surfaced to the client.
 */
export const auditLogger: RequestHandler = (req, res, next) => {
  if (!AUDITED_METHODS.has(req.method)) return next();

  const practiceId = req.session?.practiceId;
  if (!practiceId) return next();

  const parsed = parseEntity(req.originalUrl);
  if (!parsed) return next();

  const { entityType, entityId: urlEntityId } = parsed;
  const action = METHOD_TO_ACTION[req.method];
  const userId = req.session?.userId ?? null;
  const ipAddress = req.ip ?? null;
  const userAgent = (req.headers["user-agent"] as string) ?? null;

  // Intercept res.json to observe the response body on success
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    // Restore immediately so re-entrant calls are safe
    res.json = originalJson;

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const responseObj =
        body !== null && typeof body === "object"
          ? (body as Record<string, unknown>)
          : null;

      // For POST (create), the entity ID lives in the response body
      const entityId =
        urlEntityId ?? (responseObj?.id as string | undefined) ?? null;

      if (entityId) {
        db.insert(auditLogs)
          .values({
            practiceId,
            userId,
            entityType,
            entityId,
            action,
            beforeData: null,
            afterData: req.method !== "DELETE" ? responseObj : null,
            ipAddress,
            userAgent,
          })
          .catch((err: Error) => {
            console.error("[audit] Failed to write audit log:", err.message);
          });
      }
    }

    return originalJson(body);
  };

  next();
};
