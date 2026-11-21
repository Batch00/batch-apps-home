import { describe, expect, it } from "vitest";
import { toPublicYtd } from "./ytd-payload.js";

const withPoster = (poster_path) =>
  toPublicYtd({ year: 2026, version: 1, media: { top_titles: [{ title: "Chernobyl", poster_path }] } }).media
    .top_titles[0].poster_path;

describe("toPublicYtd poster_path", () => {
  it("keeps a TMDB image path", () => {
    expect(withPoster("/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg")).toBe("/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg");
    expect(withPoster("/a-b_c.png")).toBe("/a-b_c.png");
  });

  it("turns anything else into null", () => {
    for (const bad of [
      null,
      undefined,
      42,
      "",
      "hlLXt2.jpg",
      "https://evil.example/x.jpg",
      "//evil.example/x.jpg",
      "/../x.jpg",
      "/x.jpg?size=1",
      "/x.svg",
      `/${"a".repeat(81)}.jpg`,
    ]) {
      expect(withPoster(bad)).toBeNull();
    }
  });

  it("still drops keys the contract does not name", () => {
    const out = toPublicYtd({
      year: 2026,
      version: 1,
      media: { top_titles: [{ title: "T", poster_path: "/p.jpg", overview: "private note" }] },
    });
    expect(Object.keys(out.media.top_titles[0]).sort()).toEqual(
      ["media_type", "poster_path", "rating", "release_year", "tmdb_id", "title"].sort(),
    );
  });
});

describe("toPublicYtd new regions", () => {
  const travel = (t) => toPublicYtd({ year: 2026, version: 1, travel: t }).travel;

  it("keeps two-letter codes, once each, sorted", () => {
    const out = travel({ new_countries: ["HU", "GR", "CZ", "GR"], new_us_states: ["MT", "AZ"] });
    expect(out.new_countries).toEqual(["CZ", "GR", "HU"]);
    expect(out.new_us_states).toEqual(["AZ", "MT"]);
  });

  it("drops anything that is not a bare uppercase code", () => {
    const out = travel({ new_countries: ["gr", "GRC", "Greece", 30, null, { code: "GR" }, "HU"], new_us_states: "AZ" });
    expect(out.new_countries).toEqual(["HU"]);
    expect(out.new_us_states).toEqual([]);
  });

  it("defaults to empty lists when BatchBrain sends none", () => {
    const out = travel({});
    expect(out.new_countries).toEqual([]);
    expect(out.new_us_states).toEqual([]);
  });
});
