/**
 * @coderef-semantic: 1.0.0
 * @exports formatIssueSummary, formatIssueDetails, formatRecommendations, formatAutoFixSection, generateMarkdownReport, saveMarkdownReport
 * @used_by src/cli/validate-routes.ts
 */





/**
 * WO-ROUTE-VALIDATION-ENHANCEMENT-001: Report Generation Module
 * Generates human-readable markdown reports from validation results
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { RouteValidation, ValidationIssue } from '../types/types.js';

/**
 * Format issue summary section
 *
 * @param report - Validation report
 * @returns Markdown formatted summary
 *
 * @example
 * formatIssueSummary(report)
 * // Returns: "## Summary\n\nTotal Issues: 15..."
 */
export function formatIssueSummary(report: RouteValidation): string {
  const { critical, warnings, info } = report.summary;
  const totalIssues = critical + warnings + info;

  return `## Summary

**Total Issues:** ${totalIssues}
- 🔴 Critical: ${critical}
- 🟡 Warnings: ${warnings}
- 🔵 Info: ${info}

**Routes Analysis:**
- Frontend API Calls: ${report.totalFrontendCalls}
- Server Routes: ${report.totalServerRoutes}
- Matched Routes: ${report.matchedRoutes}
- Match Rate: ${report.totalFrontendCalls > 0 ? Math.round((report.matchedRoutes / report.totalFrontendCalls) * 100) : 0}%
`;
}

/**
 * Format detailed issue list
 *
 * @param issues - Array of validation issues
 * @returns Markdown formatted issue details
 *
 * @example
 * formatIssueDetails(issues)
 * // Returns: "### Critical Issues\n\n1. [MISSING_ROUTE]..."
 */
export function formatIssueDetails(issues: ValidationIssue[]): string {
  if (issues.length === 0) {
    return '## Issues\n\nNo issues found! All frontend calls have matching server routes.\n';
  }

  // Group issues by severity
  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');
  const info = issues.filter(i => i.severity === 'info');

  let output = '## Issues\n\n';

  // Critical issues
  if (critical.length > 0) {
    output += '### 🔴 Critical Issues\n\n';
    critical.forEach((issue, index) => {
      output += formatSingleIssue(issue, index + 1);
    });
  }

  // Warnings
  if (warnings.length > 0) {
    output += '### 🟡 Warnings\n\n';
    warnings.forEach((issue, index) => {
      output += formatSingleIssue(issue, index + 1);
    });
  }

  // Info
  if (info.length > 0) {
    output += '### 🔵 Info\n\n';
    info.forEach((issue, index) => {
      output += formatSingleIssue(issue, index + 1);
    });
  }

  return output;
}

/**
 * Format a single issue
 */
function formatSingleIssue(issue: ValidationIssue, index: number): string {
  let output = `#### ${index}. [${issue.type.toUpperCase()}] ${issue.message}\n\n`;

  if (issue.frontendCall) {
    output += `**Frontend Call:**\n`;
    output += `- Path: \`${issue.frontendCall.method} ${issue.frontendCall.path}\`\n`;
    output += `- Location: ${issue.frontendCall.file}:${issue.frontendCall.line}\n`;
    output += `- Type: ${issue.frontendCall.callType}\n`;
    output += `- Confidence: ${issue.frontendCall.confidence}%\n\n`;
  }

  if (issue.serverRoute) {
    output += `**Server Route:**\n`;
    output += `- Path: \`${issue.serverRoute.methods.join('/')} ${issue.serverRoute.path}\`\n`;
    output += `- Framework: ${issue.serverRoute.framework}\n\n`;
  }

  if (issue.suggestion) {
    output += `**Suggestion:** ${issue.suggestion}\n\n`;
  }

  output += '---\n\n';
  return output;
}

/**
 * Format recommendations section
 *
 * @param report - Validation report
 * @returns Markdown formatted recommendations
 *
 * @example
 * formatRecommendations(report)
 * // Returns: "## Recommendations\n\n..."
 */
export function formatRecommendations(report: RouteValidation): string {
  const recommendations: string[] = [];

  // Check match rate
  const matchRate = report.totalFrontendCalls > 0
    ? (report.matchedRoutes / report.totalFrontendCalls) * 100
    : 0;

  if (matchRate < 70) {
    recommendations.push(
      '🔴 **Low Match Rate:** Less than 70% of frontend calls have matching server routes. Review your API endpoints.'
    );
  } else if (matchRate < 90) {
    recommendations.push(
      '🟡 **Moderate Match Rate:** Consider reviewing unmatched routes to ensure all frontend calls are covered.'
    );
  } else {
    recommendations.push(
      '✅ **Good Match Rate:** Most frontend calls have matching server routes.'
    );
  }

  // Critical issues
  if (report.summary.critical > 0) {
    recommendations.push(
      `🔴 **Critical Issues Found:** ${report.summary.critical} critical issue(s) require immediate attention.`
    );
  }

  // Unused routes
  const unusedRoutes = report.issues.filter(i => i.type === 'unused_route').length;
  if (unusedRoutes > 0) {
    recommendations.push(
      `🟡 **Unused Routes:** ${unusedRoutes} server route(s) are not called by frontend. Consider removing or documenting them.`
    );
  }

  if (recommendations.length === 0) {
    return '## Recommendations\n\n✅ No recommendations. Your routes are well-aligned!\n';
  }

  return `## Recommendations\n\n${recommendations.map(r => `- ${r}`).join('\n')}\n`;
}

/**
 * Format auto-fix section with code suggestions
 *
 * @param issues - Array of validation issues
 * @returns Markdown formatted auto-fix suggestions
 *
 * @example
 * formatAutoFixSection(issues)
 * // Returns: "## Auto-Fix Suggestions\n\n..."
 */
export function formatAutoFixSection(issues: ValidationIssue[]): string {
  const missingRoutes = issues.filter(i => i.type === 'missing_route');

  if (missingRoutes.length === 0) {
    return '';
  }

  let output = '## Auto-Fix Suggestions\n\n';
  output += '### Missing Routes - Suggested Server Handlers\n\n';
  output += 'Add these route handlers to your server:\n\n';

  missingRoutes.forEach(issue => {
    if (issue.frontendCall) {
      const { method, path } = issue.frontendCall;

      // Generate framework-specific code suggestions
      output += `#### ${method} ${path}\n\n`;

      // Express example
      output += '**Express:**\n```javascript\n';
      output += `app.${method.toLowerCase()}('${path}', (req, res) => {\n`;
      output += `  // TODO: Implement ${method} ${path}\n`;
      output += `  res.json({ message: 'Not implemented' });\n`;
      output += '});\n```\n\n';

      // Next.js example
      output += '**Next.js (App Router):**\n```typescript\n';
      output += `// app${path}/route.ts\n`;
      output += `export async function ${method}() {\n`;
      output += `  // TODO: Implement ${method} ${path}\n`;
      output += `  return Response.json({ message: 'Not implemented' });\n`;
      output += '}\n```\n\n';
    }
  });

  return output;
}

/**
 * Generate complete markdown report
 *
 * @param report - Validation report
 * @returns Complete markdown formatted report
 *
 * @example
 * const markdown = generateMarkdownReport(report);
 */
export function generateMarkdownReport(report: RouteValidation): string {
  const timestamp = new Date().toISOString();

  let markdown = `# Route Validation Report\n\n`;
  markdown += `**Generated:** ${timestamp}\n\n`;
  markdown += `---\n\n`;

  // Summary
  markdown += formatIssueSummary(report);
  markdown += '\n---\n\n';

  // Detailed issues
  markdown += formatIssueDetails(report.issues);
  markdown += '\n---\n\n';

  // Recommendations
  markdown += formatRecommendations(report);
  markdown += '\n---\n\n';

  // Auto-fix suggestions
  const autoFix = formatAutoFixSection(report.issues);
  if (autoFix) {
    markdown += autoFix;
    markdown += '\n---\n\n';
  }

  // Footer
  markdown += `## Next Steps\n\n`;
  markdown += `1. Fix critical issues (missing routes and method mismatches)\n`;
  markdown += `2. Review warnings (unused routes)\n`;
  markdown += `3. Run validation again after fixes\n`;
  markdown += `4. Integrate validation into CI/CD pipeline\n\n`;

  markdown += `*Report generated by coderef-core route validation (WO-ROUTE-VALIDATION-ENHANCEMENT-001)*\n`;

  return markdown;
}

/**
 * Save markdown report to file
 *
 * @param report - Validation report
 * @param outputPath - Path to save markdown file
 *
 * @example
 * await saveMarkdownReport(report, './.coderef/validation-report.md');
 */
export async function saveMarkdownReport(
  report: RouteValidation,
  outputPath: string
): Promise<void> {
  const markdown = generateMarkdownReport(report);
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, markdown, 'utf-8');
}
