import { useCallback } from 'react';

// Enable or disable debug logging globally
const DEBUG_ENABLED = true; // Always enable for development

/**
 * Custom hook for consistent debug logging
 * @param prefix Optional prefix for log messages
 * @returns Object with logging methods
 */
export const useDebug = (prefix: string = '') => {
  const formatPrefix = prefix ? `[${prefix}]` : '';
  
  const log = useCallback((...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(formatPrefix, ...args);
    }
  }, [formatPrefix]);
  
  const error = useCallback((...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.error(formatPrefix, ...args);
    }
  }, [formatPrefix]);
  
  const warn = useCallback((...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.warn(formatPrefix, ...args);
    }
  }, [formatPrefix]);
  
  const success = useCallback((...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(formatPrefix, '%c✓', 'color: green', ...args);
    }
  }, [formatPrefix]);
  
  const track = useCallback((name: string, data: object) => {
    if (DEBUG_ENABLED) {
      console.groupCollapsed(`${formatPrefix} ${name}`);
      Object.entries(data).forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });
      console.groupEnd();
    }
  }, [formatPrefix]);
  
  return {
    log,
    error,
    warn,
    success,
    track,
    enabled: DEBUG_ENABLED
  };
};

export default useDebug; 