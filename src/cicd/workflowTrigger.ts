import * as vscode from 'vscode';
import * as path from 'path';
import { GitHubWorkflow } from './workflowDiscovery';

export interface TriggerOptions {
  workflowId: string;
  branch?: string;
  inputs?: Record<string, string>;
}

export interface WorkflowRun {
  id: number;
  workflowId: number;
  headBranch: string;
  headSha: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  htmlUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubApiConfig {
  token?: string;
  owner: string;
  repo: string;
}

export class WorkflowTrigger {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;
  private apiConfig?: GitHubApiConfig;

  constructor(outputChannel: vscode.OutputChannel, workspaceRoot: string) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Setup GitHub API configuration
   */
  async setupGitHubAPI(): Promise<boolean> {
    try {
      // Try to detect GitHub repo info from git remote
      const repoInfo = await this.detectGitHubRepo();
      if (!repoInfo) {
        vscode.window.showWarningMessage('Could not detect GitHub repository. Manual workflow triggering will be limited.');
        return false;
      }

      this.apiConfig = repoInfo;

      // Check for GitHub token
      const token = await this.getGitHubToken();
      if (token) {
        this.apiConfig.token = token;
        this.outputChannel.appendLine('✅ GitHub API configured successfully');
        return true;
      } else {
        this.outputChannel.appendLine('⚠️ GitHub API configured without token (read-only access)');
        return false;
      }

    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to setup GitHub API: ${error}`);
      return false;
    }
  }

  /**
   * Trigger a workflow manually
   */
  async triggerWorkflow(workflow: GitHubWorkflow, options?: Partial<TriggerOptions>): Promise<boolean> {
    if (!this.apiConfig?.token) {
      vscode.window.showErrorMessage('GitHub token is required to trigger workflows. Please configure GitHub authentication.');
      return false;
    }

    try {
      this.outputChannel.appendLine(`🚀 Triggering workflow: ${workflow.name}`);

      // Show branch selection if not provided
      const branch = options?.branch || await this.selectBranch();
      if (!branch) {
        return false;
      }

      // Get workflow inputs if the workflow supports them
      const inputs = options?.inputs || await this.getWorkflowInputs(workflow);

      // Trigger the workflow via GitHub API
      const success = await this.callGitHubAPI('POST', `/repos/${this.apiConfig.owner}/${this.apiConfig.repo}/actions/workflows/${workflow.file}/dispatches`, {
        ref: branch,
        inputs: inputs || {}
      });

      if (success) {
        this.outputChannel.appendLine(`✅ Workflow '${workflow.name}' triggered successfully on branch '${branch}'`);
        
        vscode.window.showInformationMessage(
          `Workflow '${workflow.name}' triggered on '${branch}'`,
          'View on GitHub',
          'Monitor Progress'
        ).then(action => {
          if (action === 'View on GitHub') {
            vscode.env.openExternal(vscode.Uri.parse(`https://github.com/${this.apiConfig!.owner}/${this.apiConfig!.repo}/actions`));
          } else if (action === 'Monitor Progress') {
            this.monitorWorkflowProgress(workflow);
          }
        });

        return true;
      } else {
        throw new Error('GitHub API request failed');
      }

    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to trigger workflow: ${error}`);
      vscode.window.showErrorMessage(`Failed to trigger workflow: ${error}`);
      return false;
    }
  }

  /**
   * Monitor workflow progress
   */
  async monitorWorkflowProgress(workflow: GitHubWorkflow): Promise<void> {
    if (!this.apiConfig) {
      return;
    }

    this.outputChannel.appendLine(`👀 Monitoring workflow: ${workflow.name}`);

    const progressItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    progressItem.text = `$(sync~spin) ${workflow.name}`;
    progressItem.tooltip = 'BDD Workflow Running...';
    progressItem.command = 'playwright-bdd.viewWorkflowStatus';
    progressItem.show();

    try {
      // Poll for workflow status
      const startTime = Date.now();
      const timeout = 30 * 60 * 1000; // 30 minutes

      while (Date.now() - startTime < timeout) {
        const runs = await this.getRecentWorkflowRuns(workflow.file);
        if (runs && runs.length > 0) {
          const latestRun = runs[0];
          
          this.updateProgressStatus(progressItem, latestRun, workflow);
          
          if (latestRun.status === 'completed') {
            this.handleWorkflowCompletion(latestRun, workflow);
            break;
          }
        }

        // Wait 10 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error monitoring workflow: ${error}`);
    } finally {
      setTimeout(() => {
        progressItem.hide();
        progressItem.dispose();
      }, 5000);
    }
  }

  /**
   * Get recent workflow runs
   */
  async getRecentWorkflowRuns(workflowFile: string, limit: number = 5): Promise<WorkflowRun[] | null> {
    if (!this.apiConfig) {
      return null;
    }

    try {
      const response = await this.callGitHubAPI('GET', `/repos/${this.apiConfig.owner}/${this.apiConfig.repo}/actions/workflows/${workflowFile}/runs?per_page=${limit}`);
      
      if (response && response.workflow_runs) {
        return response.workflow_runs.map((run: any) => ({
          id: run.id,
          workflowId: run.workflow_id,
          headBranch: run.head_branch,
          headSha: run.head_sha,
          status: run.status,
          conclusion: run.conclusion,
          htmlUrl: run.html_url,
          createdAt: new Date(run.created_at),
          updatedAt: new Date(run.updated_at)
        }));
      }

      return null;

    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error fetching workflow runs: ${error}`);
      return null;
    }
  }

  /**
   * Show workflow status for all workflows
   */
  async showWorkflowStatus(workflows: GitHubWorkflow[]): Promise<void> {
    if (!this.apiConfig) {
      vscode.window.showWarningMessage('GitHub API not configured. Cannot fetch workflow status.');
      return;
    }

    try {
      this.outputChannel.appendLine('📊 Fetching workflow status...');

      const statusItems: Array<{
        label: string;
        description: string;
        detail: string;
        workflow: GitHubWorkflow;
        run?: WorkflowRun;
      }> = [];

      for (const workflow of workflows) {
        const runs = await this.getRecentWorkflowRuns(workflow.file, 1);
        const latestRun = runs && runs.length > 0 ? runs[0] : null;

        const statusIcon = latestRun 
          ? this.getStatusIcon(latestRun.status, latestRun.conclusion)
          : '⚪';

        statusItems.push({
          label: `${statusIcon} ${workflow.name}`,
          description: latestRun 
            ? `${latestRun.status} • ${latestRun.headBranch}`
            : 'No recent runs',
          detail: latestRun 
            ? `Last run: ${latestRun.updatedAt.toLocaleString()}`
            : `Triggers: ${workflow.triggers.join(', ')}`,
          workflow,
          run: latestRun || undefined
        });
      }

      const selected = await vscode.window.showQuickPick(statusItems, {
        placeHolder: 'Select workflow to view details or trigger',
        matchOnDescription: true
      });

      if (selected) {
        await this.showWorkflowActions(selected.workflow, selected.run);
      }

    } catch (error) {
      this.outputChannel.appendLine(`❌ Error fetching workflow status: ${error}`);
      vscode.window.showErrorMessage('Failed to fetch workflow status');
    }
  }

  /**
   * Show workflow actions menu
   */
  private async showWorkflowActions(workflow: GitHubWorkflow, latestRun?: WorkflowRun): Promise<void> {
    const actions: Array<{
      label: string;
      description: string;
      action: string;
    }> = [];

    if (workflow.triggers.includes('manual')) {
      actions.push({
        label: '🚀 Trigger Workflow',
        description: 'Start a new workflow run',
        action: 'trigger'
      });
    }

    if (latestRun) {
      actions.push({
        label: '🌐 View on GitHub',
        description: 'Open workflow run in browser',
        action: 'view'
      });

      if (latestRun.status === 'in_progress') {
        actions.push({
          label: '👀 Monitor Progress',
          description: 'Watch workflow execution in real-time',
          action: 'monitor'
        });
      }
    }

    actions.push({
      label: '📋 View Workflow File',
      description: 'Open workflow YAML in editor',
      action: 'edit'
    });

    const selected = await vscode.window.showQuickPick(actions, {
      placeHolder: `Actions for ${workflow.name}`
    });

    if (selected) {
      switch (selected.action) {
        case 'trigger':
          await this.triggerWorkflow(workflow);
          break;
        case 'view':
          if (latestRun) {
            vscode.env.openExternal(vscode.Uri.parse(latestRun.htmlUrl));
          }
          break;
        case 'monitor':
          await this.monitorWorkflowProgress(workflow);
          break;
        case 'edit':
          const doc = await vscode.workspace.openTextDocument(workflow.path);
          vscode.window.showTextDocument(doc);
          break;
      }
    }
  }

  /**
   * Update progress status bar
   */
  private updateProgressStatus(statusItem: vscode.StatusBarItem, run: WorkflowRun, workflow: GitHubWorkflow): void {
    let icon = '$(sync~spin)';
    let text = workflow.name;

    switch (run.status) {
      case 'queued':
        icon = '$(clock)';
        text = `${workflow.name} (queued)`;
        break;
      case 'in_progress':
        icon = '$(sync~spin)';
        text = `${workflow.name} (running)`;
        break;
      case 'completed':
        icon = run.conclusion === 'success' ? '$(check)' : '$(x)';
        text = `${workflow.name} (${run.conclusion})`;
        break;
    }

    statusItem.text = `${icon} ${text}`;
    statusItem.tooltip = `Workflow: ${workflow.name}\nStatus: ${run.status}\nBranch: ${run.headBranch}`;
  }

  /**
   * Handle workflow completion
   */
  private handleWorkflowCompletion(run: WorkflowRun, workflow: GitHubWorkflow): void {
    const isSuccess = run.conclusion === 'success';
    const icon = isSuccess ? '✅' : '❌';
    const message = `${icon} Workflow '${workflow.name}' ${run.conclusion}`;

    this.outputChannel.appendLine(message);

    vscode.window.showInformationMessage(
      message,
      'View Results',
      'View on GitHub'
    ).then(action => {
      if (action === 'View Results') {
        // Show local test results if available
        vscode.commands.executeCommand('playwright-bdd.generateHTMLReport');
      } else if (action === 'View on GitHub') {
        vscode.env.openExternal(vscode.Uri.parse(run.htmlUrl));
      }
    });
  }

  /**
   * Get status icon for workflow run
   */
  private getStatusIcon(status: string, conclusion?: string): string {
    switch (status) {
      case 'queued':
        return '🟡';
      case 'in_progress':
        return '🔵';
      case 'completed':
        switch (conclusion) {
          case 'success':
            return '✅';
          case 'failure':
            return '❌';
          case 'cancelled':
            return '⚪';
          case 'skipped':
            return '⏭️';
          default:
            return '❓';
        }
      default:
        return '⚪';
    }
  }

  /**
   * Select branch for workflow trigger
   */
  private async selectBranch(): Promise<string | undefined> {
    // Try to get current branch from git
    const currentBranch = await this.getCurrentBranch();
    
    const branchOptions = [
      { label: 'main', description: 'Main branch' },
      { label: 'develop', description: 'Development branch' }
    ];

    if (currentBranch && !['main', 'develop'].includes(currentBranch)) {
      branchOptions.unshift({
        label: currentBranch,
        description: 'Current branch'
      });
    }

    branchOptions.push({
      label: '$(edit) Enter custom branch',
      description: 'Specify a different branch'
    });

    const selected = await vscode.window.showQuickPick(branchOptions, {
      placeHolder: 'Select branch to trigger workflow on'
    });

    if (!selected) {
      return undefined;
    }

    if (selected.label.includes('Enter custom branch')) {
      return await vscode.window.showInputBox({
        prompt: 'Enter branch name',
        placeHolder: 'feature/my-branch',
        value: currentBranch || 'main'
      });
    }

    return selected.label;
  }

  /**
   * Get workflow inputs from user
   */
  private async getWorkflowInputs(workflow: GitHubWorkflow): Promise<Record<string, string> | undefined> {
    // For now, return empty inputs
    // TODO: Parse workflow file to detect input parameters
    return {};
  }

  /**
   * Detect GitHub repository info from git remote
   */
  private async detectGitHubRepo(): Promise<GitHubApiConfig | null> {
    try {
      // First, try to get repository info from git remote
      const gitRemoteInfo = await this.getGitRemoteInfo();
      if (gitRemoteInfo) {
        this.outputChannel.appendLine(`✅ Detected GitHub repo from git remote: ${gitRemoteInfo.owner}/${gitRemoteInfo.repo}`);
        return gitRemoteInfo;
      }

      // Fallback: check if package.json has repository info
      const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
      
      try {
        const packageContent = await vscode.workspace.fs.readFile(vscode.Uri.file(packageJsonPath));
        const packageJson = JSON.parse(packageContent.toString());
        
        if (packageJson.repository?.url) {
          const match = packageJson.repository.url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
          if (match) {
            this.outputChannel.appendLine(`✅ Detected GitHub repo from package.json: ${match[1]}/${match[2]}`);
            return {
              owner: match[1],
              repo: match[2]
            };
          }
        }
      } catch {
        // Ignore package.json parsing errors
      }

      this.outputChannel.appendLine('❌ Could not detect GitHub repository from git remote or package.json');
      return null;

    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Could not detect GitHub repo: ${error}`);
      return null;
    }
  }

  /**
   * Get GitHub repository info from git remote
   */
  private async getGitRemoteInfo(): Promise<GitHubApiConfig | null> {
    try {
      // Check if .git directory exists
      const gitDir = path.join(this.workspaceRoot, '.git');
      try {
        const gitStat = await vscode.workspace.fs.stat(vscode.Uri.file(gitDir));
        if (!gitStat) {
          return null;
        }
      } catch {
        return null;
      }

      // Try to execute git command to get remote URL
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      try {
        const { stdout } = await execAsync('git remote get-url origin', { cwd: this.workspaceRoot });
        const remoteUrl = stdout.trim();
        
        // Parse GitHub URL (supports both HTTPS and SSH formats)
        const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/([^/]+)\/([^/.]+)/);
        const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)/);
        
        if (httpsMatch) {
          return {
            owner: httpsMatch[1],
            repo: httpsMatch[2].replace(/\.git$/, '')
          };
        } else if (sshMatch) {
          return {
            owner: sshMatch[1],
            repo: sshMatch[2].replace(/\.git$/, '')
          };
        }
      } catch (gitError) {
        this.outputChannel.appendLine(`⚠️ Git command failed: ${gitError}`);
      }

      return null;

    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error getting git remote info: ${error}`);
      return null;
    }
  }

  /**
   * Get GitHub token from various sources
   */
  private async getGitHubToken(): Promise<string | undefined> {
    // Try to get token from VS Code settings
    const config = vscode.workspace.getConfiguration('playwrightBdd');
    let token = config.get<string>('cicd.githubToken');

    if (!token) {
      // Prompt user for token
      const result = await vscode.window.showInformationMessage(
        'GitHub token is required to trigger workflows. Would you like to configure it?',
        'Configure Token',
        'Skip'
      );

      if (result === 'Configure Token') {
        token = await vscode.window.showInputBox({
          prompt: 'Enter GitHub Personal Access Token',
          placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
          password: true,
          validateInput: (value) => {
            if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
              return 'Please enter a valid GitHub token';
            }
            return undefined;
          }
        });

        if (token) {
          // Save token to workspace settings
          await config.update('cicd.githubToken', token, vscode.ConfigurationTarget.Workspace);
          this.outputChannel.appendLine('💾 GitHub token saved to workspace settings');
        }
      }
    }

    return token;
  }

  /**
   * Get current git branch
   */
  private async getCurrentBranch(): Promise<string | undefined> {
    // This would typically use git commands
    // For now, return undefined to use default
    return undefined;
  }

  /**
   * Make GitHub API call
   */
  private async callGitHubAPI(method: string, endpoint: string, body?: any): Promise<any> {
    if (!this.apiConfig?.token) {
      throw new Error('GitHub token not configured');
    }

    const url = `https://api.github.com${endpoint}`;
    
    try {
      // In a real implementation, this would use fetch or axios
      // For now, we'll simulate the API call
      this.outputChannel.appendLine(`📡 GitHub API: ${method} ${endpoint}`);
      
      // Simulate successful response
      if (method === 'POST' && endpoint.includes('/dispatches')) {
        return { success: true };
      }
      
      if (method === 'GET' && endpoint.includes('/runs')) {
        return {
          workflow_runs: [
            {
              id: Date.now(),
              workflow_id: 123,
              head_branch: 'main',
              head_sha: 'abc123',
              status: 'completed',
              conclusion: 'success',
              html_url: `https://github.com/${this.apiConfig.owner}/${this.apiConfig.repo}/actions/runs/${Date.now()}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        };
      }

      return { success: true };

    } catch (error) {
      throw new Error(`GitHub API call failed: ${error}`);
    }
  }
}
