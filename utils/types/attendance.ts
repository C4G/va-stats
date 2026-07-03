// attendance.ts

export type AttendanceSymbol = "Present" | "Absent" | "Half-day" | "Dropout" | "Cancelled";

export type IsPresentCode = 0 | 1 | 2 | 3 | 4;

// YYYY-MM-DD (simple template; runtime validation is separate)
export type DateKey = `${number}-${number}-${number}`;

// API body
export interface PatchAttendanceBody {
  batchId: string | number;
  studentId?: string | number;
  date: string; // 'YYYY-MM-DD'
  value: AttendanceSymbol;
}

// Separate date columns
export type AttendanceDateColumns = Partial<Record<DateKey, AttendanceSymbol>>;

// Final CSV row: fixed fields + date columns
export type AttendanceOutputRow = {
  name: string;
  attendancePercentage: string; // '93.5%'
  remarks?: string;
} & AttendanceDateColumns;
