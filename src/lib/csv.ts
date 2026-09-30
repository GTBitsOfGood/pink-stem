export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

const escape = (value: unknown) => {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Serializes rows to RFC 4180 CSV with a header line. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => escape(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(c.value(row))).join(","));
  }
  return lines.join("\n");
}

/**
 * Parses RFC 4180 CSV into rows of fields, header included. Handles quoted
 * fields, doubled quotes, and line breaks inside quotes; blank lines are skipped.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endRow = () => {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
    field = "";
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") endRow();
    else if (char !== "\r") field += char;
  }
  if (field !== "" || row.length) endRow();
  return rows;
}
