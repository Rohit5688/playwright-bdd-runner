import * as vscode from 'vscode';
import * as path from 'path';
import { BDDDebuggingTools, DebugSession, DebugBreakpoint, StepExecutionContext } from './debuggingTools';
import { StepDefinitionProvider } from './stepDefinitionProvider';

export interface CopilotDebugSuggestion {
  type: 'fix' | 'optimization' | 'explanation' | 'alternative' | 'breakpoint';
  title: string;
  description: string;
  code?: string;
  confidence: number;
  severity: 'info' | 'warning' | 'error';
  action?: {
    command: string;
    args?: any[];
  };
}

export interface DebugContext {
  currentStep?: string;
  stepType?: string;
  featureFile?: string;
  scenario?: string;
  variables?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    line?: number;
  };
  executionHistory?: string[];
  breakpoints?: DebugBreakpoint[];
}

export class CopilotIntegrationService {
  private outputChannel: vscode.OutputChannel;
  private debuggingTools?: BDDDebuggingTools;
  private stepDefinitionProvider?: StepDefinitionProvider;
  private lastDebugContext?: DebugContext;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Initialize copilot integration with debugging tools
   */
  initialize(debuggingTools: BDDDebuggingTools, stepDefinitionProvider: StepDefinitionProvider): void {
    this.debuggingTools = debuggingTools;
    this.stepDefinitionProvider = stepDefinitionProvider;

    // Listen to debug events
    this.debuggingTools.on('debugSessionStarted', this.onDebugSessionStarted.bind(this));
    this.debuggingTools.on('stepOver', this.onStepExecution.bind(this));
    this.debuggingTools.on('pause', this.onDebugPause.bind(this));
    this.debuggingTools.on('stop', this.onDebugStop.bind(this));

    this.outputChannel.appendLine('🤖 Copilot Integration initialized for debugging support');
  }

  /**
   * Register copilot commands with VS Code
   */
  registerCommands(context: vscode.ExtensionContext): void {
    // Main copilot debug assistant command
    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.copilotDebugAssist', async () => {
        await this.showDebugAssistant();
      })
    );

    // Smart breakpoint suggestions
    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.copilotSuggestBreakpoints', async () => {
        await this.suggestSmartBreakpoints();
      })
    );

    // Step definition suggestions
    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.copilotSuggestStepFix', async () => {
        await this.suggestStepDefinitionFix();
      })
    );

    // Test failure analysis
    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.copilotAnalyzeFailure', async (error?: string) => {
        await this.analyzeTestFailure(error);
      })
    );

    // Generate test improvements
    context.subscriptions.push(
      vscode.commands.registerCommand('playwright-bdd.copilotImproveTest', async () => {
        await this.suggestTestImprovements();
      })
    );

    this.outputChannel.appendLine('🤖 Copilot commands registered');
  }

  /**
   * Main debug assistant interface
   */
  private async showDebugAssistant(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage('Please open a file to get debugging assistance.');
      return;
    }

    const context = await this.gatherDebugContext(activeEditor);
    const panel = vscode.window.createWebviewPanel(
      'copilotDebugAssist',
      '🤖 Copilot Debug Assistant',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = await this.getCopilotAssistantHtml(context);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'analyzeCurrent':
          await this.analyzeCurrentContext(panel.webview, context);
          break;
        case 'suggestBreakpoints':
          await this.provideSuggestedBreakpoints(panel.webview, context);
          break;
        case 'explainStep':
          await this.explainStepExecution(panel.webview, message.stepText, context);
          break;
        case 'generateFix':
          await this.generateCodeFix(panel.webview, message.error, context);
          break;
        case 'optimizeTest':
          await this.optimizeTestScenario(panel.webview, context);
          break;
        case 'applyFix':
          await this.applyGeneratedFix(message.fix);
          break;
      }
    });
  }

  /**
   * Generate HTML for the copilot assistant interface
   */
  private async getCopilotAssistantHtml(context: DebugContext): Promise<string> {
    const suggestions = await this.generateSuggestions(context);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Copilot Debug Assistant</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                padding: 20px;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                line-height: 1.6;
            }
            .header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
                padding: 15px;
                background: var(--vscode-panel-background);
                border-radius: 8px;
                border: 1px solid var(--vscode-panel-border);
            }
            .robot-icon {
                font-size: 24px;
            }
            .context-info {
                background: var(--vscode-textBlockQuote-background);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid var(--vscode-textLink-foreground);
            }
            .suggestions {
                display: grid;
                gap: 15px;
            }
            .suggestion {
                background: var(--vscode-panel-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 15px;
                transition: background-color 0.2s;
            }
            .suggestion:hover {
                background: var(--vscode-list-hoverBackground);
            }
            .suggestion-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .suggestion-title {
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
            .suggestion-confidence {
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
            }
            .suggestion-description {
                margin-bottom: 10px;
                color: var(--vscode-descriptionForeground);
            }
            .suggestion-code {
                background: var(--vscode-textCodeBlock-background);
                border: 1px solid var(--vscode-panel-border);
                padding: 10px;
                border-radius: 4px;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 13px;
                margin: 10px 0;
                overflow-x: auto;
            }
            .action-buttons {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            .action-button {
                padding: 8px 16px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .action-button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .action-button.secondary {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            .severity-error { border-left-color: var(--vscode-errorForeground); }
            .severity-warning { border-left-color: var(--vscode-warningForeground); }
            .severity-info { border-left-color: var(--vscode-infoForeground); }
            .quick-actions {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            .quick-action {
                padding: 10px 15px;
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .status-indicator {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-right: 8px;
            }
            .status-running { background: var(--vscode-testing-iconQueued); }
            .status-paused { background: var(--vscode-testing-iconSkipped); }
            .status-error { background: var(--vscode-testing-iconFailed); }
            .status-success { background: var(--vscode-testing-iconPassed); }
        </style>
    </head>
    <body>
        <div class="header">
            <span class="robot-icon">🤖</span>
            <div>
                <h2 style="margin: 0;">Copilot Debug Assistant</h2>
                <p style="margin: 5px 0 0 0; color: var(--vscode-descriptionForeground);">
                    AI-powered debugging assistance for your BDD tests
                </p>
            </div>
        </div>

        <div class="context-info">
            <h3>📋 Current Context</h3>
            ${context.scenario ? `<p><strong>Scenario:</strong> ${context.scenario}</p>` : ''}
            ${context.currentStep ? `<p><strong>Current Step:</strong> ${context.currentStep}</p>` : ''}
            ${context.featureFile ? `<p><strong>Feature:</strong> ${path.basename(context.featureFile)}</p>` : ''}
            ${context.error ? `
                <p><strong>Error:</strong> 
                    <span class="status-indicator status-error"></span>
                    ${context.error.message}
                </p>
            ` : ''}
        </div>

        <div class="quick-actions">
            <button class="quick-action" onclick="sendCommand('analyzeCurrent')">
                🔍 Analyze Current Context
            </button>
            <button class="quick-action" onclick="sendCommand('suggestBreakpoints')">
                🎯 Suggest Breakpoints
            </button>
            ${context.currentStep ? `
                <button class="quick-action" onclick="sendCommand('explainStep', '${context.currentStep}')">
                    💡 Explain This Step
                </button>
            ` : ''}
            ${context.error ? `
                <button class="quick-action" onclick="sendCommand('generateFix', '${context.error.message}')">
                    🔧 Generate Fix
                </button>
            ` : ''}
            <button class="quick-action" onclick="sendCommand('optimizeTest')">
                ⚡ Optimize Test
            </button>
        </div>

        <div class="suggestions">
            <h3>💡 AI Suggestions</h3>
            ${suggestions.map(suggestion => `
                <div class="suggestion severity-${suggestion.severity}">
                    <div class="suggestion-header">
                        <span class="suggestion-title">${suggestion.title}</span>
                        <span class="suggestion-confidence">${Math.round(suggestion.confidence * 100)}% confidence</span>
                    </div>
                    <div class="suggestion-description">${suggestion.description}</div>
                    ${suggestion.code ? `<div class="suggestion-code">${suggestion.code}</div>` : ''}
                    ${suggestion.action ? `
                        <div class="action-buttons">
                            <button class="action-button" onclick="applyFix('${JSON.stringify(suggestion).replace(/'/g, "\\'")}')">
                                Apply Fix
                            </button>
                            <button class="action-button secondary" onclick="explainSuggestion('${suggestion.type}')">
                                Explain
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function sendCommand(command, ...args) {
                vscode.postMessage({ command, args });
            }
            
            function applyFix(suggestionJson) {
                try {
                    const suggestion = JSON.parse(suggestionJson);
                    vscode.postMessage({ command: 'applyFix', fix: suggestion });
                } catch (e) {
                    console.error('Failed to parse suggestion:', e);
                }
            }
            
            function explainSuggestion(type) {
                vscode.postMessage({ command: 'explain', type });
            }
        </script>
    </body>
    </html>`;
  }

  /**
   * Generate AI-powered debugging suggestions
   */
  private async generateSuggestions(context: DebugContext): Promise<CopilotDebugSuggestion[]> {
    const suggestions: CopilotDebugSuggestion[] = [];

    // Analyze current step for potential issues
    if (context.currentStep) {
      suggestions.push(...await this.analyzeStepForIssues(context.currentStep, context));
    }

    // Analyze error if present
    if (context.error) {
      suggestions.push(...await this.analyzeError(context.error, context));
    }

    // Suggest breakpoints for debugging
    suggestions.push(...await this.suggestStrategicBreakpoints(context));

    // Performance optimizations
    suggestions.push(...await this.suggestPerformanceOptimizations(context));

    // Test structure improvements
    suggestions.push(...await this.suggestTestStructureImprovements(context));

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze step for potential issues
   */
  private async analyzeStepForIssues(stepText: string, context: DebugContext): Promise<CopilotDebugSuggestion[]> {
    const suggestions: CopilotDebugSuggestion[] = [];

    // Check for common step patterns that might cause issues
    const commonIssues = [
      {
        pattern: /wait|sleep|delay/i,
        suggestion: {
          type: 'optimization' as const,
          title: 'Avoid Hard Waits',
          description: 'Consider using Playwright\'s built-in waiting mechanisms instead of hard waits for more reliable tests.',
          code: `// Instead of:\nawait page.waitForTimeout(5000);\n\n// Use:\nawait page.waitForSelector('.expected-element');\n// or\nawait expect(page.locator('.expected-element')).toBeVisible();`,
          confidence: 0.8,
          severity: 'warning' as const
        }
      },
      {
        pattern: /click.*button|press.*button/i,
        suggestion: {
          type: 'explanation' as const,
          title: 'Button Click Debugging',
          description: 'If button clicks are failing, check if the element is visible, enabled, and not covered by other elements.',
          code: `// Add these checks before clicking:\nawait expect(page.locator('button')).toBeVisible();\nawait expect(page.locator('button')).toBeEnabled();\nawait page.locator('button').click();`,
          confidence: 0.7,
          severity: 'info' as const
        }
      },
      {
        pattern: /fill|type|input/i,
        suggestion: {
          type: 'explanation' as const,
          title: 'Form Input Debugging',
          description: 'For input failures, ensure the field is visible and not readonly before typing.',
          code: `// Robust input handling:\nawait page.locator('input').clear();\nawait page.locator('input').fill('your text');\n// Verify the input:\nawait expect(page.locator('input')).toHaveValue('your text');`,
          confidence: 0.75,
          severity: 'info' as const
        }
      }
    ];

    for (const issue of commonIssues) {
      if (issue.pattern.test(stepText)) {
        suggestions.push(issue.suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Analyze error messages for debugging insights
   */
  private async analyzeError(error: { message: string; stack?: string; line?: number }, context: DebugContext): Promise<CopilotDebugSuggestion[]> {
    const suggestions: CopilotDebugSuggestion[] = [];
    const errorMessage = error.message.toLowerCase();

    // Common Playwright error patterns
    const errorPatterns = [
      {
        pattern: /timeout.*waiting for.*selector/,
        suggestion: {
          type: 'fix' as const,
          title: 'Element Not Found - Timeout',
          description: 'The element selector timed out. The element might not exist, be hidden, or the selector might be incorrect.',
          code: `// Debug steps:\n1. Check if element exists: await page.locator('selector').count()\n2. Wait for element: await page.waitForSelector('selector')\n3. Use more specific selector: await page.locator('[data-testid="element"]')\n4. Increase timeout: await page.locator('selector').waitFor({ timeout: 10000 })`,
          confidence: 0.9,
          severity: 'error' as const
        }
      },
      {
        pattern: /element.*not.*visible/,
        suggestion: {
          type: 'fix' as const,
          title: 'Element Not Visible',
          description: 'The element exists but is not visible. It might be hidden by CSS or covered by another element.',
          code: `// Debug visibility:\n1. Check if element is hidden: await page.locator('selector').isHidden()\n2. Scroll element into view: await page.locator('selector').scrollIntoViewIfNeeded()\n3. Wait for element to be visible: await page.locator('selector').waitFor({ state: 'visible' })`,
          confidence: 0.85,
          severity: 'error' as const
        }
      },
      {
        pattern: /step.*not.*implemented|missing.*step.*definition/,
        suggestion: {
          type: 'fix' as const,
          title: 'Missing Step Definition',
          description: 'This step doesn\'t have a corresponding step definition. You need to implement it.',
          code: `// Add to your step definitions file:\nGiven('your step text here', async ({ page }) => {\n  // Implement your step logic here\n  throw new Error('Step not implemented yet');\n});`,
          confidence: 0.95,
          severity: 'error' as const,
          action: {
            command: 'playwright-bdd.createStepDefinition'
          }
        }
      }
    ];

    for (const pattern of errorPatterns) {
      if (pattern.pattern.test(errorMessage)) {
        suggestions.push(pattern.suggestion);
      }
    }

    // Generic error analysis
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'explanation',
        title: 'Error Analysis',
        description: `The error "${error.message}" occurred. Consider adding breakpoints around the failing step to investigate the state of your application.`,
        confidence: 0.6,
        severity: 'info'
      });
    }

    return suggestions;
  }

  /**
   * Suggest strategic breakpoints for debugging
   */
  private async suggestStrategicBreakpoints(context: DebugContext): Promise<CopilotDebugSuggestion[]> {
    const suggestions: CopilotDebugSuggestion[] = [];

    if (context.currentStep) {
      suggestions.push({
        type: 'breakpoint',
        title: 'Add Breakpoint Before Current Step',
        description: 'Add a breakpoint before the current step to inspect the application state.',
        confidence: 0.8,
        severity: 'info',
        action: {
          command: 'playwright-bdd.toggleBreakpoint'
        }
      });
    }

    if (context.error) {
      suggestions.push({
        type: 'breakpoint',
        title: 'Strategic Error Investigation',
        description: 'Add breakpoints at key points to trace the execution path leading to the error.',
        confidence: 0.85,
        severity: 'warning'
      });
    }

    return suggestions;
  }

  /**
   * Suggest performance optimizations
   */
  private async suggestPerformanceOptimizations(context: DebugContext): Promise<CopilotDebugSuggestion[]> {
    const suggestions: CopilotDebugSuggestion[] = [];

    suggestions.push({
      type: 'optimization',
      title: 'Optimize Test Performance',
      description: 'Consider using page.waitForLoadState() instead of arbitrary waits, and group related actions together.',
      code: `// Optimize waiting:\nawait page.waitForLoadState('networkidle');\n\n// Group actions:\nawait Promise.all([\n  page.fill('#username', 'user'),\n  page.fill('#password', 'pass')\n]);`,
      confidence: 0.7,
      severity: 'info'
    });

    return suggestions;
  }

  /**
   * Suggest test structure improvements
   */
  private async suggestTestStructureImprovements(context: DebugContext): Promise<CopilotDebugSuggestion[]> {
    const suggestions: CopilotDebugSuggestion[] = [];

    suggestions.push({
      type: 'optimization',
      title: 'Improve Test Maintainability',
      description: 'Consider using Page Object Model pattern for better test organization and reusability.',
      code: `// Create page objects:\nclass LoginPage {\n  constructor(page) { this.page = page; }\n  \n  async login(username, password) {\n    await this.page.fill('#username', username);\n    await this.page.fill('#password', password);\n    await this.page.click('#login-btn');\n  }\n}`,
      confidence: 0.6,
      severity: 'info'
    });

    return suggestions;
  }

  /**
   * Gather debug context from current editor and debug session
   */
  private async gatherDebugContext(editor: vscode.TextEditor): Promise<DebugContext> {
    const context: DebugContext = {
      featureFile: editor.document.fileName.endsWith('.feature') ? editor.document.fileName : undefined
    };

    // Extract scenario and step information if in a feature file
    if (context.featureFile) {
      const content = editor.document.getText();
      const currentLine = editor.selection.active.line;
      
      // Find current scenario
      const lines = content.split('\n');
      for (let i = currentLine; i >= 0; i--) {
        const scenarioMatch = lines[i].match(/^\s*Scenario(?:\s+Outline)?:\s*(.+)$/);
        if (scenarioMatch) {
          context.scenario = scenarioMatch[1].trim();
          break;
        }
      }

      // Find current step
      const currentLineText = lines[currentLine].trim();
      const stepMatch = currentLineText.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        context.currentStep = stepMatch[2].trim();
        context.stepType = stepMatch[1];
      }
    }

    // Get breakpoints if debugging tools are available
    if (this.debuggingTools) {
      context.breakpoints = this.debuggingTools.getBreakpoints();
    }

    return context;
  }

  /**
   * Event handlers for debug session
   */
  private onDebugSessionStarted(session: DebugSession): void {
    this.outputChannel.appendLine(`🤖 Copilot: Debug session started for ${session.scenario}`);
    this.lastDebugContext = {
      scenario: session.scenario,
      featureFile: session.featureFile,
      breakpoints: session.breakpoints
    };
  }

  private onStepExecution(session: DebugSession): void {
    if (session.currentStep) {
      this.outputChannel.appendLine(`🤖 Copilot: Analyzing step execution - ${session.currentStep.stepText}`);
      this.lastDebugContext = {
        ...this.lastDebugContext,
        currentStep: session.currentStep.stepText,
        variables: Object.fromEntries(session.variables)
      };
    }
  }

  private onDebugPause(session: DebugSession): void {
    this.outputChannel.appendLine('🤖 Copilot: Debug session paused - ready to assist');
    // Could trigger automatic assistance here
  }

  private onDebugStop(session: DebugSession): void {
    this.outputChannel.appendLine('🤖 Copilot: Debug session ended');
    this.lastDebugContext = undefined;
  }

  /**
   * WebView message handlers
   */
  private async analyzeCurrentContext(webview: vscode.Webview, context: DebugContext): Promise<void> {
    const analysis = await this.generateSuggestions(context);
    webview.postMessage({
      command: 'updateSuggestions',
      suggestions: analysis
    });
  }

  private async provideSuggestedBreakpoints(webview: vscode.Webview, context: DebugContext): Promise<void> {
    const breakpointSuggestions = await this.suggestStrategicBreakpoints(context);
    webview.postMessage({
      command: 'showBreakpointSuggestions',
      suggestions: breakpointSuggestions
    });
  }

  private async explainStepExecution(webview: vscode.Webview, stepText: string, context: DebugContext): Promise<void> {
    const explanation = await this.generateStepExplanation(stepText, context);
    webview.postMessage({
      command: 'showStepExplanation',
      explanation
    });
  }

  private async generateCodeFix(webview: vscode.Webview, error: string, context: DebugContext): Promise<void> {
    const fixes = await this.analyzeError({ message: error }, context);
    webview.postMessage({
      command: 'showGeneratedFixes',
      fixes
    });
  }

  private async optimizeTestScenario(webview: vscode.Webview, context: DebugContext): Promise<void> {
    const optimizations = await this.suggestPerformanceOptimizations(context);
    webview.postMessage({
      command: 'showOptimizations',
      optimizations
    });
  }

  private async applyGeneratedFix(fix: CopilotDebugSuggestion): Promise<void> {
    if (fix.action) {
      await vscode.commands.executeCommand(fix.action.command, ...(fix.action.args || []));
    } else if (fix.code) {
      // Copy code to clipboard for manual application
      await vscode.env.clipboard.writeText(fix.code);
      vscode.window.showInformationMessage('Fix code copied to clipboard!');
    }
  }

  /**
   * Generate explanation for a specific step
   */
  private async generateStepExplanation(stepText: string, context: DebugContext): Promise<string> {
    // This would ideally integrate with an AI service
    // For now, providing rule-based explanations
    
    const explanations: Record<string, string> = {
      'click': 'This step simulates a user clicking on an element. Make sure the element is visible and clickable.',
      'fill': 'This step enters text into an input field. Ensure the field is visible and not readonly.',
      'navigate': 'This step navigates to a different page or URL. Check for proper page loading.',
      'wait': 'This step waits for something to happen. Consider using more specific waits.',
      'verify': 'This step checks if something is true. Make sure your assertions are specific.'
    };

    for (const [key, explanation] of Object.entries(explanations)) {
      if (stepText.toLowerCase().includes(key)) {
        return explanation;
      }
    }

    return `This step "${stepText}" performs a specific action in your test. Consider adding debugging output to understand its current state.`;
  }

  /**
   * Suggest smart breakpoints based on current context
   */
  private async suggestSmartBreakpoints(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || !activeEditor.document.fileName.endsWith('.feature')) {
      vscode.window.showWarningMessage('Please open a .feature file to get breakpoint suggestions.');
      return;
    }

    const context = await this.gatherDebugContext(activeEditor);
    const suggestions = await this.suggestStrategicBreakpoints(context);

    if (suggestions.length === 0) {
      vscode.window.showInformationMessage('No specific breakpoint suggestions for current context.');
      return;
    }

    const items = suggestions.map(s => ({
      label: s.title,
      description: s.description,
      suggestion: s
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a breakpoint suggestion to apply'
    });

    if (selected && selected.suggestion.action) {
      await vscode.commands.executeCommand(selected.suggestion.action.command, ...(selected.suggestion.action.args || []));
    }
  }

  /**
   * Suggest step definition fixes
   */
  private async suggestStepDefinitionFix(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage('Please open a file to get step definition suggestions.');
      return;
    }

    if (this.stepDefinitionProvider) {
      const currentLine = activeEditor.selection.active.line;
      const lineText = activeEditor.document.lineAt(currentLine).text;
      const stepMatch = lineText.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      
      if (stepMatch) {
        const stepText = stepMatch[2].trim();
        const definitions = this.stepDefinitionProvider.getAllStepDefinitions();
        const matchingDef = definitions.find(def => 
          new RegExp(def.pattern).test(stepText)
        );

        if (!matchingDef) {
          const result = await vscode.window.showInformationMessage(
            `No step definition found for: "${stepText}"`,
            'Create Step Definition',
            'Show Suggestions'
          );

          if (result === 'Create Step Definition') {
            await vscode.commands.executeCommand('playwright-bdd.createStepDefinition');
          } else if (result === 'Show Suggestions') {
            await this.showDebugAssistant();
          }
        } else {
          vscode.window.showInformationMessage(`Step definition found in ${path.basename(matchingDef.file)}`);
        }
      }
    }
  }

  /**
   * Analyze test failure with AI assistance
   */
  private async analyzeTestFailure(error?: string): Promise<void> {
    if (!error) {
      const input = await vscode.window.showInputBox({
        prompt: 'Enter the error message or describe the test failure',
        placeHolder: 'e.g., TimeoutError: Timeout 30000ms exceeded...'
      });
      
      if (!input) return;
      error = input;
    }

    const context: DebugContext = {
      error: { message: error }
    };

    const suggestions = await this.analyzeError({ message: error }, context);
    
    if (suggestions.length === 0) {
      vscode.window.showInformationMessage('No specific suggestions for this error. Consider using the full debug assistant.');
      return;
    }

    const items = suggestions.map(s => ({
      label: `${s.type.toUpperCase()}: ${s.title}`,
      description: s.description,
      detail: s.code ? 'Has code suggestion' : '',
      suggestion: s
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a suggestion to view details'
    });

    if (selected) {
      if (selected.suggestion.code) {
        const doc = await vscode.workspace.openTextDocument({
          content: selected.suggestion.code,
          language: 'javascript'
        });
        await vscode.window.showTextDocument(doc);
      }

      if (selected.suggestion.action) {
        const apply = await vscode.window.showInformationMessage(
          selected.suggestion.description,
          'Apply Fix'
        );
        
        if (apply === 'Apply Fix') {
          await vscode.commands.executeCommand(selected.suggestion.action.command, ...(selected.suggestion.action.args || []));
        }
      }
    }
  }

  /**
   * Suggest test improvements
   */
  private async suggestTestImprovements(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage('Please open a test file to get improvement suggestions.');
      return;
    }

    const context = await this.gatherDebugContext(activeEditor);
    const improvements = [
      ...await this.suggestPerformanceOptimizations(context),
      ...await this.suggestTestStructureImprovements(context)
    ];

    if (improvements.length === 0) {
      vscode.window.showInformationMessage('No specific improvements suggested for current context.');
      return;
    }

    const items = improvements.map(imp => ({
      label: imp.title,
      description: imp.description,
      detail: `${Math.round(imp.confidence * 100)}% confidence`,
      improvement: imp
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an improvement to view details'
    });

    if (selected && selected.improvement.code) {
      const doc = await vscode.workspace.openTextDocument({
        content: selected.improvement.code,
        language: 'javascript'
      });
      await vscode.window.showTextDocument(doc);
    }
  }
}
