/**
 * GitLab CI parser
 *
 * Parses GitLab CI configuration YAML files into unified Pipeline format
 */

import { IParser, ParserOptions } from './parser.interface';
import {
  Pipeline,
  ParseResult,
  Job,
  Step,
  TriggerConfig,
  Platform,
  ParseError,
  ParseWarning,
  JobDependency,
} from '@/types/pipeline.types';
import {
  validateYAML,
  parseYAML,
  getNestedProperty,
  isObject,
  isNonEmptyString,
  isArray,
  normalizeToArray,
} from '@/utils/yaml-validator';
import { validateJobReferences } from '@/utils/job-validator';
import * as uuid from 'uuid';

/**
 * GitLab CI configuration structure
 */
interface GitLabCIConfig {
  stages?: string[];
  variables?: Record<string, string>;
  default?: unknown;
  workflow?: unknown;
  include?: unknown;
  [key: string]: unknown; // Jobs and other sections
}

/**
 * Reserved keywords that are not jobs
 */
const RESERVED_KEYWORDS = new Set([
  'stages',
  'variables',
  'default',
  'workflow',
  'include',
  'image',
  'services',
  'before_script',
  'after_script',
  'cache',
]);

/**
 * GitLab CI parser implementation
 */
export class GitLabCIParser implements IParser {
  readonly platform: Platform = 'gitlab-ci';

  /**
   * Parse GitLab CI configuration file
   */
  async parse(content: string, fileName: string, options?: ParserOptions): Promise<ParseResult> {
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];

    try {
      // Validate YAML syntax
      const validation = validateYAML(content);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors.map((e) => ({
            code: 'INVALID_YAML',
            message: e.message,
            line: e.line,
            column: e.column,
            severity: 'error' as const,
          })),
        };
      }

      const config = validation.data as GitLabCIConfig;

      // Validate required fields
      if (!isObject(config)) {
        errors.push({
          code: 'INVALID_STRUCTURE',
          message: 'GitLab CI configuration must be an object',
          severity: 'error',
        });
        return { success: false, errors };
      }

      // Extract jobs (all non-reserved keys)
      const jobEntries = Object.entries(config).filter(
        ([key]) => !RESERVED_KEYWORDS.has(key) && !key.startsWith('.')
      );

      if (jobEntries.length === 0) {
        errors.push({
          code: 'NO_JOBS',
          message: 'GitLab CI configuration must contain at least one job',
          severity: 'error',
        });
        return { success: false, errors };
      }

      // Parse pipeline
      const pipeline: Pipeline = {
        id: uuid.v4(),
        name: fileName.replace(/\.ya?ml$/, ''),
        platform: this.platform,
        jobs: [],
        triggers: this.parseTriggers(config.workflow),
        defaultEnv: config.variables,
        stages: config.stages || this.inferStages(jobEntries),
        workflowCalls: [],
        metadata: {
          fileName,
          parsedAt: new Date().toISOString(),
          ...(options?.repoContext && {
            repoOwner: options.repoContext.owner,
            repoName: options.repoContext.name,
            branch: options.repoContext.branch,
            commit: options.repoContext.commit,
          }),
        },
      };

      // Parse jobs
      for (const [jobId, jobData] of jobEntries) {
        try {
          const job = this.parseJob(jobId, jobData);
          pipeline.jobs.push(job);
        } catch (error) {
          errors.push({
            code: 'JOB_PARSE_ERROR',
            message: `Failed to parse job "${jobId}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            path: jobId,
            severity: 'error',
          });
        }
      }

      // Build dependencies based on stages
      this.buildStageDependencies(pipeline);

      // Detect circular dependencies
      const circularDeps = this.detectCircularDependencies(pipeline.jobs);
      if (circularDeps.length > 0) {
        errors.push({
          code: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependencies detected: ${circularDeps.join(' -> ')}`,
          severity: 'error',
        });
      }

      // Validate job references
      const jobValidation = validateJobReferences(pipeline.jobs);
      if (!jobValidation.isValid && options?.includeWarnings) {
        warnings.push(...jobValidation.warnings);
      }

      // Add warnings if requested
      if (options?.includeWarnings) {
        this.detectWarnings(pipeline, warnings);
      }

      if (errors.length > 0) {
        return {
          success: false,
          pipeline,
          errors,
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      }

      return {
        success: true,
        pipeline,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      errors.push({
        code: 'PARSE_ERROR',
        message: `Unexpected parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
      return { success: false, errors };
    }
  }

  /**
   * Validate GitLab CI configuration
   */
  async validate(content: string): Promise<{
    valid: boolean;
    errors: Array<{ message: string; path?: string }>;
    warnings: Array<{ message: string; path?: string }>;
  }> {
    const result = await this.parse(content, '.gitlab-ci.yml', {
      validate: true,
      includeWarnings: true,
    });

    return {
      valid: result.success,
      errors:
        result.errors?.map((e) => ({
          message: e.message,
          path: e.path,
        })) || [],
      warnings:
        result.warnings?.map((w) => ({
          message: w.message,
          path: w.path,
        })) || [],
    };
  }

  /**
   * Extract job dependencies
   */
  async extractDependencies(content: string): Promise<Map<string, string[]>> {
    const dependencies = new Map<string, string[]>();

    try {
      const config = parseYAML(content) as GitLabCIConfig;
      if (!isObject(config)) {
        return dependencies;
      }

      const jobEntries = Object.entries(config).filter(
        ([key]) => !RESERVED_KEYWORDS.has(key) && !key.startsWith('.')
      );

      for (const [jobId, jobData] of jobEntries) {
        if (!isObject(jobData)) continue;

        const needs = jobData.needs;
        const deps: string[] = [];

        if (Array.isArray(needs)) {
          for (const need of needs) {
            if (typeof need === 'string') {
              deps.push(need);
            } else if (isObject(need) && isNonEmptyString(need.job)) {
              deps.push(need.job);
            }
          }
        }

        dependencies.set(jobId, deps);
      }
    } catch {
      // Return empty map on error
    }

    return dependencies;
  }

  /**
   * Parse trigger configuration from workflow
   */
  private parseTriggers(workflow: unknown): TriggerConfig {
    const triggers: TriggerConfig = {};

    if (!isObject(workflow)) {
      return triggers;
    }

    const rules = getNestedProperty(workflow, 'rules');
    if (!isArray(rules)) {
      return triggers;
    }

    // Extract branch/tag patterns from rules
    const branches: string[] = [];
    const tags: string[] = [];

    for (const rule of rules) {
      if (!isObject(rule)) continue;

      const ifCondition = getNestedProperty(rule, 'if');
      if (isNonEmptyString(ifCondition)) {
        // Parse branch patterns from if conditions
        // Example: $CI_COMMIT_BRANCH == "main"
        const branchMatch = ifCondition.match(/\$CI_COMMIT_BRANCH\s*==\s*"([^"]+)"/);
        if (branchMatch) {
          branches.push(branchMatch[1]);
        }

        // Parse tag patterns
        const tagMatch = ifCondition.match(/\$CI_COMMIT_TAG/);
        if (tagMatch) {
          tags.push('*'); // Any tag
        }
      }
    }

    if (branches.length > 0) {
      triggers.branches = branches;
    }
    if (tags.length > 0) {
      triggers.tags = tags;
    }

    return triggers;
  }

  /**
   * Parse a single job
   */
  private parseJob(jobId: string, jobData: unknown): Job {
    if (!isObject(jobData)) {
      throw new Error('Job must be an object');
    }

    const job: Job = {
      id: jobId,
      name: jobId,
      dependsOn: this.parseJobDependencies(jobData.needs),
      steps: this.parseSteps(jobData),
      stage: isNonEmptyString(jobData.stage) ? jobData.stage : undefined,
    };

    // Optional fields
    if (isNonEmptyString(jobData.image)) {
      job.image = jobData.image;
    } else if (isObject(jobData.image)) {
      const imageName = getNestedProperty(jobData.image, 'name');
      if (isNonEmptyString(imageName)) {
        job.image = imageName;
      }
    }

    if (isArray(jobData.services)) {
      job.services = jobData.services
        .filter((s) => typeof s === 'string' || isObject(s))
        .map((s) => {
          if (typeof s === 'string') return s;
          if (isObject(s) && isNonEmptyString(s.name)) return s.name as string;
          return 'unknown';
        });
    }

    if (isObject(jobData.variables)) {
      const vars = jobData.variables as Record<string, string>;
      job.environment = {
        name: 'default',
        variables: Object.entries(vars).map(([key, value]) => ({
          key,
          value: String(value),
          isSecret: false,
        })),
      };
    }

    if (typeof jobData.timeout === 'string') {
      // Parse timeout like "1h 30m"
      const hours = jobData.timeout.match(/(\d+)h/);
      const minutes = jobData.timeout.match(/(\d+)m/);
      let seconds = 0;
      if (hours) seconds += parseInt(hours[1]) * 3600;
      if (minutes) seconds += parseInt(minutes[1]) * 60;
      if (seconds > 0) job.timeout = seconds;
    }

    if (typeof jobData.allow_failure === 'boolean') {
      job.allowFailure = jobData.allow_failure;
      job.continueOnError = jobData.allow_failure;
    }

    if (typeof jobData.retry === 'number') {
      job.retries = jobData.retry;
    } else if (isObject(jobData.retry)) {
      const max = getNestedProperty(jobData.retry, 'max');
      if (typeof max === 'number') {
        job.retries = max;
      }
    }

    // Parse only/except
    if (isArray(jobData.only)) {
      job.only = normalizeToArray(jobData.only);
    } else if (isObject(jobData.only)) {
      const refs = getNestedProperty(jobData.only, 'refs');
      if (isArray(refs)) {
        job.only = normalizeToArray(refs);
      }
    }

    if (isArray(jobData.except)) {
      job.except = normalizeToArray(jobData.except);
    } else if (isObject(jobData.except)) {
      const refs = getNestedProperty(jobData.except, 'refs');
      if (isArray(refs)) {
        job.except = normalizeToArray(refs);
      }
    }

    // Parse when
    if (isNonEmptyString(jobData.when)) {
      const whenValue = jobData.when;
      if (['on_success', 'on_failure', 'always', 'manual'].includes(whenValue)) {
        job.when = whenValue as 'on_success' | 'on_failure' | 'always' | 'manual';
      }
    }

    // Parse tags (runner tags)
    if (isArray(jobData.tags)) {
      job.runsOn = normalizeToArray(jobData.tags);
    }

    // Parse artifacts
    if (isObject(jobData.artifacts)) {
      const paths = getNestedProperty(jobData.artifacts, 'paths');
      if (isArray(paths)) {
        const name = getNestedProperty(jobData.artifacts, 'name');
        const when = getNestedProperty(jobData.artifacts, 'when');
        const expireIn = getNestedProperty(jobData.artifacts, 'expire_in');

        job.artifacts = {
          name: isNonEmptyString(name) ? name : 'artifacts',
          paths: normalizeToArray(paths),
          when:
            isNonEmptyString(when) && ['on_success', 'on_failure', 'always'].includes(when)
              ? (when as 'on_success' | 'on_failure' | 'always')
              : undefined,
          expireIn: isNonEmptyString(expireIn) ? expireIn : undefined,
        };
      }
    }

    // Parse cache
    if (isObject(jobData.cache)) {
      const key = getNestedProperty(jobData.cache, 'key');
      const paths = getNestedProperty(jobData.cache, 'paths');

      if (isArray(paths)) {
        job.cache = {
          key: isNonEmptyString(key) ? key : 'default',
          paths: normalizeToArray(paths),
        };
      }
    }

    return job;
  }

  /**
   * Parse job dependencies from needs field
   */
  private parseJobDependencies(needs: unknown): JobDependency[] {
    const dependencies: JobDependency[] = [];

    if (!isArray(needs)) {
      return dependencies;
    }

    for (const need of needs) {
      if (typeof need === 'string') {
        dependencies.push({
          jobId: need,
          type: 'needs',
        });
      } else if (isObject(need)) {
        const jobId = getNestedProperty(need, 'job');
        if (isNonEmptyString(jobId)) {
          dependencies.push({
            jobId,
            type: 'needs',
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Parse job steps from script, before_script, after_script
   */
  private parseSteps(jobData: Record<string, unknown>): Step[] {
    const steps: Step[] = [];
    let stepIndex = 1;

    // Parse before_script
    const beforeScript = jobData.before_script;
    if (isArray(beforeScript)) {
      for (const script of beforeScript) {
        if (typeof script === 'string') {
          steps.push({
            id: `before-${stepIndex++}`,
            name: 'Before script',
            script,
          });
        }
      }
    } else if (isNonEmptyString(beforeScript)) {
      steps.push({
        id: `before-${stepIndex++}`,
        name: 'Before script',
        script: beforeScript,
      });
    }

    // Parse main script
    const script = jobData.script;
    if (isArray(script)) {
      for (const cmd of script) {
        if (typeof cmd === 'string') {
          steps.push({
            id: `script-${stepIndex++}`,
            script: cmd,
          });
        }
      }
    } else if (isNonEmptyString(script)) {
      steps.push({
        id: `script-${stepIndex++}`,
        script,
      });
    }

    // Parse after_script
    const afterScript = jobData.after_script;
    if (isArray(afterScript)) {
      for (const script of afterScript) {
        if (typeof script === 'string') {
          steps.push({
            id: `after-${stepIndex++}`,
            name: 'After script',
            script,
          });
        }
      }
    } else if (isNonEmptyString(afterScript)) {
      steps.push({
        id: `after-${stepIndex++}`,
        name: 'After script',
        script: afterScript,
      });
    }

    return steps;
  }

  /**
   * Infer stages from job definitions
   */
  private inferStages(jobEntries: Array<[string, unknown]>): string[] {
    const stages = new Set<string>();

    for (const [, jobData] of jobEntries) {
      if (isObject(jobData) && isNonEmptyString(jobData.stage)) {
        stages.add(jobData.stage);
      }
    }

    // If no stages found, use default GitLab stages
    if (stages.size === 0) {
      return ['build', 'test', 'deploy'];
    }

    return Array.from(stages);
  }

  /**
   * Build dependencies based on stages
   * Jobs in later stages implicitly depend on all jobs in earlier stages
   */
  private buildStageDependencies(pipeline: Pipeline): void {
    if (!pipeline.stages || pipeline.stages.length === 0) {
      return;
    }

    // Group jobs by stage
    const jobsByStage = new Map<string, Job[]>();
    for (const job of pipeline.jobs) {
      const stage = job.stage || 'test';
      if (!jobsByStage.has(stage)) {
        jobsByStage.set(stage, []);
      }
      jobsByStage.get(stage)!.push(job);
    }

    // Add stage-based dependencies
    for (let i = 1; i < pipeline.stages.length; i++) {
      const currentStage = pipeline.stages[i];
      const previousStage = pipeline.stages[i - 1];

      const currentJobs = jobsByStage.get(currentStage) || [];
      const previousJobs = jobsByStage.get(previousStage) || [];

      for (const currentJob of currentJobs) {
        // Only add stage dependencies if job has no explicit needs
        if (currentJob.dependsOn.length === 0) {
          for (const prevJob of previousJobs) {
            currentJob.dependsOn.push({
              jobId: prevJob.id,
              type: 'depends_on',
            });
          }
        }
      }
    }
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(jobs: Job[]): string[] {
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycle: string[] = [];

    // Build adjacency list
    for (const job of jobs) {
      graph.set(
        job.id,
        job.dependsOn.map((d) => d.jobId)
      );
    }

    // DFS to detect cycle
    const dfs = (jobId: string, path: string[]): boolean => {
      visited.add(jobId);
      recStack.add(jobId);
      path.push(jobId);

      const dependencies = graph.get(jobId) || [];
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (dfs(dep, path)) {
            return true;
          }
        } else if (recStack.has(dep)) {
          // Cycle detected
          const cycleStart = path.indexOf(dep);
          cycle.push(...path.slice(cycleStart), dep);
          return true;
        }
      }

      path.pop();
      recStack.delete(jobId);
      return false;
    };

    // Check all jobs
    for (const job of jobs) {
      if (!visited.has(job.id)) {
        if (dfs(job.id, [])) {
          return cycle;
        }
      }
    }

    return [];
  }

  /**
   * Detect potential warnings
   */
  private detectWarnings(pipeline: Pipeline, warnings: ParseWarning[]): void {
    // Check for jobs with no script
    for (const job of pipeline.jobs) {
      if (job.steps.length === 0) {
        warnings.push({
          code: 'EMPTY_JOB',
          message: `Job "${job.name}" has no script`,
          path: job.id,
          severity: 'warning',
        });
      }
    }

    // Check for missing timeout
    for (const job of pipeline.jobs) {
      if (!job.timeout) {
        warnings.push({
          code: 'NO_TIMEOUT',
          message: `Job "${job.name}" has no timeout specified`,
          path: job.id,
          severity: 'warning',
        });
      }
    }

    // Check for jobs without stage
    for (const job of pipeline.jobs) {
      if (!job.stage) {
        warnings.push({
          code: 'NO_STAGE',
          message: `Job "${job.name}" has no stage specified`,
          path: job.id,
          severity: 'warning',
        });
      }
    }
  }
}
