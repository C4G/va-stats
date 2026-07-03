// Part of page group that populate a dynamic dropdown from MySQL:
// /db.js
// /pages/api/dropdownDataPm.js
// /pages/api/dropdownDataStaff.js
// /components/DropdownMenuStaff.js
// Referenced at: /pages/batches/(Create batch dropdown)
// Author: Dante Ciolfi
// Updates: 4/26/2024, 8-27-2024

// POSSIBLE DELETE (OLD CODE)

// export default async (req, res) => {
//     connection.query('SELECT * FROM vausers', function (error, results, fields) {
//       if (error) throw error;
//       res.status(200).json(results, fields);
//     });
// };

import { executeQuery } from "@/lib/db";

async function staffList(req, res) {
  try {
    const results = await executeQuery({
      query: "SELECT DISTINCT * FROM vausers ORDER BY name ASC",
    });
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching staff list:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
export default staffList;
