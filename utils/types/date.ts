// utils/types/date.ts
import { format, parseISO } from "date-fns";

export const DISPLAY_FMT = "dd-MM-yyyy";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const toDisplay = (v?: string | Date) => {
  if (!v) return "";

  try {
    let date: Date;

    if (v instanceof Date) {
      date = v;
    } else if (typeof v === "string") {
      // Handle YYYY-MM-DD format safely - parse as local date to avoid timezone issues
      if (DATE_REGEX.test(v)) {
        // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone shift
        const [year, month, day] = v.split("-").map(Number);
        date = new Date(year, month - 1, day);
      } else if (v.includes("T")) {
        // ISO string with time - use parseISO
        date = parseISO(v);
      } else {
        // Try parsing as regular date string
        date = new Date(v);
      }
    } else {
      return "";
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "";
    }

    return format(date, DISPLAY_FMT);
  } catch (error) {
    console.error("Error formatting date:", error, v);
    return "";
  }
};

export const toISO = (v: string) => parseISO(v);
