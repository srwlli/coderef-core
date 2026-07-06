import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateHeaders } from '../../src/semantic/header-generator.js';
import { parseHeader } from '../../src/pipeline/semantic-header-parser.js';
import type { ExportInfo } from '../../src/semantic/ast-extractor.js';

/**
 * Round-trip contract for hash-comment languages (STUB-0G9DPT).
 *
 * HeaderGenerator writes '#'-line @coderef-semantic headers for Python (and
 * other hash-comment languages) — see formatAsComments' 'hash' family. The
 * parser's detectHeaderBlock must detect that exact writer output, otherwise
 * every stamped .py file parses to headerStatus=missing (proven on
 * primary-sources 2026-07-06: 520 stamped .py files, 0 defined).
 *
 * Contract: write then parse => defined.
 */

const exportsFixture: ExportInfo[] = [{ name: 'my_func', type: 'named', line: 1 }];

describe('hash-comment header round-trip (write then parse => defined)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-hash-roundtrip-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  async function stampAndParse(fileName: string, body: string) {
    const file = path.join(tempDir, fileName);
    fs.writeFileSync(file, body);
    await generateHeaders(file, exportsFixture, []);
    const content = fs.readFileSync(file, 'utf-8');
    return { content, result: parseHeader(content, fileName) };
  }

  it('plain .py file: generator-written # header parses to defined', async () => {
    const { content, result } = await stampAndParse('plain.py', 'def my_func():\n    return 1\n');

    expect(content).toContain('# @coderef-semantic: 1.0.0');
    expect(result.headerStatus).toBe('defined');
    expect(result.headerFact.exports).toContain('my_func');
  });

  it('shebang .py file: header detected without consuming the shebang', async () => {
    const { content, result } = await stampAndParse(
      'script.py',
      '#!/usr/bin/env python3\ndef my_func():\n    return 1\n',
    );

    expect(content.startsWith('#!/usr/bin/env python3')).toBe(true);
    expect(result.headerStatus).toBe('defined');
  });

  it('PEP263 coding-cookie .py file: header detected with cookie in the file', async () => {
    const { content, result } = await stampAndParse(
      'coding.py',
      '# -*- coding: utf-8 -*-\ndef my_func():\n    return 1\n',
    );

    expect(content).toContain('# -*- coding: utf-8 -*-');
    expect(result.headerStatus).toBe('defined');
  });
});

describe('hash-comment header detection (parser-only)', () => {
  it('coding cookie directly adjacent above the header block is tolerated', () => {
    const source = [
      '# -*- coding: utf-8 -*-',
      '# @coderef-semantic: 1.0.0',
      '# @layer utility',
      '# @capability foo-bar',
      '# @exports my_func',
      '',
      'def my_func():',
      '    return 1',
      '',
    ].join('\n');

    const r = parseHeader(source, 'adjacent.py');
    expect(r.headerStatus).toBe('defined');
    expect(r.headerFact.layer).toBe('utility');
  });

  it('CRLF line endings: # header still parses to defined', () => {
    const source = [
      '# @coderef-semantic: 1.0.0',
      '# @exports my_func',
      '',
      'def my_func():',
      '    return 1',
      '',
    ].join('\r\n');

    const r = parseHeader(source, 'crlf.py');
    expect(r.headerStatus).toBe('defined');
  });

  it('plain # comments without the marker stay missing (no false positive)', () => {
    const source = [
      '# just a normal comment',
      '# another line',
      '',
      'def my_func():',
      '    return 1',
      '',
    ].join('\n');

    const r = parseHeader(source, 'nomarker.py');
    expect(r.headerStatus).toBe('missing');
  });

  it('docstring header form still parses to defined (no regression)', () => {
    const source = [
      '"""',
      '@coderef-semantic:1.0.0',
      '@layer utility',
      '@capability foo-bar',
      '@exports my_func',
      '"""',
      'def my_func():',
      '    return 1',
      '',
    ].join('\n');

    const r = parseHeader(source, 'docstring.py');
    expect(r.headerStatus).toBe('defined');
  });
});
