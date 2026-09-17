import { prisma } from "@/lib/prisma";

type DropdownKey = "staff_designation" | "certification_eligibility" | "completion_status";

const SUPPORTED_DROPDOWN_KEYS = new Set<DropdownKey>([
  "staff_designation",
  "certification_eligibility",
  "completion_status",
]);

const DEFAULTS_BY_KEY: Record<DropdownKey, readonly string[]> = {
  staff_designation: [
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
  ],
  certification_eligibility: ["Completion Certificate", "Participation Certificate", "Not Eligible", "Ineligible"],
  completion_status: ["Completed", "Incomplete", "Drop Out"],
};

function normalizeKey(key: unknown): DropdownKey | null {
  if (typeof key !== "string") return null;
  const normalized = key.trim();
  return SUPPORTED_DROPDOWN_KEYS.has(normalized as DropdownKey) ? (normalized as DropdownKey) : null;
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

async function seedDefaultsIfEmpty(dropdownKey: DropdownKey) {
  const count = await prisma.va_dropdown_values.count({ where: { dropdown_key: dropdownKey } });
  if (count > 0) return;

  await prisma.va_dropdown_values.createMany({
    data: DEFAULTS_BY_KEY[dropdownKey].map((value) => ({
      dropdown_key: dropdownKey,
      value,
      label: value,
      sort_order: 0,
    })),
    skipDuplicates: true,
  });
}

async function ensureSeeded(dropdownKey: DropdownKey) {
  await seedDefaultsIfEmpty(dropdownKey);
}

export async function getDropdownOptions({ key }: { key: unknown }) {
  const dropdownKey = normalizeKey(key);
  if (!dropdownKey) return [];

  await ensureSeeded(dropdownKey);
  return prisma.va_dropdown_values.findMany({
    where: { dropdown_key: dropdownKey },
    select: { value: true },
    orderBy: { value: "asc" },
  });
}

export async function upsertDropdownOption({
  key,
  value,
  label = value,
  sortOrder = 0,
}: {
  key: unknown;
  value: unknown;
  label?: unknown;
  sortOrder?: number;
}) {
  const dropdownKey = normalizeKey(key);
  if (!dropdownKey) throw new Error("Unsupported dropdown key");

  const normalizedValue = normalizeNonEmptyString(value);
  if (!normalizedValue) throw new Error("Value is required");

  await ensureSeeded(dropdownKey);
  await prisma.va_dropdown_values.upsert({
    where: { dropdown_key_value: { dropdown_key: dropdownKey, value: normalizedValue } },
    create: {
      dropdown_key: dropdownKey,
      value: normalizedValue,
      label: normalizeNonEmptyString(label) ?? normalizedValue,
      sort_order: sortOrder,
    },
    update: { label: normalizeNonEmptyString(label) ?? normalizedValue },
  });
}

export async function deleteDropdownOption({ key, value }: { key: unknown; value: unknown }) {
  const dropdownKey = normalizeKey(key);
  if (!dropdownKey) throw new Error("Unsupported dropdown key");

  const normalizedValue = normalizeNonEmptyString(value);
  if (!normalizedValue) throw new Error("Value is required");

  await ensureSeeded(dropdownKey);
  const count = await prisma.va_dropdown_values.count({ where: { dropdown_key: dropdownKey } });
  if (count <= 1) {
    return { deleted: false, reason: `Cannot delete the last remaining ${dropdownKey} option.` };
  }

  const usageCount =
    dropdownKey === "staff_designation"
      ? await prisma.vausers.count({ where: { designation: normalizedValue } })
      : dropdownKey === "certification_eligibility"
        ? (await prisma.vastudent_to_batch.count({ where: { certification_eligibility: normalizedValue } })) +
          (await prisma.vastudents.count({ where: { certification_eligibility: normalizedValue } }))
        : (await prisma.vastudent_to_batch.count({ where: { completion_status: normalizedValue } })) +
          (await prisma.vastudents.count({ where: { completion_status: normalizedValue } }));

  if (usageCount > 0) {
    return {
      deleted: false,
      reason:
        dropdownKey === "staff_designation"
          ? "Cannot delete: this value is used by existing staff."
          : "Cannot delete: this value is in use.",
    };
  }

  const result = await prisma.va_dropdown_values.deleteMany({
    where: { dropdown_key: dropdownKey, value: normalizedValue },
  });
  return { deleted: result.count > 0 };
}
