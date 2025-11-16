/**
 * Parallel Groups Analyzer
 *
 * Identifies which jobs can run in parallel by grouping them into execution levels.
 */

import type { Pipeline } from '@/types/pipeline.types';
import type {
  ParallelGroupsAnalysis,
  ParallelGroup,
  DependencyGraphAnalysis,
} from '@/types/analysis.types';
import { estimateJobDuration } from '@/utils/duration-estimator';
import { buildJobMap } from '@/utils/analyzer-helpers';

/**
 * Analyzes parallel execution groups in a pipeline
 */
export class ParallelGroupsAnalyzer {
  /**
   * Analyzes parallel groups in the pipeline
   */
  analyze(pipeline: Pipeline, dependencyGraph: DependencyGraphAnalysis): ParallelGroupsAnalysis {
    // Can't analyze parallel groups if there are cycles
    if (dependencyGraph.hasCycles) {
      return {
        groups: [],
        maxParallelism: 0,
        totalLevels: 0,
      };
    }

    const levels = this.assignLevels(pipeline, dependencyGraph.graph);
    const groups = this.buildGroups(pipeline, levels);

    const maxParallelism = groups.length > 0 ? Math.max(...groups.map((g) => g.jobs.length)) : 0;

    return {
      groups,
      maxParallelism,
      totalLevels: groups.length,
    };
  }

  /**
   * Assigns execution levels to jobs using BFS
   */
  private assignLevels(pipeline: Pipeline, graph: Map<string, Set<string>>): Map<string, number> {
    const levels = new Map<string, number>();
    const queue: Array<{ jobId: string; level: number }> = [];
    const jobMap = buildJobMap(pipeline);

    // Find root jobs (no dependencies)
    for (const job of pipeline.jobs) {
      if (job.dependsOn.length === 0) {
        queue.push({ jobId: job.id, level: 0 });
        levels.set(job.id, 0);
      }
    }

    // BFS to assign levels
    while (queue.length > 0) {
      const { jobId } = queue.shift()!;

      // Find jobs that depend on this job
      const dependents = graph.get(jobId) || new Set();

      for (const dependentId of dependents) {
        const dependentJob = jobMap.get(dependentId);
        if (!dependentJob) continue;

        // Check if all dependencies of the dependent job have been processed
        const allDepsProcessed = dependentJob.dependsOn.every((dep) => levels.has(dep.jobId));

        if (allDepsProcessed && !levels.has(dependentId)) {
          // Calculate level as max(dependency levels) + 1
          const depLevels = dependentJob.dependsOn.map((dep) => levels.get(dep.jobId) || 0);
          const maxDepLevel = depLevels.length > 0 ? Math.max(...depLevels) : -1;
          const newLevel = maxDepLevel + 1;

          levels.set(dependentId, newLevel);
          queue.push({ jobId: dependentId, level: newLevel });
        }
      }
    }

    return levels;
  }

  /**
   * Builds parallel groups from assigned levels
   */
  private buildGroups(pipeline: Pipeline, levels: Map<string, number>): ParallelGroup[] {
    // Find max level
    const levelValues = Array.from(levels.values());
    if (levelValues.length === 0) {
      return [];
    }

    const maxLevel = Math.max(...levelValues);
    const groups: ParallelGroup[] = [];
    const jobMap = buildJobMap(pipeline);

    // Group jobs by level
    for (let level = 0; level <= maxLevel; level++) {
      const jobsAtLevel = pipeline.jobs.filter((j) => levels.get(j.id) === level).map((j) => j.id);

      if (jobsAtLevel.length > 0) {
        // Calculate max duration for this group
        const durations = jobsAtLevel.map((jobId) => {
          const job = jobMap.get(jobId);
          return estimateJobDuration(job!);
        });

        const maxDuration = Math.max(...durations);

        groups.push({
          level,
          jobs: jobsAtLevel,
          maxDuration,
        });
      }
    }

    return groups;
  }
}
