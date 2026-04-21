#!/usr/bin/env node
/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend Calls Scanner CLI
 * Scans project for frontend API calls and generates frontend-calls.json
 */

import { saveFrontendCalls } from '../fileGeneration/saveFrontendCalls.js';

interface CliArgs {
  projectDir: string;
  output?: string;
  extensions?: string[];
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectDir: process.cwd(),
    help: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--help':
      case '-h':
        args.help = true;
        break;

      case '--project-dir':
      case '-p':
        args.projectDir = argv[++i];
        break;

      case '--output':
      case '-o':
        args.output = argv[++i];
        break;

      case '--extensions':
      case '-e':
        args.extensions = argv[++i].split(',');
        break;

      default:
        if (!arg.startsWith('-')) {
          args.projectDir = arg;
        }
    }
  }

  return args;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
scan-frontend-calls - Scan project for frontend API calls

USAGE:
  scan-frontend-calls [OPTIONS] [PROJECT_DIR]

OPTIONS:
  -p, --project-dir <path>     Project directory to scan (default: current directory)
  -o, --output <path>          Output file path (default: .coderef/frontend-calls.json)
  -e, --extensions <exts>      Comma-separated file extensions (default: .js,.jsx,.ts,.tsx,.vue)
  -h, --help                   Show this help message

EXAMPLES:
  # Scan current directory
  scan-frontend-calls

  # Scan specific project
  scan-frontend-calls /path/to/project

  # Custom output path
  scan-frontend-calls --output ./output/calls.json

  # Scan only TypeScript files
  scan-frontend-calls --extensions .ts,.tsx

  # Full example with all options
  scan-frontend-calls --project-dir ./my-app \\
    --output ./reports/frontend-calls.json \\
    --extensions .ts,.tsx

OUTPUT:
  Generates frontend-calls.json with structure:
  {
    "totalCalls": 42,
    "byType": {
      "fetch": [...],
      "axios": [...],
      "reactQuery": [...],
      "custom": [...]
    },
    "calls": [...],
    "metadata": {
      "generatedAt": "2024-01-15T10:30:00.000Z",
      "projectPath": "/path/to/project",
      "scanVersion": "1.0.0"
    }
  }

INTEGRATION:
  Use the generated frontend-calls.json with validate-routes:

  scan-frontend-calls
  validate-routes --frontend-calls .coderef/frontend-calls.json \\
                  --server-routes .coderef/routes.json

FRAMEWORKS SUPPORTED:
  - fetch() API
  - axios (all methods)
  - React Query (useQuery, useMutation)
  - Custom API clients (api.*, apiClient.*, client.*, http.*)

For more information, see:
  https://github.com/your-repo/coderef-core/docs/ROUTE-VALIDATION.md
`);
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
      printHelp();
      process.exit(0);
    }

    console.log('🔍 Scanning for frontend API calls...\n');
    console.log(`Project: ${args.projectDir}`);
    if (args.output) {
      console.log(`Output: ${args.output}`);
    }
    if (args.extensions) {
      console.log(`Extensions: ${args.extensions.join(', ')}`);
    }
    console.log();

    // Generate frontend-calls.json
    const outputPath = await saveFrontendCalls(
      args.projectDir,
      args.output,
      args.extensions
    );

    // Read the generated file to get stats
    const fs = await import('fs/promises');
    const content = await fs.readFile(outputPath, 'utf-8');
    const data = JSON.parse(content);

    console.log('✅ Frontend calls scanned successfully!\n');
    console.log(`📊 Summary:`);
    console.log(`  Total calls found: ${data.totalCalls}`);
    console.log();
    console.log(`  By type:`);
    if (data.byType.fetch?.length) {
      console.log(`    - fetch():      ${data.byType.fetch.length}`);
    }
    if (data.byType.axios?.length) {
      console.log(`    - axios:        ${data.byType.axios.length}`);
    }
    if (data.byType.reactQuery?.length) {
      console.log(`    - React Query:  ${data.byType.reactQuery.length}`);
    }
    if (data.byType.custom?.length) {
      console.log(`    - Custom:       ${data.byType.custom.length}`);
    }
    console.log();
    console.log(`📁 Output saved to: ${outputPath}`);
    console.log();

    if (data.totalCalls > 0) {
      console.log('💡 Next steps:');
      console.log('  1. Review the generated frontend-calls.json');
      console.log('  2. Run route validation:');
      console.log(`     validate-routes --project-dir ${args.projectDir}`);
      console.log();
    } else {
      console.log('⚠️  No frontend API calls detected.');
      console.log('   This could mean:');
      console.log('   - No API calls in scanned files');
      console.log('   - API calls use unsupported patterns');
      console.log('   - Wrong file extensions specified');
      console.log();
    }

  } catch (error) {
    console.error('❌ Error scanning frontend calls:\n');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

// Run CLI
main();
