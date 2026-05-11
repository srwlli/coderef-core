#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { runSemanticIntegration, validateIdempotency } from './semantic-integration.js';

function printHelp(): void {
  console.log(`
coderef-semantic-integration — run semantic header generation and registry sync

Usage:
  coderef-semantic-integration --project=<path> [options]

Options:
  --project=<path>       Path to the project root (required)
  --output=<path>        Output directory for generated headers (default: <project>/.coderef)
  --registry=<path>      Path to registry file (default: <project>/.coderef/registry/entities.json)
  --dry-run              Preview changes without writing files
  --no-headers           Skip header generation
  --no-enrich            Skip LLM enrichment
  --no-sync-registry     Skip registry sync
  --file=<path>          Process a single file instead of the whole project
  --validate-idempotency Run twice and verify identical results
  --help                 Print this help

Examples:
  coderef-semantic-integration --project=.
  coderef-semantic-integration --project=. --dry-run
  coderef-semantic-integration --project=. --file=src/scanner.ts
  coderef-semantic-integration --project=. --validate-idempotency
`);
}

const { values } = parseArgs({
  options: {
    project:               { type: 'string' },
    output:                { type: 'string' },
    registry:              { type: 'string' },
    'dry-run':             { type: 'boolean' },
    'no-headers':          { type: 'boolean' },
    'no-enrich':           { type: 'boolean' },
    'no-sync-registry':    { type: 'boolean' },
    file:                  { type: 'string' },
    'validate-idempotency': { type: 'boolean' },
    help:                  { type: 'boolean' },
  },
  strict: false,
});

if (values.help) { printHelp(); process.exit(0); }

const project = values.project as string | undefined;
if (!project) { console.error('Error: --project is required'); printHelp(); process.exit(1); }

const outputDir    = (values.output   as string | undefined) ?? `${project}/.coderef`;
const registryPath = (values.registry as string | undefined) ?? `${project}/.coderef/registry/entities.json`;

const options = {
  projectDir:      project as string,
  outputDir,
  registryPath,
  dryRun:          (values['dry-run']          ?? false) as boolean,
  generateHeaders: !(values['no-headers']     ?? false),
  enrichLLM:       !(values['no-enrich']      ?? false),
  syncRegistry:    !(values['no-sync-registry'] ?? false),
  singleFile:      (values.file as string | undefined),
};

(async () => {
  try {
    if (values['validate-idempotency']) {
      const result = await validateIdempotency(options);
      if (result.isIdempotent) {
        console.log('Idempotency check: PASS');
        console.log('First run: ', JSON.stringify(result.firstRun, null, 2));
        console.log('Second run:', JSON.stringify(result.secondRun, null, 2));
      } else {
        console.error('Idempotency check: FAIL');
        if (result.error) console.error('Error:', result.error);
        process.exit(1);
      }
      return;
    }

    const result = await runSemanticIntegration(options);
    if (!result.success) {
      console.error('Error:', result.error);
      process.exit(1);
    }

    if (options.dryRun && result.writeSummary) {
      console.log(`[dry-run] Would write ${result.writeSummary.totalFiles} file(s), ${result.writeSummary.totalBytes} bytes`);
      result.writeSummary.files.forEach(f => console.log(`  ${f}`));
    }

    const r = result.result!;
    console.log(`Done: ${r.filesProcessed} files processed, ${r.headersGenerated} headers generated, ${r.entriesEnriched} entries enriched, ${r.registryUpdated} registry entries updated`);
    if (r.errors.length > 0) {
      console.warn('Errors:', r.errors.join(', '));
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
})();
