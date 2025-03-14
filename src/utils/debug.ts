// Debug utility for tracking application state and events

// Enable or disable all debugging
const DEBUG_ENABLED = true;

// Enable specific module debugging (set to false to disable specific module logs while keeping others)
const MODULES = {
  training: true,
  audioVisualizer: true,
  voiceRecorder: true,
  audioPlayback: true,
  timestamps: true,
  selection: true
};

// Colors for different log types
const COLORS = {
  info: 'color: #2563eb',
  warn: 'color: #d97706',
  error: 'color: #dc2626',
  success: 'color: #059669',
  // Module-specific colors
  training: 'color: #6366f1',
  audioVisualizer: 'color: #8b5cf6',
  voiceRecorder: 'color: #ec4899',
  selection: 'color: #f59e0b',
};

/**
 * Create formatted debug logs with module tagging and timestamps
 */
export function createLogger(moduleName: string) {
  // Skip logging if debugging is disabled globally or for this module
  if (!DEBUG_ENABLED || (MODULES[moduleName as keyof typeof MODULES] === false)) {
    // Return no-op functions
    return {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {},
      success: () => {},
      track: () => {},
    };
  }

  const moduleColor = COLORS[moduleName as keyof typeof COLORS] || 'color: #6b7280';

  // Base log function with timestamp
  const log = (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`%c[${timestamp}][${moduleName}] ${message}`, moduleColor, ...args);
  };

  // Warning logs
  const warn = (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.warn(`%c[${timestamp}][${moduleName}] ${message}`, COLORS.warn, ...args);
  };

  // Error logs
  const error = (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.error(`%c[${timestamp}][${moduleName}] ${message}`, COLORS.error, ...args);
  };

  // Info logs
  const info = (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.info(`%c[${timestamp}][${moduleName}] ${message}`, COLORS.info, ...args);
  };

  // Success logs
  const success = (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`%c[${timestamp}][${moduleName}] ${message}`, COLORS.success, ...args);
  };

  // Track state changes
  const track = (label: string, value: any) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.groupCollapsed(`%c[${timestamp}][${moduleName}] ${label}`, moduleColor);
    console.log(value);
    console.groupEnd();
  };

  return {
    log,
    warn,
    error,
    info,
    success,
    track,
  };
}

// Create default loggers for main modules
export const logger = {
  training: createLogger('training'),
  audioVisualizer: createLogger('audioVisualizer'),
  voiceRecorder: createLogger('voiceRecorder'),
  audioPlayback: createLogger('audioPlayback'),
  timestamps: createLogger('timestamps'),
  selection: createLogger('selection'),
};

// Helper to track time between operations
export function createTimer(label: string) {
  const start = performance.now();
  return {
    stop: () => {
      const duration = performance.now() - start;
      console.log(`%c[Timer] ${label}: ${duration.toFixed(2)}ms`, 'color: #6b7280');
      return duration;
    }
  };
}

// Track component renders
export function trackRender(componentName: string) {
  if (!DEBUG_ENABLED) return;
  console.log(`%c[Render] ${componentName}`, 'color: #9333ea');
}

// Export debug enabled state
export const isDebugEnabled = DEBUG_ENABLED; 