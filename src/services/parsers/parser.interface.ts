/**
 * Parser interface
 *
 * Defines the contract for all CI/CD configuration parsers
 */

import { ParseResult, Platform } from '@/types/pipeline.types';

/**
 * Parser options
 */
export interface ParserOptions {
  /**
   * Validate the configuration against schema
   */
  validate?: boolean;

  /**
   * Include warnings in the result
   */
  includeWarnings?: boolean;

  /**
   * Maximum depth for nested workflow references
   */
  maxDepth?: number;

  /**
   * Repository context (for resolving relative paths)
   */
  repoContext?: {
    owner: string;
    name: string;
    branch?: string;
    commit?: string;
  };
}

/**
 * Base parser interface
 */
export interface IParser {
  /**
   * The platform this parser supports
   */
  readonly platform: Platform;

  /**
   * Parse a CI/CD configuration file
   *
   * @param content - YAML content as string
   * @param fileName - Name of the configuration file
   * @param options - Parser options
   * @returns Parse result with pipeline data or errors
   */
  parse(content: string, fileName: string, options?: ParserOptions): Promise<ParseResult>;

  /**
   * Validate a CI/CD configuration file without full parsing
   *
   * @param content - YAML content as string
   * @returns Validation result with errors/warnings
   */
  validate(content: string): Promise<{
    valid: boolean;
    errors: Array<{ message: string; path?: string }>;
    warnings: Array<{ message: string; path?: string }>;
  }>;

  /**
   * Extract job dependencies from configuration
   *
   * @param content - YAML content as string
   * @returns Map of job IDs to their dependencies
   */
  extractDependencies(content: string): Promise<Map<string, string[]>>;
}

/**
 * Parser factory interface
 */
export interface IParserFactory {
  /**
   * Get parser for a specific platform
   *
   * @param platform - Target platform
   * @returns Parser instance
   */
  getParser(platform: Platform): IParser;

  /**
   * Detect platform from file name or content
   *
   * @param fileName - Configuration file name
   * @param content - Optional file content for detection
   * @returns Detected platform or null
   */
  detectPlatform(fileName: string, content?: string): Platform | null;
}
