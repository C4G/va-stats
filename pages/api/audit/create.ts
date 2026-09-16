import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { action_type, performed_by, details, resource_type, resource_id } = req.body;

    // Validate required fields
    if (!action_type || !performed_by) {
      return res.status(400).json({
        message: "action_type and performed_by are required fields",
      });
    }

    const query = `
            INSERT INTO va_audit_logs 
            (action_type, performed_by, details, resource_type, resource_id)
            VALUES (?, ?, ?, ?, ?)
        `;

    // Convert details object to JSON string if it exists
    const jsonDetails = details ? JSON.stringify(details) : null;

    const values = [action_type, performed_by, jsonDetails, resource_type || null, resource_id || null];

    const results = await executeQuery({ query, values });

    return res.status(201).json({
      message: "Audit log entry created successfully",
      id: results.insertId,
    });
  } catch (error) {
    console.error("Error in audit log creation:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
