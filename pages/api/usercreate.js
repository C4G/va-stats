/* This function is called from users.jsx (Staff link). */

import { executeQuery } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { staffAuditLogger } from "../../utils/auditLogger";
import { authOptions } from "./auth/[...nextauth]";

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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });
  try {
    let session = null;
    try {
      session = await getServerSession(req, res, authOptions);
    } catch (sessionError) {
      // Handle JWT decryption errors gracefully
      if (sessionError.code === "ERR_JWE_DECRYPTION_FAILED") {
        console.error("Session decryption failed, proceeding without session:", sessionError);
        session = null;
      } else {
        throw sessionError;
      }
    }

    const performerEmail = session?.user?.email || null;
    const performerData = performerEmail
      ? await executeQuery({
          query: "SELECT id FROM vausers WHERE email = ?",
          values: [performerEmail],
        })
      : [];

    const performerId = performerData?.[0]?.id || "Unknown User";

    // Get data submitted in request body
    const body = req.body;

    const data = await executeQuery({
      /* ---------- DATABASE MODIFICATION SECTION ------------- */
      // If timestamp is a field, use: user.createdAt.Date (not toString)
      query:
        "INSERT INTO vausers (employeeId, email, name, designation, joindate, mobilenumber, workbase, supervisor, natureofjob, visualacuity, trainingprogram1, trainingprogram2, trainingprogram3, role, isactive, action, date_of_birth, gender, contract_duration_months) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      values: [
        toNull(body.employeeId),
        toNull(body.email) || "",
        toNull(body.name) || "",
        toNull(body.designation) || "",
        toISODateOrNull(body.joindate),
        toNull(body.mobilenumber),
        toNull(body.workbase) || "",
        toNull(body.supervisor) || "",
        toNull(body.natureofjob) || "",
        toNull(body.visualacuity),
        toNull(body.trainingprogram1),
        toNull(body.trainingprogram2),
        toNull(body.trainingprogram3),
        toNull(body.role) || "",
        toNull(body.isactive) || "",
        toNull(body.action) || "",
        toISODateOrNull(body.date_of_birth),
        toNull(body.gender),
        toIntOrNull(body.contract_duration_months),
      ],
    });
    try {
      // Log the staff creation
      await staffAuditLogger.logStaffCreation(performerId, body, data.insertId);
    } catch (auditError) {
      console.error("Audit logger threw:", auditError.message);
      console.error("Audit stack:", auditError.stack);
    }

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(200).json({
        success: true,
        message: "Staff created successfully",
        staffId: data.insertId,
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
