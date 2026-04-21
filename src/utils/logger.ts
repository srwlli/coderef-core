/**
 * Logger Utility
 * @module utils/logger
 *
 * Provides structured logging with severity levels and configurable verbosity
 */

/**
 * Log severity levels
 */
export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

/**
 * Logger configuration
 */
interface LoggerConfig {
  verbose: boolean;
}

/**
 * Singleton logger instance
 */
class Logger {
  private config: LoggerConfig = {
    verbose: false,
  };

  /**
   * Enable or disable verbose logging
   *
   * @param enabled - Whether to show DEBUG messages
   */
  setVerbose(enabled: boolean): void {
    this.config.verbose = enabled;
  }

  /**
   * Check if verbose mode is enabled
   */
  isVerbose(): boolean {
    return this.config.verbose;
  }

  /**
   * Log an error message (always shown)
   *
   * @param message - Error message
   * @param context - Optional context data
   */
  error(message: string, context?: any): void {
    this.log('ERROR', message, context, process.stderr);
  }

  /**
   * Log a warning message (always shown)
   *
   * @param message - Warning message
   * @param context - Optional context data
   */
  warn(message: string, context?: any): void {
    this.log('WARN', message, context, process.stderr);
  }

  /**
   * Log an info message (shown by default)
   *
   * @param message - Info message
   * @param context - Optional context data
   */
  info(message: string, context?: any): void {
    this.log('INFO', message, context, process.stdout);
  }

  /**
   * Log a debug message (only shown in verbose mode)
   *
   * @param message - Debug message
   * @param context - Optional context data
   */
  debug(message: string, context?: any): void {
    if (!this.config.verbose) {
      return;
    }
    this.log('DEBUG', message, context, process.stdout);
  }

  /**
   * Internal logging function
   */
  private log(
    level: LogLevel,
    message: string,
    context: any | undefined,
    stream: NodeJS.WriteStream
  ): void {
    const timestamp = this.config.verbose ? this.getTimestamp() : '';
    const prefix = this.config.verbose ? `[${timestamp}] [${level}]` : `[${level}]`;
    const contextStr = context ? `\n  Context: ` + JSON.stringify(context) : '';

    stream.write(`${prefix} ${message}${contextStr}\n`);
  }

  /**
   * Get formatted timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }
}

// Export singleton instance
export const logger = new Logger();

export default logger;
