/*
This function is called from index.jsx to count number of students for overall stats
*/

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    const data = await executeQuery({
      query: "SELECT COUNT(*) FROM vacourses",
      values: [],
    });
    console.log(data[0]["COUNT(*)"]);
    res.status(200).json({ count: data[0]["COUNT(*)"] });
    res.end();
  } catch (error) {
    console.log(error);
  }
}
