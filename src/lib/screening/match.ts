import { SCREENING_BIRTH_YEAR_TOLERANCE } from "@/constants/limits";

const SUFFIXES = new Set(["JR", "SR", "II", "III", "IV", "V"]);

/** Particles like DE or LA are too short to match a compound last name on their own. */
const MIN_PART_LENGTH = 3;

/**
 * A name as comparable words: accents folded, uppercased, apostrophes and
 * periods dropped (O'Brien → OBRIEN), split on anything else (hyphens,
 * spaces), and generational suffixes removed unless they're the only word.
 */
export const nameWords = (value: string): string[] => {
  const words = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/['’.]/g, "")
    .split(/[^A-Z]+/)
    .filter(Boolean);
  const kept = words.filter((word) => !SUFFIXES.has(word));
  return kept.length ? kept : words;
};

/**
 * The keys a last name can match on: the whole name run together, plus each
 * part of a compound name. "Garcia-Lopez" matches a registry "GARCIA" and a
 * registry "GARCIA LOPEZ"; the birth year check keeps that from getting noisy.
 */
export const lastNameKeys = (words: string[]): string[] => {
  if (!words.length) return [];
  const keys = new Set([words.join("")]);
  if (words.length > 1) {
    for (const word of words) {
      if (word.length >= MIN_PART_LENGTH) keys.add(word);
    }
  }
  return [...keys];
};

export interface RegistryName {
  first: string[];
  last: string[];
}

/** Splits "LAST, FIRST MIDDLE SUFFIX", the format registries print. */
export const parseRegistryName = (value: string): RegistryName => {
  const comma = value.indexOf(",");
  if (comma === -1) {
    const words = nameWords(value);
    return { first: words.slice(0, 1), last: words.slice(-1) };
  }
  return {
    last: nameWords(value.slice(0, comma)),
    first: nameWords(value.slice(comma + 1)),
  };
};

/** Last names share a key and first names agree on their first word. Middle names are ignored. */
export const namesMatch = (
  subject: RegistryName,
  entry: RegistryName
): boolean => {
  if (!subject.first.length || !entry.first.length) return false;
  if (subject.first[0] !== entry.first[0]) return false;
  const entryKeys = new Set(lastNameKeys(entry.last));
  return lastNameKeys(subject.last).some((key) => entryKeys.has(key));
};

/** An unknown registry year can't rule a hit out, so it counts. */
export const birthYearMatches = (
  dateOfBirth: Date,
  yearOfBirth: number | null
): boolean =>
  yearOfBirth == null ||
  Math.abs(dateOfBirth.getUTCFullYear() - yearOfBirth) <=
    SCREENING_BIRTH_YEAR_TOLERANCE;
