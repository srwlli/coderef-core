/**
 * @coderef-semantic: 1.0.0
 * @exports EnrichmentRequest, EnrichedMetadata, LLMEnricherOptions, LLMEnricher, enrichMetadata, enrichBatch
 * @used_by src/semantic/orchestrator.ts, src/semantic/registry-sync.ts
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports EnrichmentRequest, EnrichedMetadata, LLMEnricherOptions, LLMEnricher, enrichMetadata, enrichBatch
 * @used_by src/semantic/orchestrator.ts, src/semantic/registry-sync.ts
 */



/**
 * LLM-based semantic enrichment for CodeRef-Semantics
 *
 * Generates rules and related fields using LLM API (Claude) with graceful fallback
 * for offline operation and rate limit resilience.
 */

import type { ElementData } from '../types/types.js';

export interface EnrichmentRequest {
  file: string;
  exports: string[];
  imports: string[];
  internalDeps: string[];
  externalDeps: string[];
}

export interface EnrichedMetadata {
  rules: string[];
  related: string[];
  constraints: string[];
  confidence: number;
}

export interface LLMEnricherOptions {
  apiKey?: string;
  enabled?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * LLM enricher using Anthropic Claude API
 */
export class LLMEnricher {
  private client: any | null = null;
  private options: LLMEnricherOptions;
  private enabled: boolean;

  constructor(options: LLMEnricherOptions = {}) {
    this.options = {
      enabled: true,
      maxRetries: 3,
      timeoutMs: 10000,
      ...options,
    };

    try {
      const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
      this.enabled = false;
    } catch (error) {
      console.warn('[llm-enricher] Failed to initialize Anthropic client, falling back to offline mode');
      this.enabled = false;
    }
  }

  /**
   * Enrich metadata using LLM with fallback
   */
  async enrich(request: EnrichmentRequest): Promise<EnrichedMetadata> {
    if (!this.enabled || !this.client) {
      return this.fallbackEnrichment(request);
    }

    try {
      const response = await this.callLLM(request);
      return response;
    } catch (error) {
      console.warn(`[llm-enricher] LLM call failed: ${error instanceof Error ? error.message : error}`);
      return this.fallbackEnrichment(request);
    }
  }

  /**
   * Call Claude API with exponential backoff
   */
  private async callLLM(request: EnrichmentRequest): Promise<EnrichedMetadata> {
    if (!this.client) throw new Error('LLM client not initialized');

    const prompt = this.buildPrompt(request);

    for (let attempt = 0; attempt < (this.options.maxRetries || 3); attempt++) {
      try {
        const message = await this.client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText =
          message.content[0].type === 'text' ? message.content[0].text : '';
        return this.parseResponse(responseText);
      } catch (error: any) {
        if (error.status === 429 && attempt < (this.options.maxRetries || 3) - 1) {
          // Exponential backoff for rate limits
          const delayMs = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        throw error;
      }
    }

    throw new Error('LLM enrichment failed after retries');
  }

  /**
   * Build prompt for LLM enrichment
   */
  private buildPrompt(request: EnrichmentRequest): string {
    return `Analyze this module's semantic characteristics and provide structured enrichment metadata.

File: ${request.file}
Exports: ${request.exports.join(', ')}
Imports: ${request.imports.join(', ')}
Internal Dependencies: ${request.internalDeps.join(', ')}
External Dependencies: ${request.externalDeps.join(', ')}

Respond in JSON format:
{
  "rules": ["rule1", "rule2"],
  "related": ["related1", "related2"],
  "constraints": ["constraint1", "constraint2"],
  "confidence": 0.8
}

Focus on:
1. Structural patterns and constraints
2. Related modules by semantic similarity
3. Usage rules derived from the export/import pattern
4. Confidence score (0-1) for the enrichment`;
  }

  /**
   * Parse JSON response from LLM
   */
  private parseResponse(text: string): EnrichedMetadata {
    try {
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        rules: parsed.rules || [],
        related: parsed.related || [],
        constraints: parsed.constraints || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.warn('[llm-enricher] Failed to parse LLM response:', error instanceof Error ? error.message : error);
      return {
        rules: [],
        related: [],
        constraints: [],
        confidence: 0,
      };
    }
  }

  /**
   * Fallback enrichment when LLM unavailable (heuristic-based)
   */
  private fallbackEnrichment(request: EnrichmentRequest): EnrichedMetadata {
    const rules: string[] = [];
    const related: string[] = [];
    const constraints: string[] = [];

    // Rule 1: Public API exports
    if (request.exports.length > 0) {
      rules.push('exports_public_api');
    }

    // Rule 2: Framework integration
    const frameworks = ['react', 'vue', 'angular', 'express', 'fastify'];
    const hasFramework = request.externalDeps.some((d) =>
      frameworks.some((f) => d.toLowerCase().includes(f)),
    );
    if (hasFramework) {
      rules.push('framework_integrated');
    }

    // Rule 3: Heavy dependencies
    if (request.externalDeps.length > 5) {
      rules.push('high_external_deps');
    }

    // Related: Group external dependencies
    related.push(...request.externalDeps.slice(0, 3));

    // Constraints: Derive from patterns
    if (request.exports.length > 10) {
      constraints.push('large_api_surface');
    }
    if (request.imports.length > 15) {
      constraints.push('high_coupling');
    }

    return {
      rules,
      related,
      constraints,
      confidence: 0.6, // Lower confidence for fallback
    };
  }

  /**
   * Check if LLM enrichment is available
   */
  isAvailable(): boolean {
    return this.enabled && this.client !== null;
  }

  async enrichElementData(element: ElementData): Promise<ElementData> {
    const enrichment = await this.enrich({
      file: element.file,
      exports: (element.exports || []).map(item => item.name),
      imports: (element.imports || []).map(item => item.source),
      internalDeps: (element.usedBy || []).map(item => item.file),
      externalDeps: (element.imports || [])
        .map(item => item.source)
        .filter(source => !source.startsWith('.') && !source.startsWith('/')),
    });

    return {
      ...element,
      rules: [
        ...(element.rules || []),
        ...enrichment.rules.map(rule => ({ rule, severity: 'info' as const })),
      ],
      related: [
        ...(element.related || []),
        ...enrichment.related.map(file => ({ file, reason: 'llm-enrichment', confidence: enrichment.confidence })),
      ],
    };
  }
}

/**
 * Convenience function for single enrichment
 */
export async function enrichMetadata(
  request: EnrichmentRequest,
  options?: LLMEnricherOptions,
): Promise<EnrichedMetadata> {
  const enricher = new LLMEnricher(options);
  return enricher.enrich(request);
}

/**
 * Batch enrichment for multiple requests
 */
export async function enrichBatch(
  requests: EnrichmentRequest[],
  options?: LLMEnricherOptions,
): Promise<EnrichedMetadata[]> {
  const enricher = new LLMEnricher(options);
  const results: EnrichedMetadata[] = [];

  for (const request of requests) {
    const result = await enricher.enrich(request);
    results.push(result);
  }

  return results;
}
