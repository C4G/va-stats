import React, { useEffect, useState } from "react";
import configStyles from "@/styles/Configurations.module.css";

const STORAGE_KEY = "dashboardVisibility";
const DEFAULT_DASHBOARD_CONFIG = {
  showOverallStatistics: true,
  showQuarterlyStatistics: true,
  showRunningBatches: true,
  showRunningCourses: true,
  showYearlyEnrollmentTrend: true,
};

/**
 * @param {object} props
 * @param {(message: string, severity?: 'success' | 'error') => void} [props.onNotify]
 */
export default function DashboardSettingsPanel({ onNotify }) {
  const [config, setConfig] = useState(DEFAULT_DASHBOARD_CONFIG);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig({
          ...DEFAULT_DASHBOARD_CONFIG,
          ...parsed,
        });
      }
    } catch (e) {
      console.error("Failed to load dashboard config:", e);
    }
  }, []);

  const handleToggle = (key) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      onNotify?.("Dashboard configuration saved successfully", "success");
    } catch (e) {
      console.error("Failed to save dashboard config:", e);
      onNotify?.("Failed to save dashboard configuration", "error");
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_DASHBOARD_CONFIG);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DASHBOARD_CONFIG));
      onNotify?.("Dashboard configuration reset successfully", "success");
    } catch (e) {
      console.error("Failed to reset dashboard config:", e);
      onNotify?.("Failed to reset dashboard configuration", "error");
    }
  };

  return (
    <div className={configStyles.card}>
      <div className={configStyles.sectionTitle}>Dashboard section visibility</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={config.showOverallStatistics}
            onChange={() => handleToggle("showOverallStatistics")}
          />
          Overall Statistics Card
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={config.showQuarterlyStatistics}
            onChange={() => handleToggle("showQuarterlyStatistics")}
          />
          Quarterly Statistics Card
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={config.showRunningBatches}
            onChange={() => handleToggle("showRunningBatches")}
          />
          Running Batches Chart
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={config.showRunningCourses}
            onChange={() => handleToggle("showRunningCourses")}
          />
          Running Courses Chart
        </label>

        {/* <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={config.showYearlyEnrollmentTrend}
            onChange={() => handleToggle("showYearlyEnrollmentTrend")}
          />
          Yearly Enrollment Trend Graph
        </label> */}
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
        <button type="button" className={configStyles.btnPrimary} onClick={handleSave}>
          Save
        </button>

        <button type="button" className={configStyles.btnDanger} onClick={handleReset}>
          Reset to Default
        </button>
      </div>
    </div>
  );
}
