type GridApiWithEditingCells = {
  getEditingCells: () => unknown[];
};

export function isGridEditing(editing: boolean | undefined, api: GridApiWithEditingCells): boolean {
  return Boolean(editing || api.getEditingCells().length > 0);
}

export function shouldSuppressSpaceNavigation(key: string, gridIsEditing: boolean): boolean {
  return key === " " && !gridIsEditing;
}

export function shouldStartCellEditing(key: string, editable: unknown, gridIsEditing: boolean): boolean {
  return !gridIsEditing && Boolean(editable) && (key === " " || key === "Enter");
}
