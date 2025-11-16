/**
 * GitHub Actions parser
 *
 * Parses GitHub Actions workflow YAML files into unified Pipeline format
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
 * GitHub Actions workflow structure
 */
interface GitHubWorkflow {
  name?: string;
  on?: unknown;
  jobs?: Record<string, unknown>;
  env?: Record<string, string>;
  defaults?: unknown;
}

/**
 * GitHub Actions parser implementation
 */
export class GitHubActionsParser implements IParser {
  readonly platform: Platform = 'github-actions';

  /**
   * Parse GitHub Actions workflow file
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

      const workflow = validation.data as GitHubWorkflow;

      // Validate required fields
      if (!isObject(workflow)) {
        errors.push({
          code: 'INVALID_STRUCTURE',
          message: 'Workflow must be an object',
          severity: 'error',
        });
        return { success: false, errors };
      }

      if (!workflow.jobs || !isObject(workflow.jobs)) {
        errors.push({
          code: 'NO_JOBS',
          message: 'Workflow must contain a "jobs" section',
          severity: 'error',
        });
        return { success: false, errors };
      }

      // Parse workflow
      const pipeline: Pipeline = {
        id: uuid.v4(),
        name: isNonEmptyString(workflow.name) ? workflow.name : fileName.replace(/\.ya?ml$/, ''),
        platform: this.platform,
        jobs: [],
        triggers: this.parseTriggers(workflow.on),
        defaultEnv: isObject(workflow.env) ? (workflow.env as Record<string, string>) : undefined,
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
      const jobEntries = Object.entries(workflow.jobs);
      for (const [jobId, jobData] of jobEntries) {
        try {
          const job = this.parseJob(jobId, jobData);
          pipeline.jobs.push(job);
        } catch (error) {
          errors.push({
            code: 'JOB_PARSE_ERROR',
            message: `Failed to parse job "${jobId}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            path: `jobs.${jobId}`,
            severity: 'error',
          });
        }
      }

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
   * Validate GitHub Actions workflow
   */
  async validate(content: string): Promise<{
    valid: boolean;
    errors: Array<{ message: string; path?: string }>;
    warnings: Array<{ message: string; path?: string }>;
  }> {
    const result = await this.parse(content, 'workflow.yml', {
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
      const workflow = parseYAML(content) as GitHubWorkflow;
      if (!workflow.jobs || !isObject(workflow.jobs)) {
        return dependencies;
      }

      for (const [jobId, jobData] of Object.entries(workflow.jobs)) {
        if (!isObject(jobData)) continue;

        const needs = jobData.needs;
        const deps: string[] = [];

        if (typeof needs === 'string') {
          deps.push(needs);
        } else if (Array.isArray(needs)) {
          deps.push(...needs.filter((n) => typeof n === 'string'));
        }

        dependencies.set(jobId, deps);
      }
    } catch {
      // Return empty map on error
    }

    return dependencies;
  }

  /**
   * Parse trigger configuration
   */
  private parseTriggers(on: unknown): TriggerConfig {
    const triggers: TriggerConfig = {};

    if (!on) {
      return triggers;
    }

    // Handle string format: on: push
    if (typeof on === 'string') {
      return triggers;
    }

    // Handle object format
    if (!isObject(on)) {
      return triggers;
    }

    // Parse push/pull_request triggers
    const push = getNestedProperty(on, 'push');
    const pullRequest = getNestedProperty(on, 'pull_request');

    if (isObject(push)) {
      triggers.branches = normalizeToArray(getNestedProperty(push, 'branches'));
      triggers.tags = normalizeToArray(getNestedProperty(push, 'tags'));
      triggers.paths = normalizeToArray(getNestedProperty(push, 'paths'));
    }

    if (isObject(pullRequest)) {
      const prTypes = normalizeToArray(getNestedProperty(pullRequest, 'types'));
      triggers.types = prTypes.length > 0 ? prTypes : undefined;
    }

    // Parse schedule
    const schedule = getNestedProperty(on, 'schedule');
    if (isArray(schedule) && schedule.length > 0) {
      const firstSchedule = schedule[0];
      if (isObject(firstSchedule)) {
        const cron = getNestedProperty(firstSchedule, 'cron');
        if (isNonEmptyString(cron)) {
          triggers.schedule = cron;
        }
      }
    }

    // Parse workflow_dispatch
    if ('workflow_dispatch' in on) {
      triggers.workflowDispatch = true;
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
      name: isNonEmptyString(jobData.name) ? jobData.name : jobId,
      dependsOn: this.parseJobDependencies(jobData.needs),
      steps: this.parseSteps(jobData.steps),
      runsOn: this.parseRunsOn(jobData['runs-on']),
      needs: normalizeToArray(jobData.needs),
    };

    // Optional fields
    if (isNonEmptyString(jobData.if)) {
      job.if = jobData.if;
    }

    if (isObject(jobData.environment)) {
      const envName = getNestedProperty(jobData.environment, 'name');
      job.environment = {
        name: isNonEmptyString(envName) ? envName : 'unknown',
        variables: [],
      };
    } else if (isNonEmptyString(jobData.environment)) {
      job.environment = {
        name: jobData.environment,
        variables: [],
      };
    }

    if (typeof jobData['timeout-minutes'] === 'number') {
      job.timeout = jobData['timeout-minutes'] * 60; // Convert to seconds
    }

    if (typeof jobData['continue-on-error'] === 'boolean') {
      job.continueOnError = jobData['continue-on-error'];
    }

    // Parse container
    if (isObject(jobData.container)) {
      const image = getNestedProperty(jobData.container, 'image');
      if (isNonEmptyString(image)) {
        job.image = image;
      }
    } else if (isNonEmptyString(jobData.container)) {
      job.image = jobData.container;
    }

    // Parse services
    if (isObject(jobData.services)) {
      job.services = Object.keys(jobData.services);
    }

    // Parse strategy (matrix)
    if (isObject(jobData.strategy)) {
      const matrix = getNestedProperty(jobData.strategy, 'matrix');
      if (isObject(matrix)) {
        job.matrix = matrix as Record<string, unknown[]>;
      }
    }

    return job;
  }

  /**
   * Parse job dependencies
   */
  private parseJobDependencies(needs: unknown): JobDependency[] {
    const dependencies: JobDependency[] = [];

    if (typeof needs === 'string') {
      dependencies.push({
        jobId: needs,
        type: 'needs',
      });
    } else if (Array.isArray(needs)) {
      for (const need of needs) {
        if (typeof need === 'string') {
          dependencies.push({
            jobId: need,
            type: 'needs',
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Parse runs-on field
   */
  private parseRunsOn(runsOn: unknown): string | string[] | undefined {
    if (typeof runsOn === 'string') {
      return runsOn;
    }
    if (Array.isArray(runsOn)) {
      return runsOn.filter((r) => typeof r === 'string');
    }
    return undefined;
  }

  /**
   * Parse job steps
   */
  private parseSteps(steps: unknown): Step[] {
    if (!Array.isArray(steps)) {
      return [];
    }

    const parsedSteps: Step[] = [];

    for (let i = 0; i < steps.length; i++) {
      const stepData = steps[i];
      if (!isObject(stepData)) continue;

      const step: Step = {
        id: isNonEmptyString(stepData.id) ? stepData.id : `step-${i + 1}`,
        name: isNonEmptyString(stepData.name) ? stepData.name : undefined,
      };

      // uses vs run
      if (isNonEmptyString(stepData.uses)) {
        step.uses = stepData.uses;
        if (isObject(stepData.with)) {
          step.with = stepData.with as Record<string, unknown>;
        }
      } else if (isNonEmptyString(stepData.run)) {
        step.command = stepData.run;
      } else if (Array.isArray(stepData.run)) {
        step.command = stepData.run.filter((r) => typeof r === 'string').join('\n');
      }

      // Optional fields
      if (isObject(stepData.env)) {
        step.env = stepData.env as Record<string, string>;
      }

      if (typeof stepData['continue-on-error'] === 'boolean') {
        step.continueOnError = stepData['continue-on-error'];
      }

      if (typeof stepData['timeout-minutes'] === 'number') {
        step.timeout = stepData['timeout-minutes'] * 60;
      }

      if (isNonEmptyString(stepData['working-directory'])) {
        step.workingDirectory = stepData['working-directory'];
      }

      if (isNonEmptyString(stepData.if)) {
        step.if = stepData.if;
      }

      parsedSteps.push(step);
    }

    return parsedSteps;
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
      graph.set(job.id, job.needs || []);
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
    // Check for jobs with no dependencies (parallel execution warning)
    const jobsWithNoDeps = pipeline.jobs.filter(
      (j) => j.dependsOn.length === 0 && j.needs?.length === 0
    );
    if (jobsWithNoDeps.length > 5) {
      warnings.push({
        code: 'MANY_PARALLEL_JOBS',
        message: `${jobsWithNoDeps.length} jobs will run in parallel, which may consume many runners`,
        severity: 'warning',
      });
    }

    // Check for jobs with no steps
    for (const job of pipeline.jobs) {
      if (job.steps.length === 0) {
        warnings.push({
          code: 'EMPTY_JOB',
          message: `Job "${job.name}" has no steps`,
          path: `jobs.${job.id}`,
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
          path: `jobs.${job.id}`,
          severity: 'warning',
        });
      }
    }
  }
}
