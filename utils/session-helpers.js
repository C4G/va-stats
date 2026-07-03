/**
 * Safe session utilities for handling user authentication
 */

/**
 * Safely extract user email from session
 * @param {Object} session - NextAuth session object
 * @returns {string|null} - User email or null if not available
 */
export const getUserEmail = (session) => {
  return session?.user?.email ?? null;
};

/**
 * Safely extract user ID from session
 * @param {Object} session - NextAuth session object
 * @returns {number|null} - User ID or null if not available
 */
export const getUserId = (session) => {
  return session?.user?.id ?? null;
};

/**
 * Safely extract user role from session
 * @param {Object} session - NextAuth session object
 * @returns {string|null} - User role or null if not available
 */
export const getUserRole = (session) => {
  return session?.user?.role ?? null;
};

/**
 * Check if session has valid user data
 * @param {Object} session - NextAuth session object
 * @returns {boolean} - True if session has valid user data
 */
export const hasValidUser = (session) => {
  return !!session?.user?.email;
};

/**
 * Check if session has valid user with specific role
 * @param {Object} session - NextAuth session object
 * @param {string|string[]} allowedRoles - Role(s) to check against
 * @returns {boolean} - True if user has allowed role
 */
export const hasValidRole = (session, allowedRoles) => {
  const userRole = getUserRole(session);
  if (!userRole) return false;

  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(userRole);
  }
  return userRole === allowedRoles;
};
