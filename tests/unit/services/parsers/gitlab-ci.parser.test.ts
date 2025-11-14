/**
 * GitLab CI parser tests
 */

import { GitLabCIParser } from '../../../../src/services/parsers/gitlab-ci.parser';

describe('GitLabCIParser', () => {
  let parser: GitLabCIParser;

  beforeEach(() => {
    parser = new GitLabCIParser();
  });

  describe('parse', () => {
    it('should parse a simple pipeline', async () => {
      const yaml = `
stages:
  - build
  - test

build_job:
  stage: build
  script:
    - echo "Building..."
    - npm run build

test_job:
  stage: test
  script:
    - npm test
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      expect(result.pipeline).toBeDefined();
      expect(result.pipeline?.platform).toBe('gitlab-ci');
      expect(result.pipeline?.stages).toEqual(['build', 'test']);
      expect(result.pipeline?.jobs).toHaveLength(2);
    });

    it('should parse job with needs', async () => {
      const yaml = `
build:
  script:
    - echo build

test:
  needs: [build]
  script:
    - echo test

deploy:
  needs:
    - build
    - test
  script:
    - echo deploy
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);

      const testJob = result.pipeline?.jobs.find((j) => j.id === 'test');
      expect(testJob?.dependsOn).toHaveLength(1);
      expect(testJob?.dependsOn[0].jobId).toBe('build');

      const deployJob = result.pipeline?.jobs.find((j) => j.id === 'deploy');
      expect(deployJob?.dependsOn).toHaveLength(2);
    });

    it('should build stage-based dependencies', async () => {
      const yaml = `
stages:
  - build
  - test
  - deploy

build_job:
  stage: build
  script:
    - echo build

test_job:
  stage: test
  script:
    - echo test

deploy_job:
  stage: deploy
  script:
    - echo deploy
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);

      const testJob = result.pipeline?.jobs.find((j) => j.id === 'test_job');
      expect(testJob?.dependsOn.length).toBeGreaterThan(0);

      const deployJob = result.pipeline?.jobs.find((j) => j.id === 'deploy_job');
      expect(deployJob?.dependsOn.length).toBeGreaterThan(0);
    });

    it('should parse before_script and after_script', async () => {
      const yaml = `
test:
  before_script:
    - echo "Before"
  script:
    - echo "Main"
  after_script:
    - echo "After"
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.steps.length).toBe(3);
      expect(job?.steps[0].name).toBe('Before script');
      expect(job?.steps[2].name).toBe('After script');
    });

    it('should parse image and services', async () => {
      const yaml = `
test:
  image: node:18
  services:
    - postgres:14
    - redis:7
  script:
    - npm test
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.image).toBe('node:18');
      expect(job?.services).toEqual(['postgres:14', 'redis:7']);
    });

    it('should parse variables', async () => {
      const yaml = `
variables:
  NODE_ENV: production
  API_URL: https://api.example.com

deploy:
  variables:
    DEPLOY_ENV: staging
  script:
    - echo deploy
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      expect(result.pipeline?.defaultEnv).toEqual({
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com',
      });

      const job = result.pipeline?.jobs[0];
      expect(job?.environment?.variables).toBeDefined();
    });

    it('should parse artifacts', async () => {
      const yaml = `
build:
  script:
    - npm run build
  artifacts:
    name: build-artifacts
    paths:
      - dist/
      - build/
    when: on_success
    expire_in: 1 week
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.artifacts).toBeDefined();
      expect(job?.artifacts?.name).toBe('build-artifacts');
      expect(job?.artifacts?.paths).toEqual(['dist/', 'build/']);
      expect(job?.artifacts?.when).toBe('on_success');
      expect(job?.artifacts?.expireIn).toBe('1 week');
    });

    it('should parse cache', async () => {
      const yaml = `
test:
  cache:
    key: node-modules
    paths:
      - node_modules/
  script:
    - npm test
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.cache).toBeDefined();
      expect(job?.cache?.key).toBe('node-modules');
      expect(job?.cache?.paths).toEqual(['node_modules/']);
    });

    it('should parse allow_failure and retry', async () => {
      const yaml = `
test:
  script:
    - npm test
  allow_failure: true
  retry: 2
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.allowFailure).toBe(true);
      expect(job?.continueOnError).toBe(true);
      expect(job?.retries).toBe(2);
    });

    it('should parse only/except rules', async () => {
      const yaml = `
deploy:
  script:
    - echo deploy
  only:
    - main
    - develop
  except:
    - tags
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.only).toEqual(['main', 'develop']);
      expect(job?.except).toEqual(['tags']);
    });

    it('should parse when condition', async () => {
      const yaml = `
cleanup:
  script:
    - echo cleanup
  when: on_failure
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.when).toBe('on_failure');
    });

    it('should parse tags (runner tags)', async () => {
      const yaml = `
deploy:
  script:
    - echo deploy
  tags:
    - docker
    - production
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.runsOn).toEqual(['docker', 'production']);
    });

    it('should parse timeout', async () => {
      const yaml = `
test:
  script:
    - npm test
  timeout: 1h 30m
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      const job = result.pipeline?.jobs[0];
      expect(job?.timeout).toBe(5400); // 1h 30m in seconds
    });

    it('should detect circular dependencies', async () => {
      const yaml = `
job1:
  needs: [job2]
  script:
    - echo job1

job2:
  needs: [job1]
  script:
    - echo job2
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some((e) => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('should reject invalid YAML', async () => {
      const yaml = `
job1:
  script: [unclosed
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].code).toBe('INVALID_YAML');
    });

    it('should reject config without jobs', async () => {
      const yaml = `
stages:
  - build
  - test
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].code).toBe('NO_JOBS');
    });

    it('should include warnings when requested', async () => {
      const yaml = `
empty_job:
  script: []

no_timeout:
  script:
    - echo test
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml', {
        includeWarnings: true,
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('should infer stages from jobs', async () => {
      const yaml = `
build:
  stage: build
  script:
    - echo build

test:
  stage: test
  script:
    - echo test
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      expect(result.pipeline?.stages).toContain('build');
      expect(result.pipeline?.stages).toContain('test');
    });

    it('should use default stages when none specified', async () => {
      const yaml = `
test:
  script:
    - npm test
`;

      const result = await parser.parse(yaml, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      expect(result.pipeline?.stages).toEqual(['build', 'test', 'deploy']);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', async () => {
      const yaml = `
test:
  script:
    - npm test
`;

      const result = await parser.validate(yaml);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid configuration', async () => {
      const yaml = `
stages:
  - build
`;

      const result = await parser.validate(yaml);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('extractDependencies', () => {
    it('should extract job dependencies', async () => {
      const yaml = `
build:
  script:
    - echo build

test:
  needs: [build]
  script:
    - echo test

deploy:
  needs:
    - build
    - test
  script:
    - echo deploy
`;

      const deps = await parser.extractDependencies(yaml);

      expect(deps.size).toBe(3);
      expect(deps.get('build')).toEqual([]);
      expect(deps.get('test')).toEqual(['build']);
      expect(deps.get('deploy')).toEqual(['build', 'test']);
    });

    it('should handle jobs with no dependencies', async () => {
      const yaml = `
job1:
  script:
    - echo job1

job2:
  script:
    - echo job2
`;

      const deps = await parser.extractDependencies(yaml);

      expect(deps.size).toBe(2);
      expect(deps.get('job1')).toEqual([]);
      expect(deps.get('job2')).toEqual([]);
    });
  });
});
