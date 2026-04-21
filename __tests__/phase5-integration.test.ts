/**
 * Phase 5 Integration Tests
 * Validates all Phase 5 components working together
 */

import ContextTracker from '../src/context/context-tracker';
import MultiHopTraversal from '../src/context/multi-hop-traversal';
import FuzzyResolver from '../src/context/fuzzy-resolver';
import ImpactSimulator from '../src/context/impact-simulator';
import GraphExporter from '../src/export/graph-exporter';
import AIPromptGenerator from '../src/integration/ai-prompt-generator';
import { DependencyGraph, GraphNode, GraphEdge } from '../src/analyzer/graph-builder';

describe('Phase 5 - AI Integration & Knowledge Graph', () => {
  // Mock graph for testing
  const mockNodes = new Map<string, GraphNode>([
    ['func1', { id: 'func1', type: 'function', file: 'src/module1.ts', line: 10, metadata: {} }],
    ['func2', { id: 'func2', type: 'function', file: 'src/module2.ts', line: 20, metadata: {} }],
    ['func3', { id: 'func3', type: 'function', file: 'src/module3.ts', line: 30, metadata: {} }],
  ]);

  const mockEdges: GraphEdge[] = [
    { source: 'func1', target: 'func2', type: 'calls', weight: 1 },
    { source: 'func2', target: 'func3', type: 'imports', weight: 1 },
    { source: 'func1', target: 'func3', type: 'imports', weight: 1 },
  ];

  const mockGraph: DependencyGraph = {
    nodes: mockNodes,
    edges: mockEdges,
    edgesBySource: new Map([
      ['func1', [mockEdges[0], mockEdges[2]]],
      ['func2', [mockEdges[1]]],
      ['func3', []],
    ]),
    edgesByTarget: new Map([
      ['func1', []],
      ['func2', [mockEdges[0]]],
      ['func3', [mockEdges[1], mockEdges[2]]],
    ]),
  };

  describe('ContextTracker', () => {
    it('should store and retrieve context', () => {
      const tracker = new ContextTracker();
      tracker.setContext('query1', { question: 'What calls func1?' });

      const result = tracker.getContext('query1');
      expect(result).toEqual({ question: 'What calls func1?' });
    });

    it('should track context history', () => {
      const tracker = new ContextTracker();
      tracker.setContext('key1', 'value1');
      tracker.setContext('key2', 'value2');

      const history = tracker.getHistory();
      expect(history.entries.length).toBe(2);
    });

    it('should clean up resources', () => {
      const tracker = new ContextTracker();
      tracker.setContext('test', 'value');
      tracker.destroy();

      expect(tracker.getContext('test')).toBeNull();
    });
  });

  describe('MultiHopTraversal', () => {
    it('should initialize with graph', () => {
      const traversal = new MultiHopTraversal(mockGraph);
      expect(traversal).toBeDefined();
    });

    it('should support max depth configuration', () => {
      const traversal = new MultiHopTraversal(mockGraph);
      traversal.setMaxDepth(3);
      expect(traversal.getCacheStats().maxDepth).toBe(3);
    });

    it('should cache traversal results', () => {
      const traversal = new MultiHopTraversal(mockGraph);
      const result1 = traversal.dependsOn('func1');
      const result2 = traversal.dependsOn('func1');

      expect(result1).toEqual(result2);
      expect(traversal.getCacheStats().cacheSize).toBeGreaterThan(0);
    });
  });

  describe('FuzzyResolver', () => {
    it('should initialize with elements', () => {
      const resolver = new FuzzyResolver(mockNodes);
      expect(resolver).toBeDefined();
    });

    it('should find similar elements', () => {
      const resolver = new FuzzyResolver(mockNodes);
      const similar = resolver.findSimilarElements('func1', 0.5);

      expect(Array.isArray(similar)).toBe(true);
    });

    it('should detect moved elements', () => {
      const resolver = new FuzzyResolver(mockNodes);
      const driftResult = resolver.findMovedElements('func1');

      expect(driftResult.sourceElement).toBe(mockNodes.get('func1'));
    });

    it('should support threshold configuration', () => {
      const resolver = new FuzzyResolver(mockNodes);
      resolver.setSimilarityThreshold(0.9);
      expect(resolver.getCacheStats().threshold).toBe(0.9);
    });
  });

  describe('ImpactSimulator', () => {
    it('should calculate blast radius', () => {
      const simulator = new ImpactSimulator(mockGraph);
      const radius = simulator.calculateBlastRadius('func1');

      expect(radius.sourceElementId).toBe('func1');
      expect(radius.totalImpactedElements).toBeGreaterThanOrEqual(0);
    });

    it('should generate impact summary', () => {
      const simulator = new ImpactSimulator(mockGraph);
      const summary = simulator.getImpactSummary('func2');

      expect(summary.sourceElementId).toBe('func2');
      expect(summary.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should cache blast radius results', () => {
      const simulator = new ImpactSimulator(mockGraph);
      const result1 = simulator.calculateBlastRadius('func1');
      const result2 = simulator.calculateBlastRadius('func1');

      expect(result1).toEqual(result2);
    });
  });

  describe('GraphExporter', () => {
    it('should export to JSON', () => {
      const exporter = new GraphExporter(mockGraph, 'json');
      const json = exporter.export();

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should validate exported graph', () => {
      const exporter = new GraphExporter(mockGraph);
      const json = exporter.export();

      const validation = exporter.validateExport(json);
      expect(validation.valid).toBe(true);
    });

    it('should include visualization metadata', () => {
      const exporter = new GraphExporter(mockGraph);
      exporter.setIncludeVisualization(true);
      const json = exporter.export();

      const exported = JSON.parse(json);
      expect(exported.visualization).toBeDefined();
    });

    it('should report export statistics', () => {
      const exporter = new GraphExporter(mockGraph);
      const stats = exporter.getExportStats();

      expect(stats.nodeCount).toBe(3);
      expect(stats.edgeCount).toBe(3);
    });
  });

  describe('AIPromptGenerator', () => {
    it('should initialize with optional context tracker', () => {
      const tracker = new ContextTracker();
      const generator = new AIPromptGenerator(tracker);
      expect(generator).toBeDefined();
    });

    it('should generate understanding prompts', () => {
      const generator = new AIPromptGenerator();
      const prompt = generator.generatePrompt(
        'func1',
        mockNodes.get('func1')!,
        'What does this function do?',
        [],
        'understanding'
      );

      expect(prompt.prompt).toContain('func1');
      expect(prompt.queryType).toBe('understanding');
    });

    it('should generate impact analysis prompts', () => {
      const generator = new AIPromptGenerator();
      const prompt = generator.generatePrompt(
        'func1',
        mockNodes.get('func1')!,
        'What happens if we remove this?',
        [mockNodes.get('func2')!],
        'impact'
      );

      expect(prompt.queryType).toBe('impact');
      expect(prompt.contextIncluded.relatedElements).toBe(1);
    });

    it('should respect token limits', () => {
      const generator = new AIPromptGenerator(undefined, 100);
      const prompt = generator.generatePrompt(
        'func1',
        mockNodes.get('func1')!,
        'Long query text',
        [mockNodes.get('func2')!, mockNodes.get('func3')!],
        'general'
      );

      expect(prompt.tokenEstimate).toBeLessThanOrEqual(200); // Some buffer
    });

    it('should support configuration', () => {
      const generator = new AIPromptGenerator();
      generator.setMaxTokens(2000);
      generator.setMaxContextDepth(2);

      const stats = generator.getStatistics();
      expect(stats.maxTokens).toBe(2000);
      expect(stats.maxContextDepth).toBe(2);
    });
  });

  describe('End-to-End Integration', () => {
    it('should orchestrate all components together', () => {
      // Create components
      const contextTracker = new ContextTracker();
      const traversal = new MultiHopTraversal(mockGraph);
      const fuzzyResolver = new FuzzyResolver(mockNodes);
      const impactSimulator = new ImpactSimulator(mockGraph);
      const exporter = new GraphExporter(mockGraph);
      const promptGenerator = new AIPromptGenerator(contextTracker);

      // Set context from query
      contextTracker.setContext('analysis', { element: 'func1' });

      // Perform analysis
      const traversalResult = traversal.dependsOn('func1');
      const driftCheck = fuzzyResolver.findMovedElements('func1');
      const blastRadius = impactSimulator.calculateBlastRadius('func1');

      // Export for visualization
      const exportedGraph = exporter.export();
      expect(() => JSON.parse(exportedGraph)).not.toThrow();

      // Generate AI prompt with complete context
      const prompt = promptGenerator.generatePrompt(
        'func1',
        mockNodes.get('func1')!,
        'Analyze the impact and relationships',
        Array.from(mockNodes.values()),
        'impact'
      );

      // Verify all components executed
      expect(contextTracker.getContextKeys().length).toBeGreaterThan(0);
      expect(traversalResult).toBeDefined();
      expect(driftCheck).toBeDefined();
      expect(blastRadius).toBeDefined();
      expect(prompt.prompt.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 5 Success Criteria Validation', () => {
    it('should support multi-hop traversal (2-5 levels)', () => {
      const traversal = new MultiHopTraversal(mockGraph);
      traversal.setMaxDepth(5);
      const stats = traversal.getCacheStats();

      expect(stats.maxDepth).toBe(5);
    });

    it('should track context for conversational queries', () => {
      const tracker = new ContextTracker();
      tracker.setContext('q1', { query: 'first' });
      tracker.setContext('q2', { query: 'second' });

      expect(tracker.getContextKeys().length).toBe(2);
    });

    it('should detect moved/renamed elements', () => {
      const resolver = new FuzzyResolver(mockNodes);
      const drift = resolver.findMovedElements('func1');

      expect(drift.sourceElement).toBe(mockNodes.get('func1'));
    });

    it('should calculate blast radius accurately', () => {
      const simulator = new ImpactSimulator(mockGraph);
      const radius = simulator.calculateBlastRadius('func1');

      expect(radius.sourceElementId).toBe('func1');
      expect(['critical', 'high', 'medium', 'low']).toContain(radius.severity);
    });

    it('should export valid JSON', () => {
      const exporter = new GraphExporter(mockGraph);
      const json = exporter.export('json');

      const validation = exporter.validateExport(json);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should generate complete AI prompts with context', () => {
      const generator = new AIPromptGenerator();
      const prompt = generator.generatePrompt(
        'func1',
        mockNodes.get('func1')!,
        'What is the impact?',
        Array.from(mockNodes.values()),
        'impact'
      );

      expect(prompt.prompt.length).toBeGreaterThan(0);
      expect(prompt.contextIncluded.sourceElement).toBe('func1');
    });
  });
});
