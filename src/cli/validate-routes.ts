#!/usr/bin/env node
/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Route Validation CLI
 * Command-line interface for validating frontend API calls against server routes
 *
 * Usage:
 *   validate-routes --project-dir <path>
 *   validate-routes --frontend-calls <path> --server-routes <path>
 *   validate-routes --project-dir <path> --fail-on-critical
 *   validate-routes --project-dir <path> --output report.md
 *
 * @example
 * ```bash
 * # Validate using .coderef files
 * validate-routes --project-dir ./my-project
 *
 * # Validate using specific files
 * validate-routes --frontend-calls frontend-calls.json --server-routes routes.json
 *
 * # Fail CI/CD on critical issues
 * validate-routes --project-dir ./my-project --fail-on-critical
 *
 * # Save report to custom location
 * validate-routes --project-dir ./my-project --output ./reports/validation.md
 * ```
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { generateValidationReport, saveValidationReport } from '../validator/route-validator.js';
import { generateMarkdownReport, saveMarkdownReport } from '../validator/report-generator.js';

/**
 * CLI Arguments interface
 */
interface CliArgs {
  projectDir?: string;
  frontendCalls?: string;
  serverRoutes?: string;
  failOnCritical?: boolean;
  output?: string;
  help?: boolean;
}

/**
 * Parse command-line arguments
 */
function parseArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--project-dir':
      case '-p':
        parsed.projectDir = args[++i];
        break;

      case '--frontend-calls':
      case '-f':
        parsed.frontendCalls = args[++i];
        break;

      case '--server-routes':
      case '-s':
        parsed.serverRoutes = args[++i];
        break;

      case '--fail-on-critical':
      case '-c':
        parsed.failOnCritical = true;
        break;

      case '--output':
      case '-o':
        parsed.output = args[++i];
        break;

      case '--help':
      case '-h':
        parsed.help = true;
        break;

      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return parsed;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Route Validation CLI - WO-ROUTE-VALIDATION-ENHANCEMENT-001

Validates frontend API calls against server routes to detect:
- Missing routes (404 errors)
- Unused routes (dead code)
- HTTP method mismatches (405 errors)

USAGE:
  validate-routes --project-dir <path>
  validate-routes --frontend-calls <path> --server-routes <path>
  validate-routes [options]

OPTIONS:
  -p, --project-dir <path>      Project root directory (looks for .coderef/)
  -f, --frontend-calls <path>   Path to frontend-calls.json file
  -s, --server-routes <path>    Path to routes.json file
  -c, --fail-on-critical        Exit with code 1 if critical issues found
  -o, --output <path>           Output path for markdown report
  -h, --help                    Show this help message

EXAMPLES:
  # Validate using .coderef directory
  validate-routes --project-dir ./my-project

  # Validate using specific files
  validate-routes -f ./.coderef/frontend-calls.json -s ./.coderef/routes.json

  # Fail CI/CD pipeline on critical issues
  validate-routes -p ./my-project --fail-on-critical

  # Save report to custom location
  validate-routes -p ./my-project -o ./reports/validation-report.md

EXIT CODES:
  0 - Success (no critical issues or --fail-on-critical not set)
  1 - Critical issues found (only when --fail-on-critical is set)
  2 - Invalid arguments or file not found

For more information: https://github.com/your-repo/coderef-core
`);
}

/**
 * Resolve file paths based on CLI arguments
 */
async function resolveFilePaths(args: CliArgs): Promise<{ frontendCalls: string; serverRoutes: string }> {
  let frontendCallsPath: string;
  let serverRoutesPath: string;

  if (args.projectDir) {
    // Use .coderef directory
    const coderefDir = path.join(args.projectDir, '.coderef');

    // Check if .coderef directory exists
    try {
      await fs.access(coderefDir);
    } catch (error) {
      console.error(`Error: .coderef directory not found at ${coderefDir}`);
      console.error('Run "coderef scan" first to generate route metadata.');
      process.exit(2);
    }

    frontendCallsPath = path.join(coderefDir, 'frontend-calls.json');
    serverRoutesPath = path.join(coderefDir, 'routes.json');
  } else if (args.frontendCalls && args.serverRoutes) {
    // Use explicit paths
    frontendCallsPath = args.frontendCalls;
    serverRoutesPath = args.serverRoutes;
  } else {
    console.error('Error: Must specify either --project-dir or both --frontend-calls and --server-routes');
    console.error('Run "validate-routes --help" for usage information.');
    process.exit(2);
  }

  // Verify files exist
  try {
    await fs.access(frontendCallsPath);
  } catch (error) {
    console.error(`Error: Frontend calls file not found: ${frontendCallsPath}`);
    process.exit(2);
  }

  try {
    await fs.access(serverRoutesPath);
  } catch (error) {
    console.error(`Error: Server routes file not found: ${serverRoutesPath}`);
    process.exit(2);
  }

  return { frontendCalls: frontendCallsPath, serverRoutes: serverRoutesPath };
}

/**
 * Print validation summary to console
 */
function printSummary(report: any): void {
  console.log('\n' + '='.repeat(60));
  console.log('ROUTE VALIDATION SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n📊 Statistics:`);
  console.log(`  Frontend API Calls: ${report.totalFrontendCalls}`);
  console.log(`  Server Routes:      ${report.totalServerRoutes}`);
  console.log(`  Matched Routes:     ${report.matchedRoutes}`);

  const matchRate = report.totalFrontendCalls > 0
    ? Math.round((report.matchedRoutes / report.totalFrontendCalls) * 100)
    : 0;
  console.log(`  Match Rate:         ${matchRate}%`);

  console.log(`\n🔍 Issues Found:`);
  console.log(`  🔴 Critical: ${report.summary.critical}`);
  console.log(`  🟡 Warnings: ${report.summary.warnings}`);
  console.log(`  🔵 Info:     ${report.summary.info}`);
  console.log(`  Total:       ${report.issues.length}`);

  if (report.summary.critical > 0) {
    console.log(`\n⚠️  Critical issues detected! These will cause runtime errors:`);

    const criticalIssues = report.issues.filter((i: any) => i.severity === 'critical');
    criticalIssues.slice(0, 5).forEach((issue: any, index: number) => {
      console.log(`  ${index + 1}. ${issue.message}`);
      if (issue.frontendCall) {
        console.log(`     Location: ${issue.frontendCall.file}:${issue.frontendCall.line}`);
      }
    });

    if (criticalIssues.length > 5) {
      console.log(`  ... and ${criticalIssues.length - 5} more`);
    }
  } else if (report.summary.warnings > 0) {
    console.log(`\n⚠️  Warnings detected (unused routes or minor issues)`);
  } else {
    console.log(`\n✅ No issues found! All routes are properly aligned.`);
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Show help if requested or no args provided
  if (args.help || process.argv.length === 2) {
    printHelp();
    process.exit(0);
  }

  try {
    console.log('🔍 Starting route validation...\n');

    // Resolve file paths
    const { frontendCalls, serverRoutes } = await resolveFilePaths(args);

    console.log(`📂 Frontend calls: ${frontendCalls}`);
    console.log(`📂 Server routes:  ${serverRoutes}`);

    // Generate validation report
    console.log('\n⚙️  Analyzing routes...');
    const report = await generateValidationReport(frontendCalls, serverRoutes);

    // Print summary to console
    printSummary(report);

    // Save JSON report
    const outputDir = args.projectDir
      ? path.join(args.projectDir, '.coderef')
      : path.dirname(frontendCalls);

    const jsonPath = path.join(outputDir, 'route-validation.json');
    await saveValidationReport(report, jsonPath);
    console.log(`💾 JSON report saved: ${jsonPath}`);

    // Generate and save markdown report
    const markdown = generateMarkdownReport(report);
    const markdownPath = args.output || path.join(outputDir, 'route-validation-report.md');
    await saveMarkdownReport(report, markdownPath);
    console.log(`📄 Markdown report saved: ${markdownPath}`);

    // Exit with appropriate code
    if (args.failOnCritical && report.summary.critical > 0) {
      console.log('\n❌ Validation failed: Critical issues found');
      console.log('Fix the critical issues listed above and run validation again.');
      process.exit(1);
    } else {
      console.log('\n✅ Validation complete');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Validation failed with error:');
    console.error(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(2);
  }
}

// Run CLI
main();
