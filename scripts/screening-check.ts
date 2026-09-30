/**
 * Checks the screening pre-check lookups. There's no test runner yet, so this
 * is plain assertions:
 *
 *   npm run screening:check            # made-up registry file, no network
 *   npm run screening:check -- --live  # also downloads the real GBI file
 *
 * Every name here is invented. The live run searches only for made-up names
 * and prints outcomes, counts, and timing, never a registry entry.
 */
import assert from "node:assert/strict";
import { parseCsv, toCsv } from "@/lib/csv";
import { checkRegistries } from "@/lib/screening";
import {
  birthYearMatches,
  namesMatch,
  nameWords,
  parseRegistryName,
} from "@/lib/screening/match";
import type { ScreeningSource } from "@/lib/screening/source";
import { createGbiSource, gbiSource } from "@/lib/screening/sources/gbi";
import { nsopwSource } from "@/lib/screening/sources/nsopw";
import type { RegistryCheckResult, RegistrySubject } from "@/types/screening";

let passed = 0;
const failures: string[] = [];

async function test(name: string, run: () => void | Promise<void>) {
  try {
    await run();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  FAIL ${name}`);
    console.log(`       ${error instanceof Error ? error.message : error}`);
  }
}

const dob = (value: string) => new Date(`${value}T05:00:00Z`);

const subject = (
  userId: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string | null
): RegistrySubject => ({
  userId,
  firstName,
  lastName,
  dateOfBirth: dateOfBirth ? dob(dateOfBirth) : null,
});

const name = (first: string, last: string) => ({
  first: nameWords(first),
  last: nameWords(last),
});

/** The GBI header, with a few invented entries. */
const HEADER = [
  "NAME",
  "SEX",
  "RACE",
  "YEAR OF BIRTH",
  "HEIGHT",
  "WEIGHT",
  "HAIR COLOR",
  "EYE COLOR",
  "STREET NUMBER",
  "STREET",
  "CITY",
  "STATE",
  "ZIP CODE",
  "COUNTY",
  "REGISTRATION DATE",
  "CRIME",
];
type Entry = { name: string; year: string; city?: string; county?: string };
const fakeCsv = (entries: Entry[]) =>
  toCsv(
    entries,
    HEADER.map((header) => ({
      header,
      value: (e: Entry) =>
        header === "NAME"
          ? e.name
          : header === "YEAR OF BIRTH"
            ? e.year
            : header === "CITY"
              ? (e.city ?? "FAKETOWN")
              : header === "COUNTY"
                ? (e.county ?? "NOWHERE")
                : "X",
    }))
  );

const FAKE_ENTRIES: Entry[] = [
  { name: "ZZTEST, ALICE MARIE", year: "1990", city: "FAKETOWN" },
  { name: "ZZTEST, ALICE", year: "1991" },
  { name: "ZZTEST, ALICE Q JR", year: "1993" },
  { name: "QXOBRIEN-ZZ, BOBBI", year: "1985" },
  { name: "O'ZZTEST, CARLA", year: "" },
  { name: "ZZTEST, DANA", year: "1970" },
];
const fakeGbi = (csv = fakeCsv(FAKE_ENTRIES)) =>
  createGbiSource({ loadCsv: async () => csv, minEntries: 1 });

const only = (results: Map<string, RegistryCheckResult[]>, userId: string) => {
  const list = results.get(userId);
  assert.ok(list, `no results for ${userId}`);
  assert.equal(list.length, 1);
  return list[0];
};

async function offline() {
  console.log("csv");
  await test("parses quotes, doubled quotes, commas, CRLF, embedded newlines", () => {
    const rows = parseCsv(
      'A,B,C\r\n"x, y","say ""hi""","two\nlines"\r\n\r\nplain,,end\n'
    );
    assert.deepEqual(rows, [
      ["A", "B", "C"],
      ["x, y", 'say "hi"', "two\nlines"],
      ["plain", "", "end"],
    ]);
  });
  await test("round-trips toCsv", () => {
    const text = toCsv(
      [{ a: 'q"uote', b: "c,omma" }],
      [
        { header: "a", value: (r) => r.a },
        { header: "b", value: (r) => r.b },
      ]
    );
    assert.deepEqual(parseCsv(text), [
      ["a", "b"],
      ['q"uote', "c,omma"],
    ]);
  });

  console.log("names");
  await test("normalizes accents, apostrophes, hyphens, suffixes", () => {
    assert.deepEqual(nameWords("José"), ["JOSE"]);
    assert.deepEqual(nameWords("O'Zztest"), ["OZZTEST"]);
    assert.deepEqual(nameWords("Qxobrien-Zz"), ["QXOBRIEN", "ZZ"]);
    assert.deepEqual(nameWords("Alice Q Jr."), ["ALICE", "Q"]);
    assert.deepEqual(nameWords("V"), ["V"]);
  });
  await test("parses LAST, FIRST MIDDLE SUFFIX", () => {
    assert.deepEqual(parseRegistryName("ZZTEST, ALICE Q JR"), {
      last: ["ZZTEST"],
      first: ["ALICE", "Q"],
    });
  });
  await test("matches on first + last, ignoring middle names and case", () => {
    assert.ok(
      namesMatch(
        name("alice", "zztest"),
        parseRegistryName("ZZTEST, ALICE MARIE")
      )
    );
    assert.ok(
      namesMatch(
        name("Alice Marie", "Zztest"),
        parseRegistryName("ZZTEST, ALICE")
      )
    );
  });
  await test("does not match a different first or last name", () => {
    assert.ok(
      !namesMatch(name("Alicia", "Zztest"), parseRegistryName("ZZTEST, ALICE"))
    );
    assert.ok(
      !namesMatch(
        name("Alice", "Zztesting"),
        parseRegistryName("ZZTEST, ALICE")
      )
    );
  });
  await test("matches compound last names either way", () => {
    assert.ok(
      namesMatch(
        name("Bobbi", "Qxobrien"),
        parseRegistryName("QXOBRIEN-ZZ, BOBBI")
      )
    );
    assert.ok(
      namesMatch(
        name("Bobbi", "Qxobrien Zz"),
        parseRegistryName("QXOBRIEN-ZZ, BOBBI")
      )
    );
    // Short particles alone aren't enough.
    assert.ok(
      !namesMatch(name("Bobbi", "Zz"), parseRegistryName("QXOBRIEN-ZZ, BOBBI"))
    );
  });

  console.log("birth year");
  await test("same year and ±1 match, 2+ off does not", () => {
    assert.ok(birthYearMatches(dob("1990-06-15"), 1990));
    assert.ok(birthYearMatches(dob("1990-06-15"), 1991));
    assert.ok(birthYearMatches(dob("1990-06-15"), 1989));
    assert.ok(!birthYearMatches(dob("1990-06-15"), 1992));
    assert.ok(!birthYearMatches(dob("1990-06-15"), 1987));
  });
  await test("Jan 1 birthdays keep their year (stored as midnight Eastern)", () => {
    assert.ok(!birthYearMatches(new Date("1990-01-01T05:00:00Z"), 1988));
  });
  await test("unknown registry year counts as a match", () => {
    assert.ok(birthYearMatches(dob("1990-06-15"), null));
  });

  console.log("GBI source (made-up file)");
  await test("possible match lists every hit within a year, with location and link", async () => {
    const results = await checkRegistries(
      [subject("u1", "Alice", "Zztest", "1990-03-02")],
      [fakeGbi()]
    );
    const result = only(results, "u1");
    assert.equal(result.outcome, "possible_match");
    assert.equal(result.source, "gbi_ga");
    assert.ok(result.checkedAt instanceof Date);
    if (result.outcome !== "possible_match") return;
    // 1990 and 1991 match; 1993 (JR) is out of range.
    assert.deepEqual(
      result.hits.map((h) => [h.name, h.yearOfBirth]),
      [
        ["ZZTEST, ALICE MARIE", 1990],
        ["ZZTEST, ALICE", 1991],
      ]
    );
    assert.equal(result.hits[0].location, "FAKETOWN, NOWHERE County");
    assert.ok(result.hits.every((h) => h.url.startsWith("https://")));
  });
  await test("same name, birth year 3+ off → no match", async () => {
    const results = await checkRegistries(
      [subject("u1", "Dana", "Zztest", "1990-03-02")],
      [fakeGbi()]
    );
    assert.equal(only(results, "u1").outcome, "no_match");
  });
  await test("name not in file → no match", async () => {
    const results = await checkRegistries(
      [subject("u1", "Nobody", "Qqnotreal", "1990-03-02")],
      [fakeGbi()]
    );
    assert.equal(only(results, "u1").outcome, "no_match");
  });
  await test("blank registry year still flags the name", async () => {
    const results = await checkRegistries(
      [subject("u1", "Carla", "O'Zztest", "2001-03-02")],
      [fakeGbi()]
    );
    const result = only(results, "u1");
    assert.equal(result.outcome, "possible_match");
    if (result.outcome === "possible_match") {
      assert.equal(result.hits[0].yearOfBirth, null);
    }
  });
  await test("missing DOB → couldn't check, with manual link, never a name-only flag", async () => {
    const results = await checkRegistries(
      [subject("u1", "Alice", "Zztest", null)],
      [fakeGbi()]
    );
    const result = only(results, "u1");
    assert.equal(result.outcome, "unavailable");
    if (result.outcome === "unavailable") {
      assert.equal(result.reason, "missing_dob");
      assert.ok(result.manualSearchUrl.startsWith("https://"));
    }
  });
  await test("no subjects with a DOB → the file isn't downloaded", async () => {
    let downloads = 0;
    const source = createGbiSource({
      loadCsv: async () => {
        downloads += 1;
        return fakeCsv(FAKE_ENTRIES);
      },
      minEntries: 1,
    });
    await checkRegistries([subject("u1", "Alice", "Zztest", null)], [source]);
    assert.equal(downloads, 0);
  });
  await test("several subjects share one download", async () => {
    let downloads = 0;
    const source = createGbiSource({
      loadCsv: async () => {
        downloads += 1;
        return fakeCsv(FAKE_ENTRIES);
      },
      minEntries: 1,
    });
    const results = await checkRegistries(
      [
        subject("u1", "Alice", "Zztest", "1990-03-02"),
        subject("u2", "Nobody", "Qqnotreal", "1990-03-02"),
        subject("u3", "Bobbi", "Qxobrien", "1986-01-20"),
      ],
      [source]
    );
    assert.equal(downloads, 1);
    assert.equal(only(results, "u1").outcome, "possible_match");
    assert.equal(only(results, "u2").outcome, "no_match");
    assert.equal(only(results, "u3").outcome, "possible_match");
  });
  await test("changed columns → couldn't check (source_error), not no match", async () => {
    const results = await checkRegistries(
      [subject("u1", "Alice", "Zztest", "1990-03-02")],
      [fakeGbi("FULL NAME,BORN\nZZTEST ALICE,1990\n")]
    );
    const result = only(results, "u1");
    assert.equal(result.outcome, "unavailable");
    if (result.outcome === "unavailable")
      assert.equal(result.reason, "source_error");
  });
  await test("truncated file → source_error, not no match", async () => {
    const source = createGbiSource({
      loadCsv: async () => fakeCsv(FAKE_ENTRIES),
    });
    const results = await checkRegistries(
      [subject("u1", "Nobody", "Qqnotreal", "1990-03-02")],
      [source]
    );
    const result = only(results, "u1");
    assert.equal(result.outcome, "unavailable");
  });
  await test("download failure → source_error", async () => {
    const source = createGbiSource({
      loadCsv: async () => {
        throw new Error("download failed: 503");
      },
    });
    const results = await checkRegistries(
      [subject("u1", "Alice", "Zztest", "1990-03-02")],
      [source]
    );
    const result = only(results, "u1");
    assert.equal(result.outcome, "unavailable");
    if (result.outcome === "unavailable")
      assert.equal(result.reason, "source_error");
  });

  console.log("NSOPW + checkRegistries");
  await test("NSOPW is always search-by-hand and never fetched", async () => {
    const realFetch = globalThis.fetch;
    let fetched = false;
    globalThis.fetch = (async () => {
      fetched = true;
      throw new Error("no");
    }) as typeof fetch;
    try {
      const results = await checkRegistries(
        [subject("u1", "Alice", "Zztest", "1990-03-02")],
        [nsopwSource]
      );
      const result = only(results, "u1");
      assert.equal(result.outcome, "unavailable");
      if (result.outcome === "unavailable") {
        assert.equal(result.reason, "manual_only");
        assert.equal(result.manualSearchUrl, "https://www.nsopw.gov/search-0");
      }
      assert.equal(fetched, false);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
  await test("one result per source per subject, in source order; a broken source doesn't stop the rest", async () => {
    const broken: ScreeningSource = {
      id: "gbi_ga",
      label: "Broken",
      manualSearchUrl: "https://example.org",
      check: async () => {
        throw new Error("boom");
      },
    };
    const results = await checkRegistries(
      [
        subject("u1", "Alice", "Zztest", "1990-03-02"),
        subject("u2", "Nobody", "Qqnotreal", null),
      ],
      [broken, nsopwSource]
    );
    for (const id of ["u1", "u2"]) {
      const list = results.get(id);
      assert.deepEqual(
        list?.map((r) => [r.source, r.outcome]),
        [
          ["gbi_ga", "unavailable"],
          ["nsopw", "unavailable"],
        ]
      );
    }
  });
  await test("no subjects → empty map, no source called", async () => {
    let called = false;
    const spy: ScreeningSource = {
      ...nsopwSource,
      check: async () => {
        called = true;
        return new Map();
      },
    };
    const results = await checkRegistries([], [spy]);
    assert.equal(results.size, 0);
    assert.equal(called, false);
  });
}

async function live() {
  console.log("GBI source (live download, made-up names only)");
  await test("downloads and reads the real file within the job budget", async () => {
    const started = Date.now();
    const results = await checkRegistries(
      [
        subject("fake-1", "Zzqx", "Notarealperson", "1990-03-02"),
        subject("fake-2", "Qqzy", "Madeupname-Testcase", "1975-11-30"),
      ],
      [gbiSource]
    );
    const elapsed = Date.now() - started;
    for (const id of ["fake-1", "fake-2"]) {
      const result = only(results, id);
      assert.equal(
        result.outcome,
        "no_match",
        `expected no_match, got ${result.outcome}${
          result.outcome === "unavailable" ? ` (${result.reason})` : ""
        }`
      );
    }
    console.log(`       download + parse + match: ${elapsed} ms`);
    assert.ok(elapsed < 8_000, "slower than the fetch timeout");
  });
}

async function main() {
  await offline();
  if (process.argv.includes("--live")) await live();
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}

main();
