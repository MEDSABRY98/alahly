import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

/**
 * Toast Notification Component - Material Design 3.0
 * 
 * @param {Object} props
 * @param {string} props.message - Message to display
 * @param {string} props.type - Type: 'success' | 'error' | 'warning' | 'info'
 * @param {number} props.duration - Duration in ms (default: 4000)
 * @param {Function} props.onClose - Callback when toast closes
 */
export const Toast = ({ message, type = 'success', duration = 4000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="toast-icon" />;
      case 'error':
        return <XCircle className="toast-icon" />;
      case 'warning':
        return <AlertCircle className="toast-icon" />;
      case 'info':
        return <Info className="toast-icon" />;
      default:
        return <CheckCircle className="toast-icon" />;
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        {getIcon()}
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={onClose}>
        <X className="toast-close-icon" />
      </button>
    </div>
  );
};

/**
 * Toast Container Component
 */
export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default Toast;
