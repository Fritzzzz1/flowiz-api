/**
 * Dependency Graph Analyzer
 *
 * Builds a directed graph representation of job dependencies and performs
 * cycle detection and topological sorting.
 */

import type { Pipeline } from '@/types/pipeline.types';
import type {
  DependencyGraphAnalysis,
  DependencyCycle,
} from '@/types/analysis.types';

/**
 * Analyzes pipeline dependencies and builds a dependency graph
 */
export class DependencyGraphAnalyzer {
  /**
   * Analyzes the dependency graph of a pipeline
   */
  analyze(pipeline: Pipeline): DependencyGraphAnalysis {
    const graph = this.buildGraph(pipeline);
    const cycles = this.detectCycles(graph);
    const topologicalOrder = cycles.length === 0 ? this.topologicalSort(graph) : [];

    return {
      graph,
      topologicalOrder,
      cycles,
      hasCycles: cycles.length > 0,
    };
  }

  /**
   * Builds an adjacency list representation of the dependency graph
   */
  private buildGraph(pipeline: Pipeline): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    // Initialize nodes
    for (const job of pipeline.jobs) {
      graph.set(job.id, new Set());
    }

    // Add edges (from job -> to its dependents)
    for (const job of pipeline.jobs) {
      for (const dep of job.dependsOn) {
        // dep.jobId depends on job
        // So we create edge: dep.jobId -> job
        // This means job must run before dep.jobId
        if (!graph.has(dep.jobId)) {
          graph.set(dep.jobId, new Set());
        }
        graph.get(dep.jobId)?.add(job.id);
      }
    }

    return graph;
  }

  /**
   * Detects cycles in the dependency graph using DFS
   */
  private detectCycles(graph: Map<string, Set<string>>): DependencyCycle[] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: DependencyCycle[] = [];

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      for (const neighbor of graph.get(node) || []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recStack.has(neighbor)) {
          // Cycle detected
          const cycleStart = path.indexOf(neighbor);
          const cyclePath = path.slice(cycleStart);
          cyclePath.push(neighbor); // Complete the cycle

          // Check if this cycle is already recorded
          const cycleExists = cycles.some(
            (c) =>
              c.path.length === cyclePath.length &&
              c.path.every((id, i) => id === cyclePath[i])
          );

          if (!cycleExists) {
            cycles.push({
              path: cyclePath,
              length: cyclePath.length - 1, // Don't count the repeated node
            });
          }
        }
      }

      recStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * Performs topological sort using Kahn's algorithm
   */
  private topologicalSort(graph: Map<string, Set<string>>): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degrees
    for (const node of graph.keys()) {
      inDegree.set(node, 0);
    }

    // Calculate in-degrees
    for (const [, neighbors] of graph) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }

    // Find nodes with in-degree 0
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      for (const neighbor of graph.get(node) || []) {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If result doesn't include all nodes, there's a cycle
    if (result.length !== graph.size) {
      return [];
    }

    return result;
  }
}
