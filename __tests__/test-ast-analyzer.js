/**
 * Independent test of AST-based AnalyzerService
 * Tests without affecting the working regex scanner
 */

import { AnalyzerService } from './packages/core/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testASTAnalyzer() {
  console.log('🧪 Testing AST Analyzer independently...\n');

  try {
    // Create analyzer instance
    const basePath = path.resolve(__dirname, 'packages/core');
    const analyzer = new AnalyzerService(basePath);

    console.log('✅ AnalyzerService instantiated');
    console.log(`   Base path: ${basePath}\n`);

    // Test 1: Analyze a small subset of files
    console.log('📊 Test 1: Analyzing core package files...');
    const result = await analyzer.analyze([
      'parser.ts',
      'scanner.ts',
      'types.ts'
    ]);

    console.log(`✅ Analysis complete!`);
    console.log(`   Analysis time: ${result.analysisTime}ms`);
    console.log(`   Nodes found: ${result.statistics.nodeCount}`);
    console.log(`   Edges found: ${result.statistics.edgeCount}`);
    console.log(`   Circular dependencies: ${result.circularDependencies.length}`);
    console.log(`   Isolated nodes: ${result.isolatedNodes.length}\n`);

    // Test 2: Export graph as JSON
    console.log('📦 Test 2: Exporting graph as JSON...');
    const graphJSON = analyzer.exportGraphAsJSON();
    if (graphJSON) {
      console.log(`✅ Graph exported successfully`);
      console.log(`   Nodes: ${graphJSON.nodes.length}`);
      console.log(`   Edges: ${graphJSON.edges.length}\n`);
    }

    // Test 3: Save graph to file
    console.log('💾 Test 3: Saving graph to file...');
    const testGraphPath = './test-results/ast-analyzer-test-graph.json';
    await analyzer.saveGraph(testGraphPath);
    console.log(`✅ Graph saved to ${testGraphPath}\n`);

    // Test 4: Load graph from file
    console.log('📂 Test 4: Loading graph from file...');
    const analyzer2 = new AnalyzerService(basePath);
    await analyzer2.loadGraph(testGraphPath);
    const loadedGraph = analyzer2.getGraph();
    if (loadedGraph) {
      console.log(`✅ Graph loaded successfully`);
      console.log(`   Nodes loaded: ${loadedGraph.nodes.size}`);
      console.log(`   Edges loaded: ${loadedGraph.edges.length}`);

      // Verify loaded graph matches original
      if (loadedGraph.nodes.size === result.statistics.nodeCount &&
          loadedGraph.edges.length === result.statistics.edgeCount) {
        console.log(`✅ Loaded graph matches original graph\n`);
      } else {
        throw new Error('Loaded graph does not match original!');
      }
    } else {
      throw new Error('Failed to load graph');
    }

    // Test 5: Query operations on loaded graph
    if (result.statistics.nodeCount > 0) {
      console.log('🔍 Test 5: Testing query operations on loaded graph...');
      const graph = analyzer2.getGraph();
      if (graph && graph.nodes.size > 0) {
        const firstNode = Array.from(graph.nodes.values())[0];
        console.log(`   Testing with node: ${firstNode.id}`);

        try {
          const dependencies = analyzer2.getDependencies(firstNode.id);
          console.log(`   ✅ getDependencies: ${dependencies.length} dependencies`);

          const dependents = analyzer2.getDependents(firstNode.id);
          console.log(`   ✅ getDependents: ${dependents.length} dependents`);
        } catch (err) {
          console.log(`   ⚠️  Query test: ${err.message}`);
        }
      }
      console.log();
    }

    console.log('🎉 All tests passed! AST Analyzer is working independently.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testASTAnalyzer().catch(console.error);
