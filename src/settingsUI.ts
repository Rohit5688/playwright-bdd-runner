import * as vscode from 'vscode';
import * as path from 'path';

export interface ConfigurationField {
  key: string;
  label: string;
  type: 'string' | 'boolean' | 'number' | 'dropdown' | 'path' | 'command';
  description: string;
  defaultValue: any;
  options?: string[];
  validation?: (value: any) => string | undefined;
  placeholder?: string;
  group: string;
}

export interface ConfigurationGroup {
  name: string;
  title: string;
  description: string;
  icon: string;
}

export class SettingsUI {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;
  private webviewPanel?: vscode.WebviewPanel;

  constructor(outputChannel: vscode.OutputChannel, workspaceRoot: string) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Show the settings management interface
   */
  async showSettingsUI(): Promise<void> {
    if (this.webviewPanel) {
      this.webviewPanel.reveal();
      return;
    }

    this.webviewPanel = vscode.window.createWebviewPanel(
      'bddSettings',
      'BDD Test Runner Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [],
        retainContextWhenHidden: true
      }
    );

    this.webviewPanel.webview.html = await this.getSettingsWebviewContent();
    
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
   * Get configuration field definitions
   */
  private getConfigurationFields(): ConfigurationField[] {
    return [
      // Core Configuration
      {
        key: 'playwrightBdd.configPath',
        label: 'Playwright Config Path',
        type: 'path',
        description: 'Path to the Playwright config file relative to the workspace root',
        defaultValue: './playwright.config.ts',
        placeholder: './playwright.config.ts',
        group: 'core'
      },
      {
        key: 'playwrightBdd.tsconfigPath',
        label: 'TypeScript Config Path',
        type: 'path',
        description: 'Optional path to a custom tsconfig file for Playwright tests',
        defaultValue: '',
        placeholder: './tsconfig.json',
        group: 'core'
      },
      {
        key: 'playwrightBdd.featureFolder',
        label: 'Features Folder',
        type: 'path',
        description: 'Relative path to the folder containing .feature files',
        defaultValue: 'features',
        placeholder: 'features',
        group: 'core'
      },
      {
        key: 'playwrightBdd.stepsFolder',
        label: 'Steps Folder',
        type: 'path',
        description: 'Relative path to the folder containing step definition files',
        defaultValue: 'steps',
        placeholder: 'steps',
        group: 'core'
      },

      // Test Execution
      {
        key: 'playwrightBdd.tags',
        label: 'Default Tags Filter',
        type: 'string',
        description: 'Optional value for feature/scenario tags to filter tests. Used as --grep=<tags>',
        defaultValue: '',
        placeholder: '@smoke,@regression',
        group: 'execution'
      },
      {
        key: 'playwrightBdd.enableFeatureGen',
        label: 'Enable Feature Generation',
        type: 'boolean',
        description: 'Whether to run the feature generation step before tests',
        defaultValue: true,
        group: 'execution'
      },
      {
        key: 'playwrightBdd.testCommand',
        label: 'Test Command Template',
        type: 'command',
        description: 'Command to run Playwright tests. Use ${configPath}, ${tsconfigArg}, and ${tagsArg} as placeholders.',
        defaultValue: 'npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}',
        placeholder: 'npx playwright test --config=${configPath}',
        group: 'execution'
      },
      {
        key: 'playwrightBdd.featureGenCommand',
        label: 'Feature Generation Command',
        type: 'command',
        description: 'Command to generate features. Use ${configPath} as a placeholder.',
        defaultValue: 'npx bddgen --config=${configPath}',
        placeholder: 'npx bddgen --config=${configPath}',
        group: 'execution'
      },

      // Discovery & Automation
      {
        key: 'playwrightBdd.autoDiscoverConfig',
        label: 'Auto-Discover Configuration',
        type: 'boolean',
        description: 'Automatically discover Playwright config, feature folders, and step folders',
        defaultValue: true,
        group: 'discovery'
      },
      {
        key: 'playwrightBdd.stepsFilePattern',
        label: 'Steps File Pattern',
        type: 'string',
        description: 'Glob pattern for step definition files',
        defaultValue: '**/*.{js,ts,mjs,mts}',
        placeholder: '**/*.{js,ts}',
        group: 'discovery'
      },

      // CI/CD Integration
      {
        key: 'playwrightBdd.cicd.githubToken',
        label: 'GitHub Token',
        type: 'string',
        description: 'Personal Access Token for GitHub API access (stored securely)',
        defaultValue: '',
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
        group: 'cicd'
      },
      {
        key: 'playwrightBdd.cicd.autoTriggerWorkflows',
        label: 'Auto-Trigger Workflows',
        type: 'boolean',
        description: 'Automatically trigger GitHub workflows on test execution',
        defaultValue: false,
        group: 'cicd'
      },

      // Execution Settings
      {
        key: 'playwrightBdd.execution.retryCount',
        label: 'Test Retry Count',
        type: 'number',
        description: 'Number of retry attempts for failed test executions (1 = no retry, 2 = 1 retry, etc.)',
        defaultValue: 2,
        group: 'execution',
        validation: (value: number) => {
          if (value < 1 || value > 10) return 'Retry count must be between 1 and 10';
          return undefined;
        }
      },
      {
        key: 'playwrightBdd.execution.retryDelay',
        label: 'Retry Delay (milliseconds)',
        type: 'number',
        description: 'Delay between retry attempts in milliseconds',
        defaultValue: 2000,
        group: 'execution',
        validation: (value: number) => {
          if (value < 100 || value > 30000) return 'Retry delay must be between 100ms and 30000ms';
          return undefined;
        }
      },


      // UI & Display
      {
        key: 'playwrightBdd.ui.showTagFilters',
        label: 'Show Tag Filters',
        type: 'boolean',
        description: 'Show tag filtering options in the test explorer',
        defaultValue: true,
        group: 'ui'
      },
      {
        key: 'playwrightBdd.ui.showStatusFilters',
        label: 'Show Status Filters',
        type: 'boolean',
        description: 'Show status filtering options in the test explorer',
        defaultValue: true,
        group: 'ui'
      },
      {
        key: 'playwrightBdd.ui.showExecutionHistory',
        label: 'Show Execution History',
        type: 'boolean',
        description: 'Enable test execution history tracking',
        defaultValue: true,
        group: 'ui'
      },
      {
        key: 'playwrightBdd.ui.autoRefreshInterval',
        label: 'Auto-Refresh Interval (seconds)',
        type: 'number',
        description: 'Interval for auto-refreshing test discovery (0 to disable)',
        defaultValue: 0,
        group: 'ui'
      },
    ];
  }

  /**
   * Get configuration groups
   */
  private getConfigurationGroups(): ConfigurationGroup[] {
    return [
      {
        name: 'core',
        title: 'Core Configuration',
        description: 'Essential settings for Playwright BDD integration',
        icon: 'gear'
      },
      {
        name: 'execution',
        title: 'Test Execution',
        description: 'Settings for running and managing tests',
        icon: 'play'
      },
      {
        name: 'discovery',
        title: 'Discovery & Automation',
        description: 'Automatic discovery and detection settings',
        icon: 'search'
      },
      {
        name: 'cicd',
        title: 'CI/CD Integration',
        description: 'GitHub Actions and workflow integration',
        icon: 'github'
      },
      {
        name: 'ui',
        title: 'User Interface',
        description: 'UI customization and display preferences',
        icon: 'browser'
      }
    ];
  }

  /**
   * Generate webview HTML content
   */
  private async getSettingsWebviewContent(): Promise<string> {
    const config = vscode.workspace.getConfiguration();
    const fields = this.getConfigurationFields();
    const groups = this.getConfigurationGroups();

    // Get current values
    const currentValues: Record<string, any> = {};
    for (const field of fields) {
      currentValues[field.key] = config.get(field.key, field.defaultValue);
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BDD Test Runner Settings</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 0;
                margin: 0;
                line-height: 1.6;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                margin: 0 0 10px 0;
                font-size: 24px;
                font-weight: 600;
            }
            .header p {
                margin: 0;
                color: var(--vscode-descriptionForeground);
                font-size: 14px;
            }
            .actions {
                margin-bottom: 30px;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .btn {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .btn:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .btn.secondary {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            .btn.secondary:hover {
                background: var(--vscode-button-secondaryHoverBackground);
            }
            .settings-groups {
                display: grid;
                grid-template-columns: 250px 1fr;
                gap: 30px;
            }
            .group-nav {
                position: sticky;
                top: 20px;
                height: fit-content;
            }
            .group-nav-item {
                display: flex;
                align-items: center;
                padding: 12px;
                cursor: pointer;
                border-radius: 6px;
                margin-bottom: 4px;
                transition: background-color 0.15s;
                gap: 10px;
            }
            .group-nav-item:hover {
                background: var(--vscode-list-hoverBackground);
            }
            .group-nav-item.active {
                background: var(--vscode-list-activeSelectionBackground);
                color: var(--vscode-list-activeSelectionForeground);
            }
            .group-nav-icon {
                width: 16px;
                height: 16px;
                opacity: 0.8;
            }
            .group-nav-text {
                font-size: 13px;
                font-weight: 500;
            }
            .settings-content {
                min-height: 600px;
            }
            .settings-group {
                display: none;
                animation: fadeIn 0.2s ease-in;
            }
            .settings-group.active {
                display: block;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .group-header {
                margin-bottom: 20px;
            }
            .group-header h2 {
                margin: 0 0 8px 0;
                font-size: 18px;
                font-weight: 600;
            }
            .group-header p {
                margin: 0;
                color: var(--vscode-descriptionForeground);
                font-size: 14px;
            }
            .setting-item {
                margin-bottom: 24px;
                padding: 16px;
                background: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
            }
            .setting-label {
                display: flex;
                align-items: center;
                margin-bottom: 6px;
                gap: 8px;
            }
            .setting-label h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 500;
            }
            .setting-badge {
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                text-transform: uppercase;
            }
            .setting-description {
                color: var(--vscode-descriptionForeground);
                font-size: 13px;
                margin-bottom: 12px;
                line-height: 1.5;
            }
            .setting-control {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .form-input {
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                padding: 6px 8px;
                border-radius: 3px;
                font-size: 13px;
                flex: 1;
                min-width: 200px;
            }
            .form-input:focus {
                outline: 1px solid var(--vscode-focusBorder);
                border-color: var(--vscode-focusBorder);
            }
            .form-input.error {
                border-color: var(--vscode-inputValidation-errorBorder);
                background: var(--vscode-inputValidation-errorBackground);
            }
            .form-checkbox {
                width: 16px;
                height: 16px;
                accent-color: var(--vscode-checkbox-background);
            }
            .form-select {
                background: var(--vscode-dropdown-background);
                color: var(--vscode-dropdown-foreground);
                border: 1px solid var(--vscode-dropdown-border);
                padding: 6px 8px;
                border-radius: 3px;
                font-size: 13px;
                min-width: 150px;
            }
            .path-input-group {
                display: flex;
                gap: 8px;
                align-items: center;
                width: 100%;
            }
            .path-input {
                flex: 1;
            }
            .browse-btn {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: none;
                padding: 6px 12px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                white-space: nowrap;
            }
            .browse-btn:hover {
                background: var(--vscode-button-secondaryHoverBackground);
            }
            .validation-error {
                color: var(--vscode-errorForeground);
                font-size: 12px;
                margin-top: 4px;
            }
            .setting-actions {
                margin-top: 12px;
                display: flex;
                gap: 8px;
            }
            .reset-btn {
                background: transparent;
                color: var(--vscode-button-secondaryForeground);
                border: 1px solid var(--vscode-button-border);
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
            }
            .reset-btn:hover {
                background: var(--vscode-button-secondaryHoverBackground);
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid var(--vscode-panel-border);
                text-align: center;
                color: var(--vscode-descriptionForeground);
                font-size: 12px;
            }
            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
            }
            .status-indicator.success {
                background: var(--vscode-testing-iconPassed);
                color: white;
            }
            .status-indicator.warning {
                background: var(--vscode-testing-iconFailed);
                color: white;
            }
            @media (max-width: 768px) {
                .settings-groups {
                    grid-template-columns: 1fr;
                }
                .group-nav {
                    position: static;
                    display: flex;
                    overflow-x: auto;
                    gap: 8px;
                    margin-bottom: 20px;
                }
                .group-nav-item {
                    white-space: nowrap;
                    margin-bottom: 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🧪 BDD Test Runner Settings</h1>
                <p>Configure all aspects of your Playwright BDD testing experience</p>
            </div>

            <div class="actions">
                <button class="btn" onclick="saveAllSettings()">
                    <span>💾</span> Save All Settings
                </button>
                <button class="btn secondary" onclick="resetToDefaults()">
                    <span>🔄</span> Reset to Defaults
                </button>
                <button class="btn secondary" onclick="exportSettings()">
                    <span>📋</span> Export Settings
                </button>
                <button class="btn secondary" onclick="importSettings()">
                    <span>📁</span> Import Settings
                </button>
                <button class="btn secondary" onclick="validateSettings()">
                    <span>✅</span> Validate Configuration
                </button>
            </div>

            <div class="settings-groups">
                <div class="group-nav">
                    ${groups.map((group, index) => `
                        <div class="group-nav-item ${index === 0 ? 'active' : ''}" 
                             onclick="showGroup('${group.name}')" 
                             data-group="${group.name}">
                            <div class="group-nav-icon">🔗</div>
                            <div class="group-nav-text">${group.title}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="settings-content">
                    ${groups.map((group, groupIndex) => `
                        <div class="settings-group ${groupIndex === 0 ? 'active' : ''}" data-group="${group.name}">
                            <div class="group-header">
                                <h2>${group.title}</h2>
                                <p>${group.description}</p>
                            </div>
                            
                            ${fields.filter(f => f.group === group.name).map(field => `
                                <div class="setting-item" data-key="${field.key}">
                                    <div class="setting-label">
                                        <h3>${field.label}</h3>
                                        <span class="setting-badge">${field.type}</span>
                                    </div>
                                    <div class="setting-description">${field.description}</div>
                                    <div class="setting-control">
                                        ${this.generateFormControl(field, currentValues[field.key])}
                                    </div>
                                    <div class="setting-actions">
                                        <button class="reset-btn" onclick="resetSetting('${field.key}')">
                                            Reset to Default
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="footer">
                <p>Settings are automatically saved to your workspace configuration</p>
                <div id="status-indicator" class="status-indicator success" style="display: none;">
                    <span>✓</span> Settings saved successfully
                </div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function showGroup(groupName) {
                // Update navigation
                document.querySelectorAll('.group-nav-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.group === groupName);
                });
                
                // Update content
                document.querySelectorAll('.settings-group').forEach(group => {
                    group.classList.toggle('active', group.dataset.group === groupName);
                });
            }

            function saveAllSettings() {
                const settings = {};
                document.querySelectorAll('.setting-item').forEach(item => {
                    const key = item.dataset.key;
                    const input = item.querySelector('input, select');
                    if (input) {
                        if (input.type === 'checkbox') {
                            settings[key] = input.checked;
                        } else if (input.type === 'number') {
                            settings[key] = parseInt(input.value) || 0;
                        } else {
                            settings[key] = input.value;
                        }
                    }
                });
                
                vscode.postMessage({
                    command: 'saveSettings',
                    settings: settings
                });
                
                showStatus('Settings saved successfully', 'success');
            }

            function resetSetting(key) {
                vscode.postMessage({
                    command: 'resetSetting',
                    key: key
                });
            }

            function resetToDefaults() {
                if (confirm('Reset all settings to default values? This cannot be undone.')) {
                    vscode.postMessage({
                        command: 'resetAllSettings'
                    });
                }
            }

            function exportSettings() {
                vscode.postMessage({
                    command: 'exportSettings'
                });
            }

            function importSettings() {
                vscode.postMessage({
                    command: 'importSettings'
                });
            }

            function validateSettings() {
                vscode.postMessage({
                    command: 'validateSettings'
                });
            }

            function browsePath(inputId) {
                vscode.postMessage({
                    command: 'browsePath',
                    inputId: inputId
                });
            }

            function showStatus(message, type = 'success') {
                const indicator = document.getElementById('status-indicator');
                indicator.textContent = message;
                indicator.className = \`status-indicator \${type}\`;
                indicator.style.display = 'inline-flex';
                
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 3000);
            }

            // Auto-save on input change
            document.addEventListener('input', (e) => {
                if (e.target.matches('input, select')) {
                    const settingItem = e.target.closest('.setting-item');
                    if (settingItem) {
                        const key = settingItem.dataset.key;
                        let value = e.target.value;
                        
                        if (e.target.type === 'checkbox') {
                            value = e.target.checked;
                        } else if (e.target.type === 'number') {
                            value = parseInt(value) || 0;
                        }
                        
                        vscode.postMessage({
                            command: 'updateSetting',
                            key: key,
                            value: value
                        });
                    }
                }
            });
        </script>
    </body>
    </html>`;
  }

  /**
   * Generate form control HTML for a configuration field
   */
  private generateFormControl(field: ConfigurationField, currentValue: any): string {
    switch (field.type) {
      case 'boolean':
        return `<input type="checkbox" class="form-checkbox" ${currentValue ? 'checked' : ''}>`;
        
      case 'number':
        return `<input type="number" class="form-input" value="${currentValue || field.defaultValue}" placeholder="${field.placeholder || ''}">`;
        
      case 'dropdown':
        if (!field.options) return '';
        return `
          <select class="form-select">
            ${field.options.map(option => 
              `<option value="${option}" ${currentValue === option ? 'selected' : ''}>${option}</option>`
            ).join('')}
          </select>`;
        
      case 'path':
        const pathId = `path-${field.key.replace(/\./g, '-')}`;
        return `
          <div class="path-input-group">
            <input type="text" id="${pathId}" class="form-input path-input" 
                   value="${currentValue || field.defaultValue}" 
                   placeholder="${field.placeholder || ''}">
            <button class="browse-btn" onclick="browsePath('${pathId}')">Browse...</button>
          </div>`;
        
      case 'command':
        return `<input type="text" class="form-input" value="${currentValue || field.defaultValue}" placeholder="${field.placeholder || ''}" style="font-family: monospace;">`;
        
      default: // string
        return `<input type="text" class="form-input" value="${currentValue || field.defaultValue}" placeholder="${field.placeholder || ''}">`;
    }
  }

  /**
   * Handle messages from webview
   */
  private async handleWebviewMessage(message: any): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    
    switch (message.command) {
      case 'saveSettings':
        await this.saveSettings(message.settings);
        break;
        
      case 'updateSetting':
        await config.update(message.key, message.value, vscode.ConfigurationTarget.Workspace);
        this.outputChannel.appendLine(`Updated setting: ${message.key} = ${message.value}`);
        break;
        
      case 'resetSetting':
        const field = this.getConfigurationFields().find(f => f.key === message.key);
        if (field) {
          await config.update(message.key, field.defaultValue, vscode.ConfigurationTarget.Workspace);
          this.refreshWebview();
        }
        break;
        
      case 'resetAllSettings':
        await this.resetAllSettings();
        break;
        
      case 'exportSettings':
        await this.exportSettings();
        break;
        
      case 'importSettings':
        await this.importSettings();
        break;
        
      case 'validateSettings':
        await this.validateSettings();
        break;
        
      case 'browsePath':
        await this.browsePath(message.inputId);
        break;
    }
  }

  /**
   * Save multiple settings
   */
  private async saveSettings(settings: Record<string, any>): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    
    for (const [key, value] of Object.entries(settings)) {
      await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
    
    this.outputChannel.appendLine(`Saved ${Object.keys(settings).length} settings`);
    vscode.window.showInformationMessage('Settings saved successfully!');
  }

  /**
   * Reset all settings to defaults
   */
  private async resetAllSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    const fields = this.getConfigurationFields();
    
    for (const field of fields) {
      await config.update(field.key, field.defaultValue, vscode.ConfigurationTarget.Workspace);
    }
    
    this.outputChannel.appendLine('All settings reset to defaults');
    vscode.window.showInformationMessage('All settings reset to default values!');
    this.refreshWebview();
  }

  /**
   * Export settings to file
   */
  private async exportSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    const fields = this.getConfigurationFields();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      version: '0.4.0',
      settings: {} as Record<string, any>
    };
    
    for (const field of fields) {
      exportData.settings[field.key] = config.get(field.key, field.defaultValue);
    }
    
    const content = JSON.stringify(exportData, null, 2);
    
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'json'
    });
    
    await vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage('Settings exported to new document. Save it to preserve your configuration.');
  }

  /**
   * Import settings from file
   */
  private async importSettings(): Promise<void> {
    const fileUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'JSON Files': ['json']
      },
      title: 'Import BDD Settings'
    });

    if (fileUri && fileUri[0]) {
      try {
        const content = await vscode.workspace.fs.readFile(fileUri[0]);
        const data = JSON.parse(content.toString());
        
        if (data.settings) {
          await this.saveSettings(data.settings);
          this.refreshWebview();
          vscode.window.showInformationMessage('Settings imported successfully!');
        } else {
          vscode.window.showErrorMessage('Invalid settings file format');
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to import settings: ${error}`);
      }
    }
  }

  /**
   * Validate current settings
   */
  private async validateSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    const fields = this.getConfigurationFields();
    const issues: string[] = [];
    
    for (const field of fields) {
      const value = config.get(field.key);
      
      if (field.validation) {
        const error = field.validation(value);
        if (error) {
          issues.push(`${field.label}: ${error}`);
        }
      }
      
      // Basic validation based on type
      if (field.type === 'path' && value) {
        // Handle TypeScript config path specially
        if (field.key === 'playwrightBdd.tsconfigPath') {
          // Skip validation if empty (optional field)
          if (value && typeof value === 'string' && value.trim()) {
            // Remove any command-line prefixes
            let cleanPath = value.toString().trim();
            cleanPath = cleanPath.replace(/^--tsconfig=/, '');
            cleanPath = cleanPath.replace(/^--project=/, '');
            
            const fullPath = path.resolve(this.workspaceRoot, cleanPath);
            try {
              await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
            } catch {
              issues.push(`${field.label}: Path does not exist: ${cleanPath}`);
            }
          }
        } else {
          // Standard path validation for other fields
          const fullPath = path.resolve(this.workspaceRoot, value as string);
          try {
            await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
          } catch {
            issues.push(`${field.label}: Path does not exist: ${value}`);
          }
        }
      }
    }
    
    if (issues.length === 0) {
      vscode.window.showInformationMessage('✅ All settings are valid!');
    } else {
      const message = `Found ${issues.length} configuration issues:\n\n${issues.join('\n')}`;
      this.outputChannel.appendLine(message);
      this.outputChannel.show();
      vscode.window.showWarningMessage(`Found ${issues.length} configuration issues. Check output for details.`);
    }
  }

  /**
   * Browse for path
   */
  private async browsePath(inputId: string): Promise<void> {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(this.workspaceRoot)
    });

    if (result && result[0]) {
      const relativePath = path.relative(this.workspaceRoot, result[0].fsPath);
      
      // Send the selected path back to webview
      if (this.webviewPanel) {
        this.webviewPanel.webview.postMessage({
          command: 'setPath',
          inputId: inputId,
          path: relativePath
        });
      }
    }
  }

  /**
   * Refresh webview content
   */
  private async refreshWebview(): Promise<void> {
    if (this.webviewPanel) {
      this.webviewPanel.webview.html = await this.getSettingsWebviewContent();
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.webviewPanel) {
      this.webviewPanel.dispose();
    }
  }
}
