// Part of page group that populate a dynamic dropdown from MySQL:
// /lib/db.ts
// /pages/api/dropdownDataPm.ts
// /pages/api/dropdownDataStaff.ts
// /components/DropdownMenuStaff.tsx
// Author: Dante Ciolfi
// Updates: 5/4/2024, 8/27/2024

/* POSSIBLE DELETE (OLD CODE) */

// export default async (req, res) => {
//   connection.query("SELECT * FROM vausers where designation = 'Program Manager'", function (error, results, fields) {
//     if (error) throw error;
//     res.status(200).json(results, fields);
//   });
// };

import { prisma } from "@/lib/prisma";

async function pmManager(req, res) {
  try {
    const results = await prisma.vausers.findMany({
      where: {
        designation: { in: ["Senior Program Manager", "Program Manager", "Program Coordinator"] },
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching PM list:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
export default pmManager;
