/**
 * @coderef-semantic: 1.0.0
 * @exports HealthMetrics, HealthGenerator, generateHealthReport
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports HealthMetrics, HealthGenerator, generateHealthReport
 */



/**
 * IMP-CORE-023: Health Generator
 * 
 * Generates comprehensive health reports including:
 * - Dependency health (outdated, vulnerable, unused)
 * - Security posture
 * - License compliance
 * - Maintenance recommendations
 */

import type { PipelineState } from '../types.js';
import {
  DependencyAnalyzer,
  DependencyHealthReport,
  analyzeDependencyHealth,
} from '../../analyzer/dependency-analyzer.js';

export interface HealthMetrics {
  dependencyHealth: DependencyHealthReport | null;
  securityScore: number; // 0-100
  maintenanceScore: number; // 0-100
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

export class HealthGenerator {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Generate comprehensive health report
   */
  async generate(state: PipelineState): Promise<HealthMetrics> {
    const dependencyHealth = await this.analyzeDependencies();
    const securityScore = this.calculateSecurityScore(dependencyHealth);
    const maintenanceScore = this.calculateMaintenanceScore(dependencyHealth);

    return {
      dependencyHealth,
      securityScore,
      maintenanceScore,
      overallHealth: this.determineOverallHealth(
        dependencyHealth,
        securityScore,
        maintenanceScore
      ),
    };
  }

  /**
   * Analyze dependency health
   */
  private async analyzeDependencies(): Promise<DependencyHealthReport | null> {
    return await analyzeDependencyHealth(this.projectPath);
  }

  /**
   * Calculate security score (0-100)
   * Based on vulnerabilities, outdated deps, and security practices
   */
  private calculateSecurityScore(health: DependencyHealthReport | null): number {
    if (!health) return 50; // Unknown

    const baseScore = 100;
    const deductions = {
      critical: 40,
      high: 20,
      moderate: 10,
      low: 5,
      outdated: 2,
    };

    let score = baseScore;
    
    // Deduct for vulnerabilities
    score -= health.summary.criticalVulnerabilities * deductions.critical;
    score -= health.summary.highVulnerabilities * deductions.high;
    score -= (health.summary.vulnerabilityCount - health.summary.criticalVulnerabilities - health.summary.highVulnerabilities) * deductions.moderate;

    // Deduct for outdated dependencies (capped at 20 points)
    const outdatedDeduction = Math.min(20, health.summary.outdatedCount * deductions.outdated);
    score -= outdatedDeduction;

    // Deduct for unused dependencies (security surface area)
    score -= Math.min(10, health.summary.unusedCount * 2);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate maintenance score (0-100)
   * Based on dependency freshness, peer deps, and unused deps
   */
  private calculateMaintenanceScore(health: DependencyHealthReport | null): number {
    if (!health) return 50;

    const total = health.totalDependencies;
    if (total === 0) return 100;

    // Calculate percentage of healthy deps
    const outdatedPct = health.summary.outdatedCount / total;
    const unusedPct = health.summary.unusedCount / total;
    const peerIssuePct = health.summary.peerIssueCount / total;

    // Score based on inverse of problem percentages
    let score = 100;
    score -= outdatedPct * 30; // Max 30 points for outdated
    score -= unusedPct * 20; // Max 20 points for unused
    score -= peerIssuePct * 15; // Max 15 points for peer issues
    score -= (health.licenseIssues.length / total) * 10; // Max 10 points for license issues

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Determine overall health rating
   */
  private determineOverallHealth(
    health: DependencyHealthReport | null,
    securityScore: number,
    maintenanceScore: number
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (!health) return 'fair';

    const avgScore = (securityScore + maintenanceScore + health.healthScore) / 3;

    if (avgScore >= 90) return 'excellent';
    if (avgScore >= 75) return 'good';
    if (avgScore >= 50) return 'fair';
    if (avgScore >= 25) return 'poor';
    return 'critical';
  }

  /**
   * Generate Markdown health report
   */
  generateMarkdown(metrics: HealthMetrics): string {
    const lines: string[] = [
      '# Dependency Health Report',
      '',
      `## Overall Health: ${metrics.overallHealth.toUpperCase()}`,
      '',
      '| Metric | Score |',
      '|--------|-------|',
      `| Security | ${metrics.securityScore}/100 |`,
      `| Maintenance | ${metrics.maintenanceScore}/100 |`,
      `| Dependencies | ${metrics.dependencyHealth?.healthScore || 'N/A'}/100 |`,
      '',
    ];

    if (metrics.dependencyHealth) {
      const dh = metrics.dependencyHealth;
      
      lines.push(
        '## Summary',
        '',
        `- **Total Dependencies:** ${dh.totalDependencies}`,
        `- **Direct:** ${dh.directDependencies} | **Dev:** ${dh.devDependencies}`,
        `- **Outdated:** ${dh.summary.outdatedCount}`,
        `- **Vulnerabilities:** ${dh.summary.vulnerabilityCount} (${dh.summary.criticalVulnerabilities} critical, ${dh.summary.highVulnerabilities} high)`,
        `- **Unused:** ${dh.summary.unusedCount}`,
        `- **License Issues:** ${dh.summary.licenseIssueCount}`,
        `- **Peer Issues:** ${dh.summary.peerIssueCount}`,
        ''
      );

      if (dh.vulnerable.length > 0) {
        lines.push(
          '## Security Vulnerabilities',
          ''
        );
        dh.vulnerable.slice(0, 10).forEach(dep => {
          lines.push(`- **${dep.name}@${dep.installedVersion}**`);
          dep.vulnerabilities.forEach(vuln => {
            lines.push(`  - ${vuln.severity.toUpperCase()}: ${vuln.title}`);
            if (vuln.fixAvailable) {
              lines.push(`    - Fix: ${typeof vuln.fixAvailable === 'string' ? vuln.fixAvailable : 'Update available'}`);
            }
          });
        });
        if (dh.vulnerable.length > 10) {
          lines.push(`- ... and ${dh.vulnerable.length - 10} more vulnerable dependencies`);
        }
        lines.push('');
      }

      if (dh.outdated.length > 0) {
        lines.push(
          '## Outdated Dependencies',
          ''
        );
        dh.outdated.slice(0, 10).forEach(dep => {
          lines.push(`- **${dep.name}**: ${dep.installedVersion} → ${dep.latestVersion || 'unknown'}`);
        });
        if (dh.outdated.length > 10) {
          lines.push(`- ... and ${dh.outdated.length - 10} more outdated dependencies`);
        }
        lines.push('');
      }

      if (dh.unused.length > 0) {
        lines.push(
          '## Unused Dependencies',
          'These dependencies are installed but not imported in your code:',
          ''
        );
        dh.unused.forEach(dep => {
          lines.push(`- ${dep.name}@${dep.installedVersion}`);
        });
        lines.push('');
      }

      if (dh.recommendations.length > 0) {
        lines.push(
          '## Recommendations',
          ''
        );
        dh.recommendations.forEach(rec => {
          lines.push(`- ${rec}`);
        });
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

/**
 * Quick health report generation for MCP tools
 */
export async function generateHealthReport(
  projectPath: string,
  state: PipelineState
): Promise<{ metrics: HealthMetrics; markdown: string } | null> {
  try {
    const generator = new HealthGenerator(projectPath);
    const metrics = await generator.generate(state);
    const markdown = generator.generateMarkdown(metrics);
    return { metrics, markdown };
  } catch (error) {
    console.error('Health report generation failed:', error);
    return null;
  }
}
