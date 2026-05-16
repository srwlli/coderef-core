import { describe, expect, it } from 'vitest';

// ─── Utility functions extracted for unit testing ──────────────────────────
// Mirrors rag-status.ts implementations exactly.

interface CliArgs {
  projectDir: string;
  json: boolean;
  help: boolean;
}

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

// ───────────────────────────────────────────────────────────────────────────

describe('rag-status CLI — parseArgs', () => {
  it('defaults: json=false, help=false, projectDir=cwd', () => {
    const args = parseArgs([]);
    expect(args.json).toBe(false);
    expect(args.help).toBe(false);
    expect(args.projectDir).toBe(process.cwd());
  });

  it('--json sets json=true', () => {
    expect(parseArgs(['--json']).json).toBe(true);
    expect(parseArgs(['-j']).json).toBe(true);
  });

  it('--help sets help=true', () => {
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('--project-dir flag sets projectDir', () => {
    const args = parseArgs(['--project-dir', '/my/project']);
    expect(args.projectDir).toBe('/my/project');
  });

  it('-p shorthand sets projectDir', () => {
    const args = parseArgs(['-p', '/short/path']);
    expect(args.projectDir).toBe('/short/path');
  });

  it('positional arg sets projectDir', () => {
    const args = parseArgs(['/positional/path']);
    expect(args.projectDir).toBe('/positional/path');
  });

  it('flags and positional together: last positional wins projectDir', () => {
    const args = parseArgs(['--json', '/some/dir']);
    expect(args.json).toBe(true);
    expect(args.projectDir).toBe('/some/dir');
  });
});

describe('rag-status CLI — formatBytes', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes < 1024 as B', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats 1024 bytes as 1 KB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats 1.5 MB correctly', () => {
    expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
  });

  it('formats 1 GB correctly', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('formats fractional KB with 2 decimal places', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});

describe('rag-status CLI — formatDuration', () => {
  it('returns ms for durations under 1 second', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('returns seconds for durations 1000ms to 59999ms', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(2500)).toBe('2.5s');
    expect(formatDuration(59999)).toBe('60.0s');
  });

  it('returns minutes + seconds for durations >= 60000ms', () => {
    expect(formatDuration(60000)).toBe('1m 0.0s');
    expect(formatDuration(90000)).toBe('1m 30.0s');
    expect(formatDuration(3600000)).toBe('60m 0.0s');
  });
});
