/*
In useEffect: ESLint warning was removed using code below, including slashes;
may cause problems if changes are not tested thoroughly
// eslint-disable-next-line react-hooks/exhaustive-deps
*/

/* SITE HOME PAGE */

import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import styles from "../styles/Home.module.css";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
const DASHBOARD_STORAGE_KEY = "dashboardVisibility";
const DEFAULT_DASHBOARD_CONFIG = {
  showOverallStatistics: true,
  showQuarterlyStatistics: true,
  showRunningBatches: true,
  showRunningCourses: true,
  showYearlyEnrollmentTrend: true,
};

export default function DefaultHome({ userRole }) {
  const [loading, setLoading] = useState(true);
  const [batchCountResponse, setBatchCountResponse] = useState([]);
  const [courseCountResponse, setCourseCountResponse] = useState([]);
  const [studentCountResponse, setStudentCountResponse] = useState([]);
  const [totalLeadsMonthResponse, setTotalLeadsMonthResponse] = useState(null);
  const [totalBatchesInitiatedMonthResponse, setTotalBatchesInitiatedMonthResponse] = useState(null);
  const [totalEnrollsMonthResponse, setTotalEnrollsMonthResponse] = useState(null);
  const [totalInstructorsMonthResponse, setTotalInstructorsMonthResponse] = useState(null);
  const [totalTAsMonthResponse, setTotalTAsMonthResponse] = useState(null);
  const [totalCoursesMonthResponse, setTotalCoursesMonthResponse] = useState(null);
  const [batchesWithEnrollCount, setBatchesWithEnrollCount] = useState([]);
  const [coursesWithEnrollCount, setCoursesWithEnrollCount] = useState([]);
  const [setYearlyEnrollmentTrend] = useState([]);
  const [dashboardConfig, setDashboardConfig] = useState(DEFAULT_DASHBOARD_CONFIG);

  useEffect(() => {
    localStorage.setItem("editMode", "false");

    try {
      const savedDashboardConfig = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (savedDashboardConfig) {
        const parsedConfig = JSON.parse(savedDashboardConfig);
        setDashboardConfig({
          ...DEFAULT_DASHBOARD_CONFIG,
          ...parsedConfig,
        });
      }
    } catch (error) {
      console.error("Failed to load dashboard visibility config:", error);
    }

    (async () => {
      try {
        const today = new Date();
        const currentMonth = today.getMonth(); // 0-11
        const currentYear = today.getFullYear();

        let startDate;
        let endDate;

        if (currentMonth <= 2) {
          // Q1
          startDate = `${currentYear}-01-01`;
          endDate = `${currentYear}-03-31`;
        } else if (currentMonth <= 5) {
          // Q2
          startDate = `${currentYear}-04-01`;
          endDate = `${currentYear}-06-30`;
        } else if (currentMonth <= 8) {
          // Q3
          startDate = `${currentYear}-07-01`;
          endDate = `${currentYear}-09-30`;
        } else {
          // Q4
          startDate = `${currentYear}-10-01`;
          endDate = `${currentYear}-12-31`;
        }
        const [b, c, s, cl, cb, ce, ci, cta, cc, bw, cw, yet] = await Promise.all([
          fetch("api/countbatch").then((r) => {
            if (!r.ok) throw new Error(`Batch API failed: ${r.status}`);
            return r.json();
          }),
          fetch("api/countcourse").then((r) => {
            if (!r.ok) throw new Error(`Course API failed: ${r.status}`);
            return r.json();
          }),
          fetch("api/countstudent").then((r) => {
            if (!r.ok) throw new Error(`Student API failed: ${r.status}`);
            return r.json();
          }),
          fetch("api/countleadsmonth").then((r) => {
            if (!r.ok) throw new Error(`Count leads month API failed: ${r.status}`);
            return r.json();
          }),
          fetch("api/countbatchesmonth").then((r) => {
            if (!r.ok) throw new Error(`Count batches month API failed: ${r.status}`);
            return r.json();
          }),
          fetch("api/countenrollsmonth").then((r) => {
            if (!r.ok) throw new Error(`Count enrolls month API failed: ${r.status}`);
            return r.json();
          }),
          fetch("api/countinstructorsmonth").then((r) => {
            if (!r.ok) throw new Error(`Count instructors month API failed: ${r.status}`);
            return r.json();
          }),
          fetch("api/counttasmonth").then((r) => {
            if (!r.ok) throw new Error(`Count TAs month API failed: ${r.status}`);
            return r.json();
          }),
          fetch("api/countcoursesmonth").then((r) => {
            if (!r.ok) throw new Error(`Count courses month API failed: ${r.status}`);
            return r.json();
          }),
          fetch(`/api/getBatchesWithEnrollCount?startDate=${startDate}&endDate=${endDate}`).then((r) => {
            if (!r.ok) throw new Error(`Batches enroll API failed: ${r.status}`);
            return r.json();
          }),
          fetch("api/getCoursesWithEnrollCount").then((r) => {
            if (!r.ok) throw new Error(`Batches enroll API failed: ${r.status}`);
            return r.json();
          }),
          fetch("api/getYearlyEnrollmentTrend").then((r) => {
            if (!r.ok) throw new Error(`Batches enroll API failed: ${r.status}`);
            return r.json();
          }),
        ]);
        setBatchCountResponse(b.count);
        setCourseCountResponse(c.count);
        setStudentCountResponse(s.count);
        setTotalLeadsMonthResponse(cl.count);
        setTotalBatchesInitiatedMonthResponse(cb.count);
        setTotalEnrollsMonthResponse(ce.count);
        setTotalInstructorsMonthResponse(ci.count);
        setTotalTAsMonthResponse(cta.count);
        setTotalCoursesMonthResponse(cc.count);
        setBatchesWithEnrollCount(bw.batches);
        setCoursesWithEnrollCount(cw.courses);
        setYearlyEnrollmentTrend(yet.trend);
      } catch (error) {
        console.error("API Error:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  return (
    <>
      <Navbar user_role={userRole ?? undefined} className={styles.topnav} />

      <Head>
        <title>Vision-Aid-STATS</title>
        <meta
          name="google-signin-client_id"
          content="81017730584-986m405knu7rpfudp25kv0hr3td2d76v.apps.googleusercontent.com"
        />

        <meta
          name="description"
          content="A nonprofit, advocating on behalf of persons with vision issues of any type"
        />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://va-stats.vercel.app/" />
        <meta property="og:title" content="Vision-Aid-STATS" />
        <meta property="og:description" content="Student Training and Tracking System [STATS]" />
        <meta property="og:image" content="https://va-stats.vercel.app/images/logo-mainsite.png?v=20251004" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Vision-Aid-STATS" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://va-stats.vercel.app/" />
        <meta property="twitter:title" content="Vision-Aid-STATS" />
        <meta property="twitter:description" content="Student Training and Tracking System [STATS]" />
        <meta property="twitter:image" content="https://va-stats.vercel.app/images/logo-mainsite.png?v=20251004" />
        {/* <script src="main.js"></script>  */}
      </Head>

      {loading && (
        <div className={styles.overlay} role="status" aria-live="polite">
          <span className={styles.customLoader} aria-label="Loading dashboard statistics" />
        </div>
      )}

      <main className={styles.main} aria-busy={loading} aria-hidden={loading}>
        <h1 className={styles.title}>
          <a className={styles.nounderline} href="https://visionaid.org" target="_blank" rel="noreferrer">
            Vision-Aid
          </a>
        </h1>

        <p className={styles.subtitlehm}>
          {/* <p className={styles.subtitlehm}> */}
          Student Training and Tracking System [STATS]
        </p>

        <div className={styles.topCardRow}>
          <Link href="/demo" className={styles.smallCard}>
            <h2>Check Out Demo &rarr;</h2>
            <p className="font-semibold">Watch demo videos for each page</p>
          </Link>

          <a
            href="https://visionaid.org/about-vision-aid/mission-and-vision"
            target="_blank"
            rel="noreferrer"
            className={styles.smallCard}
          >
            <h2>About &rarr;</h2>
            <p className="font-semibold">Learn about our organization</p>
          </a>

          <a
            href="/documentation/VA-STATS User Guide - Spring 2026 Update.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.smallCard}
          >
            <h2>User Guide &rarr;</h2>
            <p className="font-semibold">Learn how to use the VisionAid STATS platform</p>
          </a>
        </div>

        <div className={styles.grid}>
          {/* <a className={styles.card}> */}
          {dashboardConfig.showOverallStatistics && (
            <div className={styles.card2}>
              <h2>Overall Statistics</h2>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span>Students:</span>
                  <span>{studentCountResponse}</span>
                </div>
                <div className={styles.statItem}>
                  <span>Courses:</span>
                  <span>{courseCountResponse}</span>
                </div>
                <div className={styles.statItem}>
                  <span>Batches:</span>
                  <span>{batchCountResponse}</span>
                </div>
              </div>
            </div>
          )}

          {dashboardConfig.showQuarterlyStatistics && (
            <div className={styles.card2}>
              <h2>Quarterly Statistics</h2>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span>Leads:</span>
                  <span>{totalLeadsMonthResponse}</span>
                </div>
                <div className={styles.statItem}>
                  <span>Batches:</span>
                  <span>{totalBatchesInitiatedMonthResponse}</span>
                </div>
                <div className={styles.statItem}>
                  <span>Enrollments:</span>
                  <span>{totalEnrollsMonthResponse}</span>
                </div>
                <div className={styles.statItem}>
                  <span>Instructors:</span>
                  <span>{totalInstructorsMonthResponse}</span>
                </div>
                <div className={styles.statItem}>
                  <span>TAs:</span>
                  <span>{totalTAsMonthResponse}</span>
                </div>
                <div className={styles.statItem}>
                  <span>Courses:</span>
                  <span>{totalCoursesMonthResponse}</span>
                </div>
              </div>
            </div>
          )}
          {/* </a> */}
        </div>

        {(dashboardConfig.showRunningBatches || dashboardConfig.showRunningCourses) && (
          <div className="mx-auto flex w-[60%] flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
            {dashboardConfig.showRunningBatches && (
              <div
                className={`flex flex-col items-center ${
                  dashboardConfig.showRunningCourses ? "w-full md:w-1/2" : "w-full md:w-[60%]"
                }`}
              >
                <h2 className="mt-16">Batches</h2>
                <p className="mb-4 text-lg font-bold text-gray-800">Total Batches: {batchesWithEnrollCount.length}</p>
                {batchesWithEnrollCount.length > 0 && (
                  <div className="w-full pb-12">
                    <div className="overflow-hidden rounded-lg border border-gray-700">
                      <div className="box-border h-[400px] w-full min-w-0 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={batchesWithEnrollCount} margin={{ top: 20, bottom: 150 }}>
                            <XAxis
                              dataKey="batch"
                              tick={{ fontSize: 18, fontWeight: 800 }}
                              axisLine={{ strokeWidth: 4 }}
                              tickLine={{ strokeWidth: 4 }}
                              angle={-90}
                              textAnchor="end"
                              interval={0}
                              dx={-7}
                            />
                            <YAxis
                              tick={{ fontSize: 18, fontWeight: 800 }}
                              axisLine={{ strokeWidth: 4 }}
                              tickLine={{ strokeWidth: 4 }}
                            />
                            <Tooltip
                              contentStyle={{ fontSize: "18px" }}
                              itemStyle={{ color: "#087f48", fontWeight: 500 }}
                            />
                            <Bar dataKey="enrolled_students" fill="#4ade80">
                              <LabelList
                                dataKey="enrolled_students"
                                position="top"
                                style={{ fontSize: 18, fontWeight: 800 }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {dashboardConfig.showRunningCourses && (
              <div
                className={`flex flex-col items-center ${
                  dashboardConfig.showRunningBatches ? "w-full md:w-1/2" : "w-full md:w-[60%]"
                }`}
              >
                <h2 className="mt-16">Courses</h2>
                <p className="mb-4 text-lg font-bold text-gray-800">Total Courses: {coursesWithEnrollCount.length}</p>
                {coursesWithEnrollCount.length > 0 && (
                  <div className="w-full pb-12">
                    <div className="overflow-hidden rounded-lg border border-gray-700">
                      <div className="box-border h-[400px] w-full min-w-0 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={coursesWithEnrollCount} margin={{ top: 20, bottom: 150 }}>
                            <XAxis
                              dataKey="coursename"
                              tick={{ fontSize: 18, fontWeight: 800 }}
                              axisLine={{ strokeWidth: 4 }}
                              tickLine={{ strokeWidth: 4 }}
                              angle={-90}
                              textAnchor="end"
                              interval={0}
                              dx={-7}
                            />
                            <YAxis
                              tick={{ fontSize: 18, fontWeight: 800 }}
                              axisLine={{ strokeWidth: 4 }}
                              tickLine={{ strokeWidth: 4 }}
                            />
                            <Tooltip
                              contentStyle={{ fontSize: "18px" }}
                              itemStyle={{ color: "#087f48", fontWeight: 500 }}
                            />
                            <Bar dataKey="enrolled_students" fill="#4ade80">
                              <LabelList
                                dataKey="enrolled_students"
                                position="top"
                                style={{ fontSize: 18, fontWeight: 800 }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
