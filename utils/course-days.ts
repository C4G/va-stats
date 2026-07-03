/**
 * Utility functions for working with course days
 */

import { dateToLocalYYYYMMDD } from "./date-normalizers";

const DAYS_MAP = {
  Su: 0,
  M: 1,
  T: 2,
  W: 3,
  Th: 4,
  F: 5,
  Sa: 6,
} as const;

/**
 * Parses a raw course days string into an array of day codes
 * Supports formats: "M,T,W", "[M,T,W]", "M T W", "MTW", etc.
 */
export function parseCourseDays(rawDays: string | string[] | null | undefined): string[] {
  if (!rawDays) return [];
  if (Array.isArray(rawDays)) return rawDays;

  const trimmed = String(rawDays).trim();
  if (trimmed === "") return [];

  // Handle JSON array format: "[M,T,W]"
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map((d) => String(d).trim()).filter(Boolean) : [];
    } catch {
      // fall through to other parsing strategies
    }
  }

  // Handle comma-separated: "M,T,W"
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }

  // Handle space-separated or concatenated: "M T W" or "MTW"
  const matches = trimmed.match(/Th|Su|Sa|M|T|W|F/g);
  return matches ?? [];
}

/**
 * Checks if a given day of week (0-6, where 0=Sunday) is a class day
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @param courseDays - Raw course days string or parsed array
 */
export function isClassDay(dayOfWeek: number, courseDays: string | string[] | null | undefined): boolean {
  if (courseDays === null || courseDays === undefined) return false;

  const parsedDays = Array.isArray(courseDays) ? courseDays : parseCourseDays(courseDays);

  return parsedDays.some((day) => {
    const dayCode = day.trim();
    return DAYS_MAP[dayCode as keyof typeof DAYS_MAP] === dayOfWeek;
  });
}

/**
 * Normalizes a date string to YYYY-MM-DD format
 * Handles ISO strings with time (removes time portion)
 *
 * IMPORTANT: If input is already in YYYY-MM-DD format, returns it as-is to avoid timezone issues.
 * Only Date objects and ISO strings with time are normalized.
 */
export function normalizeDateString(date: string | Date | null | undefined): string {
  if (!date) return "";

  // If it's already a YYYY-MM-DD string, return as-is (avoid timezone conversion)
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // ISO datetime: local calendar date (UTC date part is wrong for IST and similar zones)
    if (trimmed.includes("T")) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        const local = dateToLocalYYYYMMDD(parsed);
        if (local) return local;
      }
      return trimmed.split("T")[0];
    }
    return trimmed;
  }

  // For Date objects, use local date components to avoid timezone shift
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(date);
}

/**
 * Generates an array of all class dates between start and end dates
 * based on the course days schedule
 * @param startDate - Start date (string or Date)
 * @param endDate - End date (string or Date)
 * @param courseDays - Course days string or parsed array
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function generateClassDateArray(
  startDate: string | Date,
  endDate: string | Date,
  courseDays: string | string[] | null | undefined
): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return [];
  if (start > end) return [];

  const parsedDays = Array.isArray(courseDays) ? courseDays : parseCourseDays(courseDays);
  if (parsedDays.length === 0) return [];

  const dateArray: string[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    if (isClassDay(currentDate.getDay(), parsedDays)) {
      dateArray.push(normalizeDateString(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateArray;
}

/**
 * Finds the most recent class date up to today
 * First tries to find from attendance data, then falls back to calculating from course schedule
 * @param attendanceDates - Array of date strings from attendance data
 * @param coursestart - Course start date
 * @param courseend - Course end date
 * @param coursedays - Course days string or parsed array
 * @returns Most recent class date string in YYYY-MM-DD format, or today's date if none found
 */
export function findMostRecentClassDate(
  attendanceDates: string[] | null | undefined,
  coursestart: string | Date | null | undefined,
  courseend: string | Date | null | undefined,
  coursedays: string | string[] | null | undefined
): string {
  const today = new Date();
  const todaysDate = normalizeDateString(today);

  // First, try to find from attendance data
  if (attendanceDates && attendanceDates.length > 0) {
    const validDates = attendanceDates
      .map((d) => normalizeDateString(d))
      .filter((date) => date && date <= todaysDate)
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // Descending order

    if (validDates.length > 0) {
      return validDates[0];
    }
  }

  // Fallback: calculate from course schedule
  if (coursestart && courseend && coursedays) {
    const allClassDates = generateClassDateArray(coursestart, courseend, coursedays);
    const validDates = allClassDates
      .filter((date) => date && date <= todaysDate)
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // Descending order

    if (validDates.length > 0) {
      return validDates[0];
    }
  }

  // Final fallback: return today's date
  return todaysDate;
}
