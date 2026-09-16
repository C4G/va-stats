import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  const { batch_id } = req.body;

  try {
    const documentsQuery = `
            SELECT s.id, s.name, s.id_proof, s.disability_cert, s.photo, s.bank_details
            FROM vastudents s
            JOIN vastudent_to_batch sb ON s.id = sb.student_id
            WHERE sb.batch_id = ?
        `;

    const feesQuery = `
            SELECT student_id, fee_paid, amount_1, amount_2, amount_3, nature_of_fee
            FROM va_fees
            WHERE batch_id = ?
        `;

    const courseAndBatchNameQuery = `
            SELECT coursename, batch
            FROM vabatches
            WHERE id = ?
        `;

    // Execute all queries in parallel for better performance
    const [documentsData, feesData, courseAndBatchNameData] = await Promise.all([
      executeQuery({
        query: documentsQuery,
        values: [batch_id],
      }),
      executeQuery({
        query: feesQuery,
        values: [batch_id],
      }),
      executeQuery({
        query: courseAndBatchNameQuery,
        values: [batch_id],
      }),
    ]);

    res.status(200).json({
      documents: documentsData,
      fees: feesData,
      coursename: courseAndBatchNameData[0].coursename,
      batch: courseAndBatchNameData[0].batch,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
