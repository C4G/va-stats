/**
 * Configurable rules for derived batch-status fields (certification eligibility,
 * completion status) when the database has no explicit value saved.
 */

export const DEFAULT_BATCH_STATUS_DERIVED_RULES = {
  certification: {
    dropoutOrDropAttendanceLabel: "Not Eligible",
    gradeMinExclusive: 60,
    attendanceMinExclusive: 50,
    bothMetLabel: "Completion Certificate",
    oneMetLabel: "Participation Certificate",
    defaultNotEligibleLabel: "Not Eligible",
  },
  completion: {
    dropoutOrDropAttendanceLabel: "Drop Out",
    hasFutureAttendanceLabel: "Incomplete",
    defaultCompletedLabel: "Completed",
  },
};

export function mergeSection(defaults, partial) {
  if (!partial || typeof partial !== "object") return { ...defaults };
  return { ...defaults, ...partial };
}

/** Global defaults for certification + completion (from defaultRules or legacy root object). */
function getGlobalMergedRules(payload) {
  if (payload?.defaultRules) return mergeBatchStatusDerivedRules(payload.defaultRules);
  if (payload?.rules) return mergeBatchStatusDerivedRules(payload.rules);
  if (payload && typeof payload === "object" && !payload.byCourse) {
    return mergeBatchStatusDerivedRules(payload);
  }
  return mergeBatchStatusDerivedRules(null);
}

export function mergeBatchStatusDerivedRules(stored) {
  const d = DEFAULT_BATCH_STATUS_DERIVED_RULES;
  return {
    certification: mergeSection(d.certification, stored?.certification),
    completion: mergeSection(d.completion, stored?.completion),
  };
}

export function normalizeCourseKey(courseName) {
  if (typeof courseName !== "string") return "";
  return courseName.trim().toLowerCase();
}

/**
 * Certification eligibility can be overridden per course (byCourse[course].certification).
 * Completion status is global: always taken from defaultRules (not per course).
 */
export function getRulesForCourse(payload, courseName) {
  const courseKey = normalizeCourseKey(courseName);
  const byCourse = payload?.byCourse && typeof payload.byCourse === "object" ? payload.byCourse : {};
  const globalMerged = getGlobalMergedRules(payload);

  let certification = globalMerged.certification;
  if (courseKey) {
    const entry = byCourse[courseKey];
    if (entry && typeof entry === "object" && entry.certification && typeof entry.certification === "object") {
      certification = mergeSection(globalMerged.certification, entry.certification);
    }
  }

  return {
    certification,
    completion: globalMerged.completion,
  };
}

function num(v) {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : NaN;
}

function nonEmptyString(v, field, errors) {
  if (typeof v !== "string" || !v.trim()) {
    errors.push(`${field} is required`);
    return null;
  }
  return v.trim();
}

/**
 * @param {object} certRules — merged certification rules
 * @param {object} ctx
 * @param {string|null|undefined} ctx.savedValue — explicit value from DB; if set, returned as-is
 * @param {boolean} ctx.isDroppedOut
 * @param {boolean} ctx.hasDropAttendance
 * @param {number} ctx.numericGrade
 * @param {number} ctx.numericAttendance
 */
export function resolveCertificationEligibility(certRules, ctx) {
  const saved = ctx.savedValue;
  const trimmed = typeof saved === "string" ? saved.trim() : "";
  if (trimmed) return trimmed;

  const r = { ...DEFAULT_BATCH_STATUS_DERIVED_RULES.certification, ...certRules };

  if (ctx.isDroppedOut || ctx.hasDropAttendance) {
    return r.dropoutOrDropAttendanceLabel;
  }

  const g = num(ctx.numericGrade);
  const a = num(ctx.numericAttendance);
  const gt = num(r.gradeMinExclusive);
  const at = num(r.attendanceMinExclusive);

  const gradeOk = Number.isFinite(g) && Number.isFinite(gt) && g > gt;
  const attOk = Number.isFinite(a) && Number.isFinite(at) && a > at;

  if (gradeOk && attOk) return r.bothMetLabel;
  if (gradeOk || attOk) return r.oneMetLabel;
  return r.defaultNotEligibleLabel;
}

/**
 * @param {object} compRules — merged completion rules
 * @param {object} ctx
 * @param {string|null|undefined} ctx.savedValue
 * @param {boolean} ctx.isDroppedOut
 * @param {boolean} ctx.hasDropAttendance
 * @param {boolean} ctx.hasFutureAttendance
 */
export function resolveCompletionStatus(compRules, ctx) {
  const saved = ctx.savedValue;
  const trimmed = typeof saved === "string" ? saved.trim() : "";
  if (trimmed) return trimmed;

  const r = { ...DEFAULT_BATCH_STATUS_DERIVED_RULES.completion, ...compRules };

  if (ctx.isDroppedOut || ctx.hasDropAttendance) {
    return r.dropoutOrDropAttendanceLabel;
  }
  if (ctx.hasFutureAttendance) {
    return r.hasFutureAttendanceLabel;
  }
  return r.defaultCompletedLabel;
}

/**
 * Validates admin-submitted rules. Returns { ok, rules?, errors? }.
 */
export function validateBatchStatusDerivedRulesInput(body) {
  const errors = [];
  const c = body?.certification ?? {};
  const o = body?.completion ?? {};

  const certification = {
    dropoutOrDropAttendanceLabel: nonEmptyString(
      c.dropoutOrDropAttendanceLabel,
      "certification.dropoutOrDropAttendanceLabel",
      errors
    ),
    gradeMinExclusive: num(c.gradeMinExclusive),
    attendanceMinExclusive: num(c.attendanceMinExclusive),
    bothMetLabel: nonEmptyString(c.bothMetLabel, "certification.bothMetLabel", errors),
    oneMetLabel: nonEmptyString(c.oneMetLabel, "certification.oneMetLabel", errors),
    defaultNotEligibleLabel: nonEmptyString(c.defaultNotEligibleLabel, "certification.defaultNotEligibleLabel", errors),
  };

  if (!Number.isFinite(certification.gradeMinExclusive)) {
    errors.push("certification.gradeMinExclusive must be a valid number");
  }
  if (!Number.isFinite(certification.attendanceMinExclusive)) {
    errors.push("certification.attendanceMinExclusive must be a valid number");
  }

  const completion = {
    dropoutOrDropAttendanceLabel: nonEmptyString(
      o.dropoutOrDropAttendanceLabel,
      "completion.dropoutOrDropAttendanceLabel",
      errors
    ),
    hasFutureAttendanceLabel: nonEmptyString(o.hasFutureAttendanceLabel, "completion.hasFutureAttendanceLabel", errors),
    defaultCompletedLabel: nonEmptyString(o.defaultCompletedLabel, "completion.defaultCompletedLabel", errors),
  };

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    rules: { certification, completion },
  };
}
