/**
 * YAML validation utility
 *
 * Validates and parses YAML content for CI/CD configuration files
 */

import * as YAML from 'yaml';

export interface YAMLValidationResult {
  valid: boolean;
  data?: unknown;
  errors: Array<{
    message: string;
    line?: number;
    column?: number;
  }>;
}

/**
 * Parse and validate YAML content
 *
 * @param content - YAML content as string
 * @param options - Parsing options
 * @returns Validation result with parsed data or errors
 */
export function validateYAML(
  content: string,
  options?: {
    strict?: boolean;
    maxAliasCount?: number;
  }
): YAMLValidationResult {
  const errors: Array<{ message: string; line?: number; column?: number }> = [];

  try {
    // Check for empty content
    if (!content || content.trim().length === 0) {
      errors.push({
        message: 'YAML content is empty',
      });
      return { valid: false, errors };
    }

    // Parse YAML with options
    const data = YAML.parse(content, {
      strict: options?.strict ?? true,
      maxAliasCount: options?.maxAliasCount ?? 100,
    });

    // Check if parsed data is null or undefined
    if (data === null || data === undefined) {
      errors.push({
        message: 'YAML content parsed to null or undefined',
      });
      return { valid: false, errors };
    }

    return {
      valid: true,
      data,
      errors: [],
    };
  } catch (error) {
    // Handle YAML parsing errors
    if (error instanceof Error) {
      errors.push({
        message: `YAML parsing failed: ${error.message}`,
      });
    } else {
      errors.push({
        message: 'Unknown YAML parsing error',
      });
    }

    return {
      valid: false,
      errors,
    };
  }
}

/**
 * Check if content is valid YAML
 *
 * @param content - YAML content as string
 * @returns True if valid YAML, false otherwise
 */
export function isValidYAML(content: string): boolean {
  const result = validateYAML(content);
  return result.valid;
}

/**
 * Parse YAML content or throw error
 *
 * @param content - YAML content as string
 * @returns Parsed YAML data
 * @throws Error if YAML is invalid
 */
export function parseYAML(content: string): unknown {
  const result = validateYAML(content);

  if (!result.valid) {
    const errorMessages = result.errors.map((e) => e.message).join('; ');
    throw new Error(`Invalid YAML: ${errorMessages}`);
  }

  return result.data;
}

/**
 * Safely get a nested property from an object
 *
 * @param obj - Object to get property from
 * @param path - Dot-separated path (e.g., 'jobs.build.steps')
 * @param defaultValue - Default value if path not found
 * @returns Property value or default
 */
export function getNestedProperty(
  obj: unknown,
  path: string,
  defaultValue?: unknown
): unknown {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (
      !current ||
      typeof current !== 'object' ||
      !(key in current)
    ) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current ?? defaultValue;
}

/**
 * Check if a value is an object (and not null or array)
 *
 * @param value - Value to check
 * @returns True if value is a plain object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Check if a value is a non-empty string
 *
 * @param value - Value to check
 * @returns True if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is an array
 *
 * @param value - Value to check
 * @returns True if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Normalize string or array to array
 *
 * @param value - String or array value
 * @returns Array of strings
 */
export function normalizeToArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string');
  }
  return [];
}
