interface RowData {
  risk_factor?: string;
  [key: string]: unknown;
}

// AG Grid row style function
interface RowStyleParams {
  data?: RowData;
}

export const getRowStyle = (params: RowStyleParams): { background: string } | undefined => {
  if (params.data?.risk_factor === "Medium") {
    return { background: "lemonchiffon" };
  }
  if (params.data?.risk_factor === "High") {
    return { background: "lightpink" };
  }
  return undefined;
};
