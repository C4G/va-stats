/*
In useEffect: ESLint warning was removed using code below, including slashes;
may cause problems if changes are not tested thoroughly
// eslint-disable-next-line react-hooks/exhaustive-deps
*/

import Button from "@/components/Button";
import DropdownMenuStaff from "@/components/DropdownMenuStaff";
import Navbar from "@/components/Navbar";
import styles from "@/styles/Home.module.css";
import { exportToCsv } from "@/utils/export-to-csv";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { smartComparator } from "@/utils/grid-comparators";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import ConfirmationModal from "../components/ConfirmationModal";
import GlobalSnackbar from "../components/GlobalSnackbar";
import { getUsersColumnDefs } from "../utils/get-users-columns-defs";
import { toDisplay } from "../utils/types/date";
import { formatDateInput, normalizeUserDates, parseDateInput } from "@/utils/date-normalizers";
import PageTitleWithUserGuideLink from "@/components/PageTitleWithUserGuideLink";

export async function getServerSideProps() {
  // Force server-side rendering to prevent static generation issues
  return {
    props: {},
  };
}

export default function Page() {
  useForm();
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

  const [dataResponse, setDataResponse] = useState([]);
  const [userResponse, setUserResponse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);

  const [courseResponse, setCourseResponse] = useState(() => []);
  const [courseOptions1, setCourseOptions1] = useState(() => []);
  const [courseOptions2, setCourseOptions2] = useState(() => []);
  const [courseOptions3, setCourseOptions3] = useState(() => []);
  const [designationOptions, setDesignationOptions] = useState(() => [
    "Trainer",
    "Teaching Assistant",
    "Program Coordinator",
    "Telecaller",
    "Training Coordinator",
    "Program Manager",
    "Sr. Trainer",
    "L & D Executive",
    "Head of Training",
    "Trainer plus Telecaller",
  ]);
  const [deleteUsersData, setDeleteUsersData] = useState(null);

  const [rowData, setRowData] = useState();
  const [confirmTitle, setConfirmTitle] = useState();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [pendingUserEdit, setPendingUserEdit] = useState(null);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [pendingUserCreate, setPendingUserCreate] = useState(null);

  const [Option1, setOption1] = useState(() => []);
  const [Option2, setOption2] = useState(() => []);
  const [choiceChanged, setChoiceChanged] = useState(false);
  const allowedRoles = ["ADMINISTRATOR", "MANAGEMENT"];
  const gridRef = useRef(null);
  const loadedEmailRef = useRef(null);
  // Prevent AG Grid confirmation loops when we revert a cell after cancel.
  const isRevertingCellRef = useRef(false);
  // Track the currently edited cell so we can keep focus on cancel.
  const lastFocusedCell = useRef(null);

  const [, setEditingId] = useState(null);

  const [joinDate, setJoinDate] = useState("");
  const [contractMonths, setContractMonths] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");

  const [hasContract, setHasContract] = useState(false);
  const handleHasContractChange = (e) => {
    setHasContract(e.target.checked);
    if (!e.target.checked) {
      setContractMonths("");
      setContractEndDate("");
    }
  };

  const handleJoinDateChange = (e) => {
    setJoinDate(formatDateInput(e.target.value));
  };

  const handleContractMonthsChange = (e) => {
    setContractMonths(e.target.value);
  };

  useEffect(() => {
    const normalizedJoinDate = parseDateInput(joinDate);
    if (normalizedJoinDate && contractMonths) {
      const start = new Date(normalizedJoinDate);
      start.setMonth(start.getMonth() + parseInt(contractMonths, 10));
      setContractEndDate(formatDateInput(start));
    } else {
      setContractEndDate("");
    }
  }, [joinDate, contractMonths]);

  const getPageData = useCallback(async () => {
    setContentLoading(true);
    try {
      const response = await fetch("/api/getusersdata");
      const res = await response.json();
      const normalizedUsers = normalizeUserDates(res.users);
      setRowData(normalizedUsers);
      setDataResponse(normalizedUsers);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setContentLoading(false);
    }
  }, []);

  const handleUpdateUser = useCallback(
    async (editedUser) => {
      setContentLoading(true);
      try {
        const response = await fetch("/api/updateusers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editedUser),
        });

        if (response.ok) {
          await getPageData();
          setMessage(`User: ${editedUser.name} updated!`);
          setAlertOpen(true);
          setEditingId(null);
        } else {
          console.error("Error updating the user");
        }
      } finally {
        setContentLoading(false);
      }
    },
    [getPageData]
  );

  const onCellValueChanged = async (params) => {
    // Ignore internal updates / non-editable columns.
    if (!params?.data?.id) return;
    if (params?.colDef?.field === "delete") return;
    if (isRevertingCellRef.current) {
      isRevertingCellRef.current = false;
      return;
    }
    if (editConfirmOpen) return; // Prevent double-opening modal on rapid grid events.

    const field = params?.colDef?.field;
    if (!field) return;

    const colKey = params.column?.getColId?.();
    lastFocusedCell.current = { rowIndex: params.rowIndex, colKey };

    // AG Grid passes the previous value directly; relying on React state object snapshots
    // can fail with cell-level editing because AG Grid may mutate shared references.
    const oldValue = params.oldValue;

    setPendingUserEdit({
      rowId: params.data.id,
      field,
      oldValue,
      newRowData: params.data, // contains the new value after edit
      node: params.node,
      rowIndex: params.rowIndex,
      colKey,
    });
    setEditConfirmOpen(true);
    setLoading(false);
  };

  const handleEditConfirmClose = useCallback(() => {
    if (pendingUserEdit) {
      try {
        isRevertingCellRef.current = true;
        // Revert in the grid directly so we don't blow away focus like a full React state re-render.
        pendingUserEdit.node?.setDataValue?.(pendingUserEdit.field, pendingUserEdit.oldValue);
      } catch (err) {
        console.warn("Could not revert cell:", err);
      }
      setPendingUserEdit(null);
    }
    setEditConfirmOpen(false);

    // Keep focus (blue border) on the cell the user just edited.
    const focused = lastFocusedCell.current;
    const api = gridRef.current?.api;
    if (focused && api && Number.isFinite(focused.rowIndex) && focused.colKey) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          api.setFocusedCell(focused.rowIndex, focused.colKey);
        });
      });
    }
  }, [pendingUserEdit]);

  const handleEditConfirmSuccess = useCallback(async () => {
    if (!pendingUserEdit) {
      setEditConfirmOpen(false);
      return;
    }
    const { newRowData } = pendingUserEdit;
    setPendingUserEdit(null);
    setEditConfirmOpen(false);
    await handleUpdateUser(newRowData);
  }, [pendingUserEdit, handleUpdateUser]);

  const handleCreateConfirmClose = useCallback(() => {
    setCreateConfirmOpen(false);
    setPendingUserCreate(null);
  }, []);

  const handleCreateConfirmSuccess = useCallback(async () => {
    if (!pendingUserCreate) {
      setCreateConfirmOpen(false);
      return;
    }

    const formJSON = pendingUserCreate;
    setPendingUserCreate(null);
    setCreateConfirmOpen(false);

    setContentLoading(true);
    try {
      const response = await fetch("/api/usercreate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formJSON),
      });

      if (response.ok) {
        await getPageData();
        setMessage("Staff member created successfully!");
        setAlertOpen(true);

        // Reset controlled form states so the next open starts clean
        setShowForm(false);
        setJoinDate("");
        setContractMonths("");
        setContractEndDate("");
        setHasContract(false);
      } else {
        let errMessage = "Unknown error";
        try {
          const err = await response.json();
          errMessage = err?.error || err?.message || errMessage;
        } catch {
          // ignore JSON parse errors
        }

        setMessage("Error creating staff: " + errMessage);
        setAlertOpen(true);
      }
    } catch (error) {
      console.error("Error creating staff:", error);
      setMessage("Error creating staff: " + (error?.error || error?.message || "Unknown error"));
      setAlertOpen(true);
    } finally {
      setContentLoading(false);
    }
  }, [pendingUserCreate, getPageData]);

  const onGridReady = useCallback((params) => {
    // Store grid API reference if needed
    if (params?.api) {
      gridRef.current = params.api;
    }
    // Don't update state here to avoid flushSync warning
    // Data loading is handled in useEffect
  }, []);

  const dateColumns = ["age", "registration_date", "joindate"];

  const cellRenderer = (params) => {
    const { colDef, data } = params;
    const value = dateColumns.includes(colDef.field) ? (params.value ? toDisplay(params.value) : "") : params.value;
    const fieldName = colDef.headerName ?? colDef.field;
    const personName = data.name;
    return (
      <div role="gridcell" aria-label={`${personName}'s ${fieldName}: ${value}`}>
        {value}
      </div>
    );
  };

  const updateChoices = (e) => {
    const { name, value } = e.target;
    if (name === "trainingprogram1") {
      setOption1(value);
    } else if (name === "trainingprogram2") {
      setOption2(value);
    }
    setChoiceChanged(!choiceChanged);
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
    getCourseOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseResponse, choiceChanged]);

  const handleDelete = (props) => {
    setDeleteUsersData(props.data);
    setConfirmTitle(`Delete ${props.data.name}`);
    setConfirmOpen(true);
  };

  const handleConfirmClose = () => {
    setConfirmOpen(false);
  };

  const handleConfirmSuccess = () => {
    setLoading(true);
    setConfirmOpen(false);
    handleDeleteUser(deleteUsersData.id).then(() => {
      setMessage(`${deleteUsersData.name} was deleted!`);
      setDeleteUsersData(null);
      setAlertOpen(true);
      setLoading(false);
    });
  };

  const handleDeleteUser = async (userID) => {
    setContentLoading(true);
    try {
      const response = await fetch("/api/deleteuser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: userID }),
      });

      if (response.ok) {
        // I had to move getpagedata out of useeffect so i could call it here
        await getPageData();
        return true;
      } else {
        console.error("Error deleting the user");
        return false;
      }
    } catch (error) {
      console.error("Error in handleDeleteUser:", error);
      return false;
    } finally {
      setContentLoading(false);
    }
  };

  /* ---------------------------------- API SECTION -----------------------------------*/
  var result;

  /* ---------------------------------- API SECTION -----------------------------------*/
  // The /api/getuserdata below is different than the call to 'getusers';
  // this data is used to edit an INDIVIDUAL USER (note: getUserData, without an 's')

  const handleSubmit = (e) => {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const formJSON = Object.fromEntries(formData.entries());

    ["date_of_birth", "joindate"].forEach((field) => {
      if (field in formJSON) {
        formJSON[field] = parseDateInput(formJSON[field]);
      }
    });

    setPendingUserCreate(formJSON);
    setCreateConfirmOpen(true);
  };

  // Combined useEffect for initial data loading to reduce flickering and improve performance
  useEffect(() => {
    if (typeof window === "undefined") return;
    const email = session?.user?.email;
    if (!email) return;
    if (loadedEmailRef.current === email) return;
    loadedEmailRef.current = email;

    (async () => {
      try {
        setLoading(true);
        // Parallel API calls for better performance
        const [userRes, coursesRes, usersRes, designationRes] = await Promise.all([
          fetch("/api/getuserdata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          }),
          fetch("/api/getcoursesdata"),
          fetch("/api/getusersdata"),
          fetch("/api/configurations/dropdownOptions?key=staff_designation", { cache: "no-store" }),
        ]);

        const [userData, coursesData, usersData, designationData] = await Promise.all([
          userRes.json(),
          coursesRes.json(),
          usersRes.json(),
          designationRes.json(),
        ]);

        setUserResponse(userData.users[0]);
        setCourseResponse(coursesData.courses);
        const normalizedUsers = normalizeUserDates(usersData.users);
        setRowData(normalizedUsers);
        setDataResponse(normalizedUsers);

        if (Array.isArray(designationData?.options) && designationData.options.length > 0) {
          setDesignationOptions(designationData.options.map((option) => option.value));
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  result = userResponse;
  const canEditStaff = allowedRoles.includes(result?.role) && result?.isactive === "A";

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
  } else {
    if (canEditStaff) {
      return (
        <>
          <div className={styles.mynavbar}>
            <span className={styles.skip}>
              <a href="#maincontent" className="skip" onClick={() => document.getElementById("maincontent")?.focus()}>
                Skip to main content
              </a>
            </span>
            <Navbar user_role={result.role} className={styles.navstudents} />
          </div>
          <Head>
            <title>Staff - Vision-Aid-STATS</title>
            <meta
              name="description"
              content="This page contains staff information and a form to add such information"
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
              <PageTitleWithUserGuideLink section_title="All VisionAid Staff" />

              {/*------------ CSV DOWNLOAD BUTTON --------------*/}
              <button
                className={styles.staffManagementButton}
                {...createAccessibleButtonProps(() => exportToCsv("visionaidstaff.csv", dataResponse))}
              >
                Export to CSV
              </button>
            </div>
            <div className={styles.gridcourses}>
              <GlobalSnackbar open={alertOpen} message={message} setOpen={setAlertOpen} />
              <ConfirmationModal
                open={confirmOpen}
                handleClose={handleConfirmClose}
                handleConfirm={handleConfirmSuccess}
                confirmColor="error"
                title={confirmTitle}
                message="Are you sure you want to delete this staff member? This action cannot be undone."
              />
              <ConfirmationModal
                open={editConfirmOpen}
                handleClose={handleEditConfirmClose}
                handleConfirm={handleEditConfirmSuccess}
                confirmColor="primary"
                title="Confirm change"
                message={
                  pendingUserEdit
                    ? `Do you want to save your changes to "${pendingUserEdit.newData?.name ?? "this staff member"}"?`
                    : "Do you want to save?"
                }
              />
              <ConfirmationModal
                open={createConfirmOpen}
                handleClose={handleCreateConfirmClose}
                handleConfirm={handleCreateConfirmSuccess}
                confirmColor="primary"
                title="Confirm change"
                message={
                  pendingUserCreate
                    ? `Do you want to save "${pendingUserCreate.name ?? "this staff member"}"?`
                    : "Do you want to save?"
                }
              />
              {/* <div style={{color: 'red', position: 'relative', top: '1em' }}> */}

              {/* Add staff member form */}
              {result.role === "ADMINISTRATOR" ? (
                <>
                  {showForm ? (
                    <div className={styles.addstaffform}>
                      <div className={styles.addstaffformHeader}>
                        <h2 className={styles.addnewstaffmember}>
                          Add New Staff Member
                          <Image
                            alt={"close batches form"}
                            src={"/icons/expand-up.svg"}
                            height={30}
                            width={30}
                            onClick={() => setShowForm(false)}
                            className={styles.collapseButtonUsers}
                            title="Close User Creation Form"
                          />
                        </h2>
                      </div>
                      <form onSubmit={handleSubmit} className={styles.addstaffforminputs} autoComplete="off">
                        <section className={styles.addstaffformsec1}>
                          <label htmlFor="name" className={styles.addstafflabel}>
                            Name
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <input required type="text" className={styles.addstaffforminputsbox} id="name" name="name" />
                          <br />
                          <br />
                          <label htmlFor="employeeId" className={styles.addstafflabel}>
                            Employee Number
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <input
                            required
                            type="text"
                            id="employeeId"
                            name="employeeId"
                            className={styles.addstaffforminputsbox}
                          />
                          <br />
                          <br />

                          <label htmlFor="mobilenumber" className={styles.addstafflabel}>
                            Contact Number
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <input
                            required
                            type="tel"
                            className={styles.addstaffforminputsbox}
                            id="mobilenumber"
                            name="mobilenumber"
                          />
                          <br />
                          <br />

                          <label htmlFor="gender" className={styles.addstafflabel}>
                            Gender
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <select required className={styles.addstaffforminputsbox} id="gender" name="gender">
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                          </select>
                          <br />
                          <br />

                          <label htmlFor="date_of_birth" className={styles.addstafflabel}>
                            Date of Birth
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <input
                            required
                            type="date"
                            className={styles.addstaffforminputsbox}
                            id="date_of_birth"
                            name="date_of_birth"
                          />
                          <br />
                          <br />

                          <label htmlFor="visualacuity" className={styles.addstafflabel}>
                            Visual Acuity
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <select
                            required
                            className={styles.addstaffforminputsbox}
                            id="visualacuity"
                            name="visualacuity"
                          >
                            <option value="" disabled>
                              &nbsp;
                            </option>
                            <option value="LowVision">Low Vision</option>
                            <option value="Blind">Blind</option>
                            <option value="Sighted">Sighted</option>
                          </select>
                          <br />
                          <br />

                          <label htmlFor="workbase" className={styles.addstafflabel}>
                            Work Location
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <input
                            required
                            type="text"
                            className={styles.addstaffforminputsbox}
                            id="workbase"
                            name="workbase"
                          />
                          <br />
                          <br />

                          <label htmlFor="designation" className={styles.addstafflabel}>
                            Designation
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <select
                            required
                            type="text"
                            className={styles.addstaffforminputsbox}
                            id="designation"
                            name="designation"
                            defaultValue={
                              result?.role === "TELECALLER"
                                ? "Telecaller"
                                : result?.role === "TRAINERPLUSTELECALLER"
                                  ? "Trainer plus Telecaller"
                                  : "Trainer"
                            }
                          >
                            {designationOptions.map((designation) => (
                              <option key={designation} value={designation}>
                                {designation}
                              </option>
                            ))}
                          </select>
                          <br />
                          <br />
                        </section>

                        <section className={styles.addstaffformsec2}>
                          <label htmlFor="Supervisor" className={styles.addstafflabel}>
                            Supervisor
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <DropdownMenuStaff
                            className="dropdownmenusupervisor"
                            id="Supervisor"
                            name="Supervisor"
                            selectedValue=""
                            required
                          />
                          <br />
                          <br />
                          <label htmlFor="joindate" className={styles.addstafflabel}>
                            Date of Joining
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <input
                            required
                            type="date"
                            className={styles.addstaffforminputsbox}
                            id="joindate"
                            name="joindate"
                            value={joinDate}
                            onChange={handleJoinDateChange}
                          />
                          <br />
                          <br />
                          <label htmlFor="natureofjob" className={styles.addstafflabel}>
                            Nature of Work
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <select
                            required
                            type="text"
                            className={styles.addstaffforminputsbox}
                            id="natureofjob"
                            name="natureofjob"
                          >
                            <option value="Part-time">Part-time</option>
                            <option value="Full-time">Full-time</option>
                          </select>
                          &nbsp;
                          <br />
                          <label
                            htmlFor="has_contract"
                            className={styles.addstafflabel}
                            style={{ paddingRight: "1rem" }}
                          >
                            Has Contract?
                          </label>
                          <input
                            type="checkbox"
                            id="has_contract"
                            name="has_contract"
                            checked={hasContract}
                            onChange={handleHasContractChange}
                          />
                          <br />
                          <br />
                          {hasContract && (
                            <>
                              <label htmlFor="contract_duration_months" className={styles.addstafflabel}>
                                Duration of Contract
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <input
                                required={hasContract}
                                type="number"
                                min="1"
                                className={styles.addstaffforminputsbox}
                                id="contract_duration_months"
                                name="contract_duration_months"
                                value={contractMonths}
                                onChange={handleContractMonthsChange}
                              />
                              <br />
                              <br />

                              <label
                                htmlFor="contract_end_date"
                                className={styles.addstafflabel}
                                style={{ paddingRight: "1rem" }}
                              >
                                Contract Close Date
                              </label>
                              <input
                                type="text"
                                className={styles.addstaffforminputsbox}
                                id="contract_end_date"
                                name="contract_end_date"
                                readOnly
                                value={contractEndDate}
                              />
                              <br />
                              <br />
                            </>
                          )}
                          <label htmlFor="email" className={styles.addstafflabel}>
                            Official Email
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <input
                            required
                            type="email"
                            id="email"
                            name="email"
                            className={styles.addstaffforminputsbox}
                          />
                          <br />
                          <br />
                          <label
                            htmlFor="trainingprogram1"
                            className={styles.addstafflabel}
                            style={{ paddingRight: "1rem" }}
                          >
                            Training Program 1
                          </label>
                          <select
                            id="trainingprogram1"
                            name="trainingprogram1"
                            className={styles.addstaffforminputsbox}
                            onChange={(e) => updateChoices(e)}
                          >
                            <option></option>
                            {courseOptions1}
                          </select>
                          &nbsp;
                          <br />
                          <br />
                        </section>

                        <section className={styles.addstaffformsec3}>
                          <label
                            htmlFor="trainingprogram2"
                            className={styles.addstafflabel}
                            style={{ paddingRight: "1rem" }}
                          >
                            Training Program 2
                          </label>
                          <select
                            id="trainingprogram2"
                            name="trainingprogram2"
                            className={styles.addstaffforminputsbox}
                            onChange={(e) => updateChoices(e)}
                          >
                            <option></option>
                            {courseOptions2}
                          </select>
                          &nbsp;
                          <br />
                          <br />
                          <label
                            htmlFor="trainingprogram3"
                            className={styles.addstafflabel}
                            style={{ paddingRight: "1rem" }}
                          >
                            Training Program 3
                          </label>
                          <select
                            id="trainingprogram3"
                            name="trainingprogram3"
                            className={styles.addstaffforminputsbox}
                          >
                            <option></option>
                            {courseOptions3}
                          </select>
                          &nbsp;
                          <br />
                          <br />
                          <label htmlFor="role" className={styles.addstafflabel}>
                            Role
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          <select required type="text" className={styles.addstaffforminputsbox} id="role" name="role">
                            <option value="STAFF">Staff</option>
                            <option value="MANAGEMENT">Management</option>
                            <option value="ADMINISTRATOR">Administrator</option>
                            <option value="TELECALLER">Telecaller</option>
                            <option value="TRAINER">Trainer</option>
                            <option value="TRAINERPLUSTELECALLER">Trainer plus Telecaller</option>
                          </select>
                          <br />
                          <br />
                          <label htmlFor="active" className={styles.addstafflabel}>
                            Staff Working Status
                            <span className={styles.requiredelement}>&#42;</span>
                          </label>
                          {/* <input required type='text' className={styles.addstaffforminputsbox} id='active' name='isactive' />&nbsp;<br /> */}
                          <select
                            required
                            type="text"
                            className={styles.addstaffforminputsbox}
                            id="active"
                            name="isactive"
                          >
                            &nbsp;*
                            {/* <option value='0'>0</option>
                            <option value='1'>1</option> */}
                            <option value="A">A</option>
                            <option value="IA">IA</option>
                          </select>
                          <br />
                          <br />
                          <label htmlFor="action" className={styles.addstafflabel} style={{ paddingRight: "1rem" }}>
                            Action
                          </label>
                          <input type="text" className={styles.addstaffforminputsbox} id="action" name="action" />
                          <br />
                          <br />
                          <br />
                          <input type="reset" value="Reset" className={styles.staffformbutton} />
                          <br />
                          <br />
                          <button type="submit" className={styles.staffformbutton}>
                            SUBMIT
                          </button>
                        </section>
                      </form>
                    </div>
                  ) : (
                    <Button {...createAccessibleButtonProps(() => setShowForm(true))} text={"+ New VA Staff"}></Button>
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
                    autoSizeStrategy={{ type: "fitCellContents" }}
                    columnDefs={getUsersColumnDefs(handleDelete, designationOptions)}
                    defaultColDef={{
                      comparator: smartComparator,
                      filter: true,
                      resizable: true,
                      editable: canEditStaff,
                      cellRenderer,
                      cellClass: (params) =>
                        canEditStaff && params.colDef.field !== "delete" && params.colDef.editable !== false
                          ? styles.gridCellEditable
                          : undefined,
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
                    // Use cell-level editing so only the clicked cell is focused/edited.
                    editType="cell"
                    ensureDomOrder={true}
                    singleClickEdit={true}
                    stopEditingWhenCellsLoseFocus={true}
                    suppressScrollOnNewData={true}
                    getRowId={(p) => String(p.data?.id)}
                    immutableData={true}
                    suppressAnimationFrame={true}
                    rowBuffer={40}
                    suppressRowTransform={true}
                    suppressHydrationWarning={true}
                    suppressColumnVirtualisation={true}
                    loading={loading}
                    rowData={rowData}
                    onCellValueChanged={onCellValueChanged}
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
                      colId: "name",
                    }}
                  />
                </div>
              )}
            </div>
          </main>
          <style jsx>{`
            /* main area top blank space removal + margin overlap prevention */
            .pageMain {
              margin-top: 0 !important;
              padding-top: 4px; /* 1~4px gives h1 margin no longer overlaps */
            }
            /* default top margin removal */
            .pageTitle {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }
          `}</style>
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
                    Powered by{" "}
                    <Image src='/vercel.svg'
                      alt='Vercel Logo'
                      width={72}
                      height={16} />
                  </span>
                </a>
              </footer> */}
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
