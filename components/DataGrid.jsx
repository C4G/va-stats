import { getRowStyle } from "@/utils/get-row-style";
import { smartComparator } from "@/utils/grid-comparators";
import { AgGridReact } from "ag-grid-react";
import React from "react";

export function DataGrid({ title, rowData, onGridReady, onCellKeyDown, exitTargetId }) {
  const columnDefs = [
    {
      field: "id",
      headerName: "ID",
      sortable: true,
    },
    {
      field: "name",
      headerName: "Name",
      sortable: true,
    },
    {
      field: "first_choice",
      headerName: "First Choice",
      sortable: true,
    },
    {
      field: "second_choice",
      headerName: "Second Choice",
      sortable: true,
    },
    {
      field: "third_choice",
      headerName: "Third Choice",
      sortable: true,
    },
  ];

  const defaultColDef = {
    resizable: true,
    editable: false,
    filter: true,
    comparator: smartComparator,
  };

  const tabToNextCell = (params) => {
    const { previousCellPosition, backwards, api } = params;

    if (!previousCellPosition) return null;

    const rowCount = rowData.length;

    const currentIndex = previousCellPosition.rowIndex ?? -1;

    const nextRowIndex = backwards ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex >= rowCount || nextRowIndex < 0 || nextRowIndex >= rowCount) {
      setTimeout(() => {
        const nextEl = document.getElementById(exitTargetId);
        nextEl?.focus();
      }, 0);

      return null;
    }

    return {
      rowIndex: nextRowIndex,
      column: api.getAllDisplayedColumns()[0],
    };
  };

  const rowSelection = {
    mode: "multiRow",
  };

  return (
    <div
      className="ag-theme-alpine"
      style={{ height: "40dvh", width: "75dvh" }}
      role="region"
      aria-label={title}
      aria-describedby={`${title}-instructions`}
    >
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>

      <p id={`${title}-instructions`} className="sr-only">
        Use arrow keys to navigate rows. Press space to select students.
      </p>

      <AgGridReact
        enableCellTextSelection={true}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection={rowSelection}
        onGridReady={onGridReady}
        animateRows={true}
        ensureDomOrder={true}
        suppressCellFocus={false}
        getRowStyle={getRowStyle}
        onCellKeyDown={onCellKeyDown}
        tabToNextCell={tabToNextCell}
      />
    </div>
  );
}
