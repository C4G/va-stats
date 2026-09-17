import { prisma } from "@/lib/prisma";

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

    const result = await prisma.va_audit_logs.create({
      data: {
        action_type,
        performed_by,
        details: details ?? null,
        resource_type: resource_type || null,
        resource_id: resource_id == null ? null : String(resource_id),
      },
    });

    return res.status(201).json({
      message: "Audit log entry created successfully",
      id: Number(result.id),
    });
  } catch (error) {
    console.error("Error in audit log creation:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
