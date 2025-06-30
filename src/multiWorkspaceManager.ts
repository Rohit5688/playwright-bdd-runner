import * as vscode from 'vscode';
import * as path from 'path';
import { EventEmitter } from 'events';
import { AutoDiscoveryService, ProjectConfiguration } from './autoDiscovery';

export interface WorkspaceConfig {
  id: string;
  name: string;
  rootPath: string;
  isActive: boolean;
  configuration: ProjectConfiguration;
  lastAccessed: Date;
  featureCount: number;
  stepCount: number;
  testResults?: {
    total: number;
    passed: number;
    failed: number;
    lastRun: Date;
  };
}

export interface WorkspaceGroup {
  id: string;
  name: string;
  description?: string;
  workspaces: string[]; // workspace IDs
  color?: string;
  tags: string[];
}

export interface CrossWorkspaceSearchResult {
  workspaceId: string;
  workspaceName: string;
  filePath: string;
  matchText: string;
  matchType: 'feature' | 'scenario' | 'step';
  line?: number;
}

export class MultiWorkspaceManager extends EventEmitter {
  private workspaces: Map<string, WorkspaceConfig> = new Map();
  private workspaceGroups: Map<string, WorkspaceGroup> = new Map();
  private activeWorkspace?: string;
  private outputChannel: vscode.OutputChannel;
  private autoDiscoveryServices: Map<string, AutoDiscoveryService> = new Map();

  constructor(outputChannel: vscode.OutputChannel) {
    super();
    this.outputChannel = outputChannel;
    this.initialize();
  }

  /**
   * Initialize multi-workspace support
   */
  private async initialize(): Promise<void> {
    this.outputChannel.appendLine('🏢 Initializing Multi-Workspace Manager...');

    // Load existing workspace configurations
    await this.loadWorkspaceConfigurations();

    // Discover current workspaces
    await this.discoverWorkspaces();

    // Set up workspace change listeners
    this.setupWorkspaceListeners();

    this.outputChannel.appendLine(`✅ Multi-Workspace Manager initialized with ${this.workspaces.size} workspaces`);
  }

  /**
   * Discover all open workspaces
   */
  private async discoverWorkspaces(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders) {
      this.outputChannel.appendLine('ℹ️ No workspace folders detected');
      return;
    }

    for (const folder of workspaceFolders) {
      await this.addWorkspace(folder.uri.fsPath, folder.name);
    }

    // Set the first workspace as active if none is set
    if (!this.activeWorkspace && this.workspaces.size > 0) {
      const firstWorkspace = Array.from(this.workspaces.keys())[0];
      await this.setActiveWorkspace(firstWorkspace);
    }
  }

  /**
   * Add a workspace to management
   */
  async addWorkspace(rootPath: string, name?: string): Promise<string> {
    const workspaceId = this.generateWorkspaceId(rootPath);
    
    // Check if workspace already exists
    if (this.workspaces.has(workspaceId)) {
      this.outputChannel.appendLine(`⚠️ Workspace already exists: ${name || path.basename(rootPath)}`);
      return workspaceId;
    }

    try {
      this.outputChannel.appendLine(`📁 Adding workspace: ${name || path.basename(rootPath)}`);

      // Create auto-discovery service for this workspace
      const autoDiscovery = new AutoDiscoveryService(this.outputChannel, rootPath);
      this.autoDiscoveryServices.set(workspaceId, autoDiscovery);

      // Discover configuration
      const configuration = await autoDiscovery.discoverProjectConfiguration();

      // Count features and steps
      const stats = await this.analyzeWorkspace(rootPath, configuration);

      const workspace: WorkspaceConfig = {
        id: workspaceId,
        name: name || path.basename(rootPath),
        rootPath,
        isActive: false,
        configuration,
        lastAccessed: new Date(),
        featureCount: stats.featureCount,
        stepCount: stats.stepCount
      };

      this.workspaces.set(workspaceId, workspace);
      this.emit('workspaceAdded', workspace);

      this.outputChannel.appendLine(`✅ Added workspace: ${workspace.name} (${stats.featureCount} features, ${stats.stepCount} steps)`);
      
      return workspaceId;

    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to add workspace: ${error}`);
      throw error;
    }
  }

  /**
   * Remove a workspace from management
   */
  async removeWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    this.workspaces.delete(workspaceId);
    this.autoDiscoveryServices.delete(workspaceId);

    // If this was the active workspace, set another as active
    if (this.activeWorkspace === workspaceId) {
      const remaining = Array.from(this.workspaces.keys());
      if (remaining.length > 0) {
        await this.setActiveWorkspace(remaining[0]);
      } else {
        this.activeWorkspace = undefined;
      }
    }

    this.emit('workspaceRemoved', workspace);
    this.outputChannel.appendLine(`🗑️ Removed workspace: ${workspace.name}`);
  }

  /**
   * Set active workspace
   */
  async setActiveWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // Update previous active workspace
    if (this.activeWorkspace) {
      const prevWorkspace = this.workspaces.get(this.activeWorkspace);
      if (prevWorkspace) {
        prevWorkspace.isActive = false;
      }
    }

    // Set new active workspace
    workspace.isActive = true;
    workspace.lastAccessed = new Date();
    this.activeWorkspace = workspaceId;

    this.emit('activeWorkspaceChanged', workspace);
    this.outputChannel.appendLine(`🎯 Active workspace: ${workspace.name}`);
  }

  /**
   * Get active workspace
   */
  getActiveWorkspace(): WorkspaceConfig | undefined {
    return this.activeWorkspace ? this.workspaces.get(this.activeWorkspace) : undefined;
  }

  /**
   * Get all workspaces
   */
  getAllWorkspaces(): WorkspaceConfig[] {
    return Array.from(this.workspaces.values());
  }

  /**
   * Search across all workspaces
   */
  async searchAcrossWorkspaces(query: string, filters?: {
    workspaceIds?: string[];
    includeFeatures?: boolean;
    includeScenarios?: boolean;
    includeSteps?: boolean;
  }): Promise<CrossWorkspaceSearchResult[]> {
    const results: CrossWorkspaceSearchResult[] = [];
    const workspacesToSearch = filters?.workspaceIds || Array.from(this.workspaces.keys());

    this.outputChannel.appendLine(`🔍 Cross-workspace search: "${query}" across ${workspacesToSearch.length} workspaces`);

    for (const workspaceId of workspacesToSearch) {
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) continue;

      try {
        const workspaceResults = await this.searchInWorkspace(workspace, query, filters);
        results.push(...workspaceResults);
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Search failed in workspace ${workspace.name}: ${error}`);
      }
    }

    this.outputChannel.appendLine(`📊 Cross-workspace search completed: ${results.length} results found`);
    return results;
  }

  /**
   * Search within a specific workspace
   */
  private async searchInWorkspace(
    workspace: WorkspaceConfig,
    query: string,
    filters?: any
  ): Promise<CrossWorkspaceSearchResult[]> {
    const results: CrossWorkspaceSearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Search feature files
    const featureFolder = workspace.configuration.featureFolder || 'features';
    const featurePattern = `${featureFolder}/**/*.feature`;
    
    try {
      const featureFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspace.rootPath, featurePattern),
        '**/node_modules/**'
      );

      for (const file of featureFiles) {
        const content = await vscode.workspace.fs.readFile(file);
        const text = content.toString();
        const lines = text.split('\n');

        lines.forEach((line, index) => {
          const lineLower = line.toLowerCase();
          
          if (lineLower.includes(queryLower)) {
            let matchType: 'feature' | 'scenario' | 'step' = 'step';
            
            if (line.trim().match(/^\s*Feature:/i)) {
              matchType = 'feature';
            } else if (line.trim().match(/^\s*Scenario/i)) {
              matchType = 'scenario';
            }

            // Apply filters
            if (filters?.includeFeatures === false && matchType === 'feature') return;
            if (filters?.includeScenarios === false && matchType === 'scenario') return;
            if (filters?.includeSteps === false && matchType === 'step') return;

            results.push({
              workspaceId: workspace.id,
              workspaceName: workspace.name,
              filePath: file.fsPath,
              matchText: line.trim(),
              matchType,
              line: index + 1
            });
          }
        });
      }
    } catch (error) {
      // Ignore search errors for individual workspaces
    }

    return results;
  }

  /**
   * Create workspace group
   */
  createWorkspaceGroup(name: string, workspaceIds: string[], options?: {
    description?: string;
    color?: string;
    tags?: string[];
  }): string {
    const groupId = this.generateGroupId();
    
    const group: WorkspaceGroup = {
      id: groupId,
      name,
      description: options?.description,
      workspaces: workspaceIds,
      color: options?.color,
      tags: options?.tags || []
    };

    this.workspaceGroups.set(groupId, group);
    this.emit('workspaceGroupCreated', group);
    
    this.outputChannel.appendLine(`📂 Created workspace group: ${name} (${workspaceIds.length} workspaces)`);
    return groupId;
  }

  /**
   * Get workspace groups
   */
  getWorkspaceGroups(): WorkspaceGroup[] {
    return Array.from(this.workspaceGroups.values());
  }

  /**
   * Run tests across multiple workspaces
   */
  async runTestsAcrossWorkspaces(
    workspaceIds: string[],
    options?: {
      parallel?: boolean;
      maxConcurrency?: number;
      grep?: string;
    }
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    this.outputChannel.appendLine(`🚀 Running tests across ${workspaceIds.length} workspaces`);

    if (options?.parallel) {
      // Run tests in parallel
      const promises = workspaceIds.map(id => this.runTestsInWorkspace(id, options));
      const workspaceResults = await Promise.allSettled(promises);
      
      workspaceResults.forEach((result, index) => {
        const workspaceId = workspaceIds[index];
        if (result.status === 'fulfilled') {
          results.set(workspaceId, result.value);
        } else {
          results.set(workspaceId, { error: result.reason });
        }
      });
    } else {
      // Run tests sequentially
      for (const workspaceId of workspaceIds) {
        try {
          const result = await this.runTestsInWorkspace(workspaceId, options);
          results.set(workspaceId, result);
        } catch (error) {
          results.set(workspaceId, { error });
        }
      }
    }

    this.outputChannel.appendLine(`✅ Cross-workspace test execution completed`);
    return results;
  }

  /**
   * Run tests in a specific workspace
   */
  private async runTestsInWorkspace(workspaceId: string, options?: any): Promise<any> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    this.outputChannel.appendLine(`▶️ Running tests in workspace: ${workspace.name}`);

    // Implementation would run tests using the workspace's configuration
    // This would integrate with the existing test runner but scoped to the workspace
    
    return {
      workspaceId,
      success: true,
      duration: 1000, // placeholder
      tests: { total: 10, passed: 8, failed: 2 } // placeholder
    };
  }

  /**
   * Synchronize configurations across workspaces
   */
  async synchronizeConfigurations(sourceWorkspaceId: string, targetWorkspaceIds: string[]): Promise<void> {
    const sourceWorkspace = this.workspaces.get(sourceWorkspaceId);
    if (!sourceWorkspace) {
      throw new Error(`Source workspace not found: ${sourceWorkspaceId}`);
    }

    this.outputChannel.appendLine(`🔄 Synchronizing configuration from ${sourceWorkspace.name} to ${targetWorkspaceIds.length} workspaces`);

    for (const targetId of targetWorkspaceIds) {
      const targetWorkspace = this.workspaces.get(targetId);
      if (!targetWorkspace) {
        this.outputChannel.appendLine(`⚠️ Target workspace not found: ${targetId}`);
        continue;
      }

      try {
        // Copy configuration settings
        const autoDiscovery = this.autoDiscoveryServices.get(targetId);
        if (autoDiscovery) {
          await autoDiscovery.applyDiscoveredConfiguration(sourceWorkspace.configuration);
          this.outputChannel.appendLine(`✅ Synchronized configuration to ${targetWorkspace.name}`);
        }
      } catch (error) {
        this.outputChannel.appendLine(`❌ Failed to sync to ${targetWorkspace.name}: ${error}`);
      }
    }
  }

  /**
   * Generate workspace analytics
   */
  generateAnalytics(): {
    totalWorkspaces: number;
    totalFeatures: number;
    totalSteps: number;
    workspacesBySize: Array<{ name: string; features: number; steps: number }>;
    recentlyUsed: WorkspaceConfig[];
  } {
    const workspaces = Array.from(this.workspaces.values());
    
    return {
      totalWorkspaces: workspaces.length,
      totalFeatures: workspaces.reduce((sum, ws) => sum + ws.featureCount, 0),
      totalSteps: workspaces.reduce((sum, ws) => sum + ws.stepCount, 0),
      workspacesBySize: workspaces
        .map(ws => ({ name: ws.name, features: ws.featureCount, steps: ws.stepCount }))
        .sort((a, b) => b.features - a.features),
      recentlyUsed: workspaces
        .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
        .slice(0, 5)
    };
  }

  /**
   * Export workspace configuration
   */
  exportWorkspaceConfiguration(): string {
    const config = {
      workspaces: Array.from(this.workspaces.values()),
      groups: Array.from(this.workspaceGroups.values()),
      activeWorkspace: this.activeWorkspace,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Import workspace configuration
   */
  async importWorkspaceConfiguration(config: string): Promise<void> {
    try {
      const parsed = JSON.parse(config);
      
      // Clear existing configuration
      this.workspaces.clear();
      this.workspaceGroups.clear();
      this.autoDiscoveryServices.clear();

      // Import workspaces
      for (const workspace of parsed.workspaces || []) {
        this.workspaces.set(workspace.id, workspace);
        
        // Recreate auto-discovery service
        const autoDiscovery = new AutoDiscoveryService(this.outputChannel, workspace.rootPath);
        this.autoDiscoveryServices.set(workspace.id, autoDiscovery);
      }

      // Import groups
      for (const group of parsed.groups || []) {
        this.workspaceGroups.set(group.id, group);
      }

      // Set active workspace
      if (parsed.activeWorkspace && this.workspaces.has(parsed.activeWorkspace)) {
        await this.setActiveWorkspace(parsed.activeWorkspace);
      }

      this.outputChannel.appendLine(`📥 Imported ${this.workspaces.size} workspaces and ${this.workspaceGroups.size} groups`);
      this.emit('configurationImported');

    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to import configuration: ${error}`);
      throw new Error(`Import failed: ${error}`);
    }
  }

  /**
   * Setup workspace change listeners
   */
  private setupWorkspaceListeners(): void {
    vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
      // Handle added folders
      for (const folder of event.added) {
        await this.addWorkspace(folder.uri.fsPath, folder.name);
      }

      // Handle removed folders
      for (const folder of event.removed) {
        const workspaceId = this.generateWorkspaceId(folder.uri.fsPath);
        if (this.workspaces.has(workspaceId)) {
          await this.removeWorkspace(workspaceId);
        }
      }
    });
  }

  /**
   * Analyze workspace to get statistics
   */
  private async analyzeWorkspace(rootPath: string, config: ProjectConfiguration): Promise<{
    featureCount: number;
    stepCount: number;
  }> {
    let featureCount = 0;
    let stepCount = 0;

    try {
      // Count feature files
      const featureFolder = config.featureFolder || 'features';
      const featureFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(rootPath, `${featureFolder}/**/*.feature`),
        '**/node_modules/**'
      );
      featureCount = featureFiles.length;

      // Count step definition files
      const stepsFolder = config.stepsFolder || 'steps';
      const stepFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(rootPath, `${stepsFolder}/**/*.{js,ts,mjs,mts}`),
        '**/node_modules/**'
      );

      // Count individual step definitions (rough estimate)
      for (const file of stepFiles) {
        try {
          const content = await vscode.workspace.fs.readFile(file);
          const text = content.toString();
          const stepMatches = text.match(/(given|when|then)\s*\(/gi);
          stepCount += stepMatches ? stepMatches.length : 0;
        } catch {
          // Ignore individual file errors
        }
      }

    } catch (error) {
      // Return zeros if analysis fails
    }

    return { featureCount, stepCount };
  }

  /**
   * Load workspace configurations from storage
   */
  private async loadWorkspaceConfigurations(): Promise<void> {
    // Implementation would load from VS Code workspace state or settings
    // For now, this is a placeholder
  }

  /**
   * Save workspace configurations to storage
   */
  private async saveWorkspaceConfigurations(): Promise<void> {
    // Implementation would save to VS Code workspace state or settings
    // For now, this is a placeholder
  }

  private generateWorkspaceId(rootPath: string): string {
    return `workspace_${Buffer.from(rootPath).toString('base64').replace(/[=/+]/g, '').slice(0, 16)}`;
  }

  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
