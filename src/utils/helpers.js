// Utility helper functions

import { format, parseISO, isValid } from 'date-fns';

// Date formatting helpers
export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, formatString) : '';
  } catch (error) {
    return '';
  }
};

// Format date for Google Sheets (dd mmm yyyy format)
export const formatDateForSheets = (date) => {
  if (!date) return '';
  
  try {
    // If date is already in correct format (dd mmm yyyy), return as is
    if (typeof date === 'string' && /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(date.trim())) {
      return date.trim();
    }
    
    // Parse the date (handles yyyy-mm-dd format from input type="date")
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!isValid(dateObj)) {
      return date; // Return original if invalid
    }
    
    // Format as "dd mmm yyyy" (e.g., "15 May 2024")
    return format(dateObj, 'dd MMM yyyy');
  } catch (error) {
    return date;
  }
};

// Parse date from Google Sheets (dd mmm yyyy) to yyyy-mm-dd for input type="date"
export const parseDateFromSheets = (dateStr) => {
  if (!dateStr) return '';
  
  try {
    // If already in yyyy-mm-dd format, return as is
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      return dateStr.trim();
    }
    
    // Parse "dd mmm yyyy" format (e.g., "15 May 2024")
    const dateObj = new Date(dateStr);
    
    if (!isValid(dateObj)) {
      return dateStr; // Return original if invalid
    }
    
    // Format as "yyyy-mm-dd" for input type="date"
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    return dateStr;
  }
};

export const formatTime = (time) => {
  if (!time) return '';
  return time;
};

export const formatDateTime = (date, time) => {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);
  return formattedDate && formattedTime ? `${formattedDate} at ${formattedTime}` : formattedDate || formattedTime;
};

// String helpers
export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

// Number helpers
export const formatNumber = (num, decimals = 0) => {
  if (isNaN(num)) return '0';
  return Number(num).toFixed(decimals);
};

export const formatPercentage = (num, decimals = 1) => {
  if (isNaN(num)) return '0%';
  return `${formatNumber(num, decimals)}%`;
};

// Array helpers
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const uniqueBy = (array, key) => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

// Validation helpers
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const isValidDate = (date) => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj);
};

// Football-specific helpers
export const calculatePoints = (wins, draws) => {
  return wins * 3 + draws;
};

export const calculateGoalDifference = (goalsFor, goalsAgainst) => {
  return goalsFor - goalsAgainst;
};

export const calculateWinPercentage = (wins, totalMatches) => {
  if (totalMatches === 0) return 0;
  return (wins / totalMatches) * 100;
};

export const getFormColor = (result) => {
  switch (result) {
    case 'W': return 'success';
    case 'D': return 'warning';
    case 'L': return 'danger';
    default: return 'secondary';
  }
};

export const getFormIcon = (result) => {
  switch (result) {
    case 'W': return '✓';
    case 'D': return '=';
    case 'L': return '✗';
    default: return '?';
  }
};

// Storage helpers
export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
  }
};

export const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
  }
};

// Export helpers
export const exportToCSV = (data, filename, columns = null) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }
  
  const headers = columns || Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes in CSV
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// Error handling helpers
export const handleError = (error, context = '') => {
  
  const errorMessage = error.message || 'An unexpected error occurred';
  
  return {
    message: errorMessage,
    context,
    timestamp: new Date().toISOString()
  };
};

// Debounce helper
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle helper
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};