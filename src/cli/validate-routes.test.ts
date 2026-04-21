/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: CLI Integration Tests
 * Tests for validate-routes CLI command
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('validate-routes CLI', () => {
  const testDir = path.join(process.cwd(), 'test-temp-cli');
  const coderefDir = path.join(testDir, '.coderef');

  beforeEach(async () => {
    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(coderefDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('argument parsing', () => {
    it('should show help with --help flag', async () => {
      const { stdout } = await execAsync('node dist/src/cli/validate-routes.js --help');

      expect(stdout).toContain('Route Validation CLI');
      expect(stdout).toContain('USAGE:');
      expect(stdout).toContain('OPTIONS:');
      expect(stdout).toContain('EXAMPLES:');
    });

    it('should show help with -h flag', async () => {
      const { stdout } = await execAsync('node dist/src/cli/validate-routes.js -h');

      expect(stdout).toContain('Route Validation CLI');
    });

    it('should show help when no arguments provided', async () => {
      const { stdout } = await execAsync('node dist/src/cli/validate-routes.js');

      expect(stdout).toContain('Route Validation CLI');
    });
  });

  describe('file path resolution', () => {
    it('should use .coderef directory when --project-dir is specified', async () => {
      // Create sample files
      const frontendCalls = {
        byCallType: {
          fetch: [
            {
              path: '/api/users',
              method: 'GET',
              file: 'app.tsx',
              line: 10,
              callType: 'fetch',
              confidence: 100
            }
          ]
        }
      };

      const serverRoutes = {
        byFramework: {
          express: [
            {
              route: {
                path: '/api/users',
                methods: ['GET'],
                framework: 'express'
              }
            }
          ]
        }
      };

      await fs.writeFile(
        path.join(coderefDir, 'frontend-calls.json'),
        JSON.stringify(frontendCalls, null, 2)
      );

      await fs.writeFile(
        path.join(coderefDir, 'routes.json'),
        JSON.stringify(serverRoutes, null, 2)
      );

      // Run CLI
      const { stdout } = await execAsync(
        `node dist/src/cli/validate-routes.js --project-dir ${testDir}`
      );

      expect(stdout).toContain('Starting route validation');
      expect(stdout).toContain('Frontend API Calls: 1');
      expect(stdout).toContain('Server Routes:      1');
      expect(stdout).toContain('Matched Routes:     1');
    });

    it('should use explicit paths when --frontend-calls and --server-routes are specified', async () => {
      // Create sample files with custom names
      const frontendCallsPath = path.join(testDir, 'custom-frontend.json');
      const serverRoutesPath = path.join(testDir, 'custom-routes.json');

      const frontendCalls = {
        byCallType: {
          fetch: [
            {
              path: '/api/posts',
              method: 'POST',
              file: 'app.tsx',
              line: 20,
              callType: 'fetch',
              confidence: 100
            }
          ]
        }
      };

      const serverRoutes = {
        byFramework: {
          nextjs: [
            {
              route: {
                path: '/api/posts',
                methods: ['POST'],
                framework: 'nextjs'
              }
            }
          ]
        }
      };

      await fs.writeFile(frontendCallsPath, JSON.stringify(frontendCalls, null, 2));
      await fs.writeFile(serverRoutesPath, JSON.stringify(serverRoutes, null, 2));

      // Run CLI with explicit paths
      const { stdout } = await execAsync(
        `node dist/src/cli/validate-routes.js --frontend-calls ${frontendCallsPath} --server-routes ${serverRoutesPath}`
      );

      expect(stdout).toContain('Starting route validation');
      expect(stdout).toContain('Frontend API Calls: 1');
    });

    it('should exit with error if .coderef directory not found', async () => {
      const nonExistentDir = path.join(testDir, 'non-existent');

      try {
        await execAsync(`node dist/src/cli/validate-routes.js --project-dir ${nonExistentDir}`);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(2);
        expect(error.stderr || error.stdout).toContain('.coderef directory not found');
      }
    });

    it('should exit with error if frontend-calls.json not found', async () => {
      const nonExistentFile = path.join(testDir, 'non-existent.json');

      try {
        await execAsync(
          `node dist/src/cli/validate-routes.js --frontend-calls ${nonExistentFile} --server-routes ${path.join(testDir, 'routes.json')}`
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(2);
        expect(error.stderr || error.stdout).toContain('Frontend calls file not found');
      }
    });
  });

  describe('validation reporting', () => {
    it('should detect missing routes', async () => {
      const frontendCalls = {
        byCallType: {
          fetch: [
            {
              path: '/api/missing',
              method: 'GET',
              file: 'app.tsx',
              line: 10,
              callType: 'fetch',
              confidence: 100
            }
          ]
        }
      };

      const serverRoutes = {
        byFramework: {
          express: []
        }
      };

      await fs.writeFile(
        path.join(coderefDir, 'frontend-calls.json'),
        JSON.stringify(frontendCalls, null, 2)
      );

      await fs.writeFile(
        path.join(coderefDir, 'routes.json'),
        JSON.stringify(serverRoutes, null, 2)
      );

      const { stdout } = await execAsync(
        `node dist/src/cli/validate-routes.js --project-dir ${testDir}`
      );

      expect(stdout).toContain('🔴 Critical: 1');
      expect(stdout).toContain('No server route found');
    });

    it('should detect unused routes', async () => {
      const frontendCalls = {
        byCallType: {
          fetch: []
        }
      };

      const serverRoutes = {
        byFramework: {
          express: [
            {
              route: {
                path: '/api/unused',
                methods: ['GET'],
                framework: 'express'
              }
            }
          ]
        }
      };

      await fs.writeFile(
        path.join(coderefDir, 'frontend-calls.json'),
        JSON.stringify(frontendCalls, null, 2)
      );

      await fs.writeFile(
        path.join(coderefDir, 'routes.json'),
        JSON.stringify(serverRoutes, null, 2)
      );

      const { stdout } = await execAsync(
        `node dist/src/cli/validate-routes.js --project-dir ${testDir}`
      );

      expect(stdout).toContain('🟡 Warnings: 1');
      expect(stdout).toContain('Warnings detected');
    });

    it('should detect method mismatches', async () => {
      const frontendCalls = {
        byCallType: {
          fetch: [
            {
              path: '/api/users',
              method: 'POST',
              file: 'app.tsx',
              line: 10,
              callType: 'fetch',
              confidence: 100
            }
          ]
        }
      };

      const serverRoutes = {
        byFramework: {
          express: [
            {
              route: {
                path: '/api/users',
                methods: ['GET'],
                framework: 'express'
              }
            }
          ]
        }
      };

      await fs.writeFile(
        path.join(coderefDir, 'frontend-calls.json'),
        JSON.stringify(frontendCalls, null, 2)
      );

      await fs.writeFile(
        path.join(coderefDir, 'routes.json'),
        JSON.stringify(serverRoutes, null, 2)
      );

      const { stdout } = await execAsync(
        `node dist/src/cli/validate-routes.js --project-dir ${testDir}`
      );

      expect(stdout).toContain('🔴 Critical: 1');
      expect(stdout).toContain('method mismatch');
    });
  });

  describe('--fail-on-critical flag', () => {
    it('should exit with code 0 when no critical issues and flag is set', async () => {
      const frontendCalls = {
        byCallType: {
          fetch: [
            {
              path: '/api/users',
              method: 'GET',
              file: 'app.tsx',
              line: 10,
              callType: 'fetch',
              confidence: 100
            }
          ]
        }
      };

      const serverRoutes = {
        byFramework: {
          express: [
            {
              route: {
                path: '/api/users',
                methods: ['GET'],
                framework: 'express'
              }
            }
          ]
        }
      };

      await fs.writeFile(
        path.join(coderefDir, 'frontend-calls.json'),
        JSON.stringify(frontendCalls, null, 2)
      );

      await fs.writeFile(
        path.join(coderefDir, 'routes.json'),
        JSON.stringify(serverRoutes, null, 2)
      );

      const { stdout } = await execAsync(
        `node dist/src/cli/validate-routes.js --project-dir ${testDir} --fail-on-critical`
      );

      expect(stdout).toContain('Validation complete');
    });

    it('should exit with code 1 when critical issues found and flag is set', async () => {
      const frontendCalls = {
        byCallType: {
          fetch: [
            {
              path: '/api/missing',
              method: 'GET',
              file: 'app.tsx',
              line: 10,
              callType: 'fetch',
              confidence: 100
            }
          ]
        }
      };

      const serverRoutes = {
        byFramework: {
          express: []
        }
      };

      await fs.writeFile(
        path.join(coderefDir, 'frontend-calls.json'),
        JSON.stringify(frontendCalls, null, 2)
      );

      await fs.writeFile(
        path.join(coderefDir, 'routes.json'),
        JSON.stringify(serverRoutes, null, 2)
      );

      try {
        await execAsync(
          `node dist/src/cli/validate-routes.js --project-dir ${testDir} --fail-on-critical`
        );
        expect.fail('Should have exited with code 1');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stdout).toContain('Validation failed: Critical issues found');
      }
    });

    it('should exit with code 0 when critical issues found but flag not set', async () => {
      const frontendCalls = {
        byCallType: {
          fetch: [
            {
              path: '/api/missing',
              method: 'GET',
              file: 'app.tsx',
              line: 10,
              callType: 'fetch',
              confidence: 100
            }
          ]
        }
      };

      const serverRoutes = {
        byFramework: {
          express: []
        }
      };

      await fs.writeFile(
        path.join(coderefDir, 'frontend-calls.json'),
        JSON.stringify(frontendCalls, null, 2)
      );

      await fs.writeFile(
        path.join(coderefDir, 'routes.json'),
        JSON.stringify(serverRoutes, null, 2)
      );

      const { stdout } = await execAsync(
        `node dist/src/cli/validate-routes.js --project-dir ${testDir}`
      );

      expect(stdout).toContain('Validation complete');
      expect(stdout).toContain('🔴 Critical: 1');
    });
  });

  describe('--output option', () => {
    it('should save markdown report to custom path', async () => {
      const customOutputPath = path.join(testDir, 'custom-report.md');

      const frontendCalls = {
        byCallType: {
          fetch: [
            {
              path: '/api/users',
              method: 'GET',
              file: 'app.tsx',
              line: 10,
              callType: 'fetch',
              confidence: 100
            }
          ]
        }
      };

      const serverRoutes = {
        byFramework: {
          express: [
            {
              route: {
                path: '/api/users',
                methods: ['GET'],
                framework: 'express'
              }
            }
          ]
        }
      };

      await fs.writeFile(
        path.join(coderefDir, 'frontend-calls.json'),
        JSON.stringify(frontendCalls, null, 2)
      );

      await fs.writeFile(
        path.join(coderefDir, 'routes.json'),
        JSON.stringify(serverRoutes, null, 2)
      );

      const { stdout } = await execAsync(
        `node dist/src/cli/validate-routes.js --project-dir ${testDir} --output ${customOutputPath}`
      );

      expect(stdout).toContain(`Markdown report saved: ${customOutputPath}`);

      // Verify file was created
      const reportContent = await fs.readFile(customOutputPath, 'utf-8');
      expect(reportContent).toContain('# Route Validation Report');
    });

    it('should save to default path when --output not specified', async () => {
      const frontendCalls = {
        byCallType: {
          fetch: []
        }
      };

      const serverRoutes = {
        byFramework: {
          express: []
        }
      };

      await fs.writeFile(
        path.join(coderefDir, 'frontend-calls.json'),
        JSON.stringify(frontendCalls, null, 2)
      );

      await fs.writeFile(
        path.join(coderefDir, 'routes.json'),
        JSON.stringify(serverRoutes, null, 2)
      );

      const { stdout } = await execAsync(
        `node dist/src/cli/validate-routes.js --project-dir ${testDir}`
      );

      const defaultPath = path.join(coderefDir, 'route-validation-report.md');
      expect(stdout).toContain(`Markdown report saved: ${defaultPath}`);

      // Verify file was created
      const reportContent = await fs.readFile(defaultPath, 'utf-8');
      expect(reportContent).toContain('# Route Validation Report');
    });
  });

  describe('report generation', () => {
    it('should save both JSON and markdown reports', async () => {
      const frontendCalls = {
        byCallType: {
          fetch: [
            {
              path: '/api/users',
              method: 'GET',
              file: 'app.tsx',
              line: 10,
              callType: 'fetch',
              confidence: 100
            }
          ]
        }
      };

      const serverRoutes = {
        byFramework: {
          express: [
            {
              route: {
                path: '/api/users',
                methods: ['GET'],
                framework: 'express'
              }
            }
          ]
        }
      };

      await fs.writeFile(
        path.join(coderefDir, 'frontend-calls.json'),
        JSON.stringify(frontendCalls, null, 2)
      );

      await fs.writeFile(
        path.join(coderefDir, 'routes.json'),
        JSON.stringify(serverRoutes, null, 2)
      );

      await execAsync(`node dist/src/cli/validate-routes.js --project-dir ${testDir}`);

      // Verify JSON report
      const jsonPath = path.join(coderefDir, 'route-validation.json');
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      expect(jsonData).toHaveProperty('totalFrontendCalls');
      expect(jsonData).toHaveProperty('totalServerRoutes');
      expect(jsonData).toHaveProperty('matchedRoutes');
      expect(jsonData).toHaveProperty('issues');
      expect(jsonData).toHaveProperty('summary');

      // Verify markdown report
      const mdPath = path.join(coderefDir, 'route-validation-report.md');
      const mdContent = await fs.readFile(mdPath, 'utf-8');

      expect(mdContent).toContain('# Route Validation Report');
      expect(mdContent).toContain('## Summary');
      expect(mdContent).toContain('## Issues');
      expect(mdContent).toContain('## Recommendations');
    });
  });
});
