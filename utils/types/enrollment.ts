// enrollment status options
export const ENROLLMENT_STATUS = [
  { value: null, label: "Unassigned" },
  { value: "AVAILABLE", label: "Available" },
  { value: "ENROLLED", label: "Enrolled" },
  { value: "NO_RESPONSE_SW_OFF", label: "No respond/ switched off" },
  { value: "FOLLOW_UP", label: "Follow up" },
  { value: "WRONG_NUMBER", label: "Wrong no" },
  { value: "DROPOUT", label: "Dropout" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "COUNSELLED_BY_PM", label: "Counselled by PM" },
];

export const ALLOWED_ENROLLMENT = new Set(ENROLLMENT_STATUS.map((o) => o.value));
