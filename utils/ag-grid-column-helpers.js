import { normalizeDateValue, dateFormatter, parseDateFromDateInput } from "./date-normalizers";

/**
 * parseISODate converts a date string in YYYY-MM-DD format to a Date object
 * Note: Dates in the database are stored in ISO format (YYYY-MM-DD).
 *
 * @param {*} dateStr - date string in YYYY-MM-DD format
 * @returns
 */
const parseISODate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-");
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

/**
 * Comparator function for sorting dates in DD-MM-YYYY format
 * Converts DD-MM-YYYY strings to dates for proper chronological sorting
 */
const dateComparator = (valueA, valueB) => {
  // Handle empty values
  if (!valueA && !valueB) return 0;
  if (!valueA) return -1;
  if (!valueB) return 1;

  const dateA = parseISODate(valueA);
  const dateB = parseISODate(valueB);

  if (!dateA && !dateB) return 0;
  if (!dateA) return -1;
  if (!dateB) return 1;

  return dateA.getTime() - dateB.getTime();
};

/**
 * Creates a date column definition for ag-Grid
 * Displays dates in dd-MM-yyyy format in both display and edit modes
 * Parses user input (dd-mm-yyyy or yyyy-mm-dd) back to yyyy-mm-dd for storage
 *
 * @param {Object} options - Configuration options
 * @param {string} options.field - Field name in the data
 * @param {string} options.headerName - Column header name
 * @param {boolean} [options.editable=true] - Whether the column is editable
 * @param {number} [options.width] - Column width
 * @param {string} [options.filter] - Filter type (e.g., "agDateColumnFilter")
 * @param {Object} [options.extraProps={}] - Additional properties to merge into the column definition
 * @returns {Object} ag-Grid column definition
 */
export const createDateColumn = ({ field, headerName, editable = true, width, filter, extraProps = {} }) => {
  return {
    headerName,
    field,
    editable,
    ...(width && { width }),
    ...(filter && { filter }),
    // Use the built-in date picker for editing dates
    cellEditor: "agDateStringCellEditor",
    filterParams: {
      buttons: ["reset", "apply"], // Add reset and apply buttons to the date filter (user needs to press "Apply" to enact changes)
      // This comparator parses the ISO date string and applies the filter logic
      comparator: (filterDate, cellValue) => {
        if (!cellValue) return -1;
        const cellDate = parseISODate(cellValue);
        if (cellDate < filterDate) return -1;
        if (cellDate > filterDate) return 1;
        return 0;
      },
    },
    // return the ISO date string (YYYY-MM-DD).
    // note that this does not affect the display value.
    valueGetter: (params) => {
      return params.data[field] ? params.data[field] : null;
    },
    // Normalize user input and store as ISO date string (YYYY-MM-DD)
    valueSetter: (params) => {
      // Store normalized date (YYYY-MM-DD) back to data
      const normalized = normalizeDateValue(params.newValue);
      if (normalized && normalized !== params.data[field]) {
        params.data[field] = normalized;
        return true;
      } else if (params.newValue === "" || params.newValue === null || params.newValue === undefined) {
        params.data[field] = null;
        return true;
      }
      return false;
    },
    valueFormatter: (params) => {
      if (params.value) {
        return dateFormatter.format(new Date(parseDateFromDateInput(params.value)));
      }
      return "";
    },
    // // Display value in dd-MM-yyyy format using the English India locale
    // valueFormatter: (params) => {
    //   return params.value ? parseISODate(params.value).toLocaleDateString("en-IN") : "";
    // },
    // Display value in dd-MM-yyyy format using the English India locale
    cellRenderer: (params) => {
      if (!params.value) return "";

      const parsedDate = new Date(parseDateFromDateInput(params.value));

      const display = dateFormatter.format(parsedDate);

      const getOrdinal = (day) => {
        if (day > 3 && day < 21) return `${day}th`;
        switch (day % 10) {
          case 1:
            return `${day}st`;
          case 2:
            return `${day}nd`;
          case 3:
            return `${day}rd`;
          default:
            return `${day}th`;
        }
      };

      const month = parsedDate.toLocaleString("en-US", { month: "long" });
      const day = getOrdinal(parsedDate.getDate());
      const year = parsedDate.getFullYear();

      const ariaLabel = `${month} ${day}, ${year}`;

      return <span aria-label={ariaLabel}>{display}</span>;
    },

    // Parse user input (dd-mm-yyyy or yyyy-mm-dd) back to yyyy-mm-dd during editing
    valueParser: (params) => {
      const normalized = normalizeDateValue(params.newValue);
      if (normalized && /^\d{4}-\d{2}-\d{2}$/.test(String(normalized))) {
        return normalized;
      }
      return params.newValue || "";
    },
    // Add comparator for proper date sorting
    comparator: dateComparator,
    ...extraProps,
  };
};
