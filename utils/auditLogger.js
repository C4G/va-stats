const getBaseUrl = () => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  }
  return "";
};

/**
 * Utility function to log audit events
 */
async function logAuditEvent(action_type, performed_by, details = null, resource_type = null, resource_id = null) {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/audit/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action_type,
        performed_by,
        details,
        resource_type,
        resource_id,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error logging audit event:", error);
    throw error;
  }
}

/**
 * Staff-specific audit logging functions
 */
export const staffAuditLogger = {
  /**
   * Log staff creation event
   * @param {string} performed_by - ID or name of the user performing the action
   * @param {object} staffData - The staff data being created
   * @param {string} staffId - The ID of the created staff member
   */
  logStaffCreation: (performed_by, staffData, staffId) => {
    return logAuditEvent(
      "STAFF_CREATED",
      performed_by,
      {
        staff_data: staffData,
      },
      "staff",
      staffId
    );
  },

  /**
   * Log staff update event
   * @param {string} performed_by - ID or name of the user performing the action
   * @param {string} staffId - The ID of the staff being updated
   * @param {object} changes - The changes made to the staff data
   * @param {object} previousData - The previous staff data before updates
   */
  logStaffUpdate: (performed_by, staffId, changes, previousData) => {
    return logAuditEvent(
      "STAFF_UPDATED",
      performed_by,
      {
        changes,
        previous_data: previousData,
      },
      "staff",
      staffId
    );
  },

  /**
   * Log staff deletion event
   * @param {string} performed_by - ID or name of the user performing the action
   * @param {string} staffId - The ID of the staff being deleted
   * @param {object} staffData - The staff data being deleted
   */
  logStaffDeletion: (performed_by, staffId, staffData) => {
    return logAuditEvent(
      "STAFF_DELETED",
      performed_by,
      {
        deleted_staff_data: staffData,
      },
      "staff",
      staffId
    );
  },
};

export default staffAuditLogger;
