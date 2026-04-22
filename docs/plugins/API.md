# CodeRef Plugin API

Plugin system for extending CodeRef with custom detectors and graph analysis capabilities.

## Overview

The CodeRef Plugin API enables:
- **Custom Detectors**: Detect framework-specific patterns, routes, and code elements
- **Graph Hooks**: Add custom edges and relationships to the dependency graph
- **Third-Party Extensions**: Distribute plugins via npm (`@coderef/*` scope)
- **Local Development**: Load plugins from `.coderef/plugins/` directory

## Quick Start

### 1. Create Plugin Manifest

```json
{
  "name": "@coderef/my-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "coderefVersion": ">=0.5.0",
  "detectors": [
    {
      "name": "my-detector",
      "patterns": ["**/*.ts"],
      "entry": "dist/detector.js"
    }
  ],
  "hooks": [
    {
      "name": "my-hook",
      "type": "post-graph",
      "entry": "dist/hook.js"
    }
  ]
}
```

### 2. Implement Detector

```typescript
import { CodeDetector, DetectionResult } from '@coderef/core/plugins/types';

export const myDetector: CodeDetector = {
  name: 'my-detector',
  filePatterns: ['**/*.ts'],
  priority: 10,

  detect(file: string, content: string): DetectionResult[] | null {
    // Your detection logic
    return [{
      name: 'detectedElement',
      type: 'function',
      file: file,
      line: 42,
      exported: true
    }];
  }
};
```

### 3. Export from Main Entry

```typescript
import { myDetector } from './detector.js';

export const detectors = {
  'my-detector': myDetector
};

export default { detectors };
```

### 4. Install Plugin

```bash
npm install @coderef/my-plugin
# or
# Copy to .coderef/plugins/my-plugin/
```

### 5. Run with Plugin

```bash
coderef scan . --plugins @coderef/my-plugin
```

## Plugin Manifest (`coderef-plugin.json`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Plugin name (npm package name) |
| `version` | string | Yes | Semantic version |
| `main` | string | Yes | Entry point file |
| `coderefVersion` | string | Yes | Required CodeRef version range |
| `description` | string | No | Plugin description |
| `author` | string | No | Author name |
| `detectors` | array | No | Detector definitions |
| `hooks` | array | No | Graph hook definitions |
| `dependencies` | array | No | Other plugin dependencies |

### Detector Definition

```typescript
{
  name: string;        // Unique detector name
  patterns: string[];  // File glob patterns
  entry?: string;      // Alternative entry point
  description?: string;
}
```

### Hook Definition

```typescript
{
  name: string;        // Unique hook name
  type: 'pre-scan' | 'post-scan' | 'pre-graph' | 'post-graph' | 'custom-edge';
  entry?: string;      // Alternative entry point
  description?: string;
}
```

## Detector API

### CodeDetector Interface

```typescript
interface CodeDetector {
  /** Detector identifier */
  name: string;

  /** Semantic version */
  version?: string;

  /** File patterns this detector handles */
  filePatterns?: string[];

  /** Priority - higher runs first (default: 0) */
  priority?: number;

  /**
   * Detect code elements in a file
   * @param file - Absolute file path
   * @param content - File content
   * @returns Detection results or null if no matches
   */
  detect(file: string, content: string): DetectionResult[] | DetectionResult | null;
}
```

### DetectionResult

```typescript
interface DetectionResult {
  /** Element name */
  name: string;

  /** Element type */
  type: 'function' | 'class' | 'interface' | 'type' | 'method' | 'component' | string;

  /** File path */
  file: string;

  /** Line number */
  line?: number;

  /** Is exported */
  exported?: boolean;

  /** Is async function */
  async?: boolean;

  /** Function parameters */
  parameters?: string[];

  /** Framework identifier */
  framework?: string;

  /** Route path (for framework routes) */
  route?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** Confidence score 0-1 */
  confidence?: number;
}
```

## Graph Hook API

### GraphHook Interface

```typescript
interface GraphHook {
  /** Hook identifier */
  name: string;

  /**
   * Execute hook to add custom edges
   * @param elements - All discovered code elements
   * @param graph - Graph builder context
   * @returns Custom edges to add
   */
  execute(elements: CodeElement[], graph: GraphBuilderContext): CustomEdge[];
}
```

### CustomEdge

```typescript
interface CustomEdge {
  /** Source element UUID */
  from: string;

  /** Target element UUID */
  to: string;

  /** Relationship type */
  type: string;

  /** Edge metadata */
  metadata?: Record<string, any>;
}
```

### GraphBuilderContext

```typescript
interface GraphBuilderContext {
  /** Find element by UUID */
  findElement(uuid: string): CodeElement | undefined;

  /** Find elements by type */
  findByType(type: string): CodeElement[];

  /** Find elements by file */
  findByFile(file: string): CodeElement[];

  /** Check if edge exists */
  hasEdge(from: string, to: string, type?: string): boolean;
}
```

## Plugin Discovery

CodeRef discovers plugins from three sources:

### 1. NPM Packages (`node_modules/@coderef/*`)

Plugins published to npm under the `@coderef` scope are auto-discovered.

### 2. Local Directory (`.coderef/plugins/`)

Development plugins can be placed in `.coderef/plugins/` for testing.

```
.coderef/plugins/
  my-plugin/
    coderef-plugin.json
    dist/
      index.js
```

### 3. Configuration (`coderef.config.js`)

Explicit plugin configuration:

```javascript
module.exports = {
  plugins: [
    // Enable npm package
    '@coderef/example-detector',

    // With options
    { name: '@coderef/example-detector', enabled: true, options: {} },

    // Local path
    './my-custom-plugin'
  ]
};
```

## CLI Options

### Enable/Disable Plugins

```bash
# Enable specific plugins
coderef scan . --plugins @coderef/example-detector,@coderef/another-plugin

# Disable all plugins
coderef scan . --no-plugins

# List available plugins
coderef plugins list
```

## Best Practices

### 1. Use Semantic Versioning

Follow semver for plugin versions to ensure compatibility.

### 2. Set Appropriate Priorities

```typescript
// High priority for framework detection
priority: 100;

// Default priority for general patterns
priority: 0;

// Low priority for catch-all detection
priority: -10;
```

### 3. Validate Before Publishing

```bash
# Validate manifest
npx coderef-plugin validate

# Test plugin locally
coderef scan . --plugins ./my-plugin --debug
```

### 4. Handle Errors Gracefully

```typescript
detect(file: string, content: string): DetectionResult[] | null {
  try {
    // Detection logic
  } catch (error) {
    // Return null or partial results
    return null;
  }
}
```

### 5. Provide Clear Metadata

```typescript
{
  metadata: {
    framework: 'fastapi',
    httpMethod: 'GET',
    route: '/api/users',
    confidence: 0.95
  }
}
```

## Example Plugins

### FastAPI Routes

See `examples/plugins/example-detector/` for a complete FastAPI route detector implementation.

### Django Views

```typescript
export const djangoViewDetector: CodeDetector = {
  name: 'django-views',
  filePatterns: ['**/views.py', '**/views/*.py'],

  detect(file: string, content: string): DetectionResult[] | null {
    // Detect class-based and function-based views
  }
};
```

### Spring Boot Endpoints

```typescript
export const springBootDetector: CodeDetector = {
  name: 'spring-boot-endpoints',
  filePatterns: ['**/*.java'],

  detect(file: string, content: string): DetectionResult[] | null {
    // Detect @RestController, @GetMapping, etc.
  }
};
```

## API Reference

### Plugin Registry

```typescript
import { pluginRegistry } from '@coderef/core/plugins/plugin-registry';

// Get all detectors
const detectors = pluginRegistry.getAllDetectors();

// Get plugin info
const plugin = pluginRegistry.get('@coderef/example-detector');

// Disable plugin
pluginRegistry.disable('@coderef/example-detector');
```

### Plugin Scanner

```typescript
import { scanWithPlugins, initializePluginScanning } from '@coderef/core/plugins/plugin-scanner';

// Initialize plugins
await initializePluginScanning(projectRoot, {
  loadNpm: true,
  loadLocal: true,
  debug: true
});

// Scan file with plugins
const elements = await scanWithPlugins(filePath, content, {
  enabled: true,
  plugins: ['@coderef/example-detector']
});
```

### Plugin Graph

```typescript
import { applyPluginGraphHooks } from '@coderef/core/plugins/plugin-graph';

// Apply hooks after building graph
const enhancedGraph = applyPluginGraphHooks(graph, elements, {
  enabled: true
});
```

## Troubleshooting

### Plugin Not Loading

1. Check `coderef-plugin.json` exists and is valid
2. Verify `main` entry point exists
3. Enable debug logging: `--debug`

### Type Errors

Ensure `@coderef/core` is in your plugin's dependencies or peerDependencies.

### Performance Issues

- Use specific `filePatterns` to avoid scanning all files
- Set appropriate `priority` to run detectors in optimal order
- Cache expensive computations in detectors

## Contributing

Submit plugin ideas and improvements to the CodeRef repository.

## License

MIT - See LICENSE for details.
