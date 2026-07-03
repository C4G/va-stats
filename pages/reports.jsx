"use client";
import Navbar from "@/components/Navbar";
import styles from "@/styles/Home.module.css";
import reportStyles from "@/styles/Reports.module.css";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { getUserEmail } from "@/utils/session-helpers";
import { generateBatchStatusReport } from "@/utils/generate-batch-status-report";
import {
  fetchUserData,
  fetchBatches,
  fetchBatchDetails,
  filterBatchesByDateRange,
  quarterToDateRange,
} from "@/utils/batch-data-helper";
import { generateBatchReportCSV, generateStudentDataReportCSV, downloadCSV } from "@/utils/csv-generation-helper";
import PageTitleWithUserGuideLink from "@/components/PageTitleWithUserGuideLink";

export const metadata = {
  title: "Reports - Vision-Aid-STATS",
  description: "Download batch reports from Vision-Aid STATS",
};

export default function Reports() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/");
    },
  });

  // Universal keyboard handler for buttons
  const handleKeyDown = (event, action) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  const createAccessibleButtonProps = (onClickHandler) => ({
    onClick: onClickHandler,
    onKeyDown: (e) => handleKeyDown(e, onClickHandler),
  });

  // State
  const [dateRange, setDateRange] = useState("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quarter, setQuarter] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [userResponse, setUserResponse] = useState(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [reportType, setReportType] = useState("range");
  const [singleBatchId, setSingleBatchId] = useState("");
  const [allBatches, setAllBatches] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [batchSearchInput, setBatchSearchInput] = useState("");
  const [activeBatchField, setActiveBatchField] = useState("name");
  const dropdownRef = useRef(null);
  const dropdownIdRef = useRef(null);

  const [programManagers, setProgramManagers] = useState([]);
  const [selectedPM, setSelectedPM] = useState("");
  const [pmDateRangeType, setPmDateRangeType] = useState("custom");
  const [pmStartDate, setPmStartDate] = useState("");
  const [pmEndDate, setPmEndDate] = useState("");
  const [pmQuarter, setPmQuarter] = useState("");
  const [pmYear, setPmYear] = useState(new Date().getFullYear());

  const years = Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i);

  // Fetch user data
  const getUserData = useCallback(async () => {
    const userEmail = getUserEmail(session);
    if (!userEmail) return;

    setContentLoading(true);
    try {
      const userData = await fetchUserData(userEmail);
      setUserResponse(userData);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
    setContentLoading(false);
  }, [session]);

  // Fetch program managers
  // ...existing code...
  const fetchProgramManagers = useCallback(async () => {
    try {
      const response = await fetch("/api/getusersdata");
      const data = await response.json();
      // Filter only active program managers (case-insensitive)
      const pms = data.users
        .filter((user) => user.isactive && user.designation.toLowerCase().includes("program"))
        .map((user) => user.name);
      setProgramManagers(pms);
    } catch (error) {
      console.error("Error fetching program managers:", error);
    }
  }, []);
  // ...existing code...

  // Fetch batches for dropdown
  const loadBatches = useCallback(async () => {
    if (!userResponse) return;

    try {
      const batches = await fetchBatches(userResponse.role, userResponse.name);
      setAllBatches(batches);
      setFilteredBatches(batches);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  }, [userResponse]);

  // Handle batch search
  const handleBatchSearchChange = (value, field) => {
    if (field === "name") {
      setBatchSearchInput(value);
    } else if (field === "id") {
      setSingleBatchId(value);
    }

    if (value.trim() === "") {
      setFilteredBatches(allBatches);
      setShowDropdown(false);
      return;
    }

    const filtered = allBatches.filter((batch) => {
      const nameMatch = batch.batch.toLowerCase().includes(value.toLowerCase());
      const idMatch = batch.id.toString().includes(value);
      return field === "name" ? nameMatch || idMatch : idMatch;
    });

    setFilteredBatches(filtered);
    setShowDropdown(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideName = dropdownRef.current && !dropdownRef.current.contains(event.target);
      const clickedOutsideId = dropdownIdRef.current && !dropdownIdRef.current.contains(event.target);

      if (clickedOutsideName && clickedOutsideId) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Download single batch report
  const handleDownloadSingleBatch = async (e) => {
    e.preventDefault();

    if (!singleBatchId) {
      alert("⚠️ Please provide a Batch ID.");
      return;
    }

    setLoading(true);
    try {
      await generateBatchStatusReport(singleBatchId, "", "");
    } catch (error) {
      console.error("Error generating single batch report:", error);
      alert("Failed to download report. Ensure the Batch ID is correct.");
    } finally {
      setLoading(false);
    }
  };

  // Download student data report
  const handleDownloadStudentData = async (e) => {
    setLoading(true);
    e.preventDefault();

    if ((dateRange === "custom" && (!startDate || !endDate)) || (dateRange === "quarter" && (!quarter || !year))) {
      alert("⚠️ Please select a valid date range before downloading student data.");
      setLoading(false);
      return;
    }

    try {
      const { startDate: queryStartDate, endDate: queryEndDate } =
        dateRange === "quarter" ? quarterToDateRange(quarter, year) : { startDate, endDate };

      const batches = await fetchBatches(userResponse.role, userResponse.name);
      const batchIdToNameMap = {};
      const rangeStart = new Date(queryStartDate).getTime();
      const rangeEnd = new Date(queryEndDate).getTime();

      const filteredBatchIds = batches
        .filter((batch) => {
          const start = new Date(batch.coursestart).getTime();
          const match = start >= rangeStart && start <= rangeEnd;
          if (match) {
            batchIdToNameMap[batch.id] = batch.batch;
          }
          return match;
        })
        .map((batch) => batch.id);

      if (filteredBatchIds.length === 0) {
        alert("No batches found for the selected date range.");
        setLoading(false);
        return;
      }

      const csvContent = await generateStudentDataReportCSV(filteredBatchIds, batchIdToNameMap, fetchBatchDetails);

      const filename = `student_data_${queryStartDate}_to_${queryEndDate}.csv`.replace(/\s+/g, "_");
      downloadCSV(filename, csvContent);
    } catch (error) {
      console.error("Error generating student data report:", error);
      alert("Failed to download student data report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Download batch report
  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();

    if ((dateRange === "custom" && (!startDate || !endDate)) || (dateRange === "quarter" && (!quarter || !year))) {
      alert("⚠️ Please select a valid date range before downloading.");
      setLoading(false);
      return;
    }

    try {
      const { startDate: queryStartDate, endDate: queryEndDate } =
        dateRange === "quarter" ? quarterToDateRange(quarter, year) : { startDate, endDate };

      const response = await fetch(
        `/api/getBatchesWithEnrollCount?startDate=${queryStartDate}&endDate=${queryEndDate}&includeDetails=true&includeEmpty=true`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch report batches");
      }

      const data = await response.json();

      const filteredBatches = data.batches || [];

      if (filteredBatches.length === 0) {
        alert("No batches found for the selected date range.");
        setLoading(false);
        return;
      }

      const csvContent = await generateBatchReportCSV(filteredBatches);
      const filename = `batch_report_${queryStartDate}_to_${queryEndDate}.csv`.replace(/\s+/g, "_");
      downloadCSV(filename, csvContent);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to download report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Download program manager report
  const handleDownloadPMReport = async (e) => {
    setLoading(true);
    e.preventDefault();

    if (!selectedPM) {
      alert("⚠️ Please select a program manager.");
      setLoading(false);
      return;
    }

    if (pmDateRangeType === "custom") {
      if (!pmStartDate || !pmEndDate) {
        alert("⚠️ Please select both Start Date and End Date.");
        setLoading(false);
        return;
      }
      if (new Date(pmStartDate) > new Date(pmEndDate)) {
        alert("⚠️ Start Date cannot be later than End Date.");
        setLoading(false);
        return;
      }
    } else {
      if (!pmQuarter || !pmYear) {
        alert("⚠️ Please select Year and Quarter.");
        setLoading(false);
        return;
      }
    }
    try {
      const { startDate: queryStartDate, endDate: queryEndDate } =
        pmDateRangeType === "quarter"
          ? quarterToDateRange(pmQuarter, pmYear)
          : { startDate: pmStartDate, endDate: pmEndDate };

      const batches = await fetchBatches(userResponse.role, userResponse.name);
      const pmBatches = batches.filter((batch) => batch.PM === selectedPM);
      const filteredBatches = filterBatchesByDateRange(pmBatches, queryStartDate, queryEndDate);

      if (filteredBatches.length === 0) {
        alert("No batches found for the selected program manager and date range.");
        setLoading(false);
        return;
      }

      const csvContent = await generateBatchReportCSV(filteredBatches);
      const filename =
        pmDateRangeType === "quarter"
          ? `pm_report_${selectedPM.replace(/\s+/g, "_")}_${pmYear}_${pmQuarter}.csv`
          : `pm_report_${selectedPM.replace(/\s+/g, "_")}_${queryStartDate}_to_${queryEndDate}.csv`;

      downloadCSV(filename, csvContent);
    } catch (error) {
      console.error("Error generating PM report:", error);
      alert("Failed to download report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      getUserData();
      fetchProgramManagers();
    }
  }, [session, getUserData, fetchProgramManagers]);

  useEffect(() => {
    if (userResponse && reportType === "single") {
      loadBatches();
    }
  }, [userResponse, reportType, loadBatches]);

  if (status === "loading" || contentLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.overlay}>
          <span className={styles.customLoader}></span>
        </div>
      </div>
    );
  }

  const allowedRoles = ["ADMINISTRATOR", "MANAGEMENT", "TRAINER", "TRAINERPLUSTELECALLER"];
  if (!userResponse || !allowedRoles.includes(userResponse.role)) {
    return (
      <div className="autherrorcontainer">
        <Image alt={"VisionAid logo"} src={"/images/logo-mainsite.png?v=20251004"} height={100} width={150} />
        <span className="autherrortext">
          Access denied.&nbsp;
          <Link href="/" className="autherrorlink">
            Please try another account.
          </Link>
        </span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Reports - Vision-Aid-STATS</title>
        <meta name="description" content="Download batch reports from Vision-Aid STATS" />
      </Head>
      <div className={styles.mynavbar}>
        <span className={styles.skip}>
          <a href="#maincontent" className="skip" onClick={() => document.getElementById("maincontent")?.focus()}>
            Skip to main content
          </a>
        </span>
        <Navbar user_role={userResponse.role} className={styles.navstudents} />
      </div>
      <main className={`mx-auto flex flex-col ${reportStyles.mainContent}`} id="maincontent" tabIndex={-1}>
        {loading && (
          <div className={styles.overlay}>
            <span className={styles.customLoader}></span>
          </div>
        )}

        <div className={styles.description}>
          <div className={styles.description}>
            <div className={reportStyles.toggleSection}>
              <label className={reportStyles.toggleLabel}>
                <input
                  type="radio"
                  name="reportOption"
                  checked={reportType === "range"}
                  onChange={() => setReportType("range")}
                  className={reportStyles.toggleRadio}
                />
                Date Range Reports
              </label>

              <label className={reportStyles.toggleLabel}>
                <input
                  type="radio"
                  name="reportOption"
                  checked={reportType === "single"}
                  onChange={() => setReportType("single")}
                  className={reportStyles.toggleRadio}
                />
                Single Batch Report
              </label>

              <label className={reportStyles.toggleLabel}>
                <input
                  type="radio"
                  name="reportOption"
                  checked={reportType === "pm"}
                  onChange={() => setReportType("pm")}
                  className={reportStyles.toggleRadio}
                />
                Program Manager Reports
              </label>
            </div>
          </div>

          {reportType === "range" ? (
            <>
              <PageTitleWithUserGuideLink section_title="Date Range Batch Reports" titleStyling={false} />
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>
                    Select Date Range Type:
                    <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.select}>
                      <option value="custom">Custom Date Range</option>
                      <option value="quarter">Quarter</option>
                    </select>
                  </label>
                </div>

                {dateRange === "custom" ? (
                  <>
                    <div className={styles.formGroup}>
                      <label>
                        Start Date:
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                          className={styles.input}
                        />
                      </label>
                    </div>
                    <div className={styles.formGroup}>
                      <label>
                        End Date:
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          required
                          className={styles.input}
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.formGroup}>
                      <label>
                        Year:
                        <select
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          className={styles.select}
                          required
                        >
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className={styles.formGroup}>
                      <label>
                        Quarter:
                        <select
                          value={quarter}
                          onChange={(e) => setQuarter(e.target.value)}
                          className={styles.select}
                          required
                        >
                          <option value="">Select Quarter</option>
                          <option value="Q1">Q1 (Jan-Mar)</option>
                          <option value="Q2">Q2 (Apr-Jun)</option>
                          <option value="Q3">Q3 (Jul-Sep)</option>
                          <option value="Q4">Q4 (Oct-Dec)</option>
                        </select>
                      </label>
                    </div>
                  </>
                )}
                <div className={reportStyles.buttonContainer}>
                  <button type="submit" className={styles.button} disabled={loading}>
                    {loading ? "Downloading..." : "Download Batch Report"}
                  </button>
                  <button
                    type="button"
                    className={styles.button}
                    {...createAccessibleButtonProps(handleDownloadStudentData)}
                    disabled={loading}
                  >
                    {loading ? "Preparing Student Data..." : "Download Student Report"}
                  </button>
                </div>
              </form>
            </>
          ) : reportType === "single" ? (
            <>
              <PageTitleWithUserGuideLink section_title="Single Batch Report" titleStyling={false} />
              <form onSubmit={handleDownloadSingleBatch} className={styles.form}>
                <div className={reportStyles.inlineFormRow}>
                  <div className={`${styles.formGroup} ${reportStyles.dropdownContainer}`} ref={dropdownRef}>
                    <label>
                      Batch Name:
                      <input
                        type="text"
                        value={batchSearchInput}
                        onChange={(e) => {
                          setActiveBatchField("name");
                          handleBatchSearchChange(e.target.value, "name");
                        }}
                        onFocus={() => {
                          setActiveBatchField("name");
                          if (batchSearchInput.trim() !== "") {
                            setShowDropdown(true);
                          }
                        }}
                        className={styles.input}
                        autoComplete="off"
                      />
                    </label>

                    {activeBatchField === "name" && showDropdown && filteredBatches.length > 0 && (
                      <div className={reportStyles.dropdownMenu}>
                        {filteredBatches.map((batch) => (
                          <div
                            key={batch.id}
                            onClick={() => handleBatchSelect(batch)}
                            className={reportStyles.dropdownItem}
                          >
                            <div className={reportStyles.dropdownItemTitle}>{batch.batch}</div>
                            <div className={reportStyles.dropdownItemSubtitle}>
                              ID: {batch.id} • {batch.coursename}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeBatchField === "name" &&
                      showDropdown &&
                      filteredBatches.length === 0 &&
                      batchSearchInput.trim() !== "" && <div className={reportStyles.noResults}>No batches found</div>}
                  </div>

                  <div className={`${styles.formGroup} ${reportStyles.dropdownContainer}`} ref={dropdownIdRef}>
                    <label>
                      Batch ID:
                      <input
                        type="text"
                        value={singleBatchId}
                        onChange={(e) => {
                          setActiveBatchField("id");
                          handleBatchSearchChange(e.target.value, "id");
                        }}
                        onFocus={() => {
                          setActiveBatchField("id");
                          if (singleBatchId.trim() !== "") {
                            setShowDropdown(true);
                          }
                        }}
                        className={styles.input}
                        required
                      />
                    </label>
                    {activeBatchField === "id" && showDropdown && filteredBatches.length > 0 && (
                      <div className={reportStyles.dropdownMenu}>
                        {filteredBatches.map((batch) => (
                          <div
                            key={batch.id}
                            onClick={() => handleBatchSelect(batch)}
                            className={reportStyles.dropdownItem}
                          >
                            <div className={reportStyles.dropdownItemTitle}>{batch.id}</div>
                            <div className={reportStyles.dropdownItemSubtitle}>
                              Name: {batch.batch} • {batch.coursename}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeBatchField === "id" &&
                      showDropdown &&
                      filteredBatches.length === 0 &&
                      singleBatchId.trim() !== "" && <div className={reportStyles.noResults}>No batches found</div>}
                  </div>
                </div>

                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? "Downloading..." : "Download Single Batch Report"}
                </button>
              </form>
            </>
          ) : reportType === "pm" ? (
            <>
              <PageTitleWithUserGuideLink section_title="Program Manager Report" titleStyling={false} />
              <form onSubmit={handleDownloadPMReport} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>
                    Select Program Manager:
                    <select
                      value={selectedPM}
                      onChange={(e) => setSelectedPM(e.target.value)}
                      className={styles.select}
                      required
                    >
                      <option value="">Select Program Manager</option>
                      {programManagers.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label>
                    Select Date Range Type:
                    <select
                      value={pmDateRangeType}
                      onChange={(e) => setPmDateRangeType(e.target.value)}
                      className={styles.select}
                    >
                      <option value="custom">Custom Date Range</option>
                      <option value="quarter">Quarter</option>
                    </select>
                  </label>
                </div>

                {pmDateRangeType === "custom" ? (
                  <>
                    <div className={styles.formGroup}>
                      <label>
                        Start Date:
                        <input
                          type="date"
                          value={pmStartDate}
                          onChange={(e) => setPmStartDate(e.target.value)}
                          required
                          className={styles.input}
                        />
                      </label>
                    </div>

                    <div className={styles.formGroup}>
                      <label>
                        End Date:
                        <input
                          type="date"
                          value={pmEndDate}
                          onChange={(e) => setPmEndDate(e.target.value)}
                          min={pmStartDate || undefined}
                          required
                          className={styles.input}
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.formGroup}>
                      <label>
                        Year:
                        <select
                          value={pmYear}
                          onChange={(e) => setPmYear(e.target.value)}
                          className={styles.select}
                          required
                        >
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className={styles.formGroup}>
                      <label>
                        Quarter:
                        <select
                          value={pmQuarter}
                          onChange={(e) => setPmQuarter(e.target.value)}
                          className={styles.select}
                          required
                        >
                          <option value="">Select Quarter</option>
                          <option value="Q1">Q1 (Jan-Mar)</option>
                          <option value="Q2">Q2 (Apr-Jun)</option>
                          <option value="Q3">Q3 (Jul-Sep)</option>
                          <option value="Q4">Q4 (Oct-Dec)</option>
                        </select>
                      </label>
                    </div>
                  </>
                )}

                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? "Downloading..." : "Download Program Manager Report"}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
