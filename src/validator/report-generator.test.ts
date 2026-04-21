/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Report Generator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  formatIssueSummary,
  formatIssueDetails,
  formatRecommendations,
  formatAutoFixSection,
  generateMarkdownReport
} from './report-generator.js';
import type { RouteValidation, ValidationIssue } from '../types/types.js';

describe('formatIssueSummary', () => {
  it('should format summary with correct totals', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 10,
      totalServerRoutes: 8,
      matchedRoutes: 7,
      issues: [],
      summary: {
        critical: 2,
        warnings: 3,
        info: 1
      }
    };

    const result = formatIssueSummary(report);

    expect(result).toContain('**Total Issues:** 6');
    expect(result).toContain('🔴 Critical: 2');
    expect(result).toContain('🟡 Warnings: 3');
    expect(result).toContain('🔵 Info: 1');
    expect(result).toContain('Frontend API Calls: 10');
    expect(result).toContain('Server Routes: 8');
    expect(result).toContain('Matched Routes: 7');
  });

  it('should calculate match rate correctly', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 10,
      totalServerRoutes: 10,
      matchedRoutes: 8,
      issues: [],
      summary: {
        critical: 0,
        warnings: 0,
        info: 0
      }
    };

    const result = formatIssueSummary(report);

    expect(result).toContain('Match Rate: 80%');
  });

  it('should handle zero frontend calls', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 0,
      totalServerRoutes: 5,
      matchedRoutes: 0,
      issues: [],
      summary: {
        critical: 0,
        warnings: 0,
        info: 0
      }
    };

    const result = formatIssueSummary(report);

    expect(result).toContain('Match Rate: 0%');
  });
});

describe('formatIssueDetails', () => {
  it('should display message when no issues found', () => {
    const issues: ValidationIssue[] = [];

    const result = formatIssueDetails(issues);

    expect(result).toContain('No issues found');
    expect(result).toContain('All frontend calls have matching server routes');
  });

  it('should format critical issues', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'missing_route',
        severity: 'critical',
        message: 'No server route found for GET /api/users',
        frontendCall: {
          path: '/api/users',
          method: 'GET',
          file: 'app.tsx',
          line: 10,
          callType: 'fetch',
          confidence: 100
        }
      }
    ];

    const result = formatIssueDetails(issues);

    expect(result).toContain('Critical Issues');
    expect(result).toContain('[MISSING_ROUTE]');
    expect(result).toContain('No server route found');
    expect(result).toContain('app.tsx:10');
    expect(result).toContain('GET /api/users');
  });

  it('should format warnings', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'unused_route',
        severity: 'warning',
        message: 'Server route not used',
        serverRoute: {
          path: '/api/posts',
          methods: ['GET'],
          framework: 'express'
        }
      }
    ];

    const result = formatIssueDetails(issues);

    expect(result).toContain('Warnings');
    expect(result).toContain('[UNUSED_ROUTE]');
    expect(result).toContain('/api/posts');
    expect(result).toContain('express');
  });

  it('should group issues by severity', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'missing_route',
        severity: 'critical',
        message: 'Critical issue'
      },
      {
        type: 'unused_route',
        severity: 'warning',
        message: 'Warning issue'
      },
      {
        type: 'path_mismatch',
        severity: 'info',
        message: 'Info issue'
      }
    ];

    const result = formatIssueDetails(issues);

    expect(result).toContain('Critical Issues');
    expect(result).toContain('Warnings');
    expect(result).toContain('Info');
  });

  it('should include suggestions when present', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'missing_route',
        severity: 'critical',
        message: 'No route found',
        suggestion: 'Add a server route handler'
      }
    ];

    const result = formatIssueDetails(issues);

    expect(result).toContain('Suggestion:');
    expect(result).toContain('Add a server route handler');
  });
});

describe('formatRecommendations', () => {
  it('should recommend fixing low match rate', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 10,
      totalServerRoutes: 10,
      matchedRoutes: 6,
      issues: [],
      summary: {
        critical: 0,
        warnings: 0,
        info: 0
      }
    };

    const result = formatRecommendations(report);

    expect(result).toContain('Low Match Rate');
    expect(result).toContain('Less than 70%');
  });

  it('should recommend reviewing moderate match rate', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 10,
      totalServerRoutes: 10,
      matchedRoutes: 8,
      issues: [],
      summary: {
        critical: 0,
        warnings: 0,
        info: 0
      }
    };

    const result = formatRecommendations(report);

    expect(result).toContain('Moderate Match Rate');
  });

  it('should praise good match rate', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 10,
      totalServerRoutes: 10,
      matchedRoutes: 9,
      issues: [],
      summary: {
        critical: 0,
        warnings: 0,
        info: 0
      }
    };

    const result = formatRecommendations(report);

    expect(result).toContain('Good Match Rate');
  });

  it('should warn about critical issues', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 10,
      totalServerRoutes: 10,
      matchedRoutes: 9,
      issues: [],
      summary: {
        critical: 3,
        warnings: 0,
        info: 0
      }
    };

    const result = formatRecommendations(report);

    expect(result).toContain('Critical Issues Found');
    expect(result).toContain('3 critical issue(s)');
  });

  it('should mention unused routes', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 10,
      totalServerRoutes: 10,
      matchedRoutes: 9,
      issues: [
        { type: 'unused_route', severity: 'warning', message: 'unused 1' },
        { type: 'unused_route', severity: 'warning', message: 'unused 2' }
      ],
      summary: {
        critical: 0,
        warnings: 2,
        info: 0
      }
    };

    const result = formatRecommendations(report);

    expect(result).toContain('Unused Routes');
    expect(result).toContain('2 server route(s)');
  });

  it('should display good match rate when perfect', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 10,
      totalServerRoutes: 10,
      matchedRoutes: 10,
      issues: [],
      summary: {
        critical: 0,
        warnings: 0,
        info: 0
      }
    };

    const result = formatRecommendations(report);

    expect(result).toContain('Good Match Rate');
    expect(result).toContain('Most frontend calls have matching server routes');
  });
});

describe('formatAutoFixSection', () => {
  it('should return empty string if no missing routes', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'unused_route',
        severity: 'warning',
        message: 'Unused route'
      }
    ];

    const result = formatAutoFixSection(issues);

    expect(result).toBe('');
  });

  it('should generate Express code suggestion', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'missing_route',
        severity: 'critical',
        message: 'No route found',
        frontendCall: {
          path: '/api/users',
          method: 'POST',
          file: 'app.tsx',
          line: 10,
          callType: 'fetch',
          confidence: 100
        }
      }
    ];

    const result = formatAutoFixSection(issues);

    expect(result).toContain('Auto-Fix Suggestions');
    expect(result).toContain('Express:');
    expect(result).toContain("app.post('/api/users'");
    expect(result).toContain('POST /api/users');
  });

  it('should generate Next.js code suggestion', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'missing_route',
        severity: 'critical',
        message: 'No route found',
        frontendCall: {
          path: '/api/boards',
          method: 'GET',
          file: 'app.tsx',
          line: 10,
          callType: 'fetch',
          confidence: 100
        }
      }
    ];

    const result = formatAutoFixSection(issues);

    expect(result).toContain('Next.js (App Router):');
    expect(result).toContain('app/api/boards/route.ts');
    expect(result).toContain('export async function GET()');
  });

  it('should handle multiple missing routes', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'missing_route',
        severity: 'critical',
        message: 'No route found',
        frontendCall: {
          path: '/api/users',
          method: 'GET',
          file: 'app.tsx',
          line: 10,
          callType: 'fetch',
          confidence: 100
        }
      },
      {
        type: 'missing_route',
        severity: 'critical',
        message: 'No route found',
        frontendCall: {
          path: '/api/posts',
          method: 'POST',
          file: 'app.tsx',
          line: 20,
          callType: 'fetch',
          confidence: 100
        }
      }
    ];

    const result = formatAutoFixSection(issues);

    expect(result).toContain('GET /api/users');
    expect(result).toContain('POST /api/posts');
  });
});

describe('generateMarkdownReport', () => {
  it('should generate complete markdown report', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 10,
      totalServerRoutes: 8,
      matchedRoutes: 7,
      issues: [
        {
          type: 'missing_route',
          severity: 'critical',
          message: 'No route found',
          frontendCall: {
            path: '/api/users',
            method: 'GET',
            file: 'app.tsx',
            line: 10,
            callType: 'fetch',
            confidence: 100
          }
        }
      ],
      summary: {
        critical: 1,
        warnings: 0,
        info: 0
      }
    };

    const result = generateMarkdownReport(report);

    expect(result).toContain('# Route Validation Report');
    expect(result).toContain('## Summary');
    expect(result).toContain('## Issues');
    expect(result).toContain('## Recommendations');
    expect(result).toContain('## Auto-Fix Suggestions');
    expect(result).toContain('## Next Steps');
    expect(result).toContain('Generated:');
  });

  it('should include timestamp', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 0,
      totalServerRoutes: 0,
      matchedRoutes: 0,
      issues: [],
      summary: {
        critical: 0,
        warnings: 0,
        info: 0
      }
    };

    const result = generateMarkdownReport(report);

    expect(result).toMatch(/\*\*Generated:\*\* \d{4}-\d{2}-\d{2}T/);
  });

  it('should not include auto-fix section if no missing routes', () => {
    const report: RouteValidation = {
      totalFrontendCalls: 10,
      totalServerRoutes: 10,
      matchedRoutes: 10,
      issues: [],
      summary: {
        critical: 0,
        warnings: 0,
        info: 0
      }
    };

    const result = generateMarkdownReport(report);

    expect(result).not.toContain('Auto-Fix Suggestions');
  });
});
