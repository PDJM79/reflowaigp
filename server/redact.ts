/**
 * Redaction helpers applied at the model boundary.
 *
 * THE RULE: a personal name never leaves this server inside a prompt. Redaction
 * happens in code, at the point the prompt string is built — never by asking the
 * model to be careful. A prompt-level instruction is not a control: by the time
 * the model reads "use initials only", it has already received the full name.
 * That instruction still has a job (stopping the model echoing or inventing
 * names in its OUTPUT), but it is belt-and-braces, not the control itself.
 *
 * These helpers deliberately do NOT run over response payloads. The practice's
 * own UI needs real names in urgent_actions and upcoming_expirations, and those
 * never leave the tenant. The boundary being defended is the outbound model
 * call, not the tenant's own screen.
 */

/**
 * "John Smith" → "J.S." — one uppercase initial per whitespace-separated part.
 *
 * Returns 'Unknown' for null, undefined, empty, or whitespace-only input rather
 * than an empty string, so a missing name can never silently render as a blank
 * field that reads like redaction succeeded when there was nothing to redact.
 */
export function toInitials(name: string | null | undefined): string {
  if (!name) return 'Unknown';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + '.')
    .join('');
  return initials || 'Unknown';
}
