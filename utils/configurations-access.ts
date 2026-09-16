/**
 * Who may use /configurations — keep in sync with Navbar "Configurations" menu item.
 * Dashboard section visibility (hash #dashboard) lives on the same page; legacy /dashboard-configurations redirects there.
 */
export const CONFIGURATIONS_PAGE_ROLES = ["ADMINISTRATOR"];

const normalizeRole = (role) => (role ? String(role).toUpperCase() : null);

/**
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export function canAccessConfigurationsPage(role) {
  const norm = normalizeRole(role);
  if (!norm) return false;
  const allowed = CONFIGURATIONS_PAGE_ROLES.map((r) => r.toUpperCase());
  return allowed.includes(norm);
}
