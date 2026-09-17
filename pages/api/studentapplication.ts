/*
This function is called from students.tsx (Students link).
student registration form.
*/

import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    const body = req.body;
    // const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date();

    // Format the age (DOB) to YYYY-MM-DD without timezone
    const formattedAge = body.age ? new Date(body.age).toISOString().split("T")[0] : null;

    const result = await prisma.vastudents.create({
      data: {
        Quarter: body.Quarter || null,
        SNo: body.SNo || null,
        Batch_ID: body.Batch_ID || null,
        Program_Name: body.Program_Name || null,
        Trainee_ID: body.Trainee_ID || null,
        name: body.name || null,
        edu_qualifications: body.edu_qualifications || null,
        phone_number: body.phone_number ? BigInt(body.phone_number) : null,
        alt_ph_num: body.alt_ph_num ? BigInt(body.alt_ph_num) : null,
        CityDistrict_State: body.CityDistrict_State || null,
        email: body.email || null,
        gender: body.gender || null,
        age: formattedAge ? new Date(formattedAge) : null,
        visual_acuity: body.visual_acuity || null,
        percent_loss: body.percent_loss || null,
        employment_status: body.employment_status || null,
        Designation: body.Designation || null,
        Languages_Known: body.Languages_Known || null,
        Program_ManagerCoordinator: body.Program_ManagerCoordinator || null,
        country: body.country || null,
        state: body.state || null,
        city: body.city || null,
        disability: body.disability || "",
        edu_details: body.edu_details || "",
        objectives: body.objectives || null,
        first_choice: body.first_choice || null,
        second_choice: body.second_choice || null,
        third_choice: body.third_choice || null,
        impairment_history: body.impairment_history || null,
        source: body.source || null,
        registration_date: currentDate,
        id_proof: body.id_proof || "",
        disability_cert: body.disability_cert || "",
        photo: body.photo || "",
        bank_details: body.bank_details || "",
        completion_status: body.completion_status || null,
        reason_for_status: body.reason_for_status || null,
        certification_eligibility: body.certification_eligibility || null,
        risk_factor: body.risk_factor || null,
        remarks: body.remarks || null,
        commenter: body.commenter || null,
      },
    });
    // Return a JSON success response instead of redirecting
    res.status(200).json({
      success: true,
      message: "Student Registration Successful",
      studentId: result.id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
