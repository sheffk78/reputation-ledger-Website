import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date for display
export function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Format datetime for display
export function formatDateTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get tier color class
export function getTierColorClass(tier) {
  const classes = {
    Unrated: "tier-unrated",
    Bronze: "tier-bronze",
    Silver: "tier-silver",
    Gold: "tier-gold",
    Platinum: "tier-platinum",
  };
  return classes[tier] || classes.Unrated;
}

// Get result color class
export function getResultColorClass(result) {
  const classes = {
    success: "text-[#22C55E]",
    failure: "text-[#EF4444]",
    partial: "text-[#F97316]",
    timeout: "text-[#9CA3AF]",
  };
  return classes[result] || "text-[#9CA3AF]";
}

// Copy text to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  }
}

// ============== ERROR HANDLING ==============

/**
 * Parse API error response into a user-friendly format
 * @param {Error} error - Axios error or regular error
 * @returns {{ message: string, code: string, fields: Object }}
 */
export function parseApiError(error) {
  const result = {
    message: "An unexpected error occurred. Please try again.",
    code: "UNKNOWN_ERROR",
    fields: {}
  };

  if (!error.response) {
    // Network error
    result.message = "Unable to connect to the server. Please check your internet connection.";
    result.code = "NETWORK_ERROR";
    return result;
  }

  const data = error.response.data;
  
  // Handle standardized error format
  if (data?.error) {
    result.code = data.error.code || "UNKNOWN_ERROR";
    result.message = data.error.message || result.message;
    
    // Extract field-level errors for validation
    if (data.error.details?.fields) {
      result.fields = data.error.details.fields;
    }
    
    return result;
  }
  
  // Handle legacy format (detail string)
  if (data?.detail) {
    result.message = data.detail;
    return result;
  }
  
  return result;
}

/**
 * Validate email format
 * @param {string} email 
 * @returns {string|null} Error message or null if valid
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return "Email is required.";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
}

/**
 * Validate password
 * @param {string} password 
 * @param {number} minLength 
 * @returns {string|null} Error message or null if valid
 */
export function validatePassword(password, minLength = 6) {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters.`;
  }
  return null;
}

/**
 * Validate required field
 * @param {string} value 
 * @param {string} fieldName 
 * @returns {string|null} Error message or null if valid
 */
export function validateRequired(value, fieldName) {
  if (!value || !value.trim()) {
    return `${fieldName} is required.`;
  }
  return null;
}

/**
 * Validate URL format
 * @param {string} url 
 * @returns {string|null} Error message or null if valid
 */
export function validateUrl(url) {
  if (!url || !url.trim()) {
    return "URL is required.";
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "URL must start with http:// or https://";
  }
  try {
    new URL(url);
    return null;
  } catch {
    return "Please enter a valid URL.";
  }
}
