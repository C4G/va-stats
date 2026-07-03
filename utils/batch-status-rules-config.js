import { executeQuery } from "@/lib/db";
import {
  getRulesForCourse,
  mergeBatchStatusDerivedRules,
  normalizeCourseKey,
  validateBatchStatusDerivedRulesInput,
} from "@/utils/batch-status-derived";
import { getDropdownOptions } from "@/utils/dropdown-config";

const SETTING_KEY = "batch_status_derived_rules";

async function ensureAppSettingsTable() {
  await executeQuery({
    query: `
      CREATE TABLE IF NOT EXISTS va_app_settings (
        setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
        setting_value LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `,
  });
}

function parseStoredJson(raw) {
  if (raw == null || raw === "") return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function getBatchStatusDerivedRules() {
  await ensureAppSettingsTable();

  const rows = await executeQuery({
    query: "SELECT setting_value FROM va_app_settings WHERE setting_key = ? LIMIT 1",
    values: [SETTING_KEY],
  });

  const raw = rows?.[0]?.setting_value;
  const stored = parseStoredJson(raw);
  return stored;
}

/**
 * Ensures certification rule labels exist as dropdown options (certification_eligibility).
 */
async function assertCertificationLabelsInDropdown(certification) {
  const options = await getDropdownOptions({ key: "certification_eligibility" });
  const allowed = new Set((options ?? []).map((o) => String(o?.value ?? "").trim()).filter(Boolean));

  const labels = [
    certification.dropoutOrDropAttendanceLabel,
    certification.bothMetLabel,
    certification.oneMetLabel,
    certification.defaultNotEligibleLabel,
  ];

  const missing = labels.filter((l) => l && !allowed.has(l));
  if (missing.length) {
    throw new Error(
      `Each certification rule label must match a configured Certification Eligibility dropdown value. Missing: ${missing.join(
        ", "
      )}`
    );
  }
}

async function assertCompletionLabelsInDropdown(completion) {
  const options = await getDropdownOptions({ key: "completion_status" });
  const allowed = new Set((options ?? []).map((o) => String(o?.value ?? "").trim()).filter(Boolean));

  const labels = [
    completion.dropoutOrDropAttendanceLabel,
    completion.hasFutureAttendanceLabel,
    completion.defaultCompletedLabel,
  ];

  const missing = labels.filter((l) => l && !allowed.has(l));
  if (missing.length) {
    throw new Error(
      `Each completion rule label must match a configured Completion Status (Batch Status) dropdown value. Missing: ${missing.join(
        ", "
      )}`
    );
  }
}

export async function saveBatchStatusDerivedRules(body) {
  const validated = validateBatchStatusDerivedRulesInput(body);
  if (!validated.ok) {
    throw new Error(validated.errors.join("; "));
  }

  await assertCertificationLabelsInDropdown(validated.rules.certification);
  await assertCompletionLabelsInDropdown(validated.rules.completion);

  await ensureAppSettingsTable();

  const current = await getBatchStatusDerivedRules();
  const currentDefault = mergeBatchStatusDerivedRules(current?.defaultRules ?? current);
  const byCourse = current?.byCourse && typeof current.byCourse === "object" ? { ...current.byCourse } : {};
  const courseKey = normalizeCourseKey(body?.courseName);

  // Completion is global (defaultRules only). Certification overrides live under byCourse[course].certification.
  const newDefaultRulesMerged = mergeBatchStatusDerivedRules({
    certification: currentDefault.certification,
    completion: validated.rules.completion,
  });

  if (courseKey) {
    byCourse[courseKey] = { certification: validated.rules.certification };
  }

  const payload = {
    defaultRules: newDefaultRulesMerged,
    byCourse,
  };

  const json = JSON.stringify(payload);

  await executeQuery({
    query: `
      INSERT INTO va_app_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    values: [SETTING_KEY, json],
  });

  return {
    rules: getRulesForCourse(payload, body?.courseName),
    byCourse: payload.byCourse,
    defaultRules: payload.defaultRules,
  };
}

export async function getBatchStatusDerivedRulesForCourse(courseName) {
  const payload = await getBatchStatusDerivedRules();
  return getRulesForCourse(payload, courseName);
}
