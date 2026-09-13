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
