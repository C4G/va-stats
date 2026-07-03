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
    if (mainForm) {
      // Change submit button text to "Update"
      const submitButton = mainForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.textContent = "UPDATE";
        submitButton.classList.add(styles.btnupdate);
      }

      mainForm.name.value = data.name;
      mainForm.gender.value = data.gender;

      if (data.dob_year && data.dob_month && data.dob_day) {
        mainForm.dob_year.value = data.dob_year.toString();
        mainForm.dob_month.value = data.dob_month;
        mainForm.dob_day.value = data.dob_day;
      }

      if (data.email) mainForm.email.value = data.email;
      if (data.phone_number) mainForm.phone_number.value = data.phone_number;
      if (data.alt_ph_num) mainForm.alt_ph_num.value = data.alt_ph_num;
      if (data.country) mainForm.country.value = data.country;
      if (data.state) mainForm.state.value = data.state;
      if (data.city) mainForm.city.value = data.city;
      if (data.disability) mainForm.disability.value = data.disability;
      if (data.edu_qualifications) mainForm.edu_qualifications.value = data.edu_qualifications;
      if (data.edu_details) mainForm.edu_details.value = data.edu_details;
      if (data.employment_status) mainForm.employment_status.value = data.employment_status;
      if (data.visual_acuity) mainForm.visual_acuity.value = data.visual_acuity;
      if (data.percent_loss !== null && data.percent_loss !== undefined) {
        mainForm.percent_loss.value = data.percent_loss;
      }
      if (data.impairment_history) mainForm.impairment_history.value = data.impairment_history;
      if (data.objectives) mainForm.objectives.value = data.objectives;
      if (data.first_choice) mainForm.first_choice.value = data.first_choice;
      if (data.second_choice) mainForm.second_choice.value = data.second_choice;
      if (data.third_choice) mainForm.third_choice.value = data.third_choice;
    }
    return data; // Return student data on success
  } catch (error) {
    console.error(`Error searching for student: ${error}`);
    return null; // Return null instead of Error object
  }
};
