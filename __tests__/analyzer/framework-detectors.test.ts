/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability framework-detectors-tests
 */

/**
 * Framework detector suite — table-driven behavior tests for all 7 registered
 * detectors plus barrel/registry integrity.
 *
 * WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 4 (test-linkage burn-down,
 * cluster A): every detector here is LIVE — registered into every scan via
 * src/scanner/register-frameworks.ts — and previously carried zero test edges.
 *
 * Fixtures are derived from each detector's OWN regexes and the route-parsers
 * they delegate to (src/analyzer/route-parsers.ts), not invented shapes: a
 * positive row must satisfy BOTH the detector's gate pattern and the parser's
 * route regex to produce a non-null result.
 */

import { describe, it, expect } from 'vitest';
import type { FrameworkDetector, FrameworkDetectionResult } from '../../src/scanner/framework-registry.js';
import * as frameworks from '../../src/analyzer/frameworks/index.js';
// Each detector is imported from its DEFINING module (not the barrel): unit
// imports stay direct, and the barrel's re-export integrity is asserted
// separately via the namespace import above.
import { nextjsDetector } from '../../src/analyzer/frameworks/nextjs-detector.js';
import { sveltekitDetector } from '../../src/analyzer/frameworks/sveltekit-detector.js';
import { nuxtDetector } from '../../src/analyzer/frameworks/nuxt-detector.js';
import { remixDetector } from '../../src/analyzer/frameworks/remix-detector.js';
import { expressDetector } from '../../src/analyzer/frameworks/express-detector.js';
import { flaskDetector } from '../../src/analyzer/frameworks/flask-detector.js';
import { fastapiDetector } from '../../src/analyzer/frameworks/fastapi-detector.js';
import { frameworkRegistry } from '../../src/scanner/framework-registry.js';
import { registerDefaultFrameworks } from '../../src/scanner/register-frameworks.js';

const ALL_DETECTORS: FrameworkDetector[] = [
  nextjsDetector,
  sveltekitDetector,
  nuxtDetector,
  remixDetector,
  expressDetector,
  flaskDetector,
  fastapiDetector,
];

interface PositiveCase {
  label: string;
  detector: FrameworkDetector;
  file: string;
  content: string;
  expected: {
    framework: string;
    elementName: string;
    elementType: FrameworkDetectionResult['elementType'];
    path: string;
    methods: string[];
    blueprint?: string;
  };
}

const POSITIVE_CASES: PositiveCase[] = [
  {
    label: 'express: whitelisted app.get route',
    detector: expressDetector,
    file: 'src/server.ts',
    content: [
      "const app = express();",
      "app.get('/api/users', getUsers);",
    ].join('\n'),
    expected: {
      framework: 'express',
      elementName: 'app',
      elementType: 'function',
      path: '/api/users',
      methods: ['GET'],
    },
  },
  {
    label: 'express: non-whitelisted var accepted via express import',
    detector: expressDetector,
    file: 'src/app.ts',
    content: [
      "import express from 'express';",
      'const myapp = express();',
      "myapp.post('/login', handler);",
    ].join('\n'),
    expected: {
      framework: 'express',
      elementName: 'myapp',
      elementType: 'function',
      path: '/login',
      methods: ['POST'],
      blueprint: 'myapp',
    },
  },
  {
    label: 'nextjs: App Router route.ts with GET export',
    detector: nextjsDetector,
    file: '/proj/app/api/users/route.ts',
    content: "export async function GET(request: Request) { return new Response('ok'); }",
    expected: {
      framework: 'nextjs',
      elementName: 'route',
      elementType: 'function',
      path: '/api/users',
      methods: ['GET'],
    },
  },
  {
    label: 'nextjs: Pages Router handler with req.method check',
    detector: nextjsDetector,
    file: '/proj/pages/api/users.ts',
    content: [
      'export default async function handler(req, res) {',
      "  if (req.method === 'GET') { res.status(200).json([]); }",
      '}',
    ].join('\n'),
    expected: {
      framework: 'nextjs-pages',
      elementName: 'handler',
      elementType: 'handler',
      path: '/api/users',
      methods: ['GET'],
    },
  },
  {
    label: 'sveltekit: +server.ts API route with GET export',
    detector: sveltekitDetector,
    file: '/proj/src/routes/api/users/+server.ts',
    content: 'export async function GET({ url }) { return new Response(); }',
    expected: {
      framework: 'sveltekit',
      elementName: 'API',
      elementType: 'function',
      path: '/api/users',
      methods: ['GET'],
    },
  },
  {
    label: 'sveltekit: +page.server.ts with load and actions',
    detector: sveltekitDetector,
    file: '/proj/src/routes/dashboard/+page.server.ts',
    content: [
      'export const load = () => ({});',
      'export const actions = { default: async () => ({}) };',
    ].join('\n'),
    expected: {
      framework: 'sveltekit',
      elementName: 'load',
      elementType: 'function',
      path: '/dashboard',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  },
  {
    label: 'nuxt: server/api file with method suffix',
    detector: nuxtDetector,
    file: '/proj/server/api/users.get.ts',
    content: 'export default defineEventHandler(() => []);',
    expected: {
      framework: 'nuxt',
      elementName: 'handler',
      elementType: 'function',
      path: '/api/users',
      methods: ['GET'],
    },
  },
  {
    label: 'remix: routes .tsx with loader export',
    detector: remixDetector,
    file: '/proj/app/routes/users.tsx',
    content: 'export async function loader() { return null; }',
    expected: {
      framework: 'remix',
      elementName: 'route',
      elementType: 'function',
      path: '/users',
      methods: ['GET'],
    },
  },
  {
    label: 'flask: @app.route with explicit methods',
    detector: flaskDetector,
    file: 'app.py',
    content: [
      "@app.route('/users', methods=['GET', 'POST'])",
      'def list_users():',
      '    return []',
    ].join('\n'),
    expected: {
      framework: 'flask',
      elementName: 'list_users',
      elementType: 'function',
      path: '/users',
      methods: ['GET', 'POST'],
    },
  },
  {
    label: 'flask: blueprint route defaults to GET',
    detector: flaskDetector,
    file: 'admin.py',
    content: [
      "@bp.route('/admin')",
      'def admin_home():',
      '    return render()',
    ].join('\n'),
    expected: {
      framework: 'flask',
      elementName: 'admin_home',
      elementType: 'function',
      path: '/admin',
      methods: ['GET'],
      blueprint: 'bp',
    },
  },
  {
    label: 'fastapi: @app.get decorator with async def',
    detector: fastapiDetector,
    file: 'main.py',
    content: [
      "@app.get('/items')",
      'async def read_items():',
      '    return []',
    ].join('\n'),
    expected: {
      framework: 'fastapi',
      elementName: 'read_items',
      elementType: 'function',
      path: '/items',
      methods: ['GET'],
    },
  },
];

interface NegativeCase {
  label: string;
  detector: FrameworkDetector;
  file: string;
  content: string;
}

const NEGATIVE_CASES: NegativeCase[] = [
  {
    label: 'express: URLSearchParams .get() is not a route',
    detector: expressDetector,
    file: 'src/util/url.ts',
    content: "const value = searchParams.get('key');",
  },
  {
    label: 'express: unknown var without express import is rejected',
    detector: expressDetector,
    file: 'src/service.ts',
    content: "myapp.get('/x', h);",
  },
  {
    label: 'nextjs: component file outside api dirs',
    detector: nextjsDetector,
    file: 'src/components/button.tsx',
    content: 'export const Button = () => null;',
  },
  {
    label: 'sveltekit: routes file without +server/+page.server marker',
    detector: sveltekitDetector,
    file: '/proj/src/routes/api/users/server.ts',
    content: 'export async function GET() { return new Response(); }',
  },
  {
    label: 'nuxt: file outside server/api',
    detector: nuxtDetector,
    file: 'src/api/users.ts',
    content: 'export default defineEventHandler(() => []);',
  },
  {
    label: 'remix: plain .ts in routes is gated out (detector accepts .tsx/.jsx only)',
    detector: remixDetector,
    file: '/proj/app/routes/users.ts',
    content: 'export async function loader() { return null; }',
  },
  {
    label: 'flask: JS router creation is not a flask decorator',
    detector: flaskDetector,
    file: 'src/router.ts',
    content: 'const router = createRouter();',
  },
  {
    label: 'fastapi: parser only accepts the literal @app receiver',
    detector: fastapiDetector,
    file: 'routes.py',
    content: ["@router.get('/x')", 'def q():', '    return []'].join('\n'),
  },
];

describe('framework detectors (table-driven, all 7)', () => {
  it.each(POSITIVE_CASES.map(c => [c.label, c] as const))('%s', (_label, c) => {
    const result = c.detector.detect(c.file, c.content);
    expect(result).not.toBeNull();
    expect(result!.framework).toBe(c.expected.framework);
    expect(result!.elementName).toBe(c.expected.elementName);
    expect(result!.elementType).toBe(c.expected.elementType);
    expect(result!.route.path).toBe(c.expected.path);
    expect(result!.route.methods).toEqual(c.expected.methods);
    if (c.expected.blueprint !== undefined) {
      expect(result!.route.blueprint).toBe(c.expected.blueprint);
    }
  });

  it.each(NEGATIVE_CASES.map(c => [c.label, c] as const))('%s', (_label, c) => {
    expect(c.detector.detect(c.file, c.content)).toBeNull();
  });

  it('neutral content is null across every detector', () => {
    const neutral = 'const x = compute(1);\nexport function util() { return x; }\n';
    for (const detector of ALL_DETECTORS) {
      expect(detector.detect('src/util/math.ts', neutral)).toBeNull();
    }
  });
});

describe('frameworks barrel + registry integrity', () => {
  const EXPECTED_NAMES = ['nextjs', 'sveltekit', 'nuxt', 'remix', 'express', 'flask', 'fastapi'];

  it('barrel exports exactly the 7 registered detectors, each well-formed', () => {
    const exported = [
      frameworks.nextjsDetector,
      frameworks.sveltekitDetector,
      frameworks.nuxtDetector,
      frameworks.remixDetector,
      frameworks.expressDetector,
      frameworks.flaskDetector,
      frameworks.fastapiDetector,
    ];
    const names = exported.map(d => d.name);
    expect(names).toEqual(EXPECTED_NAMES);
    expect(new Set(names).size).toBe(7);
    for (const d of exported) {
      expect(typeof d.detect).toBe('function');
    }
    // Registry re-export rides the barrel too.
    expect(typeof frameworks.frameworkRegistry.detect).toBe('function');
  });

  it('register-frameworks wires all 7 into the global registry', () => {
    // Auto-registration happens on module import; calling again is idempotent
    // (Map-keyed by detector name).
    registerDefaultFrameworks();
    const registered = frameworkRegistry.getRegisteredFrameworks();
    for (const name of EXPECTED_NAMES) {
      expect(registered).toContain(name);
      expect(frameworkRegistry.isFrameworkRegistered(name)).toBe(true);
    }
  });

  it('registry dispatch reaches a detector registered by register-frameworks', () => {
    registerDefaultFrameworks();
    const flaskContent = ["@app.route('/ping')", 'def ping():', "    return 'pong'"].join('\n');
    const result = frameworkRegistry.detect('svc.py', flaskContent);
    expect(result).not.toBeNull();
    expect(result!.framework).toBe('flask');
    expect(result!.route.path).toBe('/ping');
  });
});
