import { afterEach, describe, expect, it, vi } from "vitest";
import { wrapAliasTarget, wrapYearFromPath } from "./ytd";

afterEach(() => vi.useRealTimers());

describe("wrapAliasTarget", () => {
  it("sends /wrap and /wrap/ to the current year", () => {
    vi.useFakeTimers({ now: new Date("2026-11-26T18:00:00Z") });
    expect(wrapAliasTarget("/wrap")).toBe("/2026");
    expect(wrapAliasTarget("/wrap/")).toBe("/2026");
  });

  it("uses Chicago time at the turn of the year", () => {
    // 03:00 UTC on Jan 1 is still Dec 31 in Chicago.
    vi.useFakeTimers({ now: new Date("2027-01-01T03:00:00Z") });
    expect(wrapAliasTarget("/wrap")).toBe("/2026");
    vi.setSystemTime(new Date("2027-01-01T07:00:00Z"));
    expect(wrapAliasTarget("/wrap")).toBe("/2027");
    expect(wrapYearFromPath(wrapAliasTarget("/wrap"))).toBe(2027);
  });

  it("leaves every other path alone", () => {
    for (const path of ["/", "/2026", "/wraps", "/wrap/2026", "/api/wrap", "", undefined]) {
      expect(wrapAliasTarget(path)).toBeNull();
    }
  });
});
