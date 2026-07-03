import StudentDeleteCell from "../components/students/StudentDeleteCell";
import AccessibleSelectCellEditor from "../components/AccessibleSelectCellEditor";
import Link from "next/link";
import { numberComparator } from "./grid-comparators";

/** Convert duration + duration_type to days for comparable sort/filter. */
export function durationToDays(duration, durationType) {
  const n = Number(duration);
  if (!Number.isFinite(n) || n < 0) return NaN;
  const type = (durationType ?? "").toString().trim().toLowerCase();
  if (type === "day" || type === "days") return n;
  if (type === "week" || type === "weeks") return n * 7;
  if (type === "month" || type === "months") return n * 30;
  return NaN;
}

/** Compare two rows by duration in days (for Duration column sort). */
function durationComparator(valueA, valueB, nodeA, nodeB) {
  const daysA = durationToDays(nodeA?.data?.duration, nodeA?.data?.duration_type);
  const daysB = durationToDays(nodeB?.data?.duration, nodeB?.data?.duration_type);
  return numberComparator(daysA, daysB);
}

const clipTextCellStyle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const getCoursesColumnDefs = (handleDelete, onCourseCellChange, options = {}) => {
  const { showBatchStatusRulesLink = false, batchStatusRulesLinkClassName = "" } = options;

  const cols = [
    {
      field: "delete",
      headerName: "",
      maxWidth: 76,
      cellRenderer: (props) => StudentDeleteCell(props, handleDelete),
      sortable: false,
      filter: false,
      resizable: false,
      editable: false,
      suppressKeyboardEvent: (params) => {
        const { event } = params;
        const cellElement = event.target.closest(".ag-cell");
        const button = cellElement?.querySelector("button");

        // Handle both Enter and Space keys for actions column
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (button) {
            button.focus();
            button.click();
          }
          return true;
        }

        // Allow normal tab navigation
        if (event.key === "Tab") {
          return false;
        }

        return false;
      },
      width: 380,
    },
  ];

  if (showBatchStatusRulesLink) {
    cols.push({
      field: "batchStatusRules",
      headerName: "Batch rules",
      maxWidth: 130,
      minWidth: 110,
      sortable: false,
      filter: false,
      resizable: true,
      editable: false,
      cellRenderer: (params) => {
        const name = params.data?.course;
        if (!name) return null;
        const href = `/configurations?course=${encodeURIComponent(name)}#batch-status-rules`;
        return (
          <Link
            href={href}
            className={batchStatusRulesLinkClassName || undefined}
            aria-label={`Configure batch status rules for ${name}`}
          >
            Configure
          </Link>
        );
      },
    });
  }

  cols.push(
    {
      field: "course",
      headerName: "Name",
      editable: true,
      flex: 1,
      minWidth: 140,
      cellStyle: clipTextCellStyle,
      tooltipField: "course",
      onCellValueChanged: (params) => onCourseCellChange?.(params),
    },
    {
      field: "description",
      headerName: "Description",
      flex: 2,
      minWidth: 160,
      wrapText: true,
      autoHeight: true,
      editable: true,
      tooltipField: "description",
      onCellValueChanged: (params) => onCourseCellChange?.(params),
    },

    // Duration dropdown (confirm before save); sort/filter by duration in days (duration × duration_type)
    {
      field: "duration",
      headerName: "Duration",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["", ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]],
      },
      cellRenderer: (params) => params.value || "",
      onCellValueChanged: (params) => onCourseCellChange?.(params),
      sortValueGetter: (params) => durationToDays(params.data?.duration, params.data?.duration_type),
      filterValueGetter: (params) => durationToDays(params.data?.duration, params.data?.duration_type),
      comparator: durationComparator,
    },

    // Duration Type dropdown (confirm before save)
    {
      field: "duration_type",
      headerName: "Duration Type",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: ["", ...["days", "weeks", "months"]] },
      cellRenderer: (params) => params.value || "",
      onCellValueChanged: (params) => onCourseCellChange?.(params),
    }
  );

  return cols;
};
