import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  const body = req.body;

  try {
    const studentToBatch = await prisma.vastudent_to_batch.findFirst({
      where: { batch_id: parseInt(body.batchId), student_id: parseInt(body.studentId) },
      select: { id: true },
    });

    const id = studentToBatch?.id;
    if (!id) {
      return res.status(404).json({
        success: false,
        message: "The student does not exist for this batch",
      });
    }
    if (body.isUpdated) {
      await prisma.va_remarks.deleteMany({ where: { vastudent_to_batch_id: id, user_id: body.commenter } });
      await prisma.va_remarks.createMany({
        data: body.remarksArray.map((remarks) => ({
          vastudent_to_batch_id: id,
          remarks,
          user_id: body.commenter,
        })),
      });
    }
    if (body.remarks !== "") {
      await prisma.va_remarks.create({
        data: { vastudent_to_batch_id: id, remarks: body.remarks, user_id: body.commenter },
      });
    }

    res.status(200).json({ success: true, message: "Remark added successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred, " + error });
  }
}
