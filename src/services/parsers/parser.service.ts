/**
 * Parser service
 *
 * Factory for creating and managing CI/CD configuration parsers
 */

import { IParser, IParserFactory } from './parser.interface';
import { GitHubActionsParser } from './github-actions.parser';
import { GitLabCIParser } from './gitlab-ci.parser';
import { Platform } from '@/types/pipeline.types';

/**
 * Parser factory implementation
 */
export class ParserFactory implements IParserFactory {
  private readonly parsers: Map<Platform, IParser>;

  constructor() {
    this.parsers = new Map<Platform, IParser>([
      ['github-actions', new GitHubActionsParser()],
      ['gitlab-ci', new GitLabCIParser()],
    ]);
  }

  /**
   * Get parser for a specific platform
   */
  getParser(platform: Platform): IParser {
    const parser = this.parsers.get(platform);

    if (!parser) {
      throw new Error(`No parser available for platform: ${platform}`);
    }

    return parser;
  }

  /**
   * Detect platform from file name or content
   */
  detectPlatform(fileName: string, content?: string): Platform | null {
    // GitHub Actions detection
    if (this.isGitHubActions(fileName, content)) {
      return 'github-actions';
    }

    // GitLab CI detection
    if (this.isGitLabCI(fileName, content)) {
      return 'gitlab-ci';
    }

    return null;
  }

  /**
   * Check if file is GitHub Actions workflow
   */
  private isGitHubActions(fileName: string, content?: string): boolean {
    // Check file path
    if (
      fileName.includes('.github/workflows/') ||
      fileName.startsWith('workflows/')
    ) {
      return true;
    }

    // Check content for GitHub Actions keywords
    if (content) {
      const hasGitHubKeywords =
        content.includes('runs-on:') ||
        content.includes('uses:') ||
        content.includes('github.com/actions/') ||
        /on:\s*(push|pull_request|workflow_dispatch|schedule)/.test(content);

      if (hasGitHubKeywords) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if file is GitLab CI configuration
   */
  private isGitLabCI(fileName: string, content?: string): boolean {
    // Check file name
    if (
      fileName === '.gitlab-ci.yml' ||
      fileName.endsWith('/.gitlab-ci.yml')
    ) {
      return true;
    }

    // Check content for GitLab CI keywords
    if (content) {
      const hasGitLabKeywords =
        content.includes('stages:') ||
        /^\s*script:/m.test(content) ||
        content.includes('before_script:') ||
        content.includes('after_script:') ||
        content.includes('artifacts:') ||
        content.includes('allow_failure:');

      if (hasGitLabKeywords) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Singleton instance of the parser factory
 */
export const parserFactory = new ParserFactory();

/**
 * Helper function to get a parser
 */
export function getParser(platform: Platform): IParser {
  return parserFactory.getParser(platform);
}

/**
 * Helper function to detect platform
 */
export function detectPlatform(
  fileName: string,
  content?: string
): Platform | null {
  return parserFactory.detectPlatform(fileName, content);
}

/**
 * Helper function to parse a file with automatic platform detection
 */
export async function parseFile(
  content: string,
  fileName: string,
  options?: {
    platform?: Platform;
    validate?: boolean;
    includeWarnings?: boolean;
  }
) {
  let platform = options?.platform;

  // Auto-detect platform if not specified
  if (!platform) {
    const detected = detectPlatform(fileName, content);
    if (!detected) {
      throw new Error(
        `Could not detect platform from file "${fileName}". Please specify platform explicitly.`
      );
    }
    platform = detected;
  }

  const parser = getParser(platform);
  return parser.parse(content, fileName, {
    validate: options?.validate,
    includeWarnings: options?.includeWarnings,
  });
}
