import * as vscode from 'vscode';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface DebugBreakpoint {
  id: string;
  file: string;
  line: number;
  stepText: string;
  condition?: string;
  hitCount?: number;
  enabled: boolean;
  logMessage?: string;
}

export interface DebugSession {
  sessionId: string;
  featureFile: string;
  scenario: string;
  currentStep?: {
    stepText: string;
    file: string;
    line: number;
    stepIndex: number;
  };
  status: 'stopped' | 'running' | 'paused' | 'completed' | 'failed';
  variables: Map<string, any>;
  callStack: Array<{
    name: string;
    file: string;
    line: number;
  }>;
  breakpoints: DebugBreakpoint[];
}

export interface StepExecutionContext {
  stepText: string;
  stepType: 'Given' | 'When' | 'Then' | 'And' | 'But';
  parameters: Record<string, any>;
  dataTable?: any[][];
  docString?: string;
  variables: Record<string, any>;
  page?: any; // Playwright page object
}

export class BDDDebuggingTools extends EventEmitter {
  private breakpoints: Map<string, DebugBreakpoint> = new Map();
  private activeSessions: Map<string, DebugSession> = new Map();
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;
  private debugConfigProvider: BDDDebugConfigProvider;

  constructor(outputChannel: vscode.OutputChannel, workspaceRoot: string) {
    super();
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
    this.debugConfigProvider = new BDDDebugConfigProvider();
  }

  /**
   * Register debugging tools with VS Code
   */
  register(context: vscode.ExtensionContext): void {
    // Register debug configuration provider
    context.subscriptions.push(
      vscode.debug.registerDebugConfigurationProvider('bdd-playwright', this.debugConfigProvider)
    );

    // Register breakpoint management
    context.subscriptions.push(
      vscode.debug.onDidChangeBreakpoints(this.onBreakpointsChanged.bind(this))
    );

    // Register debug session handlers
    context.subscriptions.push(
      vscode.debug.onDidStartDebugSession(this.onDebugSessionStarted.bind(this)),
      vscode.debug.onDidTerminateDebugSession(this.onDebugSessionTerminated.bind(this))
    );

    this.outputChannel.appendLine('🐛 BDD Debugging Tools registered');
  }

  /**
   * Start step-by-step debugging for a scenario
   */
  async startStepByStepDebugging(featureFile: string, scenarioName: string): Promise<void> {
    try {
      this.outputChannel.appendLine(`🔍 Starting step-by-step debugging: ${scenarioName}`);

      const sessionId = this.generateSessionId();
      const session: DebugSession = {
        sessionId,
        featureFile,
        scenario: scenarioName,
        status: 'stopped',
        variables: new Map(),
        callStack: [],
        breakpoints: Array.from(this.breakpoints.values())
      };

      this.activeSessions.set(sessionId, session);

      // Create debug configuration
      const debugConfig: vscode.DebugConfiguration = {
        type: 'bdd-playwright',
        request: 'launch',
        name: `Debug BDD Scenario: ${scenarioName}`,
        program: '${workspaceFolder}/node_modules/.bin/playwright',
        args: [
          'test',
          '--config=playwright.config.ts',
          '--debug',
          `--grep="${scenarioName}"`
        ],
        cwd: '${workspaceFolder}',
        env: {
          PWDEBUG: '1',
          BDD_DEBUG_MODE: 'step-by-step',
          BDD_SESSION_ID: sessionId
        },
        console: 'integratedTerminal',
        internalConsoleOptions: 'openOnSessionStart'
      };

      // Start debugging session
      const started = await vscode.debug.startDebugging(undefined, debugConfig);
      if (started) {
        this.emit('debugSessionStarted', session);
        this.showDebugPanel(session);
      } else {
        this.activeSessions.delete(sessionId);
        throw new Error('Failed to start debug session');
      }

    } catch (error) {
      this.outputChannel.appendLine(`❌ Debug start failed: ${error}`);
      vscode.window.showErrorMessage(`Failed to start debugging: ${error}`);
    }
  }

  /**
   * Add or toggle breakpoint
   */
  async toggleBreakpoint(file: string, line: number, stepText: string): Promise<void> {
    const breakpointId = `${file}:${line}`;
    
    if (this.breakpoints.has(breakpointId)) {
      // Remove existing breakpoint
      this.breakpoints.delete(breakpointId);
      this.outputChannel.appendLine(`🔴 Removed breakpoint: ${stepText} (${path.basename(file)}:${line})`);
    } else {
      // Add new breakpoint
      const breakpoint: DebugBreakpoint = {
        id: breakpointId,
        file,
        line,
        stepText,
        enabled: true,
        hitCount: 0
      };
      
      this.breakpoints.set(breakpointId, breakpoint);
      this.outputChannel.appendLine(`🟢 Added breakpoint: ${stepText} (${path.basename(file)}:${line})`);
    }

    this.emit('breakpointsChanged', Array.from(this.breakpoints.values()));
    this.updateBreakpointsInEditor();
  }

  /**
   * Set conditional breakpoint
   */
  async setConditionalBreakpoint(
    file: string, 
    line: number, 
    stepText: string, 
    condition: string
  ): Promise<void> {
    const breakpointId = `${file}:${line}`;
    
    const breakpoint: DebugBreakpoint = {
      id: breakpointId,
      file,
      line,
      stepText,
      condition,
      enabled: true,
      hitCount: 0
    };
    
    this.breakpoints.set(breakpointId, breakpoint);
    this.outputChannel.appendLine(`🔵 Added conditional breakpoint: ${stepText} (${condition})`);
    
    this.emit('breakpointsChanged', Array.from(this.breakpoints.values()));
    this.updateBreakpointsInEditor();
  }

  /**
   * Set log point (breakpoint that logs but doesn't stop)
   */
  async setLogPoint(
    file: string, 
    line: number, 
    stepText: string, 
    logMessage: string
  ): Promise<void> {
    const breakpointId = `${file}:${line}`;
    
    const breakpoint: DebugBreakpoint = {
      id: breakpointId,
      file,
      line,
      stepText,
      logMessage,
      enabled: true,
      hitCount: 0
    };
    
    this.breakpoints.set(breakpointId, breakpoint);
    this.outputChannel.appendLine(`📝 Added log point: ${stepText} -> "${logMessage}"`);
    
    this.emit('breakpointsChanged', Array.from(this.breakpoints.values()));
    this.updateBreakpointsInEditor();
  }

  /**
   * Show debug panel with current session info
   */
  private async showDebugPanel(session: DebugSession): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'bddDebugPanel',
      `BDD Debug: ${session.scenario}`,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.getDebugPanelHtml(session);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'stepOver':
          await this.stepOver(session.sessionId);
          break;
        case 'stepInto':
          await this.stepInto(session.sessionId);
          break;
        case 'continue':
          await this.continue(session.sessionId);
          break;
        case 'pause':
          await this.pause(session.sessionId);
          break;
        case 'stop':
          await this.stop(session.sessionId);
          break;
        case 'evaluate':
          await this.evaluateExpression(session.sessionId, message.expression);
          break;
      }
    });

    // Update panel when session changes
    this.on('sessionUpdated', (updatedSession: DebugSession) => {
      if (updatedSession.sessionId === session.sessionId) {
        panel.webview.html = this.getDebugPanelHtml(updatedSession);
      }
    });
  }

  /**
   * Generate HTML for debug panel
   */
  private getDebugPanelHtml(session: DebugSession): string {
    const currentStep = session.currentStep;
    const variables = Array.from(session.variables.entries());
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BDD Debug Panel</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                padding: 20px;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .debug-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                padding: 10px;
                background: var(--vscode-panel-background);
                border-radius: 4px;
            }
            .debug-button {
                padding: 8px 16px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .debug-button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .current-step {
                padding: 15px;
                background: var(--vscode-textBlockQuote-background);
                border-left: 4px solid var(--vscode-textLink-foreground);
                margin-bottom: 20px;
                border-radius: 4px;
            }
            .variables {
                background: var(--vscode-panel-background);
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 20px;
            }
            .variable-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .expression-input {
                width: 100%;
                padding: 8px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                margin-top: 10px;
            }
            .status {
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 20px;
                font-weight: bold;
            }
            .status.running { background: var(--vscode-testing-iconPassed); }
            .status.paused { background: var(--vscode-testing-iconQueued); }
            .status.stopped { background: var(--vscode-testing-iconFailed); }
        </style>
    </head>
    <body>
        <div class="status ${session.status}">
            Status: ${session.status.toUpperCase()}
        </div>

        <div class="debug-controls">
            <button class="debug-button" onclick="sendCommand('continue')">▶️ Continue</button>
            <button class="debug-button" onclick="sendCommand('stepOver')">⏭️ Step Over</button>
            <button class="debug-button" onclick="sendCommand('stepInto')">⏬ Step Into</button>
            <button class="debug-button" onclick="sendCommand('pause')">⏸️ Pause</button>
            <button class="debug-button" onclick="sendCommand('stop')">⏹️ Stop</button>
        </div>

        ${currentStep ? `
        <div class="current-step">
            <h3>Current Step</h3>
            <p><strong>Step:</strong> ${currentStep.stepText}</p>
            <p><strong>File:</strong> ${path.basename(currentStep.file)}:${currentStep.line}</p>
            <p><strong>Step Index:</strong> ${currentStep.stepIndex}</p>
        </div>
        ` : ''}

        <div class="variables">
            <h3>Variables</h3>
            ${variables.length > 0 ? variables.map(([name, value]) => `
                <div class="variable-item">
                    <span>${name}</span>
                    <span>${JSON.stringify(value)}</span>
                </div>
            `).join('') : '<p>No variables available</p>'}
            
            <input type="text" class="expression-input" placeholder="Evaluate expression..." 
                   onkeypress="if(event.key==='Enter') evaluateExpression(this.value)">
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function sendCommand(command) {
                vscode.postMessage({ command });
            }
            
            function evaluateExpression(expression) {
                if (expression.trim()) {
                    vscode.postMessage({ command: 'evaluate', expression });
                }
            }
        </script>
    </body>
    </html>`;
  }

  /**
   * Debug control methods
   */
  async stepOver(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.outputChannel.appendLine('⏭️ Step Over');
      // Implementation would send step-over command to debug adapter
      this.emit('stepOver', session);
    }
  }

  async stepInto(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.outputChannel.appendLine('⏬ Step Into');
      this.emit('stepInto', session);
    }
  }

  async continue(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'running';
      this.outputChannel.appendLine('▶️ Continue');
      this.emit('continue', session);
      this.emit('sessionUpdated', session);
    }
  }

  async pause(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'paused';
      this.outputChannel.appendLine('⏸️ Pause');
      this.emit('pause', session);
      this.emit('sessionUpdated', session);
    }
  }

  async stop(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'stopped';
      this.outputChannel.appendLine('⏹️ Stop');
      this.activeSessions.delete(sessionId);
      this.emit('stop', session);
    }
  }

  async evaluateExpression(sessionId: string, expression: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.outputChannel.appendLine(`🔍 Evaluating: ${expression}`);
      // Implementation would evaluate expression in current context
      this.emit('expressionEvaluated', { session, expression, result: 'TODO: Implement' });
    }
  }

  /**
   * Handle VS Code breakpoint changes
   */
  private onBreakpointsChanged(event: vscode.BreakpointsChangeEvent): void {
    // Sync with VS Code breakpoints
    event.added.forEach(bp => {
      if (bp instanceof vscode.SourceBreakpoint) {
        // Add to our breakpoint management
      }
    });

    event.removed.forEach(bp => {
      if (bp instanceof vscode.SourceBreakpoint) {
        // Remove from our breakpoint management
      }
    });
  }

  private onDebugSessionStarted(session: vscode.DebugSession): void {
    if (session.type === 'bdd-playwright') {
      this.outputChannel.appendLine(`🚀 Debug session started: ${session.name}`);
    }
  }

  private onDebugSessionTerminated(session: vscode.DebugSession): void {
    if (session.type === 'bdd-playwright') {
      this.outputChannel.appendLine(`🛑 Debug session terminated: ${session.name}`);
    }
  }

  /**
   * Update breakpoints in editor
   */
  private updateBreakpointsInEditor(): void {
    // Implementation would sync breakpoints with VS Code editor
    // This is handled automatically by VS Code when using proper debug adapters
  }

  /**
   * Get all breakpoints
   */
  getBreakpoints(): DebugBreakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Clear all breakpoints
   */
  clearAllBreakpoints(): void {
    this.breakpoints.clear();
    this.outputChannel.appendLine('🧹 Cleared all breakpoints');
    this.emit('breakpointsChanged', []);
    this.updateBreakpointsInEditor();
  }

  /**
   * Export breakpoints configuration
   */
  exportBreakpoints(): string {
    const breakpoints = Array.from(this.breakpoints.values());
    return JSON.stringify(breakpoints, null, 2);
  }

  /**
   * Import breakpoints configuration
   */
  importBreakpoints(config: string): void {
    try {
      const breakpoints: DebugBreakpoint[] = JSON.parse(config);
      this.breakpoints.clear();
      
      breakpoints.forEach(bp => {
        this.breakpoints.set(bp.id, bp);
      });
      
      this.outputChannel.appendLine(`📥 Imported ${breakpoints.length} breakpoints`);
      this.emit('breakpointsChanged', breakpoints);
      this.updateBreakpointsInEditor();
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to import breakpoints: ${error}`);
      vscode.window.showErrorMessage('Failed to import breakpoints');
    }
  }

  private generateSessionId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Debug Configuration Provider for BDD tests
 */
class BDDDebugConfigProvider implements vscode.DebugConfigurationProvider {
  
  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    
    // If no configuration provided, create a default one
    if (!config.type && !config.request && !config.name) {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'feature') {
        config.type = 'bdd-playwright';
        config.name = 'Debug Current Feature';
        config.request = 'launch';
        config.program = '${workspaceFolder}/node_modules/.bin/playwright';
        config.args = ['test', '--debug'];
        config.cwd = '${workspaceFolder}';
        config.env = { PWDEBUG: '1' };
      }
    }

    // Ensure we have required configuration
    if (!config.program) {
      vscode.window.showErrorMessage('Debug configuration missing program path');
      return undefined;
    }

    return config;
  }
}

/**
 * Variable inspection utilities
 */
export class VariableInspector {
  private variables: Map<string, any> = new Map();

  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  getVariable(name: string): any {
    return this.variables.get(name);
  }

  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this.variables.entries());
  }

  watchVariable(name: string, callback: (value: any) => void): void {
    // Implementation for variable watching
  }

  clearVariables(): void {
    this.variables.clear();
  }
}
