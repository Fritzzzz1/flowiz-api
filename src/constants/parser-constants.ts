/**
 * Parser Constants
 *
 * Centralized constants for CI/CD parsers
 */

/**
 * GitLab CI reserved keywords that should be filtered out from jobs
 */
export const GITLAB_RESERVED_KEYWORDS = new Set([
  'stages',
  'variables',
  'workflow',
  'default',
  'include',
  'cache',
  'image',
  'services',
  'before_script',
  'after_script',
]);

/**
 * GitLab CI default stages when none are specified
 */
export const GITLAB_DEFAULT_STAGES = ['.pre', 'build', 'test', 'deploy', '.post'];

/**
 * GitHub Actions workflow file patterns for platform detection
 */
export const GITHUB_WORKFLOW_PATTERNS = ['.github/workflows/', '.github/workflow/'];

/**
 * GitHub Actions YAML indicators for content-based detection
 */
export const GITHUB_YAML_INDICATORS = ['runs-on:', 'uses:', 'steps:', 'jobs:'];

/**
 * GitLab CI YAML indicators for content-based detection
 */
export const GITLAB_YAML_INDICATORS = ['stages:', 'script:', 'before_script:', 'artifacts:'];

/**
 * Maximum YAML file size in bytes (1MB)
 */
export const MAX_YAML_SIZE = 1024 * 1024;

/**
 * Timeout conversion factors (to seconds)
 */
export const TIMEOUT_CONVERSIONS: Record<string, number> = {
  s: 1,
  sec: 1,
  second: 1,
  seconds: 1,
  m: 60,
  min: 60,
  minute: 60,
  minutes: 60,
  h: 3600,
  hr: 3600,
  hour: 3600,
  hours: 3600,
  d: 86400,
  day: 86400,
  days: 86400,
};

/**
 * Analysis thresholds
 */
export const ANALYSIS_THRESHOLDS = {
  /** Multiplier for detecting long-duration jobs (job > avg * threshold) */
  LONG_DURATION_MULTIPLIER: 2,
  /** Number of dependents to qualify as high fan-out */
  HIGH_FAN_OUT_THRESHOLD: 3,
  /** Maximum recursion depth for cycle detection */
  MAX_CYCLE_DETECTION_DEPTH: 1000,
} as const;

/**
 * Warning codes for parser warnings
 */
export const WARNING_CODES = {
  PARALLEL_JOBS_NO_DEPS: 'PARALLEL_JOBS_NO_DEPS',
  UNUSED_JOB: 'UNUSED_JOB',
  MISSING_DEPENDENCY: 'MISSING_DEPENDENCY',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
  DEPRECATED_SYNTAX: 'DEPRECATED_SYNTAX',
  IMPLICIT_DEPENDENCY: 'IMPLICIT_DEPENDENCY',
} as const;

/**
 * Error codes for parser errors
 */
export const ERROR_CODES = {
  INVALID_YAML: 'INVALID_YAML',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_JOB_REFERENCE: 'INVALID_JOB_REFERENCE',
  UNSUPPORTED_FEATURE: 'UNSUPPORTED_FEATURE',
} as const;
