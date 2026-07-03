// Convert number or string value to Yes/No format
export const convertNumberToYesNo = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) {
    return "No";
  }

  // Convert to number for comparison
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (numValue > 0 || value === "1") {
    return "Yes";
  } else if (numValue === 0 || value === "0") {
    return "No";
  } else {
    return String(value); // Handle unexpected values
  }
};
