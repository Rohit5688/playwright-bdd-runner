import * as vscode from 'vscode';
import * as path from 'path';

export interface TestExplorerUIOptions {
  showTagFilters: boolean;
  showStatusFilters: boolean;
  showExecutionHistory: boolean;
  enableBulkActions: boolean;
}

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration?: number;
  error?: string;
  timestamp: Date;
}

export interface TestTag {
  name: string;
  count: number;
  color?: string;
}

export class TestExplorerUI {
  private controller: vscode.TestController;
  private outputChannel: vscode.OutputChannel;
  private testResults: Map<string, TestResult> = new Map();
  private selectedTags: Set<string> = new Set();
  private statusFilter: string = 'all';
  private treeDataProvider: BDDTestTreeDataProvider;
  private webviewPanel?: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  constructor(controller: vscode.TestController, outputChannel: vscode.OutputChannel) {
    this.controller = controller;
    this.outputChannel = outputChannel;
    this.treeDataProvider = new BDDTestTreeDataProvider(controller, this);
    this.setupTreeView();
    this.setupWebviewPanel();
  }

  /**
   * Register commands with the extension context
   */
  registerCommands(context: vscode.ExtensionContext): void {
    // Register tree view commands
    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.treeView.runSelected', () => {
        this.runSelectedTests();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.treeView.debugSelected', () => {
        this.debugSelectedTests();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.treeView.filterByTag', () => {
        this.showTagFilter();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.treeView.filterByStatus', () => {
        this.showStatusFilter();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.treeView.clearFilters', () => {
        this.clearAllFilters();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.treeView.showResults', () => {
        this.showResultsWebview();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.treeView.showSettings', () => {
        vscode.commands.executeCommand('playwright-bdd.showSettings');
      })
    );
  }

  /**
   * Setup enhanced tree view with custom filtering and actions
   */
  private setupTreeView(): void {
    const treeView = vscode.window.createTreeView('playwrightBddTests', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true,
      canSelectMany: true
    });

    // Add custom toolbar actions
    treeView.onDidChangeSelection((event) => {
      this.handleSelectionChange(event.selection);
    });

    // Store the tree view so it can be disposed properly
    this.disposables.push(treeView);
  }

  /**
   * Setup webview panel for enhanced test results and analytics
   */
  private setupWebviewPanel(): void {
    // We'll create this on demand in showResultsWebview()
  }

  /**
   * Handle selection changes in tree view
   */
  private handleSelectionChange(selection: readonly BDDTestTreeItem[]): void {
    if (selection.length === 0) {
      return;
    }

    // Update context for selected items
    const hasRunnableTests = selection.some(item => item.testItem);
    vscode.commands.executeCommand('setContext', 'bddTestsSelected', hasRunnableTests);
    vscode.commands.executeCommand('setContext', 'bddMultipleTestsSelected', selection.length > 1);

    // Show selection info in status bar
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBar.text = `$(beaker) ${selection.length} test(s) selected`;
    statusBar.show();
    
    setTimeout(() => {
      statusBar.hide();
      statusBar.dispose();
    }, 3000);
  }

  /**
   * Run selected tests from tree view
   */
  private async runSelectedTests(): Promise<void> {
    const selected = this.treeDataProvider.getSelectedItems();
    if (selected.length === 0) {
      vscode.window.showWarningMessage('No tests selected');
      return;
    }

    const testItems = selected
      .map(item => item.testItem)
      .filter(Boolean) as vscode.TestItem[];

    if (testItems.length === 0) {
      vscode.window.showWarningMessage('Selected items are not runnable tests');
      return;
    }

    // Create test run request
    const request = new vscode.TestRunRequest(testItems);
    const run = this.controller.createTestRun(request);

    try {
      for (const testItem of testItems) {
        run.enqueued(testItem);
        run.started(testItem);
        
        // Execute test (this would integrate with your existing test runner)
        const result = await this.executeTest(testItem);
        this.updateTestResult(testItem.id, result);
        
        if (result.status === 'passed') {
          run.passed(testItem, result.duration);
        } else if (result.status === 'failed') {
          const message = new vscode.TestMessage(result.error || 'Test failed');
          run.failed(testItem, message, result.duration);
        } else if (result.status === 'skipped') {
          run.skipped(testItem);
        }
      }
    } finally {
      run.end();
    }

    // Refresh tree view to show updated results
    this.treeDataProvider.refresh();
  }

  /**
   * Debug selected tests from tree view
   */
  private async debugSelectedTests(): Promise<void> {
    const selected = this.treeDataProvider.getSelectedItems();
    if (selected.length === 0) {
      vscode.window.showWarningMessage('No tests selected');
      return;
    }

    // For debugging, we typically run one test at a time
    const firstTest = selected[0].testItem;
    if (!firstTest) {
      vscode.window.showWarningMessage('Selected item is not a runnable test');
      return;
    }

    // Launch debug session
    vscode.commands.executeCommand('playwright-bdd.debugScenario', firstTest.label);
  }

  /**
   * Show tag filter quick pick
   */
  private async showTagFilter(): Promise<void> {
    const availableTags = this.extractTagsFromTests();
    
    if (availableTags.length === 0) {
      vscode.window.showInformationMessage('No tags found in test files');
      return;
    }

    const items = availableTags.map(tag => ({
      label: `@${tag.name}`,
      description: `${tag.count} test(s)`,
      picked: this.selectedTags.has(tag.name),
      tag: tag
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select tags to filter by (filters VSCode Test Explorer)',
      canPickMany: true,
      matchOnDescription: true
    });

    if (selected) {
      this.selectedTags.clear();
      selected.forEach(item => this.selectedTags.add(item.tag.name));
      this.applyMainTestExplorerFilters();
    }
  }

  /**
   * Show status filter quick pick
   */
  private async showStatusFilter(): Promise<void> {
    const statusOptions = [
      { label: 'All Tests', value: 'all', description: 'Show all tests regardless of status' },
      { label: '✅ Passed', value: 'passed', description: 'Show only passed tests' },
      { label: '❌ Failed', value: 'failed', description: 'Show only failed tests' },
      { label: '⏭️ Skipped', value: 'skipped', description: 'Show only skipped tests' },
      { label: '⏸️ Not Run', value: 'pending', description: 'Show only tests that haven\'t been run' }
    ];

    const selected = await vscode.window.showQuickPick(statusOptions, {
      placeHolder: 'Filter tests by status'
    });

    if (selected) {
      this.statusFilter = selected.value;
      this.applyFilters();
    }
  }

  /**
   * Clear all active filters
   */
  private clearAllFilters(): void {
    this.selectedTags.clear();
    this.statusFilter = 'all';
    
    // Clear both custom tree view and main VSCode Test Explorer filters
    this.applyFilters();
    this.applyMainTestExplorerFilters();
    
    vscode.window.showInformationMessage('All filters cleared from VSCode Test Explorer');
  }

  /**
   * Apply current filters to tree view
   */
  private applyFilters(): void {
    this.treeDataProvider.applyFilters({
      tags: Array.from(this.selectedTags),
      status: this.statusFilter
    });
    
    // Update status bar with filter info
    const filterInfo = [];
    if (this.selectedTags.size > 0) {
      filterInfo.push(`Tags: ${Array.from(this.selectedTags).join(', ')}`);
    }
    if (this.statusFilter !== 'all') {
      filterInfo.push(`Status: ${this.statusFilter}`);
    }
    
    if (filterInfo.length > 0) {
      const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
      statusBar.text = `$(filter) Filters: ${filterInfo.join(' | ')}`;
      statusBar.command = 'playwright-bdd.treeView.clearFilters';
      statusBar.show();
    }
  }

  /**
   * Apply filters to the main VSCode Test Explorer (where run/debug works)
   */
  private applyMainTestExplorerFilters(): void {
    const selectedTagsArray = Array.from(this.selectedTags);
    
    // Filter test items based on selected tags
    this.controller.items.forEach(item => {
      this.filterTestItem(item, selectedTagsArray);
    });
    
    // Show filter status
    const filterInfo = [];
    if (this.selectedTags.size > 0) {
      filterInfo.push(`Tags: ${selectedTagsArray.join(', ')}`);
    }
    
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    if (filterInfo.length > 0) {
      statusBar.text = `$(filter) VSCode Test Explorer filtered by: ${filterInfo.join(' | ')}`;
      statusBar.command = 'playwright-bdd.treeView.clearFilters';
      statusBar.tooltip = 'Click to clear filters';
    } else {
      statusBar.text = `$(filter-filled) VSCode Test Explorer - No filters active`;
    }
    statusBar.show();
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusBar.hide();
      statusBar.dispose();
    }, 5000);
    
    this.outputChannel.appendLine(`Applied tag filters to VSCode Test Explorer: ${selectedTagsArray.join(', ')}`);
  }

  /**
   * Filter individual test item and its children based on tags
   */
  private filterTestItem(item: vscode.TestItem, selectedTags: string[]): boolean {
    if (selectedTags.length === 0) {
      // No filters, show all items
      this.setTestItemVisibility(item, true);
      return true;
    }

    // Check if this item has any of the selected tags
    const itemTags = this.extractTagsFromTestItem(item);
    const hasMatchingTag = selectedTags.some(tag => itemTags.includes(tag));
    
    // Check children recursively
    let hasMatchingChild = false;
    item.children.forEach(child => {
      if (this.filterTestItem(child, selectedTags)) {
        hasMatchingChild = true;
      }
    });
    
    // Show item if it matches tags or has matching children
    const shouldShow = hasMatchingTag || hasMatchingChild;
    this.setTestItemVisibility(item, shouldShow);
    
    return shouldShow;
  }

  /**
   * Set test item visibility (hide/show in VSCode Test Explorer)
   */
  private setTestItemVisibility(item: vscode.TestItem, visible: boolean): void {
    if (visible) {
      // Make sure item is in the controller
      if (!this.controller.items.get(item.id)) {
        this.controller.items.add(item);
      }
    } else {
      // Remove item from controller to hide it
      this.controller.items.delete(item.id);
    }
  }

  /**
   * Show enhanced results webview
   */
  private showResultsWebview(): void {
    if (this.webviewPanel) {
      this.webviewPanel.reveal();
      return;
    }

    this.webviewPanel = vscode.window.createWebviewPanel(
      'bddTestResults',
      'BDD Test Results & Analytics',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: []
      }
    );

    this.webviewPanel.webview.html = this.getWebviewContent();
    
    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
    });

    // Handle messages from webview
    this.webviewPanel.webview.onDidReceiveMessage(
      (message) => this.handleWebviewMessage(message),
      undefined
    );
  }

  /**
   * Generate webview HTML content
   */
  private getWebviewContent(): string {
    const results = Array.from(this.testResults.values());
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const skippedTests = results.filter(r => r.status === 'skipped').length;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    const recentResults = results
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BDD Test Results</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                margin: 0;
            }
            .header {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 20px;
                margin-bottom: 20px;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .stat-card {
                background: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                padding: 15px;
                text-align: center;
            }
            .stat-number {
                font-size: 2em;
                font-weight: bold;
                margin-bottom: 5px;
            }
            .stat-label {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
            }
            .passed { color: var(--vscode-testing-iconPassed); }
            .failed { color: var(--vscode-testing-iconFailed); }
            .skipped { color: var(--vscode-testing-iconSkipped); }
            .progress-bar {
                height: 8px;
                background: var(--vscode-progressBar-background);
                border-radius: 4px;
                overflow: hidden;
                margin: 10px 0;
            }
            .progress-fill {
                height: 100%;
                background: var(--vscode-testing-iconPassed);
                transition: width 0.3s ease;
            }
            .recent-tests {
                margin-top: 30px;
            }
            .test-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .test-name {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .test-status {
                margin-right: 10px;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 0.8em;
            }
            .test-duration {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
            }
            .button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 3px;
                cursor: pointer;
                margin: 0 5px;
            }
            .button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .filters {
                margin-bottom: 20px;
                padding: 15px;
                background: var(--vscode-editor-inactiveSelectionBackground);
                border-radius: 6px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🧪 BDD Test Results & Analytics</h1>
            <p>Comprehensive overview of your Playwright BDD test execution</p>
        </div>

        <div class="filters">
            <button class="button" onclick="refreshResults()">🔄 Refresh</button>
            <button class="button" onclick="exportResults()">📋 Export</button>
            <button class="button" onclick="showTrends()">📊 Trends</button>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${totalTests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number passed">${passedTests}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number failed">${failedTests}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number skipped">${skippedTests}</div>
                <div class="stat-label">Skipped</div>
            </div>
        </div>

        <div class="progress-container">
            <h3>Overall Pass Rate: ${passRate}%</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${passRate}%"></div>
            </div>
        </div>

        <div class="recent-tests">
            <h3>Recent Test Results</h3>
            ${recentResults.map(result => `
                <div class="test-item">
                    <div class="test-name">${result.name}</div>
                    <div class="test-status ${result.status}">${this.getStatusIcon(result.status)}</div>
                    <div class="test-duration">${result.duration || 0}ms</div>
                </div>
            `).join('')}
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function refreshResults() {
                vscode.postMessage({ command: 'refresh' });
            }
            
            function exportResults() {
                vscode.postMessage({ command: 'export' });
            }
            
            function showTrends() {
                vscode.postMessage({ command: 'trends' });
            }
        </script>
    </body>
    </html>`;
  }

  /**
   * Handle messages from webview
   */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case 'refresh':
        this.refreshResults();
        break;
      case 'export':
        this.exportResults();
        break;
      case 'trends':
        this.showTrends();
        break;
    }
  }

  /**
   * Get status icon for test result
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      case 'pending': return '⏸️';
      default: return '❓';
    }
  }

  /**
   * Extract tags from test files
   */
  private extractTagsFromTests(): TestTag[] {
    const tagCounts = new Map<string, number>();
    
    // This would scan through test items and extract @tags
    this.controller.items.forEach(item => {
      const tags = this.extractTagsFromTestItem(item);
      tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries()).map(([name, count]) => ({
      name,
      count,
      color: this.getTagColor(name)
    }));
  }

  /**
   * Extract tags from a test item
   */
  private extractTagsFromTestItem(item: vscode.TestItem): string[] {
    if (!item.uri) {
      return [];
    }

    try {
      // Read the feature file content
      const content = require('fs').readFileSync(item.uri.fsPath, 'utf8');
      const lines = content.split('\n');
      const tags: string[] = [];

      for (const line of lines) {
        // Look for lines with @tags
        const tagMatches = line.match(/@(\w+)/g);
        if (tagMatches) {
          tagMatches.forEach(match => {
            const tag = match.substring(1); // Remove @ prefix
            if (!tags.includes(tag)) {
              tags.push(tag);
            }
          });
        }
      }

      return tags;
    } catch (error) {
      // If we can't read the file, return empty array
      return [];
    }
  }

  /**
   * Get color for tag
   */
  private getTagColor(tagName: string): string {
    const colors = ['blue', 'green', 'orange', 'purple', 'red', 'yellow'];
    const hash = tagName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  /**
   * Execute a test (placeholder - integrate with your test runner)
   */
  private async executeTest(testItem: vscode.TestItem): Promise<TestResult> {
    // This would integrate with your existing test execution logic
    return {
      id: testItem.id,
      name: testItem.label,
      status: 'passed', // Placeholder
      duration: Math.random() * 1000,
      timestamp: new Date()
    };
  }

  /**
   * Update test result
   */
  private updateTestResult(testId: string, result: TestResult): void {
    this.testResults.set(testId, result);
  }

  /**
   * Refresh results in webview
   */
  private refreshResults(): void {
    if (this.webviewPanel) {
      this.webviewPanel.webview.html = this.getWebviewContent();
    }
  }

  /**
   * Export results to file
   */
  private async exportResults(): Promise<void> {
    const results = Array.from(this.testResults.values());
    const report = this.generateTestReport(results);
    
    const doc = await vscode.workspace.openTextDocument({
      content: report,
      language: 'markdown'
    });
    
    await vscode.window.showTextDocument(doc);
  }

  /**
   * Show trends analysis
   */
  private showTrends(): void {
    // This would show historical test execution trends
    vscode.window.showInformationMessage('Trends analysis feature coming soon!');
  }

  /**
   * Generate test report
   */
  private generateTestReport(results: TestResult[]): string {
    const totalTests = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    return `# BDD Test Execution Report

Generated: ${new Date().toLocaleString()}

## Summary
- **Total Tests**: ${totalTests}
- **Passed**: ${passed} (${Math.round((passed/totalTests)*100)}%)
- **Failed**: ${failed} (${Math.round((failed/totalTests)*100)}%)
- **Skipped**: ${skipped} (${Math.round((skipped/totalTests)*100)}%)

## Test Results

${results.map(result => `
### ${result.name}
- **Status**: ${result.status}
- **Duration**: ${result.duration || 0}ms
- **Timestamp**: ${result.timestamp.toLocaleString()}
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('')}
`;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.webviewPanel) {
      this.webviewPanel.dispose();
    }
    
    // Dispose all registered disposables
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  }
}

/**
 * Tree data provider for enhanced BDD test explorer
 */
export class BDDTestTreeDataProvider implements vscode.TreeDataProvider<BDDTestTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<BDDTestTreeItem | undefined | null | void> = new vscode.EventEmitter<BDDTestTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<BDDTestTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private selectedItems: BDDTestTreeItem[] = [];
  private activeFilters: { tags: string[]; status: string } = { tags: [], status: 'all' };

  constructor(
    private controller: vscode.TestController,
    private ui: TestExplorerUI
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: BDDTestTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: BDDTestTreeItem): Thenable<BDDTestTreeItem[]> {
    if (!element) {
      // Root level - return feature files
      const items: BDDTestTreeItem[] = [];
      this.controller.items.forEach(item => {
        if (this.shouldShowItem(item)) {
          items.push(new BDDTestTreeItem(
            item.label,
            vscode.TreeItemCollapsibleState.Expanded,
            item,
            'feature'
          ));
        }
      });
      return Promise.resolve(items);
    } else {
      // Child level - return scenarios
      const children: BDDTestTreeItem[] = [];
      if (element.testItem) {
        element.testItem.children.forEach(child => {
          if (this.shouldShowItem(child)) {
            children.push(new BDDTestTreeItem(
              child.label,
              child.children.size > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
              child,
              'scenario'
            ));
          }
        });
      }
      return Promise.resolve(children);
    }
  }

  private shouldShowItem(item: vscode.TestItem): boolean {
    // Apply active filters
    if (this.activeFilters.status !== 'all') {
      const result = this.ui['testResults'].get(item.id);
      if (!result || result.status !== this.activeFilters.status) {
        return false;
      }
    }

    if (this.activeFilters.tags.length > 0) {
      const itemTags = this.ui['extractTagsFromTestItem'](item);
      const hasMatchingTag = this.activeFilters.tags.some(tag => itemTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    return true;
  }

  applyFilters(filters: { tags: string[]; status: string }): void {
    this.activeFilters = filters;
    this.refresh();
  }

  getSelectedItems(): BDDTestTreeItem[] {
    return this.selectedItems;
  }
}

/**
 * Tree item for BDD test explorer
 */
export class BDDTestTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly testItem?: vscode.TestItem,
    public readonly type?: 'feature' | 'scenario' | 'example'
  ) {
    super(label, collapsibleState);

    this.tooltip = `${this.label}`;
    this.description = this.getDescription();
    this.iconPath = this.getIcon();
    this.contextValue = this.type;

    if (testItem) {
      this.command = {
        command: 'vscode.open',
        title: 'Open',
        arguments: [testItem.uri]
      };
    }
  }

  private getDescription(): string {
    if (this.type === 'feature' && this.testItem) {
      const scenarioCount = this.testItem.children.size;
      return scenarioCount > 0 ? `${scenarioCount} scenarios` : '';
    }
    return '';
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.type) {
      case 'feature':
        return new vscode.ThemeIcon('file-text');
      case 'scenario':
        return new vscode.ThemeIcon('beaker');
      case 'example':
        return new vscode.ThemeIcon('symbol-array');
      default:
        return new vscode.ThemeIcon('symbol-misc');
    }
  }
}
