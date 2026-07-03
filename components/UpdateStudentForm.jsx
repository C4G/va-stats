"use client";

import { searchAndUpdateStudentData } from "@/utils/students/search-and-update-student-data";
import { useState } from "react";
import styles from "../styles/StudentReg.module.css";

export default function UpdateStudentForm({ onClose }) {
  const [phone_number, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const studentData = await searchAndUpdateStudentData({ phone_number, gender, dobYear, dobMonth, dobDay });
      setLoading(false);
      if (studentData) {
        // Get the student name from the returned data
        const studentName = studentData.name;
        setSuccess(`Already registered student: ${studentName}`);
        // Form stays open so user can see the success message and close manually
      } else {
        setError("Student not found. Please check the information and try again.");
      }
    } catch (error) {
      console.error("Error searching for student:", error);
      setLoading(false);
      setError("An error occurred while searching for the student. Please try again.");
    }
  };

  return (
    <div className={styles.updateFormOverlay}>
      <div className={styles.updateFormCard}>
        <h2>Update Student Details</h2>
        <p className={styles.updateFormInstruction}>Fill in all the fields to search for a student</p>
        <form onSubmit={handleSubmit}>
          <div className={styles.updateFormField}>
            <label htmlFor="phone_number">Phone Number</label>
            <input
              type="tel"
              id="phone_number"
              value={phone_number}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setError("");
              }}
              className={styles.reginput}
              placeholder="Enter Phone Number"
              pattern="[0-9]{10}"
              required
            />
          </div>

          <div className={styles.updateFormField}>
            <label htmlFor="updateGender">Gender</label>
            <select
              id="updateGender"
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                setError("");
              }}
              className={styles.txtboxdropdown}
              required
            >
              <option value="">Select Gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className={styles.updateFormField}>
            <label>Date of Birth</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <select
                value={dobYear}
                onChange={(e) => {
                  setDobYear(e.target.value);
                  setError("");
                }}
                className={styles.txtboxdropdown}
                required
              >
                <option value="">Year</option>
                {Array.from({ length: 100 }, (_, i) => {
                  const year = new Date().getFullYear() - 14 - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>

              <select
                value={dobMonth}
                onChange={(e) => {
                  setDobMonth(e.target.value);
                  setError("");
                }}
                className={styles.txtboxdropdown}
                required
              >
                <option value="">Month</option>
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((month, index) => (
                  <option key={month} value={String(index + 1).padStart(2, "0")}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                value={dobDay}
                onChange={(e) => {
                  setDobDay(e.target.value);
                  setError("");
                }}
                className={styles.txtboxdropdown}
                required
              >
                <option value="">Day</option>
                {Array.from({ length: getDaysInMonth(dobYear, dobMonth) || 31 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}
          {success && <p className={styles.successMessage}>{success}</p>}

          <div className={styles.updateFormButtons}>
            <button type="button" onClick={onClose} className={`${styles.btnlight}`}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={`${styles.btnprimary} ${styles.updateButton}`}>
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
