import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';

let currentProcess: ReturnType<typeof exec> | null = null;
let processHistory: Array<{ timestamp: Date; command: string; success: boolean; duration: number }> = [];

// Retry configuration
interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'socket hang up',
    'network timeout',
    'connection refused',
    'EPIPE'
  ]
};

// Enhanced retry mechanism for flaky operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'operation',
  outputChannel?: vscode.OutputChannel
): Promise<T> {
  const finalConfig = { ...defaultRetryConfig, ...config };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      outputChannel?.appendLine(`🔄 ${operationName} - Attempt ${attempt}/${finalConfig.maxAttempts}`);
      const result = await operation();
      
      if (attempt > 1) {
        outputChannel?.appendLine(`✅ ${operationName} succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      const isRetryable = finalConfig.retryableErrors.some(retryableError => 
        lastError!.message.toLowerCase().includes(retryableError.toLowerCase())
      );
      
      if (attempt === finalConfig.maxAttempts || !isRetryable) {
        outputChannel?.appendLine(`❌ ${operationName} failed permanently: ${lastError.message}`);
        throw lastError;
      }
      
      const delay = finalConfig.delayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
      outputChannel?.appendLine(`⚠️ ${operationName} failed (attempt ${attempt}): ${lastError.message}. Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error(`${operationName} failed after ${finalConfig.maxAttempts} attempts`);
}

export async function runBDDTests(
  run?: vscode.TestRun,
  controller?: vscode.TestController,
  testItem?: vscode.TestItem,
  outputChannel?: vscode.OutputChannel
) {
  // Enhanced error handling and validation
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    const errorMsg = 'No workspace folder open. Cannot execute BDD tests.';
    vscode.window.showErrorMessage(errorMsg);
    outputChannel?.appendLine(`[ERROR] ${errorMsg}`);
    run?.end();
    return;
  }

  if (currentProcess) {
    const warningMsg = 'Another BDD test is already running. Please wait or terminate it first.';
    vscode.window.showWarningMessage(warningMsg);
    outputChannel?.appendLine(`[WARNING] ${warningMsg}`);
    return;
  }

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const config = vscode.workspace.getConfiguration('playwrightBdd');

  try {
    const enableFeatureGen = config.get<boolean>('enableFeatureGen', true);
    const configPath = config.get<string>('configPath') || './playwright.config.ts';
    const tsconfigPath = config.get<string>('tsconfigPath') || '';
    const tags = config.get<string>('tags') || '';
    const featureFolder = config.get<string>('featureFolder', 'features');

    // Validate configuration paths
    const fullConfigPath = path.resolve(projectRoot, configPath);
    outputChannel?.appendLine(`Using config: ${fullConfigPath}`);

    let featureGenCommand = config.get<string>('featureGenCommand') || 'npx bddgen --config=${configPath}';
    let testCommand = config.get<string>('testCommand') || 'npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}';

    const configPathArg = configPath;
    const tsconfigArg = tsconfigPath ? `${tsconfigPath}` : '';
    const tagsArg = tags ? `--grep "${tags}"` : '';

    featureGenCommand = featureGenCommand
      .replace('${configPath}', configPathArg)
      .replace('${tsconfigArg}', tsconfigArg)
      .replace('${tagsArg}', tagsArg);

    testCommand = testCommand
      .replace('${configPath}', configPathArg)
      .replace('${tsconfigArg}', tsconfigArg)
      .replace('${tagsArg}', tagsArg);

    // Handle specific test item execution
    if (testItem?.uri?.fsPath) {
      const featureFolderPath = path.resolve(projectRoot, featureFolder);
      const relativeToFeatureFolder = path.relative(featureFolderPath, testItem.uri.fsPath);
      testCommand += ` "${relativeToFeatureFolder}"`;

      if (testItem.label && testItem.parent) {
        const grepTarget = testItem.label;
        testCommand += ` --grep "${grepTarget}"`;
        outputChannel?.appendLine(`Targeting specific test: ${grepTarget}`);
      }
    }

    // Enhanced command execution with retry mechanism and better error handling
    const runCommand = async (cmd: string, label: string, onSuccess?: () => void) => {
      const startTime = Date.now();
      outputChannel?.appendLine(`[${new Date().toISOString()}] Running ${label}: ${cmd}`);
      
      // Show progress in status bar
      const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
      statusBarItem.text = `$(sync~spin) ${label}...`;
      statusBarItem.show();

      // Use retry mechanism for flaky operations
      const executeCommand = () => new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        currentProcess = exec(
          cmd, 
          { 
            cwd: projectRoot,
            timeout: 300000, // 5 minute timeout
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
          }, 
          (err, stdout, stderr) => {
            currentProcess = null;
            if (err) {
              reject(err);
            } else {
              resolve({ stdout: stdout || '', stderr: stderr || '' });
            }
          }
        );

        // Handle process errors
        currentProcess.on('error', (error) => {
          outputChannel?.appendLine(`[ERROR] Process error: ${error.message}`);
          reject(error);
        });
      });

      try {
        // Get configurable retry settings
        const retryCount = config.get<number>('execution.retryCount', 2);
        const retryDelay = config.get<number>('execution.retryDelay', 2000);
        
        const result = await retryOperation(
          executeCommand,
          { maxAttempts: retryCount, delayMs: retryDelay },
          label,
          outputChannel
        );

        const duration = Date.now() - startTime;
        statusBarItem.hide();
        statusBarItem.dispose();

        // Log execution history
        processHistory.push({
          timestamp: new Date(),
          command: cmd,
          success: true,
          duration
        });

        // Keep only last 20 executions
        if (processHistory.length > 20) {
          processHistory = processHistory.slice(-20);
        }

        const successMsg = `${label} completed successfully in ${duration}ms`;
        outputChannel?.appendLine(`[SUCCESS] ${successMsg}`);
        
        if (result.stdout) {
          run?.appendOutput(result.stdout);
        }
        
        if (testItem) {
          run?.passed(testItem);
        }
        
        if (onSuccess) {
          onSuccess();
          return;
        }

        run?.end();

      } catch (err: any) {
        const duration = Date.now() - startTime;
        statusBarItem.hide();
        statusBarItem.dispose();

        // Log execution history
        processHistory.push({
          timestamp: new Date(),
          command: cmd,
          success: false,
          duration
        });

        // Keep only last 20 executions
        if (processHistory.length > 20) {
          processHistory = processHistory.slice(-20);
        }

        const errorOutput = err.stderr || err.message;
        const errorMsg = `${label} failed after ${duration}ms:\n${errorOutput}`;
        outputChannel?.appendLine(`[ERROR] ${errorMsg}`);
        run?.appendOutput(errorOutput);
        
        if (testItem) {
          const testMessage = new vscode.TestMessage(errorOutput);
          testMessage.location = testItem.uri ? new vscode.Location(testItem.uri, new vscode.Position(0, 0)) : undefined;
          run?.failed(testItem, testMessage);
        }

        // Show user-friendly error message
        if (err.message.includes('ENOENT') || err.message.includes('command not found')) {
          vscode.window.showErrorMessage(`${label} failed: Command not found. Make sure Playwright and playwright-bdd are installed.`);
        } else if (err.message.includes('timeout')) {
          vscode.window.showErrorMessage(`${label} timed out after ${Math.round(duration / 1000)}s. Consider increasing the timeout.`);
        } else {
          vscode.window.showErrorMessage(`${label} failed. Check the output panel for details.`);
        }

        run?.end();
      }
    };

    if (enableFeatureGen) {
      await runCommand(featureGenCommand, 'Feature generation');
      await runCommand(testCommand, 'BDD test run');
    } else {
      await runCommand(testCommand, 'BDD test run');
    }

  } catch (error) {
    const errorMsg = `Failed to setup BDD test execution: ${error}`;
    outputChannel?.appendLine(`[ERROR] ${errorMsg}`);
    vscode.window.showErrorMessage(errorMsg);
    run?.end();
  }
}

export function terminateBDDTests() {
  if (currentProcess) {
    try {
      currentProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if process doesn't terminate gracefully
      setTimeout(() => {
        if (currentProcess) {
          currentProcess.kill('SIGKILL');
          currentProcess = null;
        }
      }, 5000);
      
      vscode.window.showInformationMessage('🛑 BDD test execution terminated.');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to terminate BDD test: ${error}`);
    }
  } else {
    vscode.window.showInformationMessage('No BDD test is currently running.');
  }
}

// Function to get execution history for debugging/monitoring
export function getExecutionHistory() {
  return processHistory.slice(); // Return a copy
}

// Function to clear execution history
export function clearExecutionHistory() {
  processHistory = [];
}

// Function to check if a test is currently running
export function isTestRunning() {
  return currentProcess !== null;
}
