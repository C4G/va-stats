import styles from "../../styles/StudentReg.module.css";

export const searchAndUpdateStudentData = async ({ phone_number, gender, dobYear, dobMonth, dobDay }) => {
  if (!phone_number || !gender || !(dobYear && dobMonth && dobDay)) {
    return;
  }

  const dob = dobYear && dobMonth && dobDay ? `${dobYear}-${dobMonth}-${dobDay}` : null;

  try {
    const response = await fetch("/api/getstudent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: phone_number || null,
        name: null, // name is not provided in the search parameters
        gender: gender || null,
        dob: dob,
      }),
    });

    if (!response.ok) {
      throw new Error("Student not found");
    }

    const data = await response.json();

    // Store the student ID and set update mode
    window.isUpdateMode = true;
    window.studentId = data.id;

    if (data.dob_year && data.dob_month && data.dob_day) {
      window.updateDobFields = {
        year: data.dob_year.toString(),
        month: data.dob_month,
        day: data.dob_day,
      };
    }

    window.updateFields = {
      percentLoss: data.percent_loss || "",
      visualAcuity: data.visual_acuity || "",
      disability: data.disability || "",
      eduQualifications: data.edu_qualifications || "",
      employmentStatus: data.employment_status || "",
      country: data.country || "",
      state: data.state || "",
      city: data.city || "",
      source: data.source || "",
    };

    const mainForm = document.getElementById("studentRegForm");
    if (mainForm instanceof HTMLFormElement) {
      const setFieldValue = (name: string, value) => {
        const field = mainForm.elements.namedItem(name);
        if (
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        ) {
          field.value = String(value ?? "");
        }
      };
      // Change submit button text to "Update"
      const submitButton = mainForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.textContent = "UPDATE";
        submitButton.classList.add(styles.btnupdate);
      }

      setFieldValue("name", data.name);
      setFieldValue("gender", data.gender);

      if (data.dob_year && data.dob_month && data.dob_day) {
        setFieldValue("dob_year", data.dob_year);
        setFieldValue("dob_month", data.dob_month);
        setFieldValue("dob_day", data.dob_day);
      }

      if (data.email) setFieldValue("email", data.email);
      if (data.phone_number) setFieldValue("phone_number", data.phone_number);
      if (data.alt_ph_num) setFieldValue("alt_ph_num", data.alt_ph_num);
      if (data.country) setFieldValue("country", data.country);
      if (data.state) setFieldValue("state", data.state);
      if (data.city) setFieldValue("city", data.city);
      if (data.disability) setFieldValue("disability", data.disability);
      if (data.edu_qualifications) setFieldValue("edu_qualifications", data.edu_qualifications);
      if (data.edu_details) setFieldValue("edu_details", data.edu_details);
      if (data.employment_status) setFieldValue("employment_status", data.employment_status);
      if (data.visual_acuity) setFieldValue("visual_acuity", data.visual_acuity);
      if (data.percent_loss !== null && data.percent_loss !== undefined) {
        setFieldValue("percent_loss", data.percent_loss);
      }
      if (data.impairment_history) setFieldValue("impairment_history", data.impairment_history);
      if (data.objectives) setFieldValue("objectives", data.objectives);
      if (data.first_choice) setFieldValue("first_choice", data.first_choice);
      if (data.second_choice) setFieldValue("second_choice", data.second_choice);
      if (data.third_choice) setFieldValue("third_choice", data.third_choice);
    }
    return data; // Return student data on success
  } catch (error) {
    console.error(`Error searching for student: ${error}`);
    return null; // Return null instead of Error object
  }
};
