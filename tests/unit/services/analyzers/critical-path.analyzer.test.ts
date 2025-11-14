/**
 * Critical Path Analyzer Tests
 */

import { CriticalPathAnalyzer } from '@/services/analyzers/critical-path.analyzer';
import { DependencyGraphAnalyzer } from '@/services/analyzers/dependency-graph.analyzer';
import type { Pipeline } from '@/types/pipeline.types';

describe('CriticalPathAnalyzer', () => {
  let analyzer: CriticalPathAnalyzer;
  let graphAnalyzer: DependencyGraphAnalyzer;

  beforeEach(() => {
    analyzer = new CriticalPathAnalyzer();
    graphAnalyzer = new DependencyGraphAnalyzer();
  });

  describe('analyze', () => {
    it('should find critical path in simple pipeline', () => {
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
      const result = analyzer.analyze(pipeline, dependencyGraph);

      expect(result.path).toEqual(['build', 'test']);
      expect(result.totalDuration).toBe(900); // 300 + 600
      expect(result.jobs).toHaveLength(2);
    });

    it('should find longest path when multiple paths exist', () => {
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
            id: 'test-fast',
            name: 'Fast Test',
            dependsOn: [{ jobId: 'build', type: 'needs' }],
            steps: [],
            timeout: 100,
          },
          {
            id: 'test-slow',
            name: 'Slow Test',
            dependsOn: [{ jobId: 'build', type: 'needs' }],
            steps: [],
            timeout: 600,
          },
          {
            id: 'deploy',
            name: 'Deploy',
            dependsOn: [
              { jobId: 'test-fast', type: 'needs' },
              { jobId: 'test-slow', type: 'needs' },
            ],
            steps: [],
            timeout: 180,
          },
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const dependencyGraph = graphAnalyzer.analyze(pipeline);
      const result = analyzer.analyze(pipeline, dependencyGraph);

      // Critical path should go through slow test
      expect(result.path).toContain('build');
      expect(result.path).toContain('test-slow');
      expect(result.path).toContain('deploy');
      expect(result.totalDuration).toBe(1080); // 300 + 600 + 180
    });

    it('should return empty result for pipeline with cycles', () => {
      const pipeline: Pipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        platform: 'github-actions',
        jobs: [
          {
            id: 'job1',
            name: 'Job 1',
            dependsOn: [{ jobId: 'job2', type: 'needs' }],
            steps: [],
          },
          {
            id: 'job2',
            name: 'Job 2',
            dependsOn: [{ jobId: 'job1', type: 'needs' }],
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
      const result = analyzer.analyze(pipeline, dependencyGraph);

      expect(result.path).toEqual([]);
      expect(result.totalDuration).toBe(0);
      expect(result.jobs).toEqual([]);
    });

    it('should calculate cumulative durations correctly', () => {
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
            dependsOn: [{ jobId: 'job1', type: 'needs' }],
            steps: [],
            timeout: 200,
          },
          {
            id: 'job3',
            name: 'Job 3',
            dependsOn: [{ jobId: 'job2', type: 'needs' }],
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
      const result = analyzer.analyze(pipeline, dependencyGraph);

      expect(result.jobs[0].cumulativeDuration).toBe(100);
      expect(result.jobs[1].cumulativeDuration).toBe(300);
      expect(result.jobs[2].cumulativeDuration).toBe(600);
    });
  });
});
