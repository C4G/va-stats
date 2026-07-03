import styles from "../styles/StudentReg.module.css";
import Navbar from "../components/Navbar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import GlobalSnackbar from "@/components/GlobalSnackbar";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { useGetStudentColumnDefs } from "../utils/students/use-get-student-column-defs-bulk";
import { smartComparator } from "@/utils/grid-comparators";
import { getRowStyle } from "@/utils/get-row-style";
import Image from "next/image";
import Link from "next/link";
import tableStyles from "../styles/Table.module.css";
import PageTitleWithUserGuideLink from "@/components/PageTitleWithUserGuideLink";

// Adds a Navbar to the page
function IncludeNavbar({ userRole, status }) {
  return (
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
  );
}

// Adds a content loading spinner to the page if the content is still loading
function IncludeContentLoadingSpinner({ contentLoading }) {
  return (
    <>
      {contentLoading ? (
        <div className={styles.overlay}>
          <span className={styles.customLoader}></span>
        </div>
      ) : (
        <></>
      )}
    </>
  );
}

function CircleLoadingOverlay() {
  return (
    <div className={styles.overlay}>
      <span className={styles.customLoader}></span>
    </div>
  );
}

function IncludeFooter({}) {
  return (
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
  );
}

export default function Page() {
  const [userRole, setUserRole] = useState(null);
  const [contentLoading] = useState(false);
  const { data: session, status } = useSession();
  const [alertOpen, setAlertOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [user] = useState();
  const gridRef = useRef(null);
  const [rowData, setRowData] = useState([]);
  const [severity, setSeverity] = useState("success"); // Default severity for snackbar
  const [numberOfValidRows, setNumberOfValidRows] = useState(0);
  const allowedRoles = ["ADMINISTRATOR", "MANAGEMENT", "STAFF"];

  // keep track of unique ids for the rows in the grid
  // prevents duplicate ids when adding and deleting rows
  const uniqueIdCounter = useRef(1);

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
          console.error("[bulkstudentregistration] getuserdata failed:", res.status);
          return;
        }
        const data = await res.json();
        setUserRole(data?.users?.[0]?.role ?? null);
      } catch (e) {
        console.error("[bulkstudentregistration] getuserdata error:", e);
      }
    })();
  }, [status, session]);

  const handleDelete = (props) => {
    console.log("Delete action triggered for student ID:", props.data.id);
    setRowData((prevRowData) => prevRowData.filter((row) => row.id !== props.data.id));
  };

  const cellRenderer = (params) => {
    const { colDef, data } = params;
    const value = params.value ?? "";
    const fieldName = colDef.headerName ?? colDef.field;
    const personName = data.name;
    return (
      <div role="gridcell" aria-label={`${personName}'s ${fieldName}: ${value}`}>
        {value}
      </div>
    );
  };

  const onGridReady = useCallback(() => {
    console.log("Grid is ready");
  }, []);

  const columnDefs = useGetStudentColumnDefs(handleDelete, user?.role);
  // console.log("Column definitions:", columnDefs);

  // error checking functions for required fields
  const checkNameErrors = (row) => {
    const errors = [];
    if (!row.name || row.name.trim() === "") {
      errors.push({ row: row.id, field: "name", message: "Name is required. Please enter the student's full name." });
    }
    return errors;
  };

  const checkGenderErrors = (row) => {
    const errors = [];
    if (!row.gender || row.gender.trim() === "") {
      errors.push({ row: row.id, field: "gender", message: "Gender is required. Please select the student's gender." });
    }
    return errors;
  };

  const checkAgeErrors = (row) => {
    const errors = [];
    if (!row.age || row.age.trim() === "") {
      errors.push({
        row: row.id,
        field: "age",
        message: "Date of Birth is required. Note that the student must be at least 14 years old.",
      });
    } else {
      const dob = new Date(row.age);
      const today = new Date();
      const minAge = 14;
      const minDOB = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());

      // error if date of birth is in the future
      if (dob > today) {
        errors.push({ row: row.id, field: "age", message: "Date of Birth cannot be in the future." });
      }
      // error if age < 14 years old
      if (dob > minDOB) {
        errors.push({ row: row.id, field: "age", message: `Student must be at least ${minAge} years old.` });
      }
    }
    return errors;
  };

  const checkPhoneNumberErrors = (row) => {
    const errors = [];
    if (!row.phone_number || row.phone_number.trim() === "") {
      errors.push({
        row: row.id,
        field: "phone_number",
        message: "Phone number is required and must be 10 digits long.",
      });
    } else {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(row.phone_number.trim())) {
        errors.push({ row: row.id, field: "phone_number", message: "Phone number must be 10 digits." });
      }
    }
    return errors;
  };

  const checkCountryErrors = (row) => {
    const errors = [];
    if (!row.country || row.country.trim() === "") {
      errors.push({
        row: row.id,
        field: "country",
        message: "Country is required. Please select the country of residence.",
      });
    }
    return errors;
  };

  const checkStateErrors = (row) => {
    const errors = [];
    if (!row.state || row.state.trim() === "") {
      errors.push({ row: row.id, field: "state", message: "State is required. Please select the state of residence." });
    }
    return errors;
  };

  const checkCityErrors = (row) => {
    const errors = [];
    if (!row.city || row.city.trim() === "") {
      errors.push({ row: row.id, field: "city", message: "City is required. Please enter the city of residence." });
    }
    return errors;
  };

  const checkDisabilityErrors = (row) => {
    const errors = [];
    if (!row.disability || row.disability.trim() === "") {
      errors.push({
        row: row.id,
        field: "disability",
        message: "Nature of Disability is required. Please select the nature of the student's disability.",
      });
    }
    return errors;
  };

  const checkEducationErrors = (row) => {
    const errors = [];
    if (!row.edu_qualifications || row.edu_qualifications.trim() === "") {
      errors.push({
        row: row.id,
        field: "edu_qualifications",
        message: "Education is required. Please select the student's highest educational qualification.",
      });
    }
    return errors;
  };

  const checkEmploymentStatusErrors = (row) => {
    const errors = [];
    if (!row.employment_status || row.employment_status.trim() === "") {
      errors.push({
        row: row.id,
        field: "employment_status",
        message: "Job Status is required. Please select the student's current employment status.",
      });
    }
    return errors;
  };

  const checkVisualAcuityErrors = (row) => {
    const errors = [];
    if (!row.visual_acuity || row.visual_acuity.trim() === "") {
      errors.push({
        row: row.id,
        field: "visual_acuity",
        message: "Visual Acuity is required. Please select the student's visual acuity level.",
      });
    }
    return errors;
  };

  const checkPercentLossErrors = (row) => {
    const errors = [];
    if (!row.percent_loss || row.percent_loss.trim() === "") {
      errors.push({
        row: row.id,
        field: "percent_loss",
        message: "Percent Loss of Vision is required. Please enter the percentage of vision loss.",
      });
    } else {
      // ensure it's between 0 and 100
      const percent = parseFloat(row.percent_loss);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        errors.push({
          row: row.id,
          field: "percent_loss",
          message: "Percent Loss of Vision must be between 0 and 100.",
        });
      }
    }
    return errors;
  };

  const checkFirstChoiceErrors = (row) => {
    const errors = [];
    if (!row.first_choice || row.first_choice.trim() === "") {
      errors.push({
        row: row.id,
        field: "first_choice",
        message: "First Choice is required. Please select the first choice of course for the student.",
      });
    }
    return errors;
  };

  const checkObjectivesErrors = (row) => {
    const errors = [];
    if (!row.objectives || row.objectives.trim() === "") {
      errors.push({
        row: row.id,
        field: "objectives",
        message: "Learning Objectives are required. Please select the learning objectives for the student.",
      });
    }
    return errors;
  };

  const checkSourceErrors = (row) => {
    const errors = [];
    if (!row.source || row.source.trim() === "") {
      errors.push({
        row: row.id,
        field: "source",
        message: "Referral Source is required. Please select how the student heard about the program.",
      });
    }
    return errors;
  };

  const checkErrorFunctions = {
    name: checkNameErrors,
    gender: checkGenderErrors,
    age: checkAgeErrors,
    phone_number: checkPhoneNumberErrors,
    country: checkCountryErrors,
    state: checkStateErrors,
    city: checkCityErrors,
    disability: checkDisabilityErrors,
    edu_qualifications: checkEducationErrors,
    employment_status: checkEmploymentStatusErrors,
    visual_acuity: checkVisualAcuityErrors,
    percent_loss: checkPercentLossErrors,
    first_choice: checkFirstChoiceErrors,
    objectives: checkObjectivesErrors,
    source: checkSourceErrors,
  };

  const addEmptyRowToGrid = () => {
    setRowData((prevRowData) => [...prevRowData, createEmptyRow()]);
  };

  const generateEmptyErrorsDict = () => {
    // generates an empty errors dict that often becomes the _errors field for each row
    // they keys are the required fields (or fields where we want to check for errors)
    // the values are empty lists that will hold error messages
    const errorsDict = {};
    Object.keys(checkErrorFunctions).forEach((field) => {
      errorsDict[field] = [];
    });
    // add field for database duplicate check errors
    errorsDict["_database_duplicates"] = [];

    return errorsDict;
  };

  const createEmptyRow = () => {
    return {
      // id field for this ag grid only, not related to id in the database
      id: `${uniqueIdCounter.current++}`,
      // data fields for the bulk registration ag grid
      name: "",
      gender: "",
      age: "",
      phone_number: "",
      email: "",
      alt_ph_num: "",
      country: "India", // Note: Requested default - Set default to India since most of the students are from India, but allow changes if needed
      state: "",
      city: "",
      disability: "",
      edu_qualifications: "",
      employment_status: "",
      visual_acuity: "",
      percent_loss: "",
      first_choice: "",
      second_choice: "",
      third_choice: "",
      edu_details: "",
      objectives: "",
      impairment_history: "",
      source: "",
      // internal only fields for validation and styling
      _hasBeenValidated: false,
      _errors: generateEmptyErrorsDict(),
      _hasError: false,
      _changedSinceLastValidation: {},
      _successfullyRegistered: false,
      // row status field for tracking status of the row
      _rowStatus: "unvalidated",
    };
  };

  const checkRequiredFields = (row) => {
    // required fields validation
    let errors = [];

    Object.keys(checkErrorFunctions).forEach((field) => {
      errors.push(...checkErrorFunctions[field](row));
    });

    console.log(`Validation errors for student ${row.id}:`, errors);

    return errors;
  };

  const rowHasError = (row) => {
    // if any field in the _errors object has an error message, then the row has an error
    let hasError = false;
    Object.keys(row._errors).forEach((field) => {
      if (hasError) return;
      else {
        if (row._errors[field].length > 0) hasError = true;
      }
    });
    return hasError;
  };

  const updateRowStatus = () => {
    rowData.forEach((row) => {
      console.log(
        `Updating row status for student ${row.id}. Current status: ${row._rowStatus}, hasError: ${row._hasError}, hasBeenValidated: ${row._hasBeenValidated}, successfullyRegistered: ${row._successfullyRegistered}, database duplicate errors: ${row._errors._database_duplicates.length}`
      );
      if (row._successfullyRegistered) {
        console.log(`Row ${row.id} has been successfully registered in the database and can no longer be edited.`);
        row._rowStatus = "success";
      } else if (row._hasError) {
        if (row._errors._database_duplicates.length > 0) {
          console.log(`Row ${row.id} has database duplicate errors:`, row._errors._database_duplicates);
          row._rowStatus = "duplicate";
        } else {
          console.log(`Row ${row.id} has data errors:`, row._errors);
          row._rowStatus = "error";
        }
      } else if (row._hasBeenValidated) {
        console.log(`Row ${row.id} has been validated and has no errors. It's ready to be registered.`);
        row._rowStatus = "validated";
      } else {
        console.log(`Row ${row.id} has not been validated yet.`);
        row._rowStatus = "unvalidated";
      }
      console.log(`Updated row status for student ${row.id}: ${row._rowStatus}`);
    });
  };

  const checkRowForErrors = (row) => {
    const errors = [...checkRequiredFields(row)];

    console.log("Errors found for row:", row.id, errors);

    row._errors = generateEmptyErrorsDict(); // reset errors before adding current errors

    // add error messages to
    errors.forEach((error) => {
      // add current error message for the field
      row._errors[error.field].push(error.message);
    });

    // if there are any errors, set _hasError to true, otherwise false
    row._hasError = rowHasError(row);

    // update hasBeenValidated flag
    if (row._hasError) {
      row._hasBeenValidated = false;
    } else {
      row._hasBeenValidated = true;
    }

    return [errors, row];
  };

  const checkDuplicatesInDatabase = async (rows) => {
    console.log("Checking for duplicates in database for rows:", rows);
    // check if duplicates exist in the database for these rows
    // update row._errors._database_duplicates with any error messages if duplicates are found
    try {
      const response = await fetch("/api/bulkregcheckstudentduplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.filter((row) => !row._hasError && row._hasBeenValidated) }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("API error response:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      } else {
        const data = await response.json();
        console.log("Duplicate check response data:", data);

        if (data?.rows?.length > 0) {
          const duplicateRows = data.rows;
          const rowIdsWithDuplicates = duplicateRows.map((row) => row.id);

          rows.forEach((row) => {
            if (rowIdsWithDuplicates.includes(row.id)) {
              row._errors._database_duplicates.push("This row appears to exist in the database already.");
              row._hasError = rowHasError(row);
              row._hasBeenValidated = !row._hasError;
            }
          });
        }
      }
    } catch (e) {
      console.error("Error checking duplicates in database:", e);
      setMessage("An error occurred while checking for duplicates in the database. Please try again.");
      setSeverity("error");
      setAlertOpen(true);
    }

    return rows;
  };

  const insertRowsToDatabase = async (rows) => {
    console.log("Inserting rows into database:", rows);

    try {
      const response = await fetch("/api/bulkstudentapplication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.filter((row) => !row._hasError && row._hasBeenValidated) }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("API error response:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      } else {
        const data = await response.json();
        console.log("Bulk insert response data:", data);
        rows.forEach((row) => {
          console.log(`Checking if row ${row.id} was successfully registered. Inserted IDs:`, data.insertedIds);
          if (data.originalRowIds?.includes(row.id)) {
            row._successfullyRegistered = true;
          }
        });
        updateRowStatus();
        setNumberOfValidRows(
          rowData.filter((row) => !row._hasError && row._hasBeenValidated && !row._successfullyRegistered).length
        );
        setMessage(`Successfully registered ${data.insertedCount} students!`);
        setSeverity("success");
        setAlertOpen(true);
      }
    } catch (e) {
      console.error("Error adding records to the database:", e);
      setMessage("An error occurred while adding records to the database. Please try again.");
      setSeverity("error");
      setAlertOpen(true);
    }
  };

  const onValidateRows = async () => {
    console.log("Validating rows with data:", rowData);
    let errors = [];

    // stop editing to make sure all changes are saved before validation
    gridRef.current.api.stopEditing();

    rowData.forEach((row) => {
      console.log(`Student ${row.id}:`, row);

      const [rowErrors, updatedRow] = checkRowForErrors(row);
      console.log(`Errors for student ${row.id}:`, rowErrors);
      console.log(`Updated student data after validation for student ${row.id}:`, updatedRow);
      row = updatedRow;
      errors.push(...rowErrors);

      // reset the cell changed since last validation flags
      row._changedSinceLastValidation = {};
    });

    const numberOfClientSideValidatedRows = rowData.filter((row) => !row._hasError && row._hasBeenValidated).length;

    if (numberOfClientSideValidatedRows > 0) {
      await checkDuplicatesInDatabase(rowData);
      updateRowStatus();

      setNumberOfValidRows(
        rowData.filter((row) => !row._hasError && row._hasBeenValidated && !row._successfullyRegistered).length
      );
    }

    // if there are any errors, show an error message, otherwise show a success message
    if (errors.length > 0) {
      setMessage(
        `Validation failed for ${rowData.map((row) => row._hasError).filter((hasError) => hasError).length} row(s). Please fix them and try again.`
      );
      setSeverity("error");
      setAlertOpen(true);
    } else {
      setMessage("All validations passed. Please click 'Register Valid Rows' to upload to the database.");
      setSeverity("success");
      setAlertOpen(true);
    }
    updateRowStatus();
  };

  const onRegisterStudents = async () => {
    const validRows = rowData.filter((row) => !row._hasError && row._hasBeenValidated);
    console.log("All rows:", rowData);
    console.log("Registering students with data:", validRows);
    const confirm = window.confirm(
      `${validRows.length} ${validRows.length === 1 ? "row is" : "rows are"} valid. \n\nAre you sure you want to register these students? \n\nThis action cannot be undone.`
    );
    if (!confirm) {
      return;
    } else {
      insertRowsToDatabase(validRows);
      updateRowStatus();
    }
  };

  // Whenever a cell is edited, mark it as having been changed since the last
  // validation button click (i.e., Register Students button click)
  // This uses styling in AG Grid to make it easier to identify which cells have
  // been edited recently
  const onCellValueChanged = (params) => {
    const field = params.colDef.field;
    params.data._changedSinceLastValidation = params.data._changedSinceLastValidation || {};
    params.data._changedSinceLastValidation[field] = true;
    params.data._hasBeenValidated = false;

    setNumberOfValidRows(
      rowData.filter((row) => !row._hasError && row._hasBeenValidated && !row._successfullyRegistered).length
    );

    updateRowStatus();

    params.api.refreshCells({ force: true });
  };

  // Authentication
  // if authenticated and has the required role, show the page content
  if (status === "authenticated" && userRole && allowedRoles.includes(userRole.toUpperCase())) {
    return (
      <>
        <IncludeContentLoadingSpinner contentLoading={contentLoading} />
        <IncludeNavbar userRole={userRole} status={status} />
        {/* Main Content Section */}
        <main className={styles.main} id="maincontent" suppressHydrationWarning>
          <div>
            <PageTitleWithUserGuideLink section_title="Bulk Student Registration" />
            {/* Add Empty Row Button */}
            <button
              onClick={() => addEmptyRowToGrid()}
              className={`${styles.btnlight} ${styles.updateButton}`}
              style={{ marginLeft: "0rem", marginTop: "1rem", marginBottom: "0.5rem", marginRight: "2rem" }}
            >
              + Add Row
            </button>
            {/* Validate Rows Button */}
            <button
              onClick={() => onValidateRows()}
              className={`${styles.btnlight} ${styles.checkRowsButton}`}
              style={{ marginLeft: "1rem", marginTop: "1rem", marginBottom: "0.5rem" }}
              disabled={rowData.length === 0}
            >
              Check Rows
            </button>
            {/* Register Students Button */}
            <button
              onClick={() => onRegisterStudents()}
              disabled={
                numberOfValidRows === 0 || rowData.length === 0 || !allowedRoles.includes(userRole?.toUpperCase())
              }
              className={`${styles.btnlight} ${styles.bulkRegisterButton}`}
              style={{ marginLeft: "1rem", marginTop: "1rem", marginBottom: "0.5rem" }}
            >
              Register Valid Rows {numberOfValidRows > 0 ? `(${numberOfValidRows})` : ""}
            </button>
          </div>
          {/* Page Title Styling */}
          <style jsx>{`
            /* default top margin removal */
            .pageTitle {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }
          `}</style>
          <div className={styles.gridcourses}>
            <GlobalSnackbar open={alertOpen} message={message} setOpen={setAlertOpen} severity={severity} />

            {/* AG Grid Container + AG Grid table */}
            <div className="ag-theme-alpine" style={{ height: "60dvh", width: "100%" }}>
              <AgGridReact
                enableCellTextSelection={true}
                ref={gridRef}
                getRowId={(params) => String(params.data?.id ?? params.node?.id)}
                autoSizeStrategy={{ type: "fitCellContents" }}
                columnDefs={columnDefs}
                defaultColDef={{
                  comparator: smartComparator,
                  filter: true,
                  resizable: true,
                  editable: true,
                  wrapText: true,
                  cellRenderer,
                  cellClass: (params) => (params.colDef.editable === true ? styles.gridCellEditable : undefined),
                  cellClassRules: {
                    // Apply error styling to individual cells based on the _errors object in the row data
                    [tableStyles.formCellError]: (params) => {
                      const fieldErrors = params.data?._errors?.[params.colDef.field]?.length || 0;
                      return fieldErrors;
                    },
                    // Apply cell changed since last validation styling based on the _changedSinceLastValidation object in the row data
                    [tableStyles.formCellChangedSinceLastValidation]: (params) => {
                      return (
                        params.data?._changedSinceLastValidation &&
                        params.data._changedSinceLastValidation[params.colDef.field]
                      );
                    },
                  },
                  suppressKeyboardEvent: (params) => {
                    const { event, editing } = params;

                    // Prevent default scroll when Space is pressed
                    if (event.key === " " && !editing) {
                      event.preventDefault();
                      return true;
                    }

                    return false;
                  },
                }}
                stopEditingWhenCellsLoseFocus={true}
                singleClickEdit={true}
                onCellValueChanged={onCellValueChanged}
                ensureDomOrder={true}
                loadingOverlayComponent={CircleLoadingOverlay}
                rowData={rowData}
                onGridReady={onGridReady}
                onCellKeyDown={(params) => {
                  const { event, api, node, column, colDef, editing } = params;

                  // when Space or Enter is pressed, start editing
                  if (!editing && colDef.editable && (event.key === " " || event.key === "Enter")) {
                    api.startEditingCell({
                      rowIndex: node.rowIndex,
                      colKey: column.getColId(),
                    });
                    event.preventDefault();
                  }
                }}
                getRowStyle={getRowStyle}
                getRowClass={(params) => {
                  // Apply success styling to the entire row if the row has been successfully registered in the database
                  if (params.data?._rowStatus === "success") return tableStyles.formRowSuccess;
                  // Apply error styling to the entire row if there are any errors in the row
                  else if (params.data?._hasError) return tableStyles.formRowError;
                  // If any rows are valid, make them clear that they are valid
                  else if (!params.data?._hasError && params.data?._hasBeenValidated) return tableStyles.formRowValid;

                  return "";
                }}
              />
            </div>
          </div>
        </main>
        <IncludeFooter />
      </>
    );
  }
  // Otherwise,
  // If not authenticated, show "not authorized" message
  // If authenticated but doesn't have the required role, also show "not authorized" message
  else {
    return (
      <div className="autherrorcontainer">
        <Image alt={"VisionAid logo"} src={"/images/logo-mainsite.png?v=20251004"} height={100} width={150} />
        <span className="autherrortext">
          Not authorized.&nbsp;
          <Link href="/" className="autherrorlink">
            Please try another account.
          </Link>
        </span>
      </div>
    );
  }
}
