/**
 * Analysis Service
 *
 * Orchestrates all pipeline analyzers to provide comprehensive analysis.
 */

import type { Pipeline } from '@/types/pipeline.types';
import type {
  PipelineAnalysis,
  DependencyGraphAnalysis,
  CriticalPathAnalysis,
  BottleneckAnalysis,
  ParallelGroupsAnalysis,
} from '@/types/analysis.types';
import { DependencyGraphAnalyzer } from './dependency-graph.analyzer';
import { CriticalPathAnalyzer } from './critical-path.analyzer';
import { BottleneckAnalyzer } from './bottleneck.analyzer';
import { ParallelGroupsAnalyzer } from './parallel-groups.analyzer';

/**
 * Service for analyzing pipelines
 */
export class AnalysisService {
  private dependencyGraphAnalyzer: DependencyGraphAnalyzer;
  private criticalPathAnalyzer: CriticalPathAnalyzer;
  private bottleneckAnalyzer: BottleneckAnalyzer;
  private parallelGroupsAnalyzer: ParallelGroupsAnalyzer;

  constructor() {
    this.dependencyGraphAnalyzer = new DependencyGraphAnalyzer();
    this.criticalPathAnalyzer = new CriticalPathAnalyzer();
    this.bottleneckAnalyzer = new BottleneckAnalyzer();
    this.parallelGroupsAnalyzer = new ParallelGroupsAnalyzer();
  }

  /**
   * Performs comprehensive analysis on a pipeline
   */
  analyze(pipeline: Pipeline): PipelineAnalysis {
    // Step 1: Build dependency graph and detect cycles
    const dependencyGraph = this.dependencyGraphAnalyzer.analyze(pipeline);

    // Step 2: Find critical path
    const criticalPath = this.criticalPathAnalyzer.analyze(pipeline, dependencyGraph);

    // Step 3: Identify bottlenecks
    const bottlenecks = this.bottleneckAnalyzer.analyze(pipeline, dependencyGraph, criticalPath);

    // Step 4: Identify parallel groups
    const parallelGroups = this.parallelGroupsAnalyzer.analyze(pipeline, dependencyGraph);

    return {
      pipelineId: pipeline.id,
      dependencyGraph,
      criticalPath,
      bottlenecks,
      parallelGroups,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Analyzes only the dependency graph
   */
  analyzeDependencyGraph(pipeline: Pipeline): DependencyGraphAnalysis {
    return this.dependencyGraphAnalyzer.analyze(pipeline);
  }

  /**
   * Analyzes only the critical path
   */
  analyzeCriticalPath(pipeline: Pipeline): CriticalPathAnalysis {
    const dependencyGraph = this.dependencyGraphAnalyzer.analyze(pipeline);
    return this.criticalPathAnalyzer.analyze(pipeline, dependencyGraph);
  }

  /**
   * Analyzes only bottlenecks
   */
  analyzeBottlenecks(pipeline: Pipeline): BottleneckAnalysis {
    const dependencyGraph = this.dependencyGraphAnalyzer.analyze(pipeline);
    const criticalPath = this.criticalPathAnalyzer.analyze(pipeline, dependencyGraph);
    return this.bottleneckAnalyzer.analyze(pipeline, dependencyGraph, criticalPath);
  }

  /**
   * Analyzes only parallel groups
   */
  analyzeParallelGroups(pipeline: Pipeline): ParallelGroupsAnalysis {
    const dependencyGraph = this.dependencyGraphAnalyzer.analyze(pipeline);
    return this.parallelGroupsAnalyzer.analyze(pipeline, dependencyGraph);
  }
}
