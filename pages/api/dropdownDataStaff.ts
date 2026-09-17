// Part of page group that populate a dynamic dropdown from MySQL:
// /lib/db.ts
// /pages/api/dropdownDataPm.ts
// /pages/api/dropdownDataStaff.ts
// /components/DropdownMenuStaff.tsx
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

import { prisma } from "@/lib/prisma";

async function staffList(req, res) {
  try {
    const results = await prisma.vausers.findMany({ orderBy: { name: "asc" } });
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching staff list:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
export default staffList;
