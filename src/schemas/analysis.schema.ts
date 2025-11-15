/**
 * Analysis endpoint validation schemas
 *
 * Zod schemas for validating analysis endpoint requests
 */

import { z } from 'zod';

/**
 * Job dependency schema
 */
const JobDependencySchema = z.object({
  jobId: z.string().describe('Job ID this dependency references'),
  type: z.enum(['needs', 'depends_on', 'requires']).describe('Type of dependency relationship'),
});

/**
 * Step schema
 */
const StepSchema = z.object({
  id: z.string().describe('Step identifier'),
  name: z.string().optional().describe('Step name'),
  command: z.string().optional().describe('Command to execute'),
  uses: z.string().optional().describe('GitHub Action to use'),
  script: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('GitLab CI script'),
  with: z.record(z.string(), z.unknown()).optional().describe('Action inputs'),
  env: z.record(z.string(), z.string()).optional().describe('Environment variables'),
  continueOnError: z.boolean().optional().describe('Continue on error'),
  timeout: z.number().optional().describe('Step timeout in seconds'),
  workingDirectory: z.string().optional().describe('Working directory'),
  if: z.string().optional().describe('Conditional expression'),
});

/**
 * Cache configuration schema
 */
const CacheConfigSchema = z.object({
  key: z.string().describe('Cache key'),
  paths: z.array(z.string()).describe('Paths to cache'),
  restoreKeys: z.array(z.string()).optional().describe('Fallback cache keys'),
});

/**
 * Artifact configuration schema
 */
const ArtifactConfigSchema = z.object({
  name: z.string().describe('Artifact name'),
  paths: z.array(z.string()).describe('Paths to include'),
  when: z
    .enum(['on_success', 'on_failure', 'always'])
    .optional()
    .describe('When to upload artifacts'),
  expireIn: z.string().optional().describe('Expiration time'),
});

/**
 * Environment variable schema
 */
const EnvironmentVariableSchema = z.object({
  key: z.string().describe('Variable name'),
  value: z.string().describe('Variable value'),
  isSecret: z.boolean().describe('Whether value is sensitive'),
});

/**
 * Job schema
 */
const JobSchema = z.object({
  id: z.string().min(1, 'Job ID cannot be empty').describe('Unique job identifier'),
  name: z.string().min(1, 'Job name cannot be empty').describe('Display name'),
  stage: z.string().optional().describe('Pipeline stage'),
  dependsOn: z.array(JobDependencySchema).default([]).describe('Job dependencies'),
  steps: z.array(StepSchema).min(1, 'Job must have at least one step').describe('Job steps'),
  runsOn: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Runner labels'),
  image: z.string().optional().describe('Docker image'),
  services: z.array(z.string()).optional().describe('Service containers'),
  environment: z
    .object({
      name: z.string().describe('Environment name'),
      variables: z.array(EnvironmentVariableSchema).describe('Environment variables'),
    })
    .optional()
    .describe('Environment configuration'),
  timeout: z.number().positive().optional().describe('Job timeout in seconds'),
  retries: z.number().min(0).optional().describe('Number of retries'),
  continueOnError: z.boolean().optional().describe('Continue pipeline on job failure'),
  if: z.string().optional().describe('Conditional expression'),
  cache: CacheConfigSchema.optional().describe('Cache configuration'),
  artifacts: ArtifactConfigSchema.optional().describe('Artifact configuration'),
  matrix: z.record(z.string(), z.array(z.unknown())).optional().describe('Matrix strategy'),
  needs: z.array(z.string()).optional().describe('Job IDs this job needs'),
  allowFailure: z.boolean().optional().describe('Allow job to fail'),
  only: z.array(z.string()).optional().describe('Branch/tag filters (include)'),
  except: z.array(z.string()).optional().describe('Branch/tag filters (exclude)'),
  when: z
    .enum(['on_success', 'on_failure', 'always', 'manual'])
    .optional()
    .describe('Trigger condition'),
});

/**
 * Trigger configuration schema
 */
const TriggerConfigSchema = z.object({
  branches: z.array(z.string()).optional().describe('Branch filters'),
  tags: z.array(z.string()).optional().describe('Tag filters'),
  paths: z.array(z.string()).optional().describe('Path filters'),
  schedule: z.string().optional().describe('Cron schedule'),
  types: z.array(z.string()).optional().describe('Event types'),
  workflowDispatch: z.boolean().optional().describe('Manual trigger'),
});

/**
 * Pipeline schema for analysis
 */
export const PipelineSchema = z.object({
  id: z.string().describe('Pipeline identifier'),
  name: z.string().min(1, 'Pipeline name cannot be empty').describe('Pipeline name'),
  platform: z.enum(['github-actions', 'gitlab-ci']).describe('CI/CD platform'),
  jobs: z.array(JobSchema).min(1, 'Pipeline must have at least one job').describe('Pipeline jobs'),
  triggers: TriggerConfigSchema.describe('Pipeline triggers'),
  defaultEnv: z.record(z.string(), z.string()).optional().describe('Default environment variables'),
  stages: z.array(z.string()).optional().describe('GitLab stages'),
  workflowCalls: z.array(z.string()).optional().describe('Reusable workflow references'),
  metadata: z.object({
    fileName: z.string().describe('Configuration file name'),
    filePath: z.string().optional().describe('Configuration file path'),
    repoOwner: z.string().optional().describe('Repository owner'),
    repoName: z.string().optional().describe('Repository name'),
    branch: z.string().optional().describe('Branch name'),
    commit: z.string().optional().describe('Commit SHA'),
    parsedAt: z.string().describe('Timestamp when parsed'),
  }),
});

/**
 * Analyze request schema
 */
export const AnalyzeRequestSchema = z.object({
  pipeline: PipelineSchema.describe('Pipeline to analyze'),
  options: z
    .object({
      includeCycles: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include cycle detection in analysis'),
      includeBottlenecks: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include bottleneck analysis'),
      includeCriticalPath: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include critical path analysis'),
      includeParallelGroups: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include parallel execution groups'),
    })
    .optional()
    .describe('Analysis options'),
});

/**
 * Type exports for TypeScript
 */
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type PipelineInput = z.infer<typeof PipelineSchema>;
