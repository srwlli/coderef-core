/**
 * @coderef-semantic: 1.0.0
 * @exports IndexSchemaVersion, IndexFormat, VerboseIndexFile, CompactElement, CompactIndexFile, LoadedIndex, toCompactElements, fromCompactElements, createVerboseIndexFile, createCompactIndexFile, writeIndexVariants, loadIndexFromCoderefDir
 * @used_by src/fileGeneration/detectDrift.ts, src/fileGeneration/saveIndex.ts, src/pipeline/generators/drift-generator.ts, src/pipeline/generators/index-generator.ts
 */





import * as fs from 'fs/promises';
import * as path from 'path';
import { gzip as gzipCb, gunzip as gunzipCb } from 'zlib';
import { promisify } from 'util';
import type { ElementData } from '../types/types.js';

const gzip = promisify(gzipCb);
const gunzip = promisify(gunzipCb);

export type IndexSchemaVersion = '3.0.0';
export type IndexFormat = 'verbose' | 'compact';

export interface VerboseIndexFile {
  schemaVersion: IndexSchemaVersion;
  format: 'verbose';
  generatedAt: string;
  projectPath?: string;
  totalElements: number;
  elementsByType: Record<string, number>;
  elements: ElementData[];
}

export interface CompactElement {
  t: string;
  n: string;
  f: string;
  l: number;
  p?: string[];
  e?: boolean;
  a?: boolean;
  u?: string;
  // reserved for future: additional fields, but keep compact core stable
  [k: string]: unknown;
}

export interface CompactIndexFile {
  schemaVersion: IndexSchemaVersion;
  format: 'compact';
  generatedAt: string;
  projectPath?: string;
  totalElements: number;
  elementsByType: Record<string, number>;
  elements: CompactElement[];
}

export interface LoadedIndex {
  schemaVersion?: string;
  format?: string;
  generatedAt?: string;
  projectPath?: string;
  elements: ElementData[];
  sourcePath: string;
}

function getElementCountsByType(elements: ElementData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const element of elements) {
    counts[element.type] = (counts[element.type] || 0) + 1;
  }
  return counts;
}

export function toCompactElements(elements: ElementData[]): CompactElement[] {
  return elements.map(el => {
    const out: CompactElement = {
      t: el.type,
      n: el.name,
      f: el.file,
      l: el.line,
    };
    if (Array.isArray(el.parameters) && el.parameters.length > 0) {
      out.p = el.parameters.map((p: any) => (typeof p === 'string' ? p : p?.name)).filter((p: any) => typeof p === 'string');
    }
    if (typeof el.exported === 'boolean') out.e = el.exported;
    if (typeof (el as any).async === 'boolean') out.a = (el as any).async;
    if (typeof (el as any).uuid === 'string') out.u = (el as any).uuid;
    return out;
  });
}

export function fromCompactElements(compact: CompactElement[]): ElementData[] {
  return compact.map(c => {
    const out: any = {
      type: c.t,
      name: c.n,
      file: c.f,
      line: c.l,
    };
    if (Array.isArray(c.p)) out.parameters = c.p;
    if (typeof c.e === 'boolean') out.exported = c.e;
    if (typeof c.a === 'boolean') out.async = c.a;
    if (typeof c.u === 'string') out.uuid = c.u;
    return out as ElementData;
  });
}

export function createVerboseIndexFile(
  elements: ElementData[],
  opts: { projectPath?: string; generatedAt?: string } = {}
): VerboseIndexFile {
  const generatedAt = opts.generatedAt ?? new Date().toISOString();
  return {
    schemaVersion: '3.0.0',
    format: 'verbose',
    generatedAt,
    projectPath: opts.projectPath,
    totalElements: elements.length,
    elementsByType: getElementCountsByType(elements),
    elements,
  };
}

export function createCompactIndexFile(
  elements: ElementData[],
  opts: { projectPath?: string; generatedAt?: string } = {}
): CompactIndexFile {
  const generatedAt = opts.generatedAt ?? new Date().toISOString();
  return {
    schemaVersion: '3.0.0',
    format: 'compact',
    generatedAt,
    projectPath: opts.projectPath,
    totalElements: elements.length,
    elementsByType: getElementCountsByType(elements),
    elements: toCompactElements(elements),
  };
}

export async function writeIndexVariants(
  outputDir: string,
  elements: ElementData[],
  opts: { projectPath?: string } = {}
): Promise<{
  verbosePath: string;
  verboseGzPath: string;
  compactPath: string;
  compactGzPath: string;
}> {
  await fs.mkdir(outputDir, { recursive: true });

  const verbosePath = path.join(outputDir, 'index.json');
  const verboseGzPath = path.join(outputDir, 'index.json.gz');
  const compactPath = path.join(outputDir, 'index.compact.json');
  const compactGzPath = path.join(outputDir, 'index.compact.json.gz');

  const verbose = createVerboseIndexFile(elements, { projectPath: opts.projectPath });
  const compact = createCompactIndexFile(elements, { projectPath: opts.projectPath, generatedAt: verbose.generatedAt });

  const verboseRaw = JSON.stringify(verbose);
  const compactRaw = JSON.stringify(compact);

  await fs.writeFile(verbosePath, verboseRaw, 'utf-8');
  await fs.writeFile(compactPath, compactRaw, 'utf-8');

  const [verboseGz, compactGz] = await Promise.all([
    gzip(Buffer.from(verboseRaw, 'utf-8'), { level: 9 }),
    gzip(Buffer.from(compactRaw, 'utf-8'), { level: 9 }),
  ]);

  await fs.writeFile(verboseGzPath, verboseGz);
  await fs.writeFile(compactGzPath, compactGz);

  return { verbosePath, verboseGzPath, compactPath, compactGzPath };
}

async function readJsonMaybeGz(filePath: string): Promise<any> {
  const buf = await fs.readFile(filePath);
  const jsonBuf = filePath.endsWith('.gz') ? await gunzip(buf) : buf;
  return JSON.parse(jsonBuf.toString('utf-8'));
}

function normalizeParsedIndex(parsed: any): { schemaVersion?: string; format?: string; generatedAt?: string; projectPath?: string; elements: ElementData[] } {
  if (Array.isArray(parsed)) {
    return { elements: parsed as ElementData[] };
  }

  if (parsed && typeof parsed === 'object') {
    // v2 saveIndex() style: { version, generatedAt, elements, ... }
    if (Array.isArray(parsed.elements)) {
      // Compact schema
      if (parsed.format === 'compact' || parsed.schemaVersion === '3.0.0') {
        const first = parsed.elements[0];
        const looksCompact = first && typeof first === 'object' && 't' in first && 'n' in first && 'f' in first && 'l' in first;
        if (looksCompact) {
          return {
            schemaVersion: parsed.schemaVersion,
            format: parsed.format,
            generatedAt: parsed.generatedAt,
            projectPath: parsed.projectPath,
            elements: fromCompactElements(parsed.elements as CompactElement[]),
          };
        }
      }

      return {
        schemaVersion: parsed.schemaVersion ?? parsed.version,
        format: parsed.format ?? 'verbose',
        generatedAt: parsed.generatedAt,
        projectPath: parsed.projectPath,
        elements: parsed.elements as ElementData[],
      };
    }
  }

  return { elements: [] };
}

export async function loadIndexFromCoderefDir(coderefDir: string): Promise<LoadedIndex> {
  const candidates = [
    path.join(coderefDir, 'index.compact.json.gz'),
    path.join(coderefDir, 'index.compact.json'),
    path.join(coderefDir, 'index.json.gz'),
    path.join(coderefDir, 'index.json'),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = await readJsonMaybeGz(candidate);
      const normalized = normalizeParsedIndex(parsed);
      return {
        ...normalized,
        sourcePath: candidate,
      };
    } catch {
      // try next
    }
  }

  throw new Error(`Index file not found in ${coderefDir}`);
}

