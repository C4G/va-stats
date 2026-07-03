// AG Grid row style parameters interface
interface RowData {
  risk_factor?: string;
  [key: string]: any; // Allow other properties
}

interface RowStyleParams {
  data: RowData;
  [key: string]: any; // Allow other AG Grid properties
}

// AG Grid row style function
export const getRowStyle = (params: RowStyleParams): { background: string } | undefined => {
  if (params.data.risk_factor === "Medium") {
    return { background: "lemonchiffon" };
  }
  if (params.data.risk_factor === "High") {
    return { background: "lightpink" };
  }
  return undefined;
};
