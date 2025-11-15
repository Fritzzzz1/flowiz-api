/**
 * Analysis routes
 *
 * Routes for analyzing parsed CI/CD pipelines
 */

import { Router } from 'express';
import {
  analyzePipeline,
  analyzeDependencyGraph,
  analyzeCriticalPath,
  analyzeBottlenecks,
  analyzeParallelGroups,
} from '@/controllers/analysis.controller';
import { validate } from '@/middleware/validate.middleware';
import { AnalyzeRequestSchema, PipelineSchema } from '@/schemas/analysis.schema';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/v1/analysis/analyze
 * Perform complete pipeline analysis
 */
router.post(
  '/analyze',
  validate(AnalyzeRequestSchema),
  analyzePipeline
);

/**
 * POST /api/v1/analysis/dependency-graph
 * Analyze dependency graph and detect cycles
 */
router.post(
  '/dependency-graph',
  validate(z.object({ pipeline: PipelineSchema })),
  analyzeDependencyGraph
);

/**
 * POST /api/v1/analysis/critical-path
 * Find the critical path through the pipeline
 */
router.post(
  '/critical-path',
  validate(z.object({ pipeline: PipelineSchema })),
  analyzeCriticalPath
);

/**
 * POST /api/v1/analysis/bottlenecks
 * Identify performance bottlenecks
 */
router.post(
  '/bottlenecks',
  validate(z.object({ pipeline: PipelineSchema })),
  analyzeBottlenecks
);

/**
 * POST /api/v1/analysis/parallel-groups
 * Identify parallel execution opportunities
 */
router.post(
  '/parallel-groups',
  validate(z.object({ pipeline: PipelineSchema })),
  analyzeParallelGroups
);

export default router;
