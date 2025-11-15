/**
 * Parse endpoint integration tests
 */

import request from 'supertest';
import app from '../../../src/app';

describe('POST /api/v1/parse', () => {
  const validGitHubWorkflow = `
name: CI
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build
        run: npm run build
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Test
        run: npm test
`;

  const validGitLabCI = `
stages:
  - build
  - test

build:
  stage: build
  script:
    - npm run build

test:
  stage: test
  needs: [build]
  script:
    - npm test
`;

  describe('successful parsing', () => {
    it('should parse GitHub Actions workflow with explicit platform', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          platform: 'github-actions',
          yamlContent: validGitHubWorkflow,
          fileName: 'ci.yml',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pipeline');
      expect(response.body.data.pipeline.platform).toBe('github-actions');
      expect(response.body.data.pipeline.jobs).toHaveLength(2);
      expect(response.body.metadata.platform).toBe('github-actions');
      expect(response.body.metadata.jobCount).toBe(2);
    });

    it('should parse GitHub Actions workflow with auto-detection', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          yamlContent: validGitHubWorkflow,
          fileName: '.github/workflows/ci.yml',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pipeline.platform).toBe('github-actions');
    });

    it('should parse GitLab CI with explicit platform', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          platform: 'gitlab-ci',
          yamlContent: validGitLabCI,
          fileName: '.gitlab-ci.yml',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pipeline.platform).toBe('gitlab-ci');
      expect(response.body.data.pipeline.jobs).toHaveLength(2);
    });

    it('should parse GitLab CI with auto-detection', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          yamlContent: validGitLabCI,
          fileName: '.gitlab-ci.yml',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pipeline.platform).toBe('gitlab-ci');
    });

    it('should include metadata in response', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          platform: 'github-actions',
          yamlContent: validGitHubWorkflow,
          fileName: 'ci.yml',
        })
        .expect(200);

      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
      expect(response.body.metadata).toHaveProperty('platform');
      expect(response.body.metadata).toHaveProperty('jobCount');
      expect(response.body.metadata).toHaveProperty('hasErrors');
      expect(response.body.metadata).toHaveProperty('hasWarnings');
    });
  });

  describe('validation errors', () => {
    it('should return 400 for missing yamlContent', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          platform: 'github-actions',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty yamlContent', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          platform: 'github-actions',
          yamlContent: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid YAML syntax', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          platform: 'github-actions',
          yamlContent: 'invalid: yaml: syntax: error:',
          fileName: 'invalid.yml',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for oversized YAML content', async () => {
      const largeContent = 'a'.repeat(1024 * 1024 + 1);
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          platform: 'github-actions',
          yamlContent: largeContent,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('parser options', () => {
    it('should accept parser options', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          platform: 'github-actions',
          yamlContent: validGitHubWorkflow,
          fileName: 'ci.yml',
          options: {
            validate: true,
            includeWarnings: true,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept repository context', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({
          platform: 'github-actions',
          yamlContent: validGitHubWorkflow,
          fileName: 'ci.yml',
          options: {
            repoContext: {
              owner: 'test-org',
              name: 'test-repo',
              branch: 'main',
              commit: 'abc123',
            },
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

describe('POST /api/v1/parse/validate', () => {
  const validWorkflow = `
name: CI
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
`;

  it('should validate valid GitHub Actions workflow', async () => {
    const response = await request(app)
      .post('/api/v1/parse/validate')
      .send({
        platform: 'github-actions',
        yamlContent: validWorkflow,
        fileName: 'ci.yml',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.valid).toBe(true);
    expect(response.body.data.platform).toBe('github-actions');
    expect(response.body.data.errors).toEqual([]);
  });

  it('should detect platform and validate', async () => {
    const response = await request(app)
      .post('/api/v1/parse/validate')
      .send({
        yamlContent: validWorkflow,
        fileName: '.github/workflows/ci.yml',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.valid).toBe(true);
  });

  it('should return validation errors for invalid workflow', async () => {
    const response = await request(app)
      .post('/api/v1/parse/validate')
      .send({
        platform: 'github-actions',
        yamlContent: 'invalid: yaml: syntax:',
        fileName: 'invalid.yml',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.valid).toBe(false);
    expect(response.body.data.errors.length).toBeGreaterThan(0);
  });

  it('should return error if platform cannot be detected', async () => {
    const response = await request(app)
      .post('/api/v1/parse/validate')
      .send({
        yamlContent: 'key: value',
        fileName: 'unknown.yml',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/v1/parse/detect-platform', () => {
  it('should detect GitHub Actions from file path', async () => {
    const response = await request(app)
      .post('/api/v1/parse/detect-platform')
      .send({
        yamlContent: 'name: CI\njobs:\n  build:\n    runs-on: ubuntu-latest',
        fileName: '.github/workflows/ci.yml',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.platform).toBe('github-actions');
    expect(response.body.data.confidence).toBe('high');
  });

  it('should detect GitLab CI from file name', async () => {
    const response = await request(app)
      .post('/api/v1/parse/detect-platform')
      .send({
        yamlContent: 'stages:\n  - build\nbuild:\n  script:\n    - echo test',
        fileName: '.gitlab-ci.yml',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.platform).toBe('gitlab-ci');
    expect(response.body.data.confidence).toBe('high');
  });

  it('should detect GitHub Actions from content keywords', async () => {
    const response = await request(app)
      .post('/api/v1/parse/detect-platform')
      .send({
        yamlContent: 'name: CI\non:\n  push:\njobs:\n  build:\n    runs-on: ubuntu-latest',
        fileName: 'unknown.yml',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.platform).toBe('github-actions');
  });

  it('should return null for unknown platform', async () => {
    const response = await request(app)
      .post('/api/v1/parse/detect-platform')
      .send({
        yamlContent: 'key: value\nother: data',
        fileName: 'config.yml',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.platform).toBeNull();
    expect(response.body.data.confidence).toBe('none');
  });

  it('should return 400 for missing yamlContent', async () => {
    const response = await request(app)
      .post('/api/v1/parse/detect-platform')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
