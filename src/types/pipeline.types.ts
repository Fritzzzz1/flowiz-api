/**
 * Pipeline data models
 *
 * Core types for representing parsed CI/CD pipelines
 */

/**
 * CI/CD platform types
 */
export type Platform = 'github-actions' | 'gitlab-ci';

/**
 * Job dependency type
 */
export interface JobDependency {
  jobId: string;
  type: 'needs' | 'depends_on' | 'requires';
}

/**
 * Environment variable
 */
export interface EnvironmentVariable {
  key: string;
  value: string;
  isSecret: boolean;
}

/**
 * Step/command in a job
 */
export interface Step {
  id: string;
  name?: string;
  command?: string;
  uses?: string; // For GitHub Actions
  script?: string | string[]; // For GitLab CI
  with?: Record<string, unknown>; // GitHub Actions inputs
  env?: Record<string, string>;
  continueOnError?: boolean;
  timeout?: number;
  workingDirectory?: string;
  if?: string; // Conditional expression
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  key: string;
  paths: string[];
  restoreKeys?: string[];
}

/**
 * Artifact configuration
 */
export interface ArtifactConfig {
  name: string;
  paths: string[];
  when?: 'on_success' | 'on_failure' | 'always';
  expireIn?: string;
}

/**
 * Job/Stage in a pipeline
 */
export interface Job {
  id: string;
  name: string;
  stage?: string;
  dependsOn: JobDependency[];
  steps: Step[];
  runsOn?: string | string[]; // Runner label(s)
  image?: string; // Docker image
  services?: string[]; // Service containers
  environment?: {
    name: string;
    variables: EnvironmentVariable[];
  };
  timeout?: number;
  retries?: number;
  continueOnError?: boolean;
  if?: string; // Conditional expression
  cache?: CacheConfig;
  artifacts?: ArtifactConfig;
  matrix?: Record<string, unknown[]>; // Matrix strategy
  needs?: string[]; // Job IDs this job needs
  allowFailure?: boolean; // GitLab specific
  only?: string[]; // GitLab branch/tag filters
  except?: string[]; // GitLab branch/tag filters
  when?: 'on_success' | 'on_failure' | 'always' | 'manual'; // GitLab trigger condition
}

/**
 * Trigger configuration
 */
export interface TriggerConfig {
  branches?: string[];
  tags?: string[];
  paths?: string[];
  schedule?: string; // Cron expression
  types?: string[]; // GitHub event types
  workflowDispatch?: boolean;
}

/**
 * Complete parsed pipeline
 */
export interface Pipeline {
  id: string;
  name: string;
  platform: Platform;
  jobs: Job[];
  triggers: TriggerConfig;
  defaultEnv?: Record<string, string>;
  stages?: string[]; // GitLab stages
  workflowCalls?: string[]; // Reusable workflow references
  metadata: {
    fileName: string;
    filePath?: string;
    repoOwner?: string;
    repoName?: string;
    branch?: string;
    commit?: string;
    parsedAt: string;
  };
}

/**
 * Parse result with validation information
 */
export interface ParseResult {
  success: boolean;
  pipeline?: Pipeline;
  errors?: ParseError[];
  warnings?: ParseWarning[];
}

/**
 * Parse error
 */
export interface ParseError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  path?: string;
  severity: 'error';
}

/**
 * Parse warning
 */
export interface ParseWarning {
  code: string;
  message: string;
  line?: number;
  column?: number;
  path?: string;
  severity: 'warning';
}
