import React from "react";

const RemarksCellRenderer = (params) => {
  const { colDef, data } = params;
  const remarks = data.remarks?.split(" || ") ?? [];
  const fieldName = colDef.headerName;
  const personName = data.name;
  const value = remarks.join(", ");
  return (
    <>
      {remarks.length ? (
        <div className="flex flex-col gap-1" role="gridcell" aria-label={`${personName}'s ${fieldName} ${value}`}>
          {remarks.map((remark) => (
            <span className="leading-4" key={remark}>
              {remark}
            </span>
          ))}
        </div>
      ) : (
        ""
      )}
    </>
  );
};

export default RemarksCellRenderer;
