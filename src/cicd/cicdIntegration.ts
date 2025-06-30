import * as vscode from 'vscode';
import { WorkflowDiscovery, DiscoveryResult } from './workflowDiscovery';
import { WorkflowIntegrator, IntegrationOptions } from './workflowIntegrator';
import { WorkflowTrigger } from './workflowTrigger';

export class CICDIntegration {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;
  private discovery: WorkflowDiscovery;
  private integrator: WorkflowIntegrator;
  private trigger: WorkflowTrigger;
  private discoveryResult?: DiscoveryResult;

  constructor(outputChannel: vscode.OutputChannel, workspaceRoot: string) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
    this.discovery = new WorkflowDiscovery(outputChannel, workspaceRoot);
    this.integrator = new WorkflowIntegrator(outputChannel, workspaceRoot);
    this.trigger = new WorkflowTrigger(outputChannel, workspaceRoot);
  }

  /**
   * Initialize CI/CD integration
   */
  async initialize(): Promise<void> {
    this.outputChannel.appendLine('🔄 Initializing CI/CD Integration...');

    try {
      // Discover existing workflows and project setup
      this.discoveryResult = await this.discovery.scanProject();
      
      // Setup GitHub API if possible
      await this.trigger.setupGitHubAPI();

      this.outputChannel.appendLine('✅ CI/CD Integration initialized');

      // Show discovery results to user if integration is recommended
      if (this.discoveryResult.recommendIntegration) {
        this.showIntegrationSuggestion();
      }

    } catch (error) {
      this.outputChannel.appendLine(`❌ CI/CD initialization failed: ${error}`);
    }
  }

  /**
   * Show integration suggestion to user
   */
  private async showIntegrationSuggestion(): Promise<void> {
    if (!this.discoveryResult) return;

    const readiness = this.discovery.getReadinessScore(this.discoveryResult);
    const message = `CI/CD integration is recommended for your project (${readiness}% ready). Would you like to set it up?`;

    const result = await vscode.window.showInformationMessage(
      message,
      'Setup Integration',
      'View Details',
      'Skip'
    );

    switch (result) {
      case 'Setup Integration':
        await this.setupIntegration();
        break;
      case 'View Details':
        await this.showDiscoveryDetails();
        break;
    }
  }

  /**
   * Setup CI/CD integration
   */
  async setupIntegration(): Promise<void> {
    if (!this.discoveryResult) {
      vscode.window.showWarningMessage('Please run discovery first');
      return;
    }

    try {
      const options = await this.integrator.setupIntegration(this.discoveryResult);
      if (options) {
        vscode.window.showInformationMessage('CI/CD integration setup completed!');
      }
    } catch (error) {
      this.outputChannel.appendLine(`❌ Integration setup failed: ${error}`);
      vscode.window.showErrorMessage('CI/CD integration setup failed');
    }
  }

  /**
   * Show discovery details
   */
  async showDiscoveryDetails(): Promise<void> {
    if (!this.discoveryResult) return;

    const items = [
      {
        label: '📊 Project Analysis',
        description: `${this.discoveryResult.workflowFiles.length} workflows, ${this.discoveryResult.hasBDDTests ? 'BDD detected' : 'No BDD'}`
      },
      ...this.discoveryResult.suggestions.map(suggestion => ({
        label: '💡 Suggestion',
        description: suggestion
      }))
    ];

    await vscode.window.showQuickPick(items, {
      placeHolder: 'CI/CD Discovery Results'
    });
  }

  /**
   * Show workflow management interface
   */
  async manageWorkflows(): Promise<void> {
    if (!this.discoveryResult) {
      await this.initialize();
    }

    if (!this.discoveryResult || this.discoveryResult.workflowFiles.length === 0) {
      vscode.window.showInformationMessage('No GitHub Actions workflows found');
      return;
    }

    await this.trigger.showWorkflowStatus(this.discoveryResult.workflowFiles);
  }

  /**
   * Generate reports
   */
  async generateReports(): Promise<void> {
    try {
      this.outputChannel.appendLine('📊 Starting report generation...');
      
      // For now, show a simple success message
      // In the full implementation, this would integrate with the ReportingEngine
      vscode.window.showInformationMessage('Report generation feature coming soon!');
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Report generation failed: ${error}`);
      vscode.window.showErrorMessage('Report generation failed');
    }
  }

  /**
   * Get current integration status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    hasWorkflows: boolean;
    hasBDDTests: boolean;
    integrationEnabled: boolean;
  }> {
    const integrationStatus = await this.integrator.getIntegrationStatus();
    
    return {
      initialized: !!this.discoveryResult,
      hasWorkflows: this.discoveryResult?.hasGitHubActions || false,
      hasBDDTests: this.discoveryResult?.hasBDDTests || false,
      integrationEnabled: integrationStatus.enabled
    };
  }

  /**
   * Refresh discovery results
   */
  async refresh(): Promise<void> {
    this.outputChannel.appendLine('🔄 Refreshing CI/CD discovery...');
    this.discoveryResult = await this.discovery.scanProject();
  }
}
