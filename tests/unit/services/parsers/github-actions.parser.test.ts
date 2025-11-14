/**
 * GitHub Actions parser tests
 */

import { GitHubActionsParser } from '../../../../src/services/parsers/github-actions.parser';

describe('GitHubActionsParser', () => {
  let parser: GitHubActionsParser;

  beforeEach(() => {
    parser = new GitHubActionsParser();
  });

  describe('parse', () => {
    it('should parse a simple workflow', async () => {
      const yaml = `
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: npm run build
`;

      const result = await parser.parse(yaml, 'ci.yml');

      expect(result.success).toBe(true);
      expect(result.pipeline).toBeDefined();
      expect(result.pipeline?.name).toBe('CI');
      expect(result.pipeline?.platform).toBe('github-actions');
      expect(result.pipeline?.jobs).toHaveLength(1);
      expect(result.pipeline?.jobs[0].id).toBe('build');
      expect(result.pipeline?.jobs[0].steps).toHaveLength(2);
    });

    it('should parse job dependencies', async () => {
      const yaml = `
name: Pipeline
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo build
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo test
  deploy:
    needs: [build, test]
    runs-on: ubuntu-latest
    steps:
      - run: echo deploy
`;

      const result = await parser.parse(yaml, 'pipeline.yml');

      expect(result.success).toBe(true);
      expect(result.pipeline?.jobs).toHaveLength(3);

      const testJob = result.pipeline?.jobs.find((j) => j.id === 'test');
      expect(testJob?.dependsOn).toHaveLength(1);
      expect(testJob?.dependsOn[0].jobId).toBe('build');

      const deployJob = result.pipeline?.jobs.find((j) => j.id === 'deploy');
      expect(deployJob?.dependsOn).toHaveLength(2);
    });

    it('should detect circular dependencies', async () => {
      const yaml = `
name: Circular
on: push
jobs:
  job1:
    needs: job2
    runs-on: ubuntu-latest
    steps:
      - run: echo job1
  job2:
    needs: job1
    runs-on: ubuntu-latest
    steps:
      - run: echo job2
`;

      const result = await parser.parse(yaml, 'circular.yml');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some((e) => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('should parse triggers', async () => {
      const yaml = `
name: Triggers
on:
  push:
    branches:
      - main
      - develop
    tags:
      - v*
  pull_request:
    types:
      - opened
      - synchronize
  workflow_dispatch:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo test
`;

      const result = await parser.parse(yaml, 'triggers.yml');

      expect(result.success).toBe(true);
      expect(result.pipeline?.triggers.branches).toEqual(['main', 'develop']);
      expect(result.pipeline?.triggers.tags).toEqual(['v*']);
      expect(result.pipeline?.triggers.types).toBeDefined();
      expect(result.pipeline?.triggers.workflowDispatch).toBe(true);
    });

    it('should parse environment and timeout', async () => {
      const yaml = `
name: Config
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    timeout-minutes: 30
    steps:
      - run: echo deploy
`;

      const result = await parser.parse(yaml, 'config.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.environment?.name).toBe('production');
      expect(job?.timeout).toBe(1800); // 30 minutes in seconds
    });

    it('should parse matrix strategy', async () => {
      const yaml = `
name: Matrix
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [14, 16, 18]
        os: [ubuntu-latest, windows-latest]
    steps:
      - run: echo test
`;

      const result = await parser.parse(yaml, 'matrix.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.matrix).toBeDefined();
      expect(job?.matrix?.node).toEqual([14, 16, 18]);
    });

    it('should reject invalid YAML', async () => {
      const yaml = `
name: Invalid
jobs:
  test: [unclosed
`;

      const result = await parser.parse(yaml, 'invalid.yml');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].code).toBe('INVALID_YAML');
    });

    it('should reject workflow without jobs', async () => {
      const yaml = `
name: No Jobs
on: push
`;

      const result = await parser.parse(yaml, 'no-jobs.yml');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].code).toBe('NO_JOBS');
    });

    it('should parse container and services', async () => {
      const yaml = `
name: Container
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    container: node:18
    services:
      postgres:
        image: postgres:14
      redis:
        image: redis:7
    steps:
      - run: echo test
`;

      const result = await parser.parse(yaml, 'container.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.image).toBe('node:18');
      expect(job?.services).toEqual(['postgres', 'redis']);
    });

    it('should include warnings when requested', async () => {
      const yaml = `
name: Warnings
on: push
jobs:
  empty:
    runs-on: ubuntu-latest
    steps: []
  no-timeout:
    runs-on: ubuntu-latest
    steps:
      - run: echo test
`;

      const result = await parser.parse(yaml, 'warnings.yml', {
        includeWarnings: true,
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('should parse default environment variables', async () => {
      const yaml = `
name: Env
on: push
env:
  NODE_ENV: production
  API_URL: https://api.example.com
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: echo deploy
`;

      const result = await parser.parse(yaml, 'env.yml');

      expect(result.success).toBe(true);
      expect(result.pipeline?.defaultEnv).toEqual({
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com',
      });
    });

    it('should parse conditional steps', async () => {
      const yaml = `
name: Conditional
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - name: Conditional step
        if: success()
        run: echo conditional
`;

      const result = await parser.parse(yaml, 'conditional.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.if).toBe("github.event_name == 'push'");
      expect(job?.steps[0].if).toBe('success()');
    });

    it('should parse step with action inputs', async () => {
      const yaml = `
name: Actions
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: \${{ secrets.GITHUB_TOKEN }}
`;

      const result = await parser.parse(yaml, 'actions.yml');

      expect(result.success).toBe(true);
      const step = result.pipeline?.jobs[0].steps[0];
      expect(step?.uses).toBe('actions/checkout@v3');
      expect(step?.with).toBeDefined();
      expect(step?.with?.['fetch-depth']).toBe(0);
    });
  });

  describe('validate', () => {
    it('should validate valid workflow', async () => {
      const yaml = `
name: Valid
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo test
`;

      const result = await parser.validate(yaml);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid workflow', async () => {
      const yaml = `
name: Invalid
on: push
`;

      const result = await parser.validate(yaml);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('extractDependencies', () => {
    it('should extract job dependencies', async () => {
      const yaml = `
name: Dependencies
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo build
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo test
  deploy:
    needs: [build, test]
    runs-on: ubuntu-latest
    steps:
      - run: echo deploy
`;

      const deps = await parser.extractDependencies(yaml);

      expect(deps.size).toBe(3);
      expect(deps.get('build')).toEqual([]);
      expect(deps.get('test')).toEqual(['build']);
      expect(deps.get('deploy')).toEqual(['build', 'test']);
    });

    it('should handle workflow with no dependencies', async () => {
      const yaml = `
name: No Dependencies
on: push
jobs:
  job1:
    runs-on: ubuntu-latest
    steps:
      - run: echo job1
  job2:
    runs-on: ubuntu-latest
    steps:
      - run: echo job2
`;

      const deps = await parser.extractDependencies(yaml);

      expect(deps.size).toBe(2);
      expect(deps.get('job1')).toEqual([]);
      expect(deps.get('job2')).toEqual([]);
    });
  });
});
