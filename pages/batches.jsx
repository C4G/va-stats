/*
EDITS HERE LIKELY REQUIRE EDITS IN THESE:
./pages/api/batchcreate.js
./pages/api/getbatchesdata.js
./pages/api/updatebatches.js
./pages/batch/[id].jsx:
*/
/*
In useEffect: ESLint warning was removed using code below, including slashes;
may cause problems if changes are not tested thoroughly
// eslint-disable-next-line react-hooks/exhaustive-deps
*/

"use client";
import Navbar from "@/components/Navbar";
import styles from "@/styles/Home.module.css";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
// import React from 'react';
import Button from "@/components/Button";
import { getUserEmail } from "@/utils/session-helpers";
import { useSession } from "next-auth/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { normalizeBatchDates } from "@/utils/date-normalizers";

import { getBatchesColumnDefs, getBatchStatus } from "@/utils/batches/get-batches-columns-defs";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { smartComparator } from "@/utils/grid-comparators";

// FOR MAPPING VALUES to PM and dataentry dropdowns
import DropdownMenuPm from "@/components/DropdownMenuPm";
import DropdownMenuStaff from "@/components/DropdownMenuStaff";
import GlobalSnackbar from "@/components/GlobalSnackbar";
import ConfirmationModal from "@/components/ConfirmationModal";
import { exportToCsv } from "@/utils/export-to-csv";
import PageTitleWithUserGuideLink from "@/components/PageTitleWithUserGuideLink";

export async function getServerSideProps() {
  // Force server-side rendering to prevent static generation issues
  return {
    props: {},
  };
}

export default function Page() {
  // const res = null;
  useForm(); // Form reset
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

  // Note: useState() is the required empty array
  const [dataResponse, setDataResponse] = useState([]);
  const [userResponse, setUserResponse] = useState(null);
  const [, setCourseResponse] = useState(() => []);
  const [courseOptions, setCourseOptions] = useState(() => []);
  const [showForm, setShowForm] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setEditingId] = useState(null);
  const allowedRoles = ["ADMINISTRATOR", "MANAGEMENT", "STAFF", "TRAINER", "TRAINERPLUSTELECALLER"];

  const [rowData, setRowData] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState();
  const [deleteBatchData, setDeleteBatchData] = useState(null);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState(null);
  const gridRef = useRef(null);
  const isRevertingCellRef = useRef(false);
  const lastFocusedCell = useRef(null);
  const editConfirmOpenRef = useRef(false);
  const [message, setMessage] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("NA");
  const [useMobileAutoSize, setUseMobileAutoSize] = useState(false);
  const [batchIdError, setBatchIdError] = useState("");
  const [isCheckingBatchId, setIsCheckingBatchId] = useState(false);

  const handleRoster = useCallback((_batchId) => {
    // This will be used by the column defs
    // The actual navigation is handled in BatchesActionsCell (which uses router directly)
  }, []);

  /*--------------- UPDATE/DELETE BATCH BEGINS -------------------*/
  const handleUpdateBatch = useCallback(async (editedBatch) => {
    setContentLoading(true);
    const response = await fetch("/api/updatebatches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editedBatch),
    });

    if (response.ok) {
      // I had to move getpagedata out of useeffect so i could call it here (Spr 2023 team).
      setMessage(`BatchId: ${editedBatch.id}, Batch: ${editedBatch.batch} Update Success!`);
      setAlertOpen(true);
      // getPageData will be called later when it's defined
      setEditingId(null);
      const focused = lastFocusedCell.current;
      if (focused && gridRef.current?.api) {
        const api = gridRef.current.api;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            api.setFocusedCell(focused.rowIndex, focused.colKey);
          });
        });
      }
    } else {
      setMessage(`BatchId: ${editedBatch.id}, Batch: ${editedBatch.batch} Update Failed!`);
      setAlertOpen(true);
      console.error("Error updating the batch");
    }
    setContentLoading(false);
    setLoading(false);
  }, []);

  const onCellValueChanged = (params) => {
    if (!params?.data?.id) return;
    if (params?.colDef?.field === "delete" || params?.colDef?.field === "actions") return;
    if (isRevertingCellRef.current) {
      isRevertingCellRef.current = false;
      return;
    }
    if (editConfirmOpenRef.current) return;

    const field = params.colDef?.field;
    if (!field) return;

    const editable =
      typeof params.colDef.editable === "function" ? params.colDef.editable(params) : params.colDef.editable;
    if (editable === false) return;

    const colKey = params.column?.getColId?.();
    lastFocusedCell.current = { rowIndex: params.rowIndex, colKey };

    const headerName = params.colDef.headerName ?? field;
    editConfirmOpenRef.current = true;
    setPendingBatchEdit({
      field,
      oldValue: params.oldValue,
      newRowData: params.data,
      node: params.node,
      rowIndex: params.rowIndex,
      colKey,
      headerName,
      rawOld: params.oldValue,
      rawNew: params.newValue,
    });
    setEditConfirmOpen(true);
    setLoading(false);
  };

  const handleEditConfirmClose = useCallback(() => {
    if (pendingBatchEdit) {
      try {
        isRevertingCellRef.current = true;
        pendingBatchEdit.node?.setDataValue?.(pendingBatchEdit.field, pendingBatchEdit.oldValue);
      } catch (err) {
        console.warn("Could not revert cell:", err);
      }
      setPendingBatchEdit(null);
    }
    editConfirmOpenRef.current = false;
    setEditConfirmOpen(false);

    const focused = lastFocusedCell.current;
    const api = gridRef.current?.api;
    if (focused && api && Number.isFinite(focused.rowIndex) && focused.colKey) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          api.setFocusedCell(focused.rowIndex, focused.colKey);
        });
      });
    }
  }, [pendingBatchEdit]);

  const handleEditConfirmSuccess = useCallback(async () => {
    if (!pendingBatchEdit) {
      editConfirmOpenRef.current = false;
      setEditConfirmOpen(false);
      return;
    }
    const { newRowData } = pendingBatchEdit;
    setPendingBatchEdit(null);
    editConfirmOpenRef.current = false;
    setEditConfirmOpen(false);
    await handleUpdateBatch(newRowData);
  }, [pendingBatchEdit, handleUpdateBatch]);

  // Helper function to fetch batches data
  const fetchBatchesData = useCallback(async () => {
    if (typeof window === "undefined") return; // Skip on server side
    // Only fetch batches if user data is available
    if (!userResponse || !userResponse.role || !userResponse.name) {
      return;
    }

    setContentLoading(true);
    const apiUrlEndpoint = `/api/getbatchesdata?userRole=${userResponse.role.toUpperCase()}&userName=${userResponse.name}`;
    const response = await fetch(apiUrlEndpoint);
    const res = await response.json();

    const normalizedBatches = normalizeBatchDates(res.batches);
    setDataResponse(normalizedBatches);
    setRowData(normalizedBatches);
    setContentLoading(false);
  }, [userResponse]);

  // const getUserData = useCallback(async () => {
  //   if (typeof window === 'undefined') return; // Skip on server side
  //   if (!session?.user?.email) return;
  //   const res = await fetch("/api/getuserdata", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ email: session.user.email }),
  //   });
  //   const data = await res.json();
  //   setUserResponse(data.users[0]);
  //   setLoading(false);
  // }, [session?.user?.email]);

  const performDeleteBatch = useCallback(
    async (batchID) => {
      setContentLoading(true);
      try {
        const response = await fetch("/api/deletebatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: batchID }),
        });

        if (response.ok) {
          setMessage(`BatchId: ${batchID} Delete Success!`);
          setAlertOpen(true);
          await fetchBatchesData();
        } else {
          setMessage(`BatchId: ${batchID} Delete Failed!`);
          setAlertOpen(true);
          console.error("Error deleting the batch");
        }
      } finally {
        setContentLoading(false);
      }
    },
    [fetchBatchesData]
  );

  const handleDelete = useCallback((props) => {
    const label = props.data?.batch ?? props.data?.id;
    setDeleteBatchData({ id: props.data.id, batch: label });
    setConfirmTitle(`Delete batch ${label}`);
    setConfirmOpen(true);
  }, []);

  const handleConfirmClose = useCallback(() => {
    setConfirmOpen(false);
    setDeleteBatchData(null);
  }, []);

  const handleConfirmSuccess = useCallback(async () => {
    const id = deleteBatchData?.id;
    setConfirmOpen(false);
    setDeleteBatchData(null);
    if (id == null) return;
    await performDeleteBatch(id);
  }, [deleteBatchData, performDeleteBatch]);

  /*--------------- UPDATE/DELETE BATCH ENDS -------------------*/

  /* --------- API SECTION: GET BATCH DATA, ETC BEGINS----------*/

  const [ariaExpanded, setAriaExpanded] = useState(false);

  // User data and page data fetching is now handled in the combined useEffect above

  // Combined useEffect for initial data loading to reduce flickering
  useEffect(() => {
    if (typeof window !== "undefined") {
      setUseMobileAutoSize(window.innerWidth < 768);
    }
    if (typeof window === "undefined") return;
    if (!session?.user?.email) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // Fetch user data
        const userRes = await fetch("/api/getuserdata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: getUserEmail(session) }),
        });
        const userData = await userRes.json();
        const currentUserResponse = userData.users[0];
        setUserResponse(currentUserResponse);

        // Fetch course data
        const courseRes = await fetch("/api/getcoursesdata");
        const courseData = await courseRes.json();
        const courseResponse = courseData.courses || [];

        // Set course options immediately to avoid separate state update
        if (courseResponse.length > 0) {
          const options = courseResponse.map((course) => (
            <option key={course.id} value={course.course}>
              {course.course}
            </option>
          ));
          setCourseOptions(options);
        }

        setCourseResponse(courseResponse);

        // Page data will be fetched by onGridReady to avoid duplicate calls
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setCourseResponse([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [session]); // Only depend on session

  var result = userResponse;

  const validateCheckedDays = (form) => {
    const checkedDays = form.querySelectorAll('input[name="coursedays"]:checked');
    if (checkedDays.length === 0) {
      alert("Please select at least one class day!");
      return false;
    }
    return true;
  };

  const validateCourseStartEndDates = (form) => {
    const courseStartValue = form.querySelector('input[name="coursestart"]').value;
    const courseEndValue = form.querySelector('input[name="courseend"]').value;
    if (courseStartValue && courseEndValue) {
      const startDate = new Date(courseStartValue);
      const endDate = new Date(courseEndValue);
      if (endDate < startDate) {
        alert("Course End Date can't be before Start Date. Please try again!");
        return false;
      }
    }
    return true;
  };

  const validateCourseStartEndTimes = (form) => {
    const classStartTimeInput = form.querySelector('input[name="coursetimestart"]');
    const classEndTimeInput = form.querySelector('input[name="coursetimeend"]');
    if (classStartTimeInput && classEndTimeInput) {
      const classStartTime = classStartTimeInput.value;
      const classEndTime = classEndTimeInput.value;
      if (classStartTime && classEndTime && classEndTime < classStartTime) {
        alert("Class End Time can't be before Class Start Time. Please try again!");
        return false;
      }
    }
    return true;
  };

  // Check if batch ID already exists
  const checkBatchIdUnique = async (batchId) => {
    if (!batchId || !batchId.trim()) {
      setBatchIdError("");
      return true;
    }

    setIsCheckingBatchId(true);
    try {
      const response = await fetch(`/api/getbatchesdata?batchId=${encodeURIComponent(batchId.trim())}`);
      const data = await response.json();
      const exists = data.batches && data.batches.length > 0;

      if (exists) {
        setBatchIdError("This Batch ID already exists. Please use a different Batch ID.");
        return false;
      } else {
        setBatchIdError("");
        return true;
      }
    } catch (error) {
      console.error("Error checking batch ID:", error);
      setBatchIdError("");
      return true; // Allow submission if check fails (server-side validation will catch it)
    } finally {
      setIsCheckingBatchId(false);
    }
  };

  const validateForm = (form) => {
    let isValid = true;
    if (!validateCheckedDays(form)) return false;
    if (!validateCourseStartEndDates(form)) return false;
    if (!validateCourseStartEndTimes(form)) return false;

    // Check batch ID error state
    if (batchIdError) {
      isValid = false;
      const batchInput = form.querySelector('input[name="batch"]');
      if (batchInput) {
        batchInput.style.borderColor = "red";
      }
    }

    // Loop through all form elements
    for (const input of form.elements) {
      // Check if the input field is required
      if (input.required) {
        // Check if the field has a value
        if (!input.value.trim()) {
          isValid = false;
          // Optionally, display an error message or style the field
          input.style.borderColor = "red";
        } else {
          // Reset the field style if it's valid
          input.style.borderColor = "";
        }
      }
    }

    return isValid;
  };

  const handleNewBatchReset = () => {
    var resetsubmitfeedback = document.getElementById("newbatchresetfeedback");
    resetsubmitfeedback.style.display = "inline";
    var reply = (resetsubmitfeedback.innerHTML = "Form was RESET!");
    return reply;
  };

  const handleNewBatchSubmit = async () => {
    const form = document.getElementById("batch-create-form");
    // form.submit();
    const isValid = validateForm(form);
    if (isValid) {
      const formData = new FormData(form);
      const jsonData = {};
      for (const [key, value] of formData.entries()) {
        if (key === "coursedays") {
          if (!jsonData[key]) {
            jsonData[key] = [];
          }
          jsonData[key].push(value);
        } else {
          jsonData[key] = value;
        }
      }
      const apiUrlEndpoint = `/api/batchcreate`;
      const postData = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      };
      const response = await fetch(apiUrlEndpoint, postData);
      const res = await response.json();
      if (!res.success) {
        setMessage(`Batch Creation Failed!`);
        setAlertOpen(true);
      } else {
        setMessage(`Batch Creation Success!`);
        setAlertOpen(true);
        // Reset form and hide it
        form.reset();
        setShowForm(false);
        // Force a complete page reload to refresh the data
        // Temp fix for grid not updating after batch creation
        await fetchBatchesData();
      }
      form.reset();
      setShowForm(false);
    }
  };
  /* --------- API SECTION: GET BATCH DATA, ETC ENDS ---------*/

  /*------------ SESSION & USER AUTHENTICATION BEGINS --------*/

  var result = userResponse;

  const handleCurrencyKeyDown = (e) => {
    const currencies = ["INR", "USD", "NA"];
    const currentIndex = currencies.indexOf(selectedCurrency);

    switch (e.key) {
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : currencies.length - 1;
        setSelectedCurrency(currencies[prevIndex]);
        document.getElementById(
          currencies[prevIndex].toLowerCase() === "na"
            ? "na"
            : currencies[prevIndex].toLowerCase() === "inr"
              ? "rupees"
              : "usd"
        ).checked = true;
        break;
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        const nextIndex = currentIndex < currencies.length - 1 ? currentIndex + 1 : 0;
        setSelectedCurrency(currencies[nextIndex]);
        document.getElementById(
          currencies[nextIndex].toLowerCase() === "na"
            ? "na"
            : currencies[nextIndex].toLowerCase() === "inr"
              ? "rupees"
              : "usd"
        ).checked = true;
        break;
      default:
        break;
    }
  };

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
  if (userResponse?.role === "TELECALLER") {
    return (
      <div className="autherrorcontainer">
        <Image alt={"VisionAid logo"} src={"/images/logo-mainsite.png?v=20251004"} height={100} width={150} />
        <span className="autherrortext">Access denied.</span>
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
  /*------------ SESSION & USER AUTHENTICATION ENDS --------*/

  /*----------- CHECK AUTH/LOAD PAGE BEGINS -----------*/
  if (status === "authenticated" || status === "unauthenticated") {
    if (!userResponse) {
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
    } else {
      if (result?.role && allowedRoles.includes(result.role.toUpperCase())) {
        return (
          <>
            <div className={styles.mynavbar}>
              <span className={styles.skip}>
                <a href="#maincontent" className="skip" onClick={() => document.getElementById("maincontent")?.focus()}>
                  Skip to main content
                </a>
              </span>
              {/* LOCAL TESTING LINE: COMMENT OUT USER_ROLE FOR LOCAL TESTING BELOW */}
              <Navbar user_role={result.role.toUpperCase()} className={styles.navstudents} />
            </div>
            <Head>
              <title>Batches - Vision-Aid-STATS</title>
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
                <PageTitleWithUserGuideLink section_title="Batch Management" />
                {/*------------ CSV DOWNLOAD BUTTON --------------*/}
                <button
                  className={styles.batchManagementButton}
                  {...createAccessibleButtonProps(() => exportToCsv("visionaidbatches.csv", dataResponse))}
                  aria-label="Download batch data as CSV file"
                  style={{ left: "0em" }}
                >
                  Export to CSV
                </button>
              </div>

              {/*---------------- FORM BEGINS -------------------*/}
              <div className={styles.gridcourses}>
                <GlobalSnackbar open={alertOpen} message={message} setOpen={setAlertOpen} />
                <ConfirmationModal
                  open={confirmOpen}
                  handleClose={handleConfirmClose}
                  handleConfirm={handleConfirmSuccess}
                  confirmColor="error"
                  title={confirmTitle}
                  message={
                    deleteBatchData
                      ? `Are you sure you want to delete batch "${deleteBatchData.batch ?? deleteBatchData.id}"? This will delete all fees, attendance, and grades for this batch.`
                      : "Are you sure you want to delete this batch?"
                  }
                />
                <ConfirmationModal
                  open={editConfirmOpen}
                  handleClose={handleEditConfirmClose}
                  handleConfirm={handleEditConfirmSuccess}
                  confirmColor="primary"
                  title="Confirm change"
                  message={
                    pendingBatchEdit
                      ? `Do you want to save this change?\n\n${pendingBatchEdit.headerName}: "${String(pendingBatchEdit.rawOld ?? "").replace(/"/g, "'") || "(empty)"}" → "${String(pendingBatchEdit.rawNew ?? "").replace(/"/g, "'") || "(empty)"}"`
                      : "Are you sure you want to save?"
                  }
                />
                {userResponse?.role != "STAFF" ? (
                  <>
                    {showForm ? (
                      <div className={styles.addbatchform} id="createNewBatch">
                        <div className={styles.addstaffformHeader}>
                          <h2 className={styles.addnewbatchtitle}>
                            Create Batch
                            <Image
                              alt="Close batches form"
                              className={styles.collapseButtonBatches}
                              height={30}
                              width={30}
                              onClick={() => {
                                setAriaExpanded(false);
                                setShowForm(false);
                              }}
                              role="button"
                              src={"/icons/expand-up.svg"}
                              tabIndex={0}
                              title="Close Batches Form"
                            />
                          </h2>
                        </div>

                        <div id="requiredHelper">
                          <h3>The fields marked with asterisks (*) are Required</h3>
                        </div>
                        <div className={styles.addbatchformseccontainer}>
                          {/* <form
                              action='/api/batchcreate'
                              method='post'
                              onSubmit={() => handleSubmit()}
                            > */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleNewBatchSubmit();
                            }}
                            // action="javascript:void(0);"
                            id="batch-create-form"
                          >
                            <section className={styles.addbatchformsec1}>
                              <label htmlFor="coursename" className={styles.addstafflabel}>
                                Course Name
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <select
                                name="coursename"
                                id="coursename"
                                className={styles.addstaffforminputsbox}
                                autoFocus
                                required
                                disabled={contentLoading}
                              >
                                <option value="">
                                  {contentLoading ? "Loading courses..." : "-- Select Course --"}
                                </option>
                                {courseOptions}
                              </select>
                              <br />
                              <br />

                              <label htmlFor="batch" className={styles.addstafflabel}>
                                Batch ID
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <input
                                type="text"
                                className={styles.addstaffforminputsbox}
                                id="batch"
                                name="batch"
                                required
                                onBlur={(e) => {
                                  const batchId = e.target.value.trim();
                                  if (batchId) {
                                    checkBatchIdUnique(batchId);
                                  } else {
                                    setBatchIdError("");
                                  }
                                }}
                                style={{
                                  borderColor: batchIdError ? "red" : "",
                                }}
                                disabled={isCheckingBatchId}
                              />
                              {batchIdError && (
                                <div style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                                  {batchIdError}
                                </div>
                              )}
                              {isCheckingBatchId && (
                                <div style={{ color: "gray", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                                  Checking...
                                </div>
                              )}
                              <br />
                              <br />

                              <label htmlFor="coursestart" className={styles.addstafflabel}>
                                Course Start Date
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <input
                                type="date"
                                className={styles.addstaffforminputsbox}
                                id="coursestart"
                                name="coursestart"
                                placeholder="MM/DD/YYYY"
                                required
                              />
                              <br />
                              <br />

                              <label htmlFor="courseend" className={styles.addstafflabel}>
                                Course End Date
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <input
                                type="date"
                                className={styles.addstaffforminputsbox}
                                id="courseend"
                                name="courseend"
                                placeholder="MM/DD/YYYY"
                                required
                              />
                              <br />
                              <br />

                              {/*-------- COURSEDAYS CHECKBOXES BEGIN -----------*/}
                              <div className={styles.wrappercheckboxes}>
                                <label htmlFor="coursedays" className={styles.addcheckboxeslabel}>
                                  Select Class Days
                                  <span className={styles.requiredelement}>&#42;</span>
                                </label>
                                <div className={styles.containercheckboxes}>
                                  {/* <fieldset className={'${styles["fieldsetDaysCurr"]} ${styles["fieldsetDays"]}'}> */}
                                  <fieldset className={styles.fieldsetDays}>
                                    <legend>Select Class Days</legend>
                                    <span className={styles.checkBox}>
                                      <input
                                        className={styles.inputdays}
                                        type="checkbox"
                                        aria-label="Monday"
                                        id="M"
                                        name="coursedays"
                                        value="M"
                                      />
                                      <label className={styles.labeldays} htmlFor="M">
                                        M
                                      </label>
                                    </span>

                                    <span className={styles.checkBox}>
                                      <input
                                        className={styles.inputdays}
                                        type="checkbox"
                                        aria-label="Tuesday"
                                        id="T"
                                        name="coursedays"
                                        value="T"
                                      />
                                      <label className={styles.labeldays} htmlFor="T">
                                        T
                                      </label>
                                    </span>

                                    <span className={styles.checkBox}>
                                      <input
                                        className={styles.inputdays}
                                        type="checkbox"
                                        aria-label="Wednesday"
                                        id="W"
                                        name="coursedays"
                                        value="W"
                                      />
                                      <label className={styles.labeldays} htmlFor="W">
                                        W
                                      </label>
                                    </span>

                                    <span className={styles.checkBox}>
                                      <input
                                        className={styles.inputdays}
                                        type="checkbox"
                                        aria-label="Thursday"
                                        id="Th"
                                        name="coursedays"
                                        value="Th"
                                      />
                                      <label className={styles.labeldays} htmlFor="Th">
                                        Th
                                      </label>
                                    </span>

                                    <span className={styles.checkBox}>
                                      <input
                                        className={styles.inputdays}
                                        type="checkbox"
                                        id="F"
                                        aria-label="Friday"
                                        name="coursedays"
                                        value="F"
                                      />
                                      <label className={styles.labeldays} htmlFor="F">
                                        F
                                      </label>
                                    </span>

                                    <span className={styles.checkBox}>
                                      <input
                                        className={styles.inputdays}
                                        type="checkbox"
                                        aria-label="Saturday"
                                        id="Sa"
                                        name="coursedays"
                                        value="Sa"
                                      />
                                      <label className={styles.labeldays} htmlFor="Sa">
                                        Sa
                                      </label>
                                    </span>

                                    <span className={styles.checkBox}>
                                      <input
                                        className={styles.inputdays}
                                        type="checkbox"
                                        aria-label="Sunday"
                                        id="Su"
                                        name="coursedays"
                                        value="Su"
                                      />
                                      <label className={styles.labeldays} htmlFor="Su">
                                        Su
                                      </label>
                                    </span>
                                  </fieldset>
                                </div>
                              </div>
                              <br />
                              {/*-------- COURSEDAYS CHECKBOXES BEGIN -----------*/}
                            </section>

                            <section className={styles.addbatchformsec2}>
                              <label htmlFor="coursetimestart" className={styles.addstafflabel}>
                                Class Start Time
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <input
                                type="time"
                                className={styles.addstaffforminputsbox}
                                id="coursetimestart"
                                name="coursetimestart"
                                defaultValue="12:00"
                                required
                              />
                              <br />
                              <br />

                              <label htmlFor="coursetimeend" className={styles.addstafflabel}>
                                Class End Time
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <input
                                type="time"
                                className={styles.addstaffforminputsbox}
                                id="coursetimeend"
                                name="coursetimeend"
                                defaultValue="12:00"
                                required
                              />
                              <br />
                              <br />

                              {/* ✅ Instructor Dropdown (Defaults to empty) */}
                              <label htmlFor="instructor" className={styles.addstafflabel}>
                                Instructor
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <DropdownMenuStaff
                                className="dropdownmenuinstructor"
                                id="instructor"
                                name="instructor"
                                selectedValue="" // ✅ Defaults to empty
                                required
                              />
                              <br />
                              <br />

                              {/* ✅ Program Manager Dropdown (Defaults to empty) */}
                              <label htmlFor="PM" className={styles.addstafflabel}>
                                Program Manager
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <DropdownMenuPm
                                id="PM"
                                name="PM"
                                selectedValue="" // ✅ Defaults to empty
                                required
                              />
                              <br />
                              <br />

                              <label htmlFor="TA" className={styles.addstafflabel}>
                                Teaching Assistant
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <DropdownMenuStaff
                                className="dropdownmenustaff"
                                id="TA"
                                name="TA"
                                selectedValue=""
                                required
                              />
                              <br />
                              <br />

                              {/* ✅ Data Entry Dropdown (Defaults to empty) */}
                              <label htmlFor="dataentry" className={styles.addstafflabeldataentry}>
                                Data Entry Access
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <DropdownMenuStaff
                                className="dropdownmenustaff"
                                id="dataentry"
                                name="dataentry"
                                selectedValue="" // ✅ Defaults to empty
                                required
                              />
                            </section>

                            <section className={styles.addbatchformsec3}>
                              <label
                                htmlFor="cost"
                                // className={styles.addstafflabel}
                                className={styles.rightcardlabelunrequired}
                              >
                                Cost per Student
                                {/* <span className={styles.requiredelement}>&#42;</span> */}
                              </label>
                              <input
                                type="number"
                                className={styles.inputunrequiredcost}
                                id="cost"
                                name="cost"
                                placeholder="If free, input 0."
                              />
                              <br />
                              <br />

                              <label id="currency-group-label" className={styles.rightcardlabelunrequired}>
                                Currency
                                <span className={styles.requiredElement}></span>
                              </label>

                              <fieldset
                                className={styles.fieldsetDaysCurr}
                                role="radiogroup"
                                aria-labelledby="currency-group-label"
                                onKeyDown={handleCurrencyKeyDown}
                                tabIndex={0}
                              >
                                <legend>Select Currency</legend>
                                <div className={styles.currencyOptions}>
                                  <div className={styles.currencyOption}>
                                    <input
                                      className={styles.currencyradiobtn}
                                      type="radio"
                                      id="rupees"
                                      name="currency"
                                      value="INR"
                                      checked={selectedCurrency === "INR"}
                                      onChange={() => setSelectedCurrency("INR")}
                                    />
                                    <label htmlFor="rupees" className={styles.fieldsetlabel}>
                                      INR
                                    </label>
                                  </div>

                                  <div className={styles.currencyOption}>
                                    <input
                                      className={styles.currencyradiobtn}
                                      type="radio"
                                      id="usd"
                                      name="currency"
                                      value="USD"
                                      checked={selectedCurrency === "USD"}
                                      onChange={() => setSelectedCurrency("USD")}
                                    />
                                    <label htmlFor="usd" className={styles.fieldsetlabel}>
                                      USD
                                    </label>
                                  </div>

                                  <div className={styles.currencyOption}>
                                    <input
                                      className={styles.currencyradiobtn}
                                      type="radio"
                                      id="na"
                                      name="currency"
                                      value="NA"
                                      checked={selectedCurrency === "NA"}
                                      onChange={() => setSelectedCurrency("NA")}
                                    />
                                    <label htmlFor="na" className={styles.fieldsetlabel}>
                                      NA
                                    </label>
                                  </div>
                                </div>
                              </fieldset>

                              <br />
                              <br />

                              <label htmlFor="strength" className={styles.addstafflabel}>
                                Batch Strength
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <input
                                type="text"
                                className={styles.addstaffforminputsbox}
                                id="strength"
                                name="strength"
                                required
                              />
                              <br />
                              <br />

                              <label htmlFor="trainingmode" className={styles.addstafflabel}>
                                Mode of Training
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <select
                                className={styles.addstaffforminputsbox}
                                id="trainingmode"
                                name="trainingmode"
                                required
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  -- Select Training Mode --
                                </option>
                                <option value="VIRTUAL">Virtual</option>
                                <option value="IN-PERSON">In-person</option>
                                <option value="SELF-PACED">Self-paced</option>
                              </select>
                              <br />
                              <br />

                              {/* Buttons and messages div */}
                              <div className={styles.resetsubmitbtnsmsgs}>
                                <span
                                  aria-live="polite"
                                  className={styles.newbatchresetfeedback}
                                  id="newbatchresetfeedback"
                                ></span>
                                {/* <span id="newbatchsubmitfeedback" aria-live="polite"></span> */}
                                {/* </span> */}

                                {/* Reset and submit buttons */}
                                <div className={styles.resetsubmitbtnsbatches}>
                                  <div className={styles.resetsubmitbtnsbatchescont}>
                                    <input
                                      aria-live="polite"
                                      className={styles.resetbtnbatches}
                                      id="createnewbatchreset"
                                      onClick={handleNewBatchReset}
                                      type="reset"
                                      value="Reset"
                                      aria-label="Reset batch creation form"
                                    />
                                  </div>
                                  <div className={styles.resetsubmitbtnsbatchescont}>
                                    <button
                                      aria-live="polite"
                                      className={styles.submitbtnbatches}
                                      type="submit"
                                      aria-label="Submit batch creation form"
                                    >
                                      SUBMIT
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </section>
                          </form>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                    <Button
                      style={{ display: showForm ? "none" : "block" }}
                      onClick={() => {
                        setAriaExpanded(true);
                        setShowForm(true);
                      }}
                      text={"Create New Batch"}
                      className={styles.btnnewbatchform}
                      ariaExpanded={ariaExpanded}
                      ariaControls="createNewBatch"
                    ></Button>
                  </>
                ) : (
                  <></>
                )}
                {!showForm && (
                  <div className="ag-theme-alpine h-[78dvh] w-full">
                    <AgGridReact
                      enableCellTextSelection={true}
                      ref={gridRef}
                      autoSizeStrategy={useMobileAutoSize ? { type: "fitCellContents" } : undefined}
                      columnDefs={getBatchesColumnDefs(handleRoster, handleDelete, userResponse?.role || "")}
                      defaultColDef={{
                        comparator: smartComparator,
                        filter: true,
                        resizable: true,
                        editable: true,
                        maxWidth: 240,
                        cellClass: (params) => {
                          const f = params.colDef.field;
                          if (!f || f === "actions" || f === "delete" || f === "id") return undefined;
                          const ed = params.colDef.editable;
                          const resolved = typeof ed === "function" ? ed(params) : ed;
                          if (resolved === false) return undefined;
                          return styles.gridCellEditable;
                        },
                        suppressKeyboardEvent: (params) => {
                          const { event, editing } = params;
                          const cellElement = event.target.closest(".ag-cell");

                          if ((event.key === " " || event.key === "Space") && !editing) {
                            event.preventDefault();
                            return true;
                          }

                          if (event.key === "Tab") {
                            const activeElement = document.activeElement;
                            const rosterButton = cellElement?.querySelector('button[title="Roster"]');
                            const deleteButton = cellElement?.querySelector('button[aria-label="delete"]');

                            if (activeElement === rosterButton && !event.shiftKey) {
                              event.preventDefault();
                              if (deleteButton && !deleteButton.disabled) {
                                deleteButton.focus();
                              }
                              return true;
                            } else if (activeElement === deleteButton && event.shiftKey) {
                              event.preventDefault();
                              if (rosterButton) {
                                rosterButton.focus();
                              }
                              return true;
                            }
                          }

                          return false;
                        },
                      }}
                      getRowId={(p) => String(p.data.id)}
                      immutableData={true}
                      suppressAnimationFrame={true}
                      rowBuffer={40}
                      suppressRowTransform={true}
                      suppressHydrationWarning={true}
                      suppressColumnVirtualisation={true}
                      getRowStyle={(params) => {
                        if (getBatchStatus(params) === "VERIFY") {
                          return { background: "#ffffad" };
                        }
                      }}
                      editType="cell"
                      singleClickEdit={true}
                      stopEditingWhenCellsLoseFocus={true}
                      suppressScrollOnNewData={true}
                      ensureDomOrder={true}
                      loading={loading}
                      rowData={rowData}
                      onCellValueChanged={onCellValueChanged}
                      onGridReady={fetchBatchesData}
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
                    />
                  </div>
                )}
              </div>

              {/*------------- FOOTER SECTION BEGINS ---------------
                <footer className={styles.footer}>
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
                </footer>
                ------------- FOOTER SECTION ENDS ---------------*/}
            </main>
          </>
        );
      } else {
        /*------------- UNAUTHENTICATED SEC BEGINS------------*/
        return (
          <>
            <div className={styles.mynavbar}>
              <Navbar className={styles.navstudents} />
            </div>
            <div className={styles.container}>
              <Head>
                <title>Batch Management-Vision-Aid</title>
                <meta
                  name="description"
                  content="A nonprofit, advocating on behalf of persons with vision issues of any type"
                />
              </Head>

              <main className={`${styles.mainstudents} pageMain`} style={{ marginTop: 0, paddingTop: 0 }}>
                {/* <p className={styles.subtitlenonhm}> */}
                <h1 className={`${styles.title} pageTitle`} style={{ marginTop: 0, paddingTop: 0 }}>
                  Batch Management
                </h1>
                <div className={styles.gridcourses}></div>

                {/*------ UNAUTHENTICATED SEC FOOTER BEGINS ------
                <footer className={styles.footer}>
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
								</footer>
                {/*------ UNAUTHENTICATED SEC FOOTER ENDS ------*/}

                {/* -------- UNAUTHENTICATED SEC ENDS---------- */}
              </main>
            </div>
          </>
        );
      }
    }
  }
}
