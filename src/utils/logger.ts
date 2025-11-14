/**
 * Logger utility for structured logging
 *
 * Provides different log levels (debug, info, warn, error) with
 * consistent formatting and optional metadata.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: unknown;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const meta = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${meta}`;
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, metadata));
    }
  }

  info(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, metadata));
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, metadata));
    }
  }

  error(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, metadata));
    }
  }
}

export const logger = new Logger();
