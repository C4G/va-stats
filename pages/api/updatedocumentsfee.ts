import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const {
      id,
      id_proof,
      disability_cert,
      photo,
      bank_details,
      fee_paid,
      amount_1,
      amount_2,
      amount_3,
      nature_of_fee,
    } = req.body.studentData;
    try {
      const query = `
        UPDATE vastudents
        SET id_proof = ?, disability_cert = ?, photo = ?, bank_details = ?
        WHERE id = ?;
      `;

      const values = [id_proof, disability_cert, photo, bank_details, id];
      await executeQuery({
        query,
        values,
      });

      await executeQuery({
        query:
          "UPDATE va_fees SET fee_paid = ?, amount_1 = ?, amount_2 = ?, amount_3 = ?, nature_of_fee = ? WHERE batch_id = ? AND student_id = ?",
        values: [fee_paid, amount_1, amount_2, amount_3, nature_of_fee, req.body.batchId, id],
      });

      res.status(200).json({ message: "Student updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ message: "Invalid request method" });
  }
}
