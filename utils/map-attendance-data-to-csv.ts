import type { AttendanceOutputRow, AttendanceSymbol, DateKey } from "@/utils/types/attendance";

type RowIn = {
  name: string;
  remarks?: string;
  percent?: number;
  [key: string]: any;
};

const looksLikeDate = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k);

export const mapAttendanceDataToCsv = (attendanceData: RowIn[]): AttendanceOutputRow[] => {
  return attendanceData.map(
    ({ commenter, name, remarks, id, completion_status, reason_for_status, percent, ...rest }) => {
      const attendanceMap = Object.entries(rest).reduce<Record<DateKey, AttendanceSymbol>>((acc, [key, raw]) => {
        if (!looksLikeDate(key)) return acc; // Only include date keys
        const v = String(raw ?? "")
          .trim()
          .toUpperCase();
        const sym: AttendanceSymbol =
          v === "PRESENT"
            ? "Present"
            : v === "ABSENT"
              ? "Absent"
              : v === "HALF-DAY"
                ? "Half-day"
                : v === "DROPOUT"
                  ? "Dropout"
                  : "Cancelled";
        acc[key as DateKey] = sym;
        return acc;
      }, {});

      const vals = Object.values(attendanceMap).filter((v) => v !== "Cancelled");
      const presentUnits = vals.reduce((sum, v) => sum + (v === "Present" ? 1 : v === "Half-day" ? 0.5 : 0), 0);
      const totalUnits = vals.length;
      const attendancePercentage = totalUnits ? ((presentUnits / totalUnits) * 100).toFixed(1) + "%" : "0%";

      // Return exactly matching types
      return { name, attendancePercentage, remarks, ...attendanceMap };
    }
  );
};
