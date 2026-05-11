#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { detectProjectLanguages, formatSupportedLanguages } from './detect-languages.js';

function printHelp(): void {
  console.log(`
coderef-detect-languages — detect programming languages used in a project

Usage:
  coderef-detect-languages --project=<path> [options]

Options:
  --project=<path>     Path to the project root (required)
  --ignore-file=<path> Path to ignore file (default: .coderefignore)
  --json               Output as JSON array instead of line-by-line
  --help               Print this help

Supported languages: ${formatSupportedLanguages()}

Examples:
  coderef-detect-languages --project=.
  coderef-detect-languages --project=/path/to/project --json
`);
}

const { values } = parseArgs({
  options: {
    project:      { type: 'string' },
    'ignore-file': { type: 'string' },
    json:         { type: 'boolean' },
    help:         { type: 'boolean' },
  },
  strict: false,
});

if (values.help) { printHelp(); process.exit(0); }

const project = values.project as string | undefined;
if (!project) { console.error('Error: --project is required'); printHelp(); process.exit(1); }

const ignoreFile = values['ignore-file'] as string | undefined;

(async () => {
  try {
    const languages = await detectProjectLanguages(project, ignoreFile);
    if (values.json) {
      console.log(JSON.stringify(languages, null, 2));
    } else {
      if (languages.length === 0) {
        console.log('No supported languages detected.');
      } else {
        languages.forEach(lang => console.log(lang));
      }
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
})();
