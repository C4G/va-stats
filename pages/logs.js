import { format } from "date-fns";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "../styles/Home.module.css";

export default function AuditLogs() {
  const { status } = useSession();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action_type: "",
    performed_by: "",
    resource_type: "",
    start_date: "",
    end_date: "",
  });
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
  });

  // Action type options for the filter dropdown
  const actionTypes = ["STAFF_CREATED", "STAFF_UPDATED", "STAFF_DELETED"];

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset,
      });

      // Remove empty filters
      Object.keys(filters).forEach((key) => {
        if (!filters[key]) {
          queryParams.delete(key);
        }
      });

      const response = await fetch(`/api/audit/get?${queryParams}`);
      const data = await response.json();
      setLogs(data.data);
      setPagination((prev) => ({
        ...prev,
        total: data.total,
      }));
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.offset]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLogs();
    }
  }, [status, filters, pagination.offset, pagination.limit, fetchLogs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Reset pagination when filters change
    setPagination((prev) => ({
      ...prev,
      offset: 0,
    }));
  };

  const clearFilters = () => {
    setFilters({
      action_type: "",
      performed_by: "",
      resource_type: "",
      start_date: "",
      end_date: "",
    });
    setPagination((prev) => ({
      ...prev,
      offset: 0,
    }));
  };

  const formatDate = (date) => {
    return format(new Date(date), "MMM dd, yyyy HH:mm:ss");
  };

  const renderDetails = (details) => {
    if (!details) return "No details available";

    try {
      const detailsObj = details;

      if (detailsObj.changes) {
        // For updates, show what changed
        return (
          <div className={styles.changes}>
            {Object.entries(detailsObj.changes).map(([field, change]) => (
              <div key={field} className={styles.change}>
                <strong>{field}:</strong>
                <div className={styles.changeValues}>
                  <span className={styles.oldValue}>From: {change.from || "empty"}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.newValue}>To: {change.to || "empty"}</span>
                </div>
              </div>
            ))}
          </div>
        );
      } else {
        // For creation and deletion, show the staff data
        return <pre className={styles.jsonDetails}>{JSON.stringify(detailsObj, null, 2)}</pre>;
      }
    } catch (e) {
      console.error("Error rendering details:", e);
      return "Error displaying details";
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className={styles.autherrorcontainer}>
        <Image alt={"VisionAid logo"} src={"/images/logo-mainsite.png"} height={100} width={150} />
        <span className={styles.autherrortext}>
          Access denied.&nbsp;
          <Link href="/" className={styles.autherrorlink}>
            Please sign in.
          </Link>
        </span>
      </div>
    );
  }

  if (loading && !logs.length) {
    return (
      <div className={styles.overlay}>
        <span className={styles.customLoader}></span>
      </div>
    );
  }

  return (
    <main className={styles.main} id="maincontent">
      <div className={styles.container}>
        <h1 className={styles.title} style={{ marginTop: 0, paddingTop: 0 }}>
          Audit Logs
        </h1>

        {/* Filters Section */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>
              Action Type:
              <select
                name="action_type"
                value={filters.action_type}
                onChange={handleFilterChange}
                className={styles.filterSelect}
              >
                <option value="">All Actions</option>
                {actionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Performed By:
              <input
                type="text"
                name="performed_by"
                value={filters.performed_by}
                onChange={handleFilterChange}
                placeholder="Search by user"
                className={styles.filterInput}
              />
            </label>

            <label>
              Resource Type:
              <input
                type="text"
                name="resource_type"
                value={filters.resource_type}
                onChange={handleFilterChange}
                placeholder="Search by resource type"
                className={styles.filterInput}
              />
            </label>

            <label>
              Start Date:
              <input
                type="date"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                className={styles.filterInput}
              />
            </label>

            <label>
              End Date:
              <input
                type="date"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                className={styles.filterInput}
              />
            </label>

            <button onClick={clearFilters} className={styles.clearFiltersButton} aria-label="Clear all filter values">
              Clear Filters
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className={styles.tableContainer}>
          <table className={styles.logsTable} role="table" aria-label="Audit logs table">
            <caption className="sr-only">Audit logs showing system activities and changes</caption>
            <thead>
              <tr>
                <th>Action Type</th>
                <th>Performed By</th>
                <th>Performed At</th>
                <th>Resource Type</th>
                <th>Resource ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.action_type}</td>
                  <td>{log.performed_by}</td>
                  <td>{formatDate(log.performed_at)}</td>
                  <td>{log.resource_type}</td>
                  <td>{log.resource_id}</td>
                  <td>{renderDetails(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <button
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                offset: Math.max(0, prev.offset - prev.limit),
              }))
            }
            disabled={pagination.offset === 0}
            className={styles.paginationButton}
            aria-label="Go to previous page of logs"
          >
            Previous
          </button>
          <span className={styles.paginationInfo}>
            Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </span>
          <button
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                offset: prev.offset + prev.limit,
              }))
            }
            disabled={pagination.offset + pagination.limit >= pagination.total}
            className={styles.paginationButton}
            aria-label="Go to next page of logs"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
