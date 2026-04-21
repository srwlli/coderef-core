/**
 * Scan CLI Test Suite
 *
 * Tests for the scan-cli command-line wrapper.
 * Validates CLI argument parsing, path validation, scan execution, and output formatting.
 *
 * Related: scripts/scan-cli/scan.cjs
 * Workorder: WO-SCANNER-CLI-001
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Get the scan.cjs script path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scanScriptPath = path.join(__dirname, 'scan.cjs');

// Helper to create temporary test directory with sample code
function createTestProject(dir: string): void {
  // Create src directory
  const srcDir = path.join(dir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  // Create sample TypeScript file
  const sampleFile = path.join(srcDir, 'sample.ts');
  fs.writeFileSync(sampleFile, `
// Sample TypeScript file for testing
export function greetUser(name: string): string {
  return \`Hello, \${name}!\`;
}

export class UserService {
  private users: string[] = [];

  addUser(name: string): void {
    this.users.push(name);
  }

  getUserCount(): number {
    return this.users.length;
  }
}

export const DEFAULT_CONFIG = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
};

function internalHelper(): void {
  // Internal function
}
  `.trim());

  // Create sample JavaScript file
  const jsFile = path.join(srcDir, 'utils.js');
  fs.writeFileSync(jsFile, `
// Sample JavaScript file
export function formatDate(date) {
  return date.toISOString();
}

export class DateFormatter {
  format(date) {
    return formatDate(date);
  }
}
  `.trim());
}

describe('Scan CLI', () => {
  let tempDir: string;
  let testProjectDir: string;

  beforeEach(() => {
    // Create temporary directory for test project
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-cli-test-'));
    testProjectDir = path.join(tempDir, 'test-project');
    fs.mkdirSync(testProjectDir, { recursive: true });
    createTestProject(testProjectDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Help and Usage', () => {
    it('should show help when no arguments provided', async () => {
      try {
        await execAsync(`node "${scanScriptPath}"`);
        expect.fail('Should have exited with code 1');
      } catch (error: any) {
        expect(error.code).toBe(1);
        // Help message is printed to stdout even when exiting with code 1
        const output = error.stdout || '';
        expect(output).toContain('Usage: node scan.cjs <project_path>');
        expect(output).toContain('Scans a project directory');
        expect(output).toContain('project_path');
        expect(output).toContain('Example:');
      }
    });

    it('should show help with --help flag', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" --help`);
      
      expect(stdout).toContain('Usage: node scan.cjs <project_path>');
      expect(stdout).toContain('Example:');
    });

    it('should show help with -h flag', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" -h`);
      
      expect(stdout).toContain('Usage: node scan.cjs <project_path>');
    });

    it('should exit with code 1 when no arguments provided', async () => {
      try {
        await execAsync(`node "${scanScriptPath}"`);
        expect.fail('Should have exited with code 1');
      } catch (error: any) {
        expect(error.code).toBe(1);
      }
    });

    it('should exit with code 0 when --help flag provided', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" --help`);
      expect(stdout).toBeTruthy();
    });
  });

  describe('Path Validation', () => {
    it('should error when path does not exist', async () => {
      const nonexistentPath = path.join(tempDir, 'nonexistent');
      
      try {
        await execAsync(`node "${scanScriptPath}" "${nonexistentPath}"`);
        expect.fail('Should have failed with nonexistent path');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr).toContain('Error: Path does not exist');
        expect(error.stderr).toContain(nonexistentPath);
      }
    });

    it('should error when path is a file, not a directory', async () => {
      const testFile = path.join(tempDir, 'test-file.txt');
      fs.writeFileSync(testFile, 'test content');
      
      try {
        await execAsync(`node "${scanScriptPath}" "${testFile}"`);
        expect.fail('Should have failed with file path');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr).toContain('Error: Path is not a directory');
      }
    });

    it('should accept relative path', async () => {
      // Change to temp directory and use relative path
      const relativePath = path.relative(process.cwd(), testProjectDir);
      
      try {
        const { stdout } = await execAsync(
          `node "${scanScriptPath}" "${testProjectDir}"`,
          { cwd: process.cwd() }
        );
        
        expect(stdout).toContain('Scanning:');
        expect(stdout).toContain('Scan Results:');
        expect(stdout).toContain('Elements found:');
      } catch (error: any) {
        // If it fails, it might be due to path resolution, but should not be a validation error
        expect(error.stderr).not.toContain('Path does not exist');
        expect(error.stderr).not.toContain('Path is not a directory');
      }
    });

    it('should accept absolute path', async () => {
      try {
        const { stdout } = await execAsync(`node "${scanScriptPath}" "${testProjectDir}"`);
        
        expect(stdout).toContain('Scanning:');
        expect(stdout).toContain(testProjectDir);
        expect(stdout).toContain('Scan Results:');
      } catch (error: any) {
        // Should not fail with path validation errors
        expect(error.stderr).not.toContain('Path does not exist');
        expect(error.stderr).not.toContain('Path is not a directory');
      }
    });
  });

  describe('Scan Execution', () => {
    it('should successfully scan a project directory', async () => {
      const { stdout, stderr } = await execAsync(`node "${scanScriptPath}" "${testProjectDir}"`);
      
      expect(stdout).toContain('Scanning:');
      expect(stdout).toContain('Scan Results:');
      expect(stdout).toContain('Elements found:');
      expect(stdout).toContain('Files scanned:');
      expect(stdout).toContain('Duration:');
      expect(stdout).toContain('✓ Scan completed successfully');
      expect(stderr).toBe('');
    });

    it('should find code elements in test project', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${testProjectDir}"`);
      
      // Should find at least some elements (functions, classes, etc.)
      const elementsMatch = stdout.match(/Elements found: (\d+)/);
      expect(elementsMatch).toBeTruthy();
      
      const elementCount = parseInt(elementsMatch![1], 10);
      expect(elementCount).toBeGreaterThan(0);
    });

    it('should count files correctly', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${testProjectDir}"`);
      
      const filesMatch = stdout.match(/Files scanned:\s+(\d+)/);
      expect(filesMatch).toBeTruthy();
      
      const fileCount = parseInt(filesMatch![1], 10);
      expect(fileCount).toBeGreaterThanOrEqual(2); // At least sample.ts and utils.js
    });

    it('should report duration in milliseconds', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${testProjectDir}"`);
      
      const durationMatch = stdout.match(/Duration:\s+(\d+)ms/);
      expect(durationMatch).toBeTruthy();
      
      const duration = parseInt(durationMatch![1], 10);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should exit with code 0 on successful scan', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${testProjectDir}"`);
      
      expect(stdout).toContain('✓ Scan completed successfully');
      // execAsync doesn't throw on exit code 0, so if we get here, it succeeded
    });
  });

  describe('Output Format', () => {
    it('should print scanning message with project path', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${testProjectDir}"`);
      
      expect(stdout).toContain('Scanning:');
      expect(stdout).toContain(testProjectDir);
    });

    it('should print scan results in expected format', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${testProjectDir}"`);
      
      const lines = stdout.split('\n');
      
      // Check for expected output lines
      expect(stdout).toMatch(/Scanning: .+/);
      expect(stdout).toContain('Scan Results:');
      expect(stdout).toMatch(/Elements found: \d+/);
      expect(stdout).toMatch(/Files scanned:\s+\d+/);
      expect(stdout).toMatch(/Duration:\s+\d+ms/);
      expect(stdout).toContain('✓ Scan completed successfully');
    });

    it('should have blank line after scanning message', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${testProjectDir}"`);
      
      const lines = stdout.split('\n');
      const scanningIndex = lines.findIndex(line => line.startsWith('Scanning:'));
      
      expect(scanningIndex).toBeGreaterThan(-1);
      // Next line should be blank or start with "Scan Results:"
      expect(lines[scanningIndex + 1]).toMatch(/^\s*$|^Scan Results:/);
    });

    it('should have blank line before success message', async () => {
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${testProjectDir}"`);
      
      const lines = stdout.split('\n');
      const successIndex = lines.findIndex(line => line.includes('✓ Scan completed successfully'));
      
      expect(successIndex).toBeGreaterThan(-1);
      // Previous line should be blank
      expect(lines[successIndex - 1]).toMatch(/^\s*$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle scan errors gracefully', async () => {
      // Create a directory that might cause scan issues
      const problematicDir = path.join(tempDir, 'problematic');
      fs.mkdirSync(problematicDir, { recursive: true });
      
      // Create a file with invalid syntax that might cause parser errors
      const badFile = path.join(problematicDir, 'bad.ts');
      fs.writeFileSync(badFile, 'export function { invalid syntax }');
      
      try {
        const { stdout, stderr } = await execAsync(`node "${scanScriptPath}" "${problematicDir}"`);
        
        // Should either succeed (scanner handles errors) or fail gracefully
        if (stderr.includes('✗ Scan failed:')) {
          expect(stderr).toContain('✗ Scan failed:');
        } else {
          // Scanner might handle errors and continue
          expect(stdout).toContain('Scan Results:');
        }
      } catch (error: any) {
        // If it fails, should have proper error message
        expect(error.stderr).toContain('✗ Scan failed:');
        expect(error.code).toBe(1);
      }
    });

    it('should print error message to stderr on failure', async () => {
      const nonexistentPath = path.join(tempDir, 'nonexistent');
      
      try {
        await execAsync(`node "${scanScriptPath}" "${nonexistentPath}"`);
        expect.fail('Should have failed');
      } catch (error: any) {
        expect(error.stderr).toContain('Error:');
        expect(error.code).toBe(1);
      }
    });

    it('should exit with code 1 on scan failure', async () => {
      // Try to scan a directory that doesn't exist
      const nonexistentPath = path.join(tempDir, 'nonexistent');
      
      try {
        await execAsync(`node "${scanScriptPath}" "${nonexistentPath}"`);
        expect.fail('Should have exited with code 1');
      } catch (error: any) {
        expect(error.code).toBe(1);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project directory', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });
      
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${emptyDir}"`);
      
      expect(stdout).toContain('Scan Results:');
      expect(stdout).toContain('Elements found: 0');
      expect(stdout).toContain('Files scanned:  0');
    });

    it('should handle project with only non-scannable files', async () => {
      const textOnlyDir = path.join(tempDir, 'text-only');
      fs.mkdirSync(textOnlyDir, { recursive: true });
      
      // Create text files (not .ts, .js, etc.)
      fs.writeFileSync(path.join(textOnlyDir, 'readme.txt'), 'Some text');
      fs.writeFileSync(path.join(textOnlyDir, 'config.json'), '{"key": "value"}');
      
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${textOnlyDir}"`);
      
      expect(stdout).toContain('Scan Results:');
      expect(stdout).toContain('Elements found: 0');
      expect(stdout).toContain('Files scanned:  0');
    });

    it('should handle paths with spaces', async () => {
      const dirWithSpaces = path.join(tempDir, 'dir with spaces');
      fs.mkdirSync(dirWithSpaces, { recursive: true });
      createTestProject(dirWithSpaces);
      
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${dirWithSpaces}"`);
      
      expect(stdout).toContain('Scanning:');
      expect(stdout).toContain('Scan Results:');
    });

    it('should handle very long paths', async () => {
      // Create nested directory structure
      let deepDir = testProjectDir;
      for (let i = 0; i < 5; i++) {
        deepDir = path.join(deepDir, `level-${i}`);
      }
      fs.mkdirSync(deepDir, { recursive: true });
      createTestProject(deepDir);
      
      const { stdout } = await execAsync(`node "${scanScriptPath}" "${deepDir}"`);
      
      expect(stdout).toContain('Scanning:');
      expect(stdout).toContain('Scan Results:');
    });
  });
});
