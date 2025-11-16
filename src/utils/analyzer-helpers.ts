/**
 * Analyzer Helper Utilities
 *
 * Common helper functions used across multiple analyzers
 */

import type { Pipeline, Job } from '@/types/pipeline.types';

/**
 * Builds a map of job IDs to Job objects for quick lookup
 *
 * @param pipeline - The pipeline containing jobs
 * @returns Map from job ID to Job object
 */
export function buildJobMap(pipeline: Pipeline): Map<string, Job> {
  const map = new Map<string, Job>();
  for (const job of pipeline.jobs) {
    map.set(job.id, job);
  }
  return map;
}

/**
 * Builds a reverse dependency map (job ID to jobs that depend on it)
 *
 * @param pipeline - The pipeline containing jobs
 * @returns Map from job ID to set of dependent job IDs
 */
export function buildReverseDependencyMap(pipeline: Pipeline): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  // Initialize all jobs
  for (const job of pipeline.jobs) {
    map.set(job.id, new Set());
  }

  // Build reverse dependencies
  for (const job of pipeline.jobs) {
    for (const dep of job.dependsOn) {
      const dependentSet = map.get(dep.jobId);
      if (dependentSet) {
        dependentSet.add(job.id);
      }
    }
  }

  return map;
}

/**
 * Calculates the in-degree (number of dependencies) for each job
 *
 * @param pipeline - The pipeline containing jobs
 * @returns Map from job ID to in-degree count
 */
export function calculateInDegrees(pipeline: Pipeline): Map<string, number> {
  const inDegrees = new Map<string, number>();

  // Initialize all jobs with in-degree 0
  for (const job of pipeline.jobs) {
    inDegrees.set(job.id, job.dependsOn.length);
  }

  return inDegrees;
}

/**
 * Finds root jobs (jobs with no dependencies)
 *
 * @param pipeline - The pipeline containing jobs
 * @returns Array of root job IDs
 */
export function findRootJobs(pipeline: Pipeline): string[] {
  return pipeline.jobs.filter((job) => job.dependsOn.length === 0).map((job) => job.id);
}

/**
 * Finds leaf jobs (jobs that no other job depends on)
 *
 * @param pipeline - The pipeline containing jobs
 * @returns Array of leaf job IDs
 */
export function findLeafJobs(pipeline: Pipeline): string[] {
  const dependedUpon = new Set<string>();

  for (const job of pipeline.jobs) {
    for (const dep of job.dependsOn) {
      dependedUpon.add(dep.jobId);
    }
  }

  return pipeline.jobs.filter((job) => !dependedUpon.has(job.id)).map((job) => job.id);
}
