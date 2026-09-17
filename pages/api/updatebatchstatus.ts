import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const student = req.body;
    if (!student.id) {
      return res.status(400).json({ success: false, message: "Student ID is required." });
    }
    try {
      const [result] = await prisma.$transaction([
        prisma.vastudent_to_batch.updateMany({
          where: { student_id: student.id, batch_id: student.batchId },
          data: {
            completion_status: student.completion_status,
            reason_for_status: student.reason_for_status,
            certification_eligibility: student.certification_eligibility,
            next_program: student.next_program,
            counseling_status: student.counseling_status,
            placement_status: student.placement_status,
            placement_remarks: student.placement_remarks,
          },
        }),
        prisma.vastudents.update({ where: { id: student.id }, data: { risk_factor: student.risk_factor } }),
      ]);
      if (result.count === 0) {
        return res.status(404).json({
          success: false,
          message: `Student id: ${student.id} not found`,
        });
      }
      res.status(200).json({
        success: true,
        message: "Student batch status updated successfully!",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }
}
