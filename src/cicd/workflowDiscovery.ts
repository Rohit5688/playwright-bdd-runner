import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface GitHubWorkflow {
  file: string;
  name: string;
  path: string;
  hasBDDTests: boolean;
  triggers: string[];
  jobs: string[];
  lastModified: Date;
}

export interface DiscoveryResult {
  hasGitHubActions: boolean;
  workflowFiles: GitHubWorkflow[];
  hasBDDTests: boolean;
  hasPlaywrightConfig: boolean;
  recommendIntegration: boolean;
  suggestions: string[];
}

export class WorkflowDiscovery {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;

  constructor(outputChannel: vscode.OutputChannel, workspaceRoot: string) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Scan the project for GitHub Actions workflows and BDD setup
   */
  async scanProject(): Promise<DiscoveryResult> {
    this.outputChannel.appendLine('🔍 Scanning project for CI/CD integration opportunities...');

    const result: DiscoveryResult = {
      hasGitHubActions: false,
      workflowFiles: [],
      hasBDDTests: false,
      hasPlaywrightConfig: false,
      recommendIntegration: false,
      suggestions: []
    };

    try {
      // Check for GitHub Actions workflows
      await this.discoverGitHubActions(result);
      
      // Check for BDD test setup
      await this.discoverBDDSetup(result);
      
      // Generate recommendations
      this.generateRecommendations(result);

      this.logDiscoveryResults(result);
      return result;

    } catch (error) {
      this.outputChannel.appendLine(`❌ Discovery failed: ${error}`);
      return result;
    }
  }

  /**
   * Discover GitHub Actions workflows
   */
  private async discoverGitHubActions(result: DiscoveryResult): Promise<void> {
    const workflowsPath = path.join(this.workspaceRoot, '.github', 'workflows');
    
    try {
      const workflowsExist = await this.directoryExists(workflowsPath);
      if (!workflowsExist) {
        this.outputChannel.appendLine('📁 No .github/workflows directory found');
        return;
      }

      const files = await fs.promises.readdir(workflowsPath);
      const yamlFiles = files.filter(file => 
        file.endsWith('.yml') || file.endsWith('.yaml')
      );

      if (yamlFiles.length === 0) {
        this.outputChannel.appendLine('📁 No workflow files found in .github/workflows');
        return;
      }

      result.hasGitHubActions = true;
      this.outputChannel.appendLine(`✅ Found ${yamlFiles.length} GitHub Actions workflow(s)`);

      // Analyze each workflow file
      for (const file of yamlFiles) {
        const filePath = path.join(workflowsPath, file);
        const workflow = await this.analyzeWorkflowFile(filePath, file);
        if (workflow) {
          result.workflowFiles.push(workflow);
        }
      }

    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error scanning GitHub Actions: ${error}`);
    }
  }

  /**
   * Analyze individual workflow file
   */
  private async analyzeWorkflowFile(filePath: string, fileName: string): Promise<GitHubWorkflow | null> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const stats = await fs.promises.stat(filePath);
      
      // Simple YAML parsing to extract basic info
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const triggers = this.extractTriggers(content);
      const jobs = this.extractJobs(content);
      const hasBDDTests = this.detectBDDInWorkflow(content);

      return {
        file: fileName,
        name: nameMatch ? nameMatch[1].trim().replace(/['"]/g, '') : fileName,
        path: filePath,
        hasBDDTests,
        triggers,
        jobs,
        lastModified: stats.mtime
      };

    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error analyzing workflow ${fileName}: ${error}`);
      return null;
    }
  }

  /**
   * Extract workflow triggers from YAML content
   */
  private extractTriggers(content: string): string[] {
    const triggers: string[] = [];
    
    // Look for 'on:' section
    const onMatch = content.match(/^on:\s*(.+)$/m);
    if (onMatch) {
      const triggerLine = onMatch[1];
      
      // Simple trigger detection
      if (triggerLine.includes('push')) triggers.push('push');
      if (triggerLine.includes('pull_request')) triggers.push('pull_request');
      if (triggerLine.includes('workflow_dispatch')) triggers.push('manual');
      if (triggerLine.includes('schedule')) triggers.push('scheduled');
    }

    // Multi-line triggers
    if (content.includes('push:')) triggers.push('push');
    if (content.includes('pull_request:')) triggers.push('pull_request');
    if (content.includes('workflow_dispatch:')) triggers.push('manual');
    if (content.includes('schedule:')) triggers.push('scheduled');

    return [...new Set(triggers)]; // Remove duplicates
  }

  /**
   * Extract job names from workflow
   */
  private extractJobs(content: string): string[] {
    const jobs: string[] = [];
    const jobMatches = content.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*?):/gm);
    
    if (jobMatches) {
      jobMatches.forEach(match => {
        const jobName = match.replace(':', '').trim();
        // Skip common non-job sections
        if (!['name', 'on', 'env', 'defaults', 'concurrency'].includes(jobName)) {
          jobs.push(jobName);
        }
      });
    }

    return jobs;
  }

  /**
   * Detect if workflow already includes BDD/Playwright testing
   */
  private detectBDDInWorkflow(content: string): boolean {
    const bddKeywords = [
      'playwright',
      'bdd',
      'cucumber',
      'gherkin',
      'feature',
      'scenario',
      'npx playwright test',
      'playwright-bdd'
    ];

    const lowerContent = content.toLowerCase();
    return bddKeywords.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * Discover BDD and Playwright setup in the project
   */
  private async discoverBDDSetup(result: DiscoveryResult): Promise<void> {
    // Check for Playwright config
    const playwrightConfigs = [
      'playwright.config.ts',
      'playwright.config.js',
      'playwright.config.mjs'
    ];

    for (const config of playwrightConfigs) {
      const configPath = path.join(this.workspaceRoot, config);
      if (await this.fileExists(configPath)) {
        result.hasPlaywrightConfig = true;
        this.outputChannel.appendLine(`✅ Found Playwright config: ${config}`);
        break;
      }
    }

    // Check for feature files
    try {
      const featureFiles = await vscode.workspace.findFiles('**/*.feature', '**/node_modules/**', 5);
      if (featureFiles.length > 0) {
        result.hasBDDTests = true;
        this.outputChannel.appendLine(`✅ Found ${featureFiles.length} .feature file(s)`);
      }
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error searching for feature files: ${error}`);
    }

    // Check package.json for BDD dependencies
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    if (await this.fileExists(packageJsonPath)) {
      try {
        const packageContent = await fs.promises.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        if (allDeps['playwright-bdd'] || allDeps['@cucumber/cucumber']) {
          result.hasBDDTests = true;
          this.outputChannel.appendLine('✅ Found BDD dependencies in package.json');
        }

        if (allDeps['@playwright/test']) {
          this.outputChannel.appendLine('✅ Found Playwright dependency');
        }

      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Error reading package.json: ${error}`);
      }
    }
  }

  /**
   * Generate integration recommendations based on discovery
   */
  private generateRecommendations(result: DiscoveryResult): void {
    result.suggestions = [];

    if (!result.hasGitHubActions && result.hasBDDTests) {
      result.recommendIntegration = true;
      result.suggestions.push('Create GitHub Actions workflow for automated BDD testing');
    }

    if (result.hasGitHubActions && result.hasBDDTests) {
      const bddWorkflows = result.workflowFiles.filter(w => w.hasBDDTests);
      if (bddWorkflows.length === 0) {
        result.recommendIntegration = true;
        result.suggestions.push('Add BDD test execution to existing workflows');
      } else {
        result.suggestions.push('Enhance existing BDD workflows with advanced reporting');
      }
    }

    if (result.hasGitHubActions && !result.hasBDDTests) {
      result.suggestions.push('Consider adding BDD tests to complement existing CI/CD');
    }

    if (!result.hasPlaywrightConfig && result.hasBDDTests) {
      result.suggestions.push('Setup Playwright configuration for better test execution');
    }

    // Workflow-specific suggestions
    result.workflowFiles.forEach(workflow => {
      if (!workflow.triggers.includes('manual')) {
        result.suggestions.push(`Add manual trigger to '${workflow.name}' workflow for on-demand execution`);
      }
      
      if (!workflow.hasBDDTests && result.hasBDDTests) {
        result.suggestions.push(`Integrate BDD tests into '${workflow.name}' workflow`);
      }
    });

    if (result.suggestions.length === 0) {
      result.suggestions.push('Your CI/CD setup looks good! Consider adding advanced reporting features.');
    }
  }

  /**
   * Get workflow by name
   */
  getWorkflowByName(workflows: GitHubWorkflow[], name: string): GitHubWorkflow | undefined {
    return workflows.find(w => w.name === name || w.file === name);
  }

  /**
   * Check if manual triggering is supported
   */
  supportsManualTrigger(workflow: GitHubWorkflow): boolean {
    return workflow.triggers.includes('manual');
  }

  /**
   * Get integration readiness score
   */
  getReadinessScore(result: DiscoveryResult): number {
    let score = 0;
    
    if (result.hasGitHubActions) score += 30;
    if (result.hasBDDTests) score += 30;
    if (result.hasPlaywrightConfig) score += 20;
    if (result.workflowFiles.some(w => w.hasBDDTests)) score += 20;
    
    return Math.min(score, 100);
  }

  /**
   * Log discovery results
   */
  private logDiscoveryResults(result: DiscoveryResult): void {
    this.outputChannel.appendLine('\n📋 CI/CD Discovery Results:');
    this.outputChannel.appendLine(`   GitHub Actions: ${result.hasGitHubActions ? '✅' : '❌'}`);
    this.outputChannel.appendLine(`   BDD Tests: ${result.hasBDDTests ? '✅' : '❌'}`);
    this.outputChannel.appendLine(`   Playwright Config: ${result.hasPlaywrightConfig ? '✅' : '❌'}`);
    this.outputChannel.appendLine(`   Workflows Found: ${result.workflowFiles.length}`);
    this.outputChannel.appendLine(`   Integration Ready: ${result.recommendIntegration ? '✅' : '⚠️'}`);
    
    if (result.workflowFiles.length > 0) {
      this.outputChannel.appendLine('\n📝 Workflows:');
      result.workflowFiles.forEach(workflow => {
        this.outputChannel.appendLine(`   - ${workflow.name} (${workflow.triggers.join(', ')})`);
      });
    }

    if (result.suggestions.length > 0) {
      this.outputChannel.appendLine('\n💡 Suggestions:');
      result.suggestions.forEach(suggestion => {
        this.outputChannel.appendLine(`   - ${suggestion}`);
      });
    }
  }

  // Utility methods
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
