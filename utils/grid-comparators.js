const normalizeString = (value) => (value ?? "").toString().trim().toLowerCase();

export const textComparator = (valueA, valueB) => normalizeString(valueA).localeCompare(normalizeString(valueB));

export const coerceNumber = (value) => {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return NaN;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  if (!cleaned) return NaN;
  const numeric = Number(cleaned);
  return Number.isNaN(numeric) ? NaN : numeric;
};

export const numberComparator = (valueA, valueB) => {
  const a = coerceNumber(valueA);
  const b = coerceNumber(valueB);
  const aValid = Number.isFinite(a);
  const bValid = Number.isFinite(b);
  if (aValid && bValid) return a - b;
  if (aValid) return -1;
  if (bValid) return 1;
  return 0;
};

export const smartComparator = (valueA, valueB) => {
  const numCompare = numberComparator(valueA, valueB);
  if (numCompare !== 0) {
    const a = coerceNumber(valueA);
    const b = coerceNumber(valueB);
    const aValid = Number.isFinite(a);
    const bValid = Number.isFinite(b);
    if (aValid || bValid) {
      return numCompare;
    }
  }
  return textComparator(valueA, valueB);
};
