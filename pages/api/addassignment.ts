import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  const body = req.body;

  try {
    if (body.batch_id == null || body.batch_id === "") {
      return res.status(400).json({ success: false, message: "batch_id is required." });
    }

    const students = await prisma.vastudent_to_batch.findMany({
      where: { batch_id: body.batch_id },
      select: { student_id: true },
    });

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This batch has no students yet. Add at least one student to the batch before creating assessments.",
      });
    }

    await prisma.va_grades.createMany({
      data: students.flatMap(({ student_id }) =>
        student_id == null
          ? []
          : [
              {
                student_id,
                batch_id: body.batch_id,
                assignment_name: body.assignment_name,
                assignment_type: body.assignment_type,
                assignment_weight: body.assignment_weight,
                grade: 0,
                max_marks: body.max_marks,
              },
            ]
      ),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred, " + error });
  }

  // res.writeHead(301, {
  //   Location: '/batch/'+body.batch_id,
  // });

  // res.end();
}
