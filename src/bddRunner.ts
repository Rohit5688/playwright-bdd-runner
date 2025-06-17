import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';

let currentProcess: ReturnType<typeof exec> | null = null;

export function runBDDTests(
  run?: vscode.TestRun,
  controller?: vscode.TestController,
  testItem?: vscode.TestItem,
  outputChannel?: vscode.OutputChannel
) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder open.');
    return;
  }

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const config = vscode.workspace.getConfiguration('playwrightBdd');

  const enableFeatureGen = config.get<boolean>('enableFeatureGen', true);
  const configPath = config.get<string>('configPath') || './playwright.config.ts';
  const tsconfigPath = config.get<string>('tsconfigPath') || '';
  const tags = config.get<string>('tags') || '';
  const featureFolder = config.get<string>('featureFolder', 'features');

  let featureGenCommand = config.get<string>('featureGenCommand')!;
  let testCommand = config.get<string>('testCommand')!;

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

  if (testItem?.uri?.fsPath) {
    const featureFolderPath = path.resolve(projectRoot, featureFolder);
    const relativeToFeatureFolder = path.relative(featureFolderPath, testItem.uri.fsPath);
    testCommand += ` "${relativeToFeatureFolder}"`;

    if (testItem.label && testItem.parent) {
      const grepTarget = testItem.label;
      testCommand += ` --grep "${grepTarget}"`;
    }

  }

  const runCommand = (cmd: string, label: string, onSuccess?: () => void) => {
    outputChannel?.appendLine(`Running ${label}: ${cmd}`);

    currentProcess = exec(cmd, { cwd: projectRoot }, (err, stdout, stderr) => {
      currentProcess = null;

      if (err) {
        outputChannel?.appendLine(`${label} failed:\n${stderr}`);
        run?.appendOutput(stderr);
        run?.failed(testItem ?? controller?.items.get('root')!, new vscode.TestMessage(stderr));
      } else {
        outputChannel?.appendLine(`${label} completed:\n${stdout}`);
        run?.appendOutput(stdout);
        run?.passed(testItem ?? controller?.items.get('root')!);
        if (onSuccess) {
          onSuccess();
          return; // Prevent double call to run.end()
        }
      }
      run?.end(); // Always end the run
    });
  };

  if (enableFeatureGen) {
    runCommand(featureGenCommand, 'Feature generation', () => {
      runCommand(testCommand, 'BDD test run');
    });
  } else {
    runCommand(testCommand, 'BDD test run');
  }
}

export function terminateBDDTests() {
  if (currentProcess) {
    currentProcess.kill();
    vscode.window.showInformationMessage('🛑 BDD test execution terminated.');
  } else {
    vscode.window.showInformationMessage('No BDD test is currently running.');
  }
}
