import { normalizeDateValue } from "./date-normalizers";
import { toDisplay } from "./types/date";

// Strings that are genuinely dates: ISO date / datetime, or dd-mm-yyyy (dd/mm/yyyy).
// We must NOT feed arbitrary strings to new Date(): it is lenient enough to parse
// values like "90.9%" into a bogus date (1990-09-01), which previously turned the
// attendance-percentage column into a fake "date of birth".
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;
const DDMMYYYY = /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/;

const formatValue = (value) => {
  if (value == null) return "";

  if (value instanceof Date) {
    return toDisplay(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (ISO_DATE.test(trimmed) || DDMMYYYY.test(trimmed)) {
      const normalized = normalizeDateValue(trimmed);
      if (typeof normalized === "string" && /^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return toDisplay(normalized);
      }
    }
    return value;
  }

  return value;
};

// RFC-4180 escaping. A field that contains a comma, double-quote, or newline
// must be wrapped in double quotes with any inner quotes doubled. Previously
// commas were simply deleted from the value, which corrupted data and did
// nothing for newlines/quotes — a single remark like "Good, needs\npractice"
// would either lose its comma or split the row and shift every later column.
const escapeCsv = (value) => {
  const str = value == null ? "" : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
};

export const exportToCsv = (filename, rows, summary = []) => {
  if (!rows?.length) return;

  const isDateKey = (key) => /^\d{4}-\d{2}-\d{2}$/.test(key);

  // Build a stable column list from the UNION of every row's keys, not just the
  // first row. Rows can have different key sets (e.g. students with attendance on
  // different dates), and keying the header off rows[0] alone shifts every other
  // row's values into the wrong columns. Non-date keys keep first-seen order;
  // date columns are collected together and sorted chronologically.
  const nonDateKeys = [];
  const seen = new Set();
  const dateKeys = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (isDateKey(key)) {
        dateKeys.add(key);
      } else if (!seen.has(key)) {
        seen.add(key);
        nonDateKeys.push(key);
      }
    }
  }
  const headerKeys = [...nonDateKeys, ...Array.from(dateKeys).sort()];

  const processHeader = () => headerKeys.map((key) => escapeCsv(key)).join(",") + "\n";

  // Align each row to headerKeys so a missing key becomes an empty cell instead
  // of shifting later values left into the wrong column.
  const processRows = (rows) =>
    rows.map((item) => headerKeys.map((key) => escapeCsv(formatValue(item[key]))).join(",")).join("\n");

  // Summary rows are arrays of preformatted strings; still escape each cell so a
  // comma in e.g. a batch name can't shift the summary columns.
  const processSummary = (summary) =>
    Array.isArray(summary) && summary.length
      ? summary.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n") + "\n\n"
      : "";

  const csvFile = processSummary(summary) + processHeader() + processRows(rows);

  const blob = new Blob([csvFile], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
