/**
 * Analysis result types
 *
 * Types for pipeline analysis results
 */

/**
 * Cycle in dependency graph
 */
export interface DependencyCycle {
  path: string[]; // Job IDs in the cycle
  length: number;
}

/**
 * Dependency graph analysis result
 */
export interface DependencyGraphAnalysis {
  graph: Map<string, Set<string>>; // Adjacency list
  topologicalOrder: string[]; // Job IDs in topological order
  cycles: DependencyCycle[];
  hasCycles: boolean;
}

/**
 * Job in critical path
 */
export interface CriticalPathJob {
  id: string;
  duration: number;
  cumulativeDuration: number;
}

/**
 * Critical path analysis result
 */
export interface CriticalPathAnalysis {
  path: string[]; // Job IDs in critical path
  totalDuration: number; // Total duration in seconds
  jobs: CriticalPathJob[];
}

/**
 * Bottleneck type
 */
export type BottleneckType =
  | 'long_duration'
  | 'high_fan_out'
  | 'critical_path'
  | 'serial_execution';

/**
 * Bottleneck suggestion
 */
export interface BottleneckSuggestion {
  type: BottleneckType;
  suggestion: string;
}

/**
 * Bottleneck job
 */
export interface Bottleneck {
  jobId: string;
  reasons: BottleneckType[];
  impact: number; // Number of jobs affected
  duration: number;
  dependentCount: number;
  suggestions: BottleneckSuggestion[];
}

/**
 * Bottleneck analysis result
 */
export interface BottleneckAnalysis {
  bottlenecks: Bottleneck[];
  avgDuration: number;
  longestJob: {
    id: string;
    duration: number;
  };
}

/**
 * Parallel group of jobs
 */
export interface ParallelGroup {
  level: number;
  jobs: string[]; // Job IDs
  maxDuration: number;
}

/**
 * Parallel groups analysis result
 */
export interface ParallelGroupsAnalysis {
  groups: ParallelGroup[];
  maxParallelism: number; // Max jobs in any level
  totalLevels: number;
}

/**
 * Complete pipeline analysis result
 */
export interface PipelineAnalysis {
  pipelineId: string;
  dependencyGraph: DependencyGraphAnalysis;
  criticalPath: CriticalPathAnalysis;
  bottlenecks: BottleneckAnalysis;
  parallelGroups: ParallelGroupsAnalysis;
  analyzedAt: string;
}
