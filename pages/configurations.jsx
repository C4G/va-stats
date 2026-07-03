import { useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import GlobalSnackbar from "@/components/GlobalSnackbar";
import ConfirmationModal from "@/components/ConfirmationModal";
import PageTitleWithUserGuideLink from "@/components/PageTitleWithUserGuideLink";
import DashboardSettingsPanel from "@/components/DashboardSettingsPanel";
import styles from "@/styles/Home.module.css";
import configStyles from "@/styles/Configurations.module.css";
import { mergeBatchStatusDerivedRules } from "@/utils/batch-status-derived";
import { canAccessConfigurationsPage } from "@/utils/configurations-access";

/** API option rows + current rule strings so invalid/orphan values still appear until fixed. */
function buildSelectValues(apiOptions, currentStrings) {
  const fromApi = (apiOptions ?? []).map((o) => (typeof o?.value === "string" ? o.value.trim() : "")).filter(Boolean);
  const seen = new Set(fromApi);
  for (const s of currentStrings) {
    const t = typeof s === "string" ? s.trim() : "";
    if (t && !seen.has(t)) {
      fromApi.push(t);
      seen.add(t);
    }
  }
  return fromApi;
}

const CONFIG_KEYS = [
  {
    key: "staff_designation",
    label: "Staff Designation",
  },
  {
    key: "certification_eligibility",
    label: "Certification Eligibility (Batch Status)",
  },
  {
    key: "completion_status",
    label: "Completion Status (Batch Status)",
  },
];

const DEFAULT_VALUES_BY_KEY = {
  staff_designation: [
    "Trainer",
    "Teaching Assistant",
    "Program Coordinator",
    "Telecaller",
    "Training Coordinator",
    "Program Manager",
    "Sr. Trainer",
    "L & D Executive",
    "Head of Training",
  ],
  certification_eligibility: ["Completion Certificate", "Participation Certificate", "Not Eligible", "Ineligible"],
  completion_status: ["Completed", "Incomplete", "Drop Out"],
};

const HASH_DROPDOWN = "dropdown-values";
const HASH_BATCH = "batch-status-rules";
const HASH_DASHBOARD = "dashboard";

function getSectionFromHash() {
  if (typeof window === "undefined") return "dashboard";
  const h = (window.location.hash || "").replace(/^#/, "");
  if (h === HASH_BATCH) return "batch";
  if (h === HASH_DROPDOWN) return "dropdown";
  if (h === HASH_DASHBOARD) return "dashboard";
  return "dashboard";
}

export default function ConfigurationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const courseFromQuery = useMemo(() => {
    if (!router.isReady) return "";
    const q = router.query.course;
    return typeof q === "string" ? q.trim() : "";
  }, [router.isReady, router.query.course]);

  const userRole = session?.user?.role;
  const isAuthorized = status !== "unauthenticated" && canAccessConfigurationsPage(userRole);

  const [selectedKey, setSelectedKey] = useState(CONFIG_KEYS[0].key);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const [rulesForm, setRulesForm] = useState(() => mergeBatchStatusDerivedRules(null));
  /** Last successfully loaded or saved rules; used to revert the form if save fails. */
  const [rulesBaseline, setRulesBaseline] = useState(() => mergeBatchStatusDerivedRules(null));
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [certRuleOptions, setCertRuleOptions] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");

  const [addValue, setAddValue] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmValueToDelete, setConfirmValueToDelete] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");

  const setConfigurationSection = useCallback((section) => {
    setActiveSection(section);
    if (typeof window === "undefined") return;
    const nextHash = section === "batch" ? HASH_BATCH : section === "dashboard" ? HASH_DASHBOARD : HASH_DROPDOWN;
    const { pathname, search } = window.location;
    const next = `${pathname}${search}#${nextHash}`;
    window.history.replaceState(null, "", next);
  }, []);

  const handleDashboardConfigNotify = useCallback((message, severity) => {
    setSnackbarSeverity(severity === "error" ? "error" : "success");
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  }, []);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/configurations/dropdownOptions?key=${encodeURIComponent(selectedKey)}`);
      if (!res.ok) throw new Error(`Failed to fetch options: ${res.status}`);
      const data = await res.json();
      setOptions(Array.isArray(data?.options) ? data.options : []);
    } catch (e) {
      console.error("fetchOptions error:", e);
      setSnackbarSeverity("error");
      setSnackbarMessage("Failed to load dropdown options");
      setSnackbarOpen(true);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedKey]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    if (!router.isReady) return;
    setActiveSection(getSectionFromHash());
  }, [router.isReady, router.asPath]);

  useEffect(() => {
    if (!router.isReady) return;
    const onHashChange = () => {
      setActiveSection(getSectionFromHash());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [router.isReady]);

  useEffect(() => {
    if (!isAuthorized || !router.isReady) return;
    let cancelled = false;
    const loadCourses = async () => {
      try {
        const res = await fetch("/api/getcoursesdata");
        if (!res.ok) throw new Error(`Failed to load courses: ${res.status}`);
        const data = await res.json();
        const courses = Array.isArray(data?.courses)
          ? data.courses.map((c) => (typeof c?.course === "string" ? c.course.trim() : "")).filter(Boolean)
          : [];
        if (!cancelled) {
          setCourseOptions(courses);
          setSelectedCourse((prev) => {
            if (courseFromQuery && courses.includes(courseFromQuery)) return courseFromQuery;
            if (prev && courses.includes(prev)) return prev;
            return courses[0] || "";
          });
        }
      } catch (e) {
        console.error("loadCourses error:", e);
        if (!cancelled) setCourseOptions([]);
      }
    };
    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [isAuthorized, router.isReady, courseFromQuery]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (!selectedCourse) {
      setRulesLoading(false);
      const def = mergeBatchStatusDerivedRules(null);
      setRulesForm(def);
      setRulesBaseline(def);
      return;
    }
    let cancelled = false;
    const loadRules = async () => {
      setRulesLoading(true);
      try {
        const res = await fetch(`/api/configurations/batchStatusRules?course=${encodeURIComponent(selectedCourse)}`);
        if (!res.ok) throw new Error(`Failed to load rules: ${res.status}`);
        const data = await res.json();
        if (!cancelled && data?.rules) {
          const merged = mergeBatchStatusDerivedRules(data.rules);
          setRulesForm(merged);
          setRulesBaseline(merged);
        }
      } catch (e) {
        console.error("loadRules error:", e);
        if (!cancelled) {
          const def = mergeBatchStatusDerivedRules(null);
          setRulesForm(def);
          setRulesBaseline(def);
        }
      } finally {
        if (!cancelled) setRulesLoading(false);
      }
    };
    loadRules();
    return () => {
      cancelled = true;
    };
  }, [isAuthorized, selectedCourse]);

  const loadRuleDropdownOptions = useCallback(async () => {
    try {
      const certRes = await fetch("/api/configurations/dropdownOptions?key=certification_eligibility");
      const certData = certRes.ok ? await certRes.json() : { options: [] };
      setCertRuleOptions(Array.isArray(certData?.options) ? certData.options : []);
    } catch (e) {
      console.error("loadRuleDropdownOptions error:", e);
      setCertRuleOptions([]);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    loadRuleDropdownOptions();
  }, [isAuthorized, loadRuleDropdownOptions]);

  const certificationSelectValues = useMemo(
    () =>
      buildSelectValues(certRuleOptions, [
        rulesForm.certification.dropoutOrDropAttendanceLabel,
        rulesForm.certification.bothMetLabel,
        rulesForm.certification.oneMetLabel,
        rulesForm.certification.defaultNotEligibleLabel,
      ]),
    [certRuleOptions, rulesForm.certification]
  );

  const resetAddForm = () => {
    setAddValue("");
  };

  const isDefaultOption = useCallback(
    (value) => {
      const normalizedValue = typeof value === "string" ? value.trim() : "";
      if (!normalizedValue) return false;
      return (DEFAULT_VALUES_BY_KEY[selectedKey] ?? []).includes(normalizedValue);
    },
    [selectedKey]
  );

  const handleAdd = async () => {
    const value = addValue.trim();
    if (!value) return;

    const alreadyExists = options.some(
      (opt) => typeof opt?.value === "string" && opt.value.trim().toLowerCase() === value.toLowerCase()
    );
    if (alreadyExists) {
      setSnackbarSeverity("error");
      setSnackbarMessage(`"${value}" already exists in this dropdown.`);
      setSnackbarOpen(true);
      return;
    }

    const response = await fetch("/api/configurations/addDropdownOption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: selectedKey,
        value,
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errData = await response.json().catch(() => null);
        setSnackbarSeverity("error");
        setSnackbarMessage(errData?.message ?? "Failed to add option");
      } else {
        setSnackbarSeverity("error");
        setSnackbarMessage("Failed to add option");
      }
      setSnackbarOpen(true);
      return;
    }

    setSnackbarSeverity("success");
    setSnackbarMessage("Option added successfully");
    setSnackbarOpen(true);
    resetAddForm();
    await fetchOptions();
    await loadRuleDropdownOptions();
  };

  const handleRequestDelete = (opt) => {
    setConfirmValueToDelete(opt);
    const display = opt?.value ?? opt?.label ?? "";
    setConfirmTitle(`Delete "${display}"?`);
    setConfirmOpen(true);
  };

  const patchCertificationField = (field, value) => {
    setRulesForm((prev) => ({
      ...prev,
      certification: { ...prev.certification, [field]: value },
    }));
  };

  const persistBatchStatusRules = async (rulesToSave, successMessage) => {
    setRulesSaving(true);
    try {
      const res = await fetch("/api/configurations/batchStatusRules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rulesToSave, courseName: selectedCourse }),
      });
      const contentType = res.headers.get("content-type");
      const body = contentType?.includes("application/json") ? await res.json().catch(() => null) : null;
      if (!res.ok) {
        setRulesForm(mergeBatchStatusDerivedRules(rulesBaseline));
        setSnackbarSeverity("error");
        setSnackbarMessage(body?.message ?? "Failed to save rules");
        setSnackbarOpen(true);
        return;
      }
      if (body?.rules) {
        const merged = mergeBatchStatusDerivedRules(body.rules);
        setRulesForm(merged);
        setRulesBaseline(merged);
      }
      setSnackbarSeverity("success");
      setSnackbarMessage(successMessage);
      setSnackbarOpen(true);
    } catch (e) {
      console.error("persistBatchStatusRules:", e);
      setRulesForm(mergeBatchStatusDerivedRules(rulesBaseline));
      setSnackbarSeverity("error");
      setSnackbarMessage("Failed to save rules");
      setSnackbarOpen(true);
    } finally {
      setRulesSaving(false);
    }
  };

  const handleSaveBatchStatusRules = async () => {
    await persistBatchStatusRules(rulesForm, "Batch status rules saved");
  };

  const handleResetBatchStatusRules = async () => {
    const defaultRules = mergeBatchStatusDerivedRules(null);
    const nextRules = {
      ...rulesForm,
      certification: defaultRules.certification,
    };
    setRulesForm(nextRules);
    await persistBatchStatusRules(nextRules, "Batch status formula reset to defaults");
  };

  const handleConfirmDelete = async () => {
    if (!confirmValueToDelete) return;

    const response = await fetch("/api/configurations/deleteDropdownOption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: selectedKey, value: confirmValueToDelete.value }),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errData = await response.json().catch(() => null);
        setSnackbarSeverity("error");
        setSnackbarMessage(errData?.message ?? "Failed to delete option");
      } else {
        setSnackbarSeverity("error");
        setSnackbarMessage("Failed to delete option");
      }
      setSnackbarOpen(true);
      setConfirmOpen(false);
      return;
    }

    setConfirmOpen(false);
    setConfirmValueToDelete(null);
    setSnackbarSeverity("success");
    setSnackbarMessage("Option deleted successfully");
    setSnackbarOpen(true);
    await fetchOptions();
    await loadRuleDropdownOptions();
  };

  if (status === "unauthenticated") {
    return (
      <div className="autherrorcontainer">
        <Head>
          <title>Configurations - Vision-Aid-STATS</title>
        </Head>
        <p className="autherrortext">Access denied. Please sign in.</p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className={styles.overlay} role="status" aria-live="polite" aria-busy="true">
        <span className={styles.customLoader}></span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="autherrorcontainer">
        <Head>
          <title>Configurations - Vision-Aid-STATS</title>
        </Head>
        <p className="autherrortext">Not authorized. Please try another account.</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Configurations - Vision-Aid-STATS</title>
        <meta
          name="description"
          content="Manage dropdown options, batch status rules, and dashboard section visibility in Vision-Aid."
        />
      </Head>

      <div className={styles.container}>
        <div className={styles.mynavbar}>
          <a href="#maincontent" className="skip" onClick={() => document.getElementById("maincontent")?.focus()}>
            Skip to main content
          </a>
          <Navbar user_role={userRole} className={styles.navstudents} />
        </div>
        <PageTitleWithUserGuideLink section_title="Configurations" />

        <main
          id="maincontent"
          className="page-main"
          style={{ paddingLeft: 0, paddingRight: 0 }}
          aria-label="Configurations"
        >
          <div className={configStyles.container}>
            <div className={configStyles.configPageShell}>
              <nav className={configStyles.sideNav} aria-label="Configuration sections">
                <ul className={configStyles.sideNavList}>
                  <li>
                    <button
                      type="button"
                      className={
                        activeSection === "dashboard"
                          ? `${configStyles.sideNavButton} ${configStyles.sideNavButtonActive}`
                          : configStyles.sideNavButton
                      }
                      onClick={() => setConfigurationSection("dashboard")}
                      aria-current={activeSection === "dashboard" ? "true" : undefined}
                    >
                      Dashboard Settings
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={
                        activeSection === "dropdown"
                          ? `${configStyles.sideNavButton} ${configStyles.sideNavButtonActive}`
                          : configStyles.sideNavButton
                      }
                      onClick={() => setConfigurationSection("dropdown")}
                      aria-current={activeSection === "dropdown" ? "true" : undefined}
                    >
                      Manage Dropdowns
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={
                        activeSection === "batch"
                          ? `${configStyles.sideNavButton} ${configStyles.sideNavButtonActive}`
                          : configStyles.sideNavButton
                      }
                      onClick={() => setConfigurationSection("batch")}
                      aria-current={activeSection === "batch" ? "true" : undefined}
                    >
                      Batch Status
                    </button>
                  </li>
                </ul>
              </nav>

              <div className={configStyles.configContent}>
                {activeSection === "dashboard" ? (
                  <div className={configStyles.dashboardConfigSection} id="dashboard">
                    <div className={configStyles.sectionTitle}>Dashboard Settings</div>
                    <p className={configStyles.helpText} style={{ marginTop: 0 }}>
                      Show or hide sections on the main statistics dashboard. Changes apply in this browser; use Save to
                      persist, or Reset to restore defaults.
                    </p>
                    <DashboardSettingsPanel onNotify={handleDashboardConfigNotify} />
                  </div>
                ) : null}

                {activeSection === "dropdown" ? (
                  <div className={configStyles.card} id="dropdown-values">
                    <div className={configStyles.sectionTitle}>Manage Dropdowns</div>

                    <div className={configStyles.formRow}>
                      <label htmlFor="configKey" style={{ fontWeight: 600 }}>
                        Manage:
                      </label>
                      <select
                        id="configKey"
                        className={configStyles.input}
                        value={selectedKey}
                        onChange={(e) => setSelectedKey(e.target.value)}
                      >
                        {CONFIG_KEYS.map((k) => (
                          <option key={k.key} value={k.key}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ height: 14 }} />

                    {loading ? (
                      <div className={styles.overlay} role="status" aria-live="polite" aria-busy="true">
                        <span className={styles.customLoader}></span>
                      </div>
                    ) : (
                      <div className={configStyles.splitLayout}>
                        <div className={configStyles.panel}>
                          <div className={configStyles.sectionTitle}>Current values</div>
                          <div className={configStyles.optionList} aria-label="Configured dropdown options">
                            {options.length === 0 ? (
                              <div style={{ color: "rgba(0,0,0,0.6)" }}>No options configured.</div>
                            ) : (
                              options.map((opt) => (
                                <div key={opt.value} className={configStyles.optionRow}>
                                  <div className={configStyles.optionMeta}>
                                    <div className={configStyles.optionLabel}>
                                      {opt.value}
                                      {isDefaultOption(opt.value) ? (
                                        <span style={{ color: "#2e7d32", fontWeight: 700, marginLeft: 8 }}>
                                          [Default]
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className={configStyles.btnDanger}
                                    onClick={() => handleRequestDelete(opt)}
                                    disabled={loading}
                                    aria-label={`Delete option ${opt?.value ?? opt?.label ?? ""}`}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className={configStyles.panel}>
                          <div className={configStyles.sectionTitle}>Add a new option</div>
                          <div className={configStyles.formRow}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label htmlFor="configAddValue" style={{ fontWeight: 600 }}>
                                Value
                              </label>
                              <input
                                id="configAddValue"
                                className={configStyles.input}
                                value={addValue}
                                onChange={(e) => setAddValue(e.target.value)}
                                placeholder="e.g. Other"
                              />
                            </div>

                            <button
                              type="button"
                              className={configStyles.btnPrimary}
                              onClick={handleAdd}
                              disabled={loading}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {activeSection === "batch" ? (
                  <div id="batch-status-rules" className={configStyles.batchStatusSection}>
                    <div className={configStyles.sectionTitle}>Batch Status</div>
                    <p className={configStyles.helpText}>
                      As an administrator, you define how the app sets certification eligibility on a batch when it is
                      not already saved. Use the rules below together with the label options from &quot;Certification
                      Eligibility (Batch Status)&quot; in the &quot;Dropdown values&quot; section. Grade and attendance
                      are compared the same way as elsewhere: strictly greater than the numbers you enter (defaults:
                      grade above 60 and attendance % above 50). These settings are stored per course.
                    </p>
                    {rulesLoading ? (
                      <div className={styles.overlay} role="status" aria-live="polite" aria-busy="true">
                        <span className={styles.customLoader}></span>
                      </div>
                    ) : (
                      <div className={configStyles.rulesGrid}>
                        <div className={configStyles.batchStatusLayout}>
                          <div className={configStyles.card}>
                            <div className={configStyles.cardSectionTitle}>Certification Eligibility</div>
                            <p className={configStyles.cardHelpText}>
                              Per course. Pick a course, then set grade and attendance thresholds and labels.
                            </p>
                            <div className={configStyles.rulesCardInner}>
                              <label className={configStyles.rulesLabel}>
                                Course
                                <select
                                  id="ruleCourse"
                                  className={configStyles.input}
                                  value={selectedCourse}
                                  onChange={(e) => setSelectedCourse(e.target.value)}
                                >
                                  {courseOptions.length === 0 ? (
                                    <option value="">No courses</option>
                                  ) : (
                                    courseOptions.map((course) => (
                                      <option key={course} value={course}>
                                        {course}
                                      </option>
                                    ))
                                  )}
                                </select>
                              </label>

                              <label className={configStyles.rulesLabel}>
                                If student is dropout or has dropout attendance
                                <select
                                  className={configStyles.input}
                                  value={rulesForm.certification.dropoutOrDropAttendanceLabel}
                                  onChange={(e) =>
                                    patchCertificationField("dropoutOrDropAttendanceLabel", e.target.value)
                                  }
                                >
                                  {certificationSelectValues.map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <div className={configStyles.rulesRow}>
                                <label className={configStyles.rulesLabel}>
                                  Grade above (exclusive)
                                  <input
                                    type="number"
                                    step="any"
                                    className={configStyles.input}
                                    value={rulesForm.certification.gradeMinExclusive}
                                    onChange={(e) => patchCertificationField("gradeMinExclusive", e.target.value)}
                                  />
                                </label>
                                <label className={configStyles.rulesLabel}>
                                  Attendance % above (exclusive)
                                  <input
                                    type="number"
                                    step="any"
                                    className={configStyles.input}
                                    value={rulesForm.certification.attendanceMinExclusive}
                                    onChange={(e) => patchCertificationField("attendanceMinExclusive", e.target.value)}
                                  />
                                </label>
                              </div>

                              <label className={configStyles.rulesLabel}>
                                If both grade and attendance pass
                                <select
                                  className={configStyles.input}
                                  value={rulesForm.certification.bothMetLabel}
                                  onChange={(e) => patchCertificationField("bothMetLabel", e.target.value)}
                                >
                                  {certificationSelectValues.map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className={configStyles.rulesLabel}>
                                If only one passes
                                <select
                                  className={configStyles.input}
                                  value={rulesForm.certification.oneMetLabel}
                                  onChange={(e) => patchCertificationField("oneMetLabel", e.target.value)}
                                >
                                  {certificationSelectValues.map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className={configStyles.rulesLabel}>
                                If neither passes
                                <select
                                  className={configStyles.input}
                                  value={rulesForm.certification.defaultNotEligibleLabel}
                                  onChange={(e) => patchCertificationField("defaultNotEligibleLabel", e.target.value)}
                                >
                                  {certificationSelectValues.map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          </div>

                          {/* Completion status configuration is intentionally hidden for now.
                        Formula reference (same order used in batch status resolution):
                        1) dropout OR dropout attendance => dropout label
                        2) else if future class days remain => incomplete label
                        3) else => completed label
                        Keep this block for quick re-enable in future iterations. */}
                          {/* <div className={configStyles.card}>
                      <div className={configStyles.cardSectionTitle}>Completion status</div>
                      <p className={configStyles.cardHelpText}>
                        Applies to all courses. Labels must match the Completion Status (Batch Status) dropdown above.
                      </p>
                      <div className={configStyles.rulesCardInner}>
                        <label className={configStyles.rulesLabel}>
                          If dropout or dropout attendance
                          <select
                            className={configStyles.input}
                            value={rulesForm.completion.dropoutOrDropAttendanceLabel}
                            onChange={(e) => patchCompletionField("dropoutOrDropAttendanceLabel", e.target.value)}
                          >
                            {completionSelectValues.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className={configStyles.rulesLabel}>
                          If future class days remain
                          <select
                            className={configStyles.input}
                            value={rulesForm.completion.hasFutureAttendanceLabel}
                            onChange={(e) => patchCompletionField("hasFutureAttendanceLabel", e.target.value)}
                          >
                            {completionSelectValues.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className={configStyles.rulesLabel}>
                          Otherwise (completed)
                          <select
                            className={configStyles.input}
                            value={rulesForm.completion.defaultCompletedLabel}
                            onChange={(e) => patchCompletionField("defaultCompletedLabel", e.target.value)}
                          >
                            {completionSelectValues.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div> */}
                        </div>

                        <div className={configStyles.formRow} style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            className={configStyles.btnPrimary}
                            onClick={handleSaveBatchStatusRules}
                            disabled={rulesSaving || !selectedCourse}
                          >
                            {rulesSaving ? "Saving…" : "Save Rules"}
                          </button>
                          <button
                            type="button"
                            className={configStyles.btnDanger}
                            onClick={handleResetBatchStatusRules}
                            disabled={rulesSaving || !selectedCourse}
                          >
                            Reset to Defaults
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <ConfirmationModal
              open={confirmOpen}
              handleClose={() => setConfirmOpen(false)}
              handleConfirm={handleConfirmDelete}
              confirmColor="error"
              title={confirmTitle}
              message="Are you sure? This will remove the value from the dropdown."
            />

            <GlobalSnackbar
              open={snackbarOpen}
              setOpen={setSnackbarOpen}
              message={snackbarMessage}
              severity={snackbarSeverity}
            />
          </div>
        </main>
      </div>
    </>
  );
}
