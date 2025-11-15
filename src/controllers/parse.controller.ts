/**
 * Parse controller
 *
 * Handles parsing and validation of CI/CD configuration files
 */

import { Request, Response, NextFunction } from 'express';
import { parseFile, detectPlatform } from '@/services/parsers/parser.service';
import { logger } from '@/utils/logger';
import { ParseError as CustomParseError, ValidationError } from '@/utils/errors';
import type { ParseRequest, ValidateRequest } from '@/schemas/parse.schema';

/**
 * Parse CI/CD configuration
 *
 * POST /api/v1/parse
 */
export async function parseConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { platform, yamlContent, fileName, options } = req.body as ParseRequest;

    logger.info('Parsing configuration', {
      platform: platform || 'auto-detect',
      fileName,
      contentLength: yamlContent.length,
    });

    // Parse the configuration
    const result = await parseFile(yamlContent, fileName || 'workflow.yml', {
      platform,
      validate: options?.validate ?? true,
      includeWarnings: options?.includeWarnings ?? true,
    });

    // Check if parsing was successful
    if (!result.success || !result.pipeline) {
      throw new CustomParseError('Failed to parse configuration', {
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    logger.info('Configuration parsed successfully', {
      pipelineId: result.pipeline.id,
      platform: result.pipeline.platform,
      jobCount: result.pipeline.jobs.length,
    });

    // Return successful response
    res.status(200).json({
      success: true,
      data: {
        pipeline: result.pipeline,
        errors: result.errors || [],
        warnings: result.warnings || [],
      },
      metadata: {
        timestamp: new Date().toISOString(),
        platform: result.pipeline.platform,
        jobCount: result.pipeline.jobs.length,
        hasErrors: (result.errors?.length ?? 0) > 0,
        hasWarnings: (result.warnings?.length ?? 0) > 0,
      },
    });
  } catch (error) {
    logger.error('Error parsing configuration', { error });
    next(error);
  }
}

/**
 * Validate CI/CD configuration
 *
 * POST /api/v1/validate
 */
export async function validateConfig(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { platform, yamlContent, fileName } = req.body as ValidateRequest;

    logger.info('Validating configuration', {
      platform: platform || 'auto-detect',
      fileName,
      contentLength: yamlContent.length,
    });

    // Detect platform if not provided
    let detectedPlatform = platform;
    if (!detectedPlatform) {
      const detected = detectPlatform(fileName || 'workflow.yml', yamlContent);
      if (!detected) {
        throw new ValidationError(
          'Could not detect platform. Please specify platform explicitly.',
          { fileName }
        );
      }
      detectedPlatform = detected;
    }

    // Parse the configuration (which includes validation)
    const result = await parseFile(yamlContent, fileName || 'workflow.yml', {
      platform: detectedPlatform,
      validate: true,
      includeWarnings: true,
    });

    logger.info('Configuration validated', {
      valid: result.success,
      errorCount: result.errors?.length ?? 0,
      warningCount: result.warnings?.length ?? 0,
    });

    // Return validation result
    res.status(200).json({
      success: true,
      data: {
        valid: result.success,
        platform: detectedPlatform,
        errors: result.errors || [],
        warnings: result.warnings || [],
      },
      metadata: {
        timestamp: new Date().toISOString(),
        errorCount: result.errors?.length ?? 0,
        warningCount: result.warnings?.length ?? 0,
      },
    });
  } catch (error) {
    logger.error('Error validating configuration', { error });
    next(error);
  }
}

/**
 * Detect platform from configuration
 *
 * POST /api/v1/detect-platform
 */
export async function detectPlatformFromConfig(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { yamlContent, fileName } = req.body as {
      yamlContent: string;
      fileName?: string;
    };

    if (!yamlContent) {
      throw new ValidationError('YAML content is required');
    }

    logger.info('Detecting platform', {
      fileName: fileName || 'unknown',
      contentLength: yamlContent.length,
    });

    const platform = detectPlatform(fileName || 'unknown', yamlContent);

    if (!platform) {
      logger.warn('Could not detect platform', { fileName });
    }

    res.status(200).json({
      success: true,
      data: {
        platform: platform || null,
        confidence: platform
          ? fileName?.includes('.github/workflows/') || fileName === '.gitlab-ci.yml'
            ? 'high'
            : 'medium'
          : 'none',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        fileName: fileName || 'unknown',
      },
    });
  } catch (error) {
    logger.error('Error detecting platform', { error });
    next(error);
  }
}
