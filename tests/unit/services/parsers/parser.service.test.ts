/**
 * Parser service tests
 */

import {
  ParserFactory,
  getParser,
  detectPlatform,
  parseFile,
} from '../../../../src/services/parsers/parser.service';
import { GitHubActionsParser } from '../../../../src/services/parsers/github-actions.parser';
import { GitLabCIParser } from '../../../../src/services/parsers/gitlab-ci.parser';

describe('ParserFactory', () => {
  let factory: ParserFactory;

  beforeEach(() => {
    factory = new ParserFactory();
  });

  describe('getParser', () => {
    it('should return GitHub Actions parser', () => {
      const parser = factory.getParser('github-actions');
      expect(parser).toBeInstanceOf(GitHubActionsParser);
      expect(parser.platform).toBe('github-actions');
    });

    it('should return GitLab CI parser', () => {
      const parser = factory.getParser('gitlab-ci');
      expect(parser).toBeInstanceOf(GitLabCIParser);
      expect(parser.platform).toBe('gitlab-ci');
    });

    it('should throw error for unsupported platform', () => {
      expect(() => factory.getParser('unsupported' as any)).toThrow(
        'No parser available for platform: unsupported'
      );
    });
  });

  describe('detectPlatform', () => {
    describe('GitHub Actions detection', () => {
      it('should detect from .github/workflows path', () => {
        const platform = factory.detectPlatform('.github/workflows/ci.yml');
        expect(platform).toBe('github-actions');
      });

      it('should detect from workflows path', () => {
        const platform = factory.detectPlatform('workflows/deploy.yml');
        expect(platform).toBe('github-actions');
      });

      it('should detect from content with runs-on', () => {
        const content = `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo test
`;
        const platform = factory.detectPlatform('unknown.yml', content);
        expect(platform).toBe('github-actions');
      });

      it('should detect from content with uses', () => {
        const content = `
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
`;
        const platform = factory.detectPlatform('pipeline.yml', content);
        expect(platform).toBe('github-actions');
      });

      it('should detect from content with GitHub event triggers', () => {
        const content = `
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo test
`;
        const platform = factory.detectPlatform('workflow.yml', content);
        expect(platform).toBe('github-actions');
      });
    });

    describe('GitLab CI detection', () => {
      it('should detect from .gitlab-ci.yml filename', () => {
        const platform = factory.detectPlatform('.gitlab-ci.yml');
        expect(platform).toBe('gitlab-ci');
      });

      it('should detect from full path', () => {
        const platform = factory.detectPlatform('/path/to/.gitlab-ci.yml');
        expect(platform).toBe('gitlab-ci');
      });

      it('should detect from content with stages', () => {
        const content = `
stages:
  - build
  - test
test:
  script:
    - npm test
`;
        const platform = factory.detectPlatform('unknown.yml', content);
        expect(platform).toBe('gitlab-ci');
      });

      it('should detect from content with script', () => {
        const content = `
test:
  script:
    - npm test
`;
        const platform = factory.detectPlatform('pipeline.yml', content);
        expect(platform).toBe('gitlab-ci');
      });

      it('should detect from content with before_script', () => {
        const content = `
test:
  before_script:
    - npm install
  script:
    - npm test
`;
        const platform = factory.detectPlatform('ci.yml', content);
        expect(platform).toBe('gitlab-ci');
      });

      it('should detect from content with artifacts', () => {
        const content = `
build:
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
`;
        const platform = factory.detectPlatform('build.yml', content);
        expect(platform).toBe('gitlab-ci');
      });
    });

    it('should return null for unrecognizable config', () => {
      const platform = factory.detectPlatform('unknown.yml');
      expect(platform).toBeNull();
    });

    it('should return null for ambiguous content', () => {
      const content = `
name: test
value: 123
`;
      const platform = factory.detectPlatform('config.yml', content);
      expect(platform).toBeNull();
    });
  });
});

describe('Parser service helpers', () => {
  describe('getParser', () => {
    it('should get GitHub Actions parser', () => {
      const parser = getParser('github-actions');
      expect(parser).toBeInstanceOf(GitHubActionsParser);
    });

    it('should get GitLab CI parser', () => {
      const parser = getParser('gitlab-ci');
      expect(parser).toBeInstanceOf(GitLabCIParser);
    });
  });

  describe('detectPlatform', () => {
    it('should detect GitHub Actions', () => {
      const platform = detectPlatform('.github/workflows/ci.yml');
      expect(platform).toBe('github-actions');
    });

    it('should detect GitLab CI', () => {
      const platform = detectPlatform('.gitlab-ci.yml');
      expect(platform).toBe('gitlab-ci');
    });
  });

  describe('parseFile', () => {
    it('should parse GitHub Actions workflow with auto-detection', async () => {
      const content = `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo test
`;

      const result = await parseFile(content, '.github/workflows/ci.yml');

      expect(result.success).toBe(true);
      expect(result.pipeline?.platform).toBe('github-actions');
    });

    it('should parse GitLab CI config with auto-detection', async () => {
      const content = `
test:
  script:
    - npm test
`;

      const result = await parseFile(content, '.gitlab-ci.yml');

      expect(result.success).toBe(true);
      expect(result.pipeline?.platform).toBe('gitlab-ci');
    });

    it('should parse with explicit platform', async () => {
      const content = `
test:
  script:
    - npm test
`;

      const result = await parseFile(content, 'custom.yml', {
        platform: 'gitlab-ci',
      });

      expect(result.success).toBe(true);
      expect(result.pipeline?.platform).toBe('gitlab-ci');
    });

    it('should throw error if platform cannot be detected', async () => {
      const content = `
name: unknown
value: 123
`;

      await expect(parseFile(content, 'unknown.yml')).rejects.toThrow('Could not detect platform');
    });

    it('should pass validation option', async () => {
      const content = `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo test
`;

      const result = await parseFile(content, '.github/workflows/ci.yml', {
        validate: true,
      });

      expect(result.success).toBe(true);
    });

    it('should pass includeWarnings option', async () => {
      const content = `
name: CI
on: push
jobs:
  empty:
    runs-on: ubuntu-latest
    steps: []
`;

      const result = await parseFile(content, '.github/workflows/ci.yml', {
        includeWarnings: true,
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
    });
  });
});
