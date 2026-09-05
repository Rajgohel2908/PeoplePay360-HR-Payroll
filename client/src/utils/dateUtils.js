/**
 * Utility functions for consistent date and time formatting across the entire application.
 * Standardizes on Indian / British Commonwealth standard: DD/MM/YYYY.
 *
 * Designed to prevent UTC-to-Local timezone day shifts by directly parsing ISO date strings.
 */

/**
 * Formats a date string, timestamp, or Date object to DD/MM/YYYY (or DD/MM/YY).
 * @param {string|Date|number} dateVal - Date to format (e.g. "2026-09-06", "2026-09-06T00:00:00.000Z")
 * @param {Object} [options]
 * @param {boolean} [options.shortYear=false] - If true, returns DD/MM/YY instead of DD/MM/YYYY
 * @param {string} [options.fallback='-'] - Fallback text if dateVal is invalid or empty
 * @returns {string} Formatted date string, e.g. "06/09/2026"
 */
export function formatDate(dateVal, options = {}) {
  const { shortYear = false, fallback = '-' } = options;
  if (!dateVal) return fallback;

  try {
    // If it's an ISO date string starting with YYYY-MM-DD
    if (typeof dateVal === 'string') {
      const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        const formattedYear = shortYear ? year.slice(-2) : year;
        return `${day}/${month}/${formattedYear}`;
      }
    }

    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = shortYear ? String(d.getFullYear()).slice(-2) : String(d.getFullYear());

    return `${day}/${month}/${year}`;
  } catch {
    return fallback;
  }
}

/**
 * Formats a date range, e.g. "01/09/2026 → 15/09/2026"
 * @param {string|Date} start
 * @param {string|Date} end
 * @param {string} [separator=' → ']
 * @returns {string}
 */
export function formatDateRange(start, end, separator = ' → ') {
  if (!start && !end) return '-';
  if (!start) return formatDate(end);
  if (!end) return formatDate(start);
  return `${formatDate(start)}${separator}${formatDate(end)}`;
}

/**
 * Formats a timestamp with both date and time: DD/MM/YYYY, HH:MM
 * @param {string|Date|number} dateVal
 * @param {string} [fallback='-']
 * @returns {string} e.g. "06/09/2026, 14:30"
 */
export function formatDateTime(dateVal, fallback = '-') {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  } catch {
    return fallback;
  }
}

export default {
  formatDate,
  formatDateRange,
  formatDateTime
};
