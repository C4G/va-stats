import { executeQuery } from "@/lib/db";

const SUPPORTED_DROPDOWN_KEYS = new Set(["staff_designation", "certification_eligibility", "completion_status"]);

const STAFF_DESIGNATION_DEFAULTS = [
  "Trainer",
  "Teaching Assistant",
  "Program Coordinator",
  "Telecaller",
  "Training Coordinator",
  "Program Manager",
  "Sr. Trainer",
  "L & D Executive",
  "Head of Training",
  "Trainer plus Telecaller",
];

const CERTIFICATION_ELIGIBILITY_DEFAULTS = [
  "Completion Certificate",
  "Participation Certificate",
  "Not Eligible",
  "Ineligible",
];

const COMPLETION_STATUS_DEFAULTS = ["Completed", "Incomplete", "Drop Out"];

async function ensureDropdownValuesTable() {
  await executeQuery({
    query: `
      CREATE TABLE IF NOT EXISTS va_dropdown_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dropdown_key VARCHAR(100) NOT NULL,
        value VARCHAR(255) NOT NULL,
        label VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_dropdown_value (dropdown_key, value)
      )
    `,
  });
}

function normalizeKey(key) {
  if (typeof key !== "string") return null;
  const normalized = key.trim();
  if (!normalized || !SUPPORTED_DROPDOWN_KEYS.has(normalized)) return null;
  return normalized;
}

function normalizeNonEmptyString(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

const DEFAULTS_BY_KEY = {
  staff_designation: STAFF_DESIGNATION_DEFAULTS,
  certification_eligibility: CERTIFICATION_ELIGIBILITY_DEFAULTS,
  completion_status: COMPLETION_STATUS_DEFAULTS,
};

const seedDefaultsIfEmpty = async (dropdownKey) => {
  const defaults = DEFAULTS_BY_KEY[dropdownKey];
  if (!defaults?.length) return;

  const countRes = await executeQuery({
    query: "SELECT COUNT(*) as c FROM va_dropdown_values WHERE dropdown_key = ?",
    values: [dropdownKey],
  });
  const count = countRes?.[0]?.c ?? 0;
  if (count > 0) return;

  for (const opt of defaults) {
    // eslint-disable-next-line no-await-in-loop
    await executeQuery({
      query: `
        INSERT INTO va_dropdown_values (dropdown_key, value, label, sort_order)
        VALUES (?, ?, ?, ?)
      `,
      values: [dropdownKey, opt, opt, 0],
    });
  }
};

const USED_VALUE_CHECKS_BY_DROPDOWN_KEY = {
  staff_designation: [{ table: "vausers", column: "designation" }],
  certification_eligibility: [
    { table: "vastudent_to_batch", column: "certification_eligibility" },
    { table: "vastudents", column: "certification_eligibility" },
  ],
  completion_status: [
    { table: "vastudent_to_batch", column: "completion_status" },
    { table: "vastudents", column: "completion_status" },
  ],
};

export async function getDropdownOptions({ key }) {
  const dropdownKey = normalizeKey(key);
  if (!dropdownKey) return [];

  await ensureDropdownValuesTable();
  await seedDefaultsIfEmpty(dropdownKey);

  const results = await executeQuery({
    query: `
      SELECT value
      FROM va_dropdown_values
      WHERE dropdown_key = ?
      ORDER BY value ASC
    `,
    values: [dropdownKey],
  });

  return results ?? [];
}

export async function upsertDropdownOption({ key, value }) {
  const dropdownKey = normalizeKey(key);
  if (!dropdownKey) throw new Error("Unsupported dropdown key");

  const normalizedValue = normalizeNonEmptyString(value);
  if (!normalizedValue) throw new Error("Value is required");

  await ensureDropdownValuesTable();
  await seedDefaultsIfEmpty(dropdownKey);

  await executeQuery({
    query: `
      INSERT INTO va_dropdown_values (dropdown_key, value, label, sort_order)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        label = VALUES(label)
    `,
    values: [dropdownKey, normalizedValue, normalizedValue, 0],
  });
}

export async function deleteDropdownOption({ key, value }) {
  const dropdownKey = normalizeKey(key);
  if (!dropdownKey) throw new Error("Unsupported dropdown key");

  const normalizedValue = normalizeNonEmptyString(value);
  if (!normalizedValue) throw new Error("Value is required");

  await ensureDropdownValuesTable();
  await seedDefaultsIfEmpty(dropdownKey);

  const countRes = await executeQuery({
    query: "SELECT COUNT(*) as c FROM va_dropdown_values WHERE dropdown_key = ?",
    values: [dropdownKey],
  });
  const count = countRes?.[0]?.c ?? 0;

  // Safety: keep at least 1 configured option so required staff forms don't break.
  if (count <= 1) {
    return { deleted: false, reason: `Cannot delete the last remaining ${dropdownKey} option.` };
  }

  const usedChecks = USED_VALUE_CHECKS_BY_DROPDOWN_KEY[dropdownKey];
  if (usedChecks?.length) {
    for (const { table, column } of usedChecks) {
      // eslint-disable-next-line no-await-in-loop
      const usedRes = await executeQuery({
        query: `SELECT COUNT(*) as c FROM ${table} WHERE ${column} = ?`,
        values: [normalizedValue],
      });
      const usedCount = usedRes?.[0]?.c ?? 0;
      if (usedCount > 0) {
        const reason =
          dropdownKey === "staff_designation"
            ? "Cannot delete: this value is used by existing staff."
            : "Cannot delete: this value is in use.";
        return { deleted: false, reason };
      }
    }
  }

  const deleteRes = await executeQuery({
    query: "DELETE FROM va_dropdown_values WHERE dropdown_key = ? AND value = ?",
    values: [dropdownKey, normalizedValue],
  });

  const deleted = (deleteRes?.affectedRows ?? 0) > 0;
  return { deleted };
}
