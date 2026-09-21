import { searchAndUpdateStudentData } from "../search-and-update-student-data";
import { vi } from "vitest";

describe("searchAndUpdateStudentData", () => {
  it("populates textarea fields when an existing student is loaded", async () => {
    document.body.innerHTML = `
      <form id="studentRegForm">
        <input name="name" />
        <textarea name="impairment_history"></textarea>
        <button type="submit">Submit</button>
      </form>
    `;

    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 42,
              name: "Test Student",
              impairment_history: "Existing history",
            }),
        })
      ),
    });

    await searchAndUpdateStudentData({
      phone_number: "1234567890",
      gender: "Female",
      dobYear: "2000",
      dobMonth: "01",
      dobDay: "02",
    });

    const impairmentHistory = document.querySelector<HTMLTextAreaElement>('[name="impairment_history"]');
    if (!impairmentHistory) throw new Error("Expected impairment history textarea");

    expect(impairmentHistory.value).toBe("Existing history");
  });
});
