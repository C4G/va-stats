/**
 * Utility functions for fetching batch data
 */

/**
 * Fetch user data by email
 * @param {string} email - User email
 * @returns {Promise<Object>} User data
 */
export const fetchUserData = async (email) => {
  const response = await fetch(`/api/getuserdata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const res = await response.json();
  return res.users[0];
};

/**
 * Fetch all batches for a user
 * @param {string} userRole - User role
 * @param {string} userName - User name
 * @returns {Promise<Array>} Array of batches
 */
export const fetchBatches = async (userRole, userName) => {
  const response = await fetch(`/api/getbatchesdata?userRole=${userRole.toUpperCase()}&userName=${userName}`);
  const data = await response.json();
  return (data.batches || []).sort((a, b) => a.batch.localeCompare(b.batch));
};

/**
 * Fetch batch details by ID
 * @param {string} batchId - Batch ID
 * @returns {Promise<Object>} Batch details
 */
export const fetchBatchDetails = async (batchId) => {
  const response = await fetch(`/api/getbatchdetails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batch_id: batchId }),
  });
  return await response.json();
};

/**
 * Filter batches by date range
 * @param {Array} batches - Array of batches
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Filtered batches
 */
export const filterBatchesByDateRange = (batches, startDate, endDate) => {
  const rangeStart = new Date(startDate).getTime();
  const rangeEnd = new Date(endDate).getTime();

  return batches.filter((batch) => {
    const start = new Date(batch.coursestart).getTime();
    return start >= rangeStart && start <= rangeEnd;
  });
};

/**
 * Convert quarter to date range
 * @param {string} quarter - Quarter (Q1, Q2, Q3, Q4)
 * @param {number} year - Year
 * @returns {Object} Object with startDate and endDate
 */
export const quarterToDateRange = (quarter, year) => {
  const quarterMap = {
    Q1: ["-01-01", "-03-31"],
    Q2: ["-04-01", "-06-30"],
    Q3: ["-07-01", "-09-30"],
    Q4: ["-10-01", "-12-31"],
  };

  return {
    startDate: `${year}${quarterMap[quarter][0]}`,
    endDate: `${year}${quarterMap[quarter][1]}`,
  };
};
