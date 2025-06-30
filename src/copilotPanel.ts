import * as vscode from 'vscode';
import { CopilotIntegrationService } from './copilotIntegration';

export class CopilotPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'playwrightBddCopilot';

  private _view?: vscode.WebviewView;
  private _outputChannel: vscode.OutputChannel;
  private _copilotService: CopilotIntegrationService;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    outputChannel: vscode.OutputChannel,
    copilotService: CopilotIntegrationService
  ) {
    this._outputChannel = outputChannel;
    this._copilotService = copilotService;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(data => {
      switch (data.type) {
        case 'openDebugAssistant':
          vscode.commands.executeCommand('playwright-bdd.copilotDebugAssist');
          break;
        case 'suggestBreakpoints':
          vscode.commands.executeCommand('playwright-bdd.copilotSuggestBreakpoints');
          break;
        case 'suggestStepFix':
          vscode.commands.executeCommand('playwright-bdd.copilotSuggestStepFix');
          break;
        case 'analyzeFailure':
          vscode.commands.executeCommand('playwright-bdd.copilotAnalyzeFailure');
          break;
        case 'improveTest':
          vscode.commands.executeCommand('playwright-bdd.copilotImproveTest');
          break;
        case 'openSettings':
          vscode.commands.executeCommand('playwright-bdd.showSettings');
          break;
        case 'refreshPanel':
          this.refresh();
          break;
      }
    });
  }

  public refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const config = vscode.workspace.getConfiguration('playwrightBdd');
    const copilotEnabled = config.get<boolean>('copilot.enabled', true);
    const showCopilotPanel = config.get<boolean>('ui.showCopilotPanel', true);
    const autoShowSuggestions = config.get<boolean>('copilot.autoShowSuggestions', true);
    const confidenceThreshold = config.get<number>('copilot.confidenceThreshold', 60);
    const maxSuggestions = config.get<number>('copilot.maxSuggestions', 5);

    if (!showCopilotPanel) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                    padding: 16px;
                    text-align: center;
                }
                .disabled-message {
                    color: var(--vscode-descriptionForeground);
                    font-size: 13px;
                }
                .enable-button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="disabled-message">
                Copilot panel is disabled
            </div>
            <button class="enable-button" onclick="openSettings()">
                Enable in Settings
            </button>
            <script>
                const vscode = acquireVsCodeApi();
                function openSettings() {
                    vscode.postMessage({ type: 'openSettings' });
                }
            </script>
        </body>
        </html>`;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background: var(--vscode-editor-background);
                padding: 12px;
                margin: 0;
                font-size: 13px;
                line-height: 1.4;
            }
            .header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .header-icon {
                font-size: 16px;
            }
            .header-title {
                font-weight: 600;
                font-size: 14px;
            }
            .status-indicator {
                margin-left: auto;
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 10px;
                background: ${copilotEnabled ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)'};
                color: white;
            }
            .quick-actions {
                display: grid;
                gap: 8px;
                margin-bottom: 16px;
            }
            .action-button {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
                text-align: left;
                font-size: 12px;
                transition: background-color 0.15s;
            }
            .action-button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .action-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .action-icon {
                font-size: 14px;
                width: 16px;
                text-align: center;
            }
            .action-text {
                flex: 1;
            }
            .action-description {
                color: var(--vscode-descriptionForeground);
                font-size: 11px;
                margin-top: 2px;
            }
            .settings-section {
                margin-top: 16px;
                padding-top: 12px;
                border-top: 1px solid var(--vscode-panel-border);
            }
            .settings-title {
                font-weight: 500;
                margin-bottom: 8px;
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
            }
            .setting-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 0;
                font-size: 11px;
            }
            .setting-label {
                color: var(--vscode-descriptionForeground);
            }
            .setting-value {
                font-weight: 500;
            }
            .disabled-overlay {
                position: relative;
            }
            .disabled-overlay::after {
                content: 'Copilot Disabled';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--vscode-editor-background);
                padding: 8px 12px;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
                z-index: 10;
            }
            .disabled-overlay .quick-actions {
                opacity: 0.3;
                pointer-events: none;
            }
            .refresh-button {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: none;
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
                margin-left: auto;
            }
            .tips-section {
                margin-top: 12px;
                padding: 8px;
                background: var(--vscode-textBlockQuote-background);
                border-left: 3px solid var(--vscode-textLink-foreground);
                border-radius: 0 4px 4px 0;
            }
            .tip-title {
                font-weight: 500;
                font-size: 11px;
                margin-bottom: 4px;
            }
            .tip-text {
                font-size: 10px;
                color: var(--vscode-descriptionForeground);
                line-height: 1.3;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <span class="header-icon">🤖</span>
            <span class="header-title">AI Copilot</span>
            <div class="status-indicator">
                <span>${copilotEnabled ? '●' : '○'}</span>
                <span>${copilotEnabled ? 'Active' : 'Disabled'}</span>
            </div>
        </div>

        <div class="${copilotEnabled ? '' : 'disabled-overlay'}">
            <div class="quick-actions">
                <button class="action-button" onclick="openDebugAssistant()" ${!copilotEnabled ? 'disabled' : ''}>
                    <span class="action-icon">🔍</span>
                    <div class="action-text">
                        <div>Debug Assistant</div>
                        <div class="action-description">AI-powered debugging help</div>
                    </div>
                </button>

                <button class="action-button" onclick="suggestBreakpoints()" ${!copilotEnabled ? 'disabled' : ''}>
                    <span class="action-icon">🎯</span>
                    <div class="action-text">
                        <div>Smart Breakpoints</div>
                        <div class="action-description">Strategic debugging points</div>
                    </div>
                </button>

                <button class="action-button" onclick="suggestStepFix()" ${!copilotEnabled ? 'disabled' : ''}>
                    <span class="action-icon">💡</span>
                    <div class="action-text">
                        <div>Fix Steps</div>
                        <div class="action-description">Resolve step definition issues</div>
                    </div>
                </button>

                <button class="action-button" onclick="analyzeFailure()" ${!copilotEnabled ? 'disabled' : ''}>
                    <span class="action-icon">🔬</span>
                    <div class="action-text">
                        <div>Analyze Failure</div>
                        <div class="action-description">Understand test failures</div>
                    </div>
                </button>

                <button class="action-button" onclick="improveTest()" ${!copilotEnabled ? 'disabled' : ''}>
                    <span class="action-icon">⚡</span>
                    <div class="action-text">
                        <div>Improve Tests</div>
                        <div class="action-description">Performance & quality tips</div>
                    </div>
                </button>
            </div>
        </div>

        <div class="settings-section">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <div class="settings-title">Configuration</div>
                <button class="refresh-button" onclick="refreshPanel()">↻</button>
            </div>
            
            <div class="setting-item">
                <span class="setting-label">Auto-suggestions:</span>
                <span class="setting-value">${autoShowSuggestions ? 'On' : 'Off'}</span>
            </div>
            
            <div class="setting-item">
                <span class="setting-label">Confidence threshold:</span>
                <span class="setting-value">${confidenceThreshold}%</span>
            </div>
            
            <div class="setting-item">
                <span class="setting-label">Max suggestions:</span>
                <span class="setting-value">${maxSuggestions}</span>
            </div>
            
            <button class="action-button" onclick="openSettings()" style="margin-top: 8px; font-size: 11px; padding: 6px 8px;">
                <span class="action-icon">⚙️</span>
                <span>Configure Copilot</span>
            </button>
        </div>

        ${copilotEnabled ? `
        <div class="tips-section">
            <div class="tip-title">💡 Tip</div>
            <div class="tip-text">
                Position your cursor on a step line in a .feature file, then use the Debug Assistant for context-aware suggestions.
            </div>
        </div>
        ` : `
        <div class="tips-section">
            <div class="tip-title">ℹ️ Enable Copilot</div>
            <div class="tip-text">
                Enable AI assistance in settings to get intelligent debugging suggestions and automated error analysis.
            </div>
        </div>
        `}

        <script>
            const vscode = acquireVsCodeApi();
            
            function openDebugAssistant() {
                vscode.postMessage({ type: 'openDebugAssistant' });
            }
            
            function suggestBreakpoints() {
                vscode.postMessage({ type: 'suggestBreakpoints' });
            }
            
            function suggestStepFix() {
                vscode.postMessage({ type: 'suggestStepFix' });
            }
            
            function analyzeFailure() {
                vscode.postMessage({ type: 'analyzeFailure' });
            }
            
            function improveTest() {
                vscode.postMessage({ type: 'improveTest' });
            }
            
            function openSettings() {
                vscode.postMessage({ type: 'openSettings' });
            }
            
            function refreshPanel() {
                vscode.postMessage({ type: 'refreshPanel' });
            }
        </script>
    </body>
    </html>`;
  }
}
