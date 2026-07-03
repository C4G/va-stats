import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      action_type,
      performed_by,
      resource_type,
      resource_id,
      start_date,
      end_date,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = "SELECT * FROM va_audit_logs WHERE 1=1";
    const values = [];

    // Add filters if provided
    if (action_type) {
      query += " AND action_type = ?";
      values.push(action_type);
    }

    if (performed_by) {
      query += " AND performed_by = ?";
      values.push(performed_by);
    }

    if (resource_type) {
      query += " AND resource_type = ?";
      values.push(resource_type);
    }

    if (resource_id) {
      query += " AND resource_id = ?";
      values.push(resource_id);
    }

    if (start_date) {
      query += " AND performed_at >= ?";
      values.push(new Date(start_date));
    }

    if (end_date) {
      query += " AND performed_at <= ?";
      values.push(new Date(end_date));
    }

    // Add ordering and pagination
    query += " ORDER BY performed_at DESC LIMIT ? OFFSET ?";
    values.push(parseInt(limit), parseInt(offset));

    // Get total count for pagination
    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total").split("LIMIT")[0];

    const countResults = await executeQuery({
      query: countQuery,
      values: values.slice(0, -2),
    });

    // Execute main query
    const mainResults = await executeQuery({
      query,
      values,
    });

    // Parse JSON details field
    const formattedResults = mainResults.map((row) => ({
      ...row,
      details: row.details,
    }));

    return res.status(200).json({
      total: countResults[0].total,
      data: formattedResults,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error in audit log retrieval:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
