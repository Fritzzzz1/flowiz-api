/**
 * Critical Path Analyzer
 *
 * Finds the longest path through the dependency graph (critical path).
 * The critical path represents the minimum time needed to complete the pipeline.
 */

import type { Pipeline, Job } from '@/types/pipeline.types';
import type {
  CriticalPathAnalysis,
  CriticalPathJob,
  DependencyGraphAnalysis,
} from '@/types/analysis.types';

/**
 * Analyzes the critical path in a pipeline
 */
export class CriticalPathAnalyzer {
  /**
   * Default estimated durations by job name patterns (in seconds)
   */
  private readonly DEFAULT_DURATIONS: Record<string, number> = {
    build: 300, // 5 minutes
    test: 600, // 10 minutes
    deploy: 180, // 3 minutes
    default: 300, // 5 minutes
  };

  /**
   * Analyzes the critical path of a pipeline
   */
  analyze(
    pipeline: Pipeline,
    dependencyGraph: DependencyGraphAnalysis
  ): CriticalPathAnalysis {
    // Can't calculate critical path if there are cycles
    if (dependencyGraph.hasCycles) {
      return {
        path: [],
        totalDuration: 0,
        jobs: [],
      };
    }

    const { topologicalOrder } = dependencyGraph;
    const jobMap = this.buildJobMap(pipeline);

    // Calculate distances using longest path algorithm
    // dist[job] = longest path from any start node to this job
    const dist = new Map<string, number>();
    const parent = new Map<string, string | null>();

    // Initialize all jobs with distance 0
    for (const jobId of topologicalOrder) {
      dist.set(jobId, 0);
      parent.set(jobId, null);
    }

    // Process jobs in topological order
    for (const jobId of topologicalOrder) {
      const job = jobMap.get(jobId);
      if (!job) continue;

      // For each dependency of this job, check if path through dependency is longer
      for (const dep of job.dependsOn) {
        const depId = dep.jobId;
        const depDist = dist.get(depId) || 0;
        const depJob = jobMap.get(depId);
        const depDuration = depJob ? this.estimateDuration(depJob) : 0;

        const newDist = depDist + depDuration;

        if (newDist > (dist.get(jobId) || 0)) {
          dist.set(jobId, newDist);
          parent.set(jobId, depId);
        }
      }
    }

    // Find the job with maximum distance (end of critical path)
    let maxDist = 0;
    let endJob: string | null = null;

    for (const jobId of topologicalOrder) {
      const job = jobMap.get(jobId);
      if (!job) continue;

      const jobDuration = this.estimateDuration(job);
      const totalDist = (dist.get(jobId) || 0) + jobDuration;

      if (totalDist > maxDist) {
        maxDist = totalDist;
        endJob = jobId;
      }
    }

    // If no path found, return empty result
    if (!endJob) {
      return {
        path: [],
        totalDuration: 0,
        jobs: [],
      };
    }

    // Build critical path by following parent pointers backwards
    const path: string[] = [];
    let current: string | null = endJob;

    while (current !== null) {
      path.push(current);
      current = parent.get(current) || null;
    }

    // Reverse to get path from start to end
    path.reverse();

    // Build jobs array with durations
    const jobs: CriticalPathJob[] = [];
    let cumulativeDuration = 0;

    for (const jobId of path) {
      const job = jobMap.get(jobId);
      if (!job) continue;

      const duration = this.estimateDuration(job);
      cumulativeDuration += duration;

      jobs.push({
        id: jobId,
        duration,
        cumulativeDuration,
      });
    }

    return {
      path,
      totalDuration: cumulativeDuration,
      jobs,
    };
  }

  /**
   * Estimates the duration of a job in seconds
   */
  private estimateDuration(job: Job): number {
    // If job has a timeout, use that as an upper bound estimate
    if (job.timeout && job.timeout > 0) {
      return job.timeout;
    }

    // Estimate based on job name/id patterns
    const jobName = job.name.toLowerCase();
    const jobId = job.id.toLowerCase();

    for (const [pattern, duration] of Object.entries(this.DEFAULT_DURATIONS)) {
      if (
        pattern !== 'default' &&
        (jobName.includes(pattern) || jobId.includes(pattern))
      ) {
        return duration;
      }
    }

    return this.DEFAULT_DURATIONS.default;
  }

  /**
   * Builds a map of job IDs to jobs for quick lookup
   */
  private buildJobMap(pipeline: Pipeline): Map<string, Job> {
    const map = new Map<string, Job>();
    for (const job of pipeline.jobs) {
      map.set(job.id, job);
    }
    return map;
  }
}
