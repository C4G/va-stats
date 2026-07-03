import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const student = req.body;
    if (!student.id) {
      return res.status(400).json({ success: false, message: "Student ID is required." });
    }
    try {
      const result = await executeQuery({
        query:
          "UPDATE vastudent_to_batch SET completion_status = ?, reason_for_status = ?, certification_eligibility = ?,next_program = ?, counseling_status = ?, placement_status = ?, placement_remarks = ? WHERE student_id = ? AND batch_id = ?",
        values: [
          student.completion_status,
          student.reason_for_status,
          student.certification_eligibility,
          student.next_program,
          student.counseling_status,
          student.placement_status,
          student.placement_remarks,
          student.id,
          student.batchId,
        ],
      });
      await executeQuery({
        query: "UPDATE vastudents SET risk_factor = ? WHERE id = ?",
        values: [student.risk_factor, student.id],
      });
      if (result.affectedRows === 0) {
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
