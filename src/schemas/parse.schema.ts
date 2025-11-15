/**
 * Parse endpoint validation schemas
 *
 * Zod schemas for validating parse and validate endpoint requests
 */

import { z } from 'zod';

/**
 * Platform enum schema
 */
export const PlatformSchema = z.enum(['github-actions', 'gitlab-ci']);

/**
 * Parse request schema
 */
export const ParseRequestSchema = z.object({
  platform: PlatformSchema.optional().describe('CI/CD platform (auto-detected if not provided)'),
  yamlContent: z
    .string()
    .min(1, 'YAML content cannot be empty')
    .max(1024 * 1024, 'YAML content exceeds maximum size of 1MB')
    .describe('YAML configuration content'),
  fileName: z
    .string()
    .min(1, 'File name cannot be empty')
    .default('workflow.yml')
    .describe('Configuration file name for platform detection'),
  options: z
    .object({
      validate: z.boolean().optional().default(true).describe('Validate configuration'),
      includeWarnings: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include warnings in result'),
      repoContext: z
        .object({
          owner: z.string().describe('Repository owner'),
          name: z.string().describe('Repository name'),
          branch: z.string().optional().describe('Branch name'),
          commit: z.string().optional().describe('Commit SHA'),
        })
        .optional()
        .describe('Repository context for resolving references'),
    })
    .optional()
    .describe('Parser options'),
});

/**
 * Validate request schema (similar to parse but may have different options in future)
 */
export const ValidateRequestSchema = z.object({
  platform: PlatformSchema.optional().describe('CI/CD platform (auto-detected if not provided)'),
  yamlContent: z
    .string()
    .min(1, 'YAML content cannot be empty')
    .max(1024 * 1024, 'YAML content exceeds maximum size of 1MB')
    .describe('YAML configuration content'),
  fileName: z
    .string()
    .min(1, 'File name cannot be empty')
    .default('workflow.yml')
    .describe('Configuration file name for platform detection'),
});

/**
 * Type exports for TypeScript
 */
export type ParseRequest = z.infer<typeof ParseRequestSchema>;
export type ValidateRequest = z.infer<typeof ValidateRequestSchema>;
