// ============================================
// APP CONFIGURATION CONSTANTS
// ============================================

/**
 * Toast notification durations (in milliseconds)
 */
export const TOAST_DURATION = {
  DEFAULT: 5000,
  ERROR: 7000,
  SUCCESS: 3000,
  INFO: 4000,
} as const;

/**
 * Animation durations (in milliseconds)
 */
export const ANIMATION_DURATION = {
  FAST: 100,
  DEFAULT: 200,
  SLOW: 300,
  VERY_SLOW: 500,
} as const;

/**
 * Transition durations (Tailwind classes)
 */
export const TRANSITION_DURATION = {
  FAST: 'duration-100',
  DEFAULT: 'duration-200',
  SLOW: 'duration-300',
  VERY_SLOW: 'duration-500',
} as const;

/**
 * API request timeouts (in milliseconds)
 */
export const API_TIMEOUT = {
  DEFAULT: 30000,
  LONG: 60000,
  VERY_LONG: 120000,
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10000,
  BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

/**
 * UI size constraints
 */
export const UI_SIZE = {
  MAX_LOG_ENTRIES: 1000,
  MAX_PROJECTS_DISPLAY: 50,
  MAX_TASKS_PER_PHASE: 100,
  SCROLL_THRESHOLD: 50,
} as const;

/**
 * Execution delays (in milliseconds)
 */
export const EXECUTION_DELAY = {
  DEVELOPMENT: 500,
  PRODUCTION: 100,
} as const;

/**
 * WebSocket configuration
 */
export const WEBSOCKET_CONFIG = {
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL: 30000,
} as const;

/**
 * Task estimation thresholds (in minutes)
 */
export const TASK_TIME = {
  SHORT_THRESHOLD: 10,
  MEDIUM_THRESHOLD: 30,
  LONG_THRESHOLD: 60,
  WARNING_THRESHOLD: 10,
} as const;

/**
 * Progress bar configurations
 */
export const PROGRESS = {
  MIN: 0,
  MAX: 100,
  COMPLETE_THRESHOLD: 100,
} as const;

/**
 * Date/Time format options
 */
export const DATE_FORMAT = {
  SHORT: {
    month: 'short' as const,
    day: 'numeric' as const,
  },
  DEFAULT: {
    month: 'short' as const,
    day: 'numeric' as const,
    year: 'numeric' as const,
  },
  FULL: {
    month: 'long' as const,
    day: 'numeric' as const,
    year: 'numeric' as const,
  },
  WITH_TIME: {
    month: 'short' as const,
    day: 'numeric' as const,
    year: 'numeric' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
  },
} as const;

/**
 * Log viewer configuration
 */
export const LOG_CONFIG = {
  MAX_VISIBLE_LOGS: 500,
  AUTO_SCROLL_THRESHOLD: 50,
  DEFAULT_FILTER_LEVELS: ['info', 'success', 'warning', 'error', 'debug'] as const,
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
} as const;

/**
 * Z-index layers
 */
export const Z_INDEX = {
  DROPDOWN: 10,
  STICKY: 20,
  FIXED: 30,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  POPOVER: 60,
  TOOLTIP: 70,
  SKIP_LINK: 9999,
} as const;
