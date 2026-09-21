import { describe, expect, it, vi } from "vitest";
import { isGridEditing, shouldStartCellEditing, shouldSuppressSpaceNavigation } from "../grid-editing";

describe("AG Grid keyboard editing", () => {
  it("recognizes an active edit reported by the grid API", () => {
    const api = { getEditingCells: vi.fn(() => [{}]) };

    expect(isGridEditing(false, api)).toBe(true);
  });

  it("does not start another edit when Space is pressed inside an editor", () => {
    expect(shouldStartCellEditing(" ", true, true)).toBe(false);
  });

  it("does not suppress Space input while a cell is being edited", () => {
    expect(shouldSuppressSpaceNavigation(" ", true)).toBe(false);
  });

  it("suppresses Space navigation when the grid is not editing", () => {
    expect(shouldSuppressSpaceNavigation(" ", false)).toBe(true);
  });
});
