import { describe, test, expect } from 'vitest';
import { toInitials } from './redact';

// This helper is the only thing standing between a patient's or a staff
// member's name and an outbound model call, so its edge cases are worth
// pinning down rather than assuming.
describe('toInitials', () => {
  test('reduces a two-part name to dotted initials', () => {
    expect(toInitials('John Smith')).toBe('J.S.');
  });

  test('handles a single name', () => {
    expect(toInitials('Madonna')).toBe('M.');
  });

  test('handles three or more parts', () => {
    expect(toInitials('Anne Marie de Vries')).toBe('A.M.D.V.');
  });

  test('collapses irregular whitespace rather than emitting empty initials', () => {
    expect(toInitials('  John   Smith  ')).toBe('J.S.');
  });

  test('uppercases lowercase input', () => {
    expect(toInitials('john smith')).toBe('J.S.');
  });

  test('returns Unknown for null', () => {
    expect(toInitials(null)).toBe('Unknown');
  });

  test('returns Unknown for undefined', () => {
    expect(toInitials(undefined)).toBe('Unknown');
  });

  test('returns Unknown for an empty string', () => {
    expect(toInitials('')).toBe('Unknown');
  });

  test('returns Unknown for whitespace only, never a blank string', () => {
    // A blank result would render as an empty field that looks redacted but
    // proves nothing — 'Unknown' is unambiguous.
    expect(toInitials('   ')).toBe('Unknown');
  });

  test('never returns any character from the original name beyond leading initials', () => {
    const surname = 'Featherstonehaugh';
    const result = toInitials(`Wilhelmina ${surname}`);
    expect(result).toBe('W.F.');
    expect(result).not.toContain(surname.slice(1));
  });
});
