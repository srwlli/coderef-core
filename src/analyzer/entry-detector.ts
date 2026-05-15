/**
 * @coderef-semantic: 1.0.0
 * @exports EntryPointType, EntryPoint, EntryPointDetector
 * @used_by src/analyzer/project-classifier.ts, src/pipeline/generators/context-generator.ts
 */

/**
 * EntryPointDetector - Detect application entry points and bootstrap files
 *
 * IMP-CORE-018: Add entry point and bootstrap detection
 *
 * Identifies:
 * - Library entry points (main.ts, index.ts, index.js)
 * - CLI entry files (bin/ commands, cli.ts)
 * - Server bootstrap (listen, start, serve calls)
 * - Scheduled job entry points
 * - Serverless function handlers (AWS Lambda, etc.)
 */

import * as path from 'path';
import type { ElementData } from '../types/types.js';

/**
 * Types of entry points
 */
export type EntryPointType =
  | 'library'      // npm package main entry (index.ts, main.ts)
  | 'cli'          // Command-line interface entry
  | 'server'       // HTTP server bootstrap
  | 'job'          // Scheduled job/cron entry
  | 'serverless'   // Lambda/function handler
  | 'script'       // Standalone script
  | 'test'         // Test entry point
  | 'config';      // Configuration initialization

/**
 * Detected entry point information
 */
export interface EntryPoint {
  /** Entry point name (function, class, or file name) */
  name: string;
  /** File path */
  file: string;
  /** Type of entry point */
  type: EntryPointType;
  /** Description of what this entry point does */
  description: string;
  /** Whether the entry point is exported */
  exported: boolean;
  /** For servers: port detected */
  port?: number;
  /** For CLI: command name detected */
  command?: string;
  /** For jobs: schedule pattern if detected */
  schedule?: string;
  /** Whether this is the primary entry point */
  isPrimary: boolean;
}

/**
 * EntryPointDetector - Analyze elements and files to find entry points
 */
export class EntryPointDetector {
  private entryPoints: EntryPoint[] = [];

  /**
   * Detect all entry points from extracted elements and file structure
   */
  detect(projectPath: string, files: Map<string, string[]>, elements: ElementData[]): EntryPoint[] {
    this.entryPoints = [];

    // Collect all file paths
    const allFilePaths: string[] = [];
    for (const filePaths of files.values()) {
      allFilePaths.push(...filePaths);
    }

    // Detect by file patterns
    this.detectByFilePattern(allFilePaths);

    // Detect by code patterns (elements)
    this.detectByCodePattern(elements);

    // Detect package.json main entry
    this.detectPackageJsonEntry(projectPath, allFilePaths);

    // Mark primary entry point
    this.markPrimaryEntryPoint();

    // Sort: primary first, then by type priority
    return this.sortEntryPoints();
  }

  /**
   * Detect entry points based on file naming patterns
   */
  private detectByFilePattern(filePaths: string[]): void {
    const libraryPatterns = [
      /\bindex\.(ts|tsx|js|jsx|mjs|cjs)$/,
      /\bmain\.(ts|tsx|js|jsx|mjs|cjs)$/,
      /\blib\.(ts|tsx|js|jsx)$/,
      /\bindex\.d\.ts$/, // Type definitions
    ];

    const cliPatterns = [
      /\bcli\.(ts|tsx|js|jsx|mjs|cjs)$/,
      /\bbin\//,           // bin/ directory
      /\bcmd\//,           // cmd/ directory
      /\bcommands\//,      // commands/ directory
      /\bcommand\.(ts|tsx|js|jsx)$/,
    ];

    const serverPatterns = [
      /\bserver\.(ts|tsx|js|jsx)$/,
      /\bapp\.(ts|tsx|js|jsx)$/,  // app.ts often has listen()
      /\bserve\.(ts|tsx|js|jsx)$/,
      /\bstart\.(ts|tsx|js|jsx)$/,
      /\blisten\.(ts|tsx|js|jsx)$/,
      /\bapi\.(ts|tsx|js|jsx)$/,
    ];

    const jobPatterns = [
      /\b(job|cron|schedule|worker|task)\.(ts|tsx|js|jsx)$/,
      /\bjobs\//,
      /\bcron\//,
      /\bworkers\//,
      /\bscheduled\//,
    ];

    const serverlessPatterns = [
      /\bhandler\.(ts|tsx|js|jsx)$/,
      /\blambda\.(ts|tsx|js|jsx)$/,
      /\bfunction\.(ts|tsx|js|jsx)$/,
      /\blambdas\//,
      /\bfunctions\//,
      /\bhandlers\//,
      /\bsrc\/(handlers|functions)\//,
    ];

    const scriptPatterns = [
      /\bscript\.(ts|tsx|js|jsx)$/,
      /\bscripts\//,
      /\btool\.(ts|tsx|js|jsx)$/,
      /\btools\//,
    ];

    for (const filePath of filePaths) {
      const basename = path.basename(filePath);
      const relativePath = filePath;

      // Check each pattern category
      if (libraryPatterns.some(p => p.test(basename))) {
        this.addEntryPoint(basename, filePath, 'library', 'Library entry point');
      } else if (cliPatterns.some(p => p.test(relativePath) || p.test(basename))) {
        this.addEntryPoint(basename, filePath, 'cli', 'CLI command entry');
      } else if (serverPatterns.some(p => p.test(basename))) {
        this.addEntryPoint(basename, filePath, 'server', 'Server bootstrap entry');
      } else if (jobPatterns.some(p => p.test(relativePath) || p.test(basename))) {
        this.addEntryPoint(basename, filePath, 'job', 'Scheduled job entry');
      } else if (serverlessPatterns.some(p => p.test(relativePath) || p.test(basename))) {
        this.addEntryPoint(basename, filePath, 'serverless', 'Serverless function handler');
      } else if (scriptPatterns.some(p => p.test(relativePath) || p.test(basename))) {
        this.addEntryPoint(basename, filePath, 'script', 'Standalone script');
      }
    }
  }

  /**
   * Detect entry points by analyzing code patterns in elements
   */
  private detectByCodePattern(elements: ElementData[]): void {
    for (const element of elements) {
      if (!element.file) continue;

      // Server bootstrap detection
      if (this.isServerBootstrap(element)) {
        this.addEntryPoint(
          element.name,
          element.file,
          'server',
          `HTTP server bootstrap (${element.name})`,
          !!element.exported
        );
      }

      // CLI command detection
      if (this.isCliCommand(element)) {
        this.addEntryPoint(
          element.name,
          element.file,
          'cli',
          `CLI command handler (${element.name})`,
          !!element.exported
        );
      }

      // Job handler detection
      if (this.isJobHandler(element)) {
        this.addEntryPoint(
          element.name,
          element.file,
          'job',
          `Job/task handler (${element.name})`,
          !!element.exported
        );
      }

      // Serverless handler detection
      if (this.isServerlessHandler(element)) {
        this.addEntryPoint(
          element.name,
          element.file,
          'serverless',
          `Serverless function handler (${element.name})`,
          !!element.exported
        );
      }
    }
  }

  /**
   * Check if element is a server bootstrap function
   */
  private isServerBootstrap(element: ElementData): boolean {
    const serverPatterns = [
      /listen\s*\(/,
      /createServer/,
      /\.listen\s*\(/,
      /app\.listen/,
      /server\.listen/,
      /fastify\s*\{/,
      /express\s*\(\)/,
      /koa\s*\(\)/,
      /hono\s*\(\)/,
      /nestFactory\.create/,
    ];

    // Check by name patterns
    const serverNames = ['listen', 'startServer', 'serve', 'bootstrap', 'initServer', 'createApp'];
    return serverNames.includes(element.name);
  }

  /**
   * Check if element is a CLI command handler
   */
  private isCliCommand(element: ElementData): boolean {
    const cliPatterns = [
      /commander/,
      /yargs/,
      /\.command\s*\(/,
      /\.parse\s*\(/,
      /process\.argv/,
      /createCommand\s*\(/,
      /program\s*\.command/,
    ];

    const cliNames = ['cli', 'command', 'run', 'main', 'parse', 'execute'];
    return cliNames.includes(element.name);
  }

  /**
   * Check if element is a job/task handler
   */
  private isJobHandler(element: ElementData): boolean {
    const jobPatterns = [
      /cron/,
      /schedule/,
      /setInterval/,
      /setTimeout/,
      /bull/,
      /agenda/,
      /node-cron/,
      /\.schedule\s*\(/,
    ];

    const jobNames = ['job', 'task', 'cron', 'schedule', 'worker', 'processJob', 'runTask'];
    return jobNames.some(n => element.name.toLowerCase().includes(n));
  }

  /**
   * Check if element is a serverless function handler
   */
  private isServerlessHandler(element: ElementData): boolean {
    const serverlessPatterns = [
      /handler\s*\(/,
      /exports\.handler/,
      /module\.exports\.handler/,
      /lambdaHandler/,
      /apiGateway/,
      /APIGatewayEvent/,
      /LambdaEvent/,
      /context\.awsRequestId/,
    ];

    const handlerNames = ['handler', 'lambdaHandler', 'apiHandler', 'func', 'trigger'];
    return handlerNames.some(n => element.name.toLowerCase().includes(n.toLowerCase()));
  }

  /**
   * Detect package.json main entry point
   */
  private detectPackageJsonEntry(projectPath: string, filePaths: string[]): void {
    // Look for package.json main entry patterns
    const mainPatterns = [
      /\bindex\.(ts|js|mjs|cjs)$/,
      /\bmain\.(ts|js|mjs|cjs)$/,
    ];

    // Root-level index/main files are likely package entry points
    for (const filePath of filePaths) {
      const relativePath = path.relative(projectPath, filePath);
      const isRootLevel = !relativePath.includes(path.sep) || relativePath.startsWith('src' + path.sep);

      if (isRootLevel && mainPatterns.some(p => p.test(filePath))) {
        // Check if already added
        const alreadyExists = this.entryPoints.some(ep => ep.file === filePath);
        if (!alreadyExists) {
          this.addEntryPoint(
            path.basename(filePath),
            filePath,
            'library',
            'Package main entry point',
            true
          );
        }
      }
    }
  }

  /**
   * Mark the primary entry point
   */
  private markPrimaryEntryPoint(): void {
    if (this.entryPoints.length === 0) return;

    // Priority order for primary entry point
    const typePriority: EntryPointType[] = [
      'library',    // npm package main entry is usually primary
      'cli',        // CLI tool entry
      'server',     // Server app entry
      'serverless', // Function handler
      'job',        // Background job
      'script',     // Utility script
      'test',       // Test entry
      'config',     // Config init
    ];

    // Find the highest priority entry point
    for (const type of typePriority) {
      const matching = this.entryPoints.filter(ep => ep.type === type);
      if (matching.length > 0) {
        // Prefer root-level files
        const rootLevel = matching.find(ep => {
          const relative = ep.file.replace(/\/src\//, '/');
          return !relative.includes('/') || relative.startsWith('src/');
        });

        if (rootLevel) {
          rootLevel.isPrimary = true;
        } else {
          matching[0].isPrimary = true;
        }
        break;
      }
    }
  }

  /**
   * Add an entry point (avoiding duplicates)
   */
  private addEntryPoint(
    name: string,
    file: string,
    type: EntryPointType,
    description: string,
    exported: boolean = false
  ): void {
    // Avoid duplicates
    const exists = this.entryPoints.some(ep => ep.file === file && ep.name === name);
    if (exists) return;

    this.entryPoints.push({
      name,
      file,
      type,
      description,
      exported,
      isPrimary: false,
    });
  }

  /**
   * Sort entry points: primary first, then by type priority
   */
  private sortEntryPoints(): EntryPoint[] {
    const typePriority: Record<EntryPointType, number> = {
      library: 1,
      cli: 2,
      server: 3,
      serverless: 4,
      job: 5,
      script: 6,
      test: 7,
      config: 8,
    };

    return this.entryPoints.sort((a, b) => {
      // Primary first
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
      }
      // Then by type priority
      return typePriority[a.type] - typePriority[b.type];
    });
  }
}

export default EntryPointDetector;
