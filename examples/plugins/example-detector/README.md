# @coderef/example-detector

Example plugin demonstrating the CodeRef plugin API.

## Overview

This plugin demonstrates how to extend CodeRef with custom detectors and graph hooks. It detects FastAPI route definitions in Python files and adds relationship edges in the dependency graph.

## Plugin Structure

```
example-detector/
├── coderef-plugin.json    # Plugin manifest
├── package.json           # NPM package configuration
├── README.md              # This file
└── src/
    ├── index.ts           # Main plugin exports
    ├── detectors/
    │   └── fastapi.ts     # FastAPI route detector
    └── hooks/
        └── route-relationships.ts  # Graph relationship hook
```

## Detector

The `fastapi-routes` detector:
- Detects `@app.get()`, `@app.post()`, etc. decorators
- Associates routes with their handler functions
- Returns elements with metadata including HTTP method and endpoint path

## Graph Hook

The `add-route-relationships` hook:
- Runs after the initial graph is built
- Adds `uses` edges between route handlers and their dependencies
- Provides context about FastAPI route relationships

## Installation

```bash
npm install @coderef/example-detector
```

Or for local development:
```bash
cd examples/plugins/example-detector
npm install
npm run build
```

## Usage

The plugin is automatically discovered and loaded by CodeRef when installed in `node_modules/@coderef/`.

### CLI

```bash
coderef scan . --plugins @coderef/example-detector
```

### Programmatic

```typescript
import { initializePluginScanning } from '@coderef/core/plugins/plugin-scanner';

await initializePluginScanning(projectRoot, {
  loadNpm: true,
  loadLocal: false,
  debug: true
});
```

## Configuration

Disable specific plugins in `coderef.config.js`:

```javascript
module.exports = {
  plugins: [
    { name: '@coderef/example-detector', enabled: true }
  ]
};
```

## API Reference

### Detector Interface

```typescript
interface CodeDetector {
  name: string;
  version?: string;
  filePatterns?: string[];
  priority?: number;
  detect(file: string, content: string): DetectionResult[] | null;
}
```

### Graph Hook Interface

```typescript
interface GraphHook {
  name: string;
  execute(elements: CodeElement[], graph: GraphBuilderContext): CustomEdge[];
}
```

## License

MIT
