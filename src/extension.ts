import * as vscode from 'vscode';
import * as path from 'path';
import { runBDDTests, terminateBDDTests } from './bddRunner';
import { FeatureCodeLensProvider } from './featureCodeLens';
import { StepDefinitionProvider } from './stepDefinitionProvider';
import { TestDiscoveryCache } from './testCache';
import { TestSearchProvider } from './testSearchProvider';
import { BDDHoverProvider } from './hoverProvider';
import { ExecutionHistoryTracker } from './executionHistoryTracker';
import { AutoDiscoveryService } from './autoDiscovery';
import { TestQueueManager } from './queueManager';
import { StepCreationWizard } from './stepCreationWizard';
import { BDDDebuggingTools } from './debuggingTools';
import { MultiWorkspaceManager } from './multiWorkspaceManager';
import { CICDIntegration } from './cicd/cicdIntegration';
import { ReportViewer } from './cicd/reportViewer';
import { TestExplorerUI } from './testExplorerUI';
import { SettingsUI } from './settingsUI';
import { SmartCodeGenerator } from './smartCodeGenerator';

export async function activate(context: vscode.ExtensionContext) {
  const controller = vscode.tests.createTestController('playwrightBdd', 'Playwright BDD Tests');
  context.subscriptions.push(controller);

  const outputChannel = vscode.window.createOutputChannel('Playwright BDD');
  context.subscriptions.push(outputChannel);

  // Enhanced error handling wrapper
  const errorHandler = (operation: string, error: Error) => {
    const errorMessage = `[ERROR] ${operation}: ${error.message}`;
    outputChannel.appendLine(errorMessage);
    console.error(errorMessage, error);
    vscode.window.showErrorMessage(`Playwright BDD: ${operation} failed. Check output for details.`);
  };

  // Configuration validation
  const validateConfiguration = (): boolean => {
    const config = vscode.workspace.getConfiguration('playwrightBdd');
    const configPath = config.get<string>('configPath', './playwright.config.ts');
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      vscode.window.showWarningMessage('Playwright BDD: No workspace folder detected. Extension functionality may be limited.');
      return false;
    }

    const fullConfigPath = path.resolve(workspaceFolders[0].uri.fsPath, configPath);
    try {
      // Check if config file exists (basic validation)
      vscode.workspace.fs.stat(vscode.Uri.file(fullConfigPath)).then(() => {
        outputChannel.appendLine(`Configuration validated: ${configPath}`);
      }, (error) => {
        outputChannel.appendLine(`Warning: Configuration file not found at ${configPath}. Using defaults.`);
      });
    } catch (error) {
      outputChannel.appendLine(`Warning: Could not validate configuration: ${error}`);
    }

    return true;
  };

  // Validate configuration on startup
  validateConfiguration();

  const config = vscode.workspace.getConfiguration('playwrightBdd');
  const featureFolder = config.get<string>('featureFolder', 'features');
  const enableFeatureGen = config.get<boolean>('enableFeatureGen', false);

  // Initialize test discovery cache
  const testCache = new TestDiscoveryCache(outputChannel);

  // Enhanced test discovery with incremental caching and performance optimization
  const discoverFeatureTests = async (forceRefresh: boolean = false) => {
    try {
      outputChannel.appendLine('Starting test discovery...');
      const startTime = Date.now();

      controller.items.replace([]);
      const files = await vscode.workspace.findFiles(`${featureFolder}/**/*.feature`);

      if (files.length === 0) {
        outputChannel.appendLine(`No feature files found in ${featureFolder}. Check your featureFolder configuration.`);
        vscode.window.showInformationMessage(`No .feature files found in '${featureFolder}' folder.`);
        return;
      }

      outputChannel.appendLine(`Found ${files.length} feature file(s). Processing with caching...`);

      if (forceRefresh) {
        testCache.clearCache();
        outputChannel.appendLine('Cache cleared - processing all files');
      }

      // Validate and clean cache first
      await testCache.validateAndCleanCache();

      // Enhanced feature file processor with caching
      const processFeatureFileWithCache = async (file: vscode.Uri, fromCache: boolean): Promise<vscode.TestItem | null> => {
        try {
          if (fromCache) {
            const cached = testCache.getCachedFeature(file);
            if (cached) {
              const testItem = testCache.recreateTestItem(cached, controller);
              controller.items.add(testItem);
              outputChannel.appendLine(`📋 From cache: ${path.basename(file.fsPath)}`);
              return testItem;
            }
          }

          // Process file normally
          const testItem = await processFeatureFile(file, controller);

          // Update cache with newly processed item
          if (testItem) {
            const cachedItem = testCache.createCachedItem(testItem);
            await testCache.updateCache(file, cachedItem);
          }

          return testItem;
        } catch (error) {
          errorHandler(`Processing feature file ${file.fsPath}`, error as Error);
          return null;
        }
      };

      // Use incremental discovery
      const result = await testCache.incrementalDiscovery(files, processFeatureFileWithCache);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const stats = testCache.getCacheStats();

      outputChannel.appendLine(
        `✅ Discovery completed in ${duration}ms: ${result.processed} processed, ${result.fromCache} from cache`
      );
      outputChannel.appendLine(`📊 Cache stats: ${stats.totalFeatures} cached features`);

    } catch (error) {
      errorHandler('Test Discovery', error as Error);
      // Fallback: try to maintain any existing test items
      vscode.window.showErrorMessage('Failed to discover tests. Some features may not be available.');
    }
  };

  // Separate function for processing individual feature files
  const processFeatureFile = async (file: vscode.Uri, controller: vscode.TestController): Promise<vscode.TestItem | null> => {
    try {
      const content = (await vscode.workspace.fs.readFile(file)).toString();

      if (!content.trim()) {
        outputChannel.appendLine(`Warning: Empty feature file ${file.fsPath}`);
        return null;
      }

      const lines = content.split('\n');

      // Extract the feature title from the file content
      const featureMatch = content.match(/^\s*Feature:\s*(.+)/m);

      if (!featureMatch) {
        outputChannel.appendLine(`Warning: No Feature declaration found in ${file.fsPath}`);
        return null;
      }

      const label = featureMatch[1].trim();
      const id = file.fsPath;

      // Create the feature-level test item with the extracted label
      const testItem = controller.createTestItem(id, label, file);
      controller.items.add(testItem);

      let currentScenario: vscode.TestItem | null = null;
      let scenarioTemplate = '';
      let scenarioCount = 0;

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
          scenarioCount++;
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

              if (headers.length === 0) {
                outputChannel.appendLine(`Warning: No headers found for examples in ${file.fsPath} at line ${j + 1}`);
                break;
              }

              const exampleData = Object.fromEntries(headers.map((h, idx) => [h, cells[idx] || '']));
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
            } else if (exampleLine === '' || !exampleLine.startsWith('|')) {
              break;
            }
          }
        }
      }

      outputChannel.appendLine(`Processed ${path.basename(file.fsPath)}: ${scenarioCount} scenario(s)`);
      return testItem;

    } catch (error) {
      throw new Error(`Failed to process feature file: ${error}`);
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
  // Debounced file watcher to prevent excessive refreshes
  let refreshTimeout: NodeJS.Timeout | undefined;
  const debouncedRefresh = () => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    refreshTimeout = setTimeout(() => {
      outputChannel.appendLine('File change detected, refreshing tests...');
      discoverFeatureTests();
    }, 500); // 500ms debounce
  };

  const watcher = vscode.workspace.createFileSystemWatcher(`${featureFolder}/**/*.feature`);
  watcher.onDidCreate(debouncedRefresh);
  watcher.onDidChange(debouncedRefresh);
  watcher.onDidDelete(debouncedRefresh);
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
          runBDDTests(run, controller, test, outputChannel).catch(error => {
            outputChannel.appendLine(`[ERROR] Test execution failed: ${error}`);
            run.failed(test, new vscode.TestMessage(error.toString()));
          });
        }
      } else {
        runBDDTests(run, controller, undefined, outputChannel).catch(error => {
          outputChannel.appendLine(`[ERROR] Test execution failed: ${error}`);
        });
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
      runBDDTests(undefined, controller, undefined, outputChannel).catch(error => {
        outputChannel.appendLine(`[ERROR] Test execution failed: ${error}`);
        vscode.window.showErrorMessage('Test execution failed. Check the output panel for details.');
      });
    })
  );

  // Initialize Step Definition Provider
  const stepDefinitionProvider = new StepDefinitionProvider(outputChannel);

  // Initialize Test Search Provider
  const testSearchProvider = new TestSearchProvider(outputChannel);

  // Initialize Execution History Tracker
  const executionHistoryTracker = new ExecutionHistoryTracker(context, outputChannel);
  await executionHistoryTracker.initialize();

  // Initialize Hover Provider
  const hoverProvider = new BDDHoverProvider(stepDefinitionProvider, outputChannel, executionHistoryTracker);

  // Initialize Auto Discovery Service
  const autoDiscoveryService = vscode.workspace.workspaceFolders
    ? new AutoDiscoveryService(outputChannel, vscode.workspace.workspaceFolders[0].uri.fsPath)
    : null;

  // Initialize Queue Manager
  const queueManager = new TestQueueManager(outputChannel);

  // Initialize Step Creation Wizard
  const stepCreationWizard = vscode.workspace.workspaceFolders
    ? new StepCreationWizard(outputChannel, vscode.workspace.workspaceFolders[0].uri.fsPath)
    : null;

  // Initialize Debugging Tools
  const debuggingTools = vscode.workspace.workspaceFolders
    ? new BDDDebuggingTools(outputChannel, vscode.workspace.workspaceFolders[0].uri.fsPath)
    : null;

  // Initialize Multi-Workspace Manager
  const multiWorkspaceManager = new MultiWorkspaceManager(outputChannel);

  // Initialize CI/CD Integration
  const cicdIntegration = vscode.workspace.workspaceFolders
    ? new CICDIntegration(outputChannel, vscode.workspace.workspaceFolders[0].uri.fsPath)
    : null;

  // Initialize Report Viewer
  const reportViewer = vscode.workspace.workspaceFolders
    ? new ReportViewer(outputChannel, vscode.workspace.workspaceFolders[0].uri.fsPath)
    : null;

  // Initialize Enhanced Test Explorer UI
  const testExplorerUI = new TestExplorerUI(controller, outputChannel);
  testExplorerUI.registerCommands(context);
  context.subscriptions.push(testExplorerUI);

  // Debug: Log that the test explorer UI has been initialized
  outputChannel.appendLine('✅ BDD Test Explorer UI initialized with settings button support');

  // Initialize Settings UI
  const settingsUI = vscode.workspace.workspaceFolders
    ? new SettingsUI(outputChannel, vscode.workspace.workspaceFolders[0].uri.fsPath)
    : null;

  if (settingsUI) {
    context.subscriptions.push(settingsUI);
  }

  // Initialize Smart Code Generator
  const smartCodeGenerator = vscode.workspace.workspaceFolders
    ? new SmartCodeGenerator(vscode.workspace.workspaceFolders[0].uri.fsPath, outputChannel)
    : null;

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.generateInstructions', async () => {
      if (!smartCodeGenerator) {
        vscode.window.showWarningMessage('Smart Code Generator requires an open workspace.');
        return;
      }

      try {
        const filePath = await smartCodeGenerator.generateInstructions();
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('Generated BDD instructions based on project analysis.');
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Failed to generate instructions: ${error}`);
        vscode.window.showErrorMessage('Failed to generate instructions. Check output for details.');
      }
    })
  );

  // Register Generate Step Definitions command (context menu)
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.generateStepDefinitions', async () => {
      if (!stepCreationWizard) {
        vscode.window.showWarningMessage('Step Creation Wizard requires an open workspace.');
        return;
      }

      try {
        // Get the active editor to extract step text if in a feature file
        const editor = vscode.window.activeTextEditor;
        let stepText: string | undefined;

        if (editor && editor.document.fileName.endsWith('.feature')) {
          const line = editor.document.lineAt(editor.selection.active.line);
          const stepMatch = line.text.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)/);

          if (stepMatch) {
            stepText = stepMatch[2].trim();
            outputChannel.appendLine(`[Generate Step] Detected step: "${stepText}"`);
          }
        }

        // Launch the wizard with or without pre-filled step text
        await stepCreationWizard.launchWizard(stepText);
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Failed to launch step creation wizard: ${error}`);
        vscode.window.showErrorMessage('Failed to create step definition. Check output for details.');
      }
    })
  );

  // Register Generate All Step Definitions command (context menu)
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.generateAllStepDefinitions', async () => {
      if (!stepCreationWizard) {
        vscode.window.showWarningMessage('Step Creation Wizard requires an open workspace.');
        return;
      }

      try {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.fileName.endsWith('.feature')) {
          await stepCreationWizard.createStepsFromFeature(editor.document.uri);
        } else {
          vscode.window.showWarningMessage('Please open a .feature file to generate step definitions.');
        }
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Failed to generate all step definitions: ${error}`);
        vscode.window.showErrorMessage('Failed to generate step definitions. Check output for details.');
      }
    })
  );

  // All Copilot functionality has been removed from the extension
  outputChannel.appendLine('✅ BDD Test Runner initialized without AI/Copilot features');

  // Register debugging tools
  if (debuggingTools) {
    debuggingTools.register(context);
  }

  // Initialize CI/CD on startup
  if (cicdIntegration) {
    cicdIntegration.initialize().catch(error => {
      outputChannel.appendLine(`Warning: CI/CD initialization failed: ${error}`);
    });
  }

  // Auto-discover and apply configuration if enabled
  if (autoDiscoveryService && config.get<boolean>('autoDiscoverConfig', true)) {
    try {
      const discoveredConfig = await autoDiscoveryService.discoverProjectConfiguration();
      await autoDiscoveryService.applyDiscoveredConfiguration(discoveredConfig);
    } catch (error) {
      outputChannel.appendLine(`Warning: Auto-discovery failed: ${error}`);
    }
  }

  // Discover step definitions on startup
  if (vscode.workspace.workspaceFolders) {
    const stepsFolder = config.get<string>('stepsFolder', 'steps');
    await stepDefinitionProvider.discoverStepDefinitions(vscode.workspace.workspaceFolders[0].uri.fsPath, stepsFolder);
  }

  // Register language providers
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { language: 'feature', scheme: 'file' },
      stepDefinitionProvider
    )
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { language: 'feature', scheme: 'file' },
      hoverProvider
    )
  );

  // Enhanced CodeLens provider with refresh capability
  const codeLensProvider = new FeatureCodeLensProvider(enableFeatureGen);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'feature', scheme: 'file' },
      codeLensProvider
    )
  );

  // Register diagnostic provider for step validation
  context.subscriptions.push(stepDefinitionProvider);

  // Validate feature files on open and change
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      if (document.fileName.endsWith('.feature')) {
        await stepDefinitionProvider.validateFeatureFile(document);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      if (event.document.fileName.endsWith('.feature')) {
        await stepDefinitionProvider.validateFeatureFile(event.document);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.fileName.endsWith('.feature')) {
        stepDefinitionProvider.clearDiagnostics();
      }
    })
  );

  // Validate all currently open feature files
  vscode.workspace.textDocuments.forEach(async (document) => {
    if (document.fileName.endsWith('.feature')) {
      await stepDefinitionProvider.validateFeatureFile(document);
    }
  });

  // Refresh CodeLens when tests start/stop
  const refreshCodeLens = () => {
    codeLensProvider.refresh();

  };

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

  // Add step definition management commands
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.showStepDefinitions', async () => {
      const stepDefs = stepDefinitionProvider.getAllStepDefinitions();

      if (stepDefs.length === 0) {
        vscode.window.showInformationMessage('No step definitions found. Make sure your steps folder contains step definition files.');
        return;
      }

      const items = stepDefs.map(step => ({
        label: `${step.type}: ${step.pattern}`,
        description: `${path.basename(step.file)}:${step.line}`,
        detail: step.function,
        step: step
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `${stepDefs.length} step definitions found`,
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (selected) {
        const uri = vscode.Uri.file(selected.step.file);
        const position = new vscode.Position(selected.step.line - 1, 0);
        await vscode.window.showTextDocument(uri, { selection: new vscode.Range(position, position) });
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.validateStepCoverage', async () => {
      const activeEditor = vscode.window.activeTextEditor;

      if (!activeEditor || !activeEditor.document.fileName.endsWith('.feature')) {
        vscode.window.showWarningMessage('Please open a .feature file to validate step coverage.');
        return;
      }

      const coverage = stepDefinitionProvider.getStepCoverageForFeature(activeEditor.document.fileName);

      outputChannel.appendLine(`\n=== Step Coverage Analysis ===`);
      outputChannel.appendLine(`Feature: ${path.basename(activeEditor.document.fileName)}`);
      outputChannel.appendLine(`Coverage: ${coverage.covered}/${coverage.total} steps (${Math.round((coverage.covered / coverage.total) * 100)}%)`);

      if (coverage.missing.length > 0) {
        outputChannel.appendLine(`\nMissing step definitions:`);
        coverage.missing.forEach(step => {
          outputChannel.appendLine(`  ❌ ${step}`);
        });
      } else {
        outputChannel.appendLine(`\n✅ All steps have matching definitions!`);
      }

      outputChannel.show();

      const message = coverage.missing.length > 0
        ? `${coverage.missing.length} steps need definitions (${Math.round((coverage.covered / coverage.total) * 100)}% coverage)`
        : `All ${coverage.total} steps have definitions! ✅`;

      vscode.window.showInformationMessage(message);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.refreshStepDefinitions', async () => {
      if (vscode.workspace.workspaceFolders) {
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.text = '$(sync~spin) Refreshing step definitions...';
        statusBarItem.show();

        try {
          await stepDefinitionProvider.discoverStepDefinitions(vscode.workspace.workspaceFolders[0].uri.fsPath);
          const stepCount = stepDefinitionProvider.getAllStepDefinitions().length;
          vscode.window.showInformationMessage(`Found ${stepCount} step definitions`);
        } finally {
          setTimeout(() => {
            statusBarItem.hide();
            statusBarItem.dispose();
          }, 2000);
        }
      }
    })
  );

  // Add advanced search commands
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.searchTests', async () => {
      const searchQuery = await vscode.window.showInputBox({
        placeHolder: 'Search tests... (e.g., "login", "tag:smoke", "feature:auth scenario:success")',
        prompt: 'Enter search query or use advanced filters: tag:name feature:name scenario:name step:text file:pattern'
      });

      if (!searchQuery) {
        return;
      }

      try {
        // Parse advanced filters from query
        const filters = testSearchProvider.buildAdvancedFilter(searchQuery);
        const cleanQuery = searchQuery.replace(/\w+:[^\s]+/g, '').trim();

        const results = await testSearchProvider.searchTests(controller, cleanQuery, filters);

        if (results.length === 0) {
          vscode.window.showInformationMessage(`No tests found for: "${searchQuery}"`);
          return;
        }

        const items = results.map(result => ({
          label: `${result.matchType.toUpperCase()}: ${result.matchText}`,
          description: path.basename(result.filePath),
          detail: result.line ? `Line ${result.line}` : '',
          result: result
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: `${results.length} matches found`,
          matchOnDescription: true
        });

        if (selected) {
          const uri = vscode.Uri.file(selected.result.filePath);
          const position = selected.result.line
            ? new vscode.Position(selected.result.line - 1, 0)
            : new vscode.Position(0, 0);

          await vscode.window.showTextDocument(uri, {
            selection: new vscode.Range(position, position)
          });
        }
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Search failed: ${error}`);
        vscode.window.showErrorMessage('Search failed. Check output for details.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.exportSearchResults', async () => {
      const searchQuery = await vscode.window.showInputBox({
        placeHolder: 'Search query to export results for...',
        prompt: 'Enter search query to export results'
      });

      if (!searchQuery) {
        return;
      }

      try {
        const filters = testSearchProvider.buildAdvancedFilter(searchQuery);
        const cleanQuery = searchQuery.replace(/\w+:[^\s]+/g, '').trim();

        const results = await testSearchProvider.searchTests(controller, cleanQuery, filters);
        const report = testSearchProvider.exportSearchResults(results);

        const doc = await vscode.workspace.openTextDocument({
          content: report,
          language: 'markdown'
        });

        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`Exported ${results.length} search results`);
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Export failed: ${error}`);
        vscode.window.showErrorMessage('Export failed. Check output for details.');
      }
    })
  );

  // Add auto-discovery commands
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.autoDiscoverConfig', async () => {
      if (!autoDiscoveryService) {
        vscode.window.showWarningMessage('Auto-discovery requires an open workspace.');
        return;
      }

      try {
        const config = await autoDiscoveryService.discoverProjectConfiguration();
        await autoDiscoveryService.applyDiscoveredConfiguration(config);
        vscode.window.showInformationMessage('Configuration auto-discovery completed!');
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Auto-discovery failed: ${error}`);
        vscode.window.showErrorMessage(`Auto-discovery failed: ${error}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.validateConfiguration', async () => {
      if (!autoDiscoveryService) {
        vscode.window.showWarningMessage('Configuration validation requires an open workspace.');
        return;
      }

      try {
        const validation = await autoDiscoveryService.validateConfiguration();

        if (validation.valid) {
          vscode.window.showInformationMessage('✅ Configuration is valid!');
        } else {
          outputChannel.appendLine('\n❌ Configuration validation failed:');
          validation.issues.forEach(issue => {
            outputChannel.appendLine(`  - ${issue}`);
          });
          outputChannel.show();

          vscode.window.showWarningMessage(
            `Configuration has ${validation.issues.length} issues. Check output for details.`
          );
        }
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Configuration validation failed: ${error}`);
        vscode.window.showErrorMessage(`Validation failed: ${error}`);
      }
    })
  );

  // Add step creation commands
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.createStepDefinition', async () => {
      if (!stepCreationWizard) {
        vscode.window.showWarningMessage('Step creation requires an open workspace.');
        return;
      }

      await stepCreationWizard.launchWizard();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.launchStepWizard', async () => {
      if (!stepCreationWizard) {
        vscode.window.showWarningMessage('Step creation requires an open workspace.');
        return;
      }

      await stepCreationWizard.launchWizard();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.createStepsFromFeature', async (uri?: vscode.Uri) => {
      if (!stepCreationWizard) {
        vscode.window.showWarningMessage('Step creation requires an open workspace.');
        return;
      }

      let featureUri = uri;

      if (!featureUri) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.endsWith('.feature')) {
          featureUri = activeEditor.document.uri;
        } else {
          vscode.window.showWarningMessage('Please open a .feature file or use this command from the file explorer.');
          return;
        }
      }

      await stepCreationWizard.createStepsFromFeature(featureUri);
    })
  );

  // Add queue management commands
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.showQueueStatus', async () => {
      const progress = queueManager.getProgress();
      const stats = queueManager.getStatistics();

      const message = progress.total > 0
        ? `Queue: ${progress.completed}/${progress.total} completed (${progress.percentage.toFixed(1)}%)`
        : 'Queue is empty';

      const actions = [];
      if (progress.running > 0) {
        actions.push('Pause', 'Cancel All');
      }
      if (progress.failed > 0) {
        actions.push('Retry Failed');
      }
      if (progress.completed > 0) {
        actions.push('Clear Completed', 'Export Results');
      }
      actions.push('Show Details');

      if (actions.length === 0) {
        vscode.window.showInformationMessage(message);
        return;
      }

      const selected = await vscode.window.showInformationMessage(message, ...actions);

      switch (selected) {
        case 'Pause':
          queueManager.pause();
          break;
        case 'Cancel All':
          queueManager.cancelAll();
          break;
        case 'Retry Failed':
          queueManager.retryFailed();
          break;
        case 'Clear Completed':
          queueManager.clearCompleted();
          break;
        case 'Export Results':
          const report = queueManager.exportResults();
          const doc = await vscode.workspace.openTextDocument({
            content: report,
            language: 'markdown'
          });
          await vscode.window.showTextDocument(doc);
          break;
        case 'Show Details':
          outputChannel.appendLine('\n📊 Queue Statistics:');
          outputChannel.appendLine(`Total Executed: ${stats.totalExecuted}`);
          outputChannel.appendLine(`Success Rate: ${stats.successRate.toFixed(2)}%`);
          outputChannel.appendLine(`Average Duration: ${stats.averageDuration.toFixed(0)}ms`);
          outputChannel.appendLine(`Progress: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(1)}%)`);
          outputChannel.show();
          break;
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.runTestsWithQueue', async () => {
      // Build queue from test controller items
      const queueItems: any[] = [];

      controller.items.forEach(item => {
        // Add feature-level items
        queueItems.push({
          type: 'feature',
          name: item.label,
          command: `npx playwright test --grep "${item.label}"`,
          testItem: item,
          priority: 1
        });

        // Add scenario-level items
        item.children.forEach(scenario => {
          queueItems.push({
            type: 'scenario',
            name: scenario.label,
            command: `npx playwright test --grep "${scenario.label}"`,
            testItem: scenario,
            priority: 2
          });
        });
      });

      if (queueItems.length === 0) {
        vscode.window.showInformationMessage('No tests found to queue.');
        return;
      }

      queueManager.addToQueue(queueItems);

      // Start with progress dialog
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Running Tests with Queue',
        cancellable: true
      }, async (progress, token) => {
        await queueManager.startWithProgress(progress, token);
      });
    })
  );

  // Add debugging commands
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.startStepByStepDebugging', async () => {
      if (!debuggingTools) {
        vscode.window.showWarningMessage('Debugging requires an open workspace.');
        return;
      }

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document.fileName.endsWith('.feature')) {
        vscode.window.showWarningMessage('Please open a .feature file to debug.');
        return;
      }

      // Extract scenario name from current line or ask user
      const currentLine = activeEditor.selection.active.line;
      const document = activeEditor.document;
      let scenarioName = '';

      // Look for scenario on current line or nearby
      for (let i = Math.max(0, currentLine - 5); i <= Math.min(document.lineCount - 1, currentLine + 5); i++) {
        const line = document.lineAt(i).text;
        const match = line.match(/^\s*Scenario(?:\s+Outline)?:\s*(.+)$/);
        if (match) {
          scenarioName = match[1].trim();
          break;
        }
      }

      if (!scenarioName) {
        scenarioName = await vscode.window.showInputBox({
          prompt: 'Enter scenario name to debug',
          placeHolder: 'Scenario name...'
        }) || '';
      }

      if (scenarioName) {
        await debuggingTools.startStepByStepDebugging(activeEditor.document.fileName, scenarioName);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.toggleBreakpoint', async () => {
      if (!debuggingTools) {
        vscode.window.showWarningMessage('Debugging requires an open workspace.');
        return;
      }

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document.fileName.endsWith('.feature')) {
        vscode.window.showWarningMessage('Please open a .feature file to set breakpoints.');
        return;
      }

      const line = activeEditor.selection.active.line;
      const lineText = activeEditor.document.lineAt(line).text.trim();

      // Check if this is a step line
      const stepMatch = lineText.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        const stepText = stepMatch[2];
        await debuggingTools.toggleBreakpoint(activeEditor.document.fileName, line + 1, stepText);
      } else {
        vscode.window.showWarningMessage('Breakpoints can only be set on step lines (Given/When/Then/And/But).');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.setConditionalBreakpoint', async () => {
      if (!debuggingTools) {
        vscode.window.showWarningMessage('Debugging requires an open workspace.');
        return;
      }

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document.fileName.endsWith('.feature')) {
        vscode.window.showWarningMessage('Please open a .feature file to set breakpoints.');
        return;
      }

      const line = activeEditor.selection.active.line;
      const lineText = activeEditor.document.lineAt(line).text.trim();

      const stepMatch = lineText.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      if (!stepMatch) {
        vscode.window.showWarningMessage('Breakpoints can only be set on step lines.');
        return;
      }

      const condition = await vscode.window.showInputBox({
        prompt: 'Enter breakpoint condition (e.g., variable === "value")',
        placeHolder: 'Condition expression...'
      });

      if (condition) {
        const stepText = stepMatch[2];
        await debuggingTools.setConditionalBreakpoint(activeEditor.document.fileName, line + 1, stepText, condition);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.clearAllBreakpoints', async () => {
      if (!debuggingTools) {
        vscode.window.showWarningMessage('Debugging requires an open workspace.');
        return;
      }

      const result = await vscode.window.showWarningMessage(
        'Clear all BDD breakpoints?',
        'Clear All',
        'Cancel'
      );

      if (result === 'Clear All') {
        debuggingTools.clearAllBreakpoints();
        vscode.window.showInformationMessage('All BDD breakpoints cleared.');
      }
    })
  );

  // Add multi-workspace commands
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.showWorkspaces', async () => {
      const workspaces = multiWorkspaceManager.getAllWorkspaces();

      if (workspaces.length === 0) {
        vscode.window.showInformationMessage('No workspaces found.');
        return;
      }

      const items = workspaces.map(ws => ({
        label: ws.isActive ? `$(folder-active) ${ws.name}` : ws.name,
        description: `${ws.featureCount} features, ${ws.stepCount} steps`,
        detail: ws.rootPath,
        workspace: ws
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `${workspaces.length} workspaces found`,
        matchOnDescription: true
      });

      if (selected) {
        const actions = await vscode.window.showQuickPick([
          { label: '🎯 Set as Active', action: 'activate' },
          { label: '📊 Show Analytics', action: 'analytics' },
          { label: '🔍 Search in Workspace', action: 'search' },
          { label: '▶️ Run Tests', action: 'run' }
        ], {
          placeHolder: `Actions for ${selected.workspace.name}`
        });

        switch (actions?.action) {
          case 'activate':
            await multiWorkspaceManager.setActiveWorkspace(selected.workspace.id);
            vscode.window.showInformationMessage(`Active workspace: ${selected.workspace.name}`);
            break;
          case 'analytics':
            vscode.commands.executeCommand('playwright-bdd.workspaceAnalytics');
            break;
          case 'search':
            vscode.commands.executeCommand('playwright-bdd.searchAcrossWorkspaces');
            break;
          case 'run':
            await multiWorkspaceManager.runTestsAcrossWorkspaces([selected.workspace.id]);
            break;
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.switchWorkspace', async () => {
      const workspaces = multiWorkspaceManager.getAllWorkspaces();

      if (workspaces.length <= 1) {
        vscode.window.showInformationMessage('Only one workspace available.');
        return;
      }

      const items = workspaces
        .filter(ws => !ws.isActive)
        .map(ws => ({
          label: ws.name,
          description: `${ws.featureCount} features, ${ws.stepCount} steps`,
          detail: ws.rootPath,
          workspace: ws
        }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select workspace to activate'
      });

      if (selected) {
        await multiWorkspaceManager.setActiveWorkspace(selected.workspace.id);
        vscode.window.showInformationMessage(`Switched to workspace: ${selected.workspace.name}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.searchAcrossWorkspaces', async () => {
      const searchQuery = await vscode.window.showInputBox({
        prompt: 'Search across all workspaces',
        placeHolder: 'Enter search query...'
      });

      if (!searchQuery) return;

      try {
        const results = await multiWorkspaceManager.searchAcrossWorkspaces(searchQuery);

        if (results.length === 0) {
          vscode.window.showInformationMessage(`No results found for: "${searchQuery}"`);
          return;
        }

        const items = results.map(result => ({
          label: `${result.matchType.toUpperCase()}: ${result.matchText}`,
          description: `${result.workspaceName} - ${path.basename(result.filePath)}`,
          detail: result.line ? `Line ${result.line}` : '',
          result: result
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: `${results.length} results found across workspaces`
        });

        if (selected) {
          const uri = vscode.Uri.file(selected.result.filePath);
          const position = selected.result.line
            ? new vscode.Position(selected.result.line - 1, 0)
            : new vscode.Position(0, 0);

          await vscode.window.showTextDocument(uri, {
            selection: new vscode.Range(position, position)
          });
        }
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Cross-workspace search failed: ${error}`);
        vscode.window.showErrorMessage('Cross-workspace search failed. Check output for details.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.runTestsAcrossWorkspaces', async () => {
      const workspaces = multiWorkspaceManager.getAllWorkspaces();

      if (workspaces.length === 0) {
        vscode.window.showInformationMessage('No workspaces available.');
        return;
      }

      const selectedWorkspaces = await vscode.window.showQuickPick(
        workspaces.map(ws => ({
          label: ws.name,
          description: `${ws.featureCount} features`,
          picked: ws.isActive,
          workspace: ws
        })),
        {
          placeHolder: 'Select workspaces to run tests in',
          canPickMany: true
        }
      );

      if (!selectedWorkspaces || selectedWorkspaces.length === 0) {
        return;
      }

      const workspaceIds = selectedWorkspaces.map(item => item.workspace.id);

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Running Tests Across Workspaces',
        cancellable: true
      }, async (progress, token) => {
        try {
          const results = await multiWorkspaceManager.runTestsAcrossWorkspaces(workspaceIds, {
            parallel: true
          });

          outputChannel.appendLine('\n🏢 Cross-Workspace Test Results:');
          results.forEach((result, workspaceId) => {
            const workspace = workspaces.find(ws => ws.id === workspaceId);
            outputChannel.appendLine(`  ${workspace?.name}: ${result.success ? '✅' : '❌'}`);
          });
          outputChannel.show();

        } catch (error) {
          outputChannel.appendLine(`[ERROR] Cross-workspace test execution failed: ${error}`);
          vscode.window.showErrorMessage('Cross-workspace test execution failed.');
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.createWorkspaceGroup', async () => {
      const workspaces = multiWorkspaceManager.getAllWorkspaces();

      if (workspaces.length < 2) {
        vscode.window.showInformationMessage('At least 2 workspaces are required to create a group.');
        return;
      }

      const groupName = await vscode.window.showInputBox({
        prompt: 'Enter group name',
        placeHolder: 'e.g., Frontend Projects'
      });

      if (!groupName) return;

      const selectedWorkspaces = await vscode.window.showQuickPick(
        workspaces.map(ws => ({
          label: ws.name,
          description: ws.rootPath,
          workspace: ws
        })),
        {
          placeHolder: 'Select workspaces for this group',
          canPickMany: true
        }
      );

      if (!selectedWorkspaces || selectedWorkspaces.length === 0) {
        return;
      }

      const workspaceIds = selectedWorkspaces.map(item => item.workspace.id);
      const groupId = multiWorkspaceManager.createWorkspaceGroup(groupName, workspaceIds);

      vscode.window.showInformationMessage(`Created workspace group: ${groupName} with ${workspaceIds.length} workspaces`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.workspaceAnalytics', async () => {
      const analytics = multiWorkspaceManager.generateAnalytics();

      outputChannel.appendLine('\n📊 Workspace Analytics:');
      outputChannel.appendLine(`Total Workspaces: ${analytics.totalWorkspaces}`);
      outputChannel.appendLine(`Total Features: ${analytics.totalFeatures}`);
      outputChannel.appendLine(`Total Steps: ${analytics.totalSteps}`);
      outputChannel.appendLine('\nWorkspaces by Size:');

      analytics.workspacesBySize.forEach((ws, index) => {
        outputChannel.appendLine(`  ${index + 1}. ${ws.name}: ${ws.features} features, ${ws.steps} steps`);
      });

      outputChannel.appendLine('\nRecently Used:');
      analytics.recentlyUsed.forEach((ws, index) => {
        outputChannel.appendLine(`  ${index + 1}. ${ws.name} (${ws.lastAccessed.toLocaleDateString()})`);
      });

      outputChannel.show();

      const actions = await vscode.window.showQuickPick([
        { label: '📋 Export Analytics', action: 'export' },
        { label: '📊 Show Groups', action: 'groups' }
      ], {
        placeHolder: 'Analytics Actions'
      });

      switch (actions?.action) {
        case 'export':
          const report = multiWorkspaceManager.exportWorkspaceConfiguration();
          const doc = await vscode.workspace.openTextDocument({
            content: report,
            language: 'json'
          });
          await vscode.window.showTextDocument(doc);
          break;
        case 'groups':
          const groups = multiWorkspaceManager.getWorkspaceGroups();
          if (groups.length === 0) {
            vscode.window.showInformationMessage('No workspace groups found.');
          } else {
            outputChannel.appendLine('\n📂 Workspace Groups:');
            groups.forEach(group => {
              outputChannel.appendLine(`  ${group.name}: ${group.workspaces.length} workspaces`);
            });
          }
          break;
      }
    })
  );

  // Add CI/CD integration commands
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.setupCICD', async () => {
      if (!cicdIntegration) {
        vscode.window.showWarningMessage('CI/CD integration requires an open workspace.');
        return;
      }

      await cicdIntegration.setupIntegration();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.manageWorkflows', async () => {
      if (!cicdIntegration) {
        vscode.window.showWarningMessage('CI/CD integration requires an open workspace.');
        return;
      }

      await cicdIntegration.manageWorkflows();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.showReports', async () => {
      if (!reportViewer) {
        vscode.window.showWarningMessage('Report viewer requires an open workspace.');
        return;
      }

      await reportViewer.showReports();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.cicdStatus', async () => {
      if (!cicdIntegration) {
        vscode.window.showWarningMessage('CI/CD integration requires an open workspace.');
        return;
      }

      const status = await cicdIntegration.getStatus();

      const message = `CI/CD Status:
• Initialized: ${status.initialized ? '✅' : '❌'}
• GitHub Actions: ${status.hasWorkflows ? '✅' : '❌'}
• BDD Tests: ${status.hasBDDTests ? '✅' : '❌'}
• Integration: ${status.integrationEnabled ? '✅ Enabled' : '❌ Disabled'}`;

      const actions = [];
      if (!status.integrationEnabled) {
        actions.push('Setup Integration');
      }
      if (status.hasWorkflows) {
        actions.push('Manage Workflows');
      }
      actions.push('View Reports', 'Refresh Status');

      const selected = await vscode.window.showInformationMessage(message, ...actions);

      switch (selected) {
        case 'Setup Integration':
          vscode.commands.executeCommand('playwright-bdd.setupCICD');
          break;
        case 'Manage Workflows':
          vscode.commands.executeCommand('playwright-bdd.manageWorkflows');
          break;
        case 'View Reports':
          vscode.commands.executeCommand('playwright-bdd.showReports');
          break;
        case 'Refresh Status':
          await cicdIntegration.refresh();
          vscode.commands.executeCommand('playwright-bdd.cicdStatus');
          break;
      }
    })
  );

  // Add settings command
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.showSettings', async () => {
      if (!settingsUI) {
        vscode.window.showWarningMessage('Settings UI requires an open workspace.');
        return;
      }

      await settingsUI.showSettingsUI();
    })
  );

  // Add GitHub workflow trigger commands
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.triggerGitHubWorkflow', async () => {
      if (!cicdIntegration) {
        vscode.window.showWarningMessage('GitHub workflow triggering requires an open workspace.');
        return;
      }

      try {
        // Initialize CI/CD if not already done
        const status = await cicdIntegration.getStatus();
        if (!status.initialized || !status.hasWorkflows) {
          const result = await vscode.window.showInformationMessage(
            'No GitHub workflows detected. Would you like to set up CI/CD integration?',
            'Setup CI/CD',
            'Cancel'
          );

          if (result === 'Setup CI/CD') {
            await cicdIntegration.setupIntegration();
            return;
          } else {
            return;
          }
        }

        // Show workflow management to trigger workflows
        await cicdIntegration.manageWorkflows();

      } catch (error) {
        outputChannel.appendLine(`[ERROR] GitHub workflow trigger failed: ${error}`);
        vscode.window.showErrorMessage('Failed to trigger GitHub workflow. Check output for details.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.viewWorkflowStatus', async () => {
      if (!cicdIntegration) {
        vscode.window.showWarningMessage('GitHub workflow status requires an open workspace.');
        return;
      }

      try {
        // Get workflows and show status
        await cicdIntegration.manageWorkflows();

      } catch (error) {
        outputChannel.appendLine(`[ERROR] Failed to view workflow status: ${error}`);
        vscode.window.showErrorMessage('Failed to view workflow status. Check output for details.');
      }
    })
  );

  // Add command to show execution history
  context.subscriptions.push(
    vscode.commands.registerCommand('playwright-bdd.showExecutionHistory', async () => {
      const { getExecutionHistory, clearExecutionHistory } = await import('./bddRunner');
      const history = getExecutionHistory();

      if (history.length === 0) {
        vscode.window.showInformationMessage('No test execution history available.');
        return;
      }

      const items = history
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .map(h => ({
          label: `${h.success ? '✅' : '❌'} ${h.command}`,
          description: `${h.duration}ms`,
          detail: `${h.timestamp.toLocaleString()}`,
          history: h
        }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Recent test executions (most recent first)',
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (selected) {
        const actions = await vscode.window.showQuickPick([
          { label: '📋 Copy Command', action: 'copy' },
          { label: '🗑️ Clear History', action: 'clear' },
          { label: '📊 Show Details', action: 'details' }
        ], {
          placeHolder: 'Choose an action'
        });

        if (actions?.action === 'copy') {
          await vscode.env.clipboard.writeText(selected.history.command);
          vscode.window.showInformationMessage('Command copied to clipboard');
        } else if (actions?.action === 'clear') {
          clearExecutionHistory();
          vscode.window.showInformationMessage('Execution history cleared');
        } else if (actions?.action === 'details') {
          outputChannel.appendLine(`\n=== Execution Details ===`);
          outputChannel.appendLine(`Command: ${selected.history.command}`);
          outputChannel.appendLine(`Success: ${selected.history.success}`);
          outputChannel.appendLine(`Duration: ${selected.history.duration}ms`);
          outputChannel.appendLine(`Timestamp: ${selected.history.timestamp.toLocaleString()}`);
          outputChannel.show();
        }
      }
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
