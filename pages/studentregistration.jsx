// NOTE: IF FORM FIELDS ARE EDITED, YOU MUST ALSO EDIT:
// /pages/students.jsx (1 sec.),
// /pages/api/studentapplication.js (2 secs.),
// /pages/api/getstudentsdata.js (1 sec.)
// DreamHost CSV files: csvfunctions.php (3 secs.), students.php (1 sec.)
/*
In useEffect: ESLint warning was removed using code below, including slashes;
may cause problems if changes are not tested thoroughly
// eslint-disable-next-line react-hooks/exhaustive-deps
*/

import GlobalSnackbar from "@/components/GlobalSnackbar";
import { searchAndUpdateStudentData } from "@/utils/students/search-and-update-student-data";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import Router from "next/router"; // Popup confirmation
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Navbar from "../components/Navbar";
import UpdateStudentForm from "../components/UpdateStudentForm";
import styles from "../styles/StudentReg.module.css";
import PageTitleWithUserGuideLink from "@/components/PageTitleWithUserGuideLink";

let worldData = require("../utils/countries+states.json");
var regError = false;

export default function Page() {
  const { data: session, status } = useSession();
  const [userRole, setUserRole] = useState(null);
  useForm(); // Form reset

  // Universal keyboard handler for buttons - handles both Enter and Space keys
  const handleKeyDown = (event, action) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); // Prevent default behavior
      action();
    }
  };

  // Helper function to create consistent button props with accessibility
  const createAccessibleButtonProps = (onClickHandler) => ({
    onClick: onClickHandler,
    onKeyDown: (e) => handleKeyDown(e, onClickHandler),
  });
  const [dobYear, setDobYear] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [selectedPercentVision, setSelectedPercentVision] = useState("");
  const [selectedDisability, setSelectedDisability] = useState("Visually Impaired");
  const [, setSelectedVision] = useState("Blind");
  const [selectedEdu, setSelectedEdu] = useState("Below 10th Standard");
  const [, setSelectedEmpStatus] = useState("Unemployed");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("success"); // Default severity for snackbar
  const [alertOpen, setAlertOpen] = useState(false);

  // Client-side only rendering
  const [isClient, setIsClient] = useState(false);

  // This will run after the component is mounted on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user || !session.user.email) return;
    (async () => {
      try {
        const res = await fetch("/api/getuserdata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: session.user.email }),
        });
        if (!res.ok) {
          console.error("[studentregistration] getuserdata failed:", res.status);
          return;
        }
        const data = await res.json();
        setUserRole(data?.users?.[0]?.role ?? null);
      } catch (e) {
        console.error("[studentregistration] getuserdata error:", e);
      }
    })();
  }, [status, session]);

  // Applies the data stashed on window.updateDobFields / window.updateFields by
  // searchAndUpdateStudentData. Controlled inputs (state, city, disability,
  // education, percent vision) only stick when set through React state here;
  // a direct DOM .value assignment is overwritten on the next re-render.
  const applyPrefillFields = useCallback(() => {
    if (window.updateDobFields) {
      const dateData = { ...window.updateDobFields };
      window.updateDobFields = null;

      setDobYear(dateData.year);
      setDobMonth(dateData.month);
      setDobDay(dateData.day);
    }

    if (window.updateFields) {
      const fieldsData = { ...window.updateFields };
      window.updateFields = null;

      if (fieldsData.percentLoss) {
        setSelectedPercentVision(fieldsData.percentLoss);
      }

      if (fieldsData.visualAcuity && document.getElementById("visual_acuity")) {
        document.getElementById("visual_acuity").value = fieldsData.visualAcuity;
      }

      if (fieldsData.disability) {
        setSelectedDisability(fieldsData.disability);
      }

      if (fieldsData.eduQualifications) {
        setSelectedEdu(fieldsData.eduQualifications);
      }

      if (fieldsData.employmentStatus && document.getElementById("employment_status")) {
        document.getElementById("employment_status").value = fieldsData.employmentStatus;
      }

      if (fieldsData.country && document.getElementById("country")) {
        const countrySelect = document.getElementById("country");
        countrySelect.value = fieldsData.country;
        const event = new Event("change", { bubbles: true });
        countrySelect.dispatchEvent(event);

        if (fieldsData.state) {
          setSelectedState(fieldsData.state);
        }
      }

      if (fieldsData.city) {
        setSelectedCity(fieldsData.city);
      }

      if (fieldsData.source) {
        const parts = fieldsData.source.split(" - ").map((p) => p.trim());
        const sourceTypeField = document.getElementById("source_type");
        const sourceSpecifyField = document.getElementById("source_specify");
        const sourceHospitalField = document.getElementById("source_hospital");
        const hospitalOtherField = document.getElementById("hospital_other");

        if (sourceTypeField) {
          sourceTypeField.value = parts[0] || "";
          const event = new Event("change", { bubbles: true });
          sourceTypeField.dispatchEvent(event);
        }

        if (parts[0] === "Hospital/Doctor/Rehabilitation center") {
          if (sourceHospitalField) sourceHospitalField.value = parts[1] || "";
          if (parts[1]?.toLowerCase() === "other" && hospitalOtherField) {
            hospitalOtherField.value = parts[2] || "";
          }
        } else {
          if (parts[1] && sourceSpecifyField) {
            sourceSpecifyField.value = parts[1];
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    const searchWrapper = async () => {
      try {
        const result = await searchAndUpdateStudentData({ phone_number, gender, dobYear, dobMonth, dobDay });
        return !!result;
      } catch (error) {
        console.error("Error in searchWrapper:", error);
        return false;
      }
    };
    if (!gender || !dobYear || !dobMonth || !dobDay || !phone_number) return;
    searchWrapper()
      .then((result) => {
        if (result) {
          // Apply controlled fields (country/state/city, disability, education,
          // percent vision) via React state; direct DOM assignment does not stick.
          applyPrefillFields();
          setMessage("Student information was found and data has been pre-filled!");
          setSeverity("success");
          setAlertOpen(true);
        }
      })
      .catch((error) => {
        console.error("Error searching for student:", error);
      });
  }, [gender, dobYear, dobMonth, dobDay, phone_number, applyPrefillFields]);

  // Handle date field updates
  useEffect(() => {
    if (!isClient) return; // Only run on client-side after hydration

    const yearSelect = document.getElementById("dob_year");
    const monthSelect = document.getElementById("dob_month");
    const daySelect = document.getElementById("dob_day");

    const handleDateChange = (e) => {
      const { id, value } = e.target;
      if (id === "dob_year") setDobYear(value);
      if (id === "dob_month") setDobMonth(value);
      if (id === "dob_day") setDobDay(value);
      checkDate();
    };

    yearSelect?.addEventListener("change", handleDateChange);
    monthSelect?.addEventListener("change", handleDateChange);
    daySelect?.addEventListener("change", handleDateChange);

    return () => {
      yearSelect?.removeEventListener("change", handleDateChange);
      monthSelect?.removeEventListener("change", handleDateChange);
      daySelect?.removeEventListener("change", handleDateChange);
    };
  }, [isClient]); // Add isClient dependency

  const showToast = () => {
    setMessage("Error registering student");
    setSeverity("error");
    setAlertOpen(true);
  };

  useEffect(() => {
    if (!isClient) return; // Only run on client side

    const preventUnintendedSubmit = (e) => {
      const active = document.activeElement;

      const tag = active?.tagName;
      const type = active?.type;

      const isSubmitButton = type === "submit" || active?.id === "submit-button";
      const isSelect = tag === "SELECT";
      const isInput = tag === "INPUT" || tag === "TEXTAREA";

      // Allow Enter key for SELECT elements (for dropdown opening)
      // Only prevent Enter for INPUT/TEXTAREA to avoid unintended form submission
      if (e.key === "Enter" && !isSubmitButton && isInput && !isSelect) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", preventUnintendedSubmit);
    return () => {
      document.removeEventListener("keydown", preventUnintendedSubmit);
    };
  }, [isClient]);

  /*--------- Calendar input: prevent future date BEGINS--------*/
  const checkDate = () => {
    const year = document.getElementById("dob_year")?.value;
    const month = document.getElementById("dob_month")?.value;
    const day = document.getElementById("dob_day")?.value;
    const errorField = document.getElementById("age-error");

    if (!year || !month || !day) {
      errorField.textContent = "You must provide a full date of birth!";
      regError = true;
      return false;
    }

    const dob = new Date(`${year}-${month}-${day}`);
    const today = new Date();
    const minDOB = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());

    if (dob > today) {
      errorField.textContent = "Date of birth must not be in the future.";
      regError = true;
      return false;
    } else if (dob > minDOB) {
      errorField.textContent = "User must be at least 16 years old.";
      regError = true;
      return false;
    } else {
      errorField.textContent = "";
      regError = false;
      return true;
    }
  };

  /*--------- Calendar input: prevent future date ENDS --------*/

  /*---------------- NAME VALIDATION ----------------------------*/
  const checkName = () => {
    var name = document.getElementById("name");
    var nameString = name.value;
    var regpattern = new RegExp(name.pattern);
    if (nameString.length == 0) {
      document.getElementById("name-error").textContent = "You must provide a name!";
      regError = true;
    } else if (regpattern.test(nameString) != true) {
      document.getElementById("name-error").textContent = "Name cannot contain numbers or special characters!";
      regError = true;
    } else {
      document.getElementById("name-error").textContent = "";
      regError = false;
    }
  };
  /*------------------------------------------------------------*/

  const checkAll = async () => {
    checkDate();
    await checkPhone();
    checkCountry();
    checkState();
    checkCity();
    checkDisability();
    checkEducation();
    checkClass();
    checkVisionLoss();
    checkObjectives();
  };

  /*---------------- CITY VALIDATION ----------------------------*/
  const checkCity = () => {
    var city = document.getElementById("city");
    if (city.value.length == 0) {
      document.getElementById("city-error").textContent = "You must provide a city name!";
      regError = true;
    } else {
      document.getElementById("city-error").textContent = "";
      regError = false;
    }
  };
  /*------------------------------------------------------------*/

  /*---------------- CITY VALIDATION ----------------------------*/
  const checkEducation = () => {
    var qual = document.getElementById("edu_qualifications").value;
    var details = document.getElementById("edu_details");
    if (qual.includes("Other") && details.value.length == 0) {
      document.getElementById("education-error").textContent = "You must provide education details!";
      regError = true;
    } else {
      document.getElementById("education-error").textContent = "";
      regError = false;
    }
  };
  /*------------------------------------------------------------*/

  /*---------------- CITY VALIDATION ----------------------------*/
  const checkCountry = () => {
    var country = document.getElementById("country");
    if (country.value.length == 0) {
      document.getElementById("country-error").textContent = "You must provide a country name!";
      regError = true;
    } else {
      document.getElementById("country-error").textContent = "";
      regError = false;
    }
  };
  /*------------------------------------------------------------*/

  /*---------------- CITY VALIDATION ----------------------------*/
  const checkState = () => {
    if (!countryHasStates) {
      document.getElementById("state-error").textContent = "";
      return;
    }
    var state = document.getElementById("state");
    if (state.value.length == 0) {
      document.getElementById("state-error").textContent = "You must provide a state name!";
      regError = true;
    } else {
      document.getElementById("state-error").textContent = "";
      regError = false;
    }
  };
  /*------------------------------------------------------------*/

  /*---------------- CITY VALIDATION ----------------------------*/
  const checkClass = () => {
    var state = document.getElementById("first_choice");
    if (state.value.length == 0) {
      document.getElementById("class-error").textContent = "You must provide a first choice!";
      regError = true;
    } else {
      document.getElementById("class-error").textContent = "";
      regError = false;
    }
  };
  /*------------------------------------------------------------*/

  /*---------------- OBJECTIVES VALIDATION ----------------------------*/
  const checkObjectives = () => {
    const objectives = document.getElementById("objectives");
    const objectivesOther = document.getElementById("objectives_other");
    const errorField = document.getElementById("objectives-error");

    if (!objectives || !errorField) return;

    if (objectives.value.length == 0) {
      errorField.textContent = "You must provide a reason for seeking training!";
      regError = true;
    } else if (objectives.value === "Other" && objectivesOther && objectivesOther.value.trim().length == 0) {
      errorField.textContent = "You must provide details when selecting 'Other'!";
      regError = true;
    } else {
      errorField.textContent = "";
      regError = false;
    }
  };
  /*------------------------------------------------------------*/

  // Debounce function to limit API calls
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Main phone validation function
  const checkPhone = async () => {
    var chosenphone = document.getElementById("phone_number").value;
    var regpattern = /^\d{10}$/;

    // Check if empty
    if (chosenphone.length == 0) {
      document.getElementById("phone-error").textContent = "You must provide a phone number!";
      regError = true;
      return false;
    }

    // Check format
    if (regpattern.test(chosenphone) != true) {
      document.getElementById("phone-error").textContent = "Phone number must be 10 digits!";
      regError = true;
      return false;
    }

    regError = false;

    document.getElementById("phone-error").textContent = "";
    return true;
  };

  const checkAltPhone = async () => {
    const altPhoneField = document.getElementById("alt_ph_num");
    const phoneValue = altPhoneField.value.replace(/\D/g, "");
    const regpattern = /^\d{10}$/;

    if (phoneValue.length === 0) {
      document.getElementById("alt-phone-error").textContent = "";
      regError = false;
      return true;
    }

    if (!regpattern.test(phoneValue)) {
      document.getElementById("alt-phone-error").textContent = "Phone number must be 10 digits!";
      regError = true;
      return false;
    }

    document.getElementById("alt-phone-error").textContent = "";
    regError = false;
    return true;
  };

  // const checkValidPhone = () => {
  //  var phoneinput = document.getElementById("phone_number");
  //  if (phoneinput.value == 1112223333) {
  //    alert("PHONE NUMBER must be 10 digits; number was reset to a PLACEHOLDER NUMBER, WHICH MUST BE CHANGED.");
  //    phoneinput.value = 1112223333;
  //    phoneinput.focus();
  //  }
  //}
  // const checkValidAltPhone = () => {
  //  var phoneinput = document.getElementById("alt_ph_num");
  //  if (phoneinput.value != "") {
  //    if (phoneinput.value == 1112223333) {
  //      alert("PARENT/GUARDIAN PHONE NUMBER must be 10 digits; number was reset to a PLACEHOLDER NUMBER, WHICH MUST BE CHANGED.");
  //      phoneinput.value = 1112223333;
  //      phoneinput.focus();
  //    }
  //  }
  //}
  /*----------------- PHONE VALIDATION (REG AND ALT) ENDS ------------*/

  // Line below may work FOR SSRPROVIDER ERRORS:
  // const { isBrowser } = useSSR();

  /*------------------------- COURSE OPTIONS BEGIN ------------------*/

  const [contentLoading, setContentLoading] = useState(false);
  // const [contentLoading, setContentLoading] = useState(true);
  const [courseResponse, setCourseResponse] = useState(() => []);
  const [courseOptions1, setCourseOptions1] = useState(() => []);
  const [courseOptions2, setCourseOptions2] = useState(() => []);
  const [courseOptions3, setCourseOptions3] = useState(() => []);

  const [countriesOptions, setCountriesOptions] = useState(() => []);
  const [stateOptions, setStateOptions] = useState(() => []);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [countryHasStates, setCountryHasStates] = useState(true);

  const [Option1, setOption1] = useState(() => []);
  const [Option2, setOption2] = useState(() => []);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formSummaryData, setFormSummaryData] = useState({});
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState({});

  /*------------------- COURSE CHOICE SUMMARIES CODE BEGINS --------------------*/
  const pythonSummary =
    "The Python class goal is to develop skills to write simple applications using Python programming language. We recommend familiarity with other programming languages. The course will be 4-6 months long.";
  const cSummary =
    "The C language is a fundamental language in the field of computer science. It's powerful and has a wide variety of uses. It has been used to create databases, applications, and even operating systems. The C language is considered both fast and versatile.";
  const cplusplusSummary =
    "The C++ language is very popular. It gives programmers a great deal of control over system memory and other resources. It facilitates the creation of high-performance applications. C++ has played a key role in the development of a wide variety of software, including video games.";
  const ccaSummary =
    "This is our Certificate Course in Computer Applications (CCA). It is a preparatory course to introduce students to computers and computer applications. The student will acquire a basic understanding of computers and practical knowledge of using computer applications and voice assisted software. The student should be 15+ years of age with access to a computer.";
  const phpSummary =
    "The PHP language is widely used in Information Technology. It is a server side scripting language. PHP can be used to create interactive and dynamic websites. It is especially helpful in connecting databases to websites. Although it's considered beginner-friendly, it is extremely powerful.";
  const htmlSummary =
    "HTML is our broad course on critical website languages. The student will acquire skills in HTML, CSS, JavaScript, and ARIA Fundamentals for accessible Web development. The ideal student has a Bachelor degree, skill with computers and touch screen phones, and proficiency using MS Office and screen readers like NVDA and JAWS. The course is 2 months long with 90 minutes per class.";
  const mobtechSummary =
    "The Mobile Technology course will enable a person with visual impairment to effectively use the modern-day smartphone for day-to-day work, mobility and comfort. Additionally, the student will learn essential nomenclature related to hardware and software. The ideal student is 12+ years of age and has an Android mobile device.";
  const cssSummary =
    "The CSS course is for people who want to develop the skills to style websites. Since CSS works with HTML in creating websites, this is a great follow up course for those who took our HTML course. Website creation focuses on separating content (HTML) and design (CSS). The student will acquire a deep understanding of the manipulation of color, fonts, and a variety of other web page characteristics.";
  const excelSummary =
    "Excel is Microsoft's universally popular spreadsheet software. It is used for a variety of purposes including: record-keeping, business analytics, as a 'database' when higher-level database functinality is not required.";
  const datSummary = "Digital Accessibility Testing";
  const sepbSummary = "Spoken English Programme Beginner";
  const chatGptSummary = "AI tools and prompt Engineering";

  // ?COURSE CHOICE SUMMARIES ITEM
  const [Option3, setOption3] = useState(() => []);

  const [choiceChanged, setChoiceChanged] = useState(false);

  const refFirstChoice = useRef(null);
  const refSource = useRef(null);

  const textAreaHandleEnter = (e) => {
    const { name } = e.target;
    if (e.keyCode == 13 && !e.shiftKey) {
      e.preventDefault();
      if (name == "objectives") {
        refFirstChoice.current.focus();
      } else if (name == "impairment_history") {
        refSource.current.focus();
      }
    }
  };

  const getSummaries = (e) => {
    // See constants section above for returned values
    if (e == "Python") {
      return pythonSummary;
    } else if (e == "C") {
      return cSummary;
    } else if (e == "C++") {
      return cplusplusSummary;
    } else if (e == "CCA") {
      return ccaSummary;
    } else if (e == "PHP") {
      return phpSummary;
    } else if (e == "HTML") {
      return htmlSummary;
    } else if (e == "Mobile Technology") {
      return mobtechSummary;
    } else if (e == "CSS") {
      return cssSummary;
    } else if (e == "Excel") {
      return excelSummary;
    } else if (e == "DAT") {
      return datSummary;
    } else if (e == "SEP B") {
      return sepbSummary;
    } else if (e == "Chatgpt") {
      return chatGptSummary;
    } else {
      return ""; // AN UNKNOWN course was chosen
    }
  };

  const updateChoices = (e) => {
    const { name, value } = e.target;
    if (name === "first_choice") {
      setOption1(value);
    } else if (name === "second_choice") {
      setOption2(value);
    } else if (name === "third_choice") {
      setOption3(value);
    }
    setChoiceChanged(!choiceChanged);
  };

  /* INPUT CONSTRAINT: Course choices dropdowns; selection is enforced by
  the onFocus event in the next form element (Visual Acuity dropdown) */
  const checkDropdown = () => {
    if (document.getElementById("first_choice").value !== "Select First Choice") {
      return;
    } else if (document.getElementById("first_choice").value == "Select First Choice") {
      document.getElementById("first_choice").focus();
    }
  };
  const checkSecondCourseChoice = () => {
    if (document.getElementById("second_choice").value !== "Select Second Choice") {
      return;
    } else if (document.getElementById("second_choice").value == "Select Second Choice") {
      document.getElementById("second_choice").value = "";
      return;
    }
  };
  const toastError = () => {
    if (regError == true) {
      showToast();
    }
  };
  const checkThirdCourseChoice = () => {
    if (document.getElementById("third_choice").value !== "Select Third Choice") {
      return;
    } else if (document.getElementById("third_choice").value == "Select Third Choice") {
      document.getElementById("third_choice").value = "";
      return;
    }
  };

  const updateOptions = () => {
    const options2 = [];
    courseResponse.map((course) => {
      if (course.course != Option1) {
        options2.push(
          <option key={`opt2-${course.course}`} value={course.course}>
            {course.course}
          </option>
        );
      }
    });
    setCourseOptions2(options2);

    const options3 = [];
    courseResponse.map((course) => {
      if (course.course != Option1 && course.course != Option2) {
        options3.push(
          <option key={`opt3-${course.course}`} value={course.course}>
            {course.course}
          </option>
        );
      }
    });
    setCourseOptions3(options3);
  };

  const getCourseData = async () => {
    setContentLoading(true);
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const apiUrlEndpoint = `${base}/api/getcoursesdata`;
      const response = await fetch(apiUrlEndpoint);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const res = await response.json();
      setCourseResponse(res.courses);
    } catch (error) {
      console.error("Failed to fetch course data:", error);
      setCourseResponse([]); // Set empty array as fallback
    } finally {
      setContentLoading(false);
    }
  };

  const getCourseOptions = () => {
    const options = [];
    courseResponse.map((course) => {
      options.push(
        <option key={`opt1-${course.course}`} value={course.course}>
          {course.course}
        </option>
      );
    });
    setCourseOptions1(options);
    updateOptions();
  };

  useEffect(() => {
    if (isClient) {
      getCourseOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseResponse, choiceChanged, isClient]);

  useEffect(() => {
    if (isClient) {
      getCourseData();
    }
  }, [isClient]);
  /*---------------------- COURSE OPTIONS END ------------------------*/

  /*---------------------- COUNTRIES/STATES BEGIN --------------------*/
  const updateCountriesOptions = () => {
    const countries = [];
    worldData.map((country) => {
      countries.push(
        <option key={`country-${country.name}`} value={country.name} selected={country.name === "India"}>
          {country.name}
        </option>
      );
    });
    setCountriesOptions(countries);
  };

  const updateStateOptions = (e) => {
    const { value } = e.target;
    const statesList = [];
    const matchedCountry = worldData.find((country) => country.name === value);
    const statesRaw = matchedCountry?.states ?? [];
    statesRaw.map((state) => {
      statesList.push(
        <option key={`state-${state.name}`} value={state.name}>
          {state.name}
        </option>
      );
    });
    setStateOptions(statesList);
    setCountryHasStates(statesRaw.length > 0);
    setSelectedState("");
  };

  useEffect(() => {
    if (isClient) {
      updateCountriesOptions();
      updateStateOptions({ target: { value: "India" } });
    }
  }, [isClient]);
  /*---------------------- COUNTRIES/STATES END --------------------*/

  /*---------------------- DISABILITY DROPDOWN ---------------------*/
  function checkDisability() {
    const disabilityValue = document.getElementById("disability").value;
    const errorField = document.getElementById("disability-error");
    if (disabilityValue === "Other Disability" || disabilityValue === "Non-disabled") {
      errorField.textContent = "VA courses are currently focused on individuals with visual disability.";
    } else {
      errorField.textContent = "";
    }
  }

  // EDUCATION DROPDOWN

  // VISION LOSS
  const checkVisionLoss = () => {
    const chosenpercentloss = parseInt(selectedPercentVision);
    const errorField = document.getElementById("percent-error");

    if (!selectedPercentVision) {
      errorField.textContent = "You must provide percentage of vision loss!";
      regError = true;
    } else if (chosenpercentloss < 40 || chosenpercentloss > 100) {
      errorField.textContent = "You must provide percentage of vision loss between 40 and 100!";
      regError = true;
    } else {
      errorField.textContent = "";
      regError = false;
    }
  };

  const labelMap = {
    Id: "ID",
    name: "Name",
    gender: "Gender",
    dob: "Date of Birth",
    email: "Email",
    phone_number: "Phone Number",
    alt_ph_num: "Parent/Guardian Phone Number",
    country: "Country",
    state: "State",
    city: "City",
    disability: "Disability",
    edu_qualifications: "Education",
    edu_details: "Education Details",
    employment_status: "Job Status",
    visual_acuity: "Visual Acuity",
    percent_loss: "Percentage of Vision Loss",
    impairment_history: "Vision Impairment History",
    first_choice: "1st Choice",
    second_choice: "2nd Choice",
    third_choice: "3rd Choice",
    objectives: "Reason for seeking Training",
    source: "How Did You Hear About This Program?",
  };

  // SUBMIT FORM
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission

    // Run all validations
    await checkAll();

    // Check for any error messages
    const errorElements = document.querySelectorAll('[id$="-error"]');
    for (const errorElement of errorElements) {
      if (errorElement.id === "disability-error") continue;
      if (errorElement.textContent) {
        // If there's any error message, don't submit
        return;
      }
    }
    // Validate DOB
    if (!validateDOB()) return;

    // Get form data
    const form = document.getElementById("studentRegForm");
    const formData = new FormData(form);
    let name = formData.get("name");
    if (name) {
      name = name
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      formData.set("name", name);
    }
    // Collect source info to store in vastudents.source
    let sourceType = form.elements["source_type"]?.value || "";
    let sourceSpecify = form.elements["source_specify"]?.value || "";
    let sourceHospital = form.elements["source_hospital"]?.value || "";
    let hospitalOther = form.elements["hospital_other"]?.value || "";

    let fullSource = sourceType;

    if (sourceType === "Vision-Aid staff" || sourceType === "Other") {
      if (sourceSpecify) fullSource += ` - ${sourceSpecify}`;
    } else if (sourceType === "Hospital/Doctor/Rehabilitation center") {
      if (sourceHospital) fullSource += ` - ${sourceHospital}`;
      if (sourceHospital === "Other" && hospitalOther) fullSource += ` - ${hospitalOther}`;
    }

    formData.set("source", fullSource);
    formData.set("age", `${dobYear}-${dobMonth}-${dobDay}`);

    if (formData.get("objectives") === "Other") {
      formData.set("objectives", form.elements["objectives_other"]?.value || "Other");
    }

    try {
      // Determine if this is an update or new registration
      const endpoint = window.isUpdateMode ? "/api/updatestudents" : "/api/studentapplication";

      if (window.isUpdateMode && window.studentId) {
        formData.set("student_id", window.studentId);
      }

      let payload = Object.fromEntries(formData);
      if (window.isUpdateMode) {
        payload = Object.fromEntries(
          Object.entries(payload).filter(([, v]) => !(typeof v === "string" && v.trim() === ""))
        );
        if (!countryHasStates) {
          payload.state = "";
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("API response status:", response.status);
      console.log("API response headers:", response.headers.get("content-type"));

      if (!response.ok) {
        const errorText = await response.text();
        console.log("API error response:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (response.ok) {
        if (window.isUpdateMode) {
          // If update mode, show success and redirect
          // alert("Student updated successfully"); (alert("Student updated successfully");)
          setContentLoading(true);

          // // Reset update mode
          window.isUpdateMode = false;
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) {
            submitButton.textContent = "SUBMIT";
            submitButton.classList.remove(styles.btnupdate);
          }
        }
        // Show confirmation modal
        setRegisterSuccessMsg(result.message);
        setFormSummaryData({
          Id: result.studentId || formData.get("student_id"),
          name: formData.get("name"),
          gender: formData.get("gender"),
          dob: `${dobYear}-${dobMonth}-${dobDay}`,
          email: formData.get("email") || "-",
          phone_number: formData.get("phone_number"),
          alt_ph_num: formData.get("alt_ph_num") || "-",
          country: formData.get("country"),
          state: formData.get("state"),
          city: formData.get("city"),
          disability: formData.get("disability"),
          edu_qualifications: formData.get("edu_qualifications"),
          edu_details: formData.get("edu_details") || "-",
          employment_status: formData.get("employment_status"),
          visual_acuity: formData.get("visual_acuity"),
          percent_loss: formData.get("percent_loss"),
          impairment_history: formData.get("impairment_history") || "-",
          first_choice: formData.get("first_choice") || "-",
          second_choice: formData.get("second_choice") || "-",
          third_choice: formData.get("third_choice") || "-",
          objectives:
            formData.get("objectives") === "Other"
              ? (formData.get("objectives_other") ?? "-")
              : (formData.get("objectives") ?? "-"),
          source: fullSource,
        });
        setShowConfirmModal(true);
      } else {
        // Show error toast if submission failed
        showToast();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      showToast();
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const validateDOB = () => {
    const error = document.getElementById("age-error");
    if (!dobYear || !dobMonth || !dobDay) {
      error.textContent = "Please select a complete date of birth!";
      regError = true;
      return false;
    }

    const dob = new Date(`${dobYear}-${dobMonth}-${dobDay}`);
    const today = new Date();
    const minAge = 14;
    const minDOB = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());

    if (dob > today) {
      error.textContent = "Date of birth must not be in the future.";
      regError = true;
      return false;
    } else if (dob > minDOB) {
      error.textContent = "User must be at least 14 years old.";
      regError = true;
      return false;
    }

    error.textContent = "";
    regError = false;
    return true;
  };

  const [showUpdateForm, setShowUpdateForm] = useState(false);

  // Download CSV function
  const downloadCSV = (dataObj) => {
    const keys = Object.keys(dataObj);
    const values = Object.values(dataObj);

    const csvContent = keys.join(",") + "\n" + values.map((val) => `"${val}"`).join(",");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "registration_summary.csv");
    link.click();
  };

  // Confirm Modal Trap Focus
  const modalRef = useRef(null);
  useEffect(() => {
    if (!isClient) return; // Only run on client-side

    if (showConfirmModal && modalRef.current) {
      const currentModal = modalRef.current;
      const focusableElements = currentModal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const trapFocus = (e) => {
        const focusables = Array.from(focusableElements);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.key === "Tab") {
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      currentModal.addEventListener("keydown", trapFocus);
      return () => {
        currentModal.removeEventListener("keydown", trapFocus);
      };
    }
  }, [showConfirmModal, isClient]);

  // Effect to handle updates from UpdateStudentForm
  useEffect(() => {
    if (!showUpdateForm) {
      applyPrefillFields();
    }
  }, [showUpdateForm, applyPrefillFields]);

  /*----------------------- HTML BEGINS ---------------------*/
  return (
    // NextUIProvider BELOW: FOR EDUCATION DROPDOWN
    // <NextUIProvider>

    <>
      {contentLoading ? (
        <div className={styles.overlay}>
          <span className={styles.customLoader}></span>
        </div>
      ) : (
        <></>
      )}
      {/* <span className={styles.skip}>
        <a href="#maincontent" className={styles.skip}>Skip to main content</a>
      </span> */}
      <div className={styles.mynavbar}>
        <span className={styles.skip}>
          <a href="#maincontent" className="skip" onClick={() => document.getElementById("maincontent")?.focus()}>
            Skip to main content
          </a>
        </span>

        {status === "loading" ? (
          <Navbar className={styles.navstudents} />
        ) : (
          <Navbar user_role={userRole ?? undefined} className={styles.navstudents} tabIndex={-1} />
        )}
      </div>
      <div className={styles.container}>
        <Head>
          {/* Title changed per accessibility consultant - Pratik */}
          <title>Registration - Vision-Aid-STATS</title>

          {/* AVOID HYDRATION ERRORS w/ meta tag below; this may not work. */}
          <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        </Head>
        <main className={styles.main} id="maincontent" suppressHydrationWarning>
          <div>
            <PageTitleWithUserGuideLink section_title="Registration" />
            <button
              onClick={() => setShowUpdateForm(true)}
              className={`${styles.btnlight} ${styles.updateButton}`}
              style={{ marginLeft: "1rem", marginTop: "1rem" }}
            >
              Registered User
            </button>
          </div>

          <div className={styles.studregcrsesinfo}>
            {/* Excel Sharepoint link */}
            {/* <a href="https://visionaidus.sharepoint.com/:x:/s/VADocumentLibrary_ExternalUsers/EZXuzdHpaKZGs2oWN_x-zJsBAYgzll9eycWx3SSWjQzwHA?e=1hs447" target="_blank">Courses - Details</a> */}
            {/* MS HTML conversion from Excel */}
          </div>
          {isClient && ( // Only render form after client-side hydration
            <div>
              {/* Avoid hydration errors with code below; may not work.
              <form action='/api/studentapplication' method='post' onSubmit={() => handleSubmit()} suppressHydrationWarning> */}
              {/* NOTE Re: disabling form autocompletion: use role="presentation" autoComplete="off" for EACH form input. In the code below, they are placed on the same line to underscore they work together. */}
              <form
                action="/api/studentapplication"
                method="post"
                id="studentRegForm"
                onSubmit={(e) => handleSubmit(e)}
                autoComplete="off"
              >
                <div className={styles.grid}>
                  {/*------- CARD: TRAINEE -------*/}
                  <div className={styles.card}>
                    <fieldset className={styles.sregfieldset} aria-labelledby="pd-legend">
                      <legend id="pd-legend" className={styles.sregfslegend}>
                        Personal Details
                      </legend>
                      <div className="forminstruction">
                        The fields marked with asterisks (<span className={styles.requiredelementlower}>*</span>) are
                        required.
                      </div>

                      <table
                        id="formtable"
                        className={styles.regtable}
                        // role="presentation"
                        style={{ fontWeight: "500" }}
                      >
                        <tbody>
                          {/*--------------- NAME BEGINS -----------*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="name">Name</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtd}>
                              <input
                                autoComplete="off"
                                // role="presentation" // They work together
                                className={styles.reginput}
                                id="name"
                                maxLength="150"
                                name="name"
                                pattern="^[a-zA-Z].*[\s\.]*$"
                                placeholder="As per aadhaar"
                                onBlur={(e) => checkName(e)}
                                required
                                aria-required="true"
                                type="text"
                                aria-describedby="name-error"
                                accessKey="e"
                                // aria-invalid="true"
                              />
                              <p id="name-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          {/*--------------- NAME ENDS -------------*/}

                          {/*---------- GENDER DROPDOWN BEGINS -----*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="gender">Gender</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtd}>
                              <select
                                name="gender"
                                id="gender"
                                className={styles.txtboxdropdown}
                                onBlur={(e) => {
                                  const gender = e.target.value;
                                  setGender(gender);
                                  // Use setTimeout to avoid blocking keyboard events
                                  setTimeout(() => {
                                    const errorField = document.getElementById("gender-error");
                                    if (errorField) {
                                      if (gender === "") {
                                        errorField.textContent = "Please select a gender.";
                                        regError = true;
                                      } else {
                                        errorField.textContent = "";
                                        regError = false;
                                      }
                                    }
                                  }, 0);
                                }}
                                required
                                aria-required="true"
                                aria-describedby="gender-error"
                              >
                                <option value="">Select</option>
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Other">Other</option>
                              </select>
                              <p id="gender-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          {/*---------- GENDER DROPDOWN ENDS -----*/}

                          {/*---------- DATE OF BIRTH BEGINS -----*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="age" id="dob-label">
                                Date of Birth
                              </label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtd}>
                              <div
                                style={{ display: "flex", gap: "10px" }}
                                role="group"
                                aria-labelledby="dob-label"
                                aria-describedby="age-error"
                              >
                                <select
                                  id="dob_year"
                                  name="dob_year"
                                  className={styles.txtboxdropdown}
                                  value={dobYear}
                                  onChange={(e) => {
                                    setDobYear(e.target.value);
                                    checkDate();
                                  }}
                                  required
                                  aria-required="true"
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
                                  id="dob_month"
                                  name="dob_month"
                                  className={styles.txtboxdropdown}
                                  value={dobMonth}
                                  onChange={(e) => {
                                    setDobMonth(e.target.value);
                                    checkDate();
                                  }}
                                  required
                                  aria-required="true"
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
                                  id="dob_day"
                                  name="dob_day"
                                  className={styles.txtboxdropdown}
                                  value={dobDay}
                                  onChange={(e) => {
                                    setDobDay(e.target.value);
                                    checkDate();
                                  }}
                                  required
                                  aria-required="true"
                                >
                                  <option value="">Day</option>
                                  {Array.from(
                                    {
                                      length: getDaysInMonth(dobYear, dobMonth) || 31,
                                    },
                                    (_, i) => (
                                      <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                                        {i + 1}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                              <p id="age-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          {/*---------- DATE OF BIRTH ENDS -----*/}

                          {/*---------- PHONE BEGINS ---------*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              {/* Changed from 'Phone' per stakeholder */}
                              <label htmlFor="phone_number">Phone Number</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtd}>
                              <input
                                autoComplete="off"
                                className={styles.reginput}
                                id="phone_number"
                                name="phone_number"
                                onBlur={async (e) => {
                                  const isGoodPhone = await checkPhone(e);
                                  if (isGoodPhone) {
                                    setPhoneNumber(e.target.value);
                                  } else {
                                    setPhoneNumber("");
                                  }
                                }}
                                onChange={(e) => {
                                  // Clear error message on any change
                                  document.getElementById("phone-error").textContent = "";

                                  // Only check for duplicates if we have 10 digits
                                  if (e.target.value.length === 10) {
                                    debounce(checkPhone, 500)();
                                  }
                                }}
                                pattern="[0-9]{10}"
                                placeholder="Enter 10 digits only"
                                required
                                aria-required="true"
                                aria-describedby="phone-error"
                              />
                              <p id="phone-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          {/*------------- PHONE ENDS -------------*/}

                          {/*------------- EMAIL BEGINS --------*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="email">Email</label>
                            </td>
                            <td className={styles.inputtd}>
                              <input
                                className={styles.reginput}
                                id="email"
                                name="email"
                                maxLength="50"
                                type="email"
                                autoComplete="off"
                                onBlur={() => {
                                  regError = false;
                                }}
                              />
                            </td>
                          </tr>
                          {/*------------ EMAIL ENDS ---------*/}

                          {/*----- PARENT/GUARDIAN PH # BEGINS ----*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="alt_ph_num">
                                {/* Changed from Phone2 per stakeholder */}
                                Parent/Guardian Phone Number
                              </label>
                            </td>
                            <td className={styles.inputtd}>
                              <input
                                autoComplete="off"
                                className={styles.reginput}
                                id="alt_ph_num"
                                name="alt_ph_num"
                                onBlur={() => checkAltPhone()}
                                pattern="[0-9]{10}"
                                placeholder="Enter 10 digits only"
                                // role="presentation"
                                aria-describedby="alt-phone-error"
                                // aria-invalid="true"
                              />
                              <p id="alt-phone-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          {/*------- PARENT/GUARDIAN PH # ENDS -------*/}

                          {/*------------ COUNTRY BEGINS -------------*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="country">Country</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtd}>
                              <select
                                autoComplete="off"
                                className={styles.reginput}
                                id="country"
                                name="country"
                                onChange={(e) => updateStateOptions(e)}
                                // onFocus={(e) => checkValidPhone(e)} // Check phone entry
                                onBlur={(e) => checkCountry(e)}
                                required
                                // role="presentation"
                                aria-describedby="country-error"
                                // aria-invalid="true"
                                defaultValue="India"
                              >
                                <option></option>
                                {countriesOptions}
                              </select>
                              <p id="country-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          {/*------------ COUNTRY ENDS -------------*/}

                          {/*------------- STATE BEGINS ------------*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="state">State</label>
                              {countryHasStates && <span className={styles.requiredelement}>&#42;</span>}
                            </td>
                            <td className={styles.inputtd}>
                              <select
                                autoComplete="off"
                                className={styles.reginput}
                                id="state"
                                // onFocus={(e) => checkValidAltPhone(e)} // Check alt phone entry
                                onBlur={(e) => checkState(e)}
                                name="state"
                                value={selectedState}
                                onChange={(e) => setSelectedState(e.target.value)}
                                required={countryHasStates}
                                disabled={!countryHasStates}
                                // role="presentation"
                                aria-describedby="state-error"
                                // aria-invalid="true"
                              >
                                {countryHasStates ? <option></option> : <option value="">Not applicable</option>}
                                {stateOptions}
                              </select>
                              <p id="state-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          {/*------------- STATE ENDS ------------*/}

                          {/*------------- CITY BEGINS -----------*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="city">City</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtd}>
                              <input
                                autoComplete="off"
                                className={styles.reginput}
                                id="city"
                                maxLength="35"
                                name="city"
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                // onFocus={(e) => checkValidAltPhone(e)} // Check alt phone entry
                                onBlur={(e) => checkCity(e)}
                                // role="presentation"
                                required
                                type="text"
                                aria-describedby="alt-phone-error"
                                // aria-invalid="true"
                              />
                              <p id="city-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          {/*------------- CITY ENDS -----------*/}

                          {/*--- NATURE OF DISABILITY BEGINS ---*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="disability">Disability</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.dropdowndiv}>
                              <select
                                // aria-label="Nature of disability"
                                className={styles.txtboxdropdown}
                                id="disability"
                                name="disability"
                                onChange={(e) => setSelectedDisability(e.target.value)}
                                onBlur={() => {
                                  // Use setTimeout to avoid blocking keyboard events
                                  setTimeout(() => {
                                    checkDisability();
                                  }, 0);
                                }}
                                radius="none"
                                required
                                value={selectedDisability}
                                aria-describedby="disability-error"
                                aria-invalid="true"
                              >
                                <option value="Visually Impaired">Visually Impaired</option>
                                <option value="VI With Other Disability">VI With Other Disability</option>
                                <option value="Other Disability">Other Disability</option>
                                <option value="Non-disabled">Non-disabled</option>
                              </select>
                              <p id="disability-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          {/*---- NATURE OF DISABILITY ENDS ----*/}

                          {/*---------- EDUCATION BEGINS -------*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="edu_qualifications">Education</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.dropdowndiv}>
                              <select
                                // aria-label="Education attained"
                                className={styles.txtboxdropdown}
                                id="edu_qualifications"
                                name="edu_qualifications"
                                onChange={(e) => setSelectedEdu(e.target.value)}
                                radius="none"
                                required
                                value={selectedEdu}
                              >
                                <option value="Below 10th Standard">Below 10th Standard</option>
                                <option value="10th Standard">10th Standard</option>
                                <option value="12th Standard">12th Standard</option>
                                <option value="Diploma">Diploma</option>
                                <option value="ITI">ITI</option>
                                <option value="Undergraduate">Undergraduate</option>
                                <option value="Graduate">Graduate</option>
                                <option value="Post-Graduate">Post-Graduate</option>
                                <option value="Professional Degree">Professional Degree</option>
                                <option value="Other">Other (Specify Below)</option>
                              </select>
                            </td>
                          </tr>
                          {/*---------- EDUCATION ENDS --------*/}

                          {/*---- EDUCATION DETAILS BEGINS ----*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="edu_details">Education Details</label>
                            </td>
                            <td className={styles.inputtd}>
                              <input
                                autoComplete="off"
                                // class="bg-content-content1 bg-white focus:border-4 focus:border-blue-600 ps-1"
                                className={styles.reginput}
                                id="edu_details"
                                name="edu_details"
                                type="text"
                                // role="presentation"
                                onBlur={(e) => checkEducation(e)}
                                aria-describedby="education-error"
                                // aria-invalid="true"
                              />
                              <p id="education-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          {/*---- EDUCATION DETAILS ENDS ----*/}

                          {/*------- JOB STATUS BEGINS ------*/}
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="employment_status">Job Status </label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtd}>
                              <select
                                autoComplete="off"
                                className={styles.txtboxdropdown}
                                id="employment_status"
                                name="employment_status"
                                onChange={(e) => setSelectedEmpStatus(e.target.value)}
                                defaultValue="Unemployed"
                              >
                                <optgroup label="EmpStatus">
                                  <option value="Employed">Employed</option>
                                  <option value="Unemployed">Unemployed</option>
                                  <option value="Student">Student</option>
                                </optgroup>
                              </select>
                            </td>
                          </tr>
                          {/*------- JOB STATUS ENDS ------*/}
                        </tbody>
                      </table>
                    </fieldset>
                  </div>
                  {/*---------- CARD: TRAINEE/TRAINER ENDS --------*/}

                  {/*------------- CARD: COURSES BEGINS -----------*/}
                  <div className={styles.card}>
                    {/* <h2 tabindex="0">
                    Learning
                  </h2> */}
                    {/*-------------- Vision Details -----------*/}
                    <fieldset className={styles.sregfieldsetmedical} aria-labelledby="vd-legend">
                      <legend id="vd-legend" className={styles.sregfslegendmedical}>
                        Vision Details
                      </legend>

                      <table
                        className={styles.tblmisc} // role="presentation"
                      >
                        <tbody>
                          <tr className={styles.regrow}>
                            <td className={`${styles["inputlabel"]} ${styles["inputlabelmisc"]}`}>
                              <label htmlFor="visual_acuity">Visual Acuity</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>

                            {/*-------------- VISION DROPDOWN BEGINS ------------*/}
                            <td className={styles.inputtd}>
                              <select
                                onFocus={() => checkDropdown()}
                                name="visual_acuity"
                                id="visual_acuity"
                                className={styles.txtboxdropdown}
                                onChange={(e) => setSelectedVision(e.target.value)}
                                // role="presentation"
                                autoComplete="off"
                                required
                              >
                                <option value="Blind">Blind</option>
                                <option value="LowVision">Low Vision</option>
                                <option value="Sighted">Sighted</option>
                              </select>
                            </td>
                            {/*--------------- VISION DROPDOWN ENDS ---------------*/}
                          </tr>

                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="percent_loss">Percentage of Vision Loss</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtd}>
                              <input
                                onFocus={() => checkDropdown()}
                                className={styles.reginput}
                                id="percent_loss"
                                name="percent_loss"
                                onBlur={(e) => checkVisionLoss(e)}
                                onChange={(e) => setSelectedPercentVision(e.target.value)}
                                placeholder="40-100"
                                type="number"
                                autoComplete="off"
                                value={selectedPercentVision}
                                required
                                aria-describedby="percent-error"
                              />
                              <p id="percent-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="impairment_history">
                                Vision Impairment History (brief; feel free to leave it empty)
                              </label>
                            </td>
                            <td className={styles.inputtd}>
                              <textarea
                                name="impairment_history"
                                id="impairment_history"
                                maxLength={200}
                                placeholder="200-char max"
                                className={styles.regtextareaimpair}
                                rows="10"
                                cols="20"
                                type="text"
                                onKeyDown={(e) => textAreaHandleEnter(e)}
                                // role="presentation"
                                autoComplete="off"
                              ></textarea>
                            </td>
                          </tr>
                          {/* <tr className={styles.regrow}>
                        <td className={styles.inputlabel}>
                          <label htmlFor="source">
                            How you found us
                          </label>
                        </td>
                        <td className={styles.inputtd}>
                          <input
                            className={styles.reginput}
                            id="source"
                            maxLength={50}
                            name="source"
                            placeholder="E.g., internet, 50-char. max."
                            ref={refSource}
                            type="textbox"
                            role="presentation" autoComplete="off"
                          />
                        </td>
                      </tr> */}
                        </tbody>
                      </table>
                    </fieldset>

                    {/*-------------- Course choices -------------*/}
                    <fieldset className={styles.sregfieldsetcourses} aria-labelledby="cp-legend">
                      <legend id="cp-legend" className={styles.sregfslegend}>
                        Course Priorities
                      </legend>

                      <div className={styles.coursedetailsRow}>
                        <button
                          type="button"
                          className={styles.detailsButton}
                          aria-label={
                            "Course Details button. Clicking will open a new tab, to return, press control, shift and tab ."
                          }
                          onClick={() => window.open("https://visionaid.dreamhosters.com/coursedetails.htm")}
                        >
                          Course Details
                        </button>
                      </div>
                      <table
                        className={styles.tblchoosecourses} // role="presentation"
                      >
                        <tbody>
                          {/*----------- 1st choice ----------*/}
                          <tr>
                            <td className={styles.tdlblcrschoice}>
                              <label htmlFor="first_choice">1st Choice</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtd}>
                              <select
                                name="first_choice"
                                id="first_choice"
                                className={styles.reginput}
                                onChange={(e) => updateChoices(e)}
                                onBlur={(e) => checkClass(e)}
                                ref={refFirstChoice}
                                // role="presentation"
                                autoComplete="off"
                                required
                                aria-describedby="class-error"
                                // aria-invalid="true"
                              >
                                <option></option>
                                {courseOptions1}
                                {/* <option selected="selected">Select First Choice</option> */}
                              </select>
                              <br />
                              <p id="class-error" role="alert" style={{ color: "red", padding: "3px" }}></p>
                              {getSummaries(Option1)}
                            </td>
                          </tr>

                          {/*----------- 2nd choice ----------*/}
                          <tr>
                            <td className={styles.tdlblcrschoice}>
                              <label htmlFor="second_choice">2nd Choice</label>
                              {/* <span className={styles.requiredelement}>&#42;</span> */}
                            </td>
                            <td className={styles.inputtd}>
                              <select
                                name="second_choice"
                                id="second_choice"
                                className={styles.reginput}
                                onChange={(e) => updateChoices(e)}
                                // role="presentation"
                                autoComplete="off"
                              >
                                <option></option>
                                {courseOptions2}
                                {/* <option selected="selected">Select Second Choice</option> */}
                              </select>
                              <br />
                              <p style={{ padding: "3px" }}></p>
                              {getSummaries(Option2)}
                            </td>
                          </tr>

                          {/*----------- 3rd choice ----------*/}
                          <tr>
                            <td className={styles.tdlblcrschoice}>
                              <label htmlFor="third_choice">3rd Choice</label>
                            </td>
                            <td className={styles.inputtd}>
                              {/* Before alert box course summaries */}
                              {/* <select name="third_choice" id="third_choice" className={styles.reginput} role="presentation" autoComplete="off" required> */}

                              <select
                                name="third_choice"
                                id="third_choice"
                                className={styles.reginput}
                                onChange={(e) => updateChoices(e)}
                                // role="presentation"
                                autoComplete="off"
                              >
                                <option></option>
                                {courseOptions3}
                                {/* <option selected="selected">Select Third Choice</option> */}
                              </select>
                              <br />
                              <p style={{ padding: "3px" }}></p>
                              {getSummaries(Option3)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </fieldset>

                    {/*--- Warning re: registering more than one time ---*/}
                    {/* <fieldset className={styles.fdsetlearning}>
                      <legend style={{ fontWeight: '700', color: 'red' }}>ATTENTION</legend>
                      <table className={styles.tblchoosecourses} role="presentation">
                        <tr className={styles.regrow}>
                          <td className={styles.tdlblcrschoice}>
                          </td>
                          <td className={styles.inputtd} style={{ fontWeight: '700' }}>
                            If you register more than one time, only your most recent registration will be retained.
                          </td>
                        </tr>
                      </table>
                    </fieldset> */}
                  </div>
                  {/*------------- CARD: COURSES ENDS ------------*/}

                  {/*------------- CARD: MEDICAL BEGINS ----------*/}
                  <div className={styles.card}>
                    <fieldset className={styles.sregfieldsetlearn}>
                      <legend className={styles.sregfslegend}>Learning Context</legend>
                      <table
                        className={styles.tblchoosecourses}
                        // role="presentation"
                      >
                        <tbody>
                          <tr className={styles.regrow}>
                            <td className={styles.tdlblgoals}>
                              <label htmlFor="objectives">Reason for seeking Training</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtdnarrow}>
                              <select
                                name="objectives"
                                id="objectives"
                                className={styles.reginput}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  document.getElementById("objectives_other").style.display =
                                    value === "Other" ? "table-row" : "none";
                                  // Clear error message on change
                                  const errorField = document.getElementById("objectives-error");
                                  if (errorField) {
                                    errorField.textContent = "";
                                  }
                                }}
                                onBlur={() => checkObjectives()}
                                required
                                aria-required="true"
                                aria-describedby="objectives-error"
                              >
                                <option value="">Select</option>
                                <option value="To learn new skills">To learn new skills</option>
                                <option value="To upskill/reskill">To upskill/reskill</option>
                                <option value="For employment opportunities">For employment opportunities</option>
                                <option value="Other">Other</option>
                              </select>
                              <textarea
                                style={{ display: "none" }}
                                className={styles.regtextareagoals}
                                id="objectives_other"
                                maxLength="100"
                                name="objectives_other"
                                onKeyDown={(e) => textAreaHandleEnter(e)}
                                onBlur={() => checkObjectives()}
                                placeholder="Reasons for seeking training (100-char max)"
                                width="100%"
                                // role="presentation"
                                autoComplete="off"
                                aria-describedby="objectives-error"
                              ></textarea>
                              <p id="objectives-error" role="alert" style={{ color: "red" }}></p>
                            </td>
                          </tr>
                          <tr className={styles.regrow}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="source_type">How Did You Hear About This Program?</label>
                              <span className={styles.requiredelement}>&#42;</span>
                            </td>
                            <td className={styles.inputtd}>
                              <select
                                name="source_type"
                                id="source_type"
                                className={styles.reginput}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  document.getElementById("source_specify_row").style.display =
                                    value === "Vision-Aid staff" || value === "Other" ? "table-row" : "none";
                                  document.getElementById("source_hospital_row").style.display =
                                    value === "Hospital/Doctor/Rehabilitation center" ? "table-row" : "none";
                                  document.getElementById("hospital_specify_row").style.display = "none";
                                }}
                                required
                              >
                                <option value="">Select</option>
                                <option value="Vision-Aid staff">Vision-Aid staff</option>
                                <option value="Whatsapp Group">Whatsapp Group</option>
                                <option value="Friend or Alumni">Friend or Alumni</option>
                                <option value="Word of mouth">Word of mouth</option>
                                <option value="Social Media/ News paper">Social Media/ News paper</option>
                                <option value="Hospital/Doctor/Rehabilitation center">
                                  Hospital/Doctor/Rehabilitation center
                                </option>
                                <option value="School Partners">School Partners</option>
                                <option value="Vision-Aid Website">Vision-Aid Website</option>
                                <option value="Other">Other</option>
                              </select>
                            </td>
                          </tr>

                          <tr id="source_specify_row" className={styles.regrow} style={{ display: "none" }}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="source_specify">Please Specify</label>
                            </td>
                            <td className={styles.inputtd}>
                              <input
                                className={styles.reginput}
                                name="source_specify"
                                id="source_specify"
                                maxLength="100"
                                placeholder="Enter details"
                                type="text"
                              />
                            </td>
                          </tr>

                          <tr id="source_hospital_row" className={styles.regrow} style={{ display: "none" }}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="source_hospital">Which Hospital?</label>
                            </td>
                            <td className={styles.inputtd}>
                              <select
                                name="source_hospital"
                                id="source_hospital"
                                className={styles.reginput}
                                onChange={(e) => {
                                  document.getElementById("hospital_specify_row").style.display =
                                    e.target.value === "Other" ? "table-row" : "none";
                                }}
                              >
                                <option value="">Select</option>
                                <option value="Aravind Eye Hospital">Aravind Eye Hospital</option>
                                <option value="LVPEI">LVPEI</option>
                                <option value="SCEH">SCEH</option>
                                <option value="Sankara Nethralaya">Sankara Nethralaya</option>
                                <option value="Voluntary Health Services">Voluntary Health Services</option>
                                <option value="Other">Other</option>
                              </select>
                            </td>
                          </tr>

                          <tr id="hospital_specify_row" className={styles.regrow} style={{ display: "none" }}>
                            <td className={styles.inputlabel}>
                              <label htmlFor="hospital_other">Please Specify Hospital</label>
                            </td>
                            <td className={styles.inputtd}>
                              <input
                                className={styles.reginput}
                                name="hospital_other"
                                id="hospital_other"
                                maxLength="100"
                                placeholder="Enter hospital name"
                                type="text"
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </fieldset>

                    {/* RESET AND SUBMIT BUTTONS
                  NOTE: Backticks, not vertical single quotes, are required below */}
                    <div className={styles.frmbtnblocksubres}>
                      <button
                        type="submit"
                        className={`${styles.btnsubmit} ${styles.btngetsfocus}`}
                        onClick={(e) => {
                          checkDropdown();
                          checkSecondCourseChoice();
                          checkThirdCourseChoice();
                          checkAll(e);
                          toastError();
                        }}
                      >
                        SUBMIT
                      </button>
                      <button
                        type="reset"
                        className={`${styles.btnreset} ${styles.btngetsfocus}`}
                        onClick={(e) => {
                          const message = window.isUpdateMode
                            ? "Are you sure you want to exit update mode? This will clear all fields."
                            : "Are you sure you want to reset the form?";

                          const flag = confirm(message);
                          if (!flag) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }

                          // Reset form and clear all fields
                          setOption1("");
                          setOption2("");
                          setOption3("");
                          setSelectedState("");
                          setSelectedCity("");
                          document.getElementById("studentRegForm").reset();

                          // If in update mode, reset the update-specific items
                          if (window.isUpdateMode) {
                            window.isUpdateMode = false;
                            const submitButton = document.querySelector('button[type="submit"]');
                            if (submitButton) {
                              submitButton.textContent = "SUBMIT";
                              submitButton.classList.remove(styles.btnupdate);
                            }
                          }

                          document.getElementById("name").focus();
                        }}
                      >
                        RESET
                      </button>
                    </div>
                  </div>
                  {/*--------- CARD: MEDICAL ENDS --------*/}
                </div>{" "}
                {/* GRID LAYOUT ENDS */}
              </form>
            </div>
          )}
        </main>

        <footer className={styles.footernewreg}>
          <Link href="privacypolicy.html" target="_blank" rel="noopener noreferrer">
            Privacy
          </Link>
          &nbsp;|&nbsp;
          <Link href="termsofservice.html" target="_blank" rel="noopener noreferrer">
            Terms
          </Link>
          &nbsp;|&nbsp;
          <a
            href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.logo}>
              Powered by <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
            </span>
          </a>
        </footer>
      </div>{" "}
      {/* Container closing tag */}
      {/* Confirm Modal */}
      {isClient && showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
            ref={modalRef}
          >
            <button
              className={styles.closeModalBtn}
              onClick={() => {
                setShowConfirmModal(false);
                // Check if user has access to students page
                const allowedRoles = ["ADMINISTRATOR", "MANAGEMENT", "TELECALLER", "TRAINERPLUSTELECALLER"];
                if (userRole && allowedRoles.includes(userRole)) {
                  Router.push("/students");
                } else {
                  Router.push("/");
                }
              }}
              aria-label="Close"
            >
              ×
            </button>

            <h3 id="success-title">{registerSuccessMsg}</h3>

            <div className={styles.modalSummary}>
              <ul>
                {Object.entries(formSummaryData).map(([key, value]) => (
                  <li key={key}>
                    <strong>{labelMap[key] || key}:</strong> {value || "-"}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.modalButtons}>
              <button
                {...createAccessibleButtonProps(() => downloadCSV(formSummaryData))}
                aria-label="Download Details"
              >
                Download Details
              </button>
              <button
                {...createAccessibleButtonProps(() => {
                  setShowConfirmModal(false);
                  // Check if user has access to students page
                  const allowedRoles = ["ADMINISTRATOR", "MANAGEMENT", "TELECALLER", "TRAINERPLUSTELECALLER"];
                  if (userRole && allowedRoles.includes(userRole)) {
                    Router.push("/students");
                  } else {
                    Router.push("/");
                  }
                })}
                aria-label="OK"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Update Student Form */}
      {isClient && showUpdateForm && <UpdateStudentForm onClose={() => setShowUpdateForm(false)} />}
      <GlobalSnackbar open={alertOpen} message={message} setOpen={setAlertOpen} severity={severity} />
    </>
  );
}
