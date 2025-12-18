import { describe, it, expect } from 'vitest';
import { ragFromScore } from './scoring';

describe('ragFromScore', () => {
  it('returns green at 90+', () => {
    expect(ragFromScore(90)).toBe('green');
    expect(ragFromScore(100)).toBe('green');
  });

  it('returns amber at 75-89.99', () => {
    expect(ragFromScore(75)).toBe('amber');
    expect(ragFromScore(89.99)).toBe('amber');
  });

  it('returns red below 75', () => {
    expect(ragFromScore(74.99)).toBe('red');
    expect(ragFromScore(0)).toBe('red');
  });
});
