/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability cli-bin-alias-test
 */

/**
 * WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 Phase 4, DR-007
 * option (A): rename-with-aliases.
 *
 * There is no alias precedent anywhere else in this package (RISK-010), so
 * these tests pin the mechanism as much as the behaviour — the next person to
 * add an alias should be able to read this file and copy it.
 */

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { invokedBinName, warnIfLegacyBinName } from '../../src/cli/bin-alias.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const VALIDATE = { legacy: 'validate-routes', canonical: 'coderef-validate-routes' };
const SCAN = { legacy: 'scan-frontend-calls', canonical: 'coderef-scan-frontend-calls' };

function capture(alias: typeof VALIDATE, argv: string[]): { fired: boolean; text: string } {
  let text = '';
  const fired = warnIfLegacyBinName(alias, argv, m => { text += m; });
  return { fired, text };
}

describe('package.json bin map (DR-007)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));

  it('exposes BOTH names for each renamed bin, pointing at the same dist entry', () => {
    expect(pkg.bin[VALIDATE.canonical]).toBe(pkg.bin[VALIDATE.legacy]);
    expect(pkg.bin[SCAN.canonical]).toBe(pkg.bin[SCAN.legacy]);
    // One entry, two keys — no shim file, no wrapper process.
    expect(pkg.bin[VALIDATE.canonical]).toBe('./dist/src/cli/validate-routes.js');
    expect(pkg.bin[SCAN.canonical]).toBe('./dist/src/cli/scan-frontend-calls.js');
  });

  it('leaves populate-coderef alone — explicitly out of scope', () => {
    // The most-invoked bin in the fleet; its rename is a separate blast radius
    // this workorder must not absorb.
    expect(pkg.bin['populate-coderef']).toBeDefined();
    expect(pkg.bin['coderef-populate']).toBeUndefined();
  });

  it('every dist entry a bin points at is a real built file', () => {
    for (const [name, entry] of Object.entries(pkg.bin as Record<string, string>)) {
      const p = path.join(REPO_ROOT, entry);
      expect(fs.existsSync(p), `${name} -> ${entry} does not exist`).toBe(true);
    }
  });
});

describe('legacy-name deprecation notice', () => {
  it('fires for a posix npm shim invoked by the legacy name', () => {
    const { fired, text } = capture(VALIDATE, ['node', '/usr/local/bin/validate-routes']);
    expect(fired).toBe(true);
    expect(text).toContain('[deprecated]');
    expect(text).toContain('"validate-routes" is deprecated');
    expect(text).toContain('coderef-validate-routes');
  });

  it('fires for a Windows .cmd / .ps1 shim', () => {
    const sep = String.fromCharCode(92);
    for (const ext of ['.cmd', '.ps1', '']) {
      const argv = ['node', `C:${sep}npm${sep}validate-routes${ext}`];
      expect(capture(VALIDATE, argv).fired, `ext=${ext || '(none)'}`).toBe(true);
    }
  });

  it('is SILENT for the canonical name', () => {
    const { fired, text } = capture(VALIDATE, ['node', '/usr/local/bin/coderef-validate-routes']);
    expect(fired).toBe(false);
    expect(text).toBe('');
  });

  it('is SILENT when argv[1] is absent — unknown is never treated as legacy', () => {
    expect(capture(VALIDATE, ['node']).fired).toBe(false);
    expect(capture(VALIDATE, []).fired).toBe(false);
  });

  it('does not cross-fire between the two aliases', () => {
    expect(capture(SCAN, ['node', '/usr/local/bin/validate-routes']).fired).toBe(false);
    expect(capture(VALIDATE, ['node', '/usr/local/bin/scan-frontend-calls']).fired).toBe(false);
  });

  it('ALSO fires on a direct dist run — documented and accepted', () => {
    // The dist entry FILE kept its original name (only a bin KEY was added), so
    // a basename check genuinely cannot separate these two paths. Pinned here so
    // the behaviour is a decision on record, not a surprise.
    expect(capture(VALIDATE, ['node', '/repo/dist/src/cli/validate-routes.js']).fired).toBe(true);
  });

  it('invokedBinName strips the shim extension and returns undefined for no argv[1]', () => {
    expect(invokedBinName(['node', '/a/b/coderef-validate-routes.cmd'])).toBe('coderef-validate-routes');
    expect(invokedBinName(['node', '/a/b/validate-routes'])).toBe('validate-routes');
    expect(invokedBinName(['node'])).toBeUndefined();
  });
});

describe('documented CLI surface matches the real parsers', () => {
  // Amendment 5: BOTH bins previously documented flags that exist on neither,
  // and validate-routes exits 1 on ANY unknown flag — so every documented
  // invocation failed. These assertions fail if the fictional flags ever
  // reappear in the docs.
  const cliDoc = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'CLI.md'), 'utf8');
  const section = (heading: string): string => {
    const start = cliDoc.indexOf(`## ${heading}`);
    expect(start, `${heading} section missing from CLI.md`).toBeGreaterThan(-1);
    const next = cliDoc.indexOf('\n## ', start + 1);
    return cliDoc.slice(start, next === -1 ? undefined : next);
  };

  it('documents coderef-validate-routes with only flags its parser accepts', () => {
    const doc = section('coderef-validate-routes');
    for (const real of ['--project-dir', '--frontend-calls', '--server-routes', '--fail-on-critical', '--output']) {
      expect(doc, `missing real flag ${real}`).toContain(real);
    }
    // The invented ones must not come back as if they worked.
    for (const fake of ['`--strict`', '`--fix`', '`-d, --dir`']) {
      expect(doc.includes(`| ${fake}`), `fake flag ${fake} documented as real`).toBe(false);
    }
  });

  it('documents coderef-scan-frontend-calls with only flags its parser accepts', () => {
    const doc = section('coderef-scan-frontend-calls');
    for (const real of ['--project-dir', '--output', '--extensions']) {
      expect(doc, `missing real flag ${real}`).toContain(real);
    }
    for (const fake of ['`--pattern`', '`--group-by`', '`-d, --dir`']) {
      expect(doc.includes(`| ${fake}`), `fake flag ${fake} documented as real`).toBe(false);
    }
  });

  it('the summary table links the renamed anchors', () => {
    expect(cliDoc).toContain('[`coderef-validate-routes`](#coderef-validate-routes)');
    expect(cliDoc).toContain('[`coderef-scan-frontend-calls`](#coderef-scan-frontend-calls)');
  });
});
