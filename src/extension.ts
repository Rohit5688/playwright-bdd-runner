import * as vscode from 'vscode';
import * as path from 'path';
import { runBDDTests, terminateBDDTests } from './bddRunner';
import { FeatureCodeLensProvider } from './featureCodeLens';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Playwright BDD extension activated');
  const controller = vscode.tests.createTestController('playwrightBdd', 'Playwright BDD Tests');
  context.subscriptions.push(controller);

  const outputChannel = vscode.window.createOutputChannel('Playwright BDD');
  context.subscriptions.push(outputChannel);

  const config = vscode.workspace.getConfiguration('playwrightBdd');
  const featureFolder = config.get<string>('featureFolder', 'features');
  const enableFeatureGen = config.get<boolean>('enableFeatureGen', false);

  const discoverFeatureTests = async () => {
    controller.items.replace([]);
    const files = await vscode.workspace.findFiles(`${featureFolder}/**/*.feature`);
    for (const file of files) {
      const content = (await vscode.workspace.fs.readFile(file)).toString();
      const lines = content.split('\n');

      // Extract the feature title from the file content
      const featureMatch = content.match(/^\s*Feature:\s*(.+)/m);
      const label = featureMatch ? featureMatch[1].trim() : path.basename(file.fsPath);

      // Use the full file path as the unique ID
      const id = file.fsPath;

      // Create the feature-level test item with the extracted label
      const testItem = controller.createTestItem(id, label, file);
      controller.items.add(testItem);

      let currentScenario: vscode.TestItem | null = null;
      let scenarioTemplate = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const scenarioMatch = line.match(/^\s*Scenario(?: Outline)?:\s*(.+)/);
        if (scenarioMatch) {
          const scenarioName = scenarioMatch[1].trim();
          const scenarioId = `${file.fsPath}::${scenarioName}`;
          const scenarioItem = controller.createTestItem(scenarioId, scenarioName, file);
          testItem.children.add(scenarioItem);
          currentScenario = scenarioItem;
          scenarioTemplate = scenarioName;
        }

        const examplesMatch = line.match(/^\s*Examples:/);
        if (examplesMatch && currentScenario) {
          let exampleIndex = 1;
          let headerSkipped = false;
          let headers: string[] = [];

          for (let j = i + 1; j < lines.length; j++) {
            const exampleLine = lines[j].trim();

            if (exampleLine.startsWith('|')) {
              const cells = exampleLine.split('|').map(v => v.trim()).filter(Boolean);

              if (!headerSkipped) {
                headers = cells;
                headerSkipped = true;
                continue;
              }

              const exampleData = Object.fromEntries(headers.map((h, idx) => [h, cells[idx]]));
              let exampleLabel = scenarioTemplate;
              for (const [key, value] of Object.entries(exampleData)) {
                exampleLabel = exampleLabel.replace(new RegExp(`<${key}>`, 'g'), value);
              }
              if (currentScenario) {
                const exampleId = `${currentScenario.id}::${exampleLabel}`;
                const exampleItem = controller.createTestItem(exampleId, exampleLabel, file);
                currentScenario.children.add(exampleItem);
              }
              exampleIndex++;
            } else if (exampleLine === '') {
              break;
            }
          }
        }
      }
    }
  };

  await discoverFeatureTests();

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.runScenarioDynamic', (grepArg: string, enableFeatureGen: boolean) => {
      const config = vscode.workspace.getConfiguration('playwrightBdd');
      const configPath = config.get<string>('configPath') || './playwright.config.ts';
      const tsconfigPath = config.get<string>('tsconfigPath') || '';
      const configPathArg = configPath;
      const tsconfigArg = tsconfigPath ? tsconfigPath : '';
      const tagsArg = grepArg ? `--grep "${grepArg}"` : '';

      let featureGenCommand = config.get<string>('featureGenCommand') || 'npx bddgen --config=${configPath}';
      let testCommand = config.get<string>('testCommand') || 'npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}';

      featureGenCommand = featureGenCommand
        .replace('${configPath}', configPathArg)
        .replace('${tsconfigArg}', tsconfigArg)
        .replace('${tagsArg}', tagsArg);

      testCommand = testCommand
        .replace('${configPath}', configPathArg)
        .replace('${tsconfigArg}', tsconfigArg)
        .replace('${tagsArg}', tagsArg);

      const terminal = vscode.window.createTerminal('Playwright BDD');
      terminal.show();

      if (enableFeatureGen) {
        terminal.sendText(`${featureGenCommand} && ${testCommand}`);
      } else {
        terminal.sendText(testCommand);
      }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.runScenario', (grepArg: string) => {
      const config = vscode.workspace.getConfiguration('playwrightBdd');
      const configPath = config.get<string>('configPath') || './playwright.config.ts';
      const tsconfigPath = config.get<string>('tsconfigPath') || '';
      const tsconfigArg = tsconfigPath ? `--project=${tsconfigPath}` : '';

      const terminal = vscode.window.createTerminal('Playwright BDD');
      terminal.show();
      terminal.sendText(`npx playwright test ${tsconfigArg} --config=${configPath} --grep "${grepArg}"`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.runScenarioWithFeatureGen', (grepArg: string) => {
      const config = vscode.workspace.getConfiguration('playwrightBdd');
      const configPath = config.get<string>('configPath') || './playwright.config.ts';
      const tsconfigPath = config.get<string>('tsconfigPath') || '';
      const tags = grepArg ? grepArg : config.get<string>('tags') || '';

      const configPathArg = configPath;
      const tsconfigArg = tsconfigPath ? tsconfigPath : '';
      const tagsArg = tags ? `--grep "${tags}"` : '';

      let featureGenCommand = config.get<string>('featureGenCommand') || 'npx bddgen --config=${configPath}';
      let testCommand = config.get<string>('testCommand') || 'npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}';

      featureGenCommand = featureGenCommand
        .replace('${configPath}', configPathArg)
        .replace('${tsconfigArg}', tsconfigArg)
        .replace('${tagsArg}', tagsArg);

      testCommand = testCommand
        .replace('${configPath}', configPathArg)
        .replace('${tsconfigArg}', tsconfigArg)
        .replace('${tagsArg}', tagsArg);

      const terminal = vscode.window.createTerminal('Playwright BDD');
      terminal.show();
      terminal.sendText(`${featureGenCommand} && ${testCommand}`);
    })
  );
  const watcher = vscode.workspace.createFileSystemWatcher(`${featureFolder}/**/*.feature`);
  watcher.onDidCreate(() => discoverFeatureTests());
  watcher.onDidChange(() => discoverFeatureTests());
  watcher.onDidDelete(() => discoverFeatureTests());
  context.subscriptions.push(watcher);

  controller.createRunProfile(
    'Run',
    vscode.TestRunProfileKind.Run,
    (request, token) => {
      const run = controller.createTestRun(request);
      outputChannel.show(true);

      if (request.include) {
        for (const test of request.include) {
          run.enqueued(test);
          run.started(test);
          runBDDTests(run, controller, test, outputChannel);
        }
      } else {
        runBDDTests(run, controller, undefined, outputChannel);
      }
    },
    true
  );
  controller.createRunProfile(
    'Debug',
    vscode.TestRunProfileKind.Debug,
    (request, token) => {
      const run = controller.createTestRun(request);
      outputChannel.show(true);

      if (request.include) {
        for (const test of request.include) {
          run.enqueued(test);
          run.started(test);
          vscode.commands.executeCommand('playwright-bdd.debugScenario', test.label);
        }
      }

      run.end();
    },
    true
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.runTests', () => {
      runBDDTests(undefined, controller, undefined, outputChannel);
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'feature', scheme: 'file' },
      new FeatureCodeLensProvider(enableFeatureGen)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.terminateTests', () => {
      terminateBDDTests();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.refreshTests', async () => {
      const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
      statusBarItem.text = '$(sync~spin) Refreshing features...';
      statusBarItem.tooltip = 'Playwright BDD is refreshing tests';
      statusBarItem.show();

      try {
        await discoverFeatureTests();
      } finally {
        setTimeout(() => {
          statusBarItem.hide();
          statusBarItem.dispose();
        }, 3000);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.debugScenario', async (grepArg: string) => {
      const config = vscode.workspace.getConfiguration('playwrightBdd');
      const configPath = config.get<string>('configPath') || './playwright.config.ts';
      const tsconfigPath = config.get<string>('tsconfigPath') || '';

      const debugConfig: vscode.DebugConfiguration = {
        type: 'pwa-node',
        request: 'launch',
        name: 'Debug Playwright BDD Scenario',
        program: '${workspaceFolder}/node_modules/.bin/playwright',
        args: [
          'test',
          tsconfigPath ? `${tsconfigPath}` : '',
          `--config=${configPath}`,
          '--debug',
          '--grep',
          grepArg
        ].filter(Boolean),
        console: 'integratedTerminal',
        internalConsoleOptions: 'neverOpen',
        cwd: '${workspaceFolder}',
        env: {
          PWDEBUG: '1'
        }
      };

      vscode.debug.startDebugging(undefined, debugConfig);
    })
  );

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.text = '$(beaker) Run BDD Tests';
  statusBarItem.command = 'playwright-bdd.runTests';
  statusBarItem.tooltip = 'Run all Playwright BDD tests';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const stopButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  stopButton.text = '$(debug-stop) Stop BDD Tests';
  stopButton.command = 'playwright-bdd.terminateTests';
  stopButton.tooltip = 'Terminate running Playwright BDD tests';
  stopButton.show();
  context.subscriptions.push(stopButton);
}