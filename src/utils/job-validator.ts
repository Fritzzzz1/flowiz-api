/**
 * Job Validation Utilities
 *
 * Validates job references and dependencies
 */

import type { Job, ParseWarning } from '@/types/pipeline.types';
import { WARNING_CODES } from '@/constants/parser-constants';

/**
 * Result of job reference validation
 */
export interface JobValidationResult {
  isValid: boolean;
  warnings: ParseWarning[];
  missingReferences: string[];
}

/**
 * Validates that all job dependencies reference existing jobs
 *
 * @param jobs - Array of jobs to validate
 * @returns Validation result with warnings for missing references
 */
export function validateJobReferences(jobs: Job[]): JobValidationResult {
  const jobIds = new Set(jobs.map((job) => job.id));
  const warnings: ParseWarning[] = [];
  const missingReferences: string[] = [];

  for (const job of jobs) {
    for (const dep of job.dependsOn) {
      if (!jobIds.has(dep.jobId)) {
        const missingRef = `${job.id} -> ${dep.jobId}`;

        if (!missingReferences.includes(missingRef)) {
          missingReferences.push(missingRef);

          warnings.push({
            code: WARNING_CODES.MISSING_DEPENDENCY,
            message: `Job "${job.id}" depends on "${dep.jobId}" which does not exist`,
            severity: 'warning',
            path: `jobs.${job.id}.dependsOn`,
          });
        }
      }
    }
  }

  return {
    isValid: missingReferences.length === 0,
    warnings,
    missingReferences,
  };
}

/**
 * Detects unused jobs (jobs that no other job depends on and aren't leaf nodes)
 *
 * @param jobs - Array of jobs to analyze
 * @returns Array of warnings for potentially unused jobs
 */
export function detectUnusedJobs(jobs: Job[]): ParseWarning[] {
  const dependedUpon = new Set<string>();
  const warnings: ParseWarning[] = [];

  // Find which jobs are depended upon
  for (const job of jobs) {
    for (const dep of job.dependsOn) {
      dependedUpon.add(dep.jobId);
    }
  }

  // Jobs that aren't depended upon and have dependencies themselves might be unused
  // (Leaf jobs are expected to not be depended upon)
  for (const job of jobs) {
    if (!dependedUpon.has(job.id) && job.dependsOn.length > 0) {
      warnings.push({
        code: WARNING_CODES.UNUSED_JOB,
        message: `Job "${job.id}" is not used by any other job - is this intentional?`,
        severity: 'warning',
        path: `jobs.${job.id}`,
      });
    }
  }

  return warnings;
}

/**
 * Validates that job IDs are unique
 *
 * @param jobs - Array of jobs to validate
 * @returns Validation warnings for duplicate job IDs
 */
export function validateUniqueJobIds(jobs: Job[]): ParseWarning[] {
  const seen = new Set<string>();
  const warnings: ParseWarning[] = [];

  for (const job of jobs) {
    if (seen.has(job.id)) {
      warnings.push({
        code: 'DUPLICATE_JOB_ID',
        message: `Duplicate job ID "${job.id}" found`,
        severity: 'warning',
        path: `jobs.${job.id}`,
      });
    }
    seen.add(job.id);
  }

  return warnings;
}

/**
 * Sanitizes job ID to ensure it's safe for use
 *
 * @param jobId - Job ID to sanitize
 * @returns Sanitized job ID
 */
export function sanitizeJobId(jobId: string): string {
  // Remove any characters that could be problematic
  return jobId
    .trim()
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .substring(0, 255); // Limit length
}

/**
 * Validates pipeline has at least one job
 *
 * @param jobs - Array of jobs
 * @throws Error if no jobs found
 */
export function validateHasJobs(jobs: Job[]): void {
  if (jobs.length === 0) {
    throw new Error('Pipeline must contain at least one job');
  }
}
