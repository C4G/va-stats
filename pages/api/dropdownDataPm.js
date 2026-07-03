// Part of page group that populate a dynamic dropdown from MySQL:
// /db.js
// /pages/api/dropdownDataPm.js
// /pages/api/dropdownDataStaff.js
// /components/DropdownMenuStaff.js
// Author: Dante Ciolfi
// Updates: 5/4/2024, 8/27/2024

/* POSSIBLE DELETE (OLD CODE) */

// export default async (req, res) => {
//   connection.query("SELECT * FROM vausers where designation = 'Program Manager'", function (error, results, fields) {
//     if (error) throw error;
//     res.status(200).json(results, fields);
//   });
// };

import { executeQuery } from "@/lib/db";

async function pmManager(req, res) {
  try {
    const results = await executeQuery({
      query:
        "SELECT * FROM vausers WHERE designation REGEXP '^(Senior Program Manager|Program Manager|Program Coordinator)$' ORDER BY name ASC",
    });
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching PM list:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
export default pmManager;
