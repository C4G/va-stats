const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Display date in dd-MMM-yyyy format for en-IN locale (e.g., 15/08/2023)
export const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export const parseDateFromDateInput = (value) => {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const parseDateTimeFromDB = (value) => {
  if (typeof value !== "string") return null;
  const [date, time] = value.split("T");
  if (!date || !time) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = time.split(".")[0].split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
};

/** Calendar YYYY-MM-DD in the local timezone (DATE-only fields; avoids UTC day shift). */
export const dateToLocalYYYYMMDD = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const normalizeDateValue = (value) => {
  if (!value) return value;

  if (value instanceof Date) {
    return dateToLocalYYYYMMDD(value) || "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Already in YYYY-MM-DD format
    if (DATE_REGEX.test(trimmed)) {
      return trimmed;
    }

    // ISO datetime: use local calendar date, not UTC (splitting "T" breaks IST etc.)
    if (trimmed.includes("T")) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        const local = dateToLocalYYYYMMDD(parsed);
        if (local) return local;
      }
      return trimmed.split("T")[0];
    }

    // Try to parse dd-mm-yyyy or dd/mm/yyyy format
    const ddmmyyyyRegex = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/;
    const match = trimmed.match(ddmmyyyyRegex);
    if (match) {
      const [, day, month, year] = match;
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      // Validate date
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
        const date = new Date(yearNum, monthNum - 1, dayNum);
        if (!isNaN(date.getTime()) && date.getDate() === dayNum && date.getMonth() === monthNum - 1) {
          return `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        }
      }
    }

    // Try parsing as regular date string
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return dateToLocalYYYYMMDD(parsed) || trimmed;
    }
  }

  return value;
};

export const normalizeDates = (items = [], fields = []) =>
  items.map((item) => {
    if (!item || typeof item !== "object") return item;
    const next = { ...item };
    fields.forEach((field) => {
      if (field in next) {
        next[field] = normalizeDateValue(next[field]);
      }
    });
    return next;
  });

export const normalizeBatchDates = (batches = []) => normalizeDates(batches, ["coursestart", "courseend"]);

export const normalizeStudentDates = (students = []) => normalizeDates(students, ["age", "registration_date"]);

export const normalizeUserDates = (users = []) =>
  normalizeDates(users, ["joindate", "date_of_birth", "registration_date", "age", "contract_end_date"]);

export const formatDateInput = (value) => normalizeDateValue(value) || "";

export const parseDateInput = (value) => {
  const normalized = normalizeDateValue(value);
  return normalized || null;
};
