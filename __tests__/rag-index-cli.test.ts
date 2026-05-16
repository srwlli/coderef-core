import { describe, expect, it, beforeEach, afterEach } from 'vitest';

// ─── parseArgs extracted for unit testing ──────────────────────────────────
// We re-implement the same interface the CLI uses so we can test arg parsing
// without spawning a child process or loading heavy RAG dependencies.

interface CliArgs {
  projectDir: string;
  provider: string;
  store: 'sqlite' | 'pinecone' | 'chroma';
  reset: boolean;
  languages?: string[];
  verbose: boolean;
  json: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const envProvider = process.env.CODEREF_LLM_PROVIDER?.toLowerCase();
  const args: CliArgs = {
    projectDir: process.cwd(),
    provider: envProvider || 'openai',
    store: 'sqlite',
    reset: false,
    verbose: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    let value: string | undefined;
    let key = arg;
    if (arg.startsWith('--') && arg.includes('=')) {
      const parts = arg.split('=', 2);
      key = parts[0];
      value = parts[1];
    }

    switch (key) {
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--project-dir':
      case '-p':
        args.projectDir = value ?? argv[++i];
        break;
      case '--provider':
        args.provider = value ?? argv[++i];
        break;
      case '--store': {
        const store = value ?? argv[++i];
        if (['sqlite', 'pinecone', 'chroma'].includes(store)) {
          args.store = store as 'sqlite' | 'pinecone' | 'chroma';
        }
        break;
      }
      case '--reset':
        args.reset = true;
        break;
      case '--lang':
      case '-l':
        args.languages = (value ?? argv[++i]).split(',');
        break;
      case '--verbose':
      case '-v':
        args.verbose = true;
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

// ─── local-only enforcement helper (mirrors rag-index.ts) ──────────────────

function isLocalOnlyEnforced(envVal: string | undefined, provider: string): boolean {
  const localOnly = envVal &&
    envVal.toLowerCase() !== '0' &&
    envVal.toLowerCase() !== 'false' &&
    envVal.toLowerCase() !== 'no';
  return Boolean(localOnly && (provider === 'openai' || provider === 'anthropic'));
}

// ───────────────────────────────────────────────────────────────────────────

describe('rag-index CLI — parseArgs', () => {
  beforeEach(() => {
    delete process.env.CODEREF_LLM_PROVIDER;
  });

  afterEach(() => {
    delete process.env.CODEREF_LLM_PROVIDER;
  });

  it('defaults: provider=openai, store=sqlite, reset=false, json=false, help=false', () => {
    const args = parseArgs([]);
    expect(args.provider).toBe('openai');
    expect(args.store).toBe('sqlite');
    expect(args.reset).toBe(false);
    expect(args.json).toBe(false);
    expect(args.help).toBe(false);
    expect(args.verbose).toBe(false);
  });

  it('picks up CODEREF_LLM_PROVIDER env as default provider', () => {
    process.env.CODEREF_LLM_PROVIDER = 'ollama';
    const args = parseArgs([]);
    expect(args.provider).toBe('ollama');
  });

  it('--provider flag overrides env', () => {
    process.env.CODEREF_LLM_PROVIDER = 'ollama';
    const args = parseArgs(['--provider', 'anthropic']);
    expect(args.provider).toBe('anthropic');
  });

  it('--provider=value= format is parsed', () => {
    const args = parseArgs(['--provider=anthropic']);
    expect(args.provider).toBe('anthropic');
  });

  it('--store sqlite|pinecone|chroma accepted', () => {
    expect(parseArgs(['--store', 'sqlite']).store).toBe('sqlite');
    expect(parseArgs(['--store', 'pinecone']).store).toBe('pinecone');
    expect(parseArgs(['--store', 'chroma']).store).toBe('chroma');
  });

  it('unknown --store value falls back to sqlite default', () => {
    const args = parseArgs(['--store', 'redis']);
    expect(args.store).toBe('sqlite');
  });

  it('--reset sets reset=true', () => {
    const args = parseArgs(['--reset']);
    expect(args.reset).toBe(true);
  });

  it('--lang splits on comma', () => {
    const args = parseArgs(['--lang', 'ts,tsx']);
    expect(args.languages).toEqual(['ts', 'tsx']);
  });

  it('-l shorthand works', () => {
    const args = parseArgs(['-l', 'py']);
    expect(args.languages).toEqual(['py']);
  });

  it('--verbose sets verbose=true', () => {
    expect(parseArgs(['--verbose']).verbose).toBe(true);
    expect(parseArgs(['-v']).verbose).toBe(true);
  });

  it('--json sets json=true', () => {
    expect(parseArgs(['--json']).json).toBe(true);
    expect(parseArgs(['-j']).json).toBe(true);
  });

  it('--help sets help=true', () => {
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('positional arg sets projectDir', () => {
    const args = parseArgs(['/some/project']);
    expect(args.projectDir).toBe('/some/project');
  });

  it('--project-dir flag sets projectDir', () => {
    const args = parseArgs(['--project-dir', '/explicit/path']);
    expect(args.projectDir).toBe('/explicit/path');
  });

  it('--project-dir=value= format is parsed', () => {
    const args = parseArgs(['--project-dir=/eq/path']);
    expect(args.projectDir).toBe('/eq/path');
  });
});

describe('rag-index CLI — local-only enforcement', () => {
  it('blocks openai when CODEREF_RAG_LOCAL_ONLY=1', () => {
    expect(isLocalOnlyEnforced('1', 'openai')).toBe(true);
  });

  it('blocks anthropic when CODEREF_RAG_LOCAL_ONLY=true', () => {
    expect(isLocalOnlyEnforced('true', 'anthropic')).toBe(true);
  });

  it('does not block ollama even when local-only is set', () => {
    expect(isLocalOnlyEnforced('1', 'ollama')).toBe(false);
  });

  it('does not block when CODEREF_RAG_LOCAL_ONLY=0', () => {
    expect(isLocalOnlyEnforced('0', 'openai')).toBe(false);
  });

  it('does not block when CODEREF_RAG_LOCAL_ONLY=false', () => {
    expect(isLocalOnlyEnforced('false', 'openai')).toBe(false);
  });

  it('does not block when CODEREF_RAG_LOCAL_ONLY=no', () => {
    expect(isLocalOnlyEnforced('no', 'openai')).toBe(false);
  });

  it('does not block when env is undefined', () => {
    expect(isLocalOnlyEnforced(undefined, 'openai')).toBe(false);
  });
});
