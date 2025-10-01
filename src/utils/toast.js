/**
 * Toast Notification System
 * Simple API for showing Material Design 3.0 toasts
 */

let toastCallback = null;

/**
 * Register toast callback from component
 * @param {Function} callback
 */
export const registerToastCallback = (callback) => {
  toastCallback = callback;
};

/**
 * Show success toast
 * @param {string} message
 * @param {number} duration - Duration in ms (default: 4000)
 */
export const showSuccess = (message, duration = 4000) => {
  if (toastCallback) {
    toastCallback({
      type: 'success',
      message,
      duration
    });
  } else {
    // Fallback to console if toast system not ready
  }
};

/**
 * Show error toast
 * @param {string} message
 * @param {number} duration - Duration in ms (default: 5000)
 */
export const showError = (message, duration = 5000) => {
  if (toastCallback) {
    toastCallback({
      type: 'error',
      message,
      duration
    });
  } else {
    // Fallback to console if toast system not ready
    console.error('❌ Error:', message);
  }
};

/**
 * Show warning toast
 * @param {string} message
 * @param {number} duration - Duration in ms (default: 4500)
 */
export const showWarning = (message, duration = 4500) => {
  if (toastCallback) {
    toastCallback({
      type: 'warning',
      message,
      duration
    });
  } else {
    // Fallback to console if toast system not ready
    console.warn('⚠️ Warning:', message);
  }
};

/**
 * Show info toast
 * @param {string} message
 * @param {number} duration - Duration in ms (default: 4000)
 */
export const showInfo = (message, duration = 4000) => {
  if (toastCallback) {
    toastCallback({
      type: 'info',
      message,
      duration
    });
  } else {
    // Fallback to console if toast system not ready
    console.info('ℹ️ Info:', message);
  }
};

/**
 * Show custom toast
 * @param {Object} options - { type, message, duration }
 */
export const showToast = (options) => {
  if (toastCallback) {
    toastCallback(options);
  } else {
  }
};
