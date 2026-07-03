import React, { forwardRef, useRef, useState, useEffect } from "react";

const AccessibleSelectCellEditor = forwardRef((props) => {
  const { onValueChange, value, values, stopEditing, colDef, data, formatter } = props;

  // If a formatter is provided, use it to format the initial value for display
  const formattedValue = formatter ? formatter(value) : value;

  const [selectedValue, setSelectedValue] = useState(formattedValue || "");
  const selectRef = useRef(null);
  const valueRef = useRef(formattedValue || "");

  // Auto-focus and open the select element when the editor mounts
  useEffect(() => {
    if (selectRef.current) {
      selectRef.current.focus();

      // Attempt to open the dropdown immediately
      setTimeout(() => {
        if (selectRef.current && typeof selectRef.current.showPicker === "function") {
          try {
            selectRef.current.showPicker();
          } catch (err) {
            // showPicker might fail in some contexts, that's okay
            console.debug("showPicker failed:", err);
          }
        }
      }, 0);
    }
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    valueRef.current = newValue;
    setSelectedValue(newValue);

    onValueChange(newValue);
    stopEditing();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      const resetValue = formatter ? formatter(value) : value;
      valueRef.current = resetValue;
      setSelectedValue(resetValue);
      if (stopEditing) {
        stopEditing(true); // Cancel editing
      }
    } else if (e.key === " " || e.key === "Enter") {
      // Don't prevent default - let the browser handle opening the dropdown
      e.stopPropagation(); // Only stop propagation to AG Grid
    } else if (e.key === "Tab") {
      e.stopPropagation();
      if (stopEditing) {
        stopEditing();
      }
    } else {
      // Prevent AG Grid from handling other keys
      e.stopPropagation();
    }
  };

  // Generate accessible label from column and row context
  const fieldName = colDef?.headerName || colDef?.field || "Value";
  const studentName = data?.name || "Student";
  const ariaLabel = `${fieldName} for ${studentName}. Current value: ${selectedValue || "Not set"}`;

  return (
    <select
      ref={selectRef}
      value={selectedValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      className="h-full w-full rounded border-2 border-blue-500 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-600"
      style={{
        fontSize: "16px", // Prevents zoom on iOS
        minHeight: "44px", // iOS touch target size
      }}
    >
      <option value="" disabled>
        Select...
      </option>
      {values?.map((val) => (
        <option key={val} value={val}>
          {val}
        </option>
      ))}
    </select>
  );
});

AccessibleSelectCellEditor.displayName = "AccessibleSelectCellEditor";

export default AccessibleSelectCellEditor;
