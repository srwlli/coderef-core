/**
 * Graph Exporter - Serialize dependency graph to multiple formats
 * Phase 5, Task P5-T5: Graph Export (JSON, Protobuf for visualization)
 * IMP-CORE-018: Protobuf export implementation
 *
 * Provides:
 * - JSON export for compatibility
 * - Protobuf export with efficient binary serialization
 * - Visualization metadata
 * - Export validation
 */

/**
 * @semantic
 * exports: [ExportFormat, ExportedGraphEdgeRelationship, ExportedGraphEdgeResolutionStatus, ExportedGraph, ProtobufSchema, GraphExporter]
 * used_by: [src/pipeline/generators/graph-output.ts, src/pipeline/graph-builder.ts, src/pipeline/orchestrator.ts, src/pipeline/output-validator.ts, src/pipeline/types.ts, __tests__/generators/helpers.ts, __tests__/generators/root-cause-alignment.test.ts, __tests__/pipeline/call-resolution-determinism.test.ts, __tests__/pipeline/call-resolution-pre-phase3-assertion.test.ts, __tests__/pipeline/call-resolution-two-pass-ordering.test.ts, __tests__/pipeline/graph-construction-determinism.test.ts, __tests__/pipeline/graph-ground-truth.test.ts, __tests__/pipeline/output-validation-determinism.test.ts, __tests__/pipeline/output-validation-graph-integrity.test.ts, __tests__/pipeline/output-validation-semantic-headers.test.ts]
 */

import { DependencyGraph, GraphNode, GraphEdge } from '../analyzer/graph-builder.js';
import protobuf from 'protobufjs';

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'protobuf';

/**
 * Phase 5 canonical edge relationship (re-exported from
 * src/pipeline/graph-builder.ts via type-only import to avoid a
 * circular module dependency with the graph-exporter consumer).
 */
export type ExportedGraphEdgeRelationship =
  | 'import'
  | 'call'
  | 'export'
  | 'header-import';

export type ExportedGraphEdgeResolutionStatus =
  | 'resolved'
  | 'unresolved'
  | 'ambiguous'
  | 'external'
  | 'builtin'
  | 'dynamic'
  | 'typeOnly'
  | 'stale';

/**
 * Exported graph structure.
 *
 * WO-PIPELINE-GRAPH-CONSTRUCTION-001 / Phase 5: edges adopt the
 * 8-field canonical schema (id, sourceId, targetId conditional,
 * relationship, resolutionStatus, evidence, sourceLocation,
 * candidates) per DR-PHASE-5-D. Legacy fields (source, target,
 * type, metadata) are kept populated for backwards-compat consumers
 * during the transition window. A future cleanup workorder removes
 * the legacy fields.
 */
export interface ExportedGraph {
  version: string;
  exportedAt: number;
  nodes: Array<{
    id: string;
    uuid?: string;
    type: string;
    name?: string;
    file?: string;
    line?: number;
    metadata?: Record<string, any>;
  }>;
  edges: Array<{
    // Phase 5 canonical fields (8-field schema):
    /** Required. Deterministic 16-hex-char hash; unique within graph. */
    id?: string;
    /** Required. Canonical codeRefId of source element. */
    sourceId?: string;
    /** Conditional. Canonical codeRefId of target; absent for non-resolved. */
    targetId?: string;
    /** Required. import|call|export|header-import. */
    relationship?: ExportedGraphEdgeRelationship;
    /** Required. resolved|unresolved|ambiguous|external|builtin|dynamic|typeOnly|stale. */
    resolutionStatus?: ExportedGraphEdgeResolutionStatus;
    /** Conditional. Structured evidence keyed by relationship kind. */
    evidence?: Record<string, unknown>;
    /** Conditional. {file, line} of the import/call statement. */
    sourceLocation?: { file: string; line: number };
    /** Conditional. >=2 codeRefIds for resolutionStatus='ambiguous'. */
    candidates?: string[];
    /** Reason string for non-resolved kinds. */
    reason?: string;
    // Legacy compat fields (kept populated through Phase 5):
    /** @deprecated use sourceId instead. */
    source: string;
    /** @deprecated use targetId or evidence.originSpecifier instead. */
    target: string;
    /** @deprecated use relationship instead. */
    type: string;
    weight?: number;
    /** @deprecated structured fields above replace metadata for canonical edges. */
    metadata?: Record<string, any>;
  }>;
  statistics: {
    nodeCount: number;
    edgeCount: number;
    edgesByType: Record<string, number>;
    densityRatio: number;
  };
  visualization?: {
    nodePositions?: Record<string, { x: number; y: number }>;
    nodeColors?: Record<string, string>;
    edgeWeights?: Record<string, number>;
    layoutHints?: Record<string, any>;
  };
}

/**
 * Protobuf schema (stub)
 */
export interface ProtobufSchema {
  version: string;
  reserved: string[];
  messages: Record<string, any>;
}

export class GraphExporter {
  private graph: DependencyGraph;
  private exportFormat: ExportFormat = 'json';
  private includeVisualization: boolean = true;
  private nodePositionCache: Map<string, { x: number; y: number }> = new Map();

  constructor(graph: DependencyGraph, format: ExportFormat = 'json') {
    this.graph = graph;
    this.exportFormat = format;
  }

  /**
   * Export graph to specified format
   */
  export(format?: ExportFormat): string | Buffer {
    const fmt = format || this.exportFormat;

    if (fmt === 'json') {
      return this.exportAsJSON();
    } else if (fmt === 'protobuf') {
      return this.exportAsProtobuf();
    } else {
      throw new Error(`Unsupported export format: ${fmt}`);
    }
  }

  /**
   * Export graph as Protobuf binary and encode as base64 string
   * Useful for transmission in JSON payloads
   */
  exportAsProtobufBase64(): string {
    const buffer = this.exportAsProtobuf();
    return buffer.toString('base64');
  }

  /**
   * Export graph as JSON
   */
  private exportAsJSON(): string {
    const exported = this.buildExportedGraph();
    return JSON.stringify(exported, null, 2);
  }

  /**
   * IMP-CORE-018: Export graph as Protobuf binary format
   * Uses protobufjs for efficient binary serialization
   */
  private exportAsProtobuf(): Buffer {
    const root = this.buildProtobufSchema();
    const GraphMessage = root.lookupType('coderef.Graph');
    
    const graphData = this.buildProtobufData();
    const message = GraphMessage.create(graphData);
    
    // Encode to binary buffer
    const buffer = GraphMessage.encode(message).finish();
    return Buffer.from(buffer);
  }

  /**
   * Build protobuf schema definition
   */
  private buildProtobufSchema(): protobuf.Root {
    const root = new protobuf.Root();
    
    // Define Node message
    const Node = new protobuf.Type('Node')
      .add(new protobuf.Field('id', 1, 'string'))
      .add(new protobuf.Field('uuid', 2, 'string', { optional: true }))
      .add(new protobuf.Field('type', 3, 'string'))
      .add(new protobuf.Field('name', 4, 'string', { optional: true }))
      .add(new protobuf.Field('file', 5, 'string', { optional: true }))
      .add(new protobuf.Field('line', 6, 'int32', { optional: true }));

    // Define Edge message
    const Edge = new protobuf.Type('Edge')
      .add(new protobuf.Field('source', 1, 'string'))
      .add(new protobuf.Field('target', 2, 'string'))
      .add(new protobuf.Field('type', 3, 'string'))
      .add(new protobuf.Field('weight', 4, 'int32', { optional: true, default: 1 }));

    // Define Statistics message
    const Statistics = new protobuf.Type('Statistics')
      .add(new protobuf.Field('nodeCount', 1, 'int32'))
      .add(new protobuf.Field('edgeCount', 2, 'int32'))
      .add(new protobuf.Field('densityRatio', 3, 'float'));

    // Define Graph message
    const Graph = new protobuf.Type('Graph')
      .add(new protobuf.Field('version', 1, 'string'))
      .add(new protobuf.Field('exportedAt', 2, 'int64'))
      .add(new protobuf.Field('nodes', 3, 'Node', { repeated: true }))
      .add(new protobuf.Field('edges', 4, 'Edge', { repeated: true }))
      .add(new protobuf.Field('statistics', 5, 'Statistics'));

    // Add nested types to Graph
    Graph.add(Node);
    Graph.add(Edge);
    Graph.add(Statistics);

    // Add to root
    root.define('coderef.Graph', Graph);
    
    return root;
  }

  /**
   * Build data structure for protobuf serialization
   */
  private buildProtobufData(): object {
    const nodes = this.buildNodeArray();
    const edges = this.buildEdgeArray();
    const statistics = this.calculateStatistics();

    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      nodes: nodes.map(n => ({
        id: n.id,
        uuid: n.uuid || undefined,
        type: n.type,
        name: n.name || undefined,
        file: n.file || undefined,
        line: n.line || undefined,
      })),
      edges: edges.map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
        weight: e.weight || 1,
      })),
      statistics: {
        nodeCount: statistics.nodeCount,
        edgeCount: statistics.edgeCount,
        densityRatio: statistics.densityRatio,
      },
    };
  }

  /**
   * Build exported graph structure
   */
  private buildExportedGraph(): ExportedGraph {
    const nodes = this.buildNodeArray();
    const edges = this.buildEdgeArray();
    const statistics = this.calculateStatistics();
    const visualization = this.includeVisualization ? this.buildVisualizationData() : undefined;

    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      nodes,
      edges,
      statistics,
      visualization,
    };
  }

  /**
   * Build nodes array
   */
  private buildNodeArray(): ExportedGraph['nodes'] {
    const nodes: ExportedGraph['nodes'] = [];

    for (const [nodeId, node] of this.graph.nodes.entries()) {
      nodes.push({
        id: nodeId,
        uuid: node.uuid,
        type: node.type,
        name: node.name,
        file: node.file,
        line: node.line,
        metadata: node.metadata,
      });
    }

    return nodes;
  }

  /**
   * Build edges array
   */
  private buildEdgeArray(): ExportedGraph['edges'] {
    const edges: ExportedGraph['edges'] = [];

    for (const edge of this.graph.edges) {
      edges.push({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        weight: edge.weight || 1,
        metadata: edge.metadata,
      });
    }

    return edges;
  }

  /**
   * Calculate graph statistics
   */
  private calculateStatistics(): ExportedGraph['statistics'] {
    const edgesByType: Record<string, number> = {};

    for (const edge of this.graph.edges) {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    }

    const nodeCount = this.graph.nodes.size;
    const edgeCount = this.graph.edges.length;
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    const densityRatio = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    return {
      nodeCount,
      edgeCount,
      edgesByType,
      densityRatio,
    };
  }

  /**
   * Build visualization metadata
   */
  private buildVisualizationData(): ExportedGraph['visualization'] {
    return {
      nodePositions: this.calculateNodePositions(),
      nodeColors: this.calculateNodeColors(),
      edgeWeights: this.calculateEdgeWeights(),
      layoutHints: this.generateLayoutHints(),
    };
  }

  /**
   * Calculate node positions using force-directed layout algorithm
   */
  private calculateNodePositions(): Record<string, { x: number; y: number }> {
    const positions: Record<string, { x: number; y: number }> = {};
    const velocities: Record<string, { x: number; y: number }> = {};
    const nodeArray = Array.from(this.graph.nodes.keys());
    
    if (nodeArray.length === 0) return positions;
    if (nodeArray.length === 1) {
      positions[nodeArray[0]] = { x: 0, y: 0 };
      return positions;
    }

    // Initialize with circular layout as starting positions
    const radius = Math.max(500, nodeArray.length * 50);
    for (let i = 0; i < nodeArray.length; i++) {
      const angle = (i / nodeArray.length) * 2 * Math.PI;
      positions[nodeArray[i]] = { 
        x: radius * Math.cos(angle), 
        y: radius * Math.sin(angle) 
      };
      velocities[nodeArray[i]] = { x: 0, y: 0 };
    }

    // Build edge lookup for attractive forces
    const edgeSet = new Set<string>();
    for (const edge of this.graph.edges.values()) {
      edgeSet.add(`${edge.source}->${edge.target}`);
      edgeSet.add(`${edge.target}->${edge.source}`); // Undirected for layout
    }

    // Force-directed simulation parameters
    const iterations = 100;
    const repulsionStrength = 10000;
    const springLength = 200;
    const springStrength = 0.05;
    const centerStrength = 0.01;
    const damping = 0.9;
    const minDistance = 50;
    const maxDistance = 1000;

    // Run simulation
    for (let iter = 0; iter < iterations; iter++) {
      const forces: Record<string, { x: number; y: number }> = {};
      
      // Initialize forces
      for (const nodeId of nodeArray) {
        forces[nodeId] = { x: 0, y: 0 };
      }

      // Calculate repulsive forces (Coulomb's law)
      for (let i = 0; i < nodeArray.length; i++) {
        for (let j = i + 1; j < nodeArray.length; j++) {
          const nodeA = nodeArray[i];
          const nodeB = nodeArray[j];
          const posA = positions[nodeA];
          const posB = positions[nodeB];

          const dx = posA.x - posB.x;
          const dy = posA.y - posB.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < minDistance) distance = minDistance;
          if (distance > maxDistance) continue; // Skip distant nodes for performance

          const force = repulsionStrength / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          forces[nodeA].x += fx;
          forces[nodeA].y += fy;
          forces[nodeB].x -= fx;
          forces[nodeB].y -= fy;
        }
      }

      // Calculate attractive forces (spring force along edges)
      for (const edge of this.graph.edges.values()) {
        const sourcePos = positions[edge.source];
        const targetPos = positions[edge.target];
        
        if (!sourcePos || !targetPos) continue;

        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) continue;

        // Spring force: proportional to distance from ideal length
        const displacement = distance - springLength;
        const force = displacement * springStrength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        forces[edge.source].x += fx;
        forces[edge.source].y += fy;
        forces[edge.target].x -= fx;
        forces[edge.target].y -= fy;
      }

      // Apply centering force (pull toward origin)
      for (const nodeId of nodeArray) {
        const pos = positions[nodeId];
        const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        if (distance > 0) {
          forces[nodeId].x -= (pos.x / distance) * distance * centerStrength;
          forces[nodeId].y -= (pos.y / distance) * distance * centerStrength;
        }
      }

      // Update velocities and positions
      for (const nodeId of nodeArray) {
        const vel = velocities[nodeId];
        const force = forces[nodeId];

        // Update velocity with damping
        vel.x = (vel.x + force.x) * damping;
        vel.y = (vel.y + force.y) * damping;

        // Update position
        positions[nodeId].x += vel.x;
        positions[nodeId].y += vel.y;

        // Limit maximum velocity
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        const maxSpeed = 50;
        if (speed > maxSpeed) {
          vel.x = (vel.x / speed) * maxSpeed;
          vel.y = (vel.y / speed) * maxSpeed;
        }
      }
    }

    return positions;
  }

  /**
   * Calculate node colors based on type
   */
  private calculateNodeColors(): Record<string, string> {
    const colors: Record<string, string> = {};
    const colorMap: Record<string, string> = {
      'function': '#4CAF50',
      'class': '#2196F3',
      'interface': '#9C27B0',
      'module': '#FF9800',
      'file': '#757575',
      'unknown': '#BDBDBD',
    };

    for (const [nodeId, node] of this.graph.nodes.entries()) {
      colors[nodeId] = colorMap[node.type] || colorMap['unknown'];
    }

    return colors;
  }

  /**
   * Calculate edge weights
   */
  private calculateEdgeWeights(): Record<string, number> {
    const weights: Record<string, number> = {};

    for (let i = 0; i < this.graph.edges.length; i++) {
      const edge = this.graph.edges[i];
      const edgeKey = `${edge.source}-${edge.target}`;
      weights[edgeKey] = edge.weight || 1;
    }

    return weights;
  }

  /**
   * Generate layout hints for visualization
   */
  private generateLayoutHints(): Record<string, any> {
    return {
      algorithm: 'force-directed',
      iterations: 100,
      springLength: 100,
      repulsionStrength: 5000,
      centerX: 0,
      centerY: 0,
      zoomLevel: 1.0,
      recommendedCanvasSize: {
        width: 1200,
        height: 800,
      },
    };
  }

  /**
   * Validate exported graph
   */
  validateExport(json: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const data = JSON.parse(json);

      // Check required fields
      if (!data.version) errors.push('Missing version field');
      if (!data.exportedAt) errors.push('Missing exportedAt field');
      if (!Array.isArray(data.nodes)) errors.push('nodes must be an array');
      if (!Array.isArray(data.edges)) errors.push('edges must be an array');
      if (!data.statistics) errors.push('Missing statistics object');

      // Validate nodes
      for (let i = 0; i < data.nodes.length; i++) {
        const node = data.nodes[i];
        if (!node.id) errors.push(`Node ${i} missing id`);
        if (!node.type) errors.push(`Node ${i} missing type`);
      }

      // Validate edges
      for (let i = 0; i < data.edges.length; i++) {
        const edge = data.edges[i];
        if (!edge.source) errors.push(`Edge ${i} missing source`);
        if (!edge.target) errors.push(`Edge ${i} missing target`);
        if (!edge.type) errors.push(`Edge ${i} missing type`);
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to parse JSON: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Set export format
   */
  setFormat(format: ExportFormat): void {
    this.exportFormat = format;
  }

  /**
   * Set whether to include visualization data
   */
  setIncludeVisualization(include: boolean): void {
    this.includeVisualization = include;
  }

  /**
   * Get export statistics
   */
  getExportStats(): Record<string, any> {
    return {
      format: this.exportFormat,
      includeVisualization: this.includeVisualization,
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.length,
      estimatedJsonSize: JSON.stringify(this.buildExportedGraph()).length,
    };
  }
}

export default GraphExporter;
