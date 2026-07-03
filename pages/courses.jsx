/*
When host is changed: Change values in
'API SECTIONS' below
In useEffect: ESLint warning was removed using code below, including slashes;
may cause problems if changes are not tested thoroughly
// eslint-disable-next-line react-hooks/exhaustive-deps
*/

import Navbar from "@/components/Navbar";
import styles from "@/styles/Home.module.css";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { getUserEmail } from "@/utils/session-helpers";

import Button from "@/components/Button";
import { exportToCsv } from "@/utils/export-to-csv";

import { AgGridReact } from "ag-grid-react";
import { smartComparator } from "@/utils/grid-comparators";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useCallback, useEffect, useRef, useState } from "react";
import GlobalSnackbar from "../components/GlobalSnackbar";
import ConfirmationModal from "../components/ConfirmationModal";
import { getCoursesColumnDefs } from "../utils/get-courses-column-defs";
import { canAccessConfigurationsPage } from "../utils/configurations-access";
import { toDisplay } from "../utils/types/date";
import PageTitleWithUserGuideLink from "@/components/PageTitleWithUserGuideLink";

export async function getServerSideProps() {
  // Force server-side rendering to prevent static generation issues
  return {
    props: {},
  };
}

export default function Page() {
  // const res = null;
  const { data: session, status } = useSession();

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

  // CHANGE URL below for local testing
  // Note: useState() is the required empty array
  const [dataResponse, setDataResponse] = useState([]);
  const [userResponse, setUserResponse] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const allowedRoles = ["ADMINISTRATOR", "MANAGEMENT"];
  const gridRef = useRef(null);
  const [message, setMessage] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [deleteCourseData, setDeleteCourseData] = useState(null);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [pendingCourseEdit, setPendingCourseEdit] = useState(null);
  const isRevertingRef = useRef(false);

  const [loading, setLoading] = useState(true);

  const dateColumns = ["age", "registration_date"];

  const cellRenderer = (params) => {
    const { colDef, data } = params;
    const value = dateColumns.includes(colDef.field) ? (params.value ? toDisplay(params.value) : "") : params.value;
    const fieldName = colDef.headerName ?? colDef.field;
    const rowLabel = data?.course ?? data?.name ?? "";
    const cellInnerStyle =
      colDef.field === "course"
        ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, display: "block" }
        : colDef.field === "description"
          ? { whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "break-word", display: "block" }
          : undefined;
    return (
      <div role="gridcell" style={cellInnerStyle} aria-label={`${rowLabel}'s ${fieldName}: ${value}`}>
        {value}
      </div>
    );
  };

  const handleEditConfirmClose = () => {
    if (pendingCourseEdit) {
      try {
        isRevertingRef.current = true;
        pendingCourseEdit.node.setDataValue(pendingCourseEdit.colDef.field, pendingCourseEdit.oldValue);
      } catch (err) {
        console.warn("Could not revert course cell:", err);
        isRevertingRef.current = false;
      }
    }
    setPendingCourseEdit(null);
    setEditConfirmOpen(false);
  };

  const handleEditConfirmSuccess = async () => {
    if (!pendingCourseEdit) {
      setEditConfirmOpen(false);
      return;
    }
    const cellParams = pendingCourseEdit;
    const { id, course, description, duration, duration_type } = cellParams.data;
    setPendingCourseEdit(null);
    setEditConfirmOpen(false);
    setContentLoading(true);
    try {
      const response = await fetch("/api/updatecourse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, course, description, duration, duration_type }),
      });
      if (response.ok) {
        await getPageData();
        setMessage(`${cellParams.data.course} was updated!`);
        setSnackbarSeverity("success");
        setAlertOpen(true);
      } else {
        setMessage("Error updating the course.");
        setSnackbarSeverity("error");
        setAlertOpen(true);
        isRevertingRef.current = true;
        cellParams.node.setDataValue(cellParams.colDef.field, cellParams.oldValue);
      }
    } catch (err) {
      console.error("Error updating course:", err);
      setMessage("Error updating the course.");
      setSnackbarSeverity("error");
      setAlertOpen(true);
      isRevertingRef.current = true;
      cellParams.node.setDataValue(cellParams.colDef.field, cellParams.oldValue);
    }
    setContentLoading(false);
  };

  const onGridReady = useCallback(() => {
    // Data is already loaded by getPageData, avoid duplicate API call
    if (dataResponse && dataResponse.length > 0) {
      setRowData(dataResponse);
      setLoading(false);
      return;
    }
    // Fallback: if data wasn't loaded, fetch it
    fetch(`/api/getcoursesdata?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setRowData(data.courses);
        setDataResponse(data.courses);
        setLoading(false);
      });
  }, [dataResponse]);

  const getPageData = useCallback(async () => {
    if (typeof window === "undefined") return; // Skip on server side

    setContentLoading(true);

    const apiUrlEndpoint = `/api/getcoursesdata?t=${Date.now()}`;

    const response = await fetch(apiUrlEndpoint, { cache: "no-store" });
    const res = await response.json();
    setDataResponse(res.courses);
    setRowData(res.courses);
    setContentLoading(false);
  }, []);

  const handleDeleteCourse = useCallback(
    async (course) => {
      const courseId = course?.id;
      const courseName = course?.course || course?.name || "Course";
      if (!courseId) return;

      const targetId = String(courseId);
      setRowData((prev) => (prev ? prev.filter((row) => String(row.id) !== targetId) : prev));
      setDataResponse((prev) => (prev ? prev.filter((row) => String(row.id) !== targetId) : prev));

      setContentLoading(true);
      try {
        const response = await fetch("/api/deletecourse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: courseId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to delete course");
        }

        setMessage(`${courseName} was deleted.`);
        setSnackbarSeverity("success");
        setAlertOpen(true);
        await getPageData();
      } catch (error) {
        console.error("Error deleting the courses", error);
        setMessage(`Failed to delete ${courseName}. Please try again.`);
        setSnackbarSeverity("error");
        setAlertOpen(true);
        await getPageData();
      } finally {
        setContentLoading(false);
      }
    },
    [getPageData]
  );

  const handleDelete = useCallback((props) => {
    setDeleteCourseData(props.data);
    setConfirmTitle(`Delete ${props.data?.course || props.data?.name || "this course"}`);
    setConfirmOpen(true);
  }, []);

  const handleDeleteConfirmClose = useCallback(() => {
    setConfirmOpen(false);
    setDeleteCourseData(null);
  }, []);

  const handleDeleteConfirmSuccess = useCallback(() => {
    if (deleteCourseData) {
      setConfirmOpen(false);
      handleDeleteCourse(deleteCourseData);
      setDeleteCourseData(null);
    }
  }, [deleteCourseData, handleDeleteCourse]);

  /** All editable columns (name, description, duration, duration type) confirm one cell at a time. */
  const onCourseCellChange = useCallback((params) => {
    if (isRevertingRef.current) {
      isRevertingRef.current = false;
      return;
    }
    if (params.oldValue === params.newValue) return;
    setPendingCourseEdit(params);
    setEditConfirmOpen(true);
  }, []);

  /* ---------------------------------- API SECTION -----------------------------------*/
  /* NOTE: NEXT_PUBLIC_ is required at the beginning of any browser-dependent env vars */

  var result;

  /* ---------------------------------- API SECTION -----------------------------------*/
  const handleCreateCourse = useCallback(
    async (event) => {
      event.preventDefault();
      const form = event.target;
      const formData = new FormData(form);
      const payload = {
        course: formData.get("course")?.trim(),
        description: formData.get("description")?.trim(),
        duration: formData.get("duration")?.trim(),
        duration_type: formData.get("duration_type"),
      };

      if (!payload.course || !payload.duration || !payload.duration_type) {
        setMessage("Please fill all required fields before submitting.");
        setSnackbarSeverity("error");
        setAlertOpen(true);
        return;
      }

      setContentLoading(true);
      try {
        const response = await fetch("/api/coursecreate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to create course");
        }

        await getPageData();
        setMessage(`${payload.course} was created successfully!`);
        setSnackbarSeverity("success");
        setAlertOpen(true);
        form.reset();
        setShowForm(false);
      } catch (error) {
        console.error("Error creating course", error);
        setMessage("Failed to create course. Please try again.");
        setSnackbarSeverity("error");
        setAlertOpen(true);
      } finally {
        setContentLoading(false);
      }
    },
    [getPageData]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!session?.user?.email) return;

    (async () => {
      try {
        // Parallel API calls for better performance
        const [userRes, coursesRes] = await Promise.all([
          fetch("/api/getuserdata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: getUserEmail(session) }),
          }),
          fetch(`/api/getcoursesdata?t=${Date.now()}`, { cache: "no-store" }),
        ]);

        const [userData, coursesData] = await Promise.all([userRes.json(), coursesRes.json()]);

        setUserResponse(userData.users[0]);
        setDataResponse(coursesData.courses);
        setRowData(coursesData.courses);
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    })();
    // NOTE: Line below (to remove ESLint warning) may cause problems; test thoroughly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  result = userResponse;

  if (status === "unauthenticated") {
    return (
      <div className="autherrorcontainer">
        <Image alt={"VisionAid logo"} src={"/images/logo-mainsite.png?v=20251004"} height={100} width={150} />
        <span className="autherrortext">
          Access denied.&nbsp;
          <Link href="/" className="autherrorlink">
            Please sign in.
          </Link>
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.overlay}>
        <span className={styles.customLoader}></span>
      </div>
    );
  }

  if (status === "authenticated") {
    if (allowedRoles.includes(result.role)) {
      return (
        <>
          <div className={styles.mynavbar}>
            <a href="#maincontent" className="skip" onClick={() => document.getElementById("maincontent")?.focus()}>
              Skip to main content
            </a>
            <Navbar user_role={result.role} className={styles.navstudents} />
          </div>
          <Head>
            <title>Courses - Vision-Aid-STATS</title>
            <meta
              name="description"
              content="A nonprofit, advocating on behalf of persons with vision issues of any type"
            />
          </Head>
          <main
            className={`mx-auto flex flex-col`}
            id="maincontent"
            tabIndex={-1}
            style={{ paddingLeft: "1rem", paddingRight: "1rem" }}
          >
            {contentLoading ? (
              <div className={styles.overlay}>
                <span className={styles.customLoader}></span>
              </div>
            ) : (
              <></>
            )}
            <div className="flex w-full items-center justify-between">
              <PageTitleWithUserGuideLink section_title="Course Management" />

              {/* ---------- CSV Download button ---------------- */}
              {/* <Link className={styles.csvbutton} href={"https://visionaid.dreamhosters.com/csv/courses.php"} legacyBehavior>
                  <a target="_blank" className={styles.csvbutton}><i className="fa fa-download"></i> View/Download Courses</a>
                </Link> */}
              <button
                className={styles.coursesButton}
                {...createAccessibleButtonProps(() => exportToCsv("visionaidcourses.csv", dataResponse))}
              >
                Export to CSV
              </button>
            </div>

            <div className={styles.gridcourses}>
              <GlobalSnackbar open={alertOpen} message={message} setOpen={setAlertOpen} severity={snackbarSeverity} />
              <ConfirmationModal
                open={confirmOpen}
                handleClose={handleDeleteConfirmClose}
                handleConfirm={handleDeleteConfirmSuccess}
                confirmColor="error"
                title={confirmTitle}
                message="Are you sure you want to delete this course? This action cannot be undone."
              />
              <ConfirmationModal
                open={editConfirmOpen}
                handleClose={handleEditConfirmClose}
                handleConfirm={handleEditConfirmSuccess}
                confirmColor="primary"
                title="Confirm change"
                message={
                  pendingCourseEdit
                    ? `Do you want to save this change?\n\n${pendingCourseEdit.colDef?.headerName ?? pendingCourseEdit.colDef?.field}: "${pendingCourseEdit.oldValue ?? ""}" → "${pendingCourseEdit.newValue ?? ""}"`
                    : "Do you want to save?"
                }
              />
              {result.role === "ADMINISTRATOR" ? (
                <>
                  {showForm ? (
                    <div className={styles.cardcoursesform}>
                      <div className={styles.addstaffformHeader}>
                        <h2 className={styles.addnewcoursetitle}>
                          Create Course
                          <Image
                            alt={"close course form"}
                            src={"/icons/expand-up.svg"}
                            height={30}
                            width={30}
                            onClick={() => setShowForm(false)}
                            className={styles.collapseButtonCourse}
                            title="Close Course Form"
                          />
                        </h2>
                      </div>
                      <form className={styles.cardcoursesformcontents} onSubmit={handleCreateCourse}>
                        <div className={styles.coursesformrow}>
                          <label className={styles.coursesformlabel} htmlFor="course">
                            Name
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <input
                            className={styles.coursesforminput}
                            type="text"
                            id="course"
                            name="course"
                            required
                            aria-required="true"
                          />
                        </div>

                        <div className={styles.coursesformrow}>
                          <label className={styles.coursesformlabelunrequired} htmlFor="description">
                            Description
                          </label>
                          <input className={styles.coursesforminput} type="text" id="description" name="description" />
                        </div>

                        <div className={styles.coursesformrow}>
                          <label className={styles.coursesformlabel} htmlFor="duration">
                            Duration
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <select
                            className={styles.coursesforminput}
                            id="duration"
                            name="duration"
                            required
                            aria-required="true"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Select duration
                            </option>
                            {Array.from({ length: 20 }, (_, index) => {
                              const value = String(index + 1);
                              return (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className={styles.coursesformrow}>
                          <label className={styles.coursesformlabel} htmlFor="duration_type">
                            Duration Type
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <fieldset className={styles.coursesformfieldset}>
                            <legend>Time period</legend>

                            <input
                              className={styles.coursesformradiobtn}
                              type="radio"
                              id="days"
                              name="duration_type"
                              value="Days"
                              required
                            />
                            <label htmlFor="days">Days</label>

                            <input
                              className={styles.coursesformradiobtn}
                              type="radio"
                              id="weeks"
                              name="duration_type"
                              value="Weeks"
                            />
                            <label htmlFor="weeks">Weeks</label>

                            <input
                              className={styles.coursesformradiobtn}
                              type="radio"
                              id="months"
                              name="duration_type"
                              value="Months"
                            />
                            <label htmlFor="months">Months</label>
                          </fieldset>
                        </div>

                        <div className={styles.coursesformbuttonsrow}>
                          <div className={styles.coursesformbuttons}>
                            <input className={styles.coursesresetbtn} type="reset" value="Reset"></input>
                            &nbsp;&nbsp;
                            <button className={styles.coursessubmitbtn} type="submit">
                              Submit
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <Button
                      {...createAccessibleButtonProps(() => setShowForm(true))}
                      text={"+ New Course Form"}
                    ></Button>
                  )}
                </>
              ) : (
                <></>
              )}
              {!showForm && (
                <div className="ag-theme-alpine" style={{ height: "80dvh", width: "100%" }}>
                  <AgGridReact
                    enableCellTextSelection={true}
                    ref={gridRef}
                    autoSizeStrategy={{ type: "fitGridWidth" }}
                    columnDefs={getCoursesColumnDefs(handleDelete, onCourseCellChange, {
                      showBatchStatusRulesLink: canAccessConfigurationsPage(result.role),
                      batchStatusRulesLinkClassName: styles.batchStatusRulesLink,
                    })}
                    defaultColDef={{
                      comparator: smartComparator,
                      filter: true,
                      resizable: true,
                      editable: true,
                      wrapText: false,
                      cellRenderer,
                      cellClass: (params) => (params.colDef.editable === true ? styles.gridCellEditable : undefined),
                      sortable: true,
                      suppressKeyboardEvent: (params) => {
                        const { event, editing } = params;

                        // when Space is pressed, prevent default scroll behavior
                        if (event.key === " " && !editing) {
                          event.preventDefault();
                          return true;
                        }

                        return false;
                      },
                    }}
                    singleClickEdit={true}
                    stopEditingWhenCellsLoseFocus={true}
                    ensureDomOrder={true}
                    loading={loading}
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
                    defaultSort={{
                      sort: "asc",
                      colId: "course",
                    }}
                  />
                </div>
              )}
            </div>

            {/* <footer className={styles.footer}>
                <Link
                  href='privacypolicy.html'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Privacy
                </Link>&nbsp;|&nbsp;
                <Link
                  href='termsofservice.html'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Terms
                </Link>&nbsp;|&nbsp;
                <a
                  href='https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <span className={styles.logo}>
                    Powered by{"' '"}
                    <Image src='/vercel.svg'
                      alt='Vercel Logo'
                      width={72}
                      height={16} />
                  </span>
                </a>
              </footer> */}
          </main>

          <style jsx global>{`
            .${styles.mainstudents} h1 {
              margin-top: 0 !important;
            }
          `}</style>
        </>
      );
    } else {
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
}
