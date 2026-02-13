import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GitHubWorkflow, DiscoveryResult } from './workflowDiscovery';

export interface IntegrationOptions {
  mode: 'view-only' | 'enhance' | 'full' | 'skip';
  generateReports: boolean;
  enableSlackNotifications: boolean;
  workflowFile?: string;
  slackWebhook?: string;
  reportFormats: ('json' | 'html' | 'xml')[];
}

export interface WorkflowEnhancement {
  addReporting: boolean;
  addManualTrigger: boolean;
  addBDDSteps: boolean;
  addArtifacts: boolean;
}

export class WorkflowIntegrator {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;

  constructor(outputChannel: vscode.OutputChannel, workspaceRoot: string) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Setup CI/CD integration based on user preferences
   */
  async setupIntegration(discoveryResult: DiscoveryResult): Promise<IntegrationOptions | null> {
    this.outputChannel.appendLine('🔧 Setting up CI/CD integration...');

    try {
      // Show integration options to user
      const options = await this.showIntegrationWizard(discoveryResult);
      if (!options || options.mode === 'skip') {
        this.outputChannel.appendLine('ℹ️ User chose to skip CI/CD integration');
        return null;
      }

      // Apply selected integration
      await this.applyIntegration(options, discoveryResult);
      
      // Save configuration
      await this.saveIntegrationConfig(options);

      this.outputChannel.appendLine('✅ CI/CD integration setup completed');
      return options;

    } catch (error) {
      this.outputChannel.appendLine(`❌ Integration setup failed: ${error}`);
      vscode.window.showErrorMessage(`Failed to setup CI/CD integration: ${error}`);
      return null;
    }
  }

  /**
   * Show integration wizard to user
   */
  private async showIntegrationWizard(discoveryResult: DiscoveryResult): Promise<IntegrationOptions | null> {
    // Step 1: Choose integration mode
    const modeOptions = [
      {
        label: '👀 View Only',
        description: 'Monitor existing workflows without changes',
        detail: 'Track workflow status and view results in VS Code',
        mode: 'view-only' as const
      },
      {
        label: '🔧 Enhance Existing',
        description: 'Add BDD reporting to existing workflows',
        detail: 'Enhance current workflows with better reporting and notifications',
        mode: 'enhance' as const
      },
      {
        label: '🚀 Full Integration',
        description: 'Create optimized BDD workflow',
        detail: 'Generate new workflow with all BDD features and reporting',
        mode: 'full' as const
      },
      {
        label: '❌ Skip Integration',
        description: 'Use extension without CI/CD features',
        detail: 'Only use local testing and reporting features',
        mode: 'skip' as const
      }
    ];

    const selectedMode = await vscode.window.showQuickPick(modeOptions, {
      placeHolder: 'How would you like to integrate with CI/CD?',
      matchOnDescription: true
    });

    if (!selectedMode || selectedMode.mode === 'skip') {
      return null;
    }

    // Step 2: Configure report formats
    const reportFormats = await vscode.window.showQuickPick([
      { label: 'JSON', description: 'Machine-readable format for APIs', picked: true },
      { label: 'HTML', description: 'Rich visual dashboard', picked: true },
      { label: 'XML (JUnit)', description: 'Standard CI format', picked: true }
    ], {
      placeHolder: 'Select report formats to generate',
      canPickMany: true
    });

    if (!reportFormats || reportFormats.length === 0) {
      vscode.window.showWarningMessage('At least one report format must be selected');
      return null;
    }

    // Step 3: Slack integration (optional)
    const enableSlack = await vscode.window.showQuickPick([
      { label: 'Yes', description: 'Enable Slack notifications', value: true },
      { label: 'No', description: 'Skip Slack integration', value: false }
    ], {
      placeHolder: 'Enable Slack notifications?'
    });

    let slackWebhook: string | undefined;
    if (enableSlack?.value) {
      slackWebhook = await vscode.window.showInputBox({
        prompt: 'Enter Slack webhook URL',
        placeHolder: 'https://hooks.slack.com/services/...',
        validateInput: (value) => {
          if (!value.startsWith('https://hooks.slack.com/')) {
            return 'Please enter a valid Slack webhook URL';
          }
          return undefined;
        }
      });

      if (!slackWebhook) {
        const skipSlack = await vscode.window.showWarningMessage(
          'Slack webhook is required for notifications. Continue without Slack?',
          'Continue',
          'Cancel'
        );
        if (skipSlack !== 'Continue') {
          return null;
        }
      }
    }

    // Step 4: Workflow selection (for enhance mode)
    let workflowFile: string | undefined;
    if (selectedMode.mode === 'enhance' && discoveryResult.workflowFiles.length > 0) {
      const workflowOptions = discoveryResult.workflowFiles.map(w => ({
        label: w.name,
        description: `${w.triggers.join(', ')} • ${w.jobs.length} jobs`,
        detail: w.file,
        workflow: w
      }));

      const selectedWorkflow = await vscode.window.showQuickPick(workflowOptions, {
        placeHolder: 'Select workflow to enhance'
      });

      if (selectedWorkflow) {
        workflowFile = selectedWorkflow.workflow.file;
      }
    }

    return {
      mode: selectedMode.mode,
      generateReports: true,
      enableSlackNotifications: !!slackWebhook,
      workflowFile,
      slackWebhook,
      reportFormats: reportFormats.map(f => f.label.toLowerCase().replace(' (junit)', '')) as ('json' | 'html' | 'xml')[]
    };
  }

  /**
   * Apply the selected integration
   */
  private async applyIntegration(options: IntegrationOptions, discoveryResult: DiscoveryResult): Promise<void> {
    switch (options.mode) {
      case 'view-only':
        await this.setupViewOnlyMode(options);
        break;
      case 'enhance':
        await this.enhanceExistingWorkflow(options, discoveryResult);
        break;
      case 'full':
        await this.createFullIntegration(options, discoveryResult);
        break;
    }
  }

  /**
   * Setup view-only mode
   */
  private async setupViewOnlyMode(options: IntegrationOptions): Promise<void> {
    this.outputChannel.appendLine('👀 Setting up view-only mode...');
    
    // Just configure monitoring and reporting without modifying workflows
    vscode.window.showInformationMessage(
      'View-only mode configured. You can now monitor workflows and generate reports locally.'
    );
  }

  /**
   * Enhance existing workflow
   */
  private async enhanceExistingWorkflow(options: IntegrationOptions, discoveryResult: DiscoveryResult): Promise<void> {
    if (!options.workflowFile) {
      throw new Error('No workflow file selected for enhancement');
    }

    this.outputChannel.appendLine(`🔧 Enhancing workflow: ${options.workflowFile}`);

    const workflow = discoveryResult.workflowFiles.find(w => w.file === options.workflowFile);
    if (!workflow) {
      throw new Error(`Workflow not found: ${options.workflowFile}`);
    }

    // Determine what enhancements to apply
    const enhancements = await this.planWorkflowEnhancements(workflow, options);
    
    // Show enhancement preview
    const proceed = await this.showEnhancementPreview(enhancements, workflow);
    if (!proceed) {
      return;
    }

    // Apply enhancements
    await this.applyWorkflowEnhancements(workflow, enhancements, options);
    
    vscode.window.showInformationMessage(
      `Workflow '${workflow.name}' enhanced successfully! Check .github/workflows/${workflow.file}`
    );
  }

  /**
   * Create full BDD integration
   */
  private async createFullIntegration(options: IntegrationOptions, discoveryResult: DiscoveryResult): Promise<void> {
    this.outputChannel.appendLine('🚀 Creating full BDD integration...');

    // Generate optimized BDD workflow
    const workflowContent = await this.generateBDDWorkflow(options, discoveryResult);
    
    // Create .github/workflows directory if it doesn't exist
    const workflowsDir = path.join(this.workspaceRoot, '.github', 'workflows');
    await fs.promises.mkdir(workflowsDir, { recursive: true });
    
    // Write workflow file
    const workflowPath = path.join(workflowsDir, 'bdd-tests.yml');
    await fs.promises.writeFile(workflowPath, workflowContent);

    this.outputChannel.appendLine(`✅ Created workflow: .github/workflows/bdd-tests.yml`);
    
    vscode.window.showInformationMessage(
      'Full BDD workflow created! Check .github/workflows/bdd-tests.yml',
      'Open Workflow'
    ).then(action => {
      if (action === 'Open Workflow') {
        vscode.workspace.openTextDocument(workflowPath).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      }
    });
  }

  /**
   * Plan workflow enhancements
   */
  private async planWorkflowEnhancements(workflow: GitHubWorkflow, options: IntegrationOptions): Promise<WorkflowEnhancement> {
    return {
      addReporting: options.generateReports && !workflow.hasBDDTests,
      addManualTrigger: !workflow.triggers.includes('manual'),
      addBDDSteps: !workflow.hasBDDTests,
      addArtifacts: options.generateReports
    };
  }

  /**
   * Show enhancement preview to user
   */
  private async showEnhancementPreview(enhancements: WorkflowEnhancement, workflow: GitHubWorkflow): Promise<boolean> {
    const changes: string[] = [];
    
    if (enhancements.addBDDSteps) {
      changes.push('• Add BDD test execution steps');
    }
    if (enhancements.addReporting) {
      changes.push('• Add report generation and upload');
    }
    if (enhancements.addManualTrigger) {
      changes.push('• Add manual workflow trigger');
    }
    if (enhancements.addArtifacts) {
      changes.push('• Add test result artifacts');
    }

    if (changes.length === 0) {
      vscode.window.showInformationMessage('No enhancements needed - workflow is already optimized!');
      return false;
    }

    const message = `The following changes will be made to '${workflow.name}':\n\n${changes.join('\n')}`;
    
    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      'Apply Changes',
      'Cancel'
    );

    return result === 'Apply Changes';
  }

  /**
   * Apply workflow enhancements
   */
  private async applyWorkflowEnhancements(
    workflow: GitHubWorkflow, 
    enhancements: WorkflowEnhancement, 
    options: IntegrationOptions
  ): Promise<void> {
    // Read existing workflow
    const content = await fs.promises.readFile(workflow.path, 'utf8');
    let enhancedContent = content;

    // Add manual trigger if needed
    if (enhancements.addManualTrigger) {
      enhancedContent = this.addManualTrigger(enhancedContent);
    }

    // Add BDD steps if needed
    if (enhancements.addBDDSteps || enhancements.addReporting) {
      enhancedContent = this.addBDDSteps(enhancedContent, options);
    }

    // Backup original workflow
    const backupPath = `${workflow.path}.backup`;
    await fs.promises.copyFile(workflow.path, backupPath);
    this.outputChannel.appendLine(`📋 Backup created: ${path.basename(backupPath)}`);

    // Write enhanced workflow
    await fs.promises.writeFile(workflow.path, enhancedContent);
  }

  /**
   * Generate optimized BDD workflow
   */
  private async generateBDDWorkflow(options: IntegrationOptions, discoveryResult: DiscoveryResult): Promise<string> {
    const hasTypeScript = discoveryResult.hasPlaywrightConfig;
    const reportSteps = this.generateReportSteps(options.reportFormats);
    const slackStep = options.enableSlackNotifications ? this.generateSlackStep() : '';

    return `name: BDD Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  bdd-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
      fail-fast: false
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        
      ${hasTypeScript ? `- name: Build TypeScript
        run: npm run build` : ''}
        
      - name: Run BDD Tests
        run: npx playwright test --project=\${{ matrix.browser }} --reporter=json
        env:
          CI: true
          
      ${reportSteps}
      
      ${slackStep}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-\${{ matrix.browser }}
          path: |
            test-results/
            playwright-report/
          retention-days: 7
          
  aggregate-results:
    needs: bdd-tests
    if: always()
    runs-on: ubuntu-latest
    
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        
      - name: Aggregate test results
        run: |
          echo "Aggregating test results from all browsers..."
          # Custom aggregation logic would go here
          
      ${options.enableSlackNotifications ? `- name: Send summary to Slack
        if: always()
        run: |
          echo "Sending aggregated results to Slack..."
          # Slack notification logic` : ''}
`;
  }

  /**
   * Generate report generation steps
   */
  private generateReportSteps(formats: ('json' | 'html' | 'xml')[]): string {
    const steps: string[] = [];

    if (formats.includes('html')) {
      steps.push(`      - name: Generate HTML Report
        if: always()
        run: npx playwright show-report --host=0.0.0.0`);
    }

    if (formats.includes('xml')) {
      steps.push(`      - name: Generate JUnit Report
        if: always()
        run: npx playwright test --reporter=junit`);
    }

    return steps.join('\n        \n');
  }

  /**
   * Generate Slack notification step
   */
  private generateSlackStep(): string {
    return `      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: \${{ job.status }}
          webhook_url: \${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit,author,action,eventName,ref,workflow`;
  }

  /**
   * Add manual trigger to existing workflow
   */
  private addManualTrigger(content: string): string {
    const onMatch = content.match(/^on:\s*$/m);
    if (onMatch) {
      // Multi-line 'on:' section
      return content.replace(
        /^on:\s*\n/m,
        'on:\n  workflow_dispatch:\n'
      );
    }

    const onLineMatch = content.match(/^on:\s*(.+)$/m);
    if (onLineMatch) {
      // Single-line 'on:' section
      const triggers = onLineMatch[1];
      if (!triggers.includes('workflow_dispatch')) {
        return content.replace(
          /^on:\s*(.+)$/m,
          'on: [$1, workflow_dispatch]'
        );
      }
    }

    return content;
  }

  /**
   * Add BDD test steps to existing workflow
   */
  private addBDDSteps(content: string, options: IntegrationOptions): string {
    const bddSteps = `
      - name: Run BDD Tests
        run: npx playwright test --reporter=json,html
        
      - name: Generate Reports
        if: always()
        run: |
          echo "Generating BDD test reports..."
          # Report generation steps would be added here
          
      ${options.enableSlackNotifications ? `- name: Notify Slack
        if: always()
        run: |
          echo "Sending results to Slack..."` : ''}`;

    // Find the last step in the first job and add BDD steps after it
    const stepsMatch = content.match(/(\s+steps:\s*\n[\s\S]*?)(\n\s*[a-zA-Z_])/);
    if (stepsMatch) {
      return content.replace(stepsMatch[1], stepsMatch[1] + bddSteps + '\n');
    }

    return content;
  }

  /**
   * Save integration configuration
   */
  private async saveIntegrationConfig(options: IntegrationOptions): Promise<void> {
    const config = vscode.workspace.getConfiguration('playwrightBdd');
    
    await config.update('cicd.mode', options.mode, vscode.ConfigurationTarget.Workspace);
    await config.update('cicd.reportFormats', options.reportFormats, vscode.ConfigurationTarget.Workspace);
    await config.update('cicd.enableSlackNotifications', options.enableSlackNotifications, vscode.ConfigurationTarget.Workspace);
    
    if (options.slackWebhook) {
      await config.update('cicd.slackWebhook', options.slackWebhook, vscode.ConfigurationTarget.Workspace);
    }

    this.outputChannel.appendLine('💾 Integration configuration saved');
  }

  /**
   * Get current integration status
   */
  async getIntegrationStatus(): Promise<{ enabled: boolean; mode?: string; lastCheck?: Date }> {
    const config = vscode.workspace.getConfiguration('playwrightBdd');
    const mode = config.get<string>('cicd.mode');
    
    return {
      enabled: !!mode && mode !== 'skip',
      mode,
      lastCheck: new Date() // TODO: Store actual last check time
    };
  }
}
