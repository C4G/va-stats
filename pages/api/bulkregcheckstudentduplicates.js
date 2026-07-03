/*
This function is called from bulkregistration.jsx (Bulk Registration link).
student bulk registration checking for duplicates in the database.
*/

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    const rows = req.body.rows;
    // console.log("body received in bulkregcheckstudentduplicates API:", req.body);

    // console.log("Received rows for duplicate check:", rows);

    const dupConditions = [];
    const dupValues = [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No student entries provided",
        duplicates: [],
      });
    }

    // in the mysql table, the unique key requirement is
    // gender, age, and phone_number
    // you can check this by running
    // SHOW INDEX FROM vastats.vastudents;
    // and looking for the unique key constraint
    rows.forEach((row) => {
      dupConditions.push("(gender = ? AND age = ? AND phone_number = ?)");
      dupValues.push(row.gender || null, row.age || null, row.phone_number || null);
    });

    const whereClause = dupConditions.join(" OR ");
    // console.log("WHERE clause for duplicate check:", whereClause);

    const query = `
    SELECT 
      id, gender, cast(age as char) as age, phone_number 
    FROM 
      vastudents 
    WHERE 
      ${whereClause}
    `;

    console.log("Executing duplicate check query:", query);
    console.log("With values:", dupValues);

    const duplicates = await executeQuery({
      query: query,
      values: dupValues,
    });

    console.log("Duplicate check query result:", duplicates);

    // compare query findings with input data
    // updating row._errors._database_duplicates with any error messages if duplicates are found
    const duplicatesSet = new Set(duplicates.map((dup) => `${dup.gender}|${dup.age}|${dup.phone_number}`));
    console.log("Set of existing students for duplicate check:", duplicatesSet);

    rows.forEach((row) => {
      const identifier = `${row.gender}|${row.age}|${row.phone_number}`;
      if (duplicatesSet.has(identifier)) {
        row._errors._database_duplicates.push("Duplicate entry found in database.");
      }
    });

    const rowsWithDuplicates = rows.filter((row) => row._errors._database_duplicates.length > 0);
    console.log("Rows identified as duplicates after processing:", rowsWithDuplicates);

    // Return a JSON success response instead of redirecting
    return res.status(200).json({
      success: true,
      message: "Duplicate check completed",
      rows: rowsWithDuplicates,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
