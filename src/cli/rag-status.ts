#!/usr/bin/env node
/**
 * RAG Status CLI Command
 * Check the status of the RAG index for a project
 *
 * Usage:
 *   rag-status --project-dir <path>
 *   rag-status --project-dir <path> --json
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface CliArgs {
  projectDir: string;
  json: boolean;
  help: boolean;
}

interface IndexMetadata {
  version: string;
  createdAt: string;
  projectDir: string;
  languages: string[];
  provider: string;
  store: string;
  stats: {
    tokensUsed: number;
    estimatedCost?: number;
    avgEmbeddingTimeMs: number;
    byType: Record<string, number>;
    byLanguage: Record<string, number>;
  };
  chunksIndexed: number;
  chunksSkipped: number;
  chunksFailed: number;
  filesProcessed: number;
  processingTimeMs: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectDir: process.cwd(),
    json: false,
    help: false,
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

      case '--json':
      case '-j':
        args.json = true;
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
rag-status - Check RAG index status

USAGE:
  rag-status [OPTIONS] [PROJECT_DIR]

OPTIONS:
  -p, --project-dir <path>     Project directory to check (default: current directory)
  -j, --json                   Output results as JSON
  -h, --help                   Show this help message

EXAMPLES:
  # Check current directory
  rag-status

  # Check specific project
  rag-status --project-dir ./my-project

  # JSON output for scripts
  rag-status --json

OUTPUT:
  Shows index metadata including:
    - Index version and creation date
    - Languages indexed
    - Chunks and files processed
    - Vector store statistics
    - Processing time and costs
`);
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration from milliseconds
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins === 0 ? 'just now' : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}w ago`;
  } else {
    return `${Math.floor(diffDays / 30)}mo ago`;
  }
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

    // Validate project directory
    try {
      await fs.access(args.projectDir);
    } catch {
      console.error(`Error: Project directory not found: ${args.projectDir}`);
      process.exit(2);
    }

    // Check for index
    const coderefDir = path.join(args.projectDir, '.coderef');
    const indexPath = path.join(coderefDir, 'rag-index.json');
    const vectorsPath = process.env.CODEREF_SQLITE_PATH
      || path.join(coderefDir, 'rag-vectors.sqlite');

    let metadata: IndexMetadata | null = null;
    let indexExists = false;
    let vectorsExist = false;
    let vectorStats: any = null;

    // Check index metadata file
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      metadata = JSON.parse(indexContent);
      indexExists = true;
    } catch {
      indexExists = false;
    }

    // Check vector store
    try {
      await fs.access(vectorsPath);
      vectorsExist = true;

      // Get vector store file stats
      const stats = await fs.stat(vectorsPath);
      vectorStats = {
        storageSize: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
      };
    } catch {
      vectorsExist = false;
    }

    // Build status response
    const status = {
      exists: indexExists || vectorsExist,
      indexExists,
      vectorsExist,
      indexPath,
      vectorsPath,
      metadata,
      vectorStats,
      health: indexExists && vectorsExist
        ? 'healthy'
        : indexExists || vectorsExist
          ? 'partial'
          : 'missing',
    };

    // Output results
    if (args.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log('📊 RAG Index Status\n');

      if (!status.exists) {
        console.log('❌ No index found\n');
        console.log('This project has not been indexed yet.\n');
        console.log('💡 Next steps:');
        console.log(`  Create index: rag-index --project-dir ${args.projectDir}`);
        console.log();
        process.exit(0);
      }

      // Health indicator
      const healthEmoji: Record<string, string> = {
        healthy: '✅',
        partial: '⚠️',
        missing: '❌',
      };
      console.log(`${healthEmoji[status.health]} Health: ${status.health.toUpperCase()}\n`);

      // Files status
      console.log('📁 Index Files:');
      console.log(`  Metadata: ${indexExists ? '✅' : '❌'} ${indexPath}`);
      console.log(`  Vectors:  ${vectorsExist ? '✅' : '❌'} ${vectorsPath}`);
      console.log();

      if (metadata) {
        // Index info
        console.log('📋 Index Info:');
        console.log(`  Version: ${metadata.version}`);
        console.log(`  Created: ${new Date(metadata.createdAt).toLocaleString()}`);
        console.log(`  Age: ${formatRelativeTime(metadata.createdAt)}`);
        console.log(`  Provider: ${metadata.provider}`);
        console.log(`  Store: ${metadata.store}`);
        console.log();

        // Languages
        if (metadata.languages?.length > 0) {
          console.log('🔤 Languages:');
          metadata.languages.forEach(lang => {
            const count = metadata?.stats?.byLanguage?.[lang] || 0;
            console.log(`  • ${lang}${count > 0 ? ` (${count} chunks)` : ''}`);
          });
          console.log();
        }

        // Statistics
        console.log('📊 Statistics:');
        console.log(`  Files processed: ${metadata.filesProcessed.toLocaleString()}`);
        console.log(`  Chunks indexed: ${metadata.chunksIndexed.toLocaleString()}`);
        if (metadata.chunksSkipped > 0) {
          console.log(`  Chunks skipped: ${metadata.chunksSkipped.toLocaleString()}`);
        }
        if (metadata.chunksFailed > 0) {
          console.log(`  Chunks failed: ${metadata.chunksFailed.toLocaleString()}`);
        }
        console.log(`  Processing time: ${formatDuration(metadata.processingTimeMs)}`);
        console.log();

        // Cost info
        if (metadata.stats) {
          console.log('💰 Resource Usage:');
          console.log(`  Tokens used: ${metadata.stats.tokensUsed.toLocaleString()}`);
          if (metadata.stats.estimatedCost !== undefined) {
            console.log(`  Est. cost: $${metadata.stats.estimatedCost.toFixed(4)}`);
          }
          console.log(`  Avg embedding time: ${metadata.stats.avgEmbeddingTimeMs.toFixed(2)}ms`);
          console.log();

          // Chunks by type
          const types = Object.entries(metadata.stats.byType || {});
          if (types.length > 0) {
            console.log('🏷️  Chunks by Type:');
            types
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .forEach(([type, count]) => {
                console.log(`  • ${type}: ${count}`);
              });
            console.log();
          }
        }
      }

      // Vector store stats
      if (vectorStats) {
        console.log('💾 Vector Store:');
        if (vectorStats.storageSize !== undefined) {
          console.log(`  Storage size: ${formatBytes(vectorStats.storageSize)}`);
        }
        if (vectorStats.createdAt) {
          console.log(`  Created: ${formatRelativeTime(vectorStats.createdAt)}`);
        }
        console.log();
      }

      // Recommendations
      if (status.health === 'partial') {
        console.log('⚠️  Warning: Index is incomplete');
        console.log('The index metadata or vector store is missing.');
        console.log('Recommendation: Run rag-index --reset to rebuild the index.\n');
      } else if (status.health === 'healthy' && metadata) {
        const ageMs = Date.now() - new Date(metadata.createdAt).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);

        if (ageDays > 7) {
          console.log('💡 Tip: Index is over a week old');
          console.log(`  Consider re-indexing: rag-index --project-dir ${args.projectDir}\n`);
        } else {
          console.log('💡 Next steps:');
          console.log(`  Search: rag-search --project-dir ${args.projectDir} "your query"`);
          console.log(`  Reset index: rag-index --project-dir ${args.projectDir} --reset\n`);
        }
      }
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Status check failed:\n');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

// Run CLI
main();
