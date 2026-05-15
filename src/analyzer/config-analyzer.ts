/**
 * @coderef-semantic: 1.0.0
 * @exports PackageJsonAnalysis, TsConfigAnalysis, DockerfileStage, DockerfileAnalysis, DockerComposeService, DockerComposeAnalysis, GitHubActionStep, GitHubActionJob, GitHubActionWorkflow, EnvFileAnalysis, ConfigAnalysis, ConfigAnalyzer, analyzeProjectConfig
 * @used_by src/cli/coderef-analyze.ts, src/pipeline/generators/context-generator.ts
 */





/**
 * IMP-CORE-019: Configuration File Analyzer
 *
 * Analyzes project configuration files:
 * - package.json: dependencies, scripts, engines, workspaces
 * - tsconfig.json: compiler options, path mapping, references
 * - Dockerfile: multi-stage builds, base images, exposed ports
 * - docker-compose.yml: services, networks, volumes, dependencies
 * - GitHub Actions: workflows, triggers, jobs, steps
 * - .env files: environment variables
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PackageJsonAnalysis {
  name: string;
  version: string;
  type: 'module' | 'commonjs' | 'unknown';
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  peerDependencies: string[];
  optionalDependencies: string[];
  engines: Record<string, string>;
  workspaces?: string[];
  hasWorkspaces: boolean;
  main?: string;
  types?: string;
  exports?: Record<string, any>;
}

export interface TsConfigAnalysis {
  compilerOptions: {
    target?: string;
    module?: string;
    lib?: string[];
    strict?: boolean;
    esModuleInterop?: boolean;
    skipLibCheck?: boolean;
    forceConsistentCasingInFileNames?: boolean;
    resolveJsonModule?: boolean;
    declaration?: boolean;
    sourceMap?: boolean;
    outDir?: string;
    rootDir?: string;
    baseUrl?: string;
    paths?: Record<string, string[]>;
    typeRoots?: string[];
    types?: string[];
  };
  include?: string[];
  exclude?: string[];
  extends?: string;
  references?: Array<{ path: string }>;
  hasPathMapping: boolean;
  isMonorepo: boolean;
}

export interface DockerfileStage {
  name: string;
  baseImage: string;
  hasBuildStage: boolean;
  exposedPorts: number[];
  commands: string[];
}

export interface DockerfileAnalysis {
  stages: DockerfileStage[];
  isMultiStage: boolean;
  totalStages: number;
  finalImage: string;
  exposedPorts: number[];
  hasHealthCheck: boolean;
  hasEntrypoint: boolean;
}

export interface DockerComposeService {
  name: string;
  image?: string;
  build?: { context?: string; dockerfile?: string };
  ports: string[];
  environment: Record<string, string>;
  dependsOn: string[];
  volumes: string[];
  networks: string[];
  command?: string;
  restart?: string;
}

export interface DockerComposeAnalysis {
  version: string;
  services: DockerComposeService[];
  networks: string[];
  volumes: string[];
  totalServices: number;
  hasExternalVolumes: boolean;
  hasCustomNetworks: boolean;
}

export interface GitHubActionStep {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  env?: Record<string, string>;
  if?: string;
}

export interface GitHubActionJob {
  name: string;
  runsOn: string;
  steps: GitHubActionStep[];
  needs?: string[];
  if?: string;
  strategy?: any;
}

export interface GitHubActionWorkflow {
  name: string;
  file: string;
  triggers: string[];
  jobs: GitHubActionJob[];
  totalJobs: number;
  usesActions: string[];
  hasSecrets: boolean;
  hasMatrix: boolean;
}

export interface EnvFileAnalysis {
  file: string;
  variables: Record<string, string>;
  hasDatabaseUrl: boolean;
  hasApiKeys: boolean;
  hasSecrets: boolean;
  count: number;
}

export interface ConfigAnalysis {
  packageJson?: PackageJsonAnalysis;
  tsconfig?: TsConfigAnalysis;
  dockerfile?: DockerfileAnalysis;
  dockerCompose?: DockerComposeAnalysis;
  workflows: GitHubActionWorkflow[];
  envFiles: EnvFileAnalysis[];
  detectedConfigs: string[];
}

export class ConfigAnalyzer {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Analyze all configuration files
   */
  analyze(): ConfigAnalysis {
    const detectedConfigs: string[] = [];
    
    const packageJson = this.analyzePackageJson();
    if (packageJson) detectedConfigs.push('package.json');
    
    const tsconfig = this.analyzeTsConfig();
    if (tsconfig) detectedConfigs.push('tsconfig.json');
    
    const dockerfile = this.analyzeDockerfile();
    if (dockerfile) detectedConfigs.push('Dockerfile');
    
    const dockerCompose = this.analyzeDockerCompose();
    if (dockerCompose) detectedConfigs.push('docker-compose.yml');
    
    const workflows = this.analyzeGitHubActions();
    if (workflows.length > 0) detectedConfigs.push('.github/workflows');
    
    const envFiles = this.analyzeEnvFiles();
    if (envFiles.length > 0) detectedConfigs.push('.env files');

    return {
      packageJson,
      tsconfig,
      dockerfile,
      dockerCompose,
      workflows,
      envFiles,
      detectedConfigs,
    };
  }

  /**
   * Analyze package.json
   */
  private analyzePackageJson(): PackageJsonAnalysis | undefined {
    const packagePath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packagePath)) return undefined;

    try {
      const content = fs.readFileSync(packagePath, 'utf-8');
      const pkg = JSON.parse(content);

      return {
        name: pkg.name || 'unknown',
        version: pkg.version || '0.0.0',
        type: pkg.type === 'module' ? 'module' : pkg.type === 'commonjs' ? 'commonjs' : 'unknown',
        scripts: pkg.scripts || {},
        dependencies: Object.keys(pkg.dependencies || {}),
        devDependencies: Object.keys(pkg.devDependencies || {}),
        peerDependencies: Object.keys(pkg.peerDependencies || {}),
        optionalDependencies: Object.keys(pkg.optionalDependencies || {}),
        engines: pkg.engines || {},
        workspaces: pkg.workspaces,
        hasWorkspaces: !!pkg.workspaces && pkg.workspaces.length > 0,
        main: pkg.main,
        types: pkg.types,
        exports: pkg.exports,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Analyze tsconfig.json
   */
  private analyzeTsConfig(): TsConfigAnalysis | undefined {
    const tsconfigPath = path.join(this.projectPath, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) return undefined;

    try {
      const content = fs.readFileSync(tsconfigPath, 'utf-8');
      // Remove comments from JSON
      const cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const config = JSON.parse(cleanContent);

      const compilerOptions = config.compilerOptions || {};

      return {
        compilerOptions: {
          target: compilerOptions.target,
          module: compilerOptions.module,
          lib: compilerOptions.lib,
          strict: compilerOptions.strict,
          esModuleInterop: compilerOptions.esModuleInterop,
          skipLibCheck: compilerOptions.skipLibCheck,
          forceConsistentCasingInFileNames: compilerOptions.forceConsistentCasingInFileNames,
          resolveJsonModule: compilerOptions.resolveJsonModule,
          declaration: compilerOptions.declaration,
          sourceMap: compilerOptions.sourceMap,
          outDir: compilerOptions.outDir,
          rootDir: compilerOptions.rootDir,
          baseUrl: compilerOptions.baseUrl,
          paths: compilerOptions.paths,
          typeRoots: compilerOptions.typeRoots,
          types: compilerOptions.types,
        },
        include: config.include,
        exclude: config.exclude,
        extends: config.extends,
        references: config.references,
        hasPathMapping: !!compilerOptions.paths && Object.keys(compilerOptions.paths).length > 0,
        isMonorepo: !!config.references && config.references.length > 0,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Analyze Dockerfile
   */
  private analyzeDockerfile(): DockerfileAnalysis | undefined {
    const dockerfilePath = path.join(this.projectPath, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) return undefined;

    try {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      const lines = content.split('\n');

      const stages: DockerfileStage[] = [];
      let currentStage: DockerfileStage | null = null;
      let stageIndex = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Detect FROM statements (new stage)
        const fromMatch = trimmed.match(/^FROM\s+(\S+)(?:\s+AS\s+(\S+))?/i);
        if (fromMatch) {
          if (currentStage) {
            stages.push(currentStage);
          }
          currentStage = {
            name: fromMatch[2] || `stage-${stageIndex}`,
            baseImage: fromMatch[1],
            hasBuildStage: /node|python|golang|rust/i.test(fromMatch[1]),
            exposedPorts: [],
            commands: [],
          };
          stageIndex++;
        }

        // Detect EXPOSE statements
        const exposeMatch = trimmed.match(/^EXPOSE\s+(\d+)/i);
        if (exposeMatch && currentStage) {
          const port = parseInt(exposeMatch[1], 10);
          currentStage.exposedPorts.push(port);
        }

        // Collect commands
        if (currentStage && /^(RUN|CMD|ENTRYPOINT|COPY|ADD)/i.test(trimmed)) {
          currentStage.commands.push(trimmed);
        }
      }

      if (currentStage) {
        stages.push(currentStage);
      }

      const allPorts = stages.flatMap(s => s.exposedPorts);
      const finalStage = stages[stages.length - 1];

      return {
        stages,
        isMultiStage: stages.length > 1,
        totalStages: stages.length,
        finalImage: finalStage?.baseImage || 'unknown',
        exposedPorts: [...new Set(allPorts)],
        hasHealthCheck: content.includes('HEALTHCHECK'),
        hasEntrypoint: content.includes('ENTRYPOINT'),
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Analyze docker-compose.yml
   */
  private analyzeDockerCompose(): DockerComposeAnalysis | undefined {
    const composePaths = [
      path.join(this.projectPath, 'docker-compose.yml'),
      path.join(this.projectPath, 'docker-compose.yaml'),
    ];

    const composePath = composePaths.find(p => fs.existsSync(p));
    if (!composePath) return undefined;

    try {
      const content = fs.readFileSync(composePath, 'utf-8');
      const compose = this.parseYaml(content);

      const services: DockerComposeService[] = [];
      const serviceEntries = compose.services || {};

      for (const [name, service] of Object.entries(serviceEntries)) {
        const svc = service as any;
        services.push({
          name,
          image: svc.image,
          build: svc.build,
          ports: svc.ports || [],
          environment: svc.environment || {},
          dependsOn: svc.depends_on || [],
          volumes: svc.volumes || [],
          networks: svc.networks || [],
          command: svc.command,
          restart: svc.restart,
        });
      }

      return {
        version: compose.version || '3',
        services,
        networks: Object.keys(compose.networks || {}),
        volumes: Object.keys(compose.volumes || {}),
        totalServices: services.length,
        hasExternalVolumes: content.includes('external: true'),
        hasCustomNetworks: Object.keys(compose.networks || {}).length > 0,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Analyze GitHub Actions workflows
   */
  private analyzeGitHubActions(): GitHubActionWorkflow[] {
    const workflowsDir = path.join(this.projectPath, '.github', 'workflows');
    if (!fs.existsSync(workflowsDir)) return [];

    const workflows: GitHubActionWorkflow[] = [];
    const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    for (const file of files) {
      const filePath = path.join(workflowsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const workflow = this.parseYaml(content);

        const triggers: string[] = [];
        if (workflow.on) {
          if (typeof workflow.on === 'string') {
            triggers.push(workflow.on);
          } else if (Array.isArray(workflow.on)) {
            triggers.push(...workflow.on);
          } else {
            triggers.push(...Object.keys(workflow.on));
          }
        }

        const jobs: GitHubActionJob[] = [];
        for (const [name, job] of Object.entries(workflow.jobs || {})) {
          const jobData = job as any;
          const steps: GitHubActionStep[] = (jobData.steps || []).map((step: any) => ({
            name: step.name,
            uses: step.uses,
            run: step.run,
            with: step.with,
            env: step.env,
            if: step.if,
          }));

          jobs.push({
            name,
            runsOn: jobData['runs-on'] || 'ubuntu-latest',
            steps,
            needs: jobData.needs,
            if: jobData.if,
            strategy: jobData.strategy,
          });
        }

        const allActions = jobs.flatMap(j => j.steps.map(s => s.uses).filter(Boolean) as string[]);

        workflows.push({
          name: workflow.name || file.replace('.yml', '').replace('.yaml', ''),
          file,
          triggers,
          jobs,
          totalJobs: jobs.length,
          usesActions: [...new Set(allActions)],
          hasSecrets: content.includes('secrets.'),
          hasMatrix: content.includes('matrix:'),
        });
      } catch {
        // Skip invalid workflow files
      }
    }

    return workflows;
  }

  /**
   * Analyze .env files
   */
  private analyzeEnvFiles(): EnvFileAnalysis[] {
    const envFiles: EnvFileAnalysis[] = [];
    const envPatterns = ['.env', '.env.local', '.env.development', '.env.production', '.env.test'];

    for (const pattern of envPatterns) {
      const envPath = path.join(this.projectPath, pattern);
      if (!fs.existsSync(envPath)) continue;

      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const variables: Record<string, string> = {};

        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;

          const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
          if (match) {
            variables[match[1]] = match[2].replace(/^["']|["']$/g, '');
          }
        }

        const varNames = Object.keys(variables);
        envFiles.push({
          file: pattern,
          variables,
          hasDatabaseUrl: varNames.some(v => /DATABASE_URL|DB_|POSTGRES|MYSQL|MONGODB/i.test(v)),
          hasApiKeys: varNames.some(v => /API_KEY|SECRET|TOKEN|PRIVATE/i.test(v)),
          hasSecrets: varNames.some(v => /PASSWORD|SECRET|PRIVATE|KEY/i.test(v)),
          count: varNames.length,
        });
      } catch {
        // Skip invalid env files
      }
    }

    return envFiles;
  }

  /**
   * Simple YAML parser for docker-compose and workflow files
   */
  private parseYaml(content: string): any {
    // Basic YAML to JSON conversion
    // For production, use a proper YAML parser like 'yaml' package
    const lines = content.split('\n');
    const result: any = {};
    let currentSection: string | null = null;
    let currentSubsection: string | null = null;
    let indent = 0;

    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;

      const match = line.match(/^(\s*)(\w+):\s*(.*)$/);
      if (match) {
        const [, spaces, key, value] = match;
        const level = spaces.length / 2;

        if (level === 0) {
          currentSection = key;
          result[key] = value || {};
          currentSubsection = null;
        } else if (level === 1 && currentSection) {
          currentSubsection = key;
          if (!result[currentSection]) result[currentSection] = {};
          result[currentSection][key] = value || {};
        } else if (level === 2 && currentSection && currentSubsection) {
          if (typeof result[currentSection][currentSubsection] === 'object') {
            result[currentSection][currentSubsection][key] = value || {};
          }
        }
      }
    }

    return result;
  }
}

/**
 * Analyze project configuration
 */
export function analyzeProjectConfig(projectPath: string): ConfigAnalysis {
  const analyzer = new ConfigAnalyzer(projectPath);
  return analyzer.analyze();
}
