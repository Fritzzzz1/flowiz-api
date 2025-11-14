/**
 * Dependency Graph Analyzer Tests
 */

import { DependencyGraphAnalyzer } from '@/services/analyzers/dependency-graph.analyzer';
import type { Pipeline } from '@/types/pipeline.types';

describe('DependencyGraphAnalyzer', () => {
  let analyzer: DependencyGraphAnalyzer;

  beforeEach(() => {
    analyzer = new DependencyGraphAnalyzer();
  });

  describe('analyze', () => {
    it('should build a simple dependency graph', () => {
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

      const result = analyzer.analyze(pipeline);

      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toHaveLength(0);
      expect(result.topologicalOrder).toEqual(['job1', 'job2']);
      expect(result.graph.size).toBe(2);
      expect(result.graph.get('job1')?.has('job2')).toBe(true);
    });

    it('should detect a simple cycle', () => {
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

      const result = analyzer.analyze(pipeline);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.topologicalOrder).toEqual([]);
    });

    it('should handle complex dependency graph', () => {
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
            id: 'deploy',
            name: 'Deploy',
            dependsOn: [
              { jobId: 'test1', type: 'needs' },
              { jobId: 'test2', type: 'needs' },
            ],
            steps: [],
          },
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const result = analyzer.analyze(pipeline);

      expect(result.hasCycles).toBe(false);
      expect(result.topologicalOrder).toContain('build');
      expect(result.topologicalOrder).toContain('test1');
      expect(result.topologicalOrder).toContain('test2');
      expect(result.topologicalOrder).toContain('deploy');

      // Build should come before test1 and test2
      const buildIndex = result.topologicalOrder.indexOf('build');
      const test1Index = result.topologicalOrder.indexOf('test1');
      const test2Index = result.topologicalOrder.indexOf('test2');
      const deployIndex = result.topologicalOrder.indexOf('deploy');

      expect(buildIndex).toBeLessThan(test1Index);
      expect(buildIndex).toBeLessThan(test2Index);
      expect(test1Index).toBeLessThan(deployIndex);
      expect(test2Index).toBeLessThan(deployIndex);
    });

    it('should handle pipeline with no dependencies', () => {
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
          },
          {
            id: 'job2',
            name: 'Job 2',
            dependsOn: [],
            steps: [],
          },
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const result = analyzer.analyze(pipeline);

      expect(result.hasCycles).toBe(false);
      expect(result.topologicalOrder).toHaveLength(2);
      expect(result.graph.size).toBe(2);
    });

    it('should detect complex cycle', () => {
      const pipeline: Pipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        platform: 'github-actions',
        jobs: [
          {
            id: 'job1',
            name: 'Job 1',
            dependsOn: [{ jobId: 'job3', type: 'needs' }],
            steps: [],
          },
          {
            id: 'job2',
            name: 'Job 2',
            dependsOn: [{ jobId: 'job1', type: 'needs' }],
            steps: [],
          },
          {
            id: 'job3',
            name: 'Job 3',
            dependsOn: [{ jobId: 'job2', type: 'needs' }],
            steps: [],
          },
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const result = analyzer.analyze(pipeline);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
    });
  });
});
