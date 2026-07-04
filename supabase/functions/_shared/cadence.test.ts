import { describe, it, expect } from "vitest";
import {
  occursOn, localDateInTz, parseISODate, resolvePreferredDate, daysInMonth,
  localMidnightUtc, addHours, type Cadence, type LocalDate,
} from "./cadence";

// Helper: does cadence generate on this ISO date, given anchor + prefs?
function gen(cadence: Cadence, anchorISO: string, todayISO: string, opts: { day?: number; date?: number } = {}): boolean {
  return occursOn({
    cadence,
    anchor: parseISODate(anchorISO),
    today: parseISODate(todayISO),
    preferredDay: opts.day ?? null,
    preferredDate: opts.date ?? null,
  });
}

describe("daysInMonth / resolvePreferredDate (month-length edges)", () => {
  it("knows month lengths incl. leap Feb", () => {
    expect(daysInMonth(2026, 2)).toBe(28);  // non-leap
    expect(daysInMonth(2024, 2)).toBe(29);  // leap
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 1)).toBe(31);
  });
  it("clamps preferred_date to last day of month (overflow)", () => {
    expect(resolvePreferredDate(31, 2026, 2)).toBe(28); // Feb non-leap
    expect(resolvePreferredDate(31, 2024, 2)).toBe(29); // Feb leap
    expect(resolvePreferredDate(31, 2026, 4)).toBe(30); // Apr
    expect(resolvePreferredDate(15, 2026, 4)).toBe(15); // no overflow
  });
});

describe("daily", () => {
  it("generates every day on/after anchor, never before", () => {
    expect(gen("daily", "2026-01-01", "2026-01-01")).toBe(true);
    expect(gen("daily", "2026-01-01", "2026-06-15")).toBe(true);
    expect(gen("daily", "2026-01-10", "2026-01-09")).toBe(false); // before anchor
  });
});

describe("weekly", () => {
  it("generates on preferred_day (default Monday)", () => {
    // 2026-07-06 is a Monday
    expect(gen("weekly", "2026-01-05", "2026-07-06")).toBe(true);       // Mon, default
    expect(gen("weekly", "2026-01-05", "2026-07-07")).toBe(false);      // Tue
    expect(gen("weekly", "2026-01-05", "2026-07-08", { day: 3 })).toBe(true); // Wed via preferred_day=3
  });
});

describe("fortnightly", () => {
  it("generates on preferred_day every 2nd week from anchor week", () => {
    // Anchor Mon 2026-07-06 (week 0). Next on-cycle Monday = +14 days = 2026-07-20.
    expect(gen("fortnightly", "2026-07-06", "2026-07-06")).toBe(true);  // week 0
    expect(gen("fortnightly", "2026-07-06", "2026-07-13")).toBe(false); // week 1 (off)
    expect(gen("fortnightly", "2026-07-06", "2026-07-20")).toBe(true);  // week 2 (on)
    expect(gen("fortnightly", "2026-07-06", "2026-07-27")).toBe(false); // week 3 (off)
    expect(gen("fortnightly", "2026-07-06", "2026-07-07")).toBe(false); // wrong weekday
  });
});

describe("monthly (+ month-length edge)", () => {
  it("generates on preferred_date each month", () => {
    expect(gen("monthly", "2026-01-15", "2026-03-15", { date: 15 })).toBe(true);
    expect(gen("monthly", "2026-01-15", "2026-03-14", { date: 15 })).toBe(false);
  });
  it("preferred_date 31 falls to last day in short months", () => {
    expect(gen("monthly", "2026-01-31", "2026-02-28", { date: 31 })).toBe(true);  // Feb -> 28
    expect(gen("monthly", "2026-01-31", "2026-04-30", { date: 31 })).toBe(true);  // Apr -> 30
    expect(gen("monthly", "2026-01-31", "2026-03-31", { date: 31 })).toBe(true);  // Mar -> 31
    expect(gen("monthly", "2024-01-31", "2024-02-29", { date: 31 })).toBe(true);  // leap Feb -> 29
  });
});

describe("termly (evenly-spaced 4-month intervals => 3/year)", () => {
  it("hits anchor month, +4, +8, +12 on preferred_date", () => {
    // anchor 2026-01-10, date 10 -> Jan, May, Sep, then next Jan
    expect(gen("termly", "2026-01-10", "2026-01-10", { date: 10 })).toBe(true);  // +0
    expect(gen("termly", "2026-01-10", "2026-05-10", { date: 10 })).toBe(true);  // +4
    expect(gen("termly", "2026-01-10", "2026-09-10", { date: 10 })).toBe(true);  // +8
    expect(gen("termly", "2026-01-10", "2027-01-10", { date: 10 })).toBe(true); // +12
    expect(gen("termly", "2026-01-10", "2026-03-10", { date: 10 })).toBe(false); // +2 off-cycle
    expect(gen("termly", "2026-01-10", "2026-05-11", { date: 10 })).toBe(false); // right month wrong day
  });
});

describe("quarterly / six_monthly (from anchor month)", () => {
  it("quarterly every 3 months", () => {
    expect(gen("quarterly", "2026-02-01", "2026-02-01", { date: 1 })).toBe(true);  // +0
    expect(gen("quarterly", "2026-02-01", "2026-05-01", { date: 1 })).toBe(true);  // +3
    expect(gen("quarterly", "2026-02-01", "2026-08-01", { date: 1 })).toBe(true);  // +6
    expect(gen("quarterly", "2026-02-01", "2026-04-01", { date: 1 })).toBe(false); // +2
  });
  it("six_monthly every 6 months", () => {
    expect(gen("six_monthly", "2026-03-20", "2026-03-20", { date: 20 })).toBe(true);  // +0
    expect(gen("six_monthly", "2026-03-20", "2026-09-20", { date: 20 })).toBe(true);  // +6
    expect(gen("six_monthly", "2026-03-20", "2026-06-20", { date: 20 })).toBe(false); // +3
  });
});

describe("annual + anniversary cadences (biennial/triennial/five_yearly)", () => {
  it("annual once a year on anchor month + preferred_date", () => {
    expect(gen("annual", "2026-06-30", "2026-06-30", { date: 30 })).toBe(true);
    expect(gen("annual", "2026-06-30", "2027-06-30", { date: 30 })).toBe(true);
    expect(gen("annual", "2026-06-30", "2026-07-30", { date: 30 })).toBe(false); // wrong month
  });
  it("biennial every 2 years on the anniversary", () => {
    expect(gen("biennial", "2026-04-15", "2026-04-15", { date: 15 })).toBe(true);  // yr 0
    expect(gen("biennial", "2026-04-15", "2027-04-15", { date: 15 })).toBe(false); // yr 1
    expect(gen("biennial", "2026-04-15", "2028-04-15", { date: 15 })).toBe(true);  // yr 2
  });
  it("triennial every 3 years", () => {
    expect(gen("triennial", "2026-04-15", "2029-04-15", { date: 15 })).toBe(true);  // yr 3
    expect(gen("triennial", "2026-04-15", "2028-04-15", { date: 15 })).toBe(false); // yr 2
  });
  it("five_yearly every 5 years", () => {
    expect(gen("five_yearly", "2026-04-15", "2031-04-15", { date: 15 })).toBe(true);  // yr 5
    expect(gen("five_yearly", "2026-04-15", "2030-04-15", { date: 15 })).toBe(false); // yr 4
  });
});

describe("periodic_review + ad_hoc never generate", () => {
  it("returns false for any date", () => {
    for (const iso of ["2026-01-01", "2026-06-15", "2027-01-01"]) {
      expect(gen("periodic_review", "2026-01-01", iso)).toBe(false);
      expect(gen("ad_hoc", "2026-01-01", iso)).toBe(false);
    }
  });
});

describe("DST-awareness (Europe/London transitions)", () => {
  it("localDateInTz gives the correct single date across spring-forward", () => {
    // BST starts 2026-03-29 01:00 UTC -> 02:00 BST. An instant just after should read 2026-03-29.
    const d = localDateInTz(new Date("2026-03-29T09:00:00Z"), "Europe/London");
    expect([d.year, d.month, d.day]).toEqual([2026, 3, 29]);
  });
  it("localDateInTz gives the correct single date across autumn-back", () => {
    // BST ends 2026-10-25 02:00 BST -> 01:00 GMT.
    const d = localDateInTz(new Date("2026-10-25T09:00:00Z"), "Europe/London");
    expect([d.year, d.month, d.day]).toEqual([2026, 10, 25]);
  });
  it("daily cadence generates exactly once on a DST-transition day (date-based, no double/skip)", () => {
    // Evaluate the spring-forward day and the day around it — each is one distinct date.
    expect(gen("daily", "2026-01-01", "2026-03-28")).toBe(true);
    expect(gen("daily", "2026-01-01", "2026-03-29")).toBe(true); // spring-forward day
    expect(gen("daily", "2026-01-01", "2026-03-30")).toBe(true);
    // autumn-back day
    expect(gen("daily", "2026-01-01", "2026-10-25")).toBe(true);
  });
  it("localMidnightUtc resolves DST-day midnight to the right UTC instant", () => {
    // 2026-03-28 (still GMT): local midnight == 00:00Z
    expect(localMidnightUtc("2026-03-28", "Europe/London").toISOString()).toBe("2026-03-28T00:00:00.000Z");
    // 2026-07-01 (BST, UTC+1): local midnight == previous day 23:00Z
    expect(localMidnightUtc("2026-07-01", "Europe/London").toISOString()).toBe("2026-06-30T23:00:00.000Z");
  });
  it("addHours computes due_at from an occurrence instant", () => {
    const due = addHours(localMidnightUtc("2026-07-01", "Europe/London"), 24);
    expect(due.toISOString()).toBe("2026-07-01T23:00:00.000Z");
  });
});

describe("never generates before the anchor date (all cadences)", () => {
  const cadences: Cadence[] = ["weekly", "monthly", "quarterly", "annual", "biennial"];
  it("returns false for a matching pattern that predates the anchor", () => {
    // anchor mid-2026; a date in 2025 that would otherwise match the pattern
    for (const c of cadences) {
      expect(gen(c, "2026-06-01", "2025-06-01", { date: 1, day: 1 })).toBe(false);
    }
  });
});
