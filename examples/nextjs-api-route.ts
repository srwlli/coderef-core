/**
 * Next.js API Route Integration Example
 *
 * Purpose: Demonstrate how to integrate @coderef/core scanner in Next.js API routes
 * Context: WO-CORE-DASHBOARD-INTEGRATION-001 (PKG-006)
 *
 * This example shows:
 * 1. How to create a POST /api/scan endpoint using @coderef/core
 * 2. Proper error handling and validation
 * 3. Type-safe request/response patterns
 * 4. Integration with existing API patterns (ApiResponse<T>)
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanCurrentElements, type ElementData, type ScanOptions } from '@coderef/core';
import path from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Standard API response envelope
 * Matches dashboard's existing ApiResponse<T> pattern
 */
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
};

/**
 * Scan request payload
 */
type ScanRequest = {
  projectPath: string;
  options?: {
    lang?: string[];
    recursive?: boolean;
    exclude?: string[];
  };
};

/**
 * Scan result with summary statistics
 */
type ScanResult = {
  elements: ElementData[];
  summary: {
    total: number;
    byType: Record<string, number>;
    byFile: Record<string, number>;
    exported: number;
    private: number;
  };
  metadata: {
    projectPath: string;
    scannedAt: string;
    duration: number;
  };
};

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/scan
 *
 * Scans a project directory for code elements using @coderef/core scanner
 *
 * @example
 * fetch('/api/scan', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     projectPath: 'C:\\Users\\user\\project\\src',
 *     options: {
 *       lang: ['ts', 'tsx'],
 *       recursive: true,
 *       exclude: ['node_modules/**', 'dist/**']
 *     }
 *   })
 * });
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ScanResult>>> {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: ScanRequest = await request.json();

    // Validate request
    const validation = validateScanRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error!,
            details: validation.details
          }
        },
        { status: 400 }
      );
    }

    const { projectPath, options = {} } = body;

    // Prepare scan options
    const scanOptions: ScanOptions = {
      recursive: options.recursive ?? true,
      exclude: options.exclude || [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.next/**',
        'coverage/**',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      verbose: false
    };

    // Execute scan
    const elements = await scanCurrentElements(
      projectPath,
      options.lang || ['ts', 'tsx', 'js', 'jsx'],
      scanOptions
    );

    // Calculate summary statistics
    const summary = calculateSummary(elements);
    const duration = Date.now() - startTime;

    // Build response
    const result: ScanResult = {
      elements,
      summary,
      metadata: {
        projectPath,
        scannedAt: new Date().toISOString(),
        duration
      }
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Scan failed:', error);

    // Map error to appropriate HTTP status and error code
    const { statusCode, errorCode, message } = mapErrorToResponse(error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message,
          details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        }
      },
      { status: statusCode }
    );
  }
}

// ============================================================================
// Validation
// ============================================================================

type ValidationResult = {
  valid: boolean;
  error?: string;
  details?: any;
};

/**
 * Validates scan request payload
 */
function validateScanRequest(body: ScanRequest): ValidationResult {
  // Check projectPath exists
  if (!body.projectPath) {
    return {
      valid: false,
      error: 'projectPath is required',
      details: { field: 'projectPath', issue: 'missing' }
    };
  }

  // Check projectPath is string
  if (typeof body.projectPath !== 'string') {
    return {
      valid: false,
      error: 'projectPath must be a string',
      details: { field: 'projectPath', issue: 'invalid_type', received: typeof body.projectPath }
    };
  }

  // Check projectPath is absolute (CRITICAL for dashboard integration)
  if (!path.isAbsolute(body.projectPath)) {
    return {
      valid: false,
      error: 'projectPath must be an absolute path',
      details: {
        field: 'projectPath',
        issue: 'relative_path',
        received: body.projectPath,
        hint: 'Dashboard runs in different directory than scanned projects - use absolute paths'
      }
    };
  }

  // Validate options.lang if provided
  if (body.options?.lang) {
    if (!Array.isArray(body.options.lang)) {
      return {
        valid: false,
        error: 'options.lang must be an array',
        details: { field: 'options.lang', issue: 'invalid_type' }
      };
    }

    const validExtensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs'];
    const invalidLangs = body.options.lang.filter(lang => !validExtensions.includes(lang));

    if (invalidLangs.length > 0) {
      return {
        valid: false,
        error: 'Invalid language extensions',
        details: {
          field: 'options.lang',
          issue: 'unsupported_languages',
          invalid: invalidLangs,
          supported: validExtensions
        }
      };
    }
  }

  // Validate options.exclude if provided
  if (body.options?.exclude) {
    if (!Array.isArray(body.options.exclude)) {
      return {
        valid: false,
        error: 'options.exclude must be an array',
        details: { field: 'options.exclude', issue: 'invalid_type' }
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// Error Mapping
// ============================================================================

/**
 * Maps scanner errors to HTTP status codes and error codes
 */
function mapErrorToResponse(error: any): {
  statusCode: number;
  errorCode: string;
  message: string;
} {
  // Directory not found
  if (error.code === 'ENOENT') {
    return {
      statusCode: 404,
      errorCode: 'DIRECTORY_NOT_FOUND',
      message: `Project directory not found: ${error.path || 'unknown'}`
    };
  }

  // Permission denied
  if (error.code === 'EACCES') {
    return {
      statusCode: 403,
      errorCode: 'PERMISSION_DENIED',
      message: `Permission denied accessing: ${error.path || 'unknown'}`
    };
  }

  // File read error
  if (error.code === 'EISDIR' || error.code === 'ENOTDIR') {
    return {
      statusCode: 400,
      errorCode: 'INVALID_PATH',
      message: `Invalid path: ${error.message}`
    };
  }

  // Timeout (if scan takes too long)
  if (error.code === 'ETIMEDOUT') {
    return {
      statusCode: 408,
      errorCode: 'SCAN_TIMEOUT',
      message: 'Scan operation timed out - project may be too large'
    };
  }

  // Default: internal server error
  return {
    statusCode: 500,
    errorCode: 'SCAN_FAILED',
    message: error.message || 'An unexpected error occurred during scanning'
  };
}

// ============================================================================
// Summary Calculation
// ============================================================================

/**
 * Calculates summary statistics from scan results
 */
function calculateSummary(elements: ElementData[]): ScanResult['summary'] {
  const summary: ScanResult['summary'] = {
    total: elements.length,
    byType: {},
    byFile: {},
    exported: 0,
    private: 0
  };

  for (const element of elements) {
    // Count by type
    summary.byType[element.type] = (summary.byType[element.type] || 0) + 1;

    // Count by file
    summary.byFile[element.file] = (summary.byFile[element.file] || 0) + 1;

    // Count exported vs private
    if (element.exported) {
      summary.exported++;
    } else {
      summary.private++;
    }
  }

  return summary;
}

// ============================================================================
// Alternative: Streaming Response (for large projects)
// ============================================================================

/**
 * Alternative implementation using Server-Sent Events for real-time progress
 *
 * Useful for large projects (1000+ files) where scan takes >3 seconds
 *
 * @example
 * // Client-side
 * const eventSource = new EventSource('/api/scan/stream?projectPath=...');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log(`Progress: ${data.progress}%`);
 * };
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get('projectPath');

  if (!projectPath || !path.isAbsolute(projectPath)) {
    return NextResponse.json(
      { error: 'Invalid projectPath' },
      { status: 400 }
    );
  }

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send start event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event: 'start', projectPath })}\n\n`)
        );

        // Execute scan (note: current scanner doesn't support progress callbacks)
        const elements = await scanCurrentElements(projectPath);

        // Send result event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              event: 'complete',
              elements,
              summary: calculateSummary(elements)
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        // Send error event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              event: 'error',
              error: (error as Error).message
            })}\n\n`
          )
        );
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

// ============================================================================
// Client-Side Usage Example
// ============================================================================

/**
 * Example React component using the scan API
 *
 * @example
 * import { ScanButton } from './ScanButton';
 *
 * function MyPage() {
 *   return <ScanButton projectPath="C:\\projects\\my-app" />;
 * }
 */
/*
'use client';

import { useState } from 'react';

export function ScanButton({ projectPath }: { projectPath: string }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setError(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          options: {
            lang: ['ts', 'tsx'],
            recursive: true,
            exclude: ['node_modules/**', 'dist/**']
          }
        })
      });

      const data: ApiResponse<ScanResult> = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.error?.message || 'Scan failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <button onClick={handleScan} disabled={scanning}>
        {scanning ? 'Scanning...' : 'Scan Project'}
      </button>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {result && (
        <div>
          <h3>Scan Complete</h3>
          <p>Total elements: {result.summary.total}</p>
          <p>Duration: {result.metadata.duration}ms</p>
          <pre>{JSON.stringify(result.summary.byType, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
*/

// ============================================================================
// Testing Example
// ============================================================================

/**
 * Example test for the scan API route
 *
 * @example
 * npm test -- nextjs-api-route.test.ts
 */
/*
import { describe, it, expect } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

describe('POST /api/scan', () => {
  it('should scan project and return results', async () => {
    const request = new NextRequest('http://localhost:3000/api/scan', {
      method: 'POST',
      body: JSON.stringify({
        projectPath: 'C:\\Users\\user\\project\\src',
        options: {
          lang: ['ts', 'tsx'],
          recursive: true
        }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data?.elements).toBeDefined();
    expect(data.data?.summary.total).toBeGreaterThan(0);
  });

  it('should reject relative paths', async () => {
    const request = new NextRequest('http://localhost:3000/api/scan', {
      method: 'POST',
      body: JSON.stringify({
        projectPath: './src'  // Relative path - should fail
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });
});
*/
