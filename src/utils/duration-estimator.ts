/**
 * Duration Estimation Utility
 *
 * Provides job duration estimation based on job characteristics
 */

import type { Job } from '@/types/pipeline.types';

/**
 * Default job duration estimates (in seconds)
 */
export const DEFAULT_JOB_DURATIONS = {
  build: 300, // 5 minutes
  test: 600, // 10 minutes
  deploy: 180, // 3 minutes
  default: 300, // 5 minutes
} as const;

/**
 * Estimate the duration of a job based on its characteristics
 *
 * @param job - The job to estimate duration for
 * @returns Estimated duration in seconds
 */
export function estimateJobDuration(job: Job): number {
  // Use explicit timeout if available
  if (job.timeout && job.timeout > 0) {
    return job.timeout;
  }

  const jobName = job.name.toLowerCase();
  const jobId = job.id.toLowerCase();

  // Check for common job type patterns
  if (jobName.includes('build') || jobId.includes('build')) {
    return DEFAULT_JOB_DURATIONS.build;
  }

  if (jobName.includes('test') || jobId.includes('test')) {
    return DEFAULT_JOB_DURATIONS.test;
  }

  if (jobName.includes('deploy') || jobId.includes('deploy')) {
    return DEFAULT_JOB_DURATIONS.deploy;
  }

  // Default estimate
  return DEFAULT_JOB_DURATIONS.default;
}

/**
 * Estimate total pipeline duration based on parallel execution
 * This is a simple estimate that assumes perfect parallelization
 *
 * @param jobs - Array of jobs with estimated durations
 * @param parallelGroups - Array of parallel group levels
 * @returns Estimated total duration in seconds
 */
export function estimatePipelineDuration(
  jobs: Job[],
  parallelGroups?: Array<{ level: number; jobs: string[] }>
): number {
  if (!parallelGroups || parallelGroups.length === 0) {
    // No parallelization info, sum all durations
    return jobs.reduce((sum, job) => sum + estimateJobDuration(job), 0);
  }

  // Sum the max duration at each level
  return parallelGroups.reduce((totalDuration, group) => {
    const groupJobs = jobs.filter((job) => group.jobs.includes(job.id));
    const maxDurationInGroup = Math.max(...groupJobs.map(estimateJobDuration));
    return totalDuration + maxDurationInGroup;
  }, 0);
}
