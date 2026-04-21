/**
 * Tests for error classes and logger utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CodeRefError,
  ParseError,
  FileNotFoundError,
  ScanError,
  ValidationError,
  IndexError,
} from '../src/errors/index.js';
import { logger, LogLevel } from '../src/utils/logger.js';

describe('Error Classes', () => {
  describe('CodeRefError', () => {
    it('should create error with message', () => {
      const error = new CodeRefError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('CodeRefError');
      expect(error.code).toBe('CODEREF_ERROR');
      expect(error.cause).toBeUndefined();
      expect(error.context).toBeUndefined();
    });

    it('should create error with cause', () => {
      const cause = new Error('Original error');
      const error = new CodeRefError('Test error', { cause });

      expect(error.cause).toBe(cause);
      expect(error.message).toBe('Test error');
    });

    it('should create error with context', () => {
      const context = { file: 'test.ts', line: 42 };
      const error = new CodeRefError('Test error', { context });

      expect(error.context).toEqual(context);
    });

    it('should create error with both cause and context', () => {
      const cause = new Error('Original error');
      const context = { file: 'test.ts', operation: 'scan' };
      const error = new CodeRefError('Test error', { cause, context });

      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });

    it('should have proper stack trace', () => {
      const error = new CodeRefError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CodeRefError');
      expect(error.stack).toContain('Test error');
    });

    it('should serialize to JSON correctly', () => {
      const cause = new Error('Original error');
      const context = { file: 'test.ts', line: 42 };
      const error = new CodeRefError('Test error', { cause, context });

      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'CodeRefError',
        code: 'CODEREF_ERROR',
        message: 'Test error',
        context: { file: 'test.ts', line: 42 },
      });

      expect(json).toHaveProperty('stack');
      expect(json).toHaveProperty('cause');
      expect((json as any).cause.message).toBe('Original error');
    });

    it('should convert to user-friendly string', () => {
      const context = { file: 'test.ts', operation: 'scan' };
      const error = new CodeRefError('Test error', { context });

      const str = error.toString();

      expect(str).toContain('CodeRefError: Test error');
      expect(str).toContain('Context:');
      expect(str).toContain('file');
      expect(str).toContain('operation');
    });

    it('should show cause in toString()', () => {
      const cause = new Error('Original error');
      const error = new CodeRefError('Test error', { cause });

      const str = error.toString();

      expect(str).toContain('Caused by: Original error');
    });
  });

  describe('ParseError', () => {
    it('should create ParseError with correct properties', () => {
      const error = new ParseError('Invalid tag format');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodeRefError);
      expect(error).toBeInstanceOf(ParseError);
      expect(error.name).toBe('ParseError');
      expect(error.code).toBe('PARSE_ERROR');
      expect(error.message).toBe('Invalid tag format');
    });

    it('should preserve context', () => {
      const context = { tag: '@Fn/path', expected: '@Fn/path#element:line' };
      const error = new ParseError('Invalid tag format', { context });

      expect(error.context).toEqual(context);
    });
  });

  describe('FileNotFoundError', () => {
    it('should create FileNotFoundError with correct properties', () => {
      const error = new FileNotFoundError('Index file not found');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodeRefError);
      expect(error).toBeInstanceOf(FileNotFoundError);
      expect(error.name).toBe('FileNotFoundError');
      expect(error.code).toBe('FILE_NOT_FOUND');
      expect(error.message).toBe('Index file not found');
    });

    it('should preserve file path in context', () => {
      const context = { path: './coderef-index.json', operation: 'drift' };
      const error = new FileNotFoundError('Index file not found', { context });

      expect(error.context).toEqual(context);
    });
  });

  describe('ScanError', () => {
    it('should create ScanError with correct properties', () => {
      const error = new ScanError('Failed to parse file');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodeRefError);
      expect(error).toBeInstanceOf(ScanError);
      expect(error.name).toBe('ScanError');
      expect(error.code).toBe('SCAN_ERROR');
      expect(error.message).toBe('Failed to parse file');
    });

    it('should chain errors with cause', () => {
      const tsError = new Error('Syntax error at line 42');
      const error = new ScanError('Failed to parse file', {
        cause: tsError,
        context: { file: 'auth.ts', line: 42 },
      });

      expect(error.cause).toBe(tsError);
      expect(error.context).toHaveProperty('file', 'auth.ts');
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid type designator');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodeRefError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid type designator');
    });

    it('should include validation details in context', () => {
      const context = {
        received: 'X',
        expected: ['Fn', 'C', 'Cl', 'M', 'H', 'T', 'A', 'I', 'Cfg'],
      };
      const error = new ValidationError('Invalid type designator', { context });

      expect(error.context).toEqual(context);
    });
  });

  describe('IndexError', () => {
    it('should create IndexError with correct properties', () => {
      const error = new IndexError('Corrupted index file');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodeRefError);
      expect(error).toBeInstanceOf(IndexError);
      expect(error.name).toBe('IndexError');
      expect(error.code).toBe('INDEX_ERROR');
      expect(error.message).toBe('Corrupted index file');
    });

    it('should handle JSON parse errors as cause', () => {
      const jsonError = new SyntaxError('Unexpected token }');
      const error = new IndexError('Corrupted index file', {
        cause: jsonError,
        context: { file: 'coderef-index.json' },
      });

      expect(error.cause).toBe(jsonError);
      expect(error.context).toHaveProperty('file');
    });
  });
});

describe('Logger', () => {
  // Spy on process.stdout and process.stderr
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    logger.setVerbose(false); // Reset to default
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  describe('error()', () => {
    it('should log error to stderr', () => {
      logger.error('Test error');

      expect(stderrSpy).toHaveBeenCalled();
      expect(stderrSpy.mock.calls[0][0]).toContain('[ERROR]');
      expect(stderrSpy.mock.calls[0][0]).toContain('Test error');
    });

    it('should include context in error log', () => {
      logger.error('Test error', { file: 'test.ts', line: 42 });

      expect(stderrSpy).toHaveBeenCalled();
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain('Context:');
      expect(output).toContain('"file":"test.ts"');
      expect(output).toContain('"line":42');
    });

    it('should always show errors even when not verbose', () => {
      logger.setVerbose(false);
      logger.error('Test error');

      expect(stderrSpy).toHaveBeenCalled();
    });
  });

  describe('warn()', () => {
    it('should log warning to stderr', () => {
      logger.warn('Test warning');

      expect(stderrSpy).toHaveBeenCalled();
      expect(stderrSpy.mock.calls[0][0]).toContain('[WARN]');
      expect(stderrSpy.mock.calls[0][0]).toContain('Test warning');
    });

    it('should always show warnings even when not verbose', () => {
      logger.setVerbose(false);
      logger.warn('Test warning');

      expect(stderrSpy).toHaveBeenCalled();
    });
  });

  describe('info()', () => {
    it('should log info to stdout', () => {
      logger.info('Test info');

      expect(stdoutSpy).toHaveBeenCalled();
      expect(stdoutSpy.mock.calls[0][0]).toContain('[INFO]');
      expect(stdoutSpy.mock.calls[0][0]).toContain('Test info');
    });

    it('should show info by default', () => {
      logger.setVerbose(false);
      logger.info('Test info');

      expect(stdoutSpy).toHaveBeenCalled();
    });
  });

  describe('debug()', () => {
    it('should not log debug when verbose is false', () => {
      logger.setVerbose(false);
      logger.debug('Test debug');

      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should log debug to stdout when verbose is true', () => {
      logger.setVerbose(true);
      logger.debug('Test debug');

      expect(stdoutSpy).toHaveBeenCalled();
      expect(stdoutSpy.mock.calls[0][0]).toContain('[DEBUG]');
      expect(stdoutSpy.mock.calls[0][0]).toContain('Test debug');
    });

    it('should include context in debug log', () => {
      logger.setVerbose(true);
      logger.debug('Processing file', { file: 'auth.ts' });

      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0] as string;
      expect(output).toContain('Context:');
      expect(output).toContain('"file":"auth.ts"');
    });
  });

  describe('verbose mode', () => {
    it('should enable timestamps in verbose mode', () => {
      logger.setVerbose(true);
      logger.info('Test info');

      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0] as string;
      // Timestamps are in ISO format: [2025-10-18T...]
      expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });

    it('should not show timestamps when not verbose', () => {
      logger.setVerbose(false);
      logger.info('Test info');

      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0] as string;
      expect(output).not.toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });

    it('should return correct verbose state', () => {
      logger.setVerbose(true);
      expect(logger.isVerbose()).toBe(true);

      logger.setVerbose(false);
      expect(logger.isVerbose()).toBe(false);
    });
  });

  describe('context logging', () => {
    it('should format object context correctly', () => {
      logger.info('Test', { nested: { key: 'value' } });

      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0] as string;
      expect(output).toContain('Context:');
      expect(output).toContain('"nested"');
      expect(output).toContain('{"key":"value"}');
    });

    it('should handle multiple context fields', () => {
      logger.info('Test', { file: 'test.ts', line: 42, operation: 'scan' });

      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0] as string;
      expect(output).toContain('Context:');
      expect(output).toContain('"file":"test.ts"');
      expect(output).toContain('"line":42');
      expect(output).toContain('"operation":"scan"');
    });

    it('should handle empty context gracefully', () => {
      logger.info('Test', {});

      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0] as string;
      expect(output).not.toContain('()');
    });
  });
});
