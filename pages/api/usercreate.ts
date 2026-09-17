/* This function is called from users.tsx (Staff link). */

import { vausers_isactive } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-auth";
import { staffAuditLogger } from "../../utils/auditLogger";

// ---- Safe conversion utilities ----
const toNull = (v) => (v === undefined || v === "" ? null : v);
const toIntOrNull = (v) => (v === undefined || v === "" || v === null || Number.isNaN(Number(v)) ? null : Number(v));

const toISODateOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).trim();

  // If already ISO, use it
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // MM-DD-YYYY or MM/DD/YYYY → YYYY-MM-DD
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const mm = m[1].padStart(2, "0");
    const dd = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // If not recognized, save as null (=SQL NULL)
  return null;
};

const toDateOrNull = (v) => {
  const iso = toISODateOrNull(v);
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });
  try {
    let session: Awaited<ReturnType<typeof getServerSession>> = null;
    try {
      session = await getServerSession(req);
    } catch (sessionError) {
      console.error("Session lookup failed, proceeding without session:", sessionError);
      session = null;
    }

    const performerEmail = session?.user?.email || null;
    const performer = performerEmail
      ? await prisma.vausers.findUnique({ where: { email: performerEmail }, select: { id: true } })
      : null;
    const performerId = performer?.id || "Unknown User";

    // Get data submitted in request body
    const body = req.body;

    const created = await prisma.vausers.create({
      data: {
        employeeId: toNull(body.employeeId),
        email: toNull(body.email) || "",
        name: toNull(body.name) || "",
        designation: toNull(body.designation) || "",
        joindate: toDateOrNull(body.joindate),
        mobilenumber: toNull(body.mobilenumber),
        workbase: toNull(body.workbase) || "",
        supervisor: toNull(body.supervisor) || "",
        natureofjob: toNull(body.natureofjob) || "",
        visualacuity: toNull(body.visualacuity),
        trainingprogram1: toNull(body.trainingprogram1) || "",
        trainingprogram2: toNull(body.trainingprogram2) || "",
        trainingprogram3: toNull(body.trainingprogram3) || "",
        role: toNull(body.role) || "",
        isactive: toNull(body.isactive) === "I" ? vausers_isactive.I : vausers_isactive.A,
        action: toNull(body.action) || "",
        date_of_birth: toDateOrNull(body.date_of_birth),
        gender: toNull(body.gender),
        contract_duration_months: toIntOrNull(body.contract_duration_months),
      },
    });
    try {
      // Log the staff creation
      await staffAuditLogger.logStaffCreation(performerId, body, created.id);
    } catch (auditError) {
      console.error("Audit logger threw:", auditError.message);
      console.error("Audit stack:", auditError.stack);
    }

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(200).json({
        success: true,
        message: "Staff created successfully",
        staffId: created.id,
      });
    }

    res.writeHead(301, {
      Location: "/users",
    });
    res.end();
  } catch (error) {
    console.error("Error creating staff:", error);
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(500).json({ error: error.message });
    }
    res.writeHead(301, {
      Location: "/users?error=" + encodeURIComponent(error.message),
    });
    res.end();
  }
}
