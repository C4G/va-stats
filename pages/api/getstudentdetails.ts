import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  const { student_id } = req.body;

  try {
    const student = await prisma.vastudents.findUnique({
      where: { id: student_id },
      select: {
        id: true,
        name: true,
        enrollment_status: true,
        vastudent_to_batch: {
          where: { batch_id: { not: null } },
          select: {
            completion_status: true,
            reason_for_status: true,
            certification_eligibility: true,
            grade: true,
            attendance: true,
            next_program: true,
            vabatches: {
              select: {
                id: true,
                coursename: true,
                batch: true,
                coursestart: true,
                courseend: true,
                instructor: true,
              },
            },
            va_remarks: { select: { remarks: true, vausers: { select: { name: true } } } },
          },
        },
      },
    });

    const studentsData =
      student?.vastudent_to_batch.map((enrollment) => ({
        ...enrollment.vabatches,
        completion_status: enrollment.completion_status,
        reason_for_status: enrollment.reason_for_status,
        certification_eligibility: enrollment.certification_eligibility,
        grade: enrollment.grade,
        attendance: enrollment.attendance,
        next_program: enrollment.next_program,
        enrollment_status: student.enrollment_status,
        remarks:
          enrollment.va_remarks.length > 0
            ? enrollment.va_remarks.map(({ vausers, remarks }) => `${vausers.name}: ${remarks}`).join(" || ")
            : null,
      })) ?? [];

    res.status(200).json({
      batches: studentsData,
      name: student?.name ?? null,
      studentId: student?.id ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
