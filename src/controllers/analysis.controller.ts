/**
 * Analysis controller
 *
 * Handles pipeline analysis requests
 */

import { Request, Response, NextFunction } from 'express';
import { AnalysisService } from '@/services/analyzers/analysis.service';
import { logger } from '@/utils/logger';
import { ValidationError } from '@/utils/errors';
import type { AnalyzeRequest } from '@/schemas/analysis.schema';
import type { Pipeline } from '@/types/pipeline.types';

// Create analysis service instance
const analysisService = new AnalysisService();

/**
 * Analyze pipeline
 *
 * POST /api/v1/analysis/analyze
 */
export async function analyzePipeline(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pipeline, options } = req.body as AnalyzeRequest;

    if (!pipeline || !pipeline.jobs || pipeline.jobs.length === 0) {
      throw new ValidationError('Pipeline must contain at least one job');
    }

    logger.info('Analyzing pipeline', {
      pipelineId: pipeline.id,
      platform: pipeline.platform,
      jobCount: pipeline.jobs.length,
    });

    // Perform complete analysis
    const analysis = analysisService.analyze(pipeline);

    logger.info('Pipeline analysis completed', {
      pipelineId: pipeline.id,
      hasCycles: analysis.dependencyGraph.hasCycles,
      criticalPathLength: analysis.criticalPath.path.length,
      bottleneckCount: analysis.bottlenecks.bottlenecks.length,
      parallelGroupCount: analysis.parallelGroups.groups.length,
    });

    // Build response based on options
    const responseData: Record<string, unknown> = {};

    if (options?.includeCycles ?? true) {
      responseData.dependencyGraph = analysis.dependencyGraph;
    }

    if (options?.includeCriticalPath ?? true) {
      responseData.criticalPath = analysis.criticalPath;
    }

    if (options?.includeBottlenecks ?? true) {
      responseData.bottlenecks = analysis.bottlenecks;
    }

    if (options?.includeParallelGroups ?? true) {
      responseData.parallelGroups = analysis.parallelGroups;
    }

    // Return analysis results
    res.status(200).json({
      success: true,
      data: responseData,
      metadata: {
        timestamp: new Date().toISOString(),
        pipelineId: pipeline.id,
        platform: pipeline.platform,
        jobCount: pipeline.jobs.length,
        analysisVersion: '1.0.0',
      },
    });
  } catch (error) {
    logger.error('Error analyzing pipeline', { error });
    next(error);
  }
}

/**
 * Analyze dependency graph
 *
 * POST /api/v1/analysis/dependency-graph
 */
export async function analyzeDependencyGraph(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pipeline } = req.body as { pipeline: Pipeline };

    if (!pipeline || !pipeline.jobs || pipeline.jobs.length === 0) {
      throw new ValidationError('Pipeline must contain at least one job');
    }

    logger.info('Analyzing dependency graph', {
      pipelineId: pipeline.id,
      jobCount: pipeline.jobs.length,
    });

    const analysis = analysisService.analyzeDependencyGraph(pipeline);

    logger.info('Dependency graph analysis completed', {
      pipelineId: pipeline.id,
      hasCycles: analysis.hasCycles,
      cycleCount: analysis.cycles.length,
    });

    res.status(200).json({
      success: true,
      data: analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        pipelineId: pipeline.id,
      },
    });
  } catch (error) {
    logger.error('Error analyzing dependency graph', { error });
    next(error);
  }
}

/**
 * Analyze critical path
 *
 * POST /api/v1/analysis/critical-path
 */
export async function analyzeCriticalPath(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pipeline } = req.body as { pipeline: Pipeline };

    if (!pipeline || !pipeline.jobs || pipeline.jobs.length === 0) {
      throw new ValidationError('Pipeline must contain at least one job');
    }

    logger.info('Analyzing critical path', {
      pipelineId: pipeline.id,
      jobCount: pipeline.jobs.length,
    });

    const analysis = analysisService.analyzeCriticalPath(pipeline);

    logger.info('Critical path analysis completed', {
      pipelineId: pipeline.id,
      pathLength: analysis.path.length,
      totalDuration: analysis.totalDuration,
    });

    res.status(200).json({
      success: true,
      data: analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        pipelineId: pipeline.id,
      },
    });
  } catch (error) {
    logger.error('Error analyzing critical path', { error });
    next(error);
  }
}

/**
 * Analyze bottlenecks
 *
 * POST /api/v1/analysis/bottlenecks
 */
export async function analyzeBottlenecks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pipeline } = req.body as { pipeline: Pipeline };

    if (!pipeline || !pipeline.jobs || pipeline.jobs.length === 0) {
      throw new ValidationError('Pipeline must contain at least one job');
    }

    logger.info('Analyzing bottlenecks', {
      pipelineId: pipeline.id,
      jobCount: pipeline.jobs.length,
    });

    const analysis = analysisService.analyzeBottlenecks(pipeline);

    logger.info('Bottleneck analysis completed', {
      pipelineId: pipeline.id,
      bottleneckCount: analysis.bottlenecks.length,
    });

    res.status(200).json({
      success: true,
      data: analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        pipelineId: pipeline.id,
      },
    });
  } catch (error) {
    logger.error('Error analyzing bottlenecks', { error });
    next(error);
  }
}

/**
 * Analyze parallel execution groups
 *
 * POST /api/v1/analysis/parallel-groups
 */
export async function analyzeParallelGroups(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pipeline } = req.body as { pipeline: Pipeline };

    if (!pipeline || !pipeline.jobs || pipeline.jobs.length === 0) {
      throw new ValidationError('Pipeline must contain at least one job');
    }

    logger.info('Analyzing parallel groups', {
      pipelineId: pipeline.id,
      jobCount: pipeline.jobs.length,
    });

    const analysis = analysisService.analyzeParallelGroups(pipeline);

    logger.info('Parallel groups analysis completed', {
      pipelineId: pipeline.id,
      groupCount: analysis.groups.length,
      maxParallelism: analysis.maxParallelism,
    });

    res.status(200).json({
      success: true,
      data: analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        pipelineId: pipeline.id,
      },
    });
  } catch (error) {
    logger.error('Error analyzing parallel groups', { error });
    next(error);
  }
}
