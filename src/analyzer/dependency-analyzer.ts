/**
 * @coderef-semantic: 1.0.0
 * @exports DependencyHealth, SecurityVulnerability, DependencyHealthReport, DependencyAnalyzer, analyzeDependencyHealth
 * @used_by src/cli/coderef-analyze.ts, src/pipeline/generators/health-generator.ts
 */



/**
 * IMP-CORE-023: Dependency Health Analyzer
 * 
 * Analyzes dependency health including:
 * - Outdated dependency detection (latest vs installed)
 * - Security vulnerability scanning (npm audit integration)
 * - License compatibility checking
 * - Unused dependency detection
 * - Peer dependency satisfaction
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DependencyHealth {
  name: string;
  installedVersion: string;
  latestVersion?: string;
  isOutdated: boolean;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  license?: string;
  licenseCompatible: boolean;
  isUsed: boolean;
  vulnerabilityCount: number;
  vulnerabilities: SecurityVulnerability[];
  peerDependenciesSatisfied: boolean;
  missingPeers: string[];
}

export interface SecurityVulnerability {
  id: string;
  title: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  range: string;
  fixAvailable: boolean | string;
  cwe?: string[];
}

export interface DependencyHealthReport {
  totalDependencies: number;
  directDependencies: number;
  devDependencies: number;
  healthScore: number; // 0-100
  healthLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  outdated: DependencyHealth[];
  vulnerable: DependencyHealth[];
  unused: DependencyHealth[];
  licenseIssues: DependencyHealth[];
  peerIssues: DependencyHealth[];
  summary: {
    outdatedCount: number;
    vulnerabilityCount: number;
    unusedCount: number;
    licenseIssueCount: number;
    peerIssueCount: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
  };
  recommendations: string[];
}

export class DependencyAnalyzer {
  private projectPath: string;
  private packageJson: any = null;
  private npmAuditResult: any = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Run comprehensive dependency health analysis
   */
  async analyze(): Promise<DependencyHealthReport> {
    await this.loadPackageJson();
    
    // Run npm audit in background
    await this.runNpmAudit();

    const healthData: DependencyHealth[] = [];
    const allDeps = this.getAllDependencies();

    for (const [name, installedVersion] of Object.entries(allDeps)) {
      const health = await this.analyzeDependency(name, installedVersion);
      healthData.push(health);
    }

    return this.generateReport(healthData);
  }

  /**
   * Load package.json from project
   */
  private async loadPackageJson(): Promise<void> {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      this.packageJson = JSON.parse(content);
    } catch {
      this.packageJson = null;
    }
  }

  /**
   * Run npm audit to get security vulnerabilities
   */
  private async runNpmAudit(): Promise<void> {
    try {
      const { stdout } = await execAsync(
        'npm audit --json',
        { 
          cwd: this.projectPath,
          timeout: 30000,
          encoding: 'utf-8'
        }
      );
      this.npmAuditResult = JSON.parse(stdout);
    } catch (error: any) {
      // npm audit returns exit code 1 when vulnerabilities found, but still outputs JSON
      if (error.stdout) {
        try {
          this.npmAuditResult = JSON.parse(error.stdout);
        } catch {
          this.npmAuditResult = null;
        }
      } else {
        this.npmAuditResult = null;
      }
    }
  }

  /**
   * Get all dependencies (direct + dev)
   */
  private getAllDependencies(): Record<string, string> {
    if (!this.packageJson) return {};
    
    return {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };
  }

  /**
   * Analyze a single dependency
   */
  private async analyzeDependency(
    name: string,
    installedVersion: string
  ): Promise<DependencyHealth> {
    const isOutdated = await this.checkIfOutdated(name, installedVersion);
    const vulnerabilities = this.getVulnerabilities(name);
    const isUsed = await this.checkIfUsed(name);
    const license = await this.getLicenseInfo(name);
    const peerStatus = this.checkPeerDependencies(name);

    const severity = this.calculateSeverity(
      isOutdated,
      vulnerabilities,
      isUsed,
      peerStatus.satisfied
    );

    return {
      name,
      installedVersion,
      latestVersion: await this.getLatestVersion(name),
      isOutdated,
      severity,
      license,
      licenseCompatible: this.isLicenseCompatible(license),
      isUsed,
      vulnerabilityCount: vulnerabilities.length,
      vulnerabilities,
      peerDependenciesSatisfied: peerStatus.satisfied,
      missingPeers: peerStatus.missing,
    };
  }

  /**
   * Check if dependency is outdated
   */
  private async checkIfOutdated(
    name: string,
    installedVersion: string
  ): Promise<boolean> {
    const latest = await this.getLatestVersion(name);
    if (!latest) return false;
    return latest !== installedVersion.replace(/^[^0-9]*/, '');
  }

  /**
   * Get latest version from npm registry
   */
  private async getLatestVersion(name: string): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync(
        `npm view ${name} version`,
        { timeout: 5000, encoding: 'utf-8' }
      );
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Get security vulnerabilities for a dependency
   */
  private getVulnerabilities(name: string): SecurityVulnerability[] {
    if (!this.npmAuditResult?.vulnerabilities) return [];
    
    const vuln = this.npmAuditResult.vulnerabilities[name];
    if (!vuln?.via) return [];

    return vuln.via
      .filter((v: any) => v.source === name)
      .map((v: any) => ({
        id: v.cves?.[0] || v.id,
        title: v.title,
        severity: v.severity,
        range: v.range,
        fixAvailable: vuln.fixAvailable,
        cwe: v.cwe,
      }));
  }

  /**
   * Check if dependency is actually used in code
   */
  private async checkIfUsed(name: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `grep -r "from ['\"']${name}['\"']\|require(['\"']${name}['\"'])" src/ --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" 2>/dev/null | head -1`,
        { cwd: this.projectPath, timeout: 10000 }
      );
      return stdout.trim().length > 0;
    } catch {
      // If grep fails (no matches), dependency is unused
      return false;
    }
  }

  /**
   * Get license information for a dependency
   */
  private async getLicenseInfo(name: string): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync(
        `npm view ${name} license`,
        { timeout: 5000, encoding: 'utf-8' }
      );
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if license is compatible with common open source projects
   */
  private isLicenseCompatible(license: string | undefined): boolean {
    if (!license) return true; // Unknown is assumed compatible
    
    const compatibleLicenses = [
      'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause',
      'ISC', 'WTFPL', 'CC0-1.0', 'Unlicense'
    ];
    
    const incompatibleLicenses = [
      'GPL-3.0', 'GPL-2.0', 'AGPL-3.0', 'LGPL-3.0',
      'Proprietary', 'Commercial'
    ];
    
    const upperLicense = license.toUpperCase();
    
    if (incompatibleLicenses.some(l => upperLicense.includes(l.toUpperCase()))) {
      return false;
    }
    
    return compatibleLicenses.some(l => upperLicense.includes(l.toUpperCase()));
  }

  /**
   * Check peer dependency satisfaction
   */
  private checkPeerDependencies(name: string): {
    satisfied: boolean;
    missing: string[];
  } {
    if (!this.npmAuditResult?.vulnerabilities?.[name]) {
      return { satisfied: true, missing: [] };
    }

    const vuln = this.npmAuditResult.vulnerabilities[name];
    const peers = vuln.peerDependencies || {};
    const missing: string[] = [];

    for (const [peer, range] of Object.entries(peers)) {
      const installed = this.packageJson?.dependencies?.[peer] ||
                       this.packageJson?.devDependencies?.[peer];
      if (!installed) {
        missing.push(`${peer}@${range}`);
      }
    }

    return {
      satisfied: missing.length === 0,
      missing,
    };
  }

  /**
   * Calculate overall severity for a dependency
   */
  private calculateSeverity(
    isOutdated: boolean,
    vulnerabilities: SecurityVulnerability[],
    isUsed: boolean,
    peersSatisfied: boolean
  ): 'low' | 'moderate' | 'high' | 'critical' {
    const hasCriticalVuln = vulnerabilities.some(v => v.severity === 'critical');
    const hasHighVuln = vulnerabilities.some(v => v.severity === 'high');
    
    if (hasCriticalVuln) return 'critical';
    if (hasHighVuln) return 'high';
    if (!isUsed) return 'moderate'; // Unused is moderate priority
    if (isOutdated || !peersSatisfied) return 'moderate';
    return 'low';
  }

  /**
   * Generate comprehensive health report
   */
  private generateReport(healthData: DependencyHealth[]): DependencyHealthReport {
    const outdated = healthData.filter(d => d.isOutdated);
    const vulnerable = healthData.filter(d => d.vulnerabilityCount > 0);
    const unused = healthData.filter(d => !d.isUsed);
    const licenseIssues = healthData.filter(d => !d.licenseCompatible);
    const peerIssues = healthData.filter(d => !d.peerDependenciesSatisfied);

    const totalVulns = healthData.reduce((sum, d) => sum + d.vulnerabilityCount, 0);
    const criticalVulns = healthData.reduce(
      (sum, d) => sum + d.vulnerabilities.filter(v => v.severity === 'critical').length,
      0
    );
    const highVulns = healthData.reduce(
      (sum, d) => sum + d.vulnerabilities.filter(v => v.severity === 'high').length,
      0
    );

    const healthScore = this.calculateHealthScore(healthData);

    return {
      totalDependencies: healthData.length,
      directDependencies: Object.keys(this.packageJson?.dependencies || {}).length,
      devDependencies: Object.keys(this.packageJson?.devDependencies || {}).length,
      healthScore,
      healthLevel: this.getHealthLevel(healthScore),
      outdated,
      vulnerable,
      unused,
      licenseIssues,
      peerIssues,
      summary: {
        outdatedCount: outdated.length,
        vulnerabilityCount: totalVulns,
        unusedCount: unused.length,
        licenseIssueCount: licenseIssues.length,
        peerIssueCount: peerIssues.length,
        criticalVulnerabilities: criticalVulns,
        highVulnerabilities: highVulns,
      },
      recommendations: this.generateRecommendations(
        outdated,
        vulnerable,
        unused,
        licenseIssues,
        peerIssues,
        criticalVulns,
        highVulns
      ),
    };
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(healthData: DependencyHealth[]): number {
    if (healthData.length === 0) return 100;

    const weights = {
      critical: 0,
      high: 25,
      moderate: 60,
      low: 100,
    };

    const totalScore = healthData.reduce((sum, d) => {
      return sum + (weights[d.severity] || 50);
    }, 0);

    return Math.round(totalScore / healthData.length);
  }

  /**
   * Get health level from score
   */
  private getHealthLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 25) return 'poor';
    return 'critical';
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    outdated: DependencyHealth[],
    vulnerable: DependencyHealth[],
    unused: DependencyHealth[],
    licenseIssues: DependencyHealth[],
    peerIssues: DependencyHealth[],
    criticalVulns: number,
    highVulns: number
  ): string[] {
    const recommendations: string[] = [];

    if (criticalVulns > 0) {
      recommendations.push(`URGENT: Fix ${criticalVulns} critical security vulnerabilities immediately`);
    }

    if (highVulns > 0) {
      recommendations.push(`HIGH PRIORITY: Address ${highVulns} high-severity vulnerabilities`);
    }

    if (outdated.length > 5) {
      recommendations.push(`Consider bulk update: ${outdated.length} dependencies are outdated`);
    } else if (outdated.length > 0) {
      recommendations.push(`Update ${outdated.length} outdated dependencies to latest versions`);
    }

    if (unused.length > 0) {
      recommendations.push(`Remove ${unused.length} unused dependencies to reduce attack surface`);
    }

    if (licenseIssues.length > 0) {
      recommendations.push(`Review ${licenseIssues.length} dependencies with incompatible licenses`);
    }

    if (peerIssues.length > 0) {
      recommendations.push(`Fix ${peerIssues.length} peer dependency issues`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All dependencies are healthy - maintain current practices');
    }

    return recommendations;
  }
}

/**
 * Quick analysis function for MCP server integration
 */
export async function analyzeDependencyHealth(
  projectPath: string
): Promise<DependencyHealthReport | null> {
  try {
    const analyzer = new DependencyAnalyzer(projectPath);
    return await analyzer.analyze();
  } catch (error) {
    console.error('Dependency health analysis failed:', error);
    return null;
  }
}
