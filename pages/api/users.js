/*
This function is called from the Courses page (/users.jsx).
It executes the query that SHOWS CURRENT USERS.
*/

import { executeQuery } from "@/lib/db";

export default async function assetHandler(req, res) {
  const { method } = req;
  switch (method) {
    case "GET":
      try {
        const result = await executeQuery({
          query: "SELECT * FROM vausers",
          values: [],
        });
        res.json(result);
        //.log(result);
        return result;
      } catch (e) {
        console.error("Request error", e);
        res.status(500).json({ error: "Error fetching batches" });
      }
    default:
      res.setHeader("Allow", ["GET"]);
      break;
  }
}
