"use strict";

/**
 * Debug logger for React Native IAP
 * Only logs when explicitly enabled for library development
 * Silent for all library users (even in their dev mode)
 */

// Check if we're in library development mode
// This will be false for library users, even in their dev environment
const isLibraryDevelopment = () => {
  // Only show logs if explicitly enabled via environment variable
  // Library developers can set: RN_IAP_DEV_MODE=true
  return process.env.RN_IAP_DEV_MODE === 'true' || global.RN_IAP_DEV_MODE === true;
};
export const RnIapConsole = {
  log: (...args) => {
    if (isLibraryDevelopment()) {
      console.log('[RN-IAP]', ...args);
    }
    // Silent for library users
  },
  debug: (...args) => {
    if (isLibraryDevelopment()) {
      console.debug('[RN-IAP Debug]', ...args);
    }
    // Silent for library users
  },
  warn: (...args) => {
    // Warnings are always shown
    console.warn('[RN-IAP]', ...args);
  },
  error: (...args) => {
    // Errors are always shown
    console.error('[RN-IAP]', ...args);
  },
  info: (...args) => {
    if (isLibraryDevelopment()) {
      console.info('[RN-IAP]', ...args);
    }
    // Silent for library users
  }
};
//# sourceMappingURL=debug.js.map