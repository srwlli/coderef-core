/**
 * @coderef-semantic: 1.0.0
 * @exports ReadmeSection, ReadmeAnalysis, JSDocCoverage, ChangelogAnalysis, CommentDensity, ApiDocsAnalysis, DocumentationQuality, DocsAnalyzer, analyzeDocs
 * @used_by src/pipeline/generators/context-generator.ts
 */

/**
 * Documentation Quality Analyzer
 *
 * IMP-CORE-022: Analyze documentation quality metrics
 *
 * Measures:
 * - README completeness (sections present)
 * - JSDoc/TSDoc coverage ratio
 * - CHANGELOG presence and recency
 * - API documentation completeness
 * - Code comment density
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface ReadmeSection {
  name: string;
  present: boolean;
  lineCount?: number;
}

export interface ReadmeAnalysis {
  file: string;
  exists: boolean;
  totalSections: number;
  presentSections: number;
  completenessScore: number; // 0-100
  sections: ReadmeSection[];
  hasInstallation: boolean;
  hasUsage: boolean;
  hasApiReference: boolean;
  hasContributing: boolean;
  hasLicense: boolean;
  hasBadges: boolean;
  estimatedQuality: 'poor' | 'basic' | 'good' | 'excellent';
}

export interface JSDocCoverage {
  file: string;
  totalExports: number;
  documentedExports: number;
  coverageRatio: number; // 0-1
  undocumentedItems: string[];
}

export interface ChangelogAnalysis {
  file: string;
  exists: boolean;
  format: 'keepachangelog' | 'simple' | 'unknown';
  lastUpdateDate?: Date;
  daysSinceUpdate: number;
  totalEntries: number;
  hasUnreleasedSection: boolean;
  recencyScore: number; // 0-100, higher = more recent
}

export interface CommentDensity {
  file: string;
  totalLines: number;
  commentLines: number;
  codeLines: number;
  blankLines: number;
  densityRatio: number; // 0-1, commentLines / totalLines
}

export interface ApiDocsAnalysis {
  hasApiDocs: boolean;
  docsDirectory?: string;
  format?: 'markdown' | 'html' | 'typedoc' | 'jsdoc' | 'unknown';
  totalEndpoints?: number;
  documentedEndpoints?: number;
  coverageRatio?: number;
}

export interface DocumentationQuality {
  overallScore: number; // 0-100
  qualityLevel: 'poor' | 'basic' | 'good' | 'excellent';
  readme: ReadmeAnalysis;
  jsdocCoverage: JSDocCoverage[];
  changelog: ChangelogAnalysis;
  apiDocs: ApiDocsAnalysis;
  commentDensity: CommentDensity[];
  averageCommentDensity: number;
  totalFilesAnalyzed: number;
  recommendations: string[];
}

// Standard README sections to check
const STANDARD_README_SECTIONS = [
  'installation',
  'usage',
  'api',
  'api reference',
  'documentation',
  'examples',
  'contributing',
  'license',
  'changelog',
  'roadmap',
  'badges',
  'features',
  'prerequisites',
  'getting started',
  'configuration',
  'testing',
  'faq',
  'troubleshooting',
];

export class DocsAnalyzer {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Analyze all documentation quality metrics
   */
  async analyze(): Promise<DocumentationQuality> {
    const readme = await this.analyzeReadme();
    const jsdocCoverage = await this.analyzeJSDocCoverage();
    const changelog = await this.analyzeChangelog();
    const apiDocs = await this.analyzeApiDocs();
    const commentDensity = await this.analyzeCommentDensity();

    const overallScore = this.calculateOverallScore(
      readme,
      jsdocCoverage,
      changelog,
      apiDocs,
      commentDensity
    );

    const qualityLevel = this.determineQualityLevel(overallScore);
    const recommendations = this.generateRecommendations(
      readme,
      jsdocCoverage,
      changelog,
      apiDocs,
      commentDensity
    );

    const averageCommentDensity =
      commentDensity.length > 0
        ? commentDensity.reduce((sum, cd) => sum + cd.densityRatio, 0) / commentDensity.length
        : 0;

    return {
      overallScore,
      qualityLevel,
      readme,
      jsdocCoverage,
      changelog,
      apiDocs,
      commentDensity,
      averageCommentDensity,
      totalFilesAnalyzed: commentDensity.length,
      recommendations,
    };
  }

  /**
   * Analyze README.md for completeness
   */
  private async analyzeReadme(): Promise<ReadmeAnalysis> {
    const readmePaths = ['README.md', 'readme.md', 'Readme.md'];
    let readmeContent = '';
    let readmeFile = '';

    for (const readmePath of readmePaths) {
      const fullPath = path.join(this.projectPath, readmePath);
      try {
        readmeContent = await fs.readFile(fullPath, 'utf-8');
        readmeFile = readmePath;
        break;
      } catch {
        continue;
      }
    }

    if (!readmeContent) {
      return {
        file: 'README.md',
        exists: false,
        totalSections: STANDARD_README_SECTIONS.length,
        presentSections: 0,
        completenessScore: 0,
        sections: STANDARD_README_SECTIONS.map(name => ({ name, present: false })),
        hasInstallation: false,
        hasUsage: false,
        hasApiReference: false,
        hasContributing: false,
        hasLicense: false,
        hasBadges: false,
        estimatedQuality: 'poor',
      };
    }

    // Parse sections from README
    const sections: ReadmeSection[] = [];
    const lines = readmeContent.split('\n');
    let presentCount = 0;

    for (const sectionName of STANDARD_README_SECTIONS) {
      const sectionRegex = new RegExp(
        `^#{1,3}\\s*${sectionName.replace(/\s+/g, '\\s*')}[^\\w]`,
        'im'
      );
      const present = sectionRegex.test(readmeContent);
      if (present) presentCount++;

      // Count lines for this section
      let lineCount = 0;
      if (present) {
        const sectionStart = lines.findIndex(line => sectionRegex.test(line));
        if (sectionStart >= 0) {
          // Find next section or end of file
          const nextSectionRegex = /^#{1,3}\s+[^#]/;
          for (let i = sectionStart + 1; i < lines.length; i++) {
            if (nextSectionRegex.test(lines[i])) break;
            if (lines[i].trim()) lineCount++;
          }
        }
      }

      sections.push({ name: sectionName, present, lineCount: lineCount > 0 ? lineCount : undefined });
    }

    // Check for specific important sections
    const hasInstallation =
      /#{1,3}\s*(installation|getting started|setup|prerequisites)/i.test(readmeContent);
    const hasUsage = /#{1,3}\s*(usage|examples|quick start)/i.test(readmeContent);
    const hasApiReference = /#{1,3}\s*(api|api reference|documentation|reference)/i.test(readmeContent);
    const hasContributing = /#{1,3}\s*(contributing|development|building)/i.test(readmeContent);
    const hasLicense =
      /#{1,3}\s*license/i.test(readmeContent) || /\[license\]/i.test(readmeContent);
    const hasBadges = /!\[.*\]\(.*\)/.test(readmeContent);

    const completenessScore = Math.round(
      (presentCount / STANDARD_README_SECTIONS.length) * 100
    );

    // Determine quality level
    let estimatedQuality: 'poor' | 'basic' | 'good' | 'excellent' = 'poor';
    if (completenessScore >= 80 && hasInstallation && hasUsage) {
      estimatedQuality = 'excellent';
    } else if (completenessScore >= 60 && (hasInstallation || hasUsage)) {
      estimatedQuality = 'good';
    } else if (completenessScore >= 40 || hasInstallation || hasUsage) {
      estimatedQuality = 'basic';
    }

    return {
      file: readmeFile,
      exists: true,
      totalSections: STANDARD_README_SECTIONS.length,
      presentSections: presentCount,
      completenessScore,
      sections,
      hasInstallation,
      hasUsage,
      hasApiReference,
      hasContributing,
      hasLicense,
      hasBadges,
      estimatedQuality,
    };
  }

  /**
   * Analyze JSDoc/TSDoc coverage across TypeScript/JavaScript files
   */
  private async analyzeJSDocCoverage(): Promise<JSDocCoverage[]> {
    const coverage: JSDocCoverage[] = [];
    const sourceFiles = await this.findSourceFiles();

    for (const file of sourceFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(this.projectPath, file);

        // Find exported items (functions, classes, interfaces, etc.)
        const exportMatches = this.findExportedItems(content);
        const documentedItems: string[] = [];
        const undocumentedItems: string[] = [];

        for (const item of exportMatches) {
          // Check if preceded by JSDoc comment
          const itemRegex = new RegExp(
            `(\\/\\*\\*[\\s\\S]*?\\*\\/)\\s*(?:export\\s+)?(?:async\\s+)?(?:function\\s+)?(?:class\\s+)?(?:interface\\s+)?(?:type\\s+)?(?:const\\s+)?(?:let\\s+)?(?:var\\s+)?${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
            'm'
          );

          if (itemRegex.test(content)) {
            documentedItems.push(item.name);
          } else {
            undocumentedItems.push(item.name);
          }
        }

        if (exportMatches.length > 0) {
          coverage.push({
            file: relativePath,
            totalExports: exportMatches.length,
            documentedExports: documentedItems.length,
            coverageRatio: documentedItems.length / exportMatches.length,
            undocumentedItems,
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return coverage;
  }

  /**
   * Find exported items in source code
   */
  private findExportedItems(content: string): Array<{ name: string; type: string }> {
    const items: Array<{ name: string; type: string }> = [];

    // Match various export patterns
    const patterns = [
      // export function/class/interface/type/const
      /export\s+(?:async\s+)?(?:function|class|interface|type|const|let|var)\s+(\w+)/g,
      // export { name1, name2 }
      /export\s*{([^}]+)}/g,
      // export default class/function
      /export\s+default\s+(?:class|function)\s+(\w+)/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          // Handle named exports from { ... }
          if (match[1].includes(',')) {
            const names = match[1].split(',').map(n => n.trim().split(//)[0]);
            for (const name of names) {
              if (name && name !== 'from') {
                items.push({ name, type: 'export' });
              }
            }
          } else {
            items.push({ name: match[1], type: 'export' });
          }
        }
      }
    }

    return items;
  }

  /**
   * Analyze CHANGELOG for presence and recency
   */
  private async analyzeChangelog(): Promise<ChangelogAnalysis> {
    const changelogPaths = [
      'CHANGELOG.md',
      'changelog.md',
      'CHANGELOG.rst',
      'CHANGELOG.txt',
      'HISTORY.md',
      'history.md',
      'NEWS.md',
      'RELEASES.md',
    ];

    let changelogContent = '';
    let changelogFile = '';

    for (const changelogPath of changelogPaths) {
      const fullPath = path.join(this.projectPath, changelogPath);
      try {
        changelogContent = await fs.readFile(fullPath, 'utf-8');
        changelogFile = changelogPath;
        break;
      } catch {
        continue;
      }
    }

    if (!changelogContent) {
      return {
        file: 'CHANGELOG.md',
        exists: false,
        format: 'unknown',
        daysSinceUpdate: Infinity,
        totalEntries: 0,
        hasUnreleasedSection: false,
        recencyScore: 0,
      };
    }

    // Detect format
    let format: 'keepachangelog' | 'simple' | 'unknown' = 'unknown';
    if (/^#?#?\s*Changelog/i.test(changelogContent) && /###\s*(Added|Changed|Deprecated|Removed|Fixed|Security)/m.test(changelogContent)) {
      format = 'keepachangelog';
    } else if (/^#?#?\s*(CHANGELOG|History|Releases)/im.test(changelogContent)) {
      format = 'simple';
    }

    // Count entries (version headers)
    const versionMatches = changelogContent.match(/^#?#?\s*\[?v?[\d.]\S*\]?/gm);
    const totalEntries = versionMatches?.length || 0;

    // Check for unreleased section
    const hasUnreleasedSection = /^#?#?\s*\[?Unreleased\]?/im.test(changelogContent);

    // Find last update date
    const dateMatches = changelogContent.match(/(\d{4}-\d{2}-\d{2})/g);
    let lastUpdateDate: Date | undefined;
    let daysSinceUpdate = Infinity;

    if (dateMatches && dateMatches.length > 0) {
      // Use most recent date
      const dates = dateMatches.map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime());
      lastUpdateDate = dates[0];
      daysSinceUpdate = Math.floor(
        (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Calculate recency score (0-100)
    // Perfect score if updated within last 30 days
    // Decay to 0 over 365 days
    let recencyScore = 0;
    if (daysSinceUpdate !== Infinity) {
      recencyScore = Math.max(0, Math.round(100 - (daysSinceUpdate / 365) * 100));
      if (daysSinceUpdate <= 30) recencyScore = 100;
    }

    return {
      file: changelogFile,
      exists: true,
      format,
      lastUpdateDate,
      daysSinceUpdate,
      totalEntries,
      hasUnreleasedSection,
      recencyScore,
    };
  }

  /**
   * Analyze API documentation
   */
  private async analyzeApiDocs(): Promise<ApiDocsAnalysis> {
    // Check for common API docs directories
    const docsDirs = ['docs', 'doc', 'documentation', 'api-docs', 'apidocs'];
    let hasApiDocs = false;
    let docsDirectory: string | undefined;
    let format: 'markdown' | 'html' | 'typedoc' | 'jsdoc' | 'unknown' | undefined;

    for (const dir of docsDirs) {
      const fullPath = path.join(this.projectPath, dir);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          hasApiDocs = true;
          docsDirectory = dir;

          // Detect format
          const files = await fs.readdir(fullPath);
          if (files.some(f => f.endsWith('.html'))) {
            format = 'html';
          } else if (files.includes('typedoc.json') || files.some(f => f.includes('typedoc'))) {
            format = 'typedoc';
          } else if (files.some(f => f.endsWith('.md'))) {
            format = 'markdown';
          }
          break;
        }
      } catch {
        continue;
      }
    }

    return {
      hasApiDocs,
      docsDirectory,
      format,
    };
  }

  /**
   * Analyze comment density across source files
   */
  private async analyzeCommentDensity(): Promise<CommentDensity[]> {
    const density: CommentDensity[] = [];
    const sourceFiles = await this.findSourceFiles();

    for (const file of sourceFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(this.projectPath, file);

        const lines = content.split('\n');
        let commentLines = 0;
        let codeLines = 0;
        let blankLines = 0;
        let inBlockComment = false;

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed === '') {
            blankLines++;
          } else if (inBlockComment) {
            commentLines++;
            if (trimmed.endsWith('*/')) {
              inBlockComment = false;
            }
          } else if (trimmed.startsWith('//')) {
            commentLines++;
          } else if (trimmed.startsWith('/*')) {
            commentLines++;
            if (!trimmed.includes('*/') || trimmed === '/*') {
              inBlockComment = true;
            }
          } else {
            codeLines++;
          }
        }

        const totalLines = lines.length;
        const densityRatio = totalLines > 0 ? commentLines / totalLines : 0;

        density.push({
          file: relativePath,
          totalLines,
          commentLines,
          codeLines,
          blankLines,
          densityRatio,
        });
      } catch {
        // Skip files that can't be read
      }
    }

    return density;
  }

  /**
   * Find all source files in the project
   */
  private async findSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    try {
      const entries = await fs.readdir(this.projectPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const dirFiles = await this.findSourceFilesRecursive(
            path.join(this.projectPath, entry.name)
          );
          files.push(...dirFiles);
        } else if (
          entry.isFile() &&
          extensions.some(ext => entry.name.endsWith(ext)) &&
          !entry.name.includes('.test.') &&
          !entry.name.includes('.spec.')
        ) {
          files.push(path.join(this.projectPath, entry.name));
        }
      }
    } catch {
      // Ignore errors
    }

    return files;
  }

  /**
   * Recursively find source files
   */
  private async findSourceFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.findSourceFilesRecursive(fullPath);
          files.push(...subFiles);
        } else if (
          entry.isFile() &&
          extensions.some(ext => entry.name.endsWith(ext)) &&
          !entry.name.includes('.test.') &&
          !entry.name.includes('.spec.')
        ) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }

    return files;
  }

  /**
   * Calculate overall documentation quality score
   */
  private calculateOverallScore(
    readme: ReadmeAnalysis,
    jsdocCoverage: JSDocCoverage[],
    changelog: ChangelogAnalysis,
    apiDocs: ApiDocsAnalysis,
    commentDensity: CommentDensity[]
  ): number {
    // Weighted scoring
    const weights = {
      readme: 30,
      jsdoc: 25,
      changelog: 20,
      apiDocs: 15,
      comments: 10,
    };

    let score = 0;

    // README score (30%)
    score += (readme.completenessScore / 100) * weights.readme;

    // JSDoc coverage (25%)
    if (jsdocCoverage.length > 0) {
      const avgCoverage =
        jsdocCoverage.reduce((sum, jc) => sum + jc.coverageRatio, 0) / jsdocCoverage.length;
      score += avgCoverage * 100 * (weights.jsdoc / 100);
    }

    // Changelog score (20%)
    if (changelog.exists) {
      score += (changelog.recencyScore / 100) * weights.changelog;
    }

    // API Docs (15%)
    if (apiDocs.hasApiDocs) {
      score += weights.apiDocs;
    }

    // Comment density (10%) - good if between 10-30%
    if (commentDensity.length > 0) {
      const avgDensity =
        commentDensity.reduce((sum, cd) => sum + cd.densityRatio, 0) / commentDensity.length;
      // Ideal density is 15-25%
      let densityScore = 0;
      if (avgDensity >= 0.15 && avgDensity <= 0.25) {
        densityScore = 100;
      } else if (avgDensity < 0.15) {
        densityScore = (avgDensity / 0.15) * 100;
      } else {
        densityScore = Math.max(0, 100 - (avgDensity - 0.25) * 200);
      }
      score += densityScore * (weights.comments / 100);
    }

    return Math.round(score);
  }

  /**
   * Determine quality level from score
   */
  private determineQualityLevel(score: number): 'poor' | 'basic' | 'good' | 'excellent' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'basic';
    return 'poor';
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    readme: ReadmeAnalysis,
    jsdocCoverage: JSDocCoverage[],
    changelog: ChangelogAnalysis,
    apiDocs: ApiDocsAnalysis,
    commentDensity: CommentDensity[]
  ): string[] {
    const recommendations: string[] = [];

    if (!readme.exists) {
      recommendations.push('Create a README.md file with basic project information');
    } else if (readme.completenessScore < 50) {
      recommendations.push(
        `Add more sections to README (${readme.presentSections}/${readme.totalSections} present). Priority: Installation, Usage, API Reference`
      );
    }

    if (!readme.hasInstallation) {
      recommendations.push('Add Installation section to README');
    }
    if (!readme.hasUsage) {
      recommendations.push('Add Usage section with examples to README');
    }

    const lowCoverageFiles = jsdocCoverage.filter(jc => jc.coverageRatio < 0.5);
    if (lowCoverageFiles.length > 0) {
      recommendations.push(
        `Add JSDoc comments to ${lowCoverageFiles.length} files with <50% documentation coverage`
      );
    }

    if (!changelog.exists) {
      recommendations.push('Create a CHANGELOG.md to track version history');
    } else if (changelog.daysSinceUpdate > 90) {
      recommendations.push(
        `Update CHANGELOG (last updated ${changelog.daysSinceUpdate} days ago)`
      );
    }

    if (!apiDocs.hasApiDocs) {
      recommendations.push('Consider adding API documentation (docs/ folder or TypeDoc)');
    }

    const avgDensity =
      commentDensity.length > 0
        ? commentDensity.reduce((sum, cd) => sum + cd.densityRatio, 0) / commentDensity.length
        : 0;
    if (avgDensity < 0.1) {
      recommendations.push('Add inline code comments to improve maintainability (target: 15-25% comment density)');
    }

    return recommendations;
  }
}

/**
 * Convenience function to analyze documentation quality
 */
export async function analyzeDocs(projectPath: string): Promise<DocumentationQuality> {
  const analyzer = new DocsAnalyzer(projectPath);
  return analyzer.analyze();
}
