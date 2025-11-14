/**
 * Bottleneck Analyzer Tests
 */

import { BottleneckAnalyzer } from '@/services/analyzers/bottleneck.analyzer';
import { DependencyGraphAnalyzer } from '@/services/analyzers/dependency-graph.analyzer';
import { CriticalPathAnalyzer } from '@/services/analyzers/critical-path.analyzer';
import type { Pipeline } from '@/types/pipeline.types';

describe('BottleneckAnalyzer', () => {
  let analyzer: BottleneckAnalyzer;
  let graphAnalyzer: DependencyGraphAnalyzer;
  let pathAnalyzer: CriticalPathAnalyzer;

  beforeEach(() => {
    analyzer = new BottleneckAnalyzer();
    graphAnalyzer = new DependencyGraphAnalyzer();
    pathAnalyzer = new CriticalPathAnalyzer();
  });

  describe('analyze', () => {
    it('should identify long duration bottleneck', () => {
      const pipeline: Pipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        platform: 'github-actions',
        jobs: [
          {
            id: 'fast-job1',
            name: 'Fast Job 1',
            dependsOn: [],
            steps: [],
            timeout: 100,
          },
          {
            id: 'fast-job2',
            name: 'Fast Job 2',
            dependsOn: [],
            steps: [],
            timeout: 100,
          },
          {
            id: 'fast-job3',
            name: 'Fast Job 3',
            dependsOn: [],
            steps: [],
            timeout: 100,
          },
          {
            id: 'slow-job',
            name: 'Slow Job',
            dependsOn: [],
            steps: [],
            timeout: 1000, // 10x longer than others (avg=325, threshold=650)
          },
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const dependencyGraph = graphAnalyzer.analyze(pipeline);
      const criticalPath = pathAnalyzer.analyze(pipeline, dependencyGraph);
      const result = analyzer.analyze(pipeline, dependencyGraph, criticalPath);

      const slowJobBottleneck = result.bottlenecks.find(
        (b) => b.jobId === 'slow-job'
      );
      expect(slowJobBottleneck).toBeDefined();
      expect(slowJobBottleneck?.reasons).toContain('long_duration');
    });

    it('should identify high fan-out bottleneck', () => {
      const pipeline: Pipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        platform: 'github-actions',
        jobs: [
          {
            id: 'build',
            name: 'Build',
            dependsOn: [],
            steps: [],
          },
          {
            id: 'test1',
            name: 'Test 1',
            dependsOn: [{ jobId: 'build', type: 'needs' }],
            steps: [],
          },
          {
            id: 'test2',
            name: 'Test 2',
            dependsOn: [{ jobId: 'build', type: 'needs' }],
            steps: [],
          },
          {
            id: 'test3',
            name: 'Test 3',
            dependsOn: [{ jobId: 'build', type: 'needs' }],
            steps: [],
          },
          {
            id: 'test4',
            name: 'Test 4',
            dependsOn: [{ jobId: 'build', type: 'needs' }],
            steps: [],
          },
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const dependencyGraph = graphAnalyzer.analyze(pipeline);
      const criticalPath = pathAnalyzer.analyze(pipeline, dependencyGraph);
      const result = analyzer.analyze(pipeline, dependencyGraph, criticalPath);

      const buildBottleneck = result.bottlenecks.find((b) => b.jobId === 'build');
      expect(buildBottleneck).toBeDefined();
      expect(buildBottleneck?.reasons).toContain('high_fan_out');
      expect(buildBottleneck?.dependentCount).toBe(4);
    });

    it('should identify jobs on critical path', () => {
      const pipeline: Pipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        platform: 'github-actions',
        jobs: [
          {
            id: 'build',
            name: 'Build',
            dependsOn: [],
            steps: [],
            timeout: 300,
          },
          {
            id: 'test',
            name: 'Test',
            dependsOn: [{ jobId: 'build', type: 'needs' }],
            steps: [],
            timeout: 600,
          },
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const dependencyGraph = graphAnalyzer.analyze(pipeline);
      const criticalPath = pathAnalyzer.analyze(pipeline, dependencyGraph);
      const result = analyzer.analyze(pipeline, dependencyGraph, criticalPath);

      // Both jobs should be on critical path
      const buildBottleneck = result.bottlenecks.find((b) => b.jobId === 'build');
      const testBottleneck = result.bottlenecks.find((b) => b.jobId === 'test');

      expect(buildBottleneck?.reasons).toContain('critical_path');
      expect(testBottleneck?.reasons).toContain('critical_path');
    });

    it('should calculate average duration correctly', () => {
      const pipeline: Pipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        platform: 'github-actions',
        jobs: [
          {
            id: 'job1',
            name: 'Job 1',
            dependsOn: [],
            steps: [],
            timeout: 100,
          },
          {
            id: 'job2',
            name: 'Job 2',
            dependsOn: [],
            steps: [],
            timeout: 200,
          },
          {
            id: 'job3',
            name: 'Job 3',
            dependsOn: [],
            steps: [],
            timeout: 300,
          },
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const dependencyGraph = graphAnalyzer.analyze(pipeline);
      const criticalPath = pathAnalyzer.analyze(pipeline, dependencyGraph);
      const result = analyzer.analyze(pipeline, dependencyGraph, criticalPath);

      expect(result.avgDuration).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should generate appropriate suggestions', () => {
      const pipeline: Pipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        platform: 'github-actions',
        jobs: [
          {
            id: 'fast-job1',
            name: 'Fast Job 1',
            dependsOn: [],
            steps: [],
            timeout: 100,
          },
          {
            id: 'fast-job2',
            name: 'Fast Job 2',
            dependsOn: [],
            steps: [],
            timeout: 100,
          },
          {
            id: 'slow-job',
            name: 'Slow Job',
            dependsOn: [],
            steps: [],
            timeout: 1000, // Much longer than average (avg=400, threshold=800)
          },
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const dependencyGraph = graphAnalyzer.analyze(pipeline);
      const criticalPath = pathAnalyzer.analyze(pipeline, dependencyGraph);
      const result = analyzer.analyze(pipeline, dependencyGraph, criticalPath);

      const slowJobBottleneck = result.bottlenecks.find(
        (b) => b.jobId === 'slow-job'
      );
      expect(slowJobBottleneck).toBeDefined();
      expect(slowJobBottleneck!.suggestions.length).toBeGreaterThan(0);
      expect(
        slowJobBottleneck!.suggestions.some((s) => s.type === 'long_duration')
      ).toBe(true);
    });
  });
});
