import React from "react";

const TelecallerRemarksCellRenderer = (params) => {
  const { colDef, data } = params;
  const telecaller_remarks = data.telecaller_remarks?.split(" || ") ?? [];
  const fieldName = colDef.headerName;
  const personName = data.name;
  const value = telecaller_remarks.join(", ");
  return (
    <>
      {telecaller_remarks.length ? (
        <div className="flex flex-col gap-1" role="gridcell" aria-label={`${personName}'s ${fieldName} ${value}`}>
          {telecaller_remarks.map((remark, index) => (
            <span className="leading-4" key={`${remark}-${index}`}>
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

export default TelecallerRemarksCellRenderer;
