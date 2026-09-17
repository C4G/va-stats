import { prisma } from "@/lib/prisma";

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

    const parsedLimit = Number(limit);
    const parsedOffset = Number(offset);
    const where = {
      ...(typeof action_type === "string" ? { action_type } : {}),
      ...(typeof performed_by === "string" ? { performed_by } : {}),
      ...(typeof resource_type === "string" ? { resource_type } : {}),
      ...(typeof resource_id === "string" ? { resource_id } : {}),
      ...(typeof start_date === "string" || typeof end_date === "string"
        ? {
            performed_at: {
              ...(typeof start_date === "string" ? { gte: new Date(start_date) } : {}),
              ...(typeof end_date === "string" ? { lte: new Date(end_date) } : {}),
            },
          }
        : {}),
    };

    const [total, mainResults] = await Promise.all([
      prisma.va_audit_logs.count({ where }),
      prisma.va_audit_logs.findMany({
        where,
        orderBy: { performed_at: "desc" },
        skip: Number.isFinite(parsedOffset) ? parsedOffset : 0,
        take: Number.isFinite(parsedLimit) ? parsedLimit : 50,
      }),
    ]);

    const formattedResults = mainResults.map((row) => ({ ...row, id: Number(row.id) }));

    return res.status(200).json({
      total,
      data: formattedResults,
      pagination: {
        limit: Number.isFinite(parsedLimit) ? parsedLimit : 50,
        offset: Number.isFinite(parsedOffset) ? parsedOffset : 0,
      },
    });
  } catch (error) {
    console.error("Error in audit log retrieval:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
