import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method === "PATCH") {
    const { batchId, studentId, assignmentName, newGrade, studentName } = req.body;

    // Validate required fields
    if (!batchId || !studentId || !assignmentName || newGrade === undefined || newGrade === null) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: batchId, studentId, assignmentName, and newGrade are required",
      });
    }

    try {
      // Get current grade and max marks
      const row = await prisma.va_grades.findFirst({
        where: { batch_id: batchId, student_id: studentId, assignment_name: assignmentName },
        select: { grade: true, max_marks: true },
      });

      if (!row) {
        return res.status(404).json({
          success: false,
          message: `Grade record not found for batchId: ${batchId}, studentId: ${studentId}, assignment: ${assignmentName}`,
        });
      }

      const { grade, max_marks } = row;
      const maxMarks = typeof max_marks === "number" ? max_marks : Number(max_marks);

      // Validate grade range
      if (!Number.isFinite(maxMarks) || newGrade > maxMarks || newGrade < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid grade: ${newGrade}. Grade must be between 0 and ${maxMarks} for assignment: ${assignmentName}${studentName ? `, student: ${studentName}` : ""}`,
        });
      }

      // Only update if the grade has actually changed
      if (grade !== newGrade) {
        await prisma.va_grades.updateMany({
          where: { batch_id: batchId, student_id: studentId, assignment_name: assignmentName },
          data: { grade: newGrade },
        });
      }

      res.status(200).json({
        success: true,
        message: "Grade updated successfully!",
        data: {
          batchId,
          studentId,
          assignmentName,
          oldGrade: grade,
          newGrade,
          maxMarks: max_marks,
        },
      });
    } catch (error) {
      console.error("Error updating grade:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed. Use PATCH.`,
    });
  }
}
