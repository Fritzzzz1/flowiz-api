/**
 * Parallel Groups Analyzer Tests
 */

import { ParallelGroupsAnalyzer } from '@/services/analyzers/parallel-groups.analyzer';
import { DependencyGraphAnalyzer } from '@/services/analyzers/dependency-graph.analyzer';
import type { Pipeline } from '@/types/pipeline.types';

describe('ParallelGroupsAnalyzer', () => {
  let analyzer: ParallelGroupsAnalyzer;
  let graphAnalyzer: DependencyGraphAnalyzer;

  beforeEach(() => {
    analyzer = new ParallelGroupsAnalyzer();
    graphAnalyzer = new DependencyGraphAnalyzer();
  });

  describe('analyze', () => {
    it('should identify parallel groups in simple pipeline', () => {
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
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const dependencyGraph = graphAnalyzer.analyze(pipeline);
      const result = analyzer.analyze(pipeline, dependencyGraph);

      expect(result.totalLevels).toBe(2);
      expect(result.groups).toHaveLength(2);

      // Level 0 should have build
      const level0 = result.groups.find((g) => g.level === 0);
      expect(level0?.jobs).toContain('build');

      // Level 1 should have test1 and test2
      const level1 = result.groups.find((g) => g.level === 1);
      expect(level1?.jobs).toContain('test1');
      expect(level1?.jobs).toContain('test2');
      expect(result.maxParallelism).toBe(2);
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
          {
            id: 'job3',
            name: 'Job 3',
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

      const dependencyGraph = graphAnalyzer.analyze(pipeline);
      const result = analyzer.analyze(pipeline, dependencyGraph);

      expect(result.totalLevels).toBe(1);
      expect(result.maxParallelism).toBe(3);
      expect(result.groups[0].jobs).toHaveLength(3);
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

      expect(result.groups).toEqual([]);
      expect(result.maxParallelism).toBe(0);
      expect(result.totalLevels).toBe(0);
    });

    it('should calculate max duration for each group', () => {
      const pipeline: Pipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        platform: 'github-actions',
        jobs: [
          {
            id: 'test1',
            name: 'Test 1',
            dependsOn: [],
            steps: [],
            timeout: 100,
          },
          {
            id: 'test2',
            name: 'Test 2',
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
      const result = analyzer.analyze(pipeline, dependencyGraph);

      expect(result.groups[0].maxDuration).toBe(300); // Max of 100 and 300
    });

    it('should handle complex dependency hierarchy', () => {
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
          {
            id: 'job3',
            name: 'Job 3',
            dependsOn: [{ jobId: 'job2', type: 'needs' }],
            steps: [],
          },
          {
            id: 'job4',
            name: 'Job 4',
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

      const dependencyGraph = graphAnalyzer.analyze(pipeline);
      const result = analyzer.analyze(pipeline, dependencyGraph);

      expect(result.totalLevels).toBe(3);
      expect(result.groups.some((g) => g.level === 0)).toBe(true);
      expect(result.groups.some((g) => g.level === 1)).toBe(true);
      expect(result.groups.some((g) => g.level === 2)).toBe(true);

      // Level 2 should have job3 and job4
      const level2 = result.groups.find((g) => g.level === 2);
      expect(level2?.jobs).toHaveLength(2);
    });
  });
});
