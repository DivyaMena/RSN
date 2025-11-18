// Utility functions for date formatting in IST timezone

/**
 * Format date to DD-MM-YYYY in IST timezone
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date as DD-MM-YYYY
 */
export const formatDateIST = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert to IST (UTC+5:30)
  const istDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = istDate.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Format date to full format: "18 November 2025" in IST
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date
 */
export const formatDateLongIST = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert to IST (UTC+5:30)
  const istDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const options = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' };
  return istDate.toLocaleDateString('en-IN', options);
};

/**
 * Get current date in IST
 * @returns {Date} Current date in IST
 */
export const getCurrentDateIST = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};

/**
 * Format date with time in IST
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted as "DD-MM-YYYY HH:MM"
 */
export const formatDateTimeIST = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert to IST (UTC+5:30)
  const istDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = istDate.getFullYear();
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

/**
 * Convert YYYY-MM-DD to DD-MM-YYYY
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Date in DD-MM-YYYY format
 */
export const convertYYYYMMDDtoDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
};

/**
 * Convert DD-MM-YYYY to YYYY-MM-DD
 * @param {string} dateStr - Date string in DD-MM-YYYY format
 * @returns {string} Date in YYYY-MM-DD format
 */
export const convertDDMMYYYYtoYYYYMMDD = (dateStr) => {
  if (!dateStr) return '';
  const [day, month, year] = dateStr.split('-');
  return `${year}-${month}-${day}`;
};
