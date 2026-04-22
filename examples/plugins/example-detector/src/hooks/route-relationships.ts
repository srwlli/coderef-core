/**
 * Route Relationships Hook
 * Example plugin hook for CodeRef
 *
 * Adds graph edges between FastAPI routes and their dependencies.
 * Demonstrates the GraphHook interface implementation.
 */

// Example: In a real plugin, use: import { GraphHook, GraphBuilderContext, CustomEdge } from '@coderef/core/plugins/types';
// For this example, we define the interfaces inline:

interface CustomEdge {
  from: string;
  to: string;
  type: string;
  metadata?: Record<string, any>;
}

interface CodeElement {
  id?: string;
  uuid?: string;
  name: string;
  type: string;
  file: string;
  line: number;
  metadata?: Record<string, any>;
}

interface GraphBuilderContext {
  findElement(uuid: string): CodeElement | undefined;
  findByType(type: string): CodeElement[];
  findByFile(file: string): CodeElement[];
  hasEdge(from: string, to: string, type?: string): boolean;
}

interface GraphHook {
  name: string;
  execute(elements: CodeElement[], graph: GraphBuilderContext): CustomEdge[];
}

/**
 * Graph hook that adds edges between FastAPI routes and their handler dependencies
 */
export const routeRelationshipsHook: GraphHook = {
  name: 'add-route-relationships',

  /**
   * Execute hook to add route relationship edges
   * @param elements - All discovered code elements
   * @param graph - Graph builder context
   * @returns Custom edges to add
   */
  execute(elements: CodeElement[], graph: GraphBuilderContext): CustomEdge[] {
    const edges: CustomEdge[] = [];

    // Find all FastAPI route elements
    const routeElements = elements.filter(el =>
      el.metadata?.framework === 'fastapi' && el.metadata?.route
    );

    for (const route of routeElements) {
      const routeUuid = route.uuid || route.id || `${route.file}:${route.name}`;

      // Find functions in the same file that might be dependencies
      const fileFunctions = graph.findByFile(route.file).filter(el =>
        el.type === 'function' && el.name !== route.name
      );

      // Add edges to functions that are likely dependencies
      // (simplified heuristic: functions called in route handler)
      for (const func of fileFunctions) {
        const funcUuid = func.uuid || func.id || `${func.file}:${func.name}`;

        // Skip if edge already exists
        if (graph.hasEdge(routeUuid, funcUuid, 'uses')) {
          continue;
        }

        edges.push({
          from: routeUuid,
          to: funcUuid,
          type: 'uses',
          metadata: {
            source: 'fastapi-route-relationships',
            route: route.metadata?.route,
            reason: 'potential-handler-dependency'
          }
        });
      }
    }

    return edges;
  }
};

// Default export
export default routeRelationshipsHook;
