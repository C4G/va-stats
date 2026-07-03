import { executeQuery } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { staffAuditLogger } from "../../utils/auditLogger";
import { authOptions } from "./auth/[...nextauth]";

// ---- Safe conversion utilities ----
const toNull = (v) => (v === undefined || v === "" ? null : v);
const toIntOrNull = (v) => (v === undefined || v === "" || v === null || Number.isNaN(Number(v)) ? null : Number(v));
// safe isactive handling function (safe isactive handling function)
const normalizeIsActive = (input) => {
  if (input == null || input === undefined || input === "") return undefined; // do not pass if no pass (do not pass if no pass)
  // Handle both "A" and "IA" (DB uses "IA" for inactive)
  if (input === "A" || input === "IA" || input === "I") {
    // Convert "I" to "IA" for DB compatibility
    return input === "I" ? "IA" : input;
  }
  // allow common form values (checkbox/toggle) defensively (allow common form values (checkbox/toggle) defensively)
  if (input === true || input === "true" || input === 1 || input === "1") return "A";
  if (input === false || input === "false" || input === 0 || input === "0") return "IA";
  return undefined; // if invalid value, ignore (ignore)
};
// STR_TO_DATE is guaranteed to return NULL if the argument is NULL

const dateKeys = new Set(["joindate", "lastlogin", "date_of_birth"]);
const norm = (k, v) => {
  if (v == null || v === "") return null;
  // Convert date keys to ISO format
  if (dateKeys.has(k)) {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).slice(0, 10); // '2024-09-11T...' or '2024-09-11' both cover
  }
  // Convert contract_duration_months to integer or null
  if (k === "contract_duration_months") return toIntOrNull(v);
  // isactive is handled separately, so exclude it here (isactive is handled separately, so exclude it here)
  return v;
};

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
    const {
      id,
      email,
      name,
      designation,
      joindate,
      mobilenumber,
      workbase,
      supervisor,
      natureofjob,
      visualacuity,
      trainingprogram1,
      trainingprogram2,
      trainingprogram3,
      role,
      isactive,
      action,
      lastlogin,
      employeeId,
      gender,
      date_of_birth,
      contract_duration_months,
    } = req.body;

    // Validate id
    const idNum = toIntOrNull(id);
    if (idNum == null) return res.status(400).json({ error: "Missing or invalid id" });

    // Find performer (account may not exist in session)
    const performerEmail = session?.user?.email || null;
    const performerData = performerEmail
      ? await executeQuery({ query: "SELECT id FROM vausers WHERE email = ?", values: [performerEmail] })
      : [];
    const performerId = performerData?.[0]?.id ?? null;

    // Get previous data
    const previousRows = await executeQuery({ query: "SELECT * FROM vausers WHERE id = ?", values: [idNum] });
    const previous = previousRows?.[0] ?? null;

    try {
      // only include isactive if it is explicitly passed
      const normalizedIsActive = normalizeIsActive(isactive);
      const includeIsActive = normalizedIsActive !== undefined;

      // dynamically construct the query
      const setClauses = [
        "email = ?",
        "name = ?",
        "designation = ?",
        "joindate = DATE(?)",
        "mobilenumber = ?",
        "workbase = ?",
        "supervisor = ?",
        "natureofjob = ?",
        "visualacuity = ?",
        "trainingprogram1 = ?",
        "trainingprogram2 = ?",
        "trainingprogram3 = ?",
        "role = ?",
        "action = ?",
        "lastlogin = DATE(?)",
        "employeeId = ?",
        "gender = ?",
        "date_of_birth = DATE(?)",
        "contract_duration_months = ?",
      ];

      // only add isactive to the SET clause if it is explicitly passed
      if (includeIsActive) {
        setClauses.splice(13, 0, "isactive = ?"); // insert after role (insert after role)
      }

      const query = `UPDATE vausers SET ${setClauses.join(", ")} WHERE id = ?;`;

      // construct the values
      const values = [
        toNull(email),
        toNull(name),
        toNull(designation),
        toISODateOrNull(joindate),
        toNull(mobilenumber),
        toNull(workbase),
        toNull(supervisor),
        toNull(natureofjob),
        toNull(visualacuity),
        toNull(trainingprogram1),
        toNull(trainingprogram2),
        toNull(trainingprogram3),
        toNull(role),
      ];

      // only add isactive if it is explicitly passed
      if (includeIsActive) {
        values.push(normalizedIsActive);
      }

      // add the remaining values
      values.push(
        toNull(action),
        toISODateOrNull(lastlogin),
        toNull(employeeId),
        toNull(gender),
        toISODateOrNull(date_of_birth),
        toIntOrNull(contract_duration_months),
        idNum
      );

      await executeQuery({ query, values });

      // Create change log (simple comparison; dates may differ in format) (simple comparison; dates may differ in format)
      if (previous && performerId) {
        const newData = {
          email: toNull(email),
          name: toNull(name),
          designation: toNull(designation),
          joindate: toISODateOrNull(joindate),
          mobilenumber: toNull(mobilenumber),
          workbase: toNull(workbase),
          supervisor: toNull(supervisor),
          natureofjob: toNull(natureofjob),
          visualacuity: toNull(visualacuity),
          trainingprogram1: toNull(trainingprogram1),
          trainingprogram2: toNull(trainingprogram2),
          trainingprogram3: toNull(trainingprogram3),
          role: toNull(role),
          action: toNull(action),
          lastlogin: toISODateOrNull(lastlogin),
          employeeId: toNull(employeeId),
          gender: toNull(gender),
          date_of_birth: toISODateOrNull(date_of_birth),
          contract_duration_months: toIntOrNull(contract_duration_months),
        };

        const changes = {};
        Object.keys(newData).forEach((k) => {
          // Compare with type normalization (number/boolean) (number/boolean)
          const prev = norm(k, previous?.[k]);
          const curr = norm(k, newData[k]);
          if (prev !== curr) changes[k] = { from: previous?.[k], to: newData[k] };
        });

        // Handle isactive separately (compare "A" vs "IA" strings directly)
        if (includeIsActive) {
          const prevIsActive = previous?.isactive || null;
          const currIsActive = normalizedIsActive === "I" ? "IA" : normalizedIsActive; // Convert "I" to "IA" for DB compatibility
          if (prevIsActive !== currIsActive) {
            changes.isactive = { from: prevIsActive, to: currIsActive };
          }
        }

        if (Object.keys(changes).length > 0) {
          try {
            await staffAuditLogger.logStaffUpdate(performerId, idNum, changes, previous);
          } catch (auditError) {
            console.error("Error logging audit event:", auditError);
            // Don't fail the main update if audit logging fails
          }
        }
      }

      res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({ error: error.message });
    }
  } catch (error) {
    console.error("Error updating staff:", error);
    res.status(500).json({ error: error.message });
  }
}
