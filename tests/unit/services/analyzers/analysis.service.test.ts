/**
 * Analysis Service Tests
 */

import { AnalysisService } from '@/services/analyzers/analysis.service';
import type { Pipeline } from '@/types/pipeline.types';

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(() => {
    service = new AnalysisService();
  });

  describe('analyze', () => {
    it('should perform complete analysis on a pipeline', () => {
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
          {
            id: 'deploy',
            name: 'Deploy',
            dependsOn: [{ jobId: 'test', type: 'needs' }],
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

      const result = service.analyze(pipeline);

      expect(result.pipelineId).toBe('test-pipeline');
      expect(result.dependencyGraph).toBeDefined();
      expect(result.criticalPath).toBeDefined();
      expect(result.bottlenecks).toBeDefined();
      expect(result.parallelGroups).toBeDefined();
      expect(result.analyzedAt).toBeDefined();

      // Verify dependency graph
      expect(result.dependencyGraph.hasCycles).toBe(false);
      expect(result.dependencyGraph.topologicalOrder).toHaveLength(3);

      // Verify critical path
      expect(result.criticalPath.path).toEqual(['build', 'test', 'deploy']);
      expect(result.criticalPath.totalDuration).toBe(1080);

      // Verify parallel groups
      expect(result.parallelGroups.totalLevels).toBe(3);
      expect(result.parallelGroups.maxParallelism).toBe(1);
    });

    it('should handle pipeline with parallel jobs', () => {
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
        ],
        triggers: {},
        metadata: {
          fileName: 'test.yml',
          parsedAt: new Date().toISOString(),
        },
      };

      const result = service.analyze(pipeline);

      expect(result.parallelGroups.maxParallelism).toBe(3);
      expect(result.bottlenecks.bottlenecks.some((b) => b.jobId === 'build')).toBe(true);
    });
  });

  describe('individual analyzers', () => {
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

    it('should analyze dependency graph only', () => {
      const result = service.analyzeDependencyGraph(pipeline);

      expect(result.hasCycles).toBe(false);
      expect(result.topologicalOrder).toEqual(['job1', 'job2']);
    });

    it('should analyze critical path only', () => {
      const result = service.analyzeCriticalPath(pipeline);

      expect(result.path).toEqual(['job1', 'job2']);
    });

    it('should analyze bottlenecks only', () => {
      const result = service.analyzeBottlenecks(pipeline);

      expect(result.bottlenecks).toBeDefined();
      expect(result.avgDuration).toBeGreaterThan(0);
    });

    it('should analyze parallel groups only', () => {
      const result = service.analyzeParallelGroups(pipeline);

      expect(result.groups).toBeDefined();
      expect(result.totalLevels).toBe(2);
    });
  });
});
