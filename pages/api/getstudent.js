import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, name, gender, dob, phone_number } = req.body;
    const conditions = [];
    const values = [];

    if (id !== null && id !== undefined && id !== "") {
      conditions.push("id = ?");
      values.push(id);
    }

    if (name !== null && name !== undefined && name !== "") {
      conditions.push("name = ?");
      values.push(name);
    }

    if (gender !== null && gender !== undefined && gender !== "") {
      conditions.push("gender = ?");
      values.push(gender);
    }

    if (dob !== null && dob !== undefined && dob !== "") {
      conditions.push("DATE(age) = ?");
      values.push(dob);
    }

    if (phone_number !== null && phone_number !== undefined && phone_number !== "") {
      conditions.push("phone_number = ?");
      values.push(phone_number);
    }

    if (conditions.length === 0) {
      return res.status(400).json({ message: "At least one valid search criteria is required" });
    }

    const whereClause = conditions.join(" AND ");

    let result = await executeQuery({
      query: `SELECT * FROM vastudents WHERE ${whereClause} LIMIT 1`,
      values: values,
    });

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const rawStudent = result[0];
    const dobDate = rawStudent.age ? new Date(rawStudent.age) : null;
    const year = dobDate ? dobDate.getFullYear() : "";
    const month = dobDate ? String(dobDate.getMonth() + 1).padStart(2, "0") : "";
    const day = dobDate ? String(dobDate.getDate()).padStart(2, "0") : "";

    const student = {
      ...rawStudent,
      dob_year: year,
      dob_month: month,
      dob_day: day,
      name: rawStudent.name,
      gender: rawStudent.gender,
      email: rawStudent.email || "",
      phone_number: rawStudent.phone_number?.toString() || "",
      alt_ph_num: rawStudent.alt_ph_num?.toString() || "",
      country: rawStudent.country || "",
      state: rawStudent.state || "",
      city: rawStudent.city || "",
      disability: rawStudent.disability || "Visually Impaired",
      edu_qualifications: rawStudent.edu_qualifications || "",
      edu_details: rawStudent.edu_details || "",
      employment_status: rawStudent.employment_status || "",
      visual_acuity: rawStudent.visual_acuity || "",
      percent_loss: rawStudent.percent_loss !== null ? rawStudent.percent_loss.toString() : "",
      impairment_history: rawStudent.impairment_history || "",
      objectives: rawStudent.objectives || "",
      first_choice: rawStudent.first_choice || "",
      second_choice: rawStudent.second_choice || "",
      third_choice: rawStudent.third_choice || "",
      Quarter: rawStudent.Quarter,
      SNo: rawStudent.SNo,
      Batch_ID: rawStudent.Batch_ID,
      Program_Name: rawStudent.Program_Name,
      Trainee_ID: rawStudent.Trainee_ID,
      CityDistrict_State: rawStudent.CityDistrict_State,
      Designation: rawStudent.Designation,
      Languages_Known: rawStudent.Languages_Known,
      Program_ManagerCoordinator: rawStudent.Program_ManagerCoordinator,
      first_recommendation: rawStudent.first_recommendation || "",
      second_recommendation: rawStudent.second_recommendation || "",
      third_recommendation: rawStudent.third_recommendation || "",
      source: rawStudent.source || "",
      registration_date: rawStudent.registration_date,
      id_proof: rawStudent.id_proof,
      disability_cert: rawStudent.disability_cert,
      photo: rawStudent.photo,
      bank_details: rawStudent.bank_details,
      completion_status: rawStudent.completion_status || "",
      reason_for_status: rawStudent.reason_for_status || "",
      certification_eligibility: rawStudent.certification_eligibility || "",
      risk_factor: rawStudent.risk_factor || "",
      remarks: rawStudent.remarks || "",
      commenter: rawStudent.commenter || "",
      enrollment_status: rawStudent.enrollment_status ?? null,
    };

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}
