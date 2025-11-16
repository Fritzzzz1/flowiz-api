/**
 * Analyzer Constants
 *
 * Centralized constants for pipeline analyzers
 */

/**
 * Analysis thresholds
 */
export const ANALYZER_THRESHOLDS = {
  /** Multiplier for detecting long-duration jobs (job > avg * threshold) */
  LONG_DURATION_MULTIPLIER: 2,

  /** Number of dependents to qualify as high fan-out */
  HIGH_FAN_OUT_THRESHOLD: 3,

  /** Maximum recursion depth for DFS algorithms */
  MAX_RECURSION_DEPTH: 1000,

  /** Maximum pipeline size for analysis */
  MAX_PIPELINE_JOBS: 10000,
} as const;

/**
 * Bottleneck impact levels
 */
export const IMPACT_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

/**
 * Bottleneck types
 */
export const BOTTLENECK_TYPES = {
  LONG_DURATION: 'long_duration',
  HIGH_FAN_OUT: 'high_fan_out',
  CRITICAL_PATH: 'critical_path',
  SERIAL_EXECUTION: 'serial_execution',
} as const;
