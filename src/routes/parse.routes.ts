/**
 * Parse routes
 *
 * Routes for parsing and validating CI/CD configurations
 */

import { Router } from 'express';
import {
  parseConfig,
  validateConfig,
  detectPlatformFromConfig,
} from '@/controllers/parse.controller';
import { validate } from '@/middleware/validate.middleware';
import { ParseRequestSchema, ValidateRequestSchema } from '@/schemas/parse.schema';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/v1/parse
 * Parse a CI/CD configuration file
 */
router.post('/', validate(ParseRequestSchema), parseConfig);

/**
 * POST /api/v1/validate
 * Validate a CI/CD configuration file
 */
router.post('/validate', validate(ValidateRequestSchema), validateConfig);

/**
 * POST /api/v1/detect-platform
 * Detect platform from configuration content
 */
router.post(
  '/detect-platform',
  validate(
    z.object({
      yamlContent: z.string().min(1, 'YAML content cannot be empty'),
      fileName: z.string().optional(),
    })
  ),
  detectPlatformFromConfig
);

export default router;
