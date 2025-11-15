/**
 * Analysis endpoint integration tests
 */

import request from 'supertest';
import app from '../../../src/app';
import type { Pipeline } from '../../../src/types/pipeline.types';

describe('POST /api/v1/analysis/analyze', () => {
  const validPipeline: Pipeline = {
    id: 'test-pipeline-1',
    name: 'Test CI',
    platform: 'github-actions',
    jobs: [
      {
        id: 'build',
        name: 'Build',
        dependsOn: [],
        steps: [
          {
            id: 'step_0',
            name: 'Checkout',
            uses: 'actions/checkout@v2',
          },
        ],
        runsOn: 'ubuntu-latest',
        timeout: 300,
      },
      {
        id: 'test',
        name: 'Test',
        dependsOn: [{ jobId: 'build', type: 'needs' }],
        steps: [
          {
            id: 'step_0',
            name: 'Run tests',
            command: 'npm test',
          },
        ],
        runsOn: 'ubuntu-latest',
        timeout: 600,
        needs: ['build'],
      },
      {
        id: 'deploy',
        name: 'Deploy',
        dependsOn: [{ jobId: 'test', type: 'needs' }],
        steps: [
          {
            id: 'step_0',
            name: 'Deploy',
            command: 'npm run deploy',
          },
        ],
        runsOn: 'ubuntu-latest',
        timeout: 180,
        needs: ['test'],
      },
    ],
    triggers: {
      branches: ['main'],
    },
    metadata: {
      fileName: 'ci.yml',
      parsedAt: new Date().toISOString(),
    },
  };

  describe('complete analysis', () => {
    it('should perform complete pipeline analysis', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({
          pipeline: validPipeline,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dependencyGraph');
      expect(response.body.data).toHaveProperty('criticalPath');
      expect(response.body.data).toHaveProperty('bottlenecks');
      expect(response.body.data).toHaveProperty('parallelGroups');
      expect(response.body.metadata).toHaveProperty('pipelineId');
      expect(response.body.metadata).toHaveProperty('jobCount');
    });

    it('should include dependency graph analysis', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({
          pipeline: validPipeline,
        })
        .expect(200);

      expect(response.body.data.dependencyGraph).toHaveProperty('graph');
      expect(response.body.data.dependencyGraph).toHaveProperty('hasCycles');
      expect(response.body.data.dependencyGraph).toHaveProperty('cycles');
      expect(response.body.data.dependencyGraph).toHaveProperty('topologicalOrder');
    });

    it('should include critical path analysis', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({
          pipeline: validPipeline,
        })
        .expect(200);

      expect(response.body.data.criticalPath).toHaveProperty('path');
      expect(response.body.data.criticalPath).toHaveProperty('totalDuration');
      expect(response.body.data.criticalPath).toHaveProperty('jobs');
      expect(response.body.data.criticalPath.path).toEqual(['build', 'test', 'deploy']);
    });

    it('should include bottleneck analysis', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({
          pipeline: validPipeline,
        })
        .expect(200);

      expect(response.body.data.bottlenecks).toHaveProperty('bottlenecks');
      expect(response.body.data.bottlenecks).toHaveProperty('avgDuration');
      expect(response.body.data.bottlenecks).toHaveProperty('longestJob');
      expect(Array.isArray(response.body.data.bottlenecks.bottlenecks)).toBe(true);
    });

    it('should include parallel groups analysis', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({
          pipeline: validPipeline,
        })
        .expect(200);

      expect(response.body.data.parallelGroups).toHaveProperty('groups');
      expect(response.body.data.parallelGroups).toHaveProperty('maxParallelism');
      expect(Array.isArray(response.body.data.parallelGroups.groups)).toBe(true);
    });
  });

  describe('analysis options', () => {
    it('should respect includeCycles option', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({
          pipeline: validPipeline,
          options: {
            includeCycles: false,
          },
        })
        .expect(200);

      expect(response.body.data).not.toHaveProperty('dependencyGraph');
    });

    it('should respect includeCriticalPath option', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({
          pipeline: validPipeline,
          options: {
            includeCriticalPath: false,
          },
        })
        .expect(200);

      expect(response.body.data).not.toHaveProperty('criticalPath');
    });

    it('should respect includeBottlenecks option', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({
          pipeline: validPipeline,
          options: {
            includeBottlenecks: false,
          },
        })
        .expect(200);

      expect(response.body.data).not.toHaveProperty('bottlenecks');
    });

    it('should respect includeParallelGroups option', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({
          pipeline: validPipeline,
          options: {
            includeParallelGroups: false,
          },
        })
        .expect(200);

      expect(response.body.data).not.toHaveProperty('parallelGroups');
    });
  });

  describe('validation errors', () => {
    it('should return 400 for missing pipeline', async () => {
      const response = await request(app).post('/api/v1/analysis/analyze').send({}).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for pipeline without jobs', async () => {
      const response = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({
          pipeline: {
            id: 'test',
            name: 'Test',
            platform: 'github-actions',
            jobs: [],
            triggers: {},
            metadata: { fileName: 'test.yml', parsedAt: new Date().toISOString() },
          },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('POST /api/v1/analysis/dependency-graph', () => {
  const simplePipeline: Pipeline = {
    id: 'test-pipeline-2',
    name: 'Test',
    platform: 'github-actions',
    jobs: [
      {
        id: 'job1',
        name: 'Job 1',
        dependsOn: [],
        steps: [{ id: 'step1', command: 'echo test' }],
      },
      {
        id: 'job2',
        name: 'Job 2',
        dependsOn: [{ jobId: 'job1', type: 'needs' }],
        steps: [{ id: 'step1', command: 'echo test' }],
        needs: ['job1'],
      },
    ],
    triggers: {},
    metadata: { fileName: 'test.yml', parsedAt: new Date().toISOString() },
  };

  it('should analyze dependency graph', async () => {
    const response = await request(app)
      .post('/api/v1/analysis/dependency-graph')
      .send({
        pipeline: simplePipeline,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('graph');
    expect(response.body.data).toHaveProperty('hasCycles');
    expect(response.body.data).toHaveProperty('cycles');
    expect(response.body.data).toHaveProperty('topologicalOrder');
  });

  it('should detect no cycles in acyclic graph', async () => {
    const response = await request(app)
      .post('/api/v1/analysis/dependency-graph')
      .send({
        pipeline: simplePipeline,
      })
      .expect(200);

    expect(response.body.data.hasCycles).toBe(false);
    expect(response.body.data.cycles).toEqual([]);
  });
});

describe('POST /api/v1/analysis/critical-path', () => {
  const pipelineWithPath: Pipeline = {
    id: 'test-pipeline-3',
    name: 'Test',
    platform: 'github-actions',
    jobs: [
      {
        id: 'build',
        name: 'Build',
        dependsOn: [],
        steps: [{ id: 'step1', command: 'build' }],
        timeout: 300,
      },
      {
        id: 'test',
        name: 'Test',
        dependsOn: [{ jobId: 'build', type: 'needs' }],
        steps: [{ id: 'step1', command: 'test' }],
        timeout: 600,
        needs: ['build'],
      },
    ],
    triggers: {},
    metadata: { fileName: 'test.yml', parsedAt: new Date().toISOString() },
  };

  it('should calculate critical path', async () => {
    const response = await request(app)
      .post('/api/v1/analysis/critical-path')
      .send({
        pipeline: pipelineWithPath,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('path');
    expect(response.body.data).toHaveProperty('totalDuration');
    expect(response.body.data).toHaveProperty('jobs');
    expect(response.body.data.path).toEqual(['build', 'test']);
  });

  it('should calculate correct total duration', async () => {
    const response = await request(app)
      .post('/api/v1/analysis/critical-path')
      .send({
        pipeline: pipelineWithPath,
      })
      .expect(200);

    expect(response.body.data.totalDuration).toBe(900); // 300 + 600
  });
});

describe('POST /api/v1/analysis/bottlenecks', () => {
  const pipelineWithBottleneck: Pipeline = {
    id: 'test-pipeline-4',
    name: 'Test',
    platform: 'github-actions',
    jobs: [
      {
        id: 'fast-job',
        name: 'Fast Job',
        dependsOn: [],
        steps: [{ id: 'step1', command: 'echo fast' }],
        timeout: 60,
      },
      {
        id: 'slow-job',
        name: 'Slow Job',
        dependsOn: [],
        steps: [{ id: 'step1', command: 'echo slow' }],
        timeout: 1800, // Much longer than average
      },
    ],
    triggers: {},
    metadata: { fileName: 'test.yml', parsedAt: new Date().toISOString() },
  };

  it('should identify bottlenecks', async () => {
    const response = await request(app)
      .post('/api/v1/analysis/bottlenecks')
      .send({
        pipeline: pipelineWithBottleneck,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('bottlenecks');
    expect(response.body.data).toHaveProperty('avgDuration');
    expect(response.body.data).toHaveProperty('longestJob');
    expect(Array.isArray(response.body.data.bottlenecks)).toBe(true);
  });

  it('should include summary statistics', async () => {
    const response = await request(app)
      .post('/api/v1/analysis/bottlenecks')
      .send({
        pipeline: pipelineWithBottleneck,
      })
      .expect(200);

    expect(response.body.data).toHaveProperty('avgDuration');
    expect(response.body.data).toHaveProperty('longestJob');
    expect(response.body.data.longestJob).toHaveProperty('id');
    expect(response.body.data.longestJob).toHaveProperty('duration');
  });
});

describe('POST /api/v1/analysis/parallel-groups', () => {
  const parallelPipeline: Pipeline = {
    id: 'test-pipeline-5',
    name: 'Test',
    platform: 'github-actions',
    jobs: [
      {
        id: 'lint',
        name: 'Lint',
        dependsOn: [],
        steps: [{ id: 'step1', command: 'lint' }],
      },
      {
        id: 'test-unit',
        name: 'Unit Tests',
        dependsOn: [],
        steps: [{ id: 'step1', command: 'test' }],
      },
      {
        id: 'test-integration',
        name: 'Integration Tests',
        dependsOn: [],
        steps: [{ id: 'step1', command: 'test' }],
      },
      {
        id: 'deploy',
        name: 'Deploy',
        dependsOn: [
          { jobId: 'lint', type: 'needs' },
          { jobId: 'test-unit', type: 'needs' },
          { jobId: 'test-integration', type: 'needs' },
        ],
        steps: [{ id: 'step1', command: 'deploy' }],
        needs: ['lint', 'test-unit', 'test-integration'],
      },
    ],
    triggers: {},
    metadata: { fileName: 'test.yml', parsedAt: new Date().toISOString() },
  };

  it('should identify parallel execution groups', async () => {
    const response = await request(app)
      .post('/api/v1/analysis/parallel-groups')
      .send({
        pipeline: parallelPipeline,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('groups');
    expect(response.body.data).toHaveProperty('maxParallelism');
    expect(Array.isArray(response.body.data.groups)).toBe(true);
  });

  it('should calculate correct max parallelism', async () => {
    const response = await request(app)
      .post('/api/v1/analysis/parallel-groups')
      .send({
        pipeline: parallelPipeline,
      })
      .expect(200);

    // Three jobs can run in parallel (lint, test-unit, test-integration)
    expect(response.body.data.maxParallelism).toBe(3);
  });

  it('should organize jobs into correct levels', async () => {
    const response = await request(app)
      .post('/api/v1/analysis/parallel-groups')
      .send({
        pipeline: parallelPipeline,
      })
      .expect(200);

    expect(response.body.data.groups).toHaveLength(2); // Level 0 and Level 1
    expect(response.body.data.groups[0].jobs).toHaveLength(3); // Three parallel jobs
    expect(response.body.data.groups[1].jobs).toHaveLength(1); // Deploy job
  });
});
