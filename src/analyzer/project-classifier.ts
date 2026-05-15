/**
 * @coderef-semantic: 1.0.0
 * @exports ProjectCategory, ApiServiceType, WebAppType, ProjectClassification, ProjectClassifier
 * @used_by src/pipeline/generators/context-generator.ts
 */



/**
 * ProjectClassifier - Detect project type and intent
 *
 * IMP-CORE-016: Add project type and intent detection
 *
 * Determines project purpose from:
 * - Dependencies (package.json analysis)
 * - Entry points (detected by EntryPointDetector)
 * - File structure (typical patterns)
 *
 * Detects:
 * - API service: REST/GraphQL/gRPC
 * - CLI tool: Command-line utilities
 * - Web App: SPA/SSR/static
 * - Library/SDK: Reusable packages
 * - Desktop app: Electron/Tauri
 * - Mobile app: React Native/Flutter
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { EntryPoint } from './entry-detector.js';

/**
 * Project type categories
 */
export type ProjectCategory =
  | 'api-service'
  | 'cli-tool'
  | 'web-app'
  | 'library'
  | 'desktop-app'
  | 'mobile-app'
  | 'script-tool'
  | 'hybrid';

/**
 * API service subtypes
 */
export type ApiServiceType = 'rest' | 'graphql' | 'grpc' | 'websocket' | 'mixed' | 'unknown';

/**
 * Web app subtypes
 */
export type WebAppType = 'spa' | 'ssr' | 'static' | 'pwa' | 'unknown';

/**
 * Classification result with confidence score
 */
export interface ProjectClassification {
  /** Primary project category */
  category: ProjectCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Subtype for API services and web apps */
  subtype?: ApiServiceType | WebAppType;
  /** Detected purpose description */
  purpose: string;
  /** Key indicators that led to classification */
  indicators: string[];
  /** Suggested use cases */
  useCases: string[];
}

/**
 * Package.json structure (partial)
 */
interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  keywords?: string[];
}

/**
 * ProjectClassifier - Analyze project to determine its type and intent
 */
export class ProjectClassifier {
  private indicators: string[] = [];

  /**
   * Classify project based on all available information
   */
  async classify(
    projectPath: string,
    entryPoints: EntryPoint[],
    files: Map<string, string[]>
  ): Promise<ProjectClassification> {
    this.indicators = [];

    // Load package.json if available
    const packageJson = await this.loadPackageJson(projectPath);

    // Collect all file paths
    const allFiles: string[] = [];
    for (const filePaths of files.values()) {
      allFiles.push(...filePaths);
    }

    // Analyze each project type
    const apiScore = this.analyzeApiService(packageJson, entryPoints, allFiles);
    const cliScore = this.analyzeCliTool(packageJson, entryPoints);
    const webScore = this.analyzeWebApp(packageJson, entryPoints, allFiles);
    const libScore = this.analyzeLibrary(packageJson, entryPoints, allFiles);
    const desktopScore = this.analyzeDesktopApp(packageJson, allFiles);
    const mobileScore = this.analyzeMobileApp(packageJson, allFiles);

    // Determine primary category
    const scores = [
      { category: 'api-service' as ProjectCategory, score: apiScore, subtype: this.detectApiSubtype(packageJson, allFiles) },
      { category: 'cli-tool' as ProjectCategory, score: cliScore },
      { category: 'web-app' as ProjectCategory, score: webScore, subtype: this.detectWebSubtype(packageJson, allFiles) },
      { category: 'library' as ProjectCategory, score: libScore },
      { category: 'desktop-app' as ProjectCategory, score: desktopScore },
      { category: 'mobile-app' as ProjectCategory, score: mobileScore },
    ];

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const primary = scores[0];
    const secondary = scores[1];

    // Check for hybrid projects (e.g., CLI + Library)
    const isHybrid = secondary.score > 0.5 && primary.score - secondary.score < 0.3;

    if (isHybrid) {
      return this.buildHybridClassification(primary, secondary, packageJson);
    }

    return this.buildClassification(primary.category, primary.score, primary.subtype, packageJson);
  }

  /**
   * Analyze if project is an API service
   */
  private analyzeApiService(
    packageJson: PackageJson | null,
    entryPoints: EntryPoint[],
    files: string[]
  ): number {
    let score = 0;
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };

    // Check for server frameworks
    const serverFrameworks = [
      'express', 'fastify', 'koa', 'hapi', 'restify', 'nestjs', 'hono',
      'fastapi', 'flask', 'django', 'tornado', 'sanic',
      'gin', 'echo', 'fiber', 'mux',
    ];

    for (const fw of serverFrameworks) {
      if (deps?.[fw]) {
        score += 0.3;
        this.indicators.push(`Server framework: ${fw}`);
      }
    }

    // Check for server entry points
    const serverEntries = entryPoints.filter(ep => ep.type === 'server');
    if (serverEntries.length > 0) {
      score += 0.4;
      this.indicators.push(`Server entry points: ${serverEntries.length}`);
    }

    // Check for API route patterns
    const hasApiRoutes = files.some(f =>
      /routes?\//.test(f) ||
      /api\//.test(f) ||
      /endpoints?\//.test(f) ||
      /controllers?\//.test(f)
    );
    if (hasApiRoutes) {
      score += 0.2;
      this.indicators.push('API route patterns detected');
    }

    // Check for GraphQL
    if (deps?.['graphql'] || deps?.['apollo-server'] || deps?.['@apollo/server']) {
      score += 0.3;
      this.indicators.push('GraphQL detected');
    }

    // Check for gRPC
    if (deps?.['@grpc/grpc-js'] || deps?.['grpc'] || deps?.['grpcio']) {
      score += 0.3;
      this.indicators.push('gRPC detected');
    }

    return Math.min(score, 1);
  }

  /**
   * Analyze if project is a CLI tool
   */
  private analyzeCliTool(
    packageJson: PackageJson | null,
    entryPoints: EntryPoint[]
  ): number {
    let score = 0;
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };

    // Check for CLI frameworks
    const cliFrameworks = ['commander', 'yargs', 'oclif', 'ink', 'pastel', 'cac', 'minimist'];
    for (const fw of cliFrameworks) {
      if (deps?.[fw]) {
        score += 0.4;
        this.indicators.push(`CLI framework: ${fw}`);
      }
    }

    // Check for CLI entry points
    const cliEntries = entryPoints.filter(ep => ep.type === 'cli');
    if (cliEntries.length > 0) {
      score += 0.5;
      this.indicators.push(`CLI entry points: ${cliEntries.length}`);
    }

    // Check package.json bin field
    if (packageJson?.bin) {
      score += 0.4;
      this.indicators.push('package.json bin field present');
    }

    return Math.min(score, 1);
  }

  /**
   * Analyze if project is a web app
   */
  private analyzeWebApp(
    packageJson: PackageJson | null,
    entryPoints: EntryPoint[],
    files: string[]
  ): number {
    let score = 0;
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };

    // Check for frontend frameworks
    const frontendFrameworks = [
      'react', 'vue', 'svelte', '@angular/core', 'solid-js', 'preact',
      'next', 'nuxt', 'sveltekit', 'gatsby', 'remix', 'astro',
    ];

    for (const fw of frontendFrameworks) {
      if (deps?.[fw]) {
        score += 0.3;
        this.indicators.push(`Frontend framework: ${fw}`);
      }
    }

    // Check for bundlers (indicates client-side app)
    const bundlers = ['webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'turbo'];
    for (const bundler of bundlers) {
      if (deps?.[bundler]) {
        score += 0.15;
        this.indicators.push(`Bundler: ${bundler}`);
      }
    }

    // Check for HTML/template files
    const hasHtml = files.some(f => /\.html?$/.test(f) || /\.tsx?$/.test(f) || /\.jsx?$/.test(f));
    if (hasHtml) {
      score += 0.1;
    }

    // Check for CSS frameworks
    const cssFrameworks = ['tailwindcss', 'bootstrap', 'mui', '@mui/material', 'antd', 'chakra-ui'];
    for (const css of cssFrameworks) {
      if (deps?.[css]) {
        score += 0.1;
      }
    }

    return Math.min(score, 0.9); // Cap at 0.9 to avoid overriding CLI/API
  }

  /**
   * Analyze if project is a library/SDK
   */
  private analyzeLibrary(
    packageJson: PackageJson | null,
    entryPoints: EntryPoint[],
    files: string[]
  ): number {
    let score = 0;

    // Check for library entry points
    const libEntries = entryPoints.filter(ep => ep.type === 'library');
    if (libEntries.length > 0) {
      score += 0.4;
      this.indicators.push(`Library entry points: ${libEntries.length}`);
    }

    // Check package.json main/module fields
    if (packageJson?.main || packageJson?.['module']) {
      score += 0.3;
      this.indicators.push('Library exports configured');
    }

    // Check for keywords like "library", "sdk", "toolkit"
    const libKeywords = ['library', 'sdk', 'toolkit', 'utils', 'helpers'];
    const hasLibKeyword = packageJson?.keywords?.some(k =>
      libKeywords.some(lk => k.toLowerCase().includes(lk))
    );
    if (hasLibKeyword) {
      score += 0.2;
    }

    // Check for TypeScript declarations (common in libraries)
    const hasDeclarations = files.some(f => /\.d\.ts$/.test(f));
    if (hasDeclarations) {
      score += 0.2;
      this.indicators.push('TypeScript declarations present');
    }

    // Multiple exported functions suggests library
    const exportedFiles = new Set(entryPoints.filter(ep => ep.exported).map(ep => ep.file));
    if (exportedFiles.size > 3) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Analyze if project is a desktop app
   */
  private analyzeDesktopApp(
    packageJson: PackageJson | null,
    files: string[]
  ): number {
    let score = 0;
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };

    // Check for Electron
    if (deps?.['electron']) {
      score += 0.8;
      this.indicators.push('Electron detected');
    }

    // Check for Tauri
    if (deps?.['@tauri-apps/api'] || files.some(f => /src-tauri\//.test(f))) {
      score += 0.8;
      this.indicators.push('Tauri detected');
    }

    // Check for other desktop frameworks
    if (deps?.['@neutralinojs/lib'] || deps?.['nwjs']) {
      score += 0.7;
    }

    return Math.min(score, 1);
  }

  /**
   * Analyze if project is a mobile app
   */
  private analyzeMobileApp(
    packageJson: PackageJson | null,
    files: string[]
  ): number {
    let score = 0;
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };

    // Check for React Native
    if (deps?.['react-native']) {
      score += 0.8;
      this.indicators.push('React Native detected');
    }

    // Check for Flutter (Dart files)
    const hasDartFiles = files.some(f => /\.dart$/.test(f));
    if (hasDartFiles) {
      score += 0.8;
      this.indicators.push('Flutter detected');
    }

    // Check for Ionic
    if (deps?.['@ionic/core'] || deps?.['@ionic/angular'] || deps?.['@ionic/react']) {
      score += 0.6;
      this.indicators.push('Ionic detected');
    }

    // Check for Capacitor
    if (deps?.['@capacitor/core']) {
      score += 0.6;
    }

    return Math.min(score, 1);
  }

  /**
   * Detect API service subtype
   */
  private detectApiSubtype(
    packageJson: PackageJson | null,
    files: string[]
  ): ApiServiceType {
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };

    // Check for GraphQL
    if (deps?.['graphql'] || deps?.['apollo-server'] || deps?.['@apollo/server'] || deps?.['type-graphql']) {
      return 'graphql';
    }

    // Check for gRPC
    if (deps?.['@grpc/grpc-js'] || deps?.['grpc'] || deps?.['grpcio'] || deps?.['@grpc/proto-loader']) {
      return 'grpc';
    }

    // Check for WebSocket
    if (deps?.['ws'] || deps?.['socket.io'] || deps?.['socketio']) {
      return 'websocket';
    }

    // Check for REST patterns
    const hasRestPatterns = files.some(f =>
      /routes?\//.test(f) || /controllers?\//.test(f) || /api\//.test(f)
    );
    if (hasRestPatterns) {
      return 'rest';
    }

    return 'unknown';
  }

  /**
   * Detect web app subtype
   */
  private detectWebSubtype(
    packageJson: PackageJson | null,
    files: string[]
  ): WebAppType {
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };

    // Check for SSR frameworks
    if (deps?.['next'] || deps?.['nuxt'] || deps?.['sveltekit'] || deps?.['@solidjs/start']) {
      return 'ssr';
    }

    // Check for static site generators
    if (deps?.['gatsby'] || deps?.['astro'] || deps?.['eleventy'] || deps?.['hugo-bin']) {
      return 'static';
    }

    // Check for PWA indicators
    if (deps?.['workbox'] || deps?.['@vite-pwa'] || files.some(f => /manifest\.json/.test(f))) {
      return 'pwa';
    }

    // Default to SPA if React/Vue/Svelte without SSR
    if (deps?.['react'] || deps?.['vue'] || deps?.['svelte']) {
      return 'spa';
    }

    return 'unknown';
  }

  /**
   * Build classification result
   */
  private buildClassification(
    category: ProjectCategory,
    confidence: number,
    subtype: ApiServiceType | WebAppType | undefined,
    packageJson: PackageJson | null
  ): ProjectClassification {
    const purpose = this.getPurposeDescription(category, subtype, packageJson);
    const useCases = this.getUseCases(category, subtype);

    return {
      category,
      confidence,
      subtype,
      purpose,
      indicators: [...this.indicators],
      useCases,
    };
  }

  /**
   * Build hybrid classification
   */
  private buildHybridClassification(
    primary: { category: ProjectCategory; subtype?: ApiServiceType | WebAppType; score: number },
    secondary: { category: ProjectCategory; subtype?: ApiServiceType | WebAppType; score: number },
    packageJson: PackageJson | null
  ): ProjectClassification {
    const purpose = `${this.getPurposeDescription(primary.category, primary.subtype, packageJson)} with ${secondary.category} capabilities`;

    return {
      category: 'hybrid',
      confidence: (primary.score + secondary.score) / 2,
      subtype: primary.subtype,
      purpose,
      indicators: [...this.indicators, `Hybrid: ${primary.category} + ${secondary.category}`],
      useCases: [...this.getUseCases(primary.category, primary.subtype), ...this.getUseCases(secondary.category, secondary.subtype)],
    };
  }

  /**
   * Get purpose description
   */
  private getPurposeDescription(
    category: ProjectCategory,
    subtype: ApiServiceType | WebAppType | undefined,
    packageJson: PackageJson | null
  ): string {
    const name = packageJson?.name || 'Project';

    switch (category) {
      case 'api-service':
        return `${name} is an API service${subtype && subtype !== 'unknown' ? ` (${subtype.toUpperCase()})` : ''} that provides backend endpoints for client applications`;
      case 'cli-tool':
        return `${name} is a command-line interface tool designed for terminal/scripting use`;
      case 'web-app':
        return `${name} is a web application${subtype && subtype !== 'unknown' ? ` (${subtype.toUpperCase()})` : ''} running in browsers`;
      case 'library':
        return `${name} is a reusable library/SDK for other developers to import and use`;
      case 'desktop-app':
        return `${name} is a desktop application for Windows/Mac/Linux`;
      case 'mobile-app':
        return `${name} is a mobile application for iOS/Android`;
      case 'script-tool':
        return `${name} is a utility script or automation tool`;
      case 'hybrid':
        return `${name} serves multiple purposes (hybrid project)`;
      default:
        return `${name} purpose could not be determined`;
    }
  }

  /**
   * Get suggested use cases
   */
  private getUseCases(category: ProjectCategory, subtype: ApiServiceType | WebAppType | undefined): string[] {
    switch (category) {
      case 'api-service':
        if (subtype === 'graphql') return ['Data aggregation', 'Microservices gateway', 'BFF pattern'];
        if (subtype === 'grpc') return ['Internal microservices', 'High-performance APIs', 'Mobile backends'];
        if (subtype === 'websocket') return ['Real-time applications', 'Chat systems', 'Live updates'];
        return ['REST API backend', 'Microservices', 'Backend for frontend'];
      case 'cli-tool':
        return ['Developer tooling', 'Automation scripts', 'System administration'];
      case 'web-app':
        if (subtype === 'spa') return ['Interactive dashboards', 'Admin panels', 'User portals'];
        if (subtype === 'ssr') return ['SEO-critical sites', 'E-commerce', 'Content sites'];
        if (subtype === 'static') return ['Documentation sites', 'Landing pages', 'Blogs'];
        if (subtype === 'pwa') return ['Offline-capable apps', 'Mobile-web hybrids', 'Installable web apps'];
        return ['Web-based applications', 'User interfaces', 'Portals'];
      case 'library':
        return ['Reusable components', 'Shared utilities', 'SDK distribution'];
      case 'desktop-app':
        return ['Native desktop experience', 'Offline applications', 'System integration'];
      case 'mobile-app':
        return ['Mobile-first experience', 'App store distribution', 'Native device features'];
      case 'script-tool':
        return ['One-off automation', 'Data processing', 'CI/CD pipelines'];
      default:
        return ['General purpose'];
    }
  }

  /**
   * Load and parse package.json
   */
  private async loadPackageJson(projectPath: string): Promise<PackageJson | null> {
    try {
      const content = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

export default ProjectClassifier;
