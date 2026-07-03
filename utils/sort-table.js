/**
 * Alphabetical sort comparator for consistent sorting across the application
 * Uses localeCompare for proper string comparison with locale awareness
 */
export function alphabeticalSortComparator(a, b, field) {
  const aValue = a[field] || "";
  const bValue = b[field] || "";

  // Handle null/undefined values
  if (aValue === bValue) return 0;
  if (!aValue) return 1;
  if (!bValue) return -1;

  return aValue.toString().localeCompare(bValue.toString(), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Sort table data alphabetically by specified column
 * @param {string} columnName - The column to sort by
 * @param {Array} data - The data array to sort
 * @param {boolean} sortAsc - Sort ascending (true) or descending (false)
 * @returns {Array} Sorted data array
 */
export function sortTable(columnName, data, sortAsc = true) {
  if (!columnName || !data || !Array.isArray(data)) {
    return data || [];
  }

  const sortedData = [...data].sort((row1, row2) => {
    return alphabeticalSortComparator(row1, row2, columnName);
  });

  return sortAsc ? sortedData : sortedData.reverse();
}

/**
 * Default alphabetical sort for common fields (name, course, etc.)
 * @param {Array} data - The data array to sort
 * @param {string} defaultField - Default field to sort by (defaults to 'name')
 * @returns {Array} Sorted data array
 */
export function defaultAlphabeticalSort(data, defaultField = "name") {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return sortTable(defaultField, data, true);
}
