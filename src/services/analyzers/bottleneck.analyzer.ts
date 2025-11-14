/**
 * Bottleneck Analyzer
 *
 * Identifies jobs that slow down the pipeline and provides optimization suggestions.
 */

import type { Pipeline, Job } from '@/types/pipeline.types';
import type {
  BottleneckAnalysis,
  Bottleneck,
  BottleneckType,
  BottleneckSuggestion,
  DependencyGraphAnalysis,
  CriticalPathAnalysis,
} from '@/types/analysis.types';

/**
 * Analyzes bottlenecks in a pipeline
 */
export class BottleneckAnalyzer {
  /**
   * Threshold multiplier for long duration detection
   */
  private readonly LONG_DURATION_THRESHOLD = 2;

  /**
   * Threshold for high fan-out detection
   */
  private readonly HIGH_FAN_OUT_THRESHOLD = 3;

  /**
   * Analyzes bottlenecks in the pipeline
   */
  analyze(
    pipeline: Pipeline,
    dependencyGraph: DependencyGraphAnalysis,
    criticalPath: CriticalPathAnalysis
  ): BottleneckAnalysis {
    const jobDurations = this.calculateJobDurations(pipeline);
    const avgDuration = this.calculateAverageDuration(jobDurations);
    const dependentCounts = this.calculateDependentCounts(pipeline, dependencyGraph.graph);

    const bottlenecks: Bottleneck[] = [];

    for (const job of pipeline.jobs) {
      const duration = jobDurations.get(job.id) || 0;
      const dependentCount = dependentCounts.get(job.id) || 0;
      const reasons: BottleneckType[] = [];

      // Check for long duration
      if (duration > avgDuration * this.LONG_DURATION_THRESHOLD) {
        reasons.push('long_duration');
      }

      // Check for high fan-out
      if (dependentCount > this.HIGH_FAN_OUT_THRESHOLD) {
        reasons.push('high_fan_out');
      }

      // Check if on critical path
      if (criticalPath.path.includes(job.id)) {
        reasons.push('critical_path');
      }

      // Check for serial execution
      if (this.isSerialExecution(job, dependentCount)) {
        reasons.push('serial_execution');
      }

      // If job has any bottleneck characteristics, add it
      if (reasons.length > 0) {
        const impact = this.calculateImpact(job.id, dependencyGraph.graph);
        const suggestions = this.generateSuggestions(reasons);

        bottlenecks.push({
          jobId: job.id,
          reasons,
          impact,
          duration,
          dependentCount,
          suggestions,
        });
      }
    }

    // Sort bottlenecks by impact (descending)
    bottlenecks.sort((a, b) => b.impact - a.impact);

    // Find longest job
    let longestJob = { id: '', duration: 0 };
    for (const [jobId, duration] of jobDurations) {
      if (duration > longestJob.duration) {
        longestJob = { id: jobId, duration };
      }
    }

    return {
      bottlenecks,
      avgDuration,
      longestJob,
    };
  }

  /**
   * Calculates estimated duration for each job
   */
  private calculateJobDurations(pipeline: Pipeline): Map<string, number> {
    const durations = new Map<string, number>();

    for (const job of pipeline.jobs) {
      const duration = this.estimateDuration(job);
      durations.set(job.id, duration);
    }

    return durations;
  }

  /**
   * Estimates the duration of a job in seconds
   */
  private estimateDuration(job: Job): number {
    // Use timeout if available
    if (job.timeout && job.timeout > 0) {
      return job.timeout;
    }

    // Default estimates based on job name patterns
    const jobName = job.name.toLowerCase();
    const jobId = job.id.toLowerCase();

    if (jobName.includes('build') || jobId.includes('build')) {
      return 300; // 5 minutes
    }
    if (jobName.includes('test') || jobId.includes('test')) {
      return 600; // 10 minutes
    }
    if (jobName.includes('deploy') || jobId.includes('deploy')) {
      return 180; // 3 minutes
    }

    return 300; // 5 minutes default
  }

  /**
   * Calculates average duration across all jobs
   */
  private calculateAverageDuration(durations: Map<string, number>): number {
    if (durations.size === 0) return 0;

    let total = 0;
    for (const duration of durations.values()) {
      total += duration;
    }

    return total / durations.size;
  }

  /**
   * Calculates how many jobs depend on each job
   */
  private calculateDependentCounts(
    pipeline: Pipeline,
    graph: Map<string, Set<string>>
  ): Map<string, number> {
    const counts = new Map<string, number>();

    // Initialize all jobs with 0
    for (const job of pipeline.jobs) {
      counts.set(job.id, 0);
    }

    // Count dependents from graph
    for (const [jobId, dependents] of graph) {
      counts.set(jobId, dependents.size);
    }

    return counts;
  }

  /**
   * Checks if a job represents a serial execution bottleneck
   */
  private isSerialExecution(job: Job, dependentCount: number): boolean {
    return job.dependsOn.length > 0 && dependentCount > 0;
  }

  /**
   * Calculates the impact of a job (number of jobs transitively affected)
   */
  private calculateImpact(jobId: string, graph: Map<string, Set<string>>): number {
    const visited = new Set<string>();

    const dfs = (node: string): void => {
      visited.add(node);
      for (const neighbor of graph.get(node) || []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      }
    };

    dfs(jobId);
    return visited.size - 1; // Exclude the job itself
  }

  /**
   * Generates optimization suggestions based on bottleneck reasons
   */
  private generateSuggestions(reasons: BottleneckType[]): BottleneckSuggestion[] {
    const suggestions: BottleneckSuggestion[] = [];

    for (const reason of reasons) {
      switch (reason) {
        case 'long_duration':
          suggestions.push({
            type: reason,
            suggestion: 'Consider parallelizing or caching to reduce execution time',
          });
          break;
        case 'high_fan_out':
          suggestions.push({
            type: reason,
            suggestion: 'Consider splitting into smaller, more focused jobs',
          });
          break;
        case 'critical_path':
          suggestions.push({
            type: reason,
            suggestion: 'Optimizing this job will directly reduce total pipeline time',
          });
          break;
        case 'serial_execution':
          suggestions.push({
            type: reason,
            suggestion: 'Look for opportunities to parallelize job dependencies',
          });
          break;
      }
    }

    return suggestions;
  }
}
