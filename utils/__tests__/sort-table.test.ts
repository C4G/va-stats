/**
 * Tests for alphabetical sorting utilities
 */

import { sortTable, defaultAlphabeticalSort } from "../sort-table";

describe("Alphabetical Sort Utilities", () => {
  const testData = [
    { id: 1, name: "Charlie", course: "Advanced JavaScript" },
    { id: 2, name: "Alice", course: "Basic HTML" },
    { id: 3, name: "Bob", course: "CSS Fundamentals" },
    { id: 4, name: "alice", course: "React Basics" },
    { id: 5, name: null, course: "Vue.js" },
    { id: 6, name: "", course: "Angular" },
  ];

  describe("sortTable", () => {
    it("should sort data alphabetically by specified field", () => {
      const sorted = sortTable("name", testData, true);
      expect(sorted[0].name).toBe("Alice");
      expect(sorted[1].name).toBe("alice");
      expect(sorted[2].name).toBe("Bob");
      expect(sorted[3].name).toBe("Charlie");
    });

    it("should sort in descending order when sortAsc is false", () => {
      const sorted = sortTable("name", testData, false);
      expect(sorted[0].name).toBe("");
      expect(sorted[1].name).toBe(null);
      expect(sorted[2].name).toBe("Charlie");
      expect(sorted[3].name).toBe("Bob");
    });

    it("should not mutate original array", () => {
      const originalData = [...testData];
      sortTable("name", testData, true);
      expect(testData).toEqual(originalData);
    });
  });

  describe("defaultAlphabeticalSort", () => {
    it("should sort by default field (name)", () => {
      const sorted = defaultAlphabeticalSort(testData);
      expect(sorted[0].name).toBe("Alice");
      expect(sorted[1].name).toBe("alice");
      expect(sorted[2].name).toBe("Bob");
      expect(sorted[3].name).toBe("Charlie");
    });

    it("should handle empty array", () => {
      const sorted = defaultAlphabeticalSort([]);
      expect(sorted).toEqual([]);
    });
  });
});
