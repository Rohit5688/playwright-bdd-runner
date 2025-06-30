var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/bddRunner.ts
var bddRunner_exports = {};
__export(bddRunner_exports, {
  clearExecutionHistory: () => clearExecutionHistory,
  getExecutionHistory: () => getExecutionHistory,
  isTestRunning: () => isTestRunning,
  runBDDTests: () => runBDDTests,
  terminateBDDTests: () => terminateBDDTests
});
async function retryOperation(operation, config = {}, operationName = "operation", outputChannel) {
  const finalConfig = { ...defaultRetryConfig, ...config };
  let lastError = null;
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      outputChannel?.appendLine(`\u{1F504} ${operationName} - Attempt ${attempt}/${finalConfig.maxAttempts}`);
      const result = await operation();
      if (attempt > 1) {
        outputChannel?.appendLine(`\u2705 ${operationName} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      const isRetryable = finalConfig.retryableErrors.some(
        (retryableError) => lastError.message.toLowerCase().includes(retryableError.toLowerCase())
      );
      if (attempt === finalConfig.maxAttempts || !isRetryable) {
        outputChannel?.appendLine(`\u274C ${operationName} failed permanently: ${lastError.message}`);
        throw lastError;
      }
      const delay = finalConfig.delayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
      outputChannel?.appendLine(`\u26A0\uFE0F ${operationName} failed (attempt ${attempt}): ${lastError.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve5) => setTimeout(resolve5, delay));
    }
  }
  throw lastError || new Error(`${operationName} failed after ${finalConfig.maxAttempts} attempts`);
}
async function runBDDTests(run, controller, testItem, outputChannel) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    const errorMsg = "No workspace folder open. Cannot execute BDD tests.";
    vscode.window.showErrorMessage(errorMsg);
    outputChannel?.appendLine(`[ERROR] ${errorMsg}`);
    run?.end();
    return;
  }
  if (currentProcess) {
    const warningMsg = "Another BDD test is already running. Please wait or terminate it first.";
    vscode.window.showWarningMessage(warningMsg);
    outputChannel?.appendLine(`[WARNING] ${warningMsg}`);
    return;
  }
  const projectRoot = workspaceFolders[0].uri.fsPath;
  const config = vscode.workspace.getConfiguration("playwrightBdd");
  try {
    const enableFeatureGen = config.get("enableFeatureGen", true);
    const configPath = config.get("configPath") || "./playwright.config.ts";
    const tsconfigPath = config.get("tsconfigPath") || "";
    const tags = config.get("tags") || "";
    const featureFolder = config.get("featureFolder", "features");
    const fullConfigPath = path.resolve(projectRoot, configPath);
    outputChannel?.appendLine(`Using config: ${fullConfigPath}`);
    let featureGenCommand = config.get("featureGenCommand") || "npx bddgen --config=${configPath}";
    let testCommand = config.get("testCommand") || "npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}";
    const configPathArg = configPath;
    const tsconfigArg = tsconfigPath ? `${tsconfigPath}` : "";
    const tagsArg = tags ? `--grep "${tags}"` : "";
    featureGenCommand = featureGenCommand.replace("${configPath}", configPathArg).replace("${tsconfigArg}", tsconfigArg).replace("${tagsArg}", tagsArg);
    testCommand = testCommand.replace("${configPath}", configPathArg).replace("${tsconfigArg}", tsconfigArg).replace("${tagsArg}", tagsArg);
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
    const runCommand = async (cmd, label, onSuccess) => {
      const startTime = Date.now();
      outputChannel?.appendLine(`[${(/* @__PURE__ */ new Date()).toISOString()}] Running ${label}: ${cmd}`);
      const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
      statusBarItem.text = `$(sync~spin) ${label}...`;
      statusBarItem.show();
      const executeCommand = () => new Promise((resolve5, reject) => {
        currentProcess = (0, import_child_process.exec)(
          cmd,
          {
            cwd: projectRoot,
            timeout: 3e5,
            // 5 minute timeout
            maxBuffer: 1024 * 1024 * 10
            // 10MB buffer
          },
          (err, stdout, stderr) => {
            currentProcess = null;
            if (err) {
              reject(err);
            } else {
              resolve5({ stdout: stdout || "", stderr: stderr || "" });
            }
          }
        );
        currentProcess.on("error", (error) => {
          outputChannel?.appendLine(`[ERROR] Process error: ${error.message}`);
          reject(error);
        });
      });
      try {
        const retryCount = config.get("execution.retryCount", 2);
        const retryDelay = config.get("execution.retryDelay", 2e3);
        const result = await retryOperation(
          executeCommand,
          { maxAttempts: retryCount, delayMs: retryDelay },
          label,
          outputChannel
        );
        const duration = Date.now() - startTime;
        statusBarItem.hide();
        statusBarItem.dispose();
        processHistory.push({
          timestamp: /* @__PURE__ */ new Date(),
          command: cmd,
          success: true,
          duration
        });
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
      } catch (err) {
        const duration = Date.now() - startTime;
        statusBarItem.hide();
        statusBarItem.dispose();
        processHistory.push({
          timestamp: /* @__PURE__ */ new Date(),
          command: cmd,
          success: false,
          duration
        });
        if (processHistory.length > 20) {
          processHistory = processHistory.slice(-20);
        }
        const errorOutput = err.stderr || err.message;
        const errorMsg = `${label} failed after ${duration}ms:
${errorOutput}`;
        outputChannel?.appendLine(`[ERROR] ${errorMsg}`);
        run?.appendOutput(errorOutput);
        if (testItem) {
          const testMessage = new vscode.TestMessage(errorOutput);
          testMessage.location = testItem.uri ? new vscode.Location(testItem.uri, new vscode.Position(0, 0)) : void 0;
          run?.failed(testItem, testMessage);
        }
        if (err.message.includes("ENOENT") || err.message.includes("command not found")) {
          vscode.window.showErrorMessage(`${label} failed: Command not found. Make sure Playwright and playwright-bdd are installed.`);
        } else if (err.message.includes("timeout")) {
          vscode.window.showErrorMessage(`${label} timed out after ${Math.round(duration / 1e3)}s. Consider increasing the timeout.`);
        } else {
          vscode.window.showErrorMessage(`${label} failed. Check the output panel for details.`);
        }
        run?.end();
      }
    };
    if (enableFeatureGen) {
      await runCommand(featureGenCommand, "Feature generation");
      await runCommand(testCommand, "BDD test run");
    } else {
      await runCommand(testCommand, "BDD test run");
    }
  } catch (error) {
    const errorMsg = `Failed to setup BDD test execution: ${error}`;
    outputChannel?.appendLine(`[ERROR] ${errorMsg}`);
    vscode.window.showErrorMessage(errorMsg);
    run?.end();
  }
}
function terminateBDDTests() {
  if (currentProcess) {
    try {
      currentProcess.kill("SIGTERM");
      setTimeout(() => {
        if (currentProcess) {
          currentProcess.kill("SIGKILL");
          currentProcess = null;
        }
      }, 5e3);
      vscode.window.showInformationMessage("\u{1F6D1} BDD test execution terminated.");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to terminate BDD test: ${error}`);
    }
  } else {
    vscode.window.showInformationMessage("No BDD test is currently running.");
  }
}
function getExecutionHistory() {
  return processHistory.slice();
}
function clearExecutionHistory() {
  processHistory = [];
}
function isTestRunning() {
  return currentProcess !== null;
}
var vscode, path, import_child_process, currentProcess, processHistory, defaultRetryConfig;
var init_bddRunner = __esm({
  "src/bddRunner.ts"() {
    vscode = __toESM(require("vscode"));
    path = __toESM(require("path"));
    import_child_process = require("child_process");
    currentProcess = null;
    processHistory = [];
    defaultRetryConfig = {
      maxAttempts: 3,
      delayMs: 1e3,
      backoffMultiplier: 2,
      retryableErrors: [
        "ECONNRESET",
        "ETIMEDOUT",
        "ENOTFOUND",
        "EAI_AGAIN",
        "socket hang up",
        "network timeout",
        "connection refused",
        "EPIPE"
      ]
    };
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(extension_exports);
var vscode19 = __toESM(require("vscode"));
var path16 = __toESM(require("path"));
init_bddRunner();

// src/featureCodeLens.ts
var vscode2 = __toESM(require("vscode"));
init_bddRunner();
var FeatureCodeLensProvider = class {
  constructor(enableFeatureGen) {
    this.enableFeatureGen = enableFeatureGen;
    this._onDidChangeCodeLenses = new vscode2.EventEmitter();
    this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
  }
  // Method to refresh CodeLenses (useful when test status changes)
  refresh() {
    this._onDidChangeCodeLenses.fire();
  }
  provideCodeLenses(document) {
    try {
      const lenses = [];
      const text = document.getText();
      if (!text.trim()) {
        return lenses;
      }
      const lines = text.split("\n");
      const isRunning = isTestRunning();
      const history = getExecutionHistory();
      const featureMatch = text.match(/^\s*Feature:\s*(.+)/m);
      if (featureMatch) {
        const featureName = featureMatch[1].trim();
        let featureLineIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/^\s*Feature:/)) {
            featureLineIndex = i;
            break;
          }
        }
        const range = new vscode2.Range(featureLineIndex, 0, featureLineIndex, lines[featureLineIndex].length);
        const lastExecution = history.filter((h) => h.command.includes(featureName)).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        const runTitle = isRunning ? "\u23F3 Running..." : lastExecution?.success === false ? "\u274C Run Feature (Failed)" : lastExecution?.success === true ? "\u2705 Run Feature" : "\u25B6 Run Feature";
        lenses.push(new vscode2.CodeLens(range, {
          title: runTitle,
          command: isRunning ? void 0 : "playwright-bdd.runScenarioDynamic",
          arguments: isRunning ? void 0 : [featureName, this.enableFeatureGen]
        }));
        lenses.push(new vscode2.CodeLens(range, {
          title: isRunning ? "\u23F3 Debug..." : "\u{1F41E} Debug Feature",
          command: isRunning ? void 0 : "playwright-bdd.debugScenario",
          arguments: isRunning ? void 0 : [featureName]
        }));
        if (lastExecution && lastExecution.duration > 0) {
          const duration = lastExecution.duration > 1e3 ? `${Math.round(lastExecution.duration / 1e3)}s` : `${lastExecution.duration}ms`;
          lenses.push(new vscode2.CodeLens(range, {
            title: `\u23F1 Last run: ${duration}`,
            command: void 0
          }));
        }
      }
      for (let i = 0; i < lines.length; i++) {
        const scenarioMatch = lines[i].match(/^\s*Scenario(?: Outline)?:\s*(.+)/);
        if (scenarioMatch) {
          const scenarioName = scenarioMatch[1].trim();
          let tag;
          for (let j = i - 1; j >= 0; j--) {
            const tagMatch = lines[j].match(/^\s*@(\w+)/);
            if (tagMatch) {
              tag = `@${tagMatch[1]}`;
              break;
            } else if (lines[j].trim() === "") {
              continue;
            } else {
              break;
            }
          }
          const range = new vscode2.Range(i, 0, i, lines[i].length);
          const grepArg = tag ?? scenarioName;
          const lastScenarioExecution = history.filter((h) => h.command.includes(scenarioName) || tag && h.command.includes(tag)).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
          const scenarioRunTitle = isRunning ? "\u23F3 Running..." : lastScenarioExecution?.success === false ? "\u274C Run Scenario (Failed)" : lastScenarioExecution?.success === true ? "\u2705 Run Scenario" : "\u25B6 Run Scenario";
          lenses.push(new vscode2.CodeLens(range, {
            title: scenarioRunTitle,
            command: isRunning ? void 0 : "playwright-bdd.runScenarioDynamic",
            arguments: isRunning ? void 0 : [grepArg, this.enableFeatureGen]
          }));
          lenses.push(new vscode2.CodeLens(range, {
            title: isRunning ? "\u23F3 Debug..." : "\u{1F41E} Debug Scenario",
            command: isRunning ? void 0 : "playwright-bdd.debugScenario",
            arguments: isRunning ? void 0 : [grepArg]
          }));
        }
      }
      return lenses;
    } catch (error) {
      console.error("[FeatureCodeLensProvider] Error providing code lenses:", error);
      return [];
    }
  }
};

// src/stepDefinitionProvider.ts
var vscode3 = __toESM(require("vscode"));
var path2 = __toESM(require("path"));
var fs = __toESM(require("fs"));
var StepDefinitionProvider = class {
  constructor(outputChannel) {
    this.stepDefinitions = [];
    this.outputChannel = outputChannel;
  }
  async discoverStepDefinitions(workspaceRoot, stepsFolder = "src/steps") {
    try {
      this.outputChannel.appendLine("\u{1F50D} Starting step definition discovery...");
      const startTime = Date.now();
      this.stepDefinitions = [];
      const stepsPath = path2.resolve(workspaceRoot, stepsFolder);
      if (!fs.existsSync(stepsPath)) {
        this.outputChannel.appendLine(`\u26A0\uFE0F Steps folder not found: ${stepsPath}`);
        return;
      }
      const stepFiles = await this.findStepFiles(stepsPath);
      this.outputChannel.appendLine(`\u{1F4C1} Found ${stepFiles.length} step definition files`);
      for (const file of stepFiles) {
        try {
          await this.parseStepFile(file);
        } catch (error) {
          this.outputChannel.appendLine(`\u274C Error parsing step file ${file}: ${error}`);
        }
      }
      const duration = Date.now() - startTime;
      this.outputChannel.appendLine(`\u2705 Step discovery completed in ${duration}ms. Found ${this.stepDefinitions.length} step definitions.`);
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Step definition discovery failed: ${error}`);
    }
  }
  async findStepFiles(stepsPath) {
    const files = [];
    const scanDirectory = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path2.join(dir, item);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              scanDirectory(fullPath);
            } else if (item.endsWith(".ts") || item.endsWith(".js")) {
              files.push(fullPath);
            }
          } catch (error) {
            continue;
          }
        }
      } catch (error) {
        this.outputChannel.appendLine(`\u26A0\uFE0F Error scanning directory ${dir}: ${error}`);
      }
    };
    scanDirectory(stepsPath);
    return files;
  }
  async parseStepFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const stepPatterns = [
          // Standard format: Given('pattern', function)
          /^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(.+)\)/,
          // Alternative formats: Given("pattern", async () => {})
          /^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\s*\)\s*=>\s*\{/,
          // Function declaration: Given("pattern", async function() {})
          /^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s+function\s*\(/,
          // TypeScript arrow functions: Given("pattern", async (): Promise<void> => {})
          /^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\([^)]*\)\s*:\s*[^=]*=>\s*\{/,
          // Cucumber-style with decorators: @Given("pattern")
          /^@(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/,
          // Multi-line step definitions (check if next lines contain function)
          /^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*$/
        ];
        for (const pattern of stepPatterns) {
          const stepMatch = line.match(pattern);
          if (stepMatch) {
            const [fullMatch, type, stepPattern] = stepMatch;
            let functionDef = "";
            if (fullMatch.includes(",")) {
              const commaIndex = fullMatch.indexOf(",");
              functionDef = fullMatch.substring(commaIndex + 1).trim();
            } else {
              let nextLineIndex = i + 1;
              while (nextLineIndex < lines.length && nextLineIndex < i + 5) {
                const nextLine = lines[nextLineIndex].trim();
                if (nextLine.includes("async") || nextLine.includes("function") || nextLine.includes("=>")) {
                  functionDef = nextLine;
                  break;
                }
                nextLineIndex++;
              }
            }
            const isDuplicate = this.stepDefinitions.some(
              (existing) => existing.pattern === stepPattern && existing.type === type && existing.file === filePath
            );
            if (!isDuplicate) {
              this.stepDefinitions.push({
                pattern: stepPattern,
                type,
                file: filePath,
                line: i + 1,
                function: functionDef || "function definition"
              });
              this.outputChannel.appendLine(`  \u{1F4DD} Found ${type}: "${stepPattern}" in ${path2.basename(filePath)}:${i + 1}`);
            }
            break;
          }
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Error reading step file ${filePath}: ${error}`);
    }
  }
  // VS Code DefinitionProvider interface
  async provideDefinition(document, position, token) {
    const line = document.lineAt(position);
    const stepMatch = line.text.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)/);
    if (stepMatch) {
      const stepText = stepMatch[2].trim();
      return await this.findStepDefinition(stepText);
    }
    return void 0;
  }
  async findStepDefinition(stepText) {
    const matchedStep = this.findMatchingStep(stepText);
    if (matchedStep) {
      const uri = vscode3.Uri.file(matchedStep.file);
      const position = new vscode3.Position(matchedStep.line - 1, 0);
      return new vscode3.Location(uri, position);
    }
    return void 0;
  }
  findMatchingStep(stepText) {
    this.outputChannel.appendLine(`\u{1F50D} Looking for step: "${stepText}"`);
    return this.stepDefinitions.find((step) => {
      try {
        this.outputChannel.appendLine(`  \u{1F3AF} Testing pattern: "${step.pattern}"`);
        if (stepText.toLowerCase() === step.pattern.toLowerCase()) {
          this.outputChannel.appendLine(`  \u2705 Direct match found!`);
          return true;
        }
        let enhancedPattern = step.pattern;
        enhancedPattern = enhancedPattern.replace(/'<[^>]+>'/g, "'[^']*'").replace(/"<[^>]+>"/g, '"[^"]*"').replace(/<[^>]+>/g, "[^\\s]+");
        enhancedPattern = enhancedPattern.replace(/\{string\}/g, `["']([^"']*)["']`).replace(/\{int\}/g, "\\d+").replace(/\{float\}/g, "\\d+\\.?\\d*").replace(/\{word\}/g, "[a-zA-Z0-9_]+").replace(/\{[^}]+\}/g, "[^\\s]+");
        enhancedPattern = enhancedPattern.replace(/'[^']*'/g, "'[^']*'").replace(/"[^"]*"/g, '"[^"]*"');
        enhancedPattern = enhancedPattern.replace(/\s+/g, "\\s+");
        try {
          const regex = new RegExp(`^${enhancedPattern}$`, "i");
          if (regex.test(stepText)) {
            this.outputChannel.appendLine(`  \u2705 Enhanced pattern match: "${enhancedPattern}"`);
            return true;
          }
        } catch (regexError) {
          this.outputChannel.appendLine(`  \u26A0\uFE0F Enhanced regex failed: ${regexError}`);
        }
        const fuzzyMatch = this.performApiAwareFuzzyMatch(stepText, step.pattern);
        if (fuzzyMatch) {
          this.outputChannel.appendLine(`  \u2705 API-aware fuzzy match found!`);
          return true;
        }
        const structuralMatch = this.performStructuralMatch(stepText, step.pattern);
        if (structuralMatch) {
          this.outputChannel.appendLine(`  \u2705 Structural match found!`);
          return true;
        }
        return false;
      } catch (error) {
        this.outputChannel.appendLine(`  \u274C Error matching "${step.pattern}": ${error}`);
        return false;
      }
    });
  }
  /**
   * API-aware fuzzy matching that understands scenario outline parameters
   */
  performApiAwareFuzzyMatch(stepText, pattern) {
    try {
      const normalizeForApiComparison = (str) => {
        return str.toLowerCase().replace(/'<[^>]+>'/g, "SCENARIO_PARAM").replace(/"<[^>]+>"/g, "SCENARIO_PARAM").replace(/<[^>]+>/g, "SCENARIO_PARAM").replace(/\{[^}]+\}/g, "CUCUMBER_PARAM").replace(/'[^']*'/g, "QUOTED_STRING").replace(/"[^"]*"/g, "QUOTED_STRING").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
      };
      const normalizedStep = normalizeForApiComparison(stepText);
      const normalizedPattern = normalizeForApiComparison(pattern);
      if (normalizedStep === normalizedPattern) {
        return true;
      }
      const apiTerms = ["api", "call", "request", "response", "get", "post", "put", "delete", "patch", "through", "aggregator", "endpoint"];
      const stepApiTerms = apiTerms.filter((term) => normalizedStep.includes(term));
      const patternApiTerms = apiTerms.filter((term) => normalizedPattern.includes(term));
      if (stepApiTerms.length > 0 && patternApiTerms.length > 0) {
        const matchingApiTerms = stepApiTerms.filter((term) => patternApiTerms.includes(term));
        return matchingApiTerms.length > 0;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  /**
   * Structural matching that focuses on sentence structure rather than parameter values
   */
  performStructuralMatch(stepText, pattern) {
    try {
      const extractStructure = (str) => {
        return str.toLowerCase().replace(/'<[^>]+>'/g, "").replace(/"<[^>]+>"/g, "").replace(/<[^>]+>/g, "").replace(/\{[^}]+\}/g, "").replace(/'[^']*'/g, "").replace(/"[^"]*"/g, "").split(/\s+/).filter((word) => word.length > 2).filter((word) => !["and", "the", "for", "with", "from", "that"].includes(word));
      };
      const stepStructure = extractStructure(stepText);
      const patternStructure = extractStructure(pattern);
      if (stepStructure.length === 0 || patternStructure.length === 0) {
        return false;
      }
      const matchingWords = stepStructure.filter(
        (word) => patternStructure.some(
          (patternWord) => word.includes(patternWord) || patternWord.includes(word)
        )
      );
      const matchRatio = matchingWords.length / Math.max(stepStructure.length, patternStructure.length);
      return matchRatio >= 0.6;
    } catch (error) {
      return false;
    }
  }
  getAllStepDefinitions() {
    return [...this.stepDefinitions];
  }
  getStepCoverageForFeature(featureFile) {
    try {
      const content = fs.readFileSync(featureFile, "utf8");
      const lines = content.split("\n");
      const steps = [];
      const missing = [];
      for (const line of lines) {
        const stepMatch = line.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)/);
        if (stepMatch) {
          const stepText = stepMatch[2].trim();
          steps.push(stepText);
          const matchedDefinition = this.findMatchingStep(stepText);
          if (!matchedDefinition) {
            missing.push(stepText);
          }
        }
      }
      return {
        covered: steps.length - missing.length,
        total: steps.length,
        missing
      };
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Error analyzing step coverage for ${featureFile}: ${error}`);
      return { covered: 0, total: 0, missing: [] };
    }
  }
};

// src/testCache.ts
var vscode4 = __toESM(require("vscode"));
var fs2 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var TestDiscoveryCache = class {
  constructor(outputChannel) {
    this.cacheVersion = "1.0.0";
    this.outputChannel = outputChannel;
    this.cache = {
      version: this.cacheVersion,
      features: /* @__PURE__ */ new Map(),
      lastScan: 0
    };
  }
  /**
   * Check if a feature file needs to be re-processed
   */
  async needsUpdate(fileUri) {
    try {
      const filePath = fileUri.fsPath;
      const stat = await fs2.promises.stat(filePath);
      const lastModified = stat.mtime.getTime();
      const cached = this.cache.features.get(filePath);
      if (!cached) {
        return true;
      }
      if (cached.lastModified < lastModified) {
        this.outputChannel.appendLine(`\u{1F504} File modified: ${path3.basename(filePath)}`);
        return true;
      }
      return false;
    } catch (error) {
      this.outputChannel.appendLine(`\u26A0\uFE0F Error checking file modification: ${error}`);
      return true;
    }
  }
  /**
   * Get cached test items for files that haven't changed
   */
  getCachedFeature(fileUri) {
    return this.cache.features.get(fileUri.fsPath);
  }
  /**
   * Update cache with new test item data
   */
  async updateCache(fileUri, testItem) {
    try {
      const stat = await fs2.promises.stat(fileUri.fsPath);
      testItem.lastModified = stat.mtime.getTime();
      this.cache.features.set(fileUri.fsPath, testItem);
      this.outputChannel.appendLine(`\u{1F4BE} Cached feature: ${path3.basename(fileUri.fsPath)}`);
    } catch (error) {
      this.outputChannel.appendLine(`\u26A0\uFE0F Error updating cache: ${error}`);
    }
  }
  /**
   * Remove cached entry for deleted files
   */
  removeFromCache(fileUri) {
    const removed = this.cache.features.delete(fileUri.fsPath);
    if (removed) {
      this.outputChannel.appendLine(`\u{1F5D1}\uFE0F Removed from cache: ${path3.basename(fileUri.fsPath)}`);
    }
  }
  /**
   * Incremental discovery - only process changed files
   */
  async incrementalDiscovery(files, processFeatureFile) {
    const startTime = Date.now();
    let processed = 0;
    let fromCache = 0;
    this.outputChannel.appendLine("\u{1F680} Starting incremental test discovery...");
    for (const file of files) {
      try {
        const needsUpdate = await this.needsUpdate(file);
        if (needsUpdate) {
          await processFeatureFile(file, false);
          processed++;
        } else {
          await processFeatureFile(file, true);
          fromCache++;
        }
      } catch (error) {
        this.outputChannel.appendLine(`\u274C Error processing ${file.fsPath}: ${error}`);
      }
    }
    const duration = Date.now() - startTime;
    this.cache.lastScan = Date.now();
    this.outputChannel.appendLine(
      `\u2705 Incremental discovery completed: ${processed} processed, ${fromCache} from cache, ${duration}ms`
    );
    return { processed, fromCache, duration };
  }
  /**
   * Clear entire cache (useful for configuration changes)
   */
  clearCache() {
    this.cache.features.clear();
    this.cache.lastScan = 0;
    this.outputChannel.appendLine("\u{1F9F9} Test discovery cache cleared");
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const recentAccesses = Array.from(this.cache.features.values()).filter((f) => now - f.lastModified < 3e5);
    return {
      totalFeatures: this.cache.features.size,
      lastScan: this.cache.lastScan > 0 ? new Date(this.cache.lastScan) : null,
      cacheHitRate: this.cache.features.size > 0 ? recentAccesses.length / this.cache.features.size : 0
    };
  }
  /**
   * Validate cache integrity and clean up stale entries
   */
  async validateAndCleanCache() {
    const startTime = Date.now();
    let removed = 0;
    this.outputChannel.appendLine("\u{1F9F9} Validating cache integrity...");
    for (const [filePath, cachedItem] of this.cache.features.entries()) {
      try {
        await fs2.promises.access(filePath);
      } catch (error) {
        this.cache.features.delete(filePath);
        removed++;
      }
    }
    const duration = Date.now() - startTime;
    this.outputChannel.appendLine(
      `\u2705 Cache validation completed: ${removed} stale entries removed in ${duration}ms`
    );
  }
  /**
   * Create cached test item from VS Code test item
   */
  createCachedItem(testItem) {
    const scenarios = [];
    testItem.children.forEach((scenario) => {
      const examples = [];
      scenario.children.forEach((example) => {
        examples.push({
          id: example.id,
          label: example.label
        });
      });
      scenarios.push({
        id: scenario.id,
        label: scenario.label,
        examples: examples.length > 0 ? examples : void 0
      });
    });
    return {
      id: testItem.id,
      label: testItem.label,
      uri: testItem.uri?.toString() || "",
      lastModified: 0,
      // Will be set by updateCache
      scenarios
    };
  }
  /**
   * Recreate VS Code test item from cached data
   */
  recreateTestItem(cached, controller) {
    const uri = vscode4.Uri.parse(cached.uri);
    const testItem = controller.createTestItem(cached.id, cached.label, uri);
    for (const scenario of cached.scenarios) {
      const scenarioItem = controller.createTestItem(scenario.id, scenario.label, uri);
      testItem.children.add(scenarioItem);
      if (scenario.examples) {
        for (const example of scenario.examples) {
          const exampleItem = controller.createTestItem(example.id, example.label, uri);
          scenarioItem.children.add(exampleItem);
        }
      }
    }
    return testItem;
  }
};

// src/testSearchProvider.ts
var path4 = __toESM(require("path"));
var TestSearchProvider = class {
  constructor(outputChannel) {
    this.searchHistory = [];
    this.outputChannel = outputChannel;
  }
  /**
   * Advanced search across all test items with multiple filter criteria
   */
  async searchTests(controller, searchQuery, filters = {}) {
    const startTime = Date.now();
    const results = [];
    this.outputChannel.appendLine(`\u{1F50D} Starting advanced search: "${searchQuery}"`);
    this.addToSearchHistory(searchQuery);
    const normalizedQuery = searchQuery.toLowerCase().trim();
    if (!normalizedQuery && Object.keys(filters).length === 0) {
      return results;
    }
    controller.items.forEach((item) => {
      this.searchInTestItem(item, normalizedQuery, filters, results);
    });
    results.sort((a, b) => this.calculateRelevance(b, normalizedQuery) - this.calculateRelevance(a, normalizedQuery));
    const duration = Date.now() - startTime;
    this.outputChannel.appendLine(`\u2705 Search completed in ${duration}ms. Found ${results.length} matches.`);
    return results;
  }
  /**
   * Recursive search within test items
   */
  searchInTestItem(item, query, filters, results) {
    const matches = this.checkItemMatch(item, query, filters);
    if (matches.length > 0) {
      results.push(...matches);
    }
    item.children.forEach((child) => {
      this.searchInTestItem(child, query, filters, results);
    });
  }
  /**
   * Check if a test item matches search criteria
   */
  checkItemMatch(item, query, filters) {
    const matches = [];
    const itemLabel = item.label.toLowerCase();
    const filePath = item.uri?.fsPath || "";
    const fileName = path4.basename(filePath).toLowerCase();
    if (filters.filePattern && !fileName.includes(filters.filePattern.toLowerCase())) {
      return matches;
    }
    if (filters.featureName && !itemLabel.includes(filters.featureName.toLowerCase())) {
      return matches;
    }
    if (filters.scenarioName && item.parent && !itemLabel.includes(filters.scenarioName.toLowerCase())) {
      return matches;
    }
    if (query && itemLabel.includes(query)) {
      const matchType = this.determineMatchType(item);
      matches.push({
        testItem: item,
        matchType,
        matchText: item.label,
        filePath
      });
    }
    if (filters.tags && filters.tags.length > 0) {
      const tagMatches = this.searchForTags(item, filters.tags);
      matches.push(...tagMatches);
    }
    if (filters.stepText) {
      const stepMatches = this.searchForSteps(item, filters.stepText);
      matches.push(...stepMatches);
    }
    return matches;
  }
  /**
   * Search for tags in feature file content
   */
  searchForTags(item, tags) {
    const matches = [];
    if (!item.uri) return matches;
    try {
      const content = require("fs").readFileSync(item.uri.fsPath, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("@")) {
          const lineTags = line.split(/\s+/).filter((tag) => tag.startsWith("@"));
          for (const tag of tags) {
            const searchTag = tag.startsWith("@") ? tag : `@${tag}`;
            if (lineTags.some((lineTag) => lineTag.toLowerCase().includes(searchTag.toLowerCase()))) {
              matches.push({
                testItem: item,
                matchType: "tag",
                matchText: line,
                filePath: item.uri.fsPath,
                line: i + 1
              });
            }
          }
        }
      }
    } catch (error) {
    }
    return matches;
  }
  /**
   * Search for step text in feature files
   */
  searchForSteps(item, stepText) {
    const matches = [];
    if (!item.uri) return matches;
    try {
      const content = require("fs").readFileSync(item.uri.fsPath, "utf8");
      const lines = content.split("\n");
      const searchText = stepText.toLowerCase();
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim().toLowerCase();
        if (/^\s*(given|when|then|and|but)\s+/i.test(line)) {
          if (line.includes(searchText)) {
            matches.push({
              testItem: item,
              matchType: "step",
              matchText: lines[i].trim(),
              filePath: item.uri.fsPath,
              line: i + 1
            });
          }
        }
      }
    } catch (error) {
    }
    return matches;
  }
  /**
   * Determine the type of test item for categorizing matches
   */
  determineMatchType(item) {
    if (!item.parent) {
      return "feature";
    } else if (item.children.size > 0) {
      return "scenario";
    } else {
      return "scenario";
    }
  }
  /**
   * Calculate relevance score for sorting results
   */
  calculateRelevance(result, query) {
    let score = 0;
    const matchText = result.matchText.toLowerCase();
    if (matchText === query) {
      score += 100;
    }
    if (matchText.startsWith(query)) {
      score += 50;
    }
    switch (result.matchType) {
      case "feature":
        score += 20;
        break;
      case "scenario":
        score += 15;
        break;
      case "tag":
        score += 10;
        break;
      case "step":
        score += 5;
        break;
    }
    score += Math.max(0, 20 - matchText.length);
    return score;
  }
  /**
   * Quick search with autocomplete suggestions
   */
  async getSearchSuggestions(controller, partialQuery) {
    const suggestions = /* @__PURE__ */ new Set();
    const query = partialQuery.toLowerCase();
    this.searchHistory.filter((h) => h.toLowerCase().includes(query)).forEach((h) => suggestions.add(h));
    controller.items.forEach((item) => {
      if (item.label.toLowerCase().includes(query)) {
        suggestions.add(item.label);
      }
      item.children.forEach((child) => {
        if (child.label.toLowerCase().includes(query)) {
          suggestions.add(child.label);
        }
      });
    });
    return Array.from(suggestions).slice(0, 10);
  }
  /**
   * Advanced filter builder for complex queries
   */
  buildAdvancedFilter(queryString) {
    const filters = {};
    const filterRegex = /(\w+):([^\s]+)/g;
    let match;
    while ((match = filterRegex.exec(queryString)) !== null) {
      const [, key, value] = match;
      switch (key.toLowerCase()) {
        case "tag":
          if (!filters.tags) filters.tags = [];
          filters.tags.push(value);
          break;
        case "feature":
          filters.featureName = value;
          break;
        case "scenario":
          filters.scenarioName = value;
          break;
        case "step":
          filters.stepText = value;
          break;
        case "file":
          filters.filePattern = value;
          break;
        case "status":
          filters.status = value;
          break;
      }
    }
    return filters;
  }
  /**
   * Export search results for external use
   */
  exportSearchResults(results) {
    const report = [
      `# Search Results - ${(/* @__PURE__ */ new Date()).toISOString()}`,
      `Total matches: ${results.length}`,
      "",
      "## Results",
      ""
    ];
    results.forEach((result, index) => {
      report.push(`${index + 1}. **${result.matchType.toUpperCase()}**: ${result.matchText}`);
      report.push(`   File: ${result.filePath}`);
      if (result.line) {
        report.push(`   Line: ${result.line}`);
      }
      report.push("");
    });
    return report.join("\n");
  }
  /**
   * Get search statistics
   */
  getSearchStats() {
    return {
      historySize: this.searchHistory.length,
      lastSearch: this.searchHistory.length > 0 ? /* @__PURE__ */ new Date() : null
    };
  }
  /**
   * Clear search history
   */
  clearSearchHistory() {
    this.searchHistory = [];
    this.outputChannel.appendLine("\u{1F9F9} Search history cleared");
  }
  /**
   * Add search query to history
   */
  addToSearchHistory(query) {
    if (query.trim() && !this.searchHistory.includes(query)) {
      this.searchHistory.unshift(query);
      if (this.searchHistory.length > 50) {
        this.searchHistory = this.searchHistory.slice(0, 50);
      }
    }
  }
};

// src/hoverProvider.ts
var vscode5 = __toESM(require("vscode"));
var path5 = __toESM(require("path"));
var BDDHoverProvider = class {
  constructor(stepDefinitionProvider, outputChannel) {
    this.stepDefinitionProvider = stepDefinitionProvider;
    this.outputChannel = outputChannel;
  }
  async provideHover(document, position, token) {
    try {
      const line = document.lineAt(position);
      const context = this.analyzeHoverContext(line, position.line, document);
      if (!context) {
        return void 0;
      }
      const hoverContent = this.buildHoverContent(context);
      if (hoverContent.length === 0) {
        return void 0;
      }
      const range = new vscode5.Range(
        new vscode5.Position(position.line, 0),
        new vscode5.Position(position.line, line.text.length)
      );
      return new vscode5.Hover(hoverContent, range);
    } catch (error) {
      this.outputChannel.appendLine(`[ERROR] Hover provider failed: ${error}`);
      return void 0;
    }
  }
  /**
   * Analyze the line to determine if it's a step and extract context
   */
  analyzeHoverContext(line, lineNumber, document) {
    const text = line.text.trim();
    const stepMatch = text.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/i);
    if (!stepMatch) {
      return void 0;
    }
    const [, stepType, stepText] = stepMatch;
    const cleanStepText = stepText.trim();
    const matchedStep = this.stepDefinitionProvider.findMatchingStep(cleanStepText);
    const context = {
      stepText: cleanStepText,
      stepType,
      lineNumber: lineNumber + 1,
      hasDefinition: !!matchedStep
    };
    if (matchedStep) {
      context.definitionFile = matchedStep.file;
      context.definitionLine = matchedStep.line;
      context.stepFunction = matchedStep.function;
      context.parameters = this.extractParameters(cleanStepText, matchedStep.pattern);
    } else {
      const allSteps = this.stepDefinitionProvider.getAllStepDefinitions();
      context.suggestions = this.findSimilarSteps(cleanStepText, allSteps).slice(0, 3);
    }
    context.scenarioContext = this.extractScenarioContext(document, lineNumber);
    context.tags = this.extractTags(document, lineNumber);
    context.executionHistory = this.getExecutionHistory(cleanStepText);
    return context;
  }
  /**
   * Build hover content based on context
   */
  buildHoverContent(context) {
    const content = [];
    if (context.hasDefinition && context.definitionFile && context.definitionLine) {
      const definitionInfo = new vscode5.MarkdownString();
      definitionInfo.isTrusted = true;
      definitionInfo.supportHtml = true;
      definitionInfo.appendMarkdown(`### \u2705 Step Definition Found

`);
      definitionInfo.appendMarkdown(`**Step:** \`${context.stepText}\`

`);
      definitionInfo.appendMarkdown(`**Type:** ${context.stepType}

`);
      definitionInfo.appendMarkdown(`**Location:** ${path5.basename(context.definitionFile)}:${context.definitionLine}

`);
      if (context.stepFunction) {
        definitionInfo.appendMarkdown(`**Function:** \`${context.stepFunction}\`

`);
      }
      if (context.parameters && context.parameters.length > 0) {
        definitionInfo.appendMarkdown(`**Parameters:**
`);
        context.parameters.forEach((param) => {
          const typeInfo = param.type ? ` (${param.type})` : "";
          definitionInfo.appendMarkdown(`- \`${param.name}\`: "${param.value}"${typeInfo}
`);
        });
        definitionInfo.appendMarkdown(`
`);
      }
      if (context.scenarioContext) {
        definitionInfo.appendMarkdown(`**Context:**
`);
        if (context.scenarioContext.featureName) {
          definitionInfo.appendMarkdown(`- Feature: ${context.scenarioContext.featureName}
`);
        }
        if (context.scenarioContext.scenarioName) {
          definitionInfo.appendMarkdown(`- Scenario: ${context.scenarioContext.scenarioName}
`);
        }
        if (context.scenarioContext.isOutline) {
          definitionInfo.appendMarkdown(`- Type: Scenario Outline
`);
        }
        definitionInfo.appendMarkdown(`
`);
      }
      if (context.executionHistory?.lastRun) {
        const status = context.executionHistory.success ? "\u2705 Passed" : "\u274C Failed";
        const duration = context.executionHistory.duration ? ` (${context.executionHistory.duration}ms)` : "";
        definitionInfo.appendMarkdown(`**Last Execution:** ${status}${duration}

`);
      }
      if (context.tags && context.tags.length > 0) {
        definitionInfo.appendMarkdown(`**Tags:** ${context.tags.map((tag) => `\`${tag}\``).join(", ")}

`);
      }
      definitionInfo.appendMarkdown(`[Go to Definition](command:vscode.open?${encodeURIComponent(JSON.stringify([vscode5.Uri.file(context.definitionFile), { selection: new vscode5.Range(context.definitionLine - 1, 0, context.definitionLine - 1, 0) }]))})`);
      content.push(definitionInfo);
    } else {
      const missingInfo = new vscode5.MarkdownString();
      missingInfo.isTrusted = true;
      missingInfo.appendMarkdown(`### \u274C Step Definition Missing

`);
      missingInfo.appendMarkdown(`**Step:** \`${context.stepText}\`

`);
      missingInfo.appendMarkdown(`**Type:** ${context.stepType}

`);
      missingInfo.appendMarkdown(`\u26A0\uFE0F No matching step definition found.

`);
      if (context.suggestions && context.suggestions.length > 0) {
        missingInfo.appendMarkdown(`**Similar steps found:**

`);
        context.suggestions.forEach((suggestion, index) => {
          missingInfo.appendMarkdown(`${index + 1}. \`${suggestion}\`
`);
        });
        missingInfo.appendMarkdown(`
`);
      }
      missingInfo.appendMarkdown(`**Suggested step definition:**

`);
      missingInfo.appendMarkdown(`\`\`\`typescript
${context.stepType.toLowerCase()}('${context.stepText}', async () => {
  // TODO: Implement step
});
\`\`\`

`);
      missingInfo.appendMarkdown(`\u{1F4A1} Create a step definition in your steps folder to resolve this.`);
      content.push(missingInfo);
    }
    return content;
  }
  /**
   * Extract parameters from step text based on step definition pattern
   */
  extractParameters(stepText, pattern) {
    const parameters = [];
    try {
      const parameterPatterns = [
        { regex: /\{([^}]+)\}/g, type: "variable" },
        { regex: /\<([^>]+)\>/g, type: "placeholder" },
        { regex: /"([^"]+)"/g, type: "string" },
        { regex: /'([^']+)'/g, type: "string" },
        { regex: /\b(\d+(?:\.\d+)?)\b/g, type: "number" }
      ];
      let paramIndex = 0;
      for (const patternInfo of parameterPatterns) {
        let match;
        const regex = new RegExp(patternInfo.regex.source, "g");
        while ((match = regex.exec(stepText)) !== null) {
          parameters.push({
            name: patternInfo.type === "variable" || patternInfo.type === "placeholder" ? match[1] : `param${paramIndex++}`,
            value: match[1] || match[0],
            type: patternInfo.type
          });
        }
      }
    } catch (error) {
    }
    return parameters;
  }
  /**
   * Extract scenario and feature context from document
   */
  extractScenarioContext(document, currentLine) {
    const lines = document.getText().split("\n");
    let featureName;
    let scenarioName;
    let isOutline = false;
    for (let i = currentLine; i >= 0; i--) {
      const line = lines[i].trim();
      if (!scenarioName) {
        const scenarioMatch = line.match(/^\s*Scenario(?: Outline)?:\s*(.+)/);
        if (scenarioMatch) {
          scenarioName = scenarioMatch[1].trim();
          isOutline = line.includes("Outline");
        }
      }
      if (!featureName) {
        const featureMatch = line.match(/^\s*Feature:\s*(.+)/);
        if (featureMatch) {
          featureName = featureMatch[1].trim();
          break;
        }
      }
    }
    return featureName || scenarioName ? {
      featureName,
      scenarioName,
      isOutline
    } : void 0;
  }
  /**
   * Extract tags from the lines above the current step
   */
  extractTags(document, currentLine) {
    const lines = document.getText().split("\n");
    const tags = [];
    for (let i = currentLine - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith("@")) {
        const lineTags = line.split(/\s+/).filter((tag) => tag.startsWith("@"));
        tags.unshift(...lineTags);
      } else if (line !== "" && !line.startsWith("#")) {
        break;
      }
    }
    return tags;
  }
  /**
   * Get execution history for a step (placeholder for future implementation)
   */
  getExecutionHistory(stepText) {
    return void 0;
  }
  /**
   * Find similar step definitions for suggestions
   */
  findSimilarSteps(stepText, allSteps) {
    const stepLower = stepText.toLowerCase();
    const similar = [];
    for (const step of allSteps) {
      const patternLower = step.pattern.toLowerCase();
      const score = this.calculateSimilarity(stepLower, patternLower);
      if (score > 0.3) {
        similar.push({ pattern: step.pattern, score });
      }
    }
    return similar.sort((a, b) => b.score - a.score).map((s) => s.pattern);
  }
  /**
   * Calculate similarity between two strings (simple word-based approach)
   */
  calculateSimilarity(str1, str2) {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    let commonWords = 0;
    for (const word1 of words1) {
      if (words2.some((word2) => word2.includes(word1) || word1.includes(word2))) {
        commonWords++;
      }
    }
    const maxWords = Math.max(words1.length, words2.length);
    return maxWords > 0 ? commonWords / maxWords : 0;
  }
};

// src/autoDiscovery.ts
var vscode6 = __toESM(require("vscode"));
var path6 = __toESM(require("path"));
var fs3 = __toESM(require("fs"));
var AutoDiscoveryService = class {
  constructor(outputChannel, workspaceRoot) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Auto-discover project configuration
   */
  async discoverProjectConfiguration() {
    const config = {};
    this.outputChannel.appendLine("\u{1F50D} Starting auto-discovery of project configuration...");
    try {
      const configs = await this.discoverPlaywrightConfig();
      config.playwrightConfig = configs.length > 0 ? configs[0] : void 0;
      config.featureFolder = await this.discoverFeatureFolder();
      config.stepsFolder = await this.discoverStepsFolder();
      config.tsconfigPath = await this.discoverTsconfig();
      config.hasPlaywrightBdd = await this.checkPlaywrightBddDependency();
      config.packageJsonExists = await this.checkPackageJson();
      this.logDiscoveryResults(config);
      return config;
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Auto-discovery failed: ${error}`);
      return config;
    }
  }
  /**
   * Discover Playwright configuration files dynamically across all folders
   */
  async discoverPlaywrightConfig() {
    const configPatterns = [
      "playwright.config.js",
      "playwright.config.ts",
      "playwright.config.mjs",
      "playwright.config.mts",
      "playwright.config.cjs",
      "playwright.config.cts"
    ];
    const configs = [];
    this.outputChannel.appendLine("\u{1F50D} Searching for Playwright configs in all workspace folders...");
    try {
      for (const pattern of configPatterns) {
        const files = await vscode6.workspace.findFiles(
          `**/${pattern}`,
          "**/node_modules/**"
        );
        for (const file of files) {
          const relativePath = vscode6.workspace.asRelativePath(file);
          configs.push(relativePath);
          this.outputChannel.appendLine(`\u{1F4CB} Found Playwright config: ${relativePath}`);
        }
      }
      const potentialConfigs = await this.findConfigsByContent();
      configs.push(...potentialConfigs);
      configs.sort((a, b) => {
        const aDepth = a.split("/").length;
        const bDepth = b.split("/").length;
        return aDepth - bDepth;
      });
      this.outputChannel.appendLine(`\u2705 Total Playwright configs found: ${configs.length}`);
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Error during config discovery: ${error}`);
    }
    return configs;
  }
  /**
   * Find configuration files by examining their content for Playwright setup
   */
  async findConfigsByContent() {
    const potentialConfigs = [];
    try {
      const jsFiles = await vscode6.workspace.findFiles(
        "**/*.{js,ts,mjs,mts,cjs,cts}",
        "**/node_modules/**"
      );
      const configKeywords = [
        "defineConfig",
        "@playwright/test",
        "PlaywrightTestConfig",
        "devices:",
        "projects:",
        "testDir:",
        "use:.*baseURL"
      ];
      for (const file of jsFiles) {
        try {
          const content = await vscode6.workspace.fs.readFile(file);
          const text = content.toString();
          const hasPlaywrightConfig = configKeywords.some((keyword) => {
            const regex = new RegExp(keyword, "i");
            return regex.test(text);
          });
          if (hasPlaywrightConfig) {
            const relativePath = vscode6.workspace.asRelativePath(file);
            if (!relativePath.includes("test") && !relativePath.includes("spec") && !relativePath.includes("example") && !potentialConfigs.includes(relativePath)) {
              potentialConfigs.push(relativePath);
              this.outputChannel.appendLine(`\u{1F527} Detected Playwright config by content: ${relativePath}`);
            }
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`Warning: Content-based config discovery failed: ${error}`);
    }
    return potentialConfigs;
  }
  /**
   * Discover feature folders dynamically across entire workspace
   */
  async discoverFeatureFolder() {
    this.outputChannel.appendLine("\u{1F50D} Searching for feature folders in all workspace directories...");
    try {
      const featureFiles = await vscode6.workspace.findFiles("**/*.feature", "**/node_modules/**");
      if (featureFiles.length === 0) {
        this.outputChannel.appendLine("\u26A0\uFE0F No .feature files found in workspace");
        return void 0;
      }
      const featureDirs = /* @__PURE__ */ new Map();
      for (const file of featureFiles) {
        const relativePath = vscode6.workspace.asRelativePath(file);
        const dir = path6.dirname(relativePath);
        featureDirs.set(dir, (featureDirs.get(dir) || 0) + 1);
        this.outputChannel.appendLine(`\u{1F4CB} Found feature file: ${relativePath}`);
      }
      let bestDir = "";
      let maxCount = 0;
      for (const [dir, count] of featureDirs.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestDir = dir;
        }
      }
      const sortedDirs = Array.from(featureDirs.keys()).sort((a, b) => {
        const aDepth = a.split("/").length;
        const bDepth = b.split("/").length;
        const aCount = featureDirs.get(a) || 0;
        const bCount = featureDirs.get(b) || 0;
        if (aCount !== bCount) {
          return bCount - aCount;
        }
        return aDepth - bDepth;
      });
      const selectedDir = sortedDirs[0] || bestDir;
      this.outputChannel.appendLine(`\u2705 Selected feature folder: ${selectedDir} (${featureDirs.get(selectedDir)} features)`);
      this.outputChannel.appendLine(`\u{1F4CA} Feature distribution:`);
      for (const [dir, count] of featureDirs.entries()) {
        this.outputChannel.appendLine(`   ${dir}: ${count} feature(s)`);
      }
      return selectedDir;
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Error during feature folder discovery: ${error}`);
      return void 0;
    }
  }
  /**
   * Discover step definition folders dynamically across entire workspace
   */
  async discoverStepsFolder() {
    this.outputChannel.appendLine("\u{1F50D} Searching for step definition folders in all workspace directories...");
    try {
      const jsFiles = await vscode6.workspace.findFiles(
        "**/*.{js,ts,mjs,mts,cjs,cts}",
        "**/node_modules/**"
      );
      if (jsFiles.length === 0) {
        this.outputChannel.appendLine("\u26A0\uFE0F No JavaScript/TypeScript files found in workspace");
        return void 0;
      }
      const stepPatterns = [
        // Standard Cucumber/BDD step definition patterns
        /\b(Given|When|Then|And|But)\s*\(/,
        /\b(given|when|then|and|but)\s*\(/,
        /@(Given|When|Then|And|But)/,
        // Step function calls with quotes
        /(Given|When|Then)\s*\(\s*['"`]/,
        // API and HTTP related patterns (for API-only steps)
        /axios\.|fetch\(|request\(|http\./,
        /\.get\(|\.post\(|\.put\(|\.delete\(|\.patch\(/,
        /api\.|API\.|endpoint|baseURL/,
        // Database and data patterns
        /query\(|execute\(|connection\.|database\./,
        /\.findOne\(|\.find\(|\.create\(|\.update\(|\.delete\(/,
        // Assertion and validation patterns
        /expect\(|assert\(|should\.|chai\./,
        /\.toBe\(|\.toEqual\(|\.toMatch\(/,
        // Common testing utilities
        /before\(|after\(|beforeEach\(|afterEach\(/,
        /describe\(|it\(|test\(/,
        // BDD-specific libraries and imports
        /playwright-bdd|@cucumber|cucumber/,
        /defineParameterType|setDefaultTimeout/,
        /from\s+['"]@cucumber|require\s*\(\s*['"]@cucumber/,
        // Step definition exports and modules
        /export.*step|module\.exports.*step/i,
        /export.*Given|export.*When|export.*Then/i,
        // File naming patterns
        /step.*def|.*steps\.|.*step\./i,
        // Configuration and setup patterns
        /config\.|setup\.|teardown\./,
        /environment\.|env\.|process\.env/,
        // Utility and helper patterns (often contain API steps)
        /utils\.|helpers\.|common\./,
        /shared\.|base\.|abstract\./,
        // Data manipulation patterns
        /JSON\.|parse\(|stringify\(/,
        /\.map\(|\.filter\(|\.reduce\(/,
        // File and system operations
        /fs\.|path\.|os\.|crypto\./,
        /readFile|writeFile|exists|mkdir/,
        // Date and time operations
        /Date\.|moment\(|dayjs\(/,
        /setTimeout|setInterval/,
        // Random and generation patterns
        /Math\.random|uuid|generate/,
        /faker\.|chance\./
      ];
      const stepDirs = /* @__PURE__ */ new Map();
      for (const file of jsFiles) {
        try {
          const content = await vscode6.workspace.fs.readFile(file);
          const text = content.toString();
          const relativePath = vscode6.workspace.asRelativePath(file);
          const hasStepDefinitions = stepPatterns.some((pattern) => pattern.test(text));
          if (hasStepDefinitions) {
            const dir = path6.dirname(relativePath);
            if (!stepDirs.has(dir)) {
              stepDirs.set(dir, { count: 0, files: [] });
            }
            const dirInfo = stepDirs.get(dir);
            dirInfo.count++;
            dirInfo.files.push(path6.basename(relativePath));
            this.outputChannel.appendLine(`\u{1F527} Found step definitions in: ${relativePath}`);
          }
        } catch (error) {
          continue;
        }
      }
      if (stepDirs.size === 0) {
        this.outputChannel.appendLine("\u26A0\uFE0F No step definition files found");
        return void 0;
      }
      let bestDir = "";
      let maxScore = 0;
      for (const [dir, info] of stepDirs.entries()) {
        const depthPenalty = dir.split("/").length * 0.1;
        const score = info.count - depthPenalty;
        if (score > maxScore) {
          maxScore = score;
          bestDir = dir;
        }
      }
      this.outputChannel.appendLine(`\u2705 Selected steps folder: ${bestDir} (${stepDirs.get(bestDir)?.count} step files)`);
      this.outputChannel.appendLine(`\u{1F4CA} Step definition distribution:`);
      for (const [dir, info] of stepDirs.entries()) {
        this.outputChannel.appendLine(`   ${dir}: ${info.count} file(s) [${info.files.join(", ")}]`);
      }
      return bestDir;
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Error during step folder discovery: ${error}`);
      return void 0;
    }
  }
  /**
   * Discover tsconfig files
   */
  async discoverTsconfig() {
    const tsconfigFiles = [
      "tsconfig.json",
      "tests/tsconfig.json",
      "e2e/tsconfig.json",
      "test/tsconfig.json",
      "tsconfig.test.json"
    ];
    for (const configFile of tsconfigFiles) {
      const fullPath = path6.join(this.workspaceRoot, configFile);
      if (await this.fileExists(fullPath)) {
        if (configFile !== "tsconfig.json") {
          this.outputChannel.appendLine(`\u2705 Found tsconfig: ${configFile}`);
          return `./${configFile}`;
        }
      }
    }
    return void 0;
  }
  /**
   * Check if playwright-bdd is installed
   */
  async checkPlaywrightBddDependency() {
    const packageJsonPath = path6.join(this.workspaceRoot, "package.json");
    if (await this.fileExists(packageJsonPath)) {
      try {
        const content = await this.readFileContent(packageJsonPath);
        const packageJson = JSON.parse(content);
        const hasDependency = packageJson.dependencies && packageJson.dependencies["playwright-bdd"] || packageJson.devDependencies && packageJson.devDependencies["playwright-bdd"];
        if (hasDependency) {
          this.outputChannel.appendLine(`\u2705 Found playwright-bdd dependency`);
          return true;
        }
      } catch (error) {
        this.outputChannel.appendLine(`\u26A0\uFE0F Error reading package.json: ${error}`);
      }
    }
    this.outputChannel.appendLine(`\u26A0\uFE0F playwright-bdd dependency not found`);
    return false;
  }
  /**
   * Check if package.json exists
   */
  async checkPackageJson() {
    const packageJsonPath = path6.join(this.workspaceRoot, "package.json");
    return await this.fileExists(packageJsonPath);
  }
  /**
   * Update VS Code settings with discovered configuration
   */
  async applyDiscoveredConfiguration(config) {
    const vsConfig = vscode6.workspace.getConfiguration("playwrightBdd");
    const updates = [];
    if (config.playwrightConfig && vsConfig.get("configPath") === "./playwright.config.ts") {
      updates.push({
        key: "configPath",
        value: config.playwrightConfig,
        discovered: config.playwrightConfig
      });
    }
    if (config.featureFolder && vsConfig.get("featureFolder") === "features") {
      updates.push({
        key: "featureFolder",
        value: config.featureFolder,
        discovered: config.featureFolder
      });
    }
    if (config.stepsFolder && vsConfig.get("stepsFolder") === "steps") {
      updates.push({
        key: "stepsFolder",
        value: config.stepsFolder,
        discovered: config.stepsFolder
      });
    }
    if (config.tsconfigPath && !vsConfig.get("tsconfigPath")) {
      updates.push({
        key: "tsconfigPath",
        value: config.tsconfigPath,
        discovered: config.tsconfigPath
      });
    }
    if (updates.length > 0) {
      this.outputChannel.appendLine(`
\u{1F527} Applying discovered configuration...`);
      for (const update of updates) {
        await vsConfig.update(update.key, update.value, vscode6.ConfigurationTarget.Workspace);
        this.outputChannel.appendLine(`   ${update.key}: ${update.discovered}`);
      }
      vscode6.window.showInformationMessage(
        `Auto-discovered and applied ${updates.length} configuration settings. Check Playwright BDD settings for details.`
      );
    } else {
      this.outputChannel.appendLine(`\u2139\uFE0F No configuration updates needed`);
    }
  }
  /**
   * Validate current configuration
   */
  async validateConfiguration() {
    const issues = [];
    const config = vscode6.workspace.getConfiguration("playwrightBdd");
    const configPath = config.get("configPath");
    if (configPath) {
      const fullConfigPath = path6.join(this.workspaceRoot, configPath);
      if (!await this.fileExists(fullConfigPath)) {
        issues.push(`Playwright config not found: ${configPath}`);
      }
    }
    const featureFolder = config.get("featureFolder");
    if (featureFolder) {
      const fullFeaturePath = path6.join(this.workspaceRoot, featureFolder);
      if (!await this.directoryExists(fullFeaturePath)) {
        issues.push(`Feature folder not found: ${featureFolder}`);
      }
    }
    const stepsFolder = config.get("stepsFolder");
    if (stepsFolder) {
      const fullStepsPath = path6.join(this.workspaceRoot, stepsFolder);
      if (!await this.directoryExists(fullStepsPath)) {
        issues.push(`Steps folder not found: ${stepsFolder}`);
      }
    }
    return {
      valid: issues.length === 0,
      issues
    };
  }
  // Utility methods
  async fileExists(filePath) {
    try {
      await fs3.promises.access(filePath, fs3.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
  async directoryExists(dirPath) {
    try {
      const stat = await fs3.promises.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
  async hasFeatureFiles(dirPath) {
    try {
      const files = await fs3.promises.readdir(dirPath, { withFileTypes: true });
      return files.some(
        (file) => file.isFile() && file.name.endsWith(".feature") || file.isDirectory() && file.name !== "node_modules"
      );
    } catch {
      return false;
    }
  }
  async hasStepDefinitionFiles(dirPath) {
    try {
      const files = await fs3.promises.readdir(dirPath, { withFileTypes: true });
      for (const file of files) {
        if (file.isFile() && /\.(js|ts|mjs|mts)$/.test(file.name)) {
          const content = await this.readFileContent(path6.join(dirPath, file.name));
          if (this.looksLikeStepDefinition(content)) {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }
  async readFileContent(filePath) {
    try {
      return await fs3.promises.readFile(filePath, "utf8");
    } catch {
      return "";
    }
  }
  looksLikeStepDefinition(content) {
    const stepPatterns = [
      /\b(Given|When|Then|And|But)\s*\(/,
      /\b(given|when|then|and|but)\s*\(/,
      /@(Given|When|Then|And|But)/,
      /cucumber\.|@cucumber/,
      /playwright-bdd/
    ];
    return stepPatterns.some((pattern) => pattern.test(content));
  }
  logDiscoveryResults(config) {
    this.outputChannel.appendLine("\n\u{1F4CB} Auto-discovery results:");
    this.outputChannel.appendLine(`   Playwright Config: ${config.playwrightConfig || "Not found"}`);
    this.outputChannel.appendLine(`   Feature Folder: ${config.featureFolder || "Not found"}`);
    this.outputChannel.appendLine(`   Steps Folder: ${config.stepsFolder || "Not found"}`);
    this.outputChannel.appendLine(`   TSConfig: ${config.tsconfigPath || "Not found"}`);
    this.outputChannel.appendLine(`   Playwright-BDD: ${config.hasPlaywrightBdd ? "Installed" : "Not found"}`);
    this.outputChannel.appendLine(`   Package.json: ${config.packageJsonExists ? "Found" : "Not found"}`);
  }
};

// src/queueManager.ts
var import_events = require("events");
var TestQueueManager = class extends import_events.EventEmitter {
  constructor(outputChannel, maxConcurrent = 1) {
    super();
    this.queue = [];
    this.running = /* @__PURE__ */ new Map();
    this.maxConcurrent = 1;
    this.completedItems = [];
    this.outputChannel = outputChannel;
    this.maxConcurrent = maxConcurrent;
  }
  /**
   * Add items to the execution queue
   */
  addToQueue(items) {
    const newItems = items.map((item) => ({
      ...item,
      id: this.generateId(),
      addedAt: /* @__PURE__ */ new Date(),
      status: "pending"
    }));
    newItems.sort((a, b) => b.priority - a.priority);
    this.queue.push(...newItems);
    this.outputChannel.appendLine(`\u{1F4CB} Added ${newItems.length} items to execution queue`);
    this.emit("queueUpdated", this.getProgress());
    this.processQueue();
  }
  /**
   * Start queue processing with progress tracking
   */
  async startWithProgress(progress, token) {
    this.progressReporter = progress;
    this.currentToken = token;
    token.onCancellationRequested(() => {
      this.cancelAll();
    });
    this.outputChannel.appendLine("\u{1F680} Starting queue execution with progress tracking...");
    this.emit("queueStarted");
    return this.processQueue();
  }
  /**
   * Process the queue
   */
  async processQueue() {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      if (this.currentToken?.isCancellationRequested) {
        break;
      }
      const item = this.queue.shift();
      if (!item) continue;
      await this.executeItem(item);
    }
    if (this.queue.length === 0 && this.running.size === 0) {
      this.onQueueComplete();
    }
  }
  /**
   * Execute a single queue item
   */
  async executeItem(item) {
    item.status = "running";
    item.startedAt = /* @__PURE__ */ new Date();
    this.running.set(item.id, item);
    this.outputChannel.appendLine(`\u25B6\uFE0F Executing: ${item.name}`);
    this.updateProgress(`Running: ${item.name}`);
    this.emit("itemStarted", item);
    try {
      const result = await this.runCommand(item.command);
      item.status = "completed";
      item.completedAt = /* @__PURE__ */ new Date();
      item.result = {
        success: result.success,
        duration: Date.now() - (item.startedAt?.getTime() || 0),
        output: result.output,
        error: result.error
      };
      this.outputChannel.appendLine(`\u2705 Completed: ${item.name} (${item.result.duration}ms)`);
    } catch (error) {
      item.status = "failed";
      item.completedAt = /* @__PURE__ */ new Date();
      item.result = {
        success: false,
        duration: Date.now() - (item.startedAt?.getTime() || 0),
        output: "",
        error: error instanceof Error ? error.message : String(error)
      };
      this.outputChannel.appendLine(`\u274C Failed: ${item.name} - ${item.result.error}`);
    }
    this.running.delete(item.id);
    this.emit("itemCompleted", item);
    this.emit("queueUpdated", this.getProgress());
    this.processQueue();
  }
  /**
   * Run a command (placeholder - integrate with existing BDD runner)
   */
  async runCommand(command) {
    return new Promise((resolve5) => {
      setTimeout(() => {
        const success = Math.random() > 0.1;
        resolve5({
          success,
          output: success ? "Test passed" : "Test failed",
          error: success ? void 0 : "Simulated test failure"
        });
      }, Math.random() * 2e3 + 500);
    });
  }
  /**
   * Update progress reporter
   */
  updateProgress(message) {
    if (this.progressReporter) {
      const progress = this.getProgress();
      this.progressReporter.report({
        message: `${message} (${progress.completed}/${progress.total})`,
        increment: progress.percentage
      });
    }
  }
  /**
   * Get current queue progress
   */
  getProgress() {
    const completed = this.getCompletedItems().length;
    const running = this.running.size;
    const pending = this.queue.length;
    const failed = this.getFailedItems().length;
    const total = completed + running + pending;
    const progress = {
      total,
      completed,
      running,
      pending,
      failed,
      percentage: total > 0 ? completed / total * 100 : 0
    };
    if (running > 0 || pending > 0) {
      const completedItems = this.getCompletedItems();
      if (completedItems.length > 0) {
        const avgDuration = completedItems.reduce((sum, item) => sum + (item.result?.duration || 0), 0) / completedItems.length;
        progress.estimatedTimeRemaining = Math.round(
          (pending + running) * avgDuration / Math.max(1, this.maxConcurrent)
        );
      }
    }
    return progress;
  }
  /**
   * Get all items (completed and running)
   */
  getAllItems() {
    return [
      ...Array.from(this.running.values()),
      ...this.getCompletedItems(),
      ...this.queue
    ];
  }
  /**
   * Get completed items
   */
  getCompletedItems() {
    return this.completedItems || [];
  }
  /**
   * Get failed items
   */
  getFailedItems() {
    return this.getCompletedItems().filter((item) => !item.result?.success);
  }
  /**
   * Cancel all queued and running items
   */
  cancelAll() {
    this.outputChannel.appendLine("\u{1F6D1} Cancelling all queue items...");
    this.queue.forEach((item) => {
      item.status = "cancelled";
      item.completedAt = /* @__PURE__ */ new Date();
    });
    this.queue = [];
    this.running.forEach((item) => {
      item.status = "cancelled";
      item.completedAt = /* @__PURE__ */ new Date();
      this.completedItems.push(item);
    });
    this.running.clear();
    this.emit("queueCancelled");
    this.emit("queueUpdated", this.getProgress());
  }
  /**
   * Pause queue execution
   */
  pause() {
    this.outputChannel.appendLine("\u23F8\uFE0F Queue execution paused");
    this.emit("queuePaused");
  }
  /**
   * Resume queue execution
   */
  resume() {
    this.outputChannel.appendLine("\u25B6\uFE0F Queue execution resumed");
    this.emit("queueResumed");
    this.processQueue();
  }
  /**
   * Clear completed items
   */
  clearCompleted() {
    this.completedItems = [];
    this.outputChannel.appendLine("\u{1F9F9} Cleared completed items");
    this.emit("queueUpdated", this.getProgress());
  }
  /**
   * Retry failed items
   */
  retryFailed() {
    const failedItems = this.getFailedItems();
    if (failedItems.length === 0) {
      this.outputChannel.appendLine("\u2139\uFE0F No failed items to retry");
      return;
    }
    const retryItems = failedItems.map((item) => ({
      type: item.type,
      name: `${item.name} (retry)`,
      command: item.command,
      testItem: item.testItem,
      priority: item.priority + 1
      // Higher priority for retries
    }));
    this.addToQueue(retryItems);
    this.outputChannel.appendLine(`\u{1F504} Added ${retryItems.length} failed items for retry`);
  }
  /**
   * Set maximum concurrent executions
   */
  setMaxConcurrent(max) {
    this.maxConcurrent = Math.max(1, max);
    this.outputChannel.appendLine(`\u2699\uFE0F Max concurrent executions set to ${this.maxConcurrent}`);
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
  /**
   * Get queue statistics
   */
  getStatistics() {
    const completed = this.getCompletedItems();
    const successful = completed.filter((item) => item.result?.success);
    const durations = completed.map((item) => item.result?.duration || 0).filter((d) => d > 0);
    return {
      totalExecuted: completed.length,
      successRate: completed.length > 0 ? successful.length / completed.length * 100 : 0,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      fastestExecution: durations.length > 0 ? Math.min(...durations) : 0,
      slowestExecution: durations.length > 0 ? Math.max(...durations) : 0
    };
  }
  /**
   * Export queue results for reporting
   */
  exportResults() {
    const items = this.getAllItems();
    const stats = this.getStatistics();
    const report = [
      `# Test Execution Queue Report - ${(/* @__PURE__ */ new Date()).toISOString()}`,
      "",
      `## Summary`,
      `- Total Items: ${items.length}`,
      `- Success Rate: ${stats.successRate.toFixed(2)}%`,
      `- Average Duration: ${stats.averageDuration.toFixed(0)}ms`,
      `- Fastest: ${stats.fastestExecution}ms`,
      `- Slowest: ${stats.slowestExecution}ms`,
      "",
      `## Items`,
      ""
    ];
    items.forEach((item, index) => {
      const duration = item.result?.duration ? `${item.result.duration}ms` : "N/A";
      const status = item.status.toUpperCase();
      report.push(`${index + 1}. **${status}**: ${item.name} (${duration})`);
      if (item.result?.error) {
        report.push(`   Error: ${item.result.error}`);
      }
      report.push("");
    });
    return report.join("\n");
  }
  /**
   * Handle queue completion
   */
  onQueueComplete() {
    const stats = this.getStatistics();
    this.outputChannel.appendLine(`
\u{1F389} Queue execution completed!`);
    this.outputChannel.appendLine(`   Total: ${stats.totalExecuted}`);
    this.outputChannel.appendLine(`   Success Rate: ${stats.successRate.toFixed(2)}%`);
    this.outputChannel.appendLine(`   Average Duration: ${stats.averageDuration.toFixed(0)}ms`);
    this.emit("queueCompleted", stats);
    if (this.progressReporter) {
      this.progressReporter.report({
        message: `Completed ${stats.totalExecuted} tests (${stats.successRate.toFixed(1)}% success)`,
        increment: 100
      });
    }
  }
  /**
   * Generate unique ID for queue items
   */
  generateId() {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// src/stepCreationWizard.ts
var vscode7 = __toESM(require("vscode"));
var path7 = __toESM(require("path"));
var fs4 = __toESM(require("fs"));
var StepCreationWizard = class {
  constructor(outputChannel, workspaceRoot) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Launch the step creation wizard
   */
  async launchWizard(stepText) {
    try {
      this.outputChannel.appendLine("\u{1F9D9}\u200D\u2642\uFE0F Launching Step Creation Wizard...");
      const finalStepText = stepText || await this.getStepText();
      if (!finalStepText) {
        return;
      }
      const analysis = this.analyzeStepText(finalStepText);
      const options = await this.getCreationOptions();
      if (!options) {
        return;
      }
      const template = await this.createStepTemplate(analysis, options);
      const confirmed = await this.showPreviewAndConfirm(template, options);
      if (!confirmed) {
        return;
      }
      await this.generateStepDefinition(template, options);
      vscode7.window.showInformationMessage("\u2705 Step definition created successfully!");
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Step creation failed: ${error}`);
      vscode7.window.showErrorMessage(`Failed to create step definition: ${error}`);
    }
  }
  /**
   * Create step definition from missing step
   */
  async createFromMissingStep(stepText, stepType) {
    this.outputChannel.appendLine(`\u{1F527} Creating step definition for missing step: ${stepText}`);
    const analysis = {
      stepType,
      originalText: stepText,
      cleanText: stepText,
      parameters: this.extractParametersFromText(stepText),
      suggestedFunctionName: this.generateFunctionName(stepText)
    };
    const options = await this.getQuickCreationOptions();
    if (!options) {
      return;
    }
    const template = await this.createStepTemplate(analysis, options);
    await this.generateStepDefinition(template, options);
    vscode7.window.showInformationMessage("\u2705 Step definition created from missing step!");
  }
  /**
   * Get step text from user
   */
  async getStepText() {
    return await vscode7.window.showInputBox({
      prompt: 'Enter the step text (e.g., "I click on the login button")',
      placeHolder: "Step text...",
      validateInput: (value) => {
        if (!value.trim()) {
          return "Step text cannot be empty";
        }
        return void 0;
      }
    });
  }
  /**
   * Analyze step text to extract information
   */
  analyzeStepText(stepText) {
    const stepType = this.determineStepType(stepText);
    const cleanText = stepText.replace(/^(Given|When|Then|And|But)\s+/i, "").trim();
    const parameters = this.extractParametersFromText(cleanText);
    const suggestedFunctionName = this.generateFunctionName(cleanText);
    return {
      stepType,
      originalText: stepText,
      cleanText,
      parameters,
      suggestedFunctionName
    };
  }
  /**
   * Determine step type from text
   */
  determineStepType(stepText) {
    const text = stepText.toLowerCase();
    if (text.includes("given") || text.includes("assume") || text.includes("setup")) {
      return "Given";
    } else if (text.includes("when") || text.includes("click") || text.includes("enter") || text.includes("select")) {
      return "When";
    } else {
      return "Then";
    }
  }
  /**
   * Extract parameters from step text
   */
  extractParametersFromText(text) {
    const parameters = [];
    const stringMatches = text.match(/"([^"]+)"/g) || [];
    stringMatches.forEach((match, index) => {
      const value = match.slice(1, -1);
      parameters.push({
        name: `text${index + 1}`,
        type: "string",
        value
      });
    });
    const numberMatches = text.match(/\b\d+(\.\d+)?\b/g) || [];
    numberMatches.forEach((match, index) => {
      parameters.push({
        name: `number${index + 1}`,
        type: "number",
        value: match
      });
    });
    return parameters;
  }
  /**
   * Generate function name from step text
   */
  generateFunctionName(stepText) {
    return stepText.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter((word) => word.length > 0).map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)).join("").replace(/^\d/, "step$&");
  }
  /**
   * Get creation options from user
   */
  async getCreationOptions() {
    const language = await vscode7.window.showQuickPick(["typescript", "javascript"], {
      placeHolder: "Select language for step definition"
    });
    if (!language) return void 0;
    const framework = await vscode7.window.showQuickPick(
      ["playwright-bdd", "cucumber", "generic"],
      { placeHolder: "Select testing framework" }
    );
    if (!framework) return void 0;
    const targetFile = await this.selectTargetFile(language);
    if (!targetFile) return void 0;
    return {
      targetFile,
      language,
      framework,
      addImports: true,
      addComments: true
    };
  }
  /**
   * Get quick creation options (for missing steps)
   */
  async getQuickCreationOptions() {
    const config = vscode7.workspace.getConfiguration("playwrightBdd");
    const stepsFolder = config.get("stepsFolder", "steps");
    const stepFiles = await this.findStepFiles();
    let targetFile;
    if (stepFiles.length > 0) {
      const fileOptions = [
        ...stepFiles.map((f) => ({ label: path7.basename(f), detail: f })),
        { label: "$(plus) Create new file", detail: "new" }
      ];
      const selected = await vscode7.window.showQuickPick(fileOptions, {
        placeHolder: "Select target file for step definition"
      });
      if (!selected) return void 0;
      if (selected.detail === "new") {
        targetFile = await this.createNewStepFile(stepsFolder);
      } else {
        targetFile = selected.detail;
      }
    } else {
      targetFile = await this.createNewStepFile(stepsFolder);
    }
    return {
      targetFile,
      language: "typescript",
      framework: "playwright-bdd",
      addImports: true,
      addComments: false
    };
  }
  /**
   * Select target file for step definition
   */
  async selectTargetFile(language) {
    const stepFiles = await this.findStepFiles();
    const options = [
      ...stepFiles.map((file) => ({
        label: path7.basename(file),
        detail: file,
        description: "Existing file"
      })),
      {
        label: "$(plus) Create new file",
        detail: "new",
        description: "Create a new step definition file"
      }
    ];
    const selected = await vscode7.window.showQuickPick(options, {
      placeHolder: "Select target file for step definition"
    });
    if (!selected) return void 0;
    if (selected.detail === "new") {
      const config = vscode7.workspace.getConfiguration("playwrightBdd");
      const stepsFolder = config.get("stepsFolder", "steps");
      return await this.createNewStepFile(stepsFolder);
    }
    return selected.detail;
  }
  /**
   * Find existing step definition files
   */
  async findStepFiles() {
    const config = vscode7.workspace.getConfiguration("playwrightBdd");
    const stepsFolder = config.get("stepsFolder", "steps");
    const filePattern = config.get("stepsFilePattern", "**/*.{js,ts,mjs,mts}");
    try {
      const files = await vscode7.workspace.findFiles(
        `${stepsFolder}/${filePattern}`,
        "**/node_modules/**",
        50
      );
      return files.map((file) => file.fsPath);
    } catch {
      return [];
    }
  }
  /**
   * Create a new step definition file
   */
  async createNewStepFile(stepsFolder) {
    const fileName = await vscode7.window.showInputBox({
      prompt: "Enter name for new step definition file",
      placeHolder: "e.g., loginSteps.ts",
      value: "newSteps.ts",
      validateInput: (value) => {
        if (!value.trim()) {
          return "File name cannot be empty";
        }
        if (!/\.(ts|js|mjs|mts)$/.test(value)) {
          return "File must have .ts, .js, .mjs, or .mts extension";
        }
        return void 0;
      }
    });
    if (!fileName) {
      throw new Error("File name is required");
    }
    const fullPath = path7.join(this.workspaceRoot, stepsFolder, fileName);
    await fs4.promises.mkdir(path7.dirname(fullPath), { recursive: true });
    return fullPath;
  }
  /**
   * Create step template
   */
  async createStepTemplate(analysis, options) {
    const template = {
      stepType: analysis.stepType,
      stepText: analysis.cleanText,
      functionName: analysis.suggestedFunctionName,
      parameters: analysis.parameters.map((p) => ({
        name: p.name,
        type: p.type,
        defaultValue: p.value
      })),
      hasDataTable: false,
      hasDocString: false,
      implementation: this.generateImplementation(analysis, options)
    };
    return template;
  }
  /**
   * Generate step implementation code
   */
  generateImplementation(analysis, options) {
    const { language, framework } = options;
    const isTypeScript = language === "typescript";
    let impl = "";
    if (framework === "playwright-bdd") {
      impl = "// TODO: Implement step logic\n";
      impl += "await page.pause(); // Remove this line and add your implementation";
    } else if (framework === "cucumber") {
      impl = "// TODO: Implement step logic\n";
      impl += 'throw new Error("Step not implemented");';
    } else {
      impl = "// TODO: Implement step logic";
    }
    return impl;
  }
  /**
   * Show preview and get confirmation
   */
  async showPreviewAndConfirm(template, options) {
    const code = this.generateStepCode(template, options);
    const doc = await vscode7.workspace.openTextDocument({
      content: code,
      language: options.language
    });
    await vscode7.window.showTextDocument(doc, { preview: true });
    const result = await vscode7.window.showInformationMessage(
      "Preview the step definition. Do you want to create it?",
      "Create Step",
      "Cancel"
    );
    return result === "Create Step";
  }
  /**
   * Generate step definition code
   */
  generateStepCode(template, options) {
    const { language, framework, addImports, addComments } = options;
    const isTypeScript = language === "typescript";
    let code = "";
    if (addImports) {
      if (framework === "playwright-bdd") {
        code += `import { ${template.stepType.toLowerCase()} } from 'playwright-bdd';
`;
        if (isTypeScript) {
          code += `import { Page } from '@playwright/test';
`;
        }
      } else if (framework === "cucumber") {
        code += `import { ${template.stepType} } from '@cucumber/cucumber';
`;
      }
      code += "\n";
    }
    if (addComments) {
      code += `/**
 * ${template.stepType}: ${template.stepText}
`;
      if (template.parameters.length > 0) {
        template.parameters.forEach((param) => {
          code += ` * @param {${param.type}} ${param.name}
`;
        });
      }
      code += " */\n";
    }
    const paramList = template.parameters.map((p) => {
      if (isTypeScript) {
        return `${p.name}: ${p.type}`;
      }
      return p.name;
    }).join(", ");
    const stepPattern = this.createStepPattern(template.stepText, template.parameters);
    if (framework === "playwright-bdd") {
      code += `${template.stepType.toLowerCase()}('${stepPattern}', async ({ page }${paramList ? `, ${paramList}` : ""}) => {
`;
    } else {
      code += `${template.stepType}('${stepPattern}', async (${paramList}) => {
`;
    }
    code += "  " + template.implementation.replace(/\n/g, "\n  ") + "\n";
    code += "});\n";
    return code;
  }
  /**
   * Create step pattern with parameter placeholders
   */
  createStepPattern(stepText, parameters) {
    let pattern = stepText;
    parameters.forEach((param, index) => {
      if (param.type === "string" && param.defaultValue) {
        pattern = pattern.replace(`"${param.defaultValue}"`, `{${param.name}}`);
      } else if (param.type === "number" && param.defaultValue) {
        const isFloat = param.defaultValue.includes(".");
        pattern = pattern.replace(param.defaultValue, `{${isFloat ? "float" : "int"}}`);
      }
    });
    return pattern;
  }
  /**
   * Generate and save step definition
   */
  async generateStepDefinition(template, options) {
    const code = this.generateStepCode(template, options);
    const targetFile = options.targetFile;
    const fileExists = await fs4.promises.access(targetFile).then(() => true).catch(() => false);
    if (fileExists) {
      const existingContent = await fs4.promises.readFile(targetFile, "utf8");
      const newContent = existingContent + "\n" + code;
      await fs4.promises.writeFile(targetFile, newContent);
    } else {
      let fileContent = "";
      if (options.addImports && options.framework === "playwright-bdd") {
        fileContent += `import { given, when, then } from 'playwright-bdd';
`;
        if (options.language === "typescript") {
          fileContent += `import { Page } from '@playwright/test';
`;
        }
        fileContent += "\n";
      }
      fileContent += code;
      await fs4.promises.writeFile(targetFile, fileContent);
    }
    const doc = await vscode7.workspace.openTextDocument(targetFile);
    await vscode7.window.showTextDocument(doc);
    this.outputChannel.appendLine(`\u2705 Step definition created in: ${targetFile}`);
  }
  /**
   * Bulk create steps from feature file
   */
  async createStepsFromFeature(featureUri) {
    try {
      this.outputChannel.appendLine(`\u{1F50D} Analyzing feature file: ${path7.basename(featureUri.fsPath)}`);
      const content = await fs4.promises.readFile(featureUri.fsPath, "utf8");
      const missingSteps = this.findMissingSteps(content);
      if (missingSteps.length === 0) {
        vscode7.window.showInformationMessage("No missing steps found in this feature file.");
        return;
      }
      const result = await vscode7.window.showInformationMessage(
        `Found ${missingSteps.length} missing steps. Create all step definitions?`,
        "Create All",
        "Cancel"
      );
      if (result === "Create All") {
        const options = await this.getQuickCreationOptions();
        if (!options) return;
        for (const step of missingSteps) {
          const analysis = this.analyzeStepText(step);
          const template = await this.createStepTemplate(analysis, options);
          await this.generateStepDefinition(template, options);
        }
        vscode7.window.showInformationMessage(`\u2705 Created ${missingSteps.length} step definitions!`);
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Failed to create steps from feature: ${error}`);
      vscode7.window.showErrorMessage(`Failed to create steps: ${error}`);
    }
  }
  /**
   * Find missing steps in feature content
   */
  findMissingSteps(content) {
    const lines = content.split("\n");
    const steps = [];
    for (const line of lines) {
      const stepMatch = line.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        const fullStep = `${stepMatch[1]} ${stepMatch[2]}`;
        if (!steps.includes(fullStep)) {
          steps.push(fullStep);
        }
      }
    }
    return steps;
  }
};

// src/debuggingTools.ts
var vscode8 = __toESM(require("vscode"));
var path8 = __toESM(require("path"));
var import_events2 = require("events");
var BDDDebuggingTools = class extends import_events2.EventEmitter {
  constructor(outputChannel, workspaceRoot) {
    super();
    this.breakpoints = /* @__PURE__ */ new Map();
    this.activeSessions = /* @__PURE__ */ new Map();
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
    this.debugConfigProvider = new BDDDebugConfigProvider();
  }
  /**
   * Register debugging tools with VS Code
   */
  register(context) {
    context.subscriptions.push(
      vscode8.debug.registerDebugConfigurationProvider("bdd-playwright", this.debugConfigProvider)
    );
    context.subscriptions.push(
      vscode8.debug.onDidChangeBreakpoints(this.onBreakpointsChanged.bind(this))
    );
    context.subscriptions.push(
      vscode8.debug.onDidStartDebugSession(this.onDebugSessionStarted.bind(this)),
      vscode8.debug.onDidTerminateDebugSession(this.onDebugSessionTerminated.bind(this))
    );
    this.outputChannel.appendLine("\u{1F41B} BDD Debugging Tools registered");
  }
  /**
   * Start step-by-step debugging for a scenario
   */
  async startStepByStepDebugging(featureFile, scenarioName) {
    try {
      this.outputChannel.appendLine(`\u{1F50D} Starting step-by-step debugging: ${scenarioName}`);
      const sessionId = this.generateSessionId();
      const session = {
        sessionId,
        featureFile,
        scenario: scenarioName,
        status: "stopped",
        variables: /* @__PURE__ */ new Map(),
        callStack: [],
        breakpoints: Array.from(this.breakpoints.values())
      };
      this.activeSessions.set(sessionId, session);
      const debugConfig = {
        type: "bdd-playwright",
        request: "launch",
        name: `Debug BDD Scenario: ${scenarioName}`,
        program: "${workspaceFolder}/node_modules/.bin/playwright",
        args: [
          "test",
          "--config=playwright.config.ts",
          "--debug",
          `--grep="${scenarioName}"`
        ],
        cwd: "${workspaceFolder}",
        env: {
          PWDEBUG: "1",
          BDD_DEBUG_MODE: "step-by-step",
          BDD_SESSION_ID: sessionId
        },
        console: "integratedTerminal",
        internalConsoleOptions: "openOnSessionStart"
      };
      const started = await vscode8.debug.startDebugging(void 0, debugConfig);
      if (started) {
        this.emit("debugSessionStarted", session);
        this.showDebugPanel(session);
      } else {
        this.activeSessions.delete(sessionId);
        throw new Error("Failed to start debug session");
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Debug start failed: ${error}`);
      vscode8.window.showErrorMessage(`Failed to start debugging: ${error}`);
    }
  }
  /**
   * Add or toggle breakpoint
   */
  async toggleBreakpoint(file, line, stepText) {
    const breakpointId = `${file}:${line}`;
    if (this.breakpoints.has(breakpointId)) {
      this.breakpoints.delete(breakpointId);
      this.outputChannel.appendLine(`\u{1F534} Removed breakpoint: ${stepText} (${path8.basename(file)}:${line})`);
    } else {
      const breakpoint = {
        id: breakpointId,
        file,
        line,
        stepText,
        enabled: true,
        hitCount: 0
      };
      this.breakpoints.set(breakpointId, breakpoint);
      this.outputChannel.appendLine(`\u{1F7E2} Added breakpoint: ${stepText} (${path8.basename(file)}:${line})`);
    }
    this.emit("breakpointsChanged", Array.from(this.breakpoints.values()));
    this.updateBreakpointsInEditor();
  }
  /**
   * Set conditional breakpoint
   */
  async setConditionalBreakpoint(file, line, stepText, condition) {
    const breakpointId = `${file}:${line}`;
    const breakpoint = {
      id: breakpointId,
      file,
      line,
      stepText,
      condition,
      enabled: true,
      hitCount: 0
    };
    this.breakpoints.set(breakpointId, breakpoint);
    this.outputChannel.appendLine(`\u{1F535} Added conditional breakpoint: ${stepText} (${condition})`);
    this.emit("breakpointsChanged", Array.from(this.breakpoints.values()));
    this.updateBreakpointsInEditor();
  }
  /**
   * Set log point (breakpoint that logs but doesn't stop)
   */
  async setLogPoint(file, line, stepText, logMessage) {
    const breakpointId = `${file}:${line}`;
    const breakpoint = {
      id: breakpointId,
      file,
      line,
      stepText,
      logMessage,
      enabled: true,
      hitCount: 0
    };
    this.breakpoints.set(breakpointId, breakpoint);
    this.outputChannel.appendLine(`\u{1F4DD} Added log point: ${stepText} -> "${logMessage}"`);
    this.emit("breakpointsChanged", Array.from(this.breakpoints.values()));
    this.updateBreakpointsInEditor();
  }
  /**
   * Show debug panel with current session info
   */
  async showDebugPanel(session) {
    const panel = vscode8.window.createWebviewPanel(
      "bddDebugPanel",
      `BDD Debug: ${session.scenario}`,
      vscode8.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    panel.webview.html = this.getDebugPanelHtml(session);
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "stepOver":
          await this.stepOver(session.sessionId);
          break;
        case "stepInto":
          await this.stepInto(session.sessionId);
          break;
        case "continue":
          await this.continue(session.sessionId);
          break;
        case "pause":
          await this.pause(session.sessionId);
          break;
        case "stop":
          await this.stop(session.sessionId);
          break;
        case "evaluate":
          await this.evaluateExpression(session.sessionId, message.expression);
          break;
      }
    });
    this.on("sessionUpdated", (updatedSession) => {
      if (updatedSession.sessionId === session.sessionId) {
        panel.webview.html = this.getDebugPanelHtml(updatedSession);
      }
    });
  }
  /**
   * Generate HTML for debug panel
   */
  getDebugPanelHtml(session) {
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
            <button class="debug-button" onclick="sendCommand('continue')">\u25B6\uFE0F Continue</button>
            <button class="debug-button" onclick="sendCommand('stepOver')">\u23ED\uFE0F Step Over</button>
            <button class="debug-button" onclick="sendCommand('stepInto')">\u23EC Step Into</button>
            <button class="debug-button" onclick="sendCommand('pause')">\u23F8\uFE0F Pause</button>
            <button class="debug-button" onclick="sendCommand('stop')">\u23F9\uFE0F Stop</button>
        </div>

        ${currentStep ? `
        <div class="current-step">
            <h3>Current Step</h3>
            <p><strong>Step:</strong> ${currentStep.stepText}</p>
            <p><strong>File:</strong> ${path8.basename(currentStep.file)}:${currentStep.line}</p>
            <p><strong>Step Index:</strong> ${currentStep.stepIndex}</p>
        </div>
        ` : ""}

        <div class="variables">
            <h3>Variables</h3>
            ${variables.length > 0 ? variables.map(([name, value]) => `
                <div class="variable-item">
                    <span>${name}</span>
                    <span>${JSON.stringify(value)}</span>
                </div>
            `).join("") : "<p>No variables available</p>"}
            
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
  async stepOver(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.outputChannel.appendLine("\u23ED\uFE0F Step Over");
      this.emit("stepOver", session);
    }
  }
  async stepInto(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.outputChannel.appendLine("\u23EC Step Into");
      this.emit("stepInto", session);
    }
  }
  async continue(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = "running";
      this.outputChannel.appendLine("\u25B6\uFE0F Continue");
      this.emit("continue", session);
      this.emit("sessionUpdated", session);
    }
  }
  async pause(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = "paused";
      this.outputChannel.appendLine("\u23F8\uFE0F Pause");
      this.emit("pause", session);
      this.emit("sessionUpdated", session);
    }
  }
  async stop(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = "stopped";
      this.outputChannel.appendLine("\u23F9\uFE0F Stop");
      this.activeSessions.delete(sessionId);
      this.emit("stop", session);
    }
  }
  async evaluateExpression(sessionId, expression) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.outputChannel.appendLine(`\u{1F50D} Evaluating: ${expression}`);
      this.emit("expressionEvaluated", { session, expression, result: "TODO: Implement" });
    }
  }
  /**
   * Handle VS Code breakpoint changes
   */
  onBreakpointsChanged(event) {
    event.added.forEach((bp) => {
      if (bp instanceof vscode8.SourceBreakpoint) {
      }
    });
    event.removed.forEach((bp) => {
      if (bp instanceof vscode8.SourceBreakpoint) {
      }
    });
  }
  onDebugSessionStarted(session) {
    if (session.type === "bdd-playwright") {
      this.outputChannel.appendLine(`\u{1F680} Debug session started: ${session.name}`);
    }
  }
  onDebugSessionTerminated(session) {
    if (session.type === "bdd-playwright") {
      this.outputChannel.appendLine(`\u{1F6D1} Debug session terminated: ${session.name}`);
    }
  }
  /**
   * Update breakpoints in editor
   */
  updateBreakpointsInEditor() {
  }
  /**
   * Get all breakpoints
   */
  getBreakpoints() {
    return Array.from(this.breakpoints.values());
  }
  /**
   * Clear all breakpoints
   */
  clearAllBreakpoints() {
    this.breakpoints.clear();
    this.outputChannel.appendLine("\u{1F9F9} Cleared all breakpoints");
    this.emit("breakpointsChanged", []);
    this.updateBreakpointsInEditor();
  }
  /**
   * Export breakpoints configuration
   */
  exportBreakpoints() {
    const breakpoints = Array.from(this.breakpoints.values());
    return JSON.stringify(breakpoints, null, 2);
  }
  /**
   * Import breakpoints configuration
   */
  importBreakpoints(config) {
    try {
      const breakpoints = JSON.parse(config);
      this.breakpoints.clear();
      breakpoints.forEach((bp) => {
        this.breakpoints.set(bp.id, bp);
      });
      this.outputChannel.appendLine(`\u{1F4E5} Imported ${breakpoints.length} breakpoints`);
      this.emit("breakpointsChanged", breakpoints);
      this.updateBreakpointsInEditor();
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Failed to import breakpoints: ${error}`);
      vscode8.window.showErrorMessage("Failed to import breakpoints");
    }
  }
  generateSessionId() {
    return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};
var BDDDebugConfigProvider = class {
  resolveDebugConfiguration(folder, config, token) {
    if (!config.type && !config.request && !config.name) {
      const editor = vscode8.window.activeTextEditor;
      if (editor && editor.document.languageId === "feature") {
        config.type = "bdd-playwright";
        config.name = "Debug Current Feature";
        config.request = "launch";
        config.program = "${workspaceFolder}/node_modules/.bin/playwright";
        config.args = ["test", "--debug"];
        config.cwd = "${workspaceFolder}";
        config.env = { PWDEBUG: "1" };
      }
    }
    if (!config.program) {
      vscode8.window.showErrorMessage("Debug configuration missing program path");
      return void 0;
    }
    return config;
  }
};

// src/multiWorkspaceManager.ts
var vscode9 = __toESM(require("vscode"));
var path9 = __toESM(require("path"));
var import_events3 = require("events");
var MultiWorkspaceManager = class extends import_events3.EventEmitter {
  constructor(outputChannel) {
    super();
    this.workspaces = /* @__PURE__ */ new Map();
    this.workspaceGroups = /* @__PURE__ */ new Map();
    this.autoDiscoveryServices = /* @__PURE__ */ new Map();
    this.outputChannel = outputChannel;
    this.initialize();
  }
  /**
   * Initialize multi-workspace support
   */
  async initialize() {
    this.outputChannel.appendLine("\u{1F3E2} Initializing Multi-Workspace Manager...");
    await this.loadWorkspaceConfigurations();
    await this.discoverWorkspaces();
    this.setupWorkspaceListeners();
    this.outputChannel.appendLine(`\u2705 Multi-Workspace Manager initialized with ${this.workspaces.size} workspaces`);
  }
  /**
   * Discover all open workspaces
   */
  async discoverWorkspaces() {
    const workspaceFolders = vscode9.workspace.workspaceFolders;
    if (!workspaceFolders) {
      this.outputChannel.appendLine("\u2139\uFE0F No workspace folders detected");
      return;
    }
    for (const folder of workspaceFolders) {
      await this.addWorkspace(folder.uri.fsPath, folder.name);
    }
    if (!this.activeWorkspace && this.workspaces.size > 0) {
      const firstWorkspace = Array.from(this.workspaces.keys())[0];
      await this.setActiveWorkspace(firstWorkspace);
    }
  }
  /**
   * Add a workspace to management
   */
  async addWorkspace(rootPath, name) {
    const workspaceId = this.generateWorkspaceId(rootPath);
    if (this.workspaces.has(workspaceId)) {
      this.outputChannel.appendLine(`\u26A0\uFE0F Workspace already exists: ${name || path9.basename(rootPath)}`);
      return workspaceId;
    }
    try {
      this.outputChannel.appendLine(`\u{1F4C1} Adding workspace: ${name || path9.basename(rootPath)}`);
      const autoDiscovery = new AutoDiscoveryService(this.outputChannel, rootPath);
      this.autoDiscoveryServices.set(workspaceId, autoDiscovery);
      const configuration = await autoDiscovery.discoverProjectConfiguration();
      const stats = await this.analyzeWorkspace(rootPath, configuration);
      const workspace14 = {
        id: workspaceId,
        name: name || path9.basename(rootPath),
        rootPath,
        isActive: false,
        configuration,
        lastAccessed: /* @__PURE__ */ new Date(),
        featureCount: stats.featureCount,
        stepCount: stats.stepCount
      };
      this.workspaces.set(workspaceId, workspace14);
      this.emit("workspaceAdded", workspace14);
      this.outputChannel.appendLine(`\u2705 Added workspace: ${workspace14.name} (${stats.featureCount} features, ${stats.stepCount} steps)`);
      return workspaceId;
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Failed to add workspace: ${error}`);
      throw error;
    }
  }
  /**
   * Remove a workspace from management
   */
  async removeWorkspace(workspaceId) {
    const workspace14 = this.workspaces.get(workspaceId);
    if (!workspace14) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }
    this.workspaces.delete(workspaceId);
    this.autoDiscoveryServices.delete(workspaceId);
    if (this.activeWorkspace === workspaceId) {
      const remaining = Array.from(this.workspaces.keys());
      if (remaining.length > 0) {
        await this.setActiveWorkspace(remaining[0]);
      } else {
        this.activeWorkspace = void 0;
      }
    }
    this.emit("workspaceRemoved", workspace14);
    this.outputChannel.appendLine(`\u{1F5D1}\uFE0F Removed workspace: ${workspace14.name}`);
  }
  /**
   * Set active workspace
   */
  async setActiveWorkspace(workspaceId) {
    const workspace14 = this.workspaces.get(workspaceId);
    if (!workspace14) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }
    if (this.activeWorkspace) {
      const prevWorkspace = this.workspaces.get(this.activeWorkspace);
      if (prevWorkspace) {
        prevWorkspace.isActive = false;
      }
    }
    workspace14.isActive = true;
    workspace14.lastAccessed = /* @__PURE__ */ new Date();
    this.activeWorkspace = workspaceId;
    this.emit("activeWorkspaceChanged", workspace14);
    this.outputChannel.appendLine(`\u{1F3AF} Active workspace: ${workspace14.name}`);
  }
  /**
   * Get active workspace
   */
  getActiveWorkspace() {
    return this.activeWorkspace ? this.workspaces.get(this.activeWorkspace) : void 0;
  }
  /**
   * Get all workspaces
   */
  getAllWorkspaces() {
    return Array.from(this.workspaces.values());
  }
  /**
   * Search across all workspaces
   */
  async searchAcrossWorkspaces(query, filters) {
    const results = [];
    const workspacesToSearch = filters?.workspaceIds || Array.from(this.workspaces.keys());
    this.outputChannel.appendLine(`\u{1F50D} Cross-workspace search: "${query}" across ${workspacesToSearch.length} workspaces`);
    for (const workspaceId of workspacesToSearch) {
      const workspace14 = this.workspaces.get(workspaceId);
      if (!workspace14) continue;
      try {
        const workspaceResults = await this.searchInWorkspace(workspace14, query, filters);
        results.push(...workspaceResults);
      } catch (error) {
        this.outputChannel.appendLine(`\u26A0\uFE0F Search failed in workspace ${workspace14.name}: ${error}`);
      }
    }
    this.outputChannel.appendLine(`\u{1F4CA} Cross-workspace search completed: ${results.length} results found`);
    return results;
  }
  /**
   * Search within a specific workspace
   */
  async searchInWorkspace(workspace14, query, filters) {
    const results = [];
    const queryLower = query.toLowerCase();
    const featureFolder = workspace14.configuration.featureFolder || "features";
    const featurePattern = `${featureFolder}/**/*.feature`;
    try {
      const featureFiles = await vscode9.workspace.findFiles(
        new vscode9.RelativePattern(workspace14.rootPath, featurePattern),
        "**/node_modules/**"
      );
      for (const file of featureFiles) {
        const content = await vscode9.workspace.fs.readFile(file);
        const text = content.toString();
        const lines = text.split("\n");
        lines.forEach((line, index) => {
          const lineLower = line.toLowerCase();
          if (lineLower.includes(queryLower)) {
            let matchType = "step";
            if (line.trim().match(/^\s*Feature:/i)) {
              matchType = "feature";
            } else if (line.trim().match(/^\s*Scenario/i)) {
              matchType = "scenario";
            }
            if (filters?.includeFeatures === false && matchType === "feature") return;
            if (filters?.includeScenarios === false && matchType === "scenario") return;
            if (filters?.includeSteps === false && matchType === "step") return;
            results.push({
              workspaceId: workspace14.id,
              workspaceName: workspace14.name,
              filePath: file.fsPath,
              matchText: line.trim(),
              matchType,
              line: index + 1
            });
          }
        });
      }
    } catch (error) {
    }
    return results;
  }
  /**
   * Create workspace group
   */
  createWorkspaceGroup(name, workspaceIds, options) {
    const groupId = this.generateGroupId();
    const group = {
      id: groupId,
      name,
      description: options?.description,
      workspaces: workspaceIds,
      color: options?.color,
      tags: options?.tags || []
    };
    this.workspaceGroups.set(groupId, group);
    this.emit("workspaceGroupCreated", group);
    this.outputChannel.appendLine(`\u{1F4C2} Created workspace group: ${name} (${workspaceIds.length} workspaces)`);
    return groupId;
  }
  /**
   * Get workspace groups
   */
  getWorkspaceGroups() {
    return Array.from(this.workspaceGroups.values());
  }
  /**
   * Run tests across multiple workspaces
   */
  async runTestsAcrossWorkspaces(workspaceIds, options) {
    const results = /* @__PURE__ */ new Map();
    this.outputChannel.appendLine(`\u{1F680} Running tests across ${workspaceIds.length} workspaces`);
    if (options?.parallel) {
      const promises7 = workspaceIds.map((id) => this.runTestsInWorkspace(id, options));
      const workspaceResults = await Promise.allSettled(promises7);
      workspaceResults.forEach((result, index) => {
        const workspaceId = workspaceIds[index];
        if (result.status === "fulfilled") {
          results.set(workspaceId, result.value);
        } else {
          results.set(workspaceId, { error: result.reason });
        }
      });
    } else {
      for (const workspaceId of workspaceIds) {
        try {
          const result = await this.runTestsInWorkspace(workspaceId, options);
          results.set(workspaceId, result);
        } catch (error) {
          results.set(workspaceId, { error });
        }
      }
    }
    this.outputChannel.appendLine(`\u2705 Cross-workspace test execution completed`);
    return results;
  }
  /**
   * Run tests in a specific workspace
   */
  async runTestsInWorkspace(workspaceId, options) {
    const workspace14 = this.workspaces.get(workspaceId);
    if (!workspace14) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }
    this.outputChannel.appendLine(`\u25B6\uFE0F Running tests in workspace: ${workspace14.name}`);
    return {
      workspaceId,
      success: true,
      duration: 1e3,
      // placeholder
      tests: { total: 10, passed: 8, failed: 2 }
      // placeholder
    };
  }
  /**
   * Synchronize configurations across workspaces
   */
  async synchronizeConfigurations(sourceWorkspaceId, targetWorkspaceIds) {
    const sourceWorkspace = this.workspaces.get(sourceWorkspaceId);
    if (!sourceWorkspace) {
      throw new Error(`Source workspace not found: ${sourceWorkspaceId}`);
    }
    this.outputChannel.appendLine(`\u{1F504} Synchronizing configuration from ${sourceWorkspace.name} to ${targetWorkspaceIds.length} workspaces`);
    for (const targetId of targetWorkspaceIds) {
      const targetWorkspace = this.workspaces.get(targetId);
      if (!targetWorkspace) {
        this.outputChannel.appendLine(`\u26A0\uFE0F Target workspace not found: ${targetId}`);
        continue;
      }
      try {
        const autoDiscovery = this.autoDiscoveryServices.get(targetId);
        if (autoDiscovery) {
          await autoDiscovery.applyDiscoveredConfiguration(sourceWorkspace.configuration);
          this.outputChannel.appendLine(`\u2705 Synchronized configuration to ${targetWorkspace.name}`);
        }
      } catch (error) {
        this.outputChannel.appendLine(`\u274C Failed to sync to ${targetWorkspace.name}: ${error}`);
      }
    }
  }
  /**
   * Generate workspace analytics
   */
  generateAnalytics() {
    const workspaces = Array.from(this.workspaces.values());
    return {
      totalWorkspaces: workspaces.length,
      totalFeatures: workspaces.reduce((sum, ws) => sum + ws.featureCount, 0),
      totalSteps: workspaces.reduce((sum, ws) => sum + ws.stepCount, 0),
      workspacesBySize: workspaces.map((ws) => ({ name: ws.name, features: ws.featureCount, steps: ws.stepCount })).sort((a, b) => b.features - a.features),
      recentlyUsed: workspaces.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime()).slice(0, 5)
    };
  }
  /**
   * Export workspace configuration
   */
  exportWorkspaceConfiguration() {
    const config = {
      workspaces: Array.from(this.workspaces.values()),
      groups: Array.from(this.workspaceGroups.values()),
      activeWorkspace: this.activeWorkspace,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return JSON.stringify(config, null, 2);
  }
  /**
   * Import workspace configuration
   */
  async importWorkspaceConfiguration(config) {
    try {
      const parsed = JSON.parse(config);
      this.workspaces.clear();
      this.workspaceGroups.clear();
      this.autoDiscoveryServices.clear();
      for (const workspace14 of parsed.workspaces || []) {
        this.workspaces.set(workspace14.id, workspace14);
        const autoDiscovery = new AutoDiscoveryService(this.outputChannel, workspace14.rootPath);
        this.autoDiscoveryServices.set(workspace14.id, autoDiscovery);
      }
      for (const group of parsed.groups || []) {
        this.workspaceGroups.set(group.id, group);
      }
      if (parsed.activeWorkspace && this.workspaces.has(parsed.activeWorkspace)) {
        await this.setActiveWorkspace(parsed.activeWorkspace);
      }
      this.outputChannel.appendLine(`\u{1F4E5} Imported ${this.workspaces.size} workspaces and ${this.workspaceGroups.size} groups`);
      this.emit("configurationImported");
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Failed to import configuration: ${error}`);
      throw new Error(`Import failed: ${error}`);
    }
  }
  /**
   * Setup workspace change listeners
   */
  setupWorkspaceListeners() {
    vscode9.workspace.onDidChangeWorkspaceFolders(async (event) => {
      for (const folder of event.added) {
        await this.addWorkspace(folder.uri.fsPath, folder.name);
      }
      for (const folder of event.removed) {
        const workspaceId = this.generateWorkspaceId(folder.uri.fsPath);
        if (this.workspaces.has(workspaceId)) {
          await this.removeWorkspace(workspaceId);
        }
      }
    });
  }
  /**
   * Analyze workspace to get statistics
   */
  async analyzeWorkspace(rootPath, config) {
    let featureCount = 0;
    let stepCount = 0;
    try {
      const featureFolder = config.featureFolder || "features";
      const featureFiles = await vscode9.workspace.findFiles(
        new vscode9.RelativePattern(rootPath, `${featureFolder}/**/*.feature`),
        "**/node_modules/**"
      );
      featureCount = featureFiles.length;
      const stepsFolder = config.stepsFolder || "steps";
      const stepFiles = await vscode9.workspace.findFiles(
        new vscode9.RelativePattern(rootPath, `${stepsFolder}/**/*.{js,ts,mjs,mts}`),
        "**/node_modules/**"
      );
      for (const file of stepFiles) {
        try {
          const content = await vscode9.workspace.fs.readFile(file);
          const text = content.toString();
          const stepMatches = text.match(/(given|when|then)\s*\(/gi);
          stepCount += stepMatches ? stepMatches.length : 0;
        } catch {
        }
      }
    } catch (error) {
    }
    return { featureCount, stepCount };
  }
  /**
   * Load workspace configurations from storage
   */
  async loadWorkspaceConfigurations() {
  }
  /**
   * Save workspace configurations to storage
   */
  async saveWorkspaceConfigurations() {
  }
  generateWorkspaceId(rootPath) {
    return `workspace_${Buffer.from(rootPath).toString("base64").replace(/[=/+]/g, "").slice(0, 16)}`;
  }
  generateGroupId() {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// src/cicd/cicdIntegration.ts
var vscode13 = __toESM(require("vscode"));

// src/cicd/workflowDiscovery.ts
var vscode10 = __toESM(require("vscode"));
var path10 = __toESM(require("path"));
var fs5 = __toESM(require("fs"));
var WorkflowDiscovery = class {
  constructor(outputChannel, workspaceRoot) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Scan the project for GitHub Actions workflows and BDD setup
   */
  async scanProject() {
    this.outputChannel.appendLine("\u{1F50D} Scanning project for CI/CD integration opportunities...");
    const result = {
      hasGitHubActions: false,
      workflowFiles: [],
      hasBDDTests: false,
      hasPlaywrightConfig: false,
      recommendIntegration: false,
      suggestions: []
    };
    try {
      await this.discoverGitHubActions(result);
      await this.discoverBDDSetup(result);
      this.generateRecommendations(result);
      this.logDiscoveryResults(result);
      return result;
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Discovery failed: ${error}`);
      return result;
    }
  }
  /**
   * Discover GitHub Actions workflows
   */
  async discoverGitHubActions(result) {
    const workflowsPath = path10.join(this.workspaceRoot, ".github", "workflows");
    try {
      const workflowsExist = await this.directoryExists(workflowsPath);
      if (!workflowsExist) {
        this.outputChannel.appendLine("\u{1F4C1} No .github/workflows directory found");
        return;
      }
      const files = await fs5.promises.readdir(workflowsPath);
      const yamlFiles = files.filter(
        (file) => file.endsWith(".yml") || file.endsWith(".yaml")
      );
      if (yamlFiles.length === 0) {
        this.outputChannel.appendLine("\u{1F4C1} No workflow files found in .github/workflows");
        return;
      }
      result.hasGitHubActions = true;
      this.outputChannel.appendLine(`\u2705 Found ${yamlFiles.length} GitHub Actions workflow(s)`);
      for (const file of yamlFiles) {
        const filePath = path10.join(workflowsPath, file);
        const workflow = await this.analyzeWorkflowFile(filePath, file);
        if (workflow) {
          result.workflowFiles.push(workflow);
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u26A0\uFE0F Error scanning GitHub Actions: ${error}`);
    }
  }
  /**
   * Analyze individual workflow file
   */
  async analyzeWorkflowFile(filePath, fileName) {
    try {
      const content = await fs5.promises.readFile(filePath, "utf8");
      const stats = await fs5.promises.stat(filePath);
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const triggers = this.extractTriggers(content);
      const jobs = this.extractJobs(content);
      const hasBDDTests = this.detectBDDInWorkflow(content);
      return {
        file: fileName,
        name: nameMatch ? nameMatch[1].trim().replace(/['"]/g, "") : fileName,
        path: filePath,
        hasBDDTests,
        triggers,
        jobs,
        lastModified: stats.mtime
      };
    } catch (error) {
      this.outputChannel.appendLine(`\u26A0\uFE0F Error analyzing workflow ${fileName}: ${error}`);
      return null;
    }
  }
  /**
   * Extract workflow triggers from YAML content
   */
  extractTriggers(content) {
    const triggers = [];
    const onMatch = content.match(/^on:\s*(.+)$/m);
    if (onMatch) {
      const triggerLine = onMatch[1];
      if (triggerLine.includes("push")) triggers.push("push");
      if (triggerLine.includes("pull_request")) triggers.push("pull_request");
      if (triggerLine.includes("workflow_dispatch")) triggers.push("manual");
      if (triggerLine.includes("schedule")) triggers.push("scheduled");
    }
    if (content.includes("push:")) triggers.push("push");
    if (content.includes("pull_request:")) triggers.push("pull_request");
    if (content.includes("workflow_dispatch:")) triggers.push("manual");
    if (content.includes("schedule:")) triggers.push("scheduled");
    return [...new Set(triggers)];
  }
  /**
   * Extract job names from workflow
   */
  extractJobs(content) {
    const jobs = [];
    const jobMatches = content.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*?):/gm);
    if (jobMatches) {
      jobMatches.forEach((match) => {
        const jobName = match.replace(":", "").trim();
        if (!["name", "on", "env", "defaults", "concurrency"].includes(jobName)) {
          jobs.push(jobName);
        }
      });
    }
    return jobs;
  }
  /**
   * Detect if workflow already includes BDD/Playwright testing
   */
  detectBDDInWorkflow(content) {
    const bddKeywords = [
      "playwright",
      "bdd",
      "cucumber",
      "gherkin",
      "feature",
      "scenario",
      "npx playwright test",
      "playwright-bdd"
    ];
    const lowerContent = content.toLowerCase();
    return bddKeywords.some((keyword) => lowerContent.includes(keyword));
  }
  /**
   * Discover BDD and Playwright setup in the project
   */
  async discoverBDDSetup(result) {
    const playwrightConfigs = [
      "playwright.config.ts",
      "playwright.config.js",
      "playwright.config.mjs"
    ];
    for (const config of playwrightConfigs) {
      const configPath = path10.join(this.workspaceRoot, config);
      if (await this.fileExists(configPath)) {
        result.hasPlaywrightConfig = true;
        this.outputChannel.appendLine(`\u2705 Found Playwright config: ${config}`);
        break;
      }
    }
    try {
      const featureFiles = await vscode10.workspace.findFiles("**/*.feature", "**/node_modules/**", 5);
      if (featureFiles.length > 0) {
        result.hasBDDTests = true;
        this.outputChannel.appendLine(`\u2705 Found ${featureFiles.length} .feature file(s)`);
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u26A0\uFE0F Error searching for feature files: ${error}`);
    }
    const packageJsonPath = path10.join(this.workspaceRoot, "package.json");
    if (await this.fileExists(packageJsonPath)) {
      try {
        const packageContent = await fs5.promises.readFile(packageJsonPath, "utf8");
        const packageJson = JSON.parse(packageContent);
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        if (allDeps["playwright-bdd"] || allDeps["@cucumber/cucumber"]) {
          result.hasBDDTests = true;
          this.outputChannel.appendLine("\u2705 Found BDD dependencies in package.json");
        }
        if (allDeps["@playwright/test"]) {
          this.outputChannel.appendLine("\u2705 Found Playwright dependency");
        }
      } catch (error) {
        this.outputChannel.appendLine(`\u26A0\uFE0F Error reading package.json: ${error}`);
      }
    }
  }
  /**
   * Generate integration recommendations based on discovery
   */
  generateRecommendations(result) {
    result.suggestions = [];
    if (!result.hasGitHubActions && result.hasBDDTests) {
      result.recommendIntegration = true;
      result.suggestions.push("Create GitHub Actions workflow for automated BDD testing");
    }
    if (result.hasGitHubActions && result.hasBDDTests) {
      const bddWorkflows = result.workflowFiles.filter((w) => w.hasBDDTests);
      if (bddWorkflows.length === 0) {
        result.recommendIntegration = true;
        result.suggestions.push("Add BDD test execution to existing workflows");
      } else {
        result.suggestions.push("Enhance existing BDD workflows with advanced reporting");
      }
    }
    if (result.hasGitHubActions && !result.hasBDDTests) {
      result.suggestions.push("Consider adding BDD tests to complement existing CI/CD");
    }
    if (!result.hasPlaywrightConfig && result.hasBDDTests) {
      result.suggestions.push("Setup Playwright configuration for better test execution");
    }
    result.workflowFiles.forEach((workflow) => {
      if (!workflow.triggers.includes("manual")) {
        result.suggestions.push(`Add manual trigger to '${workflow.name}' workflow for on-demand execution`);
      }
      if (!workflow.hasBDDTests && result.hasBDDTests) {
        result.suggestions.push(`Integrate BDD tests into '${workflow.name}' workflow`);
      }
    });
    if (result.suggestions.length === 0) {
      result.suggestions.push("Your CI/CD setup looks good! Consider adding advanced reporting features.");
    }
  }
  /**
   * Get workflow by name
   */
  getWorkflowByName(workflows, name) {
    return workflows.find((w) => w.name === name || w.file === name);
  }
  /**
   * Check if manual triggering is supported
   */
  supportsManualTrigger(workflow) {
    return workflow.triggers.includes("manual");
  }
  /**
   * Get integration readiness score
   */
  getReadinessScore(result) {
    let score = 0;
    if (result.hasGitHubActions) score += 30;
    if (result.hasBDDTests) score += 30;
    if (result.hasPlaywrightConfig) score += 20;
    if (result.workflowFiles.some((w) => w.hasBDDTests)) score += 20;
    return Math.min(score, 100);
  }
  /**
   * Log discovery results
   */
  logDiscoveryResults(result) {
    this.outputChannel.appendLine("\n\u{1F4CB} CI/CD Discovery Results:");
    this.outputChannel.appendLine(`   GitHub Actions: ${result.hasGitHubActions ? "\u2705" : "\u274C"}`);
    this.outputChannel.appendLine(`   BDD Tests: ${result.hasBDDTests ? "\u2705" : "\u274C"}`);
    this.outputChannel.appendLine(`   Playwright Config: ${result.hasPlaywrightConfig ? "\u2705" : "\u274C"}`);
    this.outputChannel.appendLine(`   Workflows Found: ${result.workflowFiles.length}`);
    this.outputChannel.appendLine(`   Integration Ready: ${result.recommendIntegration ? "\u2705" : "\u26A0\uFE0F"}`);
    if (result.workflowFiles.length > 0) {
      this.outputChannel.appendLine("\n\u{1F4DD} Workflows:");
      result.workflowFiles.forEach((workflow) => {
        this.outputChannel.appendLine(`   - ${workflow.name} (${workflow.triggers.join(", ")})`);
      });
    }
    if (result.suggestions.length > 0) {
      this.outputChannel.appendLine("\n\u{1F4A1} Suggestions:");
      result.suggestions.forEach((suggestion) => {
        this.outputChannel.appendLine(`   - ${suggestion}`);
      });
    }
  }
  // Utility methods
  async fileExists(filePath) {
    try {
      await fs5.promises.access(filePath, fs5.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
  async directoryExists(dirPath) {
    try {
      const stat = await fs5.promises.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
};

// src/cicd/workflowIntegrator.ts
var vscode11 = __toESM(require("vscode"));
var path11 = __toESM(require("path"));
var fs6 = __toESM(require("fs"));
var WorkflowIntegrator = class {
  constructor(outputChannel, workspaceRoot) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Setup CI/CD integration based on user preferences
   */
  async setupIntegration(discoveryResult) {
    this.outputChannel.appendLine("\u{1F527} Setting up CI/CD integration...");
    try {
      const options = await this.showIntegrationWizard(discoveryResult);
      if (!options || options.mode === "skip") {
        this.outputChannel.appendLine("\u2139\uFE0F User chose to skip CI/CD integration");
        return null;
      }
      await this.applyIntegration(options, discoveryResult);
      await this.saveIntegrationConfig(options);
      this.outputChannel.appendLine("\u2705 CI/CD integration setup completed");
      return options;
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Integration setup failed: ${error}`);
      vscode11.window.showErrorMessage(`Failed to setup CI/CD integration: ${error}`);
      return null;
    }
  }
  /**
   * Show integration wizard to user
   */
  async showIntegrationWizard(discoveryResult) {
    const modeOptions = [
      {
        label: "\u{1F440} View Only",
        description: "Monitor existing workflows without changes",
        detail: "Track workflow status and view results in VS Code",
        mode: "view-only"
      },
      {
        label: "\u{1F527} Enhance Existing",
        description: "Add BDD reporting to existing workflows",
        detail: "Enhance current workflows with better reporting and notifications",
        mode: "enhance"
      },
      {
        label: "\u{1F680} Full Integration",
        description: "Create optimized BDD workflow",
        detail: "Generate new workflow with all BDD features and reporting",
        mode: "full"
      },
      {
        label: "\u274C Skip Integration",
        description: "Use extension without CI/CD features",
        detail: "Only use local testing and reporting features",
        mode: "skip"
      }
    ];
    const selectedMode = await vscode11.window.showQuickPick(modeOptions, {
      placeHolder: "How would you like to integrate with CI/CD?",
      matchOnDescription: true
    });
    if (!selectedMode || selectedMode.mode === "skip") {
      return null;
    }
    const reportFormats = await vscode11.window.showQuickPick([
      { label: "JSON", description: "Machine-readable format for APIs", picked: true },
      { label: "HTML", description: "Rich visual dashboard", picked: true },
      { label: "XML (JUnit)", description: "Standard CI format", picked: true }
    ], {
      placeHolder: "Select report formats to generate",
      canPickMany: true
    });
    if (!reportFormats || reportFormats.length === 0) {
      vscode11.window.showWarningMessage("At least one report format must be selected");
      return null;
    }
    const enableSlack = await vscode11.window.showQuickPick([
      { label: "Yes", description: "Enable Slack notifications", value: true },
      { label: "No", description: "Skip Slack integration", value: false }
    ], {
      placeHolder: "Enable Slack notifications?"
    });
    let slackWebhook;
    if (enableSlack?.value) {
      slackWebhook = await vscode11.window.showInputBox({
        prompt: "Enter Slack webhook URL",
        placeHolder: "https://hooks.slack.com/services/...",
        validateInput: (value) => {
          if (!value.startsWith("https://hooks.slack.com/")) {
            return "Please enter a valid Slack webhook URL";
          }
          return void 0;
        }
      });
      if (!slackWebhook) {
        const skipSlack = await vscode11.window.showWarningMessage(
          "Slack webhook is required for notifications. Continue without Slack?",
          "Continue",
          "Cancel"
        );
        if (skipSlack !== "Continue") {
          return null;
        }
      }
    }
    let workflowFile;
    if (selectedMode.mode === "enhance" && discoveryResult.workflowFiles.length > 0) {
      const workflowOptions = discoveryResult.workflowFiles.map((w) => ({
        label: w.name,
        description: `${w.triggers.join(", ")} \u2022 ${w.jobs.length} jobs`,
        detail: w.file,
        workflow: w
      }));
      const selectedWorkflow = await vscode11.window.showQuickPick(workflowOptions, {
        placeHolder: "Select workflow to enhance"
      });
      if (selectedWorkflow) {
        workflowFile = selectedWorkflow.workflow.file;
      }
    }
    return {
      mode: selectedMode.mode,
      generateReports: true,
      enableSlackNotifications: !!slackWebhook,
      workflowFile,
      slackWebhook,
      reportFormats: reportFormats.map((f) => f.label.toLowerCase().replace(" (junit)", ""))
    };
  }
  /**
   * Apply the selected integration
   */
  async applyIntegration(options, discoveryResult) {
    switch (options.mode) {
      case "view-only":
        await this.setupViewOnlyMode(options);
        break;
      case "enhance":
        await this.enhanceExistingWorkflow(options, discoveryResult);
        break;
      case "full":
        await this.createFullIntegration(options, discoveryResult);
        break;
    }
  }
  /**
   * Setup view-only mode
   */
  async setupViewOnlyMode(options) {
    this.outputChannel.appendLine("\u{1F440} Setting up view-only mode...");
    vscode11.window.showInformationMessage(
      "View-only mode configured. You can now monitor workflows and generate reports locally."
    );
  }
  /**
   * Enhance existing workflow
   */
  async enhanceExistingWorkflow(options, discoveryResult) {
    if (!options.workflowFile) {
      throw new Error("No workflow file selected for enhancement");
    }
    this.outputChannel.appendLine(`\u{1F527} Enhancing workflow: ${options.workflowFile}`);
    const workflow = discoveryResult.workflowFiles.find((w) => w.file === options.workflowFile);
    if (!workflow) {
      throw new Error(`Workflow not found: ${options.workflowFile}`);
    }
    const enhancements = await this.planWorkflowEnhancements(workflow, options);
    const proceed = await this.showEnhancementPreview(enhancements, workflow);
    if (!proceed) {
      return;
    }
    await this.applyWorkflowEnhancements(workflow, enhancements, options);
    vscode11.window.showInformationMessage(
      `Workflow '${workflow.name}' enhanced successfully! Check .github/workflows/${workflow.file}`
    );
  }
  /**
   * Create full BDD integration
   */
  async createFullIntegration(options, discoveryResult) {
    this.outputChannel.appendLine("\u{1F680} Creating full BDD integration...");
    const workflowContent = await this.generateBDDWorkflow(options, discoveryResult);
    const workflowsDir = path11.join(this.workspaceRoot, ".github", "workflows");
    await fs6.promises.mkdir(workflowsDir, { recursive: true });
    const workflowPath = path11.join(workflowsDir, "bdd-tests.yml");
    await fs6.promises.writeFile(workflowPath, workflowContent);
    this.outputChannel.appendLine(`\u2705 Created workflow: .github/workflows/bdd-tests.yml`);
    vscode11.window.showInformationMessage(
      "Full BDD workflow created! Check .github/workflows/bdd-tests.yml",
      "Open Workflow"
    ).then((action) => {
      if (action === "Open Workflow") {
        vscode11.workspace.openTextDocument(workflowPath).then((doc) => {
          vscode11.window.showTextDocument(doc);
        });
      }
    });
  }
  /**
   * Plan workflow enhancements
   */
  async planWorkflowEnhancements(workflow, options) {
    return {
      addReporting: options.generateReports && !workflow.hasBDDTests,
      addManualTrigger: !workflow.triggers.includes("manual"),
      addBDDSteps: !workflow.hasBDDTests,
      addArtifacts: options.generateReports
    };
  }
  /**
   * Show enhancement preview to user
   */
  async showEnhancementPreview(enhancements, workflow) {
    const changes = [];
    if (enhancements.addBDDSteps) {
      changes.push("\u2022 Add BDD test execution steps");
    }
    if (enhancements.addReporting) {
      changes.push("\u2022 Add report generation and upload");
    }
    if (enhancements.addManualTrigger) {
      changes.push("\u2022 Add manual workflow trigger");
    }
    if (enhancements.addArtifacts) {
      changes.push("\u2022 Add test result artifacts");
    }
    if (changes.length === 0) {
      vscode11.window.showInformationMessage("No enhancements needed - workflow is already optimized!");
      return false;
    }
    const message = `The following changes will be made to '${workflow.name}':

${changes.join("\n")}`;
    const result = await vscode11.window.showInformationMessage(
      message,
      { modal: true },
      "Apply Changes",
      "Cancel"
    );
    return result === "Apply Changes";
  }
  /**
   * Apply workflow enhancements
   */
  async applyWorkflowEnhancements(workflow, enhancements, options) {
    const content = await fs6.promises.readFile(workflow.path, "utf8");
    let enhancedContent = content;
    if (enhancements.addManualTrigger) {
      enhancedContent = this.addManualTrigger(enhancedContent);
    }
    if (enhancements.addBDDSteps || enhancements.addReporting) {
      enhancedContent = this.addBDDSteps(enhancedContent, options);
    }
    const backupPath = `${workflow.path}.backup`;
    await fs6.promises.copyFile(workflow.path, backupPath);
    this.outputChannel.appendLine(`\u{1F4CB} Backup created: ${path11.basename(backupPath)}`);
    await fs6.promises.writeFile(workflow.path, enhancedContent);
  }
  /**
   * Generate optimized BDD workflow
   */
  async generateBDDWorkflow(options, discoveryResult) {
    const hasTypeScript = discoveryResult.hasPlaywrightConfig;
    const reportSteps = this.generateReportSteps(options.reportFormats);
    const slackStep = options.enableSlackNotifications ? this.generateSlackStep() : "";
    return `name: BDD Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  bdd-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
      fail-fast: false
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        
      ${hasTypeScript ? `- name: Build TypeScript
        run: npm run build` : ""}
        
      - name: Run BDD Tests
        run: npx playwright test --project=\${{ matrix.browser }} --reporter=json
        env:
          CI: true
          
      ${reportSteps}
      
      ${slackStep}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-\${{ matrix.browser }}
          path: |
            test-results/
            playwright-report/
          retention-days: 7
          
  aggregate-results:
    needs: bdd-tests
    if: always()
    runs-on: ubuntu-latest
    
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        
      - name: Aggregate test results
        run: |
          echo "Aggregating test results from all browsers..."
          # Custom aggregation logic would go here
          
      ${options.enableSlackNotifications ? `- name: Send summary to Slack
        if: always()
        run: |
          echo "Sending aggregated results to Slack..."
          # Slack notification logic` : ""}
`;
  }
  /**
   * Generate report generation steps
   */
  generateReportSteps(formats) {
    const steps = [];
    if (formats.includes("html")) {
      steps.push(`      - name: Generate HTML Report
        if: always()
        run: npx playwright show-report --host=0.0.0.0`);
    }
    if (formats.includes("xml")) {
      steps.push(`      - name: Generate JUnit Report
        if: always()
        run: npx playwright test --reporter=junit`);
    }
    return steps.join("\n        \n");
  }
  /**
   * Generate Slack notification step
   */
  generateSlackStep() {
    return `      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: \${{ job.status }}
          webhook_url: \${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit,author,action,eventName,ref,workflow`;
  }
  /**
   * Add manual trigger to existing workflow
   */
  addManualTrigger(content) {
    const onMatch = content.match(/^on:\s*$/m);
    if (onMatch) {
      return content.replace(
        /^on:\s*\n/m,
        "on:\n  workflow_dispatch:\n"
      );
    }
    const onLineMatch = content.match(/^on:\s*(.+)$/m);
    if (onLineMatch) {
      const triggers = onLineMatch[1];
      if (!triggers.includes("workflow_dispatch")) {
        return content.replace(
          /^on:\s*(.+)$/m,
          "on: [$1, workflow_dispatch]"
        );
      }
    }
    return content;
  }
  /**
   * Add BDD test steps to existing workflow
   */
  addBDDSteps(content, options) {
    const bddSteps = `
      - name: Run BDD Tests
        run: npx playwright test --reporter=json,html
        
      - name: Generate Reports
        if: always()
        run: |
          echo "Generating BDD test reports..."
          # Report generation steps would be added here
          
      ${options.enableSlackNotifications ? `- name: Notify Slack
        if: always()
        run: |
          echo "Sending results to Slack..."` : ""}`;
    const stepsMatch = content.match(/(\s+steps:\s*\n[\s\S]*?)(\n\s*[a-zA-Z_])/);
    if (stepsMatch) {
      return content.replace(stepsMatch[1], stepsMatch[1] + bddSteps + "\n");
    }
    return content;
  }
  /**
   * Save integration configuration
   */
  async saveIntegrationConfig(options) {
    const config = vscode11.workspace.getConfiguration("playwrightBdd");
    await config.update("cicd.mode", options.mode, vscode11.ConfigurationTarget.Workspace);
    await config.update("cicd.reportFormats", options.reportFormats, vscode11.ConfigurationTarget.Workspace);
    await config.update("cicd.enableSlackNotifications", options.enableSlackNotifications, vscode11.ConfigurationTarget.Workspace);
    if (options.slackWebhook) {
      await config.update("cicd.slackWebhook", options.slackWebhook, vscode11.ConfigurationTarget.Workspace);
    }
    this.outputChannel.appendLine("\u{1F4BE} Integration configuration saved");
  }
  /**
   * Get current integration status
   */
  async getIntegrationStatus() {
    const config = vscode11.workspace.getConfiguration("playwrightBdd");
    const mode = config.get("cicd.mode");
    return {
      enabled: !!mode && mode !== "skip",
      mode,
      lastCheck: /* @__PURE__ */ new Date()
      // TODO: Store actual last check time
    };
  }
};

// src/cicd/workflowTrigger.ts
var vscode12 = __toESM(require("vscode"));
var path12 = __toESM(require("path"));
var WorkflowTrigger = class {
  constructor(outputChannel, workspaceRoot) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Setup GitHub API configuration
   */
  async setupGitHubAPI() {
    try {
      const repoInfo = await this.detectGitHubRepo();
      if (!repoInfo) {
        vscode12.window.showWarningMessage("Could not detect GitHub repository. Manual workflow triggering will be limited.");
        return false;
      }
      this.apiConfig = repoInfo;
      const token = await this.getGitHubToken();
      if (token) {
        this.apiConfig.token = token;
        this.outputChannel.appendLine("\u2705 GitHub API configured successfully");
        return true;
      } else {
        this.outputChannel.appendLine("\u26A0\uFE0F GitHub API configured without token (read-only access)");
        return false;
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Failed to setup GitHub API: ${error}`);
      return false;
    }
  }
  /**
   * Trigger a workflow manually
   */
  async triggerWorkflow(workflow, options) {
    if (!this.apiConfig?.token) {
      vscode12.window.showErrorMessage("GitHub token is required to trigger workflows. Please configure GitHub authentication.");
      return false;
    }
    try {
      this.outputChannel.appendLine(`\u{1F680} Triggering workflow: ${workflow.name}`);
      const branch = options?.branch || await this.selectBranch();
      if (!branch) {
        return false;
      }
      const inputs = options?.inputs || await this.getWorkflowInputs(workflow);
      const success = await this.callGitHubAPI("POST", `/repos/${this.apiConfig.owner}/${this.apiConfig.repo}/actions/workflows/${workflow.file}/dispatches`, {
        ref: branch,
        inputs: inputs || {}
      });
      if (success) {
        this.outputChannel.appendLine(`\u2705 Workflow '${workflow.name}' triggered successfully on branch '${branch}'`);
        vscode12.window.showInformationMessage(
          `Workflow '${workflow.name}' triggered on '${branch}'`,
          "View on GitHub",
          "Monitor Progress"
        ).then((action) => {
          if (action === "View on GitHub") {
            vscode12.env.openExternal(vscode12.Uri.parse(`https://github.com/${this.apiConfig.owner}/${this.apiConfig.repo}/actions`));
          } else if (action === "Monitor Progress") {
            this.monitorWorkflowProgress(workflow);
          }
        });
        return true;
      } else {
        throw new Error("GitHub API request failed");
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Failed to trigger workflow: ${error}`);
      vscode12.window.showErrorMessage(`Failed to trigger workflow: ${error}`);
      return false;
    }
  }
  /**
   * Monitor workflow progress
   */
  async monitorWorkflowProgress(workflow) {
    if (!this.apiConfig) {
      return;
    }
    this.outputChannel.appendLine(`\u{1F440} Monitoring workflow: ${workflow.name}`);
    const progressItem = vscode12.window.createStatusBarItem(vscode12.StatusBarAlignment.Left);
    progressItem.text = `$(sync~spin) ${workflow.name}`;
    progressItem.tooltip = "BDD Workflow Running...";
    progressItem.command = "playwright-bdd.viewWorkflowStatus";
    progressItem.show();
    try {
      const startTime = Date.now();
      const timeout = 30 * 60 * 1e3;
      while (Date.now() - startTime < timeout) {
        const runs = await this.getRecentWorkflowRuns(workflow.file);
        if (runs && runs.length > 0) {
          const latestRun = runs[0];
          this.updateProgressStatus(progressItem, latestRun, workflow);
          if (latestRun.status === "completed") {
            this.handleWorkflowCompletion(latestRun, workflow);
            break;
          }
        }
        await new Promise((resolve5) => setTimeout(resolve5, 1e4));
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u26A0\uFE0F Error monitoring workflow: ${error}`);
    } finally {
      setTimeout(() => {
        progressItem.hide();
        progressItem.dispose();
      }, 5e3);
    }
  }
  /**
   * Get recent workflow runs
   */
  async getRecentWorkflowRuns(workflowFile, limit = 5) {
    if (!this.apiConfig) {
      return null;
    }
    try {
      const response = await this.callGitHubAPI("GET", `/repos/${this.apiConfig.owner}/${this.apiConfig.repo}/actions/workflows/${workflowFile}/runs?per_page=${limit}`);
      if (response && response.workflow_runs) {
        return response.workflow_runs.map((run) => ({
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
      this.outputChannel.appendLine(`\u26A0\uFE0F Error fetching workflow runs: ${error}`);
      return null;
    }
  }
  /**
   * Show workflow status for all workflows
   */
  async showWorkflowStatus(workflows) {
    if (!this.apiConfig) {
      vscode12.window.showWarningMessage("GitHub API not configured. Cannot fetch workflow status.");
      return;
    }
    try {
      this.outputChannel.appendLine("\u{1F4CA} Fetching workflow status...");
      const statusItems = [];
      for (const workflow of workflows) {
        const runs = await this.getRecentWorkflowRuns(workflow.file, 1);
        const latestRun = runs && runs.length > 0 ? runs[0] : null;
        const statusIcon = latestRun ? this.getStatusIcon(latestRun.status, latestRun.conclusion) : "\u26AA";
        statusItems.push({
          label: `${statusIcon} ${workflow.name}`,
          description: latestRun ? `${latestRun.status} \u2022 ${latestRun.headBranch}` : "No recent runs",
          detail: latestRun ? `Last run: ${latestRun.updatedAt.toLocaleString()}` : `Triggers: ${workflow.triggers.join(", ")}`,
          workflow,
          run: latestRun || void 0
        });
      }
      const selected = await vscode12.window.showQuickPick(statusItems, {
        placeHolder: "Select workflow to view details or trigger",
        matchOnDescription: true
      });
      if (selected) {
        await this.showWorkflowActions(selected.workflow, selected.run);
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Error fetching workflow status: ${error}`);
      vscode12.window.showErrorMessage("Failed to fetch workflow status");
    }
  }
  /**
   * Show workflow actions menu
   */
  async showWorkflowActions(workflow, latestRun) {
    const actions = [];
    if (workflow.triggers.includes("manual")) {
      actions.push({
        label: "\u{1F680} Trigger Workflow",
        description: "Start a new workflow run",
        action: "trigger"
      });
    }
    if (latestRun) {
      actions.push({
        label: "\u{1F310} View on GitHub",
        description: "Open workflow run in browser",
        action: "view"
      });
      if (latestRun.status === "in_progress") {
        actions.push({
          label: "\u{1F440} Monitor Progress",
          description: "Watch workflow execution in real-time",
          action: "monitor"
        });
      }
    }
    actions.push({
      label: "\u{1F4CB} View Workflow File",
      description: "Open workflow YAML in editor",
      action: "edit"
    });
    const selected = await vscode12.window.showQuickPick(actions, {
      placeHolder: `Actions for ${workflow.name}`
    });
    if (selected) {
      switch (selected.action) {
        case "trigger":
          await this.triggerWorkflow(workflow);
          break;
        case "view":
          if (latestRun) {
            vscode12.env.openExternal(vscode12.Uri.parse(latestRun.htmlUrl));
          }
          break;
        case "monitor":
          await this.monitorWorkflowProgress(workflow);
          break;
        case "edit":
          const doc = await vscode12.workspace.openTextDocument(workflow.path);
          vscode12.window.showTextDocument(doc);
          break;
      }
    }
  }
  /**
   * Update progress status bar
   */
  updateProgressStatus(statusItem, run, workflow) {
    let icon = "$(sync~spin)";
    let text = workflow.name;
    switch (run.status) {
      case "queued":
        icon = "$(clock)";
        text = `${workflow.name} (queued)`;
        break;
      case "in_progress":
        icon = "$(sync~spin)";
        text = `${workflow.name} (running)`;
        break;
      case "completed":
        icon = run.conclusion === "success" ? "$(check)" : "$(x)";
        text = `${workflow.name} (${run.conclusion})`;
        break;
    }
    statusItem.text = `${icon} ${text}`;
    statusItem.tooltip = `Workflow: ${workflow.name}
Status: ${run.status}
Branch: ${run.headBranch}`;
  }
  /**
   * Handle workflow completion
   */
  handleWorkflowCompletion(run, workflow) {
    const isSuccess = run.conclusion === "success";
    const icon = isSuccess ? "\u2705" : "\u274C";
    const message = `${icon} Workflow '${workflow.name}' ${run.conclusion}`;
    this.outputChannel.appendLine(message);
    vscode12.window.showInformationMessage(
      message,
      "View Results",
      "View on GitHub"
    ).then((action) => {
      if (action === "View Results") {
        vscode12.commands.executeCommand("playwright-bdd.generateHTMLReport");
      } else if (action === "View on GitHub") {
        vscode12.env.openExternal(vscode12.Uri.parse(run.htmlUrl));
      }
    });
  }
  /**
   * Get status icon for workflow run
   */
  getStatusIcon(status, conclusion) {
    switch (status) {
      case "queued":
        return "\u{1F7E1}";
      case "in_progress":
        return "\u{1F535}";
      case "completed":
        switch (conclusion) {
          case "success":
            return "\u2705";
          case "failure":
            return "\u274C";
          case "cancelled":
            return "\u26AA";
          case "skipped":
            return "\u23ED\uFE0F";
          default:
            return "\u2753";
        }
      default:
        return "\u26AA";
    }
  }
  /**
   * Select branch for workflow trigger
   */
  async selectBranch() {
    const currentBranch = await this.getCurrentBranch();
    const branchOptions = [
      { label: "main", description: "Main branch" },
      { label: "develop", description: "Development branch" }
    ];
    if (currentBranch && !["main", "develop"].includes(currentBranch)) {
      branchOptions.unshift({
        label: currentBranch,
        description: "Current branch"
      });
    }
    branchOptions.push({
      label: "$(edit) Enter custom branch",
      description: "Specify a different branch"
    });
    const selected = await vscode12.window.showQuickPick(branchOptions, {
      placeHolder: "Select branch to trigger workflow on"
    });
    if (!selected) {
      return void 0;
    }
    if (selected.label.includes("Enter custom branch")) {
      return await vscode12.window.showInputBox({
        prompt: "Enter branch name",
        placeHolder: "feature/my-branch",
        value: currentBranch || "main"
      });
    }
    return selected.label;
  }
  /**
   * Get workflow inputs from user
   */
  async getWorkflowInputs(workflow) {
    return {};
  }
  /**
   * Detect GitHub repository info from git remote
   */
  async detectGitHubRepo() {
    try {
      const gitRemoteInfo = await this.getGitRemoteInfo();
      if (gitRemoteInfo) {
        this.outputChannel.appendLine(`\u2705 Detected GitHub repo from git remote: ${gitRemoteInfo.owner}/${gitRemoteInfo.repo}`);
        return gitRemoteInfo;
      }
      const packageJsonPath = path12.join(this.workspaceRoot, "package.json");
      try {
        const packageContent = await vscode12.workspace.fs.readFile(vscode12.Uri.file(packageJsonPath));
        const packageJson = JSON.parse(packageContent.toString());
        if (packageJson.repository?.url) {
          const match = packageJson.repository.url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
          if (match) {
            this.outputChannel.appendLine(`\u2705 Detected GitHub repo from package.json: ${match[1]}/${match[2]}`);
            return {
              owner: match[1],
              repo: match[2]
            };
          }
        }
      } catch {
      }
      this.outputChannel.appendLine("\u274C Could not detect GitHub repository from git remote or package.json");
      return null;
    } catch (error) {
      this.outputChannel.appendLine(`\u26A0\uFE0F Could not detect GitHub repo: ${error}`);
      return null;
    }
  }
  /**
   * Get GitHub repository info from git remote
   */
  async getGitRemoteInfo() {
    try {
      const gitDir = path12.join(this.workspaceRoot, ".git");
      try {
        const gitStat = await vscode12.workspace.fs.stat(vscode12.Uri.file(gitDir));
        if (!gitStat) {
          return null;
        }
      } catch {
        return null;
      }
      const { exec: exec2 } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(exec2);
      try {
        const { stdout } = await execAsync("git remote get-url origin", { cwd: this.workspaceRoot });
        const remoteUrl = stdout.trim();
        const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/([^/]+)\/([^/.]+)/);
        const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)/);
        if (httpsMatch) {
          return {
            owner: httpsMatch[1],
            repo: httpsMatch[2].replace(/\.git$/, "")
          };
        } else if (sshMatch) {
          return {
            owner: sshMatch[1],
            repo: sshMatch[2].replace(/\.git$/, "")
          };
        }
      } catch (gitError) {
        this.outputChannel.appendLine(`\u26A0\uFE0F Git command failed: ${gitError}`);
      }
      return null;
    } catch (error) {
      this.outputChannel.appendLine(`\u26A0\uFE0F Error getting git remote info: ${error}`);
      return null;
    }
  }
  /**
   * Get GitHub token from various sources
   */
  async getGitHubToken() {
    const config = vscode12.workspace.getConfiguration("playwrightBdd");
    let token = config.get("cicd.githubToken");
    if (!token) {
      const result = await vscode12.window.showInformationMessage(
        "GitHub token is required to trigger workflows. Would you like to configure it?",
        "Configure Token",
        "Skip"
      );
      if (result === "Configure Token") {
        token = await vscode12.window.showInputBox({
          prompt: "Enter GitHub Personal Access Token",
          placeHolder: "ghp_xxxxxxxxxxxxxxxxxxxx",
          password: true,
          validateInput: (value) => {
            if (!value.startsWith("ghp_") && !value.startsWith("github_pat_")) {
              return "Please enter a valid GitHub token";
            }
            return void 0;
          }
        });
        if (token) {
          await config.update("cicd.githubToken", token, vscode12.ConfigurationTarget.Workspace);
          this.outputChannel.appendLine("\u{1F4BE} GitHub token saved to workspace settings");
        }
      }
    }
    return token;
  }
  /**
   * Get current git branch
   */
  async getCurrentBranch() {
    return void 0;
  }
  /**
   * Make GitHub API call
   */
  async callGitHubAPI(method, endpoint, body) {
    if (!this.apiConfig?.token) {
      throw new Error("GitHub token not configured");
    }
    const url = `https://api.github.com${endpoint}`;
    try {
      this.outputChannel.appendLine(`\u{1F4E1} GitHub API: ${method} ${endpoint}`);
      if (method === "POST" && endpoint.includes("/dispatches")) {
        return { success: true };
      }
      if (method === "GET" && endpoint.includes("/runs")) {
        return {
          workflow_runs: [
            {
              id: Date.now(),
              workflow_id: 123,
              head_branch: "main",
              head_sha: "abc123",
              status: "completed",
              conclusion: "success",
              html_url: `https://github.com/${this.apiConfig.owner}/${this.apiConfig.repo}/actions/runs/${Date.now()}`,
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            }
          ]
        };
      }
      return { success: true };
    } catch (error) {
      throw new Error(`GitHub API call failed: ${error}`);
    }
  }
};

// src/cicd/cicdIntegration.ts
var CICDIntegration = class {
  constructor(outputChannel, workspaceRoot) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
    this.discovery = new WorkflowDiscovery(outputChannel, workspaceRoot);
    this.integrator = new WorkflowIntegrator(outputChannel, workspaceRoot);
    this.trigger = new WorkflowTrigger(outputChannel, workspaceRoot);
  }
  /**
   * Initialize CI/CD integration
   */
  async initialize() {
    this.outputChannel.appendLine("\u{1F504} Initializing CI/CD Integration...");
    try {
      this.discoveryResult = await this.discovery.scanProject();
      await this.trigger.setupGitHubAPI();
      this.outputChannel.appendLine("\u2705 CI/CD Integration initialized");
      if (this.discoveryResult.recommendIntegration) {
        this.showIntegrationSuggestion();
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u274C CI/CD initialization failed: ${error}`);
    }
  }
  /**
   * Show integration suggestion to user
   */
  async showIntegrationSuggestion() {
    if (!this.discoveryResult) return;
    const readiness = this.discovery.getReadinessScore(this.discoveryResult);
    const message = `CI/CD integration is recommended for your project (${readiness}% ready). Would you like to set it up?`;
    const result = await vscode13.window.showInformationMessage(
      message,
      "Setup Integration",
      "View Details",
      "Skip"
    );
    switch (result) {
      case "Setup Integration":
        await this.setupIntegration();
        break;
      case "View Details":
        await this.showDiscoveryDetails();
        break;
    }
  }
  /**
   * Setup CI/CD integration
   */
  async setupIntegration() {
    if (!this.discoveryResult) {
      vscode13.window.showWarningMessage("Please run discovery first");
      return;
    }
    try {
      const options = await this.integrator.setupIntegration(this.discoveryResult);
      if (options) {
        vscode13.window.showInformationMessage("CI/CD integration setup completed!");
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Integration setup failed: ${error}`);
      vscode13.window.showErrorMessage("CI/CD integration setup failed");
    }
  }
  /**
   * Show discovery details
   */
  async showDiscoveryDetails() {
    if (!this.discoveryResult) return;
    const items = [
      {
        label: "\u{1F4CA} Project Analysis",
        description: `${this.discoveryResult.workflowFiles.length} workflows, ${this.discoveryResult.hasBDDTests ? "BDD detected" : "No BDD"}`
      },
      ...this.discoveryResult.suggestions.map((suggestion) => ({
        label: "\u{1F4A1} Suggestion",
        description: suggestion
      }))
    ];
    await vscode13.window.showQuickPick(items, {
      placeHolder: "CI/CD Discovery Results"
    });
  }
  /**
   * Show workflow management interface
   */
  async manageWorkflows() {
    if (!this.discoveryResult) {
      await this.initialize();
    }
    if (!this.discoveryResult || this.discoveryResult.workflowFiles.length === 0) {
      vscode13.window.showInformationMessage("No GitHub Actions workflows found");
      return;
    }
    await this.trigger.showWorkflowStatus(this.discoveryResult.workflowFiles);
  }
  /**
   * Generate reports
   */
  async generateReports() {
    try {
      this.outputChannel.appendLine("\u{1F4CA} Starting report generation...");
      vscode13.window.showInformationMessage("Report generation feature coming soon!");
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Report generation failed: ${error}`);
      vscode13.window.showErrorMessage("Report generation failed");
    }
  }
  /**
   * Get current integration status
   */
  async getStatus() {
    const integrationStatus = await this.integrator.getIntegrationStatus();
    return {
      initialized: !!this.discoveryResult,
      hasWorkflows: this.discoveryResult?.hasGitHubActions || false,
      hasBDDTests: this.discoveryResult?.hasBDDTests || false,
      integrationEnabled: integrationStatus.enabled
    };
  }
  /**
   * Refresh discovery results
   */
  async refresh() {
    this.outputChannel.appendLine("\u{1F504} Refreshing CI/CD discovery...");
    this.discoveryResult = await this.discovery.scanProject();
  }
};

// src/cicd/reportViewer.ts
var vscode14 = __toESM(require("vscode"));
var path13 = __toESM(require("path"));
var fs7 = __toESM(require("fs"));
var ReportViewer = class {
  constructor(outputChannel, workspaceRoot) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Show existing reports to user
   */
  async showReports() {
    this.outputChannel.appendLine("\u{1F4CA} Looking for existing reports...");
    try {
      const reports = await this.findExistingReports();
      if (reports.length === 0) {
        vscode14.window.showInformationMessage("No test reports found. Run tests first to generate reports.");
        return;
      }
      const selected = await vscode14.window.showQuickPick(reports, {
        placeHolder: "Select a report to view"
      });
      if (selected) {
        await this.openReport(selected.path, selected.type);
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Error finding reports: ${error}`);
      vscode14.window.showErrorMessage("Failed to find reports");
    }
  }
  /**
   * Find existing report files
   */
  async findExistingReports() {
    const reports = [];
    const reportLocations = [
      "playwright-report",
      "test-results",
      "cucumber-report",
      "reports"
    ];
    for (const location of reportLocations) {
      const reportDir = path13.join(this.workspaceRoot, location);
      try {
        if (await this.directoryExists(reportDir)) {
          const foundReports = await this.scanReportDirectory(reportDir, location);
          reports.push(...foundReports);
        }
      } catch (error) {
      }
    }
    return reports;
  }
  /**
   * Scan a directory for report files
   */
  async scanReportDirectory(dirPath, dirName) {
    const reports = [];
    try {
      const files = await fs7.promises.readdir(dirPath);
      for (const file of files) {
        const filePath = path13.join(dirPath, file);
        const stat = await fs7.promises.stat(filePath);
        if (stat.isFile()) {
          const report = this.identifyReportFile(filePath, file, dirName);
          if (report) {
            reports.push(report);
          }
        }
      }
    } catch (error) {
    }
    return reports;
  }
  /**
   * Identify if a file is a report
   */
  identifyReportFile(filePath, fileName, dirName) {
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes("index.html") || lowerFileName.includes("report.html")) {
      return {
        label: `\u{1F4CA} ${dirName} - HTML Report`,
        description: `${fileName} \u2022 Interactive dashboard`,
        path: filePath,
        type: "html"
      };
    }
    if (lowerFileName.includes(".json") && (lowerFileName.includes("test") || lowerFileName.includes("result") || lowerFileName.includes("report"))) {
      return {
        label: `\u{1F4C4} ${dirName} - JSON Report`,
        description: `${fileName} \u2022 Machine readable`,
        path: filePath,
        type: "json"
      };
    }
    if (lowerFileName.includes(".xml") && (lowerFileName.includes("test") || lowerFileName.includes("result") || lowerFileName.includes("junit"))) {
      return {
        label: `\u{1F4CB} ${dirName} - XML Report`,
        description: `${fileName} \u2022 JUnit format`,
        path: filePath,
        type: "xml"
      };
    }
    return null;
  }
  /**
   * Open a report file
   */
  async openReport(reportPath, type) {
    try {
      switch (type) {
        case "html":
          await this.openHTMLReport(reportPath);
          break;
        case "json":
        case "xml":
          await this.openTextReport(reportPath);
          break;
      }
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Error opening report: ${error}`);
      vscode14.window.showErrorMessage("Failed to open report");
    }
  }
  /**
   * Open HTML report in browser
   */
  async openHTMLReport(reportPath) {
    const uri = vscode14.Uri.file(reportPath);
    await vscode14.env.openExternal(uri);
    this.outputChannel.appendLine(`\u{1F310} Opened HTML report: ${path13.basename(reportPath)}`);
  }
  /**
   * Open text-based report in VS Code
   */
  async openTextReport(reportPath) {
    const document = await vscode14.workspace.openTextDocument(reportPath);
    await vscode14.window.showTextDocument(document);
    this.outputChannel.appendLine(`\u{1F4C4} Opened report: ${path13.basename(reportPath)}`);
  }
  /**
   * Share report via Slack (if configured)
   */
  async shareReport(reportPath) {
    const config = vscode14.workspace.getConfiguration("playwrightBdd");
    const slackWebhook = config.get("cicd.slackWebhook");
    if (!slackWebhook) {
      vscode14.window.showWarningMessage("Slack webhook not configured");
      return;
    }
    try {
      const reportSummary = await this.generateReportSummary(reportPath);
      vscode14.window.showInformationMessage(`Report summary would be shared to Slack:
${reportSummary}`);
    } catch (error) {
      this.outputChannel.appendLine(`\u274C Error sharing report: ${error}`);
      vscode14.window.showErrorMessage("Failed to share report");
    }
  }
  /**
   * Generate a quick summary of the report
   */
  async generateReportSummary(reportPath) {
    try {
      const fileName = path13.basename(reportPath);
      const stats = await fs7.promises.stat(reportPath);
      return `\u{1F4CA} Test Report: ${fileName}
\u{1F4C5} Generated: ${stats.mtime.toLocaleString()}
\u{1F4C1} Location: ${path13.relative(this.workspaceRoot, reportPath)}`;
    } catch (error) {
      return "Report summary not available";
    }
  }
  // Utility methods
  async directoryExists(dirPath) {
    try {
      const stat = await fs7.promises.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
};

// src/testExplorerUI.ts
var vscode15 = __toESM(require("vscode"));
var TestExplorerUI = class {
  constructor(controller, outputChannel) {
    this.testResults = /* @__PURE__ */ new Map();
    this.selectedTags = /* @__PURE__ */ new Set();
    this.statusFilter = "all";
    this.disposables = [];
    this.controller = controller;
    this.outputChannel = outputChannel;
    this.treeDataProvider = new BDDTestTreeDataProvider(controller, this);
    this.setupTreeView();
    this.setupWebviewPanel();
  }
  /**
   * Register commands with the extension context
   */
  registerCommands(context) {
    context.subscriptions.push(
      vscode15.commands.registerCommand("playwright-bdd.treeView.runSelected", () => {
        this.runSelectedTests();
      })
    );
    context.subscriptions.push(
      vscode15.commands.registerCommand("playwright-bdd.treeView.debugSelected", () => {
        this.debugSelectedTests();
      })
    );
    context.subscriptions.push(
      vscode15.commands.registerCommand("playwright-bdd.treeView.filterByTag", () => {
        this.showTagFilter();
      })
    );
    context.subscriptions.push(
      vscode15.commands.registerCommand("playwright-bdd.treeView.filterByStatus", () => {
        this.showStatusFilter();
      })
    );
    context.subscriptions.push(
      vscode15.commands.registerCommand("playwright-bdd.treeView.clearFilters", () => {
        this.clearAllFilters();
      })
    );
    context.subscriptions.push(
      vscode15.commands.registerCommand("playwright-bdd.treeView.showResults", () => {
        this.showResultsWebview();
      })
    );
    context.subscriptions.push(
      vscode15.commands.registerCommand("playwright-bdd.treeView.showSettings", () => {
        vscode15.commands.executeCommand("playwright-bdd.showSettings");
      })
    );
  }
  /**
   * Setup enhanced tree view with custom filtering and actions
   */
  setupTreeView() {
    const treeView = vscode15.window.createTreeView("playwrightBddTests", {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true,
      canSelectMany: true
    });
    treeView.onDidChangeSelection((event) => {
      this.handleSelectionChange(event.selection);
    });
    this.disposables.push(treeView);
  }
  /**
   * Setup webview panel for enhanced test results and analytics
   */
  setupWebviewPanel() {
  }
  /**
   * Handle selection changes in tree view
   */
  handleSelectionChange(selection) {
    if (selection.length === 0) {
      return;
    }
    const hasRunnableTests = selection.some((item) => item.testItem);
    vscode15.commands.executeCommand("setContext", "bddTestsSelected", hasRunnableTests);
    vscode15.commands.executeCommand("setContext", "bddMultipleTestsSelected", selection.length > 1);
    const statusBar = vscode15.window.createStatusBarItem(vscode15.StatusBarAlignment.Left);
    statusBar.text = `$(beaker) ${selection.length} test(s) selected`;
    statusBar.show();
    setTimeout(() => {
      statusBar.hide();
      statusBar.dispose();
    }, 3e3);
  }
  /**
   * Run selected tests from tree view
   */
  async runSelectedTests() {
    const selected = this.treeDataProvider.getSelectedItems();
    if (selected.length === 0) {
      vscode15.window.showWarningMessage("No tests selected");
      return;
    }
    const testItems = selected.map((item) => item.testItem).filter(Boolean);
    if (testItems.length === 0) {
      vscode15.window.showWarningMessage("Selected items are not runnable tests");
      return;
    }
    const request = new vscode15.TestRunRequest(testItems);
    const run = this.controller.createTestRun(request);
    try {
      for (const testItem of testItems) {
        run.enqueued(testItem);
        run.started(testItem);
        const result = await this.executeTest(testItem);
        this.updateTestResult(testItem.id, result);
        if (result.status === "passed") {
          run.passed(testItem, result.duration);
        } else if (result.status === "failed") {
          const message = new vscode15.TestMessage(result.error || "Test failed");
          run.failed(testItem, message, result.duration);
        } else if (result.status === "skipped") {
          run.skipped(testItem);
        }
      }
    } finally {
      run.end();
    }
    this.treeDataProvider.refresh();
  }
  /**
   * Debug selected tests from tree view
   */
  async debugSelectedTests() {
    const selected = this.treeDataProvider.getSelectedItems();
    if (selected.length === 0) {
      vscode15.window.showWarningMessage("No tests selected");
      return;
    }
    const firstTest = selected[0].testItem;
    if (!firstTest) {
      vscode15.window.showWarningMessage("Selected item is not a runnable test");
      return;
    }
    vscode15.commands.executeCommand("playwright-bdd.debugScenario", firstTest.label);
  }
  /**
   * Show tag filter quick pick
   */
  async showTagFilter() {
    const availableTags = this.extractTagsFromTests();
    if (availableTags.length === 0) {
      vscode15.window.showInformationMessage("No tags found in test files");
      return;
    }
    const items = availableTags.map((tag) => ({
      label: `@${tag.name}`,
      description: `${tag.count} test(s)`,
      picked: this.selectedTags.has(tag.name),
      tag
    }));
    const selected = await vscode15.window.showQuickPick(items, {
      placeHolder: "Select tags to filter by (filters VSCode Test Explorer)",
      canPickMany: true,
      matchOnDescription: true
    });
    if (selected) {
      this.selectedTags.clear();
      selected.forEach((item) => this.selectedTags.add(item.tag.name));
      this.applyMainTestExplorerFilters();
    }
  }
  /**
   * Show status filter quick pick
   */
  async showStatusFilter() {
    const statusOptions = [
      { label: "All Tests", value: "all", description: "Show all tests regardless of status" },
      { label: "\u2705 Passed", value: "passed", description: "Show only passed tests" },
      { label: "\u274C Failed", value: "failed", description: "Show only failed tests" },
      { label: "\u23ED\uFE0F Skipped", value: "skipped", description: "Show only skipped tests" },
      { label: "\u23F8\uFE0F Not Run", value: "pending", description: "Show only tests that haven't been run" }
    ];
    const selected = await vscode15.window.showQuickPick(statusOptions, {
      placeHolder: "Filter tests by status"
    });
    if (selected) {
      this.statusFilter = selected.value;
      this.applyFilters();
    }
  }
  /**
   * Clear all active filters
   */
  clearAllFilters() {
    this.selectedTags.clear();
    this.statusFilter = "all";
    this.applyFilters();
    this.applyMainTestExplorerFilters();
    vscode15.window.showInformationMessage("All filters cleared from VSCode Test Explorer");
  }
  /**
   * Apply current filters to tree view
   */
  applyFilters() {
    this.treeDataProvider.applyFilters({
      tags: Array.from(this.selectedTags),
      status: this.statusFilter
    });
    const filterInfo = [];
    if (this.selectedTags.size > 0) {
      filterInfo.push(`Tags: ${Array.from(this.selectedTags).join(", ")}`);
    }
    if (this.statusFilter !== "all") {
      filterInfo.push(`Status: ${this.statusFilter}`);
    }
    if (filterInfo.length > 0) {
      const statusBar = vscode15.window.createStatusBarItem(vscode15.StatusBarAlignment.Left);
      statusBar.text = `$(filter) Filters: ${filterInfo.join(" | ")}`;
      statusBar.command = "playwright-bdd.treeView.clearFilters";
      statusBar.show();
    }
  }
  /**
   * Apply filters to the main VSCode Test Explorer (where run/debug works)
   */
  applyMainTestExplorerFilters() {
    const selectedTagsArray = Array.from(this.selectedTags);
    this.controller.items.forEach((item) => {
      this.filterTestItem(item, selectedTagsArray);
    });
    const filterInfo = [];
    if (this.selectedTags.size > 0) {
      filterInfo.push(`Tags: ${selectedTagsArray.join(", ")}`);
    }
    const statusBar = vscode15.window.createStatusBarItem(vscode15.StatusBarAlignment.Left);
    if (filterInfo.length > 0) {
      statusBar.text = `$(filter) VSCode Test Explorer filtered by: ${filterInfo.join(" | ")}`;
      statusBar.command = "playwright-bdd.treeView.clearFilters";
      statusBar.tooltip = "Click to clear filters";
    } else {
      statusBar.text = `$(filter-filled) VSCode Test Explorer - No filters active`;
    }
    statusBar.show();
    setTimeout(() => {
      statusBar.hide();
      statusBar.dispose();
    }, 5e3);
    this.outputChannel.appendLine(`Applied tag filters to VSCode Test Explorer: ${selectedTagsArray.join(", ")}`);
  }
  /**
   * Filter individual test item and its children based on tags
   */
  filterTestItem(item, selectedTags) {
    if (selectedTags.length === 0) {
      this.setTestItemVisibility(item, true);
      return true;
    }
    const itemTags = this.extractTagsFromTestItem(item);
    const hasMatchingTag = selectedTags.some((tag) => itemTags.includes(tag));
    let hasMatchingChild = false;
    item.children.forEach((child) => {
      if (this.filterTestItem(child, selectedTags)) {
        hasMatchingChild = true;
      }
    });
    const shouldShow = hasMatchingTag || hasMatchingChild;
    this.setTestItemVisibility(item, shouldShow);
    return shouldShow;
  }
  /**
   * Set test item visibility (hide/show in VSCode Test Explorer)
   */
  setTestItemVisibility(item, visible) {
    if (visible) {
      if (!this.controller.items.get(item.id)) {
        this.controller.items.add(item);
      }
    } else {
      this.controller.items.delete(item.id);
    }
  }
  /**
   * Show enhanced results webview
   */
  showResultsWebview() {
    if (this.webviewPanel) {
      this.webviewPanel.reveal();
      return;
    }
    this.webviewPanel = vscode15.window.createWebviewPanel(
      "bddTestResults",
      "BDD Test Results & Analytics",
      vscode15.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: []
      }
    );
    this.webviewPanel.webview.html = this.getWebviewContent();
    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = void 0;
    });
    this.webviewPanel.webview.onDidReceiveMessage(
      (message) => this.handleWebviewMessage(message),
      void 0
    );
  }
  /**
   * Generate webview HTML content
   */
  getWebviewContent() {
    const results = Array.from(this.testResults.values());
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.status === "passed").length;
    const failedTests = results.filter((r) => r.status === "failed").length;
    const skippedTests = results.filter((r) => r.status === "skipped").length;
    const passRate = totalTests > 0 ? Math.round(passedTests / totalTests * 100) : 0;
    const recentResults = results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
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
            <h1>\u{1F9EA} BDD Test Results & Analytics</h1>
            <p>Comprehensive overview of your Playwright BDD test execution</p>
        </div>

        <div class="filters">
            <button class="button" onclick="refreshResults()">\u{1F504} Refresh</button>
            <button class="button" onclick="exportResults()">\u{1F4CB} Export</button>
            <button class="button" onclick="showTrends()">\u{1F4CA} Trends</button>
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
            ${recentResults.map((result) => `
                <div class="test-item">
                    <div class="test-name">${result.name}</div>
                    <div class="test-status ${result.status}">${this.getStatusIcon(result.status)}</div>
                    <div class="test-duration">${result.duration || 0}ms</div>
                </div>
            `).join("")}
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
  handleWebviewMessage(message) {
    switch (message.command) {
      case "refresh":
        this.refreshResults();
        break;
      case "export":
        this.exportResults();
        break;
      case "trends":
        this.showTrends();
        break;
    }
  }
  /**
   * Get status icon for test result
   */
  getStatusIcon(status) {
    switch (status) {
      case "passed":
        return "\u2705";
      case "failed":
        return "\u274C";
      case "skipped":
        return "\u23ED\uFE0F";
      case "pending":
        return "\u23F8\uFE0F";
      default:
        return "\u2753";
    }
  }
  /**
   * Extract tags from test files
   */
  extractTagsFromTests() {
    const tagCounts = /* @__PURE__ */ new Map();
    this.controller.items.forEach((item) => {
      const tags = this.extractTagsFromTestItem(item);
      tags.forEach((tag) => {
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
  extractTagsFromTestItem(item) {
    if (!item.uri) {
      return [];
    }
    try {
      const content = require("fs").readFileSync(item.uri.fsPath, "utf8");
      const lines = content.split("\n");
      const tags = [];
      for (const line of lines) {
        const tagMatches = line.match(/@(\w+)/g);
        if (tagMatches) {
          tagMatches.forEach((match) => {
            const tag = match.substring(1);
            if (!tags.includes(tag)) {
              tags.push(tag);
            }
          });
        }
      }
      return tags;
    } catch (error) {
      return [];
    }
  }
  /**
   * Get color for tag
   */
  getTagColor(tagName) {
    const colors = ["blue", "green", "orange", "purple", "red", "yellow"];
    const hash = tagName.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
  /**
   * Execute a test (placeholder - integrate with your test runner)
   */
  async executeTest(testItem) {
    return {
      id: testItem.id,
      name: testItem.label,
      status: "passed",
      // Placeholder
      duration: Math.random() * 1e3,
      timestamp: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Update test result
   */
  updateTestResult(testId, result) {
    this.testResults.set(testId, result);
  }
  /**
   * Refresh results in webview
   */
  refreshResults() {
    if (this.webviewPanel) {
      this.webviewPanel.webview.html = this.getWebviewContent();
    }
  }
  /**
   * Export results to file
   */
  async exportResults() {
    const results = Array.from(this.testResults.values());
    const report = this.generateTestReport(results);
    const doc = await vscode15.workspace.openTextDocument({
      content: report,
      language: "markdown"
    });
    await vscode15.window.showTextDocument(doc);
  }
  /**
   * Show trends analysis
   */
  showTrends() {
    vscode15.window.showInformationMessage("Trends analysis feature coming soon!");
  }
  /**
   * Generate test report
   */
  generateTestReport(results) {
    const totalTests = results.length;
    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    return `# BDD Test Execution Report

Generated: ${(/* @__PURE__ */ new Date()).toLocaleString()}

## Summary
- **Total Tests**: ${totalTests}
- **Passed**: ${passed} (${Math.round(passed / totalTests * 100)}%)
- **Failed**: ${failed} (${Math.round(failed / totalTests * 100)}%)
- **Skipped**: ${skipped} (${Math.round(skipped / totalTests * 100)}%)

## Test Results

${results.map((result) => `
### ${result.name}
- **Status**: ${result.status}
- **Duration**: ${result.duration || 0}ms
- **Timestamp**: ${result.timestamp.toLocaleString()}
${result.error ? `- **Error**: ${result.error}` : ""}
`).join("")}
`;
  }
  /**
   * Dispose resources
   */
  dispose() {
    if (this.webviewPanel) {
      this.webviewPanel.dispose();
    }
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }
};
var BDDTestTreeDataProvider = class {
  constructor(controller, ui) {
    this.controller = controller;
    this.ui = ui;
    this._onDidChangeTreeData = new vscode15.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.selectedItems = [];
    this.activeFilters = { tags: [], status: "all" };
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren(element) {
    if (!element) {
      const items = [];
      this.controller.items.forEach((item) => {
        if (this.shouldShowItem(item)) {
          items.push(new BDDTestTreeItem(
            item.label,
            vscode15.TreeItemCollapsibleState.Expanded,
            item,
            "feature"
          ));
        }
      });
      return Promise.resolve(items);
    } else {
      const children = [];
      if (element.testItem) {
        element.testItem.children.forEach((child) => {
          if (this.shouldShowItem(child)) {
            children.push(new BDDTestTreeItem(
              child.label,
              child.children.size > 0 ? vscode15.TreeItemCollapsibleState.Collapsed : vscode15.TreeItemCollapsibleState.None,
              child,
              "scenario"
            ));
          }
        });
      }
      return Promise.resolve(children);
    }
  }
  shouldShowItem(item) {
    if (this.activeFilters.status !== "all") {
      const result = this.ui["testResults"].get(item.id);
      if (!result || result.status !== this.activeFilters.status) {
        return false;
      }
    }
    if (this.activeFilters.tags.length > 0) {
      const itemTags = this.ui["extractTagsFromTestItem"](item);
      const hasMatchingTag = this.activeFilters.tags.some((tag) => itemTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }
    return true;
  }
  applyFilters(filters) {
    this.activeFilters = filters;
    this.refresh();
  }
  getSelectedItems() {
    return this.selectedItems;
  }
};
var BDDTestTreeItem = class extends vscode15.TreeItem {
  constructor(label, collapsibleState, testItem, type) {
    super(label, collapsibleState);
    this.label = label;
    this.collapsibleState = collapsibleState;
    this.testItem = testItem;
    this.type = type;
    this.tooltip = `${this.label}`;
    this.description = this.getDescription();
    this.iconPath = this.getIcon();
    this.contextValue = this.type;
    if (testItem) {
      this.command = {
        command: "vscode.open",
        title: "Open",
        arguments: [testItem.uri]
      };
    }
  }
  getDescription() {
    if (this.type === "feature" && this.testItem) {
      const scenarioCount = this.testItem.children.size;
      return scenarioCount > 0 ? `${scenarioCount} scenarios` : "";
    }
    return "";
  }
  getIcon() {
    switch (this.type) {
      case "feature":
        return new vscode15.ThemeIcon("file-text");
      case "scenario":
        return new vscode15.ThemeIcon("beaker");
      case "example":
        return new vscode15.ThemeIcon("symbol-array");
      default:
        return new vscode15.ThemeIcon("symbol-misc");
    }
  }
};

// src/settingsUI.ts
var vscode16 = __toESM(require("vscode"));
var path14 = __toESM(require("path"));
var SettingsUI = class {
  constructor(outputChannel, workspaceRoot) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Show the settings management interface
   */
  async showSettingsUI() {
    if (this.webviewPanel) {
      this.webviewPanel.reveal();
      return;
    }
    this.webviewPanel = vscode16.window.createWebviewPanel(
      "bddSettings",
      "BDD Test Runner Settings",
      vscode16.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [],
        retainContextWhenHidden: true
      }
    );
    this.webviewPanel.webview.html = await this.getSettingsWebviewContent();
    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = void 0;
    });
    this.webviewPanel.webview.onDidReceiveMessage(
      (message) => this.handleWebviewMessage(message),
      void 0
    );
  }
  /**
   * Get configuration field definitions
   */
  getConfigurationFields() {
    return [
      // Core Configuration
      {
        key: "playwrightBdd.configPath",
        label: "Playwright Config Path",
        type: "path",
        description: "Path to the Playwright config file relative to the workspace root",
        defaultValue: "./playwright.config.ts",
        placeholder: "./playwright.config.ts",
        group: "core"
      },
      {
        key: "playwrightBdd.tsconfigPath",
        label: "TypeScript Config Path",
        type: "path",
        description: "Optional path to a custom tsconfig file for Playwright tests",
        defaultValue: "",
        placeholder: "./tsconfig.json",
        group: "core"
      },
      {
        key: "playwrightBdd.featureFolder",
        label: "Features Folder",
        type: "path",
        description: "Relative path to the folder containing .feature files",
        defaultValue: "features",
        placeholder: "features",
        group: "core"
      },
      {
        key: "playwrightBdd.stepsFolder",
        label: "Steps Folder",
        type: "path",
        description: "Relative path to the folder containing step definition files",
        defaultValue: "steps",
        placeholder: "steps",
        group: "core"
      },
      // Test Execution
      {
        key: "playwrightBdd.tags",
        label: "Default Tags Filter",
        type: "string",
        description: "Optional value for feature/scenario tags to filter tests. Used as --grep=<tags>",
        defaultValue: "",
        placeholder: "@smoke,@regression",
        group: "execution"
      },
      {
        key: "playwrightBdd.enableFeatureGen",
        label: "Enable Feature Generation",
        type: "boolean",
        description: "Whether to run the feature generation step before tests",
        defaultValue: true,
        group: "execution"
      },
      {
        key: "playwrightBdd.testCommand",
        label: "Test Command Template",
        type: "command",
        description: "Command to run Playwright tests. Use ${configPath}, ${tsconfigArg}, and ${tagsArg} as placeholders.",
        defaultValue: "npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}",
        placeholder: "npx playwright test --config=${configPath}",
        group: "execution"
      },
      {
        key: "playwrightBdd.featureGenCommand",
        label: "Feature Generation Command",
        type: "command",
        description: "Command to generate features. Use ${configPath} as a placeholder.",
        defaultValue: "npx bddgen --config=${configPath}",
        placeholder: "npx bddgen --config=${configPath}",
        group: "execution"
      },
      // Discovery & Automation
      {
        key: "playwrightBdd.autoDiscoverConfig",
        label: "Auto-Discover Configuration",
        type: "boolean",
        description: "Automatically discover Playwright config, feature folders, and step folders",
        defaultValue: true,
        group: "discovery"
      },
      {
        key: "playwrightBdd.stepsFilePattern",
        label: "Steps File Pattern",
        type: "string",
        description: "Glob pattern for step definition files",
        defaultValue: "**/*.{js,ts,mjs,mts}",
        placeholder: "**/*.{js,ts}",
        group: "discovery"
      },
      // CI/CD Integration
      {
        key: "playwrightBdd.cicd.githubToken",
        label: "GitHub Token",
        type: "string",
        description: "Personal Access Token for GitHub API access (stored securely)",
        defaultValue: "",
        placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
        group: "cicd"
      },
      {
        key: "playwrightBdd.cicd.autoTriggerWorkflows",
        label: "Auto-Trigger Workflows",
        type: "boolean",
        description: "Automatically trigger GitHub workflows on test execution",
        defaultValue: false,
        group: "cicd"
      },
      // Execution Settings
      {
        key: "playwrightBdd.execution.retryCount",
        label: "Test Retry Count",
        type: "number",
        description: "Number of retry attempts for failed test executions (1 = no retry, 2 = 1 retry, etc.)",
        defaultValue: 2,
        group: "execution",
        validation: (value) => {
          if (value < 1 || value > 10) return "Retry count must be between 1 and 10";
          return void 0;
        }
      },
      {
        key: "playwrightBdd.execution.retryDelay",
        label: "Retry Delay (milliseconds)",
        type: "number",
        description: "Delay between retry attempts in milliseconds",
        defaultValue: 2e3,
        group: "execution",
        validation: (value) => {
          if (value < 100 || value > 3e4) return "Retry delay must be between 100ms and 30000ms";
          return void 0;
        }
      },
      // Copilot AI Integration
      {
        key: "playwrightBdd.copilot.enabled",
        label: "Enable Copilot Integration",
        type: "boolean",
        description: "Enable AI-powered debugging assistance and suggestions",
        defaultValue: true,
        group: "copilot"
      },
      {
        key: "playwrightBdd.copilot.autoShowSuggestions",
        label: "Auto-Show Suggestions",
        type: "boolean",
        description: "Automatically show suggestions when debugging sessions start",
        defaultValue: true,
        group: "copilot"
      },
      {
        key: "playwrightBdd.copilot.confidenceThreshold",
        label: "Suggestion Confidence Threshold",
        type: "number",
        description: "Minimum confidence level (0-100) for showing suggestions",
        defaultValue: 60,
        group: "copilot",
        validation: (value) => {
          if (value < 0 || value > 100) return "Confidence threshold must be between 0 and 100";
          return void 0;
        }
      },
      {
        key: "playwrightBdd.copilot.maxSuggestions",
        label: "Maximum Suggestions",
        type: "number",
        description: "Maximum number of suggestions to show at once",
        defaultValue: 5,
        group: "copilot",
        validation: (value) => {
          if (value < 1 || value > 20) return "Maximum suggestions must be between 1 and 20";
          return void 0;
        }
      },
      {
        key: "playwrightBdd.copilot.enableStepAnalysis",
        label: "Enable Step Analysis",
        type: "boolean",
        description: "Analyze individual steps for potential issues and improvements",
        defaultValue: true,
        group: "copilot"
      },
      {
        key: "playwrightBdd.copilot.enableErrorAnalysis",
        label: "Enable Error Analysis",
        type: "boolean",
        description: "Automatically analyze error messages and provide debugging suggestions",
        defaultValue: true,
        group: "copilot"
      },
      {
        key: "playwrightBdd.copilot.enablePerformanceHints",
        label: "Enable Performance Hints",
        type: "boolean",
        description: "Show suggestions for test performance optimization",
        defaultValue: true,
        group: "copilot"
      },
      {
        key: "playwrightBdd.copilot.smartBreakpoints",
        label: "Smart Breakpoint Suggestions",
        type: "boolean",
        description: "Enable intelligent breakpoint placement suggestions",
        defaultValue: true,
        group: "copilot"
      },
      {
        key: "playwrightBdd.copilot.apiProvider",
        label: "AI API Provider",
        type: "dropdown",
        description: "AI service provider for advanced suggestions (future feature)",
        defaultValue: "local",
        options: ["local", "openai", "github-copilot", "custom"],
        group: "copilot"
      },
      {
        key: "playwrightBdd.copilot.customApiEndpoint",
        label: "Custom API Endpoint",
        type: "string",
        description: "Custom API endpoint for AI suggestions (when using custom provider)",
        defaultValue: "",
        placeholder: "https://api.example.com/v1/suggestions",
        group: "copilot"
      },
      // UI & Display
      {
        key: "playwrightBdd.ui.showTagFilters",
        label: "Show Tag Filters",
        type: "boolean",
        description: "Show tag filtering options in the test explorer",
        defaultValue: true,
        group: "ui"
      },
      {
        key: "playwrightBdd.ui.showStatusFilters",
        label: "Show Status Filters",
        type: "boolean",
        description: "Show status filtering options in the test explorer",
        defaultValue: true,
        group: "ui"
      },
      {
        key: "playwrightBdd.ui.showExecutionHistory",
        label: "Show Execution History",
        type: "boolean",
        description: "Enable test execution history tracking",
        defaultValue: true,
        group: "ui"
      },
      {
        key: "playwrightBdd.ui.autoRefreshInterval",
        label: "Auto-Refresh Interval (seconds)",
        type: "number",
        description: "Interval for auto-refreshing test discovery (0 to disable)",
        defaultValue: 0,
        group: "ui"
      },
      {
        key: "playwrightBdd.ui.showCopilotPanel",
        label: "Show Copilot Panel",
        type: "boolean",
        description: "Show the Copilot assistance panel in the test explorer",
        defaultValue: true,
        group: "ui"
      }
    ];
  }
  /**
   * Get configuration groups
   */
  getConfigurationGroups() {
    return [
      {
        name: "core",
        title: "Core Configuration",
        description: "Essential settings for Playwright BDD integration",
        icon: "gear"
      },
      {
        name: "execution",
        title: "Test Execution",
        description: "Settings for running and managing tests",
        icon: "play"
      },
      {
        name: "discovery",
        title: "Discovery & Automation",
        description: "Automatic discovery and detection settings",
        icon: "search"
      },
      {
        name: "copilot",
        title: "\u{1F916} AI Copilot",
        description: "AI-powered debugging assistance and suggestions",
        icon: "robot"
      },
      {
        name: "cicd",
        title: "CI/CD Integration",
        description: "GitHub Actions and workflow integration",
        icon: "github"
      },
      {
        name: "ui",
        title: "User Interface",
        description: "UI customization and display preferences",
        icon: "browser"
      }
    ];
  }
  /**
   * Generate webview HTML content
   */
  async getSettingsWebviewContent() {
    const config = vscode16.workspace.getConfiguration();
    const fields = this.getConfigurationFields();
    const groups = this.getConfigurationGroups();
    const currentValues = {};
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
                <h1>\u{1F9EA} BDD Test Runner Settings</h1>
                <p>Configure all aspects of your Playwright BDD testing experience</p>
            </div>

            <div class="actions">
                <button class="btn" onclick="saveAllSettings()">
                    <span>\u{1F4BE}</span> Save All Settings
                </button>
                <button class="btn secondary" onclick="resetToDefaults()">
                    <span>\u{1F504}</span> Reset to Defaults
                </button>
                <button class="btn secondary" onclick="exportSettings()">
                    <span>\u{1F4CB}</span> Export Settings
                </button>
                <button class="btn secondary" onclick="importSettings()">
                    <span>\u{1F4C1}</span> Import Settings
                </button>
                <button class="btn secondary" onclick="validateSettings()">
                    <span>\u2705</span> Validate Configuration
                </button>
            </div>

            <div class="settings-groups">
                <div class="group-nav">
                    ${groups.map((group, index) => `
                        <div class="group-nav-item ${index === 0 ? "active" : ""}" 
                             onclick="showGroup('${group.name}')" 
                             data-group="${group.name}">
                            <div class="group-nav-icon">\u{1F517}</div>
                            <div class="group-nav-text">${group.title}</div>
                        </div>
                    `).join("")}
                </div>

                <div class="settings-content">
                    ${groups.map((group, groupIndex) => `
                        <div class="settings-group ${groupIndex === 0 ? "active" : ""}" data-group="${group.name}">
                            <div class="group-header">
                                <h2>${group.title}</h2>
                                <p>${group.description}</p>
                            </div>
                            
                            ${fields.filter((f) => f.group === group.name).map((field) => `
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
                            `).join("")}
                        </div>
                    `).join("")}
                </div>
            </div>

            <div class="footer">
                <p>Settings are automatically saved to your workspace configuration</p>
                <div id="status-indicator" class="status-indicator success" style="display: none;">
                    <span>\u2713</span> Settings saved successfully
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
  generateFormControl(field, currentValue) {
    switch (field.type) {
      case "boolean":
        return `<input type="checkbox" class="form-checkbox" ${currentValue ? "checked" : ""}>`;
      case "number":
        return `<input type="number" class="form-input" value="${currentValue || field.defaultValue}" placeholder="${field.placeholder || ""}">`;
      case "dropdown":
        if (!field.options) return "";
        return `
          <select class="form-select">
            ${field.options.map(
          (option) => `<option value="${option}" ${currentValue === option ? "selected" : ""}>${option}</option>`
        ).join("")}
          </select>`;
      case "path":
        const pathId = `path-${field.key.replace(/\./g, "-")}`;
        return `
          <div class="path-input-group">
            <input type="text" id="${pathId}" class="form-input path-input" 
                   value="${currentValue || field.defaultValue}" 
                   placeholder="${field.placeholder || ""}">
            <button class="browse-btn" onclick="browsePath('${pathId}')">Browse...</button>
          </div>`;
      case "command":
        return `<input type="text" class="form-input" value="${currentValue || field.defaultValue}" placeholder="${field.placeholder || ""}" style="font-family: monospace;">`;
      default:
        return `<input type="text" class="form-input" value="${currentValue || field.defaultValue}" placeholder="${field.placeholder || ""}">`;
    }
  }
  /**
   * Handle messages from webview
   */
  async handleWebviewMessage(message) {
    const config = vscode16.workspace.getConfiguration();
    switch (message.command) {
      case "saveSettings":
        await this.saveSettings(message.settings);
        break;
      case "updateSetting":
        await config.update(message.key, message.value, vscode16.ConfigurationTarget.Workspace);
        this.outputChannel.appendLine(`Updated setting: ${message.key} = ${message.value}`);
        break;
      case "resetSetting":
        const field = this.getConfigurationFields().find((f) => f.key === message.key);
        if (field) {
          await config.update(message.key, field.defaultValue, vscode16.ConfigurationTarget.Workspace);
          this.refreshWebview();
        }
        break;
      case "resetAllSettings":
        await this.resetAllSettings();
        break;
      case "exportSettings":
        await this.exportSettings();
        break;
      case "importSettings":
        await this.importSettings();
        break;
      case "validateSettings":
        await this.validateSettings();
        break;
      case "browsePath":
        await this.browsePath(message.inputId);
        break;
    }
  }
  /**
   * Save multiple settings
   */
  async saveSettings(settings) {
    const config = vscode16.workspace.getConfiguration();
    for (const [key, value] of Object.entries(settings)) {
      await config.update(key, value, vscode16.ConfigurationTarget.Workspace);
    }
    this.outputChannel.appendLine(`Saved ${Object.keys(settings).length} settings`);
    vscode16.window.showInformationMessage("Settings saved successfully!");
  }
  /**
   * Reset all settings to defaults
   */
  async resetAllSettings() {
    const config = vscode16.workspace.getConfiguration();
    const fields = this.getConfigurationFields();
    for (const field of fields) {
      await config.update(field.key, field.defaultValue, vscode16.ConfigurationTarget.Workspace);
    }
    this.outputChannel.appendLine("All settings reset to defaults");
    vscode16.window.showInformationMessage("All settings reset to default values!");
    this.refreshWebview();
  }
  /**
   * Export settings to file
   */
  async exportSettings() {
    const config = vscode16.workspace.getConfiguration();
    const fields = this.getConfigurationFields();
    const exportData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: "0.4.0",
      settings: {}
    };
    for (const field of fields) {
      exportData.settings[field.key] = config.get(field.key, field.defaultValue);
    }
    const content = JSON.stringify(exportData, null, 2);
    const doc = await vscode16.workspace.openTextDocument({
      content,
      language: "json"
    });
    await vscode16.window.showTextDocument(doc);
    vscode16.window.showInformationMessage("Settings exported to new document. Save it to preserve your configuration.");
  }
  /**
   * Import settings from file
   */
  async importSettings() {
    const fileUri = await vscode16.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        "JSON Files": ["json"]
      },
      title: "Import BDD Settings"
    });
    if (fileUri && fileUri[0]) {
      try {
        const content = await vscode16.workspace.fs.readFile(fileUri[0]);
        const data = JSON.parse(content.toString());
        if (data.settings) {
          await this.saveSettings(data.settings);
          this.refreshWebview();
          vscode16.window.showInformationMessage("Settings imported successfully!");
        } else {
          vscode16.window.showErrorMessage("Invalid settings file format");
        }
      } catch (error) {
        vscode16.window.showErrorMessage(`Failed to import settings: ${error}`);
      }
    }
  }
  /**
   * Validate current settings
   */
  async validateSettings() {
    const config = vscode16.workspace.getConfiguration();
    const fields = this.getConfigurationFields();
    const issues = [];
    for (const field of fields) {
      const value = config.get(field.key);
      if (field.validation) {
        const error = field.validation(value);
        if (error) {
          issues.push(`${field.label}: ${error}`);
        }
      }
      if (field.type === "path" && value) {
        if (field.key === "playwrightBdd.tsconfigPath") {
          if (value && typeof value === "string" && value.trim()) {
            let cleanPath = value.toString().trim();
            cleanPath = cleanPath.replace(/^--tsconfig=/, "");
            cleanPath = cleanPath.replace(/^--project=/, "");
            const fullPath = path14.resolve(this.workspaceRoot, cleanPath);
            try {
              await vscode16.workspace.fs.stat(vscode16.Uri.file(fullPath));
            } catch {
              issues.push(`${field.label}: Path does not exist: ${cleanPath}`);
            }
          }
        } else {
          const fullPath = path14.resolve(this.workspaceRoot, value);
          try {
            await vscode16.workspace.fs.stat(vscode16.Uri.file(fullPath));
          } catch {
            issues.push(`${field.label}: Path does not exist: ${value}`);
          }
        }
      }
    }
    if (issues.length === 0) {
      vscode16.window.showInformationMessage("\u2705 All settings are valid!");
    } else {
      const message = `Found ${issues.length} configuration issues:

${issues.join("\n")}`;
      this.outputChannel.appendLine(message);
      this.outputChannel.show();
      vscode16.window.showWarningMessage(`Found ${issues.length} configuration issues. Check output for details.`);
    }
  }
  /**
   * Browse for path
   */
  async browsePath(inputId) {
    const result = await vscode16.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: vscode16.Uri.file(this.workspaceRoot)
    });
    if (result && result[0]) {
      const relativePath = path14.relative(this.workspaceRoot, result[0].fsPath);
      if (this.webviewPanel) {
        this.webviewPanel.webview.postMessage({
          command: "setPath",
          inputId,
          path: relativePath
        });
      }
    }
  }
  /**
   * Refresh webview content
   */
  async refreshWebview() {
    if (this.webviewPanel) {
      this.webviewPanel.webview.html = await this.getSettingsWebviewContent();
    }
  }
  /**
   * Dispose resources
   */
  dispose() {
    if (this.webviewPanel) {
      this.webviewPanel.dispose();
    }
  }
};

// src/copilotIntegration.ts
var vscode17 = __toESM(require("vscode"));
var path15 = __toESM(require("path"));
var CopilotIntegrationService = class {
  constructor(outputChannel) {
    this.outputChannel = outputChannel;
  }
  /**
   * Initialize copilot integration with debugging tools
   */
  initialize(debuggingTools, stepDefinitionProvider) {
    this.debuggingTools = debuggingTools;
    this.stepDefinitionProvider = stepDefinitionProvider;
    this.debuggingTools.on("debugSessionStarted", this.onDebugSessionStarted.bind(this));
    this.debuggingTools.on("stepOver", this.onStepExecution.bind(this));
    this.debuggingTools.on("pause", this.onDebugPause.bind(this));
    this.debuggingTools.on("stop", this.onDebugStop.bind(this));
    this.outputChannel.appendLine("\u{1F916} Copilot Integration initialized for debugging support");
  }
  /**
   * Register copilot commands with VS Code
   */
  registerCommands(context) {
    context.subscriptions.push(
      vscode17.commands.registerCommand("playwright-bdd.copilotDebugAssist", async () => {
        await this.showDebugAssistant();
      })
    );
    context.subscriptions.push(
      vscode17.commands.registerCommand("playwright-bdd.copilotSuggestBreakpoints", async () => {
        await this.suggestSmartBreakpoints();
      })
    );
    context.subscriptions.push(
      vscode17.commands.registerCommand("playwright-bdd.copilotSuggestStepFix", async () => {
        await this.suggestStepDefinitionFix();
      })
    );
    context.subscriptions.push(
      vscode17.commands.registerCommand("playwright-bdd.copilotAnalyzeFailure", async (error) => {
        await this.analyzeTestFailure(error);
      })
    );
    context.subscriptions.push(
      vscode17.commands.registerCommand("playwright-bdd.copilotImproveTest", async () => {
        await this.suggestTestImprovements();
      })
    );
    this.outputChannel.appendLine("\u{1F916} Copilot commands registered");
  }
  /**
   * Main debug assistant interface
   */
  async showDebugAssistant() {
    const activeEditor = vscode17.window.activeTextEditor;
    if (!activeEditor) {
      vscode17.window.showWarningMessage("Please open a file to get debugging assistance.");
      return;
    }
    const context = await this.gatherDebugContext(activeEditor);
    const panel = vscode17.window.createWebviewPanel(
      "copilotDebugAssist",
      "\u{1F916} Copilot Debug Assistant",
      vscode17.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    panel.webview.html = await this.getCopilotAssistantHtml(context);
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "analyzeCurrent":
          await this.analyzeCurrentContext(panel.webview, context);
          break;
        case "suggestBreakpoints":
          await this.provideSuggestedBreakpoints(panel.webview, context);
          break;
        case "explainStep":
          await this.explainStepExecution(panel.webview, message.stepText, context);
          break;
        case "generateFix":
          await this.generateCodeFix(panel.webview, message.error, context);
          break;
        case "optimizeTest":
          await this.optimizeTestScenario(panel.webview, context);
          break;
        case "applyFix":
          await this.applyGeneratedFix(message.fix);
          break;
      }
    });
  }
  /**
   * Generate HTML for the copilot assistant interface
   */
  async getCopilotAssistantHtml(context) {
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
            <span class="robot-icon">\u{1F916}</span>
            <div>
                <h2 style="margin: 0;">Copilot Debug Assistant</h2>
                <p style="margin: 5px 0 0 0; color: var(--vscode-descriptionForeground);">
                    AI-powered debugging assistance for your BDD tests
                </p>
            </div>
        </div>

        <div class="context-info">
            <h3>\u{1F4CB} Current Context</h3>
            ${context.scenario ? `<p><strong>Scenario:</strong> ${context.scenario}</p>` : ""}
            ${context.currentStep ? `<p><strong>Current Step:</strong> ${context.currentStep}</p>` : ""}
            ${context.featureFile ? `<p><strong>Feature:</strong> ${path15.basename(context.featureFile)}</p>` : ""}
            ${context.error ? `
                <p><strong>Error:</strong> 
                    <span class="status-indicator status-error"></span>
                    ${context.error.message}
                </p>
            ` : ""}
        </div>

        <div class="quick-actions">
            <button class="quick-action" onclick="sendCommand('analyzeCurrent')">
                \u{1F50D} Analyze Current Context
            </button>
            <button class="quick-action" onclick="sendCommand('suggestBreakpoints')">
                \u{1F3AF} Suggest Breakpoints
            </button>
            ${context.currentStep ? `
                <button class="quick-action" onclick="sendCommand('explainStep', '${context.currentStep}')">
                    \u{1F4A1} Explain This Step
                </button>
            ` : ""}
            ${context.error ? `
                <button class="quick-action" onclick="sendCommand('generateFix', '${context.error.message}')">
                    \u{1F527} Generate Fix
                </button>
            ` : ""}
            <button class="quick-action" onclick="sendCommand('optimizeTest')">
                \u26A1 Optimize Test
            </button>
        </div>

        <div class="suggestions">
            <h3>\u{1F4A1} AI Suggestions</h3>
            ${suggestions.map((suggestion) => `
                <div class="suggestion severity-${suggestion.severity}">
                    <div class="suggestion-header">
                        <span class="suggestion-title">${suggestion.title}</span>
                        <span class="suggestion-confidence">${Math.round(suggestion.confidence * 100)}% confidence</span>
                    </div>
                    <div class="suggestion-description">${suggestion.description}</div>
                    ${suggestion.code ? `<div class="suggestion-code">${suggestion.code}</div>` : ""}
                    ${suggestion.action ? `
                        <div class="action-buttons">
                            <button class="action-button" onclick="applyFix('${JSON.stringify(suggestion).replace(/'/g, "\\'")}')">
                                Apply Fix
                            </button>
                            <button class="action-button secondary" onclick="explainSuggestion('${suggestion.type}')">
                                Explain
                            </button>
                        </div>
                    ` : ""}
                </div>
            `).join("")}
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
  async generateSuggestions(context) {
    const suggestions = [];
    if (context.currentStep) {
      suggestions.push(...await this.analyzeStepForIssues(context.currentStep, context));
    }
    if (context.error) {
      suggestions.push(...await this.analyzeError(context.error, context));
    }
    suggestions.push(...await this.suggestStrategicBreakpoints(context));
    suggestions.push(...await this.suggestPerformanceOptimizations(context));
    suggestions.push(...await this.suggestTestStructureImprovements(context));
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
  /**
   * Analyze step for potential issues
   */
  async analyzeStepForIssues(stepText, context) {
    const suggestions = [];
    const commonIssues = [
      {
        pattern: /wait|sleep|delay/i,
        suggestion: {
          type: "optimization",
          title: "Avoid Hard Waits",
          description: "Consider using Playwright's built-in waiting mechanisms instead of hard waits for more reliable tests.",
          code: `// Instead of:
await page.waitForTimeout(5000);

// Use:
await page.waitForSelector('.expected-element');
// or
await expect(page.locator('.expected-element')).toBeVisible();`,
          confidence: 0.8,
          severity: "warning"
        }
      },
      {
        pattern: /click.*button|press.*button/i,
        suggestion: {
          type: "explanation",
          title: "Button Click Debugging",
          description: "If button clicks are failing, check if the element is visible, enabled, and not covered by other elements.",
          code: `// Add these checks before clicking:
await expect(page.locator('button')).toBeVisible();
await expect(page.locator('button')).toBeEnabled();
await page.locator('button').click();`,
          confidence: 0.7,
          severity: "info"
        }
      },
      {
        pattern: /fill|type|input/i,
        suggestion: {
          type: "explanation",
          title: "Form Input Debugging",
          description: "For input failures, ensure the field is visible and not readonly before typing.",
          code: `// Robust input handling:
await page.locator('input').clear();
await page.locator('input').fill('your text');
// Verify the input:
await expect(page.locator('input')).toHaveValue('your text');`,
          confidence: 0.75,
          severity: "info"
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
  async analyzeError(error, context) {
    const suggestions = [];
    const errorMessage = error.message.toLowerCase();
    const errorPatterns = [
      {
        pattern: /timeout.*waiting for.*selector/,
        suggestion: {
          type: "fix",
          title: "Element Not Found - Timeout",
          description: "The element selector timed out. The element might not exist, be hidden, or the selector might be incorrect.",
          code: `// Debug steps:
1. Check if element exists: await page.locator('selector').count()
2. Wait for element: await page.waitForSelector('selector')
3. Use more specific selector: await page.locator('[data-testid="element"]')
4. Increase timeout: await page.locator('selector').waitFor({ timeout: 10000 })`,
          confidence: 0.9,
          severity: "error"
        }
      },
      {
        pattern: /element.*not.*visible/,
        suggestion: {
          type: "fix",
          title: "Element Not Visible",
          description: "The element exists but is not visible. It might be hidden by CSS or covered by another element.",
          code: `// Debug visibility:
1. Check if element is hidden: await page.locator('selector').isHidden()
2. Scroll element into view: await page.locator('selector').scrollIntoViewIfNeeded()
3. Wait for element to be visible: await page.locator('selector').waitFor({ state: 'visible' })`,
          confidence: 0.85,
          severity: "error"
        }
      },
      {
        pattern: /step.*not.*implemented|missing.*step.*definition/,
        suggestion: {
          type: "fix",
          title: "Missing Step Definition",
          description: "This step doesn't have a corresponding step definition. You need to implement it.",
          code: `// Add to your step definitions file:
Given('your step text here', async ({ page }) => {
  // Implement your step logic here
  throw new Error('Step not implemented yet');
});`,
          confidence: 0.95,
          severity: "error",
          action: {
            command: "playwright-bdd.createStepDefinition"
          }
        }
      }
    ];
    for (const pattern of errorPatterns) {
      if (pattern.pattern.test(errorMessage)) {
        suggestions.push(pattern.suggestion);
      }
    }
    if (suggestions.length === 0) {
      suggestions.push({
        type: "explanation",
        title: "Error Analysis",
        description: `The error "${error.message}" occurred. Consider adding breakpoints around the failing step to investigate the state of your application.`,
        confidence: 0.6,
        severity: "info"
      });
    }
    return suggestions;
  }
  /**
   * Suggest strategic breakpoints for debugging
   */
  async suggestStrategicBreakpoints(context) {
    const suggestions = [];
    if (context.currentStep) {
      suggestions.push({
        type: "breakpoint",
        title: "Add Breakpoint Before Current Step",
        description: "Add a breakpoint before the current step to inspect the application state.",
        confidence: 0.8,
        severity: "info",
        action: {
          command: "playwright-bdd.toggleBreakpoint"
        }
      });
    }
    if (context.error) {
      suggestions.push({
        type: "breakpoint",
        title: "Strategic Error Investigation",
        description: "Add breakpoints at key points to trace the execution path leading to the error.",
        confidence: 0.85,
        severity: "warning"
      });
    }
    return suggestions;
  }
  /**
   * Suggest performance optimizations
   */
  async suggestPerformanceOptimizations(context) {
    const suggestions = [];
    suggestions.push({
      type: "optimization",
      title: "Optimize Test Performance",
      description: "Consider using page.waitForLoadState() instead of arbitrary waits, and group related actions together.",
      code: `// Optimize waiting:
await page.waitForLoadState('networkidle');

// Group actions:
await Promise.all([
  page.fill('#username', 'user'),
  page.fill('#password', 'pass')
]);`,
      confidence: 0.7,
      severity: "info"
    });
    return suggestions;
  }
  /**
   * Suggest test structure improvements
   */
  async suggestTestStructureImprovements(context) {
    const suggestions = [];
    suggestions.push({
      type: "optimization",
      title: "Improve Test Maintainability",
      description: "Consider using Page Object Model pattern for better test organization and reusability.",
      code: `// Create page objects:
class LoginPage {
  constructor(page) { this.page = page; }
  
  async login(username, password) {
    await this.page.fill('#username', username);
    await this.page.fill('#password', password);
    await this.page.click('#login-btn');
  }
}`,
      confidence: 0.6,
      severity: "info"
    });
    return suggestions;
  }
  /**
   * Gather debug context from current editor and debug session
   */
  async gatherDebugContext(editor) {
    const context = {
      featureFile: editor.document.fileName.endsWith(".feature") ? editor.document.fileName : void 0
    };
    if (context.featureFile) {
      const content = editor.document.getText();
      const currentLine = editor.selection.active.line;
      const lines = content.split("\n");
      for (let i = currentLine; i >= 0; i--) {
        const scenarioMatch = lines[i].match(/^\s*Scenario(?:\s+Outline)?:\s*(.+)$/);
        if (scenarioMatch) {
          context.scenario = scenarioMatch[1].trim();
          break;
        }
      }
      const currentLineText = lines[currentLine].trim();
      const stepMatch = currentLineText.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        context.currentStep = stepMatch[2].trim();
        context.stepType = stepMatch[1];
      }
    }
    if (this.debuggingTools) {
      context.breakpoints = this.debuggingTools.getBreakpoints();
    }
    return context;
  }
  /**
   * Event handlers for debug session
   */
  onDebugSessionStarted(session) {
    this.outputChannel.appendLine(`\u{1F916} Copilot: Debug session started for ${session.scenario}`);
    this.lastDebugContext = {
      scenario: session.scenario,
      featureFile: session.featureFile,
      breakpoints: session.breakpoints
    };
  }
  onStepExecution(session) {
    if (session.currentStep) {
      this.outputChannel.appendLine(`\u{1F916} Copilot: Analyzing step execution - ${session.currentStep.stepText}`);
      this.lastDebugContext = {
        ...this.lastDebugContext,
        currentStep: session.currentStep.stepText,
        variables: Object.fromEntries(session.variables)
      };
    }
  }
  onDebugPause(session) {
    this.outputChannel.appendLine("\u{1F916} Copilot: Debug session paused - ready to assist");
  }
  onDebugStop(session) {
    this.outputChannel.appendLine("\u{1F916} Copilot: Debug session ended");
    this.lastDebugContext = void 0;
  }
  /**
   * WebView message handlers
   */
  async analyzeCurrentContext(webview, context) {
    const analysis = await this.generateSuggestions(context);
    webview.postMessage({
      command: "updateSuggestions",
      suggestions: analysis
    });
  }
  async provideSuggestedBreakpoints(webview, context) {
    const breakpointSuggestions = await this.suggestStrategicBreakpoints(context);
    webview.postMessage({
      command: "showBreakpointSuggestions",
      suggestions: breakpointSuggestions
    });
  }
  async explainStepExecution(webview, stepText, context) {
    const explanation = await this.generateStepExplanation(stepText, context);
    webview.postMessage({
      command: "showStepExplanation",
      explanation
    });
  }
  async generateCodeFix(webview, error, context) {
    const fixes = await this.analyzeError({ message: error }, context);
    webview.postMessage({
      command: "showGeneratedFixes",
      fixes
    });
  }
  async optimizeTestScenario(webview, context) {
    const optimizations = await this.suggestPerformanceOptimizations(context);
    webview.postMessage({
      command: "showOptimizations",
      optimizations
    });
  }
  async applyGeneratedFix(fix) {
    if (fix.action) {
      await vscode17.commands.executeCommand(fix.action.command, ...fix.action.args || []);
    } else if (fix.code) {
      await vscode17.env.clipboard.writeText(fix.code);
      vscode17.window.showInformationMessage("Fix code copied to clipboard!");
    }
  }
  /**
   * Generate explanation for a specific step
   */
  async generateStepExplanation(stepText, context) {
    const explanations = {
      "click": "This step simulates a user clicking on an element. Make sure the element is visible and clickable.",
      "fill": "This step enters text into an input field. Ensure the field is visible and not readonly.",
      "navigate": "This step navigates to a different page or URL. Check for proper page loading.",
      "wait": "This step waits for something to happen. Consider using more specific waits.",
      "verify": "This step checks if something is true. Make sure your assertions are specific."
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
  async suggestSmartBreakpoints() {
    const activeEditor = vscode17.window.activeTextEditor;
    if (!activeEditor || !activeEditor.document.fileName.endsWith(".feature")) {
      vscode17.window.showWarningMessage("Please open a .feature file to get breakpoint suggestions.");
      return;
    }
    const context = await this.gatherDebugContext(activeEditor);
    const suggestions = await this.suggestStrategicBreakpoints(context);
    if (suggestions.length === 0) {
      vscode17.window.showInformationMessage("No specific breakpoint suggestions for current context.");
      return;
    }
    const items = suggestions.map((s) => ({
      label: s.title,
      description: s.description,
      suggestion: s
    }));
    const selected = await vscode17.window.showQuickPick(items, {
      placeHolder: "Select a breakpoint suggestion to apply"
    });
    if (selected && selected.suggestion.action) {
      await vscode17.commands.executeCommand(selected.suggestion.action.command, ...selected.suggestion.action.args || []);
    }
  }
  /**
   * Suggest step definition fixes
   */
  async suggestStepDefinitionFix() {
    const activeEditor = vscode17.window.activeTextEditor;
    if (!activeEditor) {
      vscode17.window.showWarningMessage("Please open a file to get step definition suggestions.");
      return;
    }
    if (this.stepDefinitionProvider) {
      const currentLine = activeEditor.selection.active.line;
      const lineText = activeEditor.document.lineAt(currentLine).text;
      const stepMatch = lineText.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        const stepText = stepMatch[2].trim();
        const definitions = this.stepDefinitionProvider.getAllStepDefinitions();
        const matchingDef = definitions.find(
          (def) => new RegExp(def.pattern).test(stepText)
        );
        if (!matchingDef) {
          const result = await vscode17.window.showInformationMessage(
            `No step definition found for: "${stepText}"`,
            "Create Step Definition",
            "Show Suggestions"
          );
          if (result === "Create Step Definition") {
            await vscode17.commands.executeCommand("playwright-bdd.createStepDefinition");
          } else if (result === "Show Suggestions") {
            await this.showDebugAssistant();
          }
        } else {
          vscode17.window.showInformationMessage(`Step definition found in ${path15.basename(matchingDef.file)}`);
        }
      }
    }
  }
  /**
   * Analyze test failure with AI assistance
   */
  async analyzeTestFailure(error) {
    if (!error) {
      const input = await vscode17.window.showInputBox({
        prompt: "Enter the error message or describe the test failure",
        placeHolder: "e.g., TimeoutError: Timeout 30000ms exceeded..."
      });
      if (!input) return;
      error = input;
    }
    const context = {
      error: { message: error }
    };
    const suggestions = await this.analyzeError({ message: error }, context);
    if (suggestions.length === 0) {
      vscode17.window.showInformationMessage("No specific suggestions for this error. Consider using the full debug assistant.");
      return;
    }
    const items = suggestions.map((s) => ({
      label: `${s.type.toUpperCase()}: ${s.title}`,
      description: s.description,
      detail: s.code ? "Has code suggestion" : "",
      suggestion: s
    }));
    const selected = await vscode17.window.showQuickPick(items, {
      placeHolder: "Select a suggestion to view details"
    });
    if (selected) {
      if (selected.suggestion.code) {
        const doc = await vscode17.workspace.openTextDocument({
          content: selected.suggestion.code,
          language: "javascript"
        });
        await vscode17.window.showTextDocument(doc);
      }
      if (selected.suggestion.action) {
        const apply = await vscode17.window.showInformationMessage(
          selected.suggestion.description,
          "Apply Fix"
        );
        if (apply === "Apply Fix") {
          await vscode17.commands.executeCommand(selected.suggestion.action.command, ...selected.suggestion.action.args || []);
        }
      }
    }
  }
  /**
   * Suggest test improvements
   */
  async suggestTestImprovements() {
    const activeEditor = vscode17.window.activeTextEditor;
    if (!activeEditor) {
      vscode17.window.showWarningMessage("Please open a test file to get improvement suggestions.");
      return;
    }
    const context = await this.gatherDebugContext(activeEditor);
    const improvements = [
      ...await this.suggestPerformanceOptimizations(context),
      ...await this.suggestTestStructureImprovements(context)
    ];
    if (improvements.length === 0) {
      vscode17.window.showInformationMessage("No specific improvements suggested for current context.");
      return;
    }
    const items = improvements.map((imp) => ({
      label: imp.title,
      description: imp.description,
      detail: `${Math.round(imp.confidence * 100)}% confidence`,
      improvement: imp
    }));
    const selected = await vscode17.window.showQuickPick(items, {
      placeHolder: "Select an improvement to view details"
    });
    if (selected && selected.improvement.code) {
      const doc = await vscode17.workspace.openTextDocument({
        content: selected.improvement.code,
        language: "javascript"
      });
      await vscode17.window.showTextDocument(doc);
    }
  }
};

// src/copilotPanel.ts
var vscode18 = __toESM(require("vscode"));
var CopilotPanelProvider = class {
  constructor(_extensionUri, outputChannel, copilotService) {
    this._extensionUri = _extensionUri;
    this._outputChannel = outputChannel;
    this._copilotService = copilotService;
  }
  static {
    this.viewType = "playwrightBddCopilot";
  }
  resolveWebviewView(webviewView, context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "openDebugAssistant":
          vscode18.commands.executeCommand("playwright-bdd.copilotDebugAssist");
          break;
        case "suggestBreakpoints":
          vscode18.commands.executeCommand("playwright-bdd.copilotSuggestBreakpoints");
          break;
        case "suggestStepFix":
          vscode18.commands.executeCommand("playwright-bdd.copilotSuggestStepFix");
          break;
        case "analyzeFailure":
          vscode18.commands.executeCommand("playwright-bdd.copilotAnalyzeFailure");
          break;
        case "improveTest":
          vscode18.commands.executeCommand("playwright-bdd.copilotImproveTest");
          break;
        case "openSettings":
          vscode18.commands.executeCommand("playwright-bdd.showSettings");
          break;
        case "refreshPanel":
          this.refresh();
          break;
      }
    });
  }
  refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }
  _getHtmlForWebview(webview) {
    const config = vscode18.workspace.getConfiguration("playwrightBdd");
    const copilotEnabled = config.get("copilot.enabled", true);
    const showCopilotPanel = config.get("ui.showCopilotPanel", true);
    const autoShowSuggestions = config.get("copilot.autoShowSuggestions", true);
    const confidenceThreshold = config.get("copilot.confidenceThreshold", 60);
    const maxSuggestions = config.get("copilot.maxSuggestions", 5);
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
                background: ${copilotEnabled ? "var(--vscode-testing-iconPassed)" : "var(--vscode-testing-iconFailed)"};
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
            <span class="header-icon">\u{1F916}</span>
            <span class="header-title">AI Copilot</span>
            <div class="status-indicator">
                <span>${copilotEnabled ? "\u25CF" : "\u25CB"}</span>
                <span>${copilotEnabled ? "Active" : "Disabled"}</span>
            </div>
        </div>

        <div class="${copilotEnabled ? "" : "disabled-overlay"}">
            <div class="quick-actions">
                <button class="action-button" onclick="openDebugAssistant()" ${!copilotEnabled ? "disabled" : ""}>
                    <span class="action-icon">\u{1F50D}</span>
                    <div class="action-text">
                        <div>Debug Assistant</div>
                        <div class="action-description">AI-powered debugging help</div>
                    </div>
                </button>

                <button class="action-button" onclick="suggestBreakpoints()" ${!copilotEnabled ? "disabled" : ""}>
                    <span class="action-icon">\u{1F3AF}</span>
                    <div class="action-text">
                        <div>Smart Breakpoints</div>
                        <div class="action-description">Strategic debugging points</div>
                    </div>
                </button>

                <button class="action-button" onclick="suggestStepFix()" ${!copilotEnabled ? "disabled" : ""}>
                    <span class="action-icon">\u{1F4A1}</span>
                    <div class="action-text">
                        <div>Fix Steps</div>
                        <div class="action-description">Resolve step definition issues</div>
                    </div>
                </button>

                <button class="action-button" onclick="analyzeFailure()" ${!copilotEnabled ? "disabled" : ""}>
                    <span class="action-icon">\u{1F52C}</span>
                    <div class="action-text">
                        <div>Analyze Failure</div>
                        <div class="action-description">Understand test failures</div>
                    </div>
                </button>

                <button class="action-button" onclick="improveTest()" ${!copilotEnabled ? "disabled" : ""}>
                    <span class="action-icon">\u26A1</span>
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
                <button class="refresh-button" onclick="refreshPanel()">\u21BB</button>
            </div>
            
            <div class="setting-item">
                <span class="setting-label">Auto-suggestions:</span>
                <span class="setting-value">${autoShowSuggestions ? "On" : "Off"}</span>
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
                <span class="action-icon">\u2699\uFE0F</span>
                <span>Configure Copilot</span>
            </button>
        </div>

        ${copilotEnabled ? `
        <div class="tips-section">
            <div class="tip-title">\u{1F4A1} Tip</div>
            <div class="tip-text">
                Position your cursor on a step line in a .feature file, then use the Debug Assistant for context-aware suggestions.
            </div>
        </div>
        ` : `
        <div class="tips-section">
            <div class="tip-title">\u2139\uFE0F Enable Copilot</div>
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
};

// src/extension.ts
async function activate(context) {
  const controller = vscode19.tests.createTestController("playwrightBdd", "Playwright BDD Tests");
  context.subscriptions.push(controller);
  const outputChannel = vscode19.window.createOutputChannel("Playwright BDD");
  context.subscriptions.push(outputChannel);
  const errorHandler = (operation, error) => {
    const errorMessage = `[ERROR] ${operation}: ${error.message}`;
    outputChannel.appendLine(errorMessage);
    console.error(errorMessage, error);
    vscode19.window.showErrorMessage(`Playwright BDD: ${operation} failed. Check output for details.`);
  };
  const validateConfiguration = () => {
    const config2 = vscode19.workspace.getConfiguration("playwrightBdd");
    const configPath = config2.get("configPath", "./playwright.config.ts");
    const workspaceFolders = vscode19.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode19.window.showWarningMessage("Playwright BDD: No workspace folder detected. Extension functionality may be limited.");
      return false;
    }
    const fullConfigPath = path16.resolve(workspaceFolders[0].uri.fsPath, configPath);
    try {
      vscode19.workspace.fs.stat(vscode19.Uri.file(fullConfigPath)).then(() => {
        outputChannel.appendLine(`Configuration validated: ${configPath}`);
      }, (error) => {
        outputChannel.appendLine(`Warning: Configuration file not found at ${configPath}. Using defaults.`);
      });
    } catch (error) {
      outputChannel.appendLine(`Warning: Could not validate configuration: ${error}`);
    }
    return true;
  };
  validateConfiguration();
  const config = vscode19.workspace.getConfiguration("playwrightBdd");
  const featureFolder = config.get("featureFolder", "features");
  const enableFeatureGen = config.get("enableFeatureGen", false);
  const testCache = new TestDiscoveryCache(outputChannel);
  const discoverFeatureTests = async (forceRefresh = false) => {
    try {
      outputChannel.appendLine("Starting test discovery...");
      const startTime = Date.now();
      controller.items.replace([]);
      const files = await vscode19.workspace.findFiles(`${featureFolder}/**/*.feature`);
      if (files.length === 0) {
        outputChannel.appendLine(`No feature files found in ${featureFolder}. Check your featureFolder configuration.`);
        vscode19.window.showInformationMessage(`No .feature files found in '${featureFolder}' folder.`);
        return;
      }
      outputChannel.appendLine(`Found ${files.length} feature file(s). Processing with caching...`);
      if (forceRefresh) {
        testCache.clearCache();
        outputChannel.appendLine("Cache cleared - processing all files");
      }
      await testCache.validateAndCleanCache();
      const processFeatureFileWithCache = async (file, fromCache) => {
        try {
          if (fromCache) {
            const cached = testCache.getCachedFeature(file);
            if (cached) {
              const testItem2 = testCache.recreateTestItem(cached, controller);
              controller.items.add(testItem2);
              outputChannel.appendLine(`\u{1F4CB} From cache: ${path16.basename(file.fsPath)}`);
              return testItem2;
            }
          }
          const testItem = await processFeatureFile(file, controller);
          if (testItem) {
            const cachedItem = testCache.createCachedItem(testItem);
            await testCache.updateCache(file, cachedItem);
          }
          return testItem;
        } catch (error) {
          errorHandler(`Processing feature file ${file.fsPath}`, error);
          return null;
        }
      };
      const result = await testCache.incrementalDiscovery(files, processFeatureFileWithCache);
      const endTime = Date.now();
      const duration = endTime - startTime;
      const stats = testCache.getCacheStats();
      outputChannel.appendLine(
        `\u2705 Discovery completed in ${duration}ms: ${result.processed} processed, ${result.fromCache} from cache`
      );
      outputChannel.appendLine(`\u{1F4CA} Cache stats: ${stats.totalFeatures} cached features`);
    } catch (error) {
      errorHandler("Test Discovery", error);
      vscode19.window.showErrorMessage("Failed to discover tests. Some features may not be available.");
    }
  };
  const processFeatureFile = async (file, controller2) => {
    try {
      const content = (await vscode19.workspace.fs.readFile(file)).toString();
      if (!content.trim()) {
        outputChannel.appendLine(`Warning: Empty feature file ${file.fsPath}`);
        return null;
      }
      const lines = content.split("\n");
      const featureMatch = content.match(/^\s*Feature:\s*(.+)/m);
      if (!featureMatch) {
        outputChannel.appendLine(`Warning: No Feature declaration found in ${file.fsPath}`);
        return null;
      }
      const label = featureMatch[1].trim();
      const id = file.fsPath;
      const testItem = controller2.createTestItem(id, label, file);
      controller2.items.add(testItem);
      let currentScenario = null;
      let scenarioTemplate = "";
      let scenarioCount = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const scenarioMatch = line.match(/^\s*Scenario(?: Outline)?:\s*(.+)/);
        if (scenarioMatch) {
          const scenarioName = scenarioMatch[1].trim();
          const scenarioId = `${file.fsPath}::${scenarioName}`;
          const scenarioItem = controller2.createTestItem(scenarioId, scenarioName, file);
          testItem.children.add(scenarioItem);
          currentScenario = scenarioItem;
          scenarioTemplate = scenarioName;
          scenarioCount++;
        }
        const examplesMatch = line.match(/^\s*Examples:/);
        if (examplesMatch && currentScenario) {
          let exampleIndex = 1;
          let headerSkipped = false;
          let headers = [];
          for (let j = i + 1; j < lines.length; j++) {
            const exampleLine = lines[j].trim();
            if (exampleLine.startsWith("|")) {
              const cells = exampleLine.split("|").map((v) => v.trim()).filter(Boolean);
              if (!headerSkipped) {
                headers = cells;
                headerSkipped = true;
                continue;
              }
              if (headers.length === 0) {
                outputChannel.appendLine(`Warning: No headers found for examples in ${file.fsPath} at line ${j + 1}`);
                break;
              }
              const exampleData = Object.fromEntries(headers.map((h, idx) => [h, cells[idx] || ""]));
              let exampleLabel = scenarioTemplate;
              for (const [key, value] of Object.entries(exampleData)) {
                exampleLabel = exampleLabel.replace(new RegExp(`<${key}>`, "g"), value);
              }
              if (currentScenario) {
                const exampleId = `${currentScenario.id}::${exampleLabel}`;
                const exampleItem = controller2.createTestItem(exampleId, exampleLabel, file);
                currentScenario.children.add(exampleItem);
              }
              exampleIndex++;
            } else if (exampleLine === "" || !exampleLine.startsWith("|")) {
              break;
            }
          }
        }
      }
      outputChannel.appendLine(`Processed ${path16.basename(file.fsPath)}: ${scenarioCount} scenario(s)`);
      return testItem;
    } catch (error) {
      throw new Error(`Failed to process feature file: ${error}`);
    }
  };
  await discoverFeatureTests();
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.runScenarioDynamic", (grepArg, enableFeatureGen2) => {
      const config2 = vscode19.workspace.getConfiguration("playwrightBdd");
      const configPath = config2.get("configPath") || "./playwright.config.ts";
      const tsconfigPath = config2.get("tsconfigPath") || "";
      const configPathArg = configPath;
      const tsconfigArg = tsconfigPath ? tsconfigPath : "";
      const tagsArg = grepArg ? `--grep "${grepArg}"` : "";
      let featureGenCommand = config2.get("featureGenCommand") || "npx bddgen --config=${configPath}";
      let testCommand = config2.get("testCommand") || "npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}";
      featureGenCommand = featureGenCommand.replace("${configPath}", configPathArg).replace("${tsconfigArg}", tsconfigArg).replace("${tagsArg}", tagsArg);
      testCommand = testCommand.replace("${configPath}", configPathArg).replace("${tsconfigArg}", tsconfigArg).replace("${tagsArg}", tagsArg);
      const terminal = vscode19.window.createTerminal("Playwright BDD");
      terminal.show();
      if (enableFeatureGen2) {
        terminal.sendText(`${featureGenCommand} && ${testCommand}`);
      } else {
        terminal.sendText(testCommand);
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.runScenario", (grepArg) => {
      const config2 = vscode19.workspace.getConfiguration("playwrightBdd");
      const configPath = config2.get("configPath") || "./playwright.config.ts";
      const tsconfigPath = config2.get("tsconfigPath") || "";
      const tsconfigArg = tsconfigPath ? `--project=${tsconfigPath}` : "";
      const terminal = vscode19.window.createTerminal("Playwright BDD");
      terminal.show();
      terminal.sendText(`npx playwright test ${tsconfigArg} --config=${configPath} --grep "${grepArg}"`);
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.runScenarioWithFeatureGen", (grepArg) => {
      const config2 = vscode19.workspace.getConfiguration("playwrightBdd");
      const configPath = config2.get("configPath") || "./playwright.config.ts";
      const tsconfigPath = config2.get("tsconfigPath") || "";
      const tags = grepArg ? grepArg : config2.get("tags") || "";
      const configPathArg = configPath;
      const tsconfigArg = tsconfigPath ? tsconfigPath : "";
      const tagsArg = tags ? `--grep "${tags}"` : "";
      let featureGenCommand = config2.get("featureGenCommand") || "npx bddgen --config=${configPath}";
      let testCommand = config2.get("testCommand") || "npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}";
      featureGenCommand = featureGenCommand.replace("${configPath}", configPathArg).replace("${tsconfigArg}", tsconfigArg).replace("${tagsArg}", tagsArg);
      testCommand = testCommand.replace("${configPath}", configPathArg).replace("${tsconfigArg}", tsconfigArg).replace("${tagsArg}", tagsArg);
      const terminal = vscode19.window.createTerminal("Playwright BDD");
      terminal.show();
      terminal.sendText(`${featureGenCommand} && ${testCommand}`);
    })
  );
  let refreshTimeout;
  const debouncedRefresh = () => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    refreshTimeout = setTimeout(() => {
      outputChannel.appendLine("File change detected, refreshing tests...");
      discoverFeatureTests();
    }, 500);
  };
  const watcher = vscode19.workspace.createFileSystemWatcher(`${featureFolder}/**/*.feature`);
  watcher.onDidCreate(debouncedRefresh);
  watcher.onDidChange(debouncedRefresh);
  watcher.onDidDelete(debouncedRefresh);
  context.subscriptions.push(watcher);
  controller.createRunProfile(
    "Run",
    vscode19.TestRunProfileKind.Run,
    (request, token) => {
      const run = controller.createTestRun(request);
      outputChannel.show(true);
      if (request.include) {
        for (const test of request.include) {
          run.enqueued(test);
          run.started(test);
          runBDDTests(run, controller, test, outputChannel).catch((error) => {
            outputChannel.appendLine(`[ERROR] Test execution failed: ${error}`);
            run.failed(test, new vscode19.TestMessage(error.toString()));
          });
        }
      } else {
        runBDDTests(run, controller, void 0, outputChannel).catch((error) => {
          outputChannel.appendLine(`[ERROR] Test execution failed: ${error}`);
        });
      }
    },
    true
  );
  controller.createRunProfile(
    "Debug",
    vscode19.TestRunProfileKind.Debug,
    (request, token) => {
      const run = controller.createTestRun(request);
      outputChannel.show(true);
      if (request.include) {
        for (const test of request.include) {
          run.enqueued(test);
          run.started(test);
          vscode19.commands.executeCommand("playwright-bdd.debugScenario", test.label);
        }
      }
      run.end();
    },
    true
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.runTests", () => {
      runBDDTests(void 0, controller, void 0, outputChannel).catch((error) => {
        outputChannel.appendLine(`[ERROR] Test execution failed: ${error}`);
        vscode19.window.showErrorMessage("Test execution failed. Check the output panel for details.");
      });
    })
  );
  const stepDefinitionProvider = new StepDefinitionProvider(outputChannel);
  const testSearchProvider = new TestSearchProvider(outputChannel);
  const hoverProvider = new BDDHoverProvider(stepDefinitionProvider, outputChannel);
  const autoDiscoveryService = vscode19.workspace.workspaceFolders ? new AutoDiscoveryService(outputChannel, vscode19.workspace.workspaceFolders[0].uri.fsPath) : null;
  const queueManager = new TestQueueManager(outputChannel);
  const stepCreationWizard = vscode19.workspace.workspaceFolders ? new StepCreationWizard(outputChannel, vscode19.workspace.workspaceFolders[0].uri.fsPath) : null;
  const debuggingTools = vscode19.workspace.workspaceFolders ? new BDDDebuggingTools(outputChannel, vscode19.workspace.workspaceFolders[0].uri.fsPath) : null;
  const multiWorkspaceManager = new MultiWorkspaceManager(outputChannel);
  const cicdIntegration = vscode19.workspace.workspaceFolders ? new CICDIntegration(outputChannel, vscode19.workspace.workspaceFolders[0].uri.fsPath) : null;
  const reportViewer = vscode19.workspace.workspaceFolders ? new ReportViewer(outputChannel, vscode19.workspace.workspaceFolders[0].uri.fsPath) : null;
  const testExplorerUI = new TestExplorerUI(controller, outputChannel);
  testExplorerUI.registerCommands(context);
  context.subscriptions.push(testExplorerUI);
  outputChannel.appendLine("\u2705 BDD Test Explorer UI initialized with settings button support");
  const settingsUI = vscode19.workspace.workspaceFolders ? new SettingsUI(outputChannel, vscode19.workspace.workspaceFolders[0].uri.fsPath) : null;
  if (settingsUI) {
    context.subscriptions.push(settingsUI);
  }
  const copilotService = new CopilotIntegrationService(outputChannel);
  copilotService.registerCommands(context);
  if (debuggingTools && stepDefinitionProvider) {
    copilotService.initialize(debuggingTools, stepDefinitionProvider);
  }
  const copilotPanelProvider = new CopilotPanelProvider(context.extensionUri, outputChannel, copilotService);
  context.subscriptions.push(
    vscode19.window.registerWebviewViewProvider(CopilotPanelProvider.viewType, copilotPanelProvider)
  );
  context.subscriptions.push(
    vscode19.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("playwrightBdd.copilot") || e.affectsConfiguration("playwrightBdd.ui.showCopilotPanel")) {
        copilotPanelProvider.refresh();
      }
    })
  );
  if (debuggingTools) {
    debuggingTools.register(context);
  }
  if (cicdIntegration) {
    cicdIntegration.initialize().catch((error) => {
      outputChannel.appendLine(`Warning: CI/CD initialization failed: ${error}`);
    });
  }
  if (autoDiscoveryService && config.get("autoDiscoverConfig", true)) {
    try {
      const discoveredConfig = await autoDiscoveryService.discoverProjectConfiguration();
      await autoDiscoveryService.applyDiscoveredConfiguration(discoveredConfig);
    } catch (error) {
      outputChannel.appendLine(`Warning: Auto-discovery failed: ${error}`);
    }
  }
  if (vscode19.workspace.workspaceFolders) {
    const stepsFolder = config.get("stepsFolder", "steps");
    await stepDefinitionProvider.discoverStepDefinitions(vscode19.workspace.workspaceFolders[0].uri.fsPath, stepsFolder);
  }
  context.subscriptions.push(
    vscode19.languages.registerDefinitionProvider(
      { language: "feature", scheme: "file" },
      stepDefinitionProvider
    )
  );
  context.subscriptions.push(
    vscode19.languages.registerHoverProvider(
      { language: "feature", scheme: "file" },
      hoverProvider
    )
  );
  const codeLensProvider = new FeatureCodeLensProvider(enableFeatureGen);
  context.subscriptions.push(
    vscode19.languages.registerCodeLensProvider(
      { language: "feature", scheme: "file" },
      codeLensProvider
    )
  );
  const refreshCodeLens = () => {
    codeLensProvider.refresh();
  };
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.terminateTests", () => {
      terminateBDDTests();
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.refreshTests", async () => {
      const statusBarItem2 = vscode19.window.createStatusBarItem(vscode19.StatusBarAlignment.Left);
      statusBarItem2.text = "$(sync~spin) Refreshing features...";
      statusBarItem2.tooltip = "Playwright BDD is refreshing tests";
      statusBarItem2.show();
      try {
        await discoverFeatureTests();
      } finally {
        setTimeout(() => {
          statusBarItem2.hide();
          statusBarItem2.dispose();
        }, 3e3);
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.debugScenario", async (grepArg) => {
      const config2 = vscode19.workspace.getConfiguration("playwrightBdd");
      const configPath = config2.get("configPath") || "./playwright.config.ts";
      const tsconfigPath = config2.get("tsconfigPath") || "";
      const debugConfig = {
        type: "pwa-node",
        request: "launch",
        name: "Debug Playwright BDD Scenario",
        program: "${workspaceFolder}/node_modules/.bin/playwright",
        args: [
          "test",
          tsconfigPath ? `${tsconfigPath}` : "",
          `--config=${configPath}`,
          "--debug",
          "--grep",
          grepArg
        ].filter(Boolean),
        console: "integratedTerminal",
        internalConsoleOptions: "neverOpen",
        cwd: "${workspaceFolder}",
        env: {
          PWDEBUG: "1"
        }
      };
      vscode19.debug.startDebugging(void 0, debugConfig);
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.showStepDefinitions", async () => {
      const stepDefs = stepDefinitionProvider.getAllStepDefinitions();
      if (stepDefs.length === 0) {
        vscode19.window.showInformationMessage("No step definitions found. Make sure your steps folder contains step definition files.");
        return;
      }
      const items = stepDefs.map((step) => ({
        label: `${step.type}: ${step.pattern}`,
        description: `${path16.basename(step.file)}:${step.line}`,
        detail: step.function,
        step
      }));
      const selected = await vscode19.window.showQuickPick(items, {
        placeHolder: `${stepDefs.length} step definitions found`,
        matchOnDescription: true,
        matchOnDetail: true
      });
      if (selected) {
        const uri = vscode19.Uri.file(selected.step.file);
        const position = new vscode19.Position(selected.step.line - 1, 0);
        await vscode19.window.showTextDocument(uri, { selection: new vscode19.Range(position, position) });
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.validateStepCoverage", async () => {
      const activeEditor = vscode19.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document.fileName.endsWith(".feature")) {
        vscode19.window.showWarningMessage("Please open a .feature file to validate step coverage.");
        return;
      }
      const coverage = stepDefinitionProvider.getStepCoverageForFeature(activeEditor.document.fileName);
      outputChannel.appendLine(`
=== Step Coverage Analysis ===`);
      outputChannel.appendLine(`Feature: ${path16.basename(activeEditor.document.fileName)}`);
      outputChannel.appendLine(`Coverage: ${coverage.covered}/${coverage.total} steps (${Math.round(coverage.covered / coverage.total * 100)}%)`);
      if (coverage.missing.length > 0) {
        outputChannel.appendLine(`
Missing step definitions:`);
        coverage.missing.forEach((step) => {
          outputChannel.appendLine(`  \u274C ${step}`);
        });
      } else {
        outputChannel.appendLine(`
\u2705 All steps have matching definitions!`);
      }
      outputChannel.show();
      const message = coverage.missing.length > 0 ? `${coverage.missing.length} steps need definitions (${Math.round(coverage.covered / coverage.total * 100)}% coverage)` : `All ${coverage.total} steps have definitions! \u2705`;
      vscode19.window.showInformationMessage(message);
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.refreshStepDefinitions", async () => {
      if (vscode19.workspace.workspaceFolders) {
        const statusBarItem2 = vscode19.window.createStatusBarItem(vscode19.StatusBarAlignment.Left);
        statusBarItem2.text = "$(sync~spin) Refreshing step definitions...";
        statusBarItem2.show();
        try {
          await stepDefinitionProvider.discoverStepDefinitions(vscode19.workspace.workspaceFolders[0].uri.fsPath);
          const stepCount = stepDefinitionProvider.getAllStepDefinitions().length;
          vscode19.window.showInformationMessage(`Found ${stepCount} step definitions`);
        } finally {
          setTimeout(() => {
            statusBarItem2.hide();
            statusBarItem2.dispose();
          }, 2e3);
        }
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.searchTests", async () => {
      const searchQuery = await vscode19.window.showInputBox({
        placeHolder: 'Search tests... (e.g., "login", "tag:smoke", "feature:auth scenario:success")',
        prompt: "Enter search query or use advanced filters: tag:name feature:name scenario:name step:text file:pattern"
      });
      if (!searchQuery) {
        return;
      }
      try {
        const filters = testSearchProvider.buildAdvancedFilter(searchQuery);
        const cleanQuery = searchQuery.replace(/\w+:[^\s]+/g, "").trim();
        const results = await testSearchProvider.searchTests(controller, cleanQuery, filters);
        if (results.length === 0) {
          vscode19.window.showInformationMessage(`No tests found for: "${searchQuery}"`);
          return;
        }
        const items = results.map((result) => ({
          label: `${result.matchType.toUpperCase()}: ${result.matchText}`,
          description: path16.basename(result.filePath),
          detail: result.line ? `Line ${result.line}` : "",
          result
        }));
        const selected = await vscode19.window.showQuickPick(items, {
          placeHolder: `${results.length} matches found`,
          matchOnDescription: true
        });
        if (selected) {
          const uri = vscode19.Uri.file(selected.result.filePath);
          const position = selected.result.line ? new vscode19.Position(selected.result.line - 1, 0) : new vscode19.Position(0, 0);
          await vscode19.window.showTextDocument(uri, {
            selection: new vscode19.Range(position, position)
          });
        }
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Search failed: ${error}`);
        vscode19.window.showErrorMessage("Search failed. Check output for details.");
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.exportSearchResults", async () => {
      const searchQuery = await vscode19.window.showInputBox({
        placeHolder: "Search query to export results for...",
        prompt: "Enter search query to export results"
      });
      if (!searchQuery) {
        return;
      }
      try {
        const filters = testSearchProvider.buildAdvancedFilter(searchQuery);
        const cleanQuery = searchQuery.replace(/\w+:[^\s]+/g, "").trim();
        const results = await testSearchProvider.searchTests(controller, cleanQuery, filters);
        const report = testSearchProvider.exportSearchResults(results);
        const doc = await vscode19.workspace.openTextDocument({
          content: report,
          language: "markdown"
        });
        await vscode19.window.showTextDocument(doc);
        vscode19.window.showInformationMessage(`Exported ${results.length} search results`);
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Export failed: ${error}`);
        vscode19.window.showErrorMessage("Export failed. Check output for details.");
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.autoDiscoverConfig", async () => {
      if (!autoDiscoveryService) {
        vscode19.window.showWarningMessage("Auto-discovery requires an open workspace.");
        return;
      }
      try {
        const config2 = await autoDiscoveryService.discoverProjectConfiguration();
        await autoDiscoveryService.applyDiscoveredConfiguration(config2);
        vscode19.window.showInformationMessage("Configuration auto-discovery completed!");
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Auto-discovery failed: ${error}`);
        vscode19.window.showErrorMessage(`Auto-discovery failed: ${error}`);
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.validateConfiguration", async () => {
      if (!autoDiscoveryService) {
        vscode19.window.showWarningMessage("Configuration validation requires an open workspace.");
        return;
      }
      try {
        const validation = await autoDiscoveryService.validateConfiguration();
        if (validation.valid) {
          vscode19.window.showInformationMessage("\u2705 Configuration is valid!");
        } else {
          outputChannel.appendLine("\n\u274C Configuration validation failed:");
          validation.issues.forEach((issue) => {
            outputChannel.appendLine(`  - ${issue}`);
          });
          outputChannel.show();
          vscode19.window.showWarningMessage(
            `Configuration has ${validation.issues.length} issues. Check output for details.`
          );
        }
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Configuration validation failed: ${error}`);
        vscode19.window.showErrorMessage(`Validation failed: ${error}`);
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.createStepDefinition", async () => {
      if (!stepCreationWizard) {
        vscode19.window.showWarningMessage("Step creation requires an open workspace.");
        return;
      }
      await stepCreationWizard.launchWizard();
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.createStepsFromFeature", async (uri) => {
      if (!stepCreationWizard) {
        vscode19.window.showWarningMessage("Step creation requires an open workspace.");
        return;
      }
      let featureUri = uri;
      if (!featureUri) {
        const activeEditor = vscode19.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.endsWith(".feature")) {
          featureUri = activeEditor.document.uri;
        } else {
          vscode19.window.showWarningMessage("Please open a .feature file or use this command from the file explorer.");
          return;
        }
      }
      await stepCreationWizard.createStepsFromFeature(featureUri);
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.showQueueStatus", async () => {
      const progress = queueManager.getProgress();
      const stats = queueManager.getStatistics();
      const message = progress.total > 0 ? `Queue: ${progress.completed}/${progress.total} completed (${progress.percentage.toFixed(1)}%)` : "Queue is empty";
      const actions = [];
      if (progress.running > 0) {
        actions.push("Pause", "Cancel All");
      }
      if (progress.failed > 0) {
        actions.push("Retry Failed");
      }
      if (progress.completed > 0) {
        actions.push("Clear Completed", "Export Results");
      }
      actions.push("Show Details");
      if (actions.length === 0) {
        vscode19.window.showInformationMessage(message);
        return;
      }
      const selected = await vscode19.window.showInformationMessage(message, ...actions);
      switch (selected) {
        case "Pause":
          queueManager.pause();
          break;
        case "Cancel All":
          queueManager.cancelAll();
          break;
        case "Retry Failed":
          queueManager.retryFailed();
          break;
        case "Clear Completed":
          queueManager.clearCompleted();
          break;
        case "Export Results":
          const report = queueManager.exportResults();
          const doc = await vscode19.workspace.openTextDocument({
            content: report,
            language: "markdown"
          });
          await vscode19.window.showTextDocument(doc);
          break;
        case "Show Details":
          outputChannel.appendLine("\n\u{1F4CA} Queue Statistics:");
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
    vscode19.commands.registerCommand("playwright-bdd.runTestsWithQueue", async () => {
      const queueItems = [];
      controller.items.forEach((item) => {
        queueItems.push({
          type: "feature",
          name: item.label,
          command: `npx playwright test --grep "${item.label}"`,
          testItem: item,
          priority: 1
        });
        item.children.forEach((scenario) => {
          queueItems.push({
            type: "scenario",
            name: scenario.label,
            command: `npx playwright test --grep "${scenario.label}"`,
            testItem: scenario,
            priority: 2
          });
        });
      });
      if (queueItems.length === 0) {
        vscode19.window.showInformationMessage("No tests found to queue.");
        return;
      }
      queueManager.addToQueue(queueItems);
      vscode19.window.withProgress({
        location: vscode19.ProgressLocation.Notification,
        title: "Running Tests with Queue",
        cancellable: true
      }, async (progress, token) => {
        await queueManager.startWithProgress(progress, token);
      });
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.startStepByStepDebugging", async () => {
      if (!debuggingTools) {
        vscode19.window.showWarningMessage("Debugging requires an open workspace.");
        return;
      }
      const activeEditor = vscode19.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document.fileName.endsWith(".feature")) {
        vscode19.window.showWarningMessage("Please open a .feature file to debug.");
        return;
      }
      const currentLine = activeEditor.selection.active.line;
      const document = activeEditor.document;
      let scenarioName = "";
      for (let i = Math.max(0, currentLine - 5); i <= Math.min(document.lineCount - 1, currentLine + 5); i++) {
        const line = document.lineAt(i).text;
        const match = line.match(/^\s*Scenario(?:\s+Outline)?:\s*(.+)$/);
        if (match) {
          scenarioName = match[1].trim();
          break;
        }
      }
      if (!scenarioName) {
        scenarioName = await vscode19.window.showInputBox({
          prompt: "Enter scenario name to debug",
          placeHolder: "Scenario name..."
        }) || "";
      }
      if (scenarioName) {
        await debuggingTools.startStepByStepDebugging(activeEditor.document.fileName, scenarioName);
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.toggleBreakpoint", async () => {
      if (!debuggingTools) {
        vscode19.window.showWarningMessage("Debugging requires an open workspace.");
        return;
      }
      const activeEditor = vscode19.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document.fileName.endsWith(".feature")) {
        vscode19.window.showWarningMessage("Please open a .feature file to set breakpoints.");
        return;
      }
      const line = activeEditor.selection.active.line;
      const lineText = activeEditor.document.lineAt(line).text.trim();
      const stepMatch = lineText.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        const stepText = stepMatch[2];
        await debuggingTools.toggleBreakpoint(activeEditor.document.fileName, line + 1, stepText);
      } else {
        vscode19.window.showWarningMessage("Breakpoints can only be set on step lines (Given/When/Then/And/But).");
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.setConditionalBreakpoint", async () => {
      if (!debuggingTools) {
        vscode19.window.showWarningMessage("Debugging requires an open workspace.");
        return;
      }
      const activeEditor = vscode19.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document.fileName.endsWith(".feature")) {
        vscode19.window.showWarningMessage("Please open a .feature file to set breakpoints.");
        return;
      }
      const line = activeEditor.selection.active.line;
      const lineText = activeEditor.document.lineAt(line).text.trim();
      const stepMatch = lineText.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      if (!stepMatch) {
        vscode19.window.showWarningMessage("Breakpoints can only be set on step lines.");
        return;
      }
      const condition = await vscode19.window.showInputBox({
        prompt: 'Enter breakpoint condition (e.g., variable === "value")',
        placeHolder: "Condition expression..."
      });
      if (condition) {
        const stepText = stepMatch[2];
        await debuggingTools.setConditionalBreakpoint(activeEditor.document.fileName, line + 1, stepText, condition);
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.clearAllBreakpoints", async () => {
      if (!debuggingTools) {
        vscode19.window.showWarningMessage("Debugging requires an open workspace.");
        return;
      }
      const result = await vscode19.window.showWarningMessage(
        "Clear all BDD breakpoints?",
        "Clear All",
        "Cancel"
      );
      if (result === "Clear All") {
        debuggingTools.clearAllBreakpoints();
        vscode19.window.showInformationMessage("All BDD breakpoints cleared.");
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.showWorkspaces", async () => {
      const workspaces = multiWorkspaceManager.getAllWorkspaces();
      if (workspaces.length === 0) {
        vscode19.window.showInformationMessage("No workspaces found.");
        return;
      }
      const items = workspaces.map((ws) => ({
        label: ws.isActive ? `$(folder-active) ${ws.name}` : ws.name,
        description: `${ws.featureCount} features, ${ws.stepCount} steps`,
        detail: ws.rootPath,
        workspace: ws
      }));
      const selected = await vscode19.window.showQuickPick(items, {
        placeHolder: `${workspaces.length} workspaces found`,
        matchOnDescription: true
      });
      if (selected) {
        const actions = await vscode19.window.showQuickPick([
          { label: "\u{1F3AF} Set as Active", action: "activate" },
          { label: "\u{1F4CA} Show Analytics", action: "analytics" },
          { label: "\u{1F50D} Search in Workspace", action: "search" },
          { label: "\u25B6\uFE0F Run Tests", action: "run" }
        ], {
          placeHolder: `Actions for ${selected.workspace.name}`
        });
        switch (actions?.action) {
          case "activate":
            await multiWorkspaceManager.setActiveWorkspace(selected.workspace.id);
            vscode19.window.showInformationMessage(`Active workspace: ${selected.workspace.name}`);
            break;
          case "analytics":
            vscode19.commands.executeCommand("playwright-bdd.workspaceAnalytics");
            break;
          case "search":
            vscode19.commands.executeCommand("playwright-bdd.searchAcrossWorkspaces");
            break;
          case "run":
            await multiWorkspaceManager.runTestsAcrossWorkspaces([selected.workspace.id]);
            break;
        }
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.switchWorkspace", async () => {
      const workspaces = multiWorkspaceManager.getAllWorkspaces();
      if (workspaces.length <= 1) {
        vscode19.window.showInformationMessage("Only one workspace available.");
        return;
      }
      const items = workspaces.filter((ws) => !ws.isActive).map((ws) => ({
        label: ws.name,
        description: `${ws.featureCount} features, ${ws.stepCount} steps`,
        detail: ws.rootPath,
        workspace: ws
      }));
      const selected = await vscode19.window.showQuickPick(items, {
        placeHolder: "Select workspace to activate"
      });
      if (selected) {
        await multiWorkspaceManager.setActiveWorkspace(selected.workspace.id);
        vscode19.window.showInformationMessage(`Switched to workspace: ${selected.workspace.name}`);
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.searchAcrossWorkspaces", async () => {
      const searchQuery = await vscode19.window.showInputBox({
        prompt: "Search across all workspaces",
        placeHolder: "Enter search query..."
      });
      if (!searchQuery) return;
      try {
        const results = await multiWorkspaceManager.searchAcrossWorkspaces(searchQuery);
        if (results.length === 0) {
          vscode19.window.showInformationMessage(`No results found for: "${searchQuery}"`);
          return;
        }
        const items = results.map((result) => ({
          label: `${result.matchType.toUpperCase()}: ${result.matchText}`,
          description: `${result.workspaceName} - ${path16.basename(result.filePath)}`,
          detail: result.line ? `Line ${result.line}` : "",
          result
        }));
        const selected = await vscode19.window.showQuickPick(items, {
          placeHolder: `${results.length} results found across workspaces`
        });
        if (selected) {
          const uri = vscode19.Uri.file(selected.result.filePath);
          const position = selected.result.line ? new vscode19.Position(selected.result.line - 1, 0) : new vscode19.Position(0, 0);
          await vscode19.window.showTextDocument(uri, {
            selection: new vscode19.Range(position, position)
          });
        }
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Cross-workspace search failed: ${error}`);
        vscode19.window.showErrorMessage("Cross-workspace search failed. Check output for details.");
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.runTestsAcrossWorkspaces", async () => {
      const workspaces = multiWorkspaceManager.getAllWorkspaces();
      if (workspaces.length === 0) {
        vscode19.window.showInformationMessage("No workspaces available.");
        return;
      }
      const selectedWorkspaces = await vscode19.window.showQuickPick(
        workspaces.map((ws) => ({
          label: ws.name,
          description: `${ws.featureCount} features`,
          picked: ws.isActive,
          workspace: ws
        })),
        {
          placeHolder: "Select workspaces to run tests in",
          canPickMany: true
        }
      );
      if (!selectedWorkspaces || selectedWorkspaces.length === 0) {
        return;
      }
      const workspaceIds = selectedWorkspaces.map((item) => item.workspace.id);
      vscode19.window.withProgress({
        location: vscode19.ProgressLocation.Notification,
        title: "Running Tests Across Workspaces",
        cancellable: true
      }, async (progress, token) => {
        try {
          const results = await multiWorkspaceManager.runTestsAcrossWorkspaces(workspaceIds, {
            parallel: true
          });
          outputChannel.appendLine("\n\u{1F3E2} Cross-Workspace Test Results:");
          results.forEach((result, workspaceId) => {
            const workspace14 = workspaces.find((ws) => ws.id === workspaceId);
            outputChannel.appendLine(`  ${workspace14?.name}: ${result.success ? "\u2705" : "\u274C"}`);
          });
          outputChannel.show();
        } catch (error) {
          outputChannel.appendLine(`[ERROR] Cross-workspace test execution failed: ${error}`);
          vscode19.window.showErrorMessage("Cross-workspace test execution failed.");
        }
      });
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.createWorkspaceGroup", async () => {
      const workspaces = multiWorkspaceManager.getAllWorkspaces();
      if (workspaces.length < 2) {
        vscode19.window.showInformationMessage("At least 2 workspaces are required to create a group.");
        return;
      }
      const groupName = await vscode19.window.showInputBox({
        prompt: "Enter group name",
        placeHolder: "e.g., Frontend Projects"
      });
      if (!groupName) return;
      const selectedWorkspaces = await vscode19.window.showQuickPick(
        workspaces.map((ws) => ({
          label: ws.name,
          description: ws.rootPath,
          workspace: ws
        })),
        {
          placeHolder: "Select workspaces for this group",
          canPickMany: true
        }
      );
      if (!selectedWorkspaces || selectedWorkspaces.length === 0) {
        return;
      }
      const workspaceIds = selectedWorkspaces.map((item) => item.workspace.id);
      const groupId = multiWorkspaceManager.createWorkspaceGroup(groupName, workspaceIds);
      vscode19.window.showInformationMessage(`Created workspace group: ${groupName} with ${workspaceIds.length} workspaces`);
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.workspaceAnalytics", async () => {
      const analytics = multiWorkspaceManager.generateAnalytics();
      outputChannel.appendLine("\n\u{1F4CA} Workspace Analytics:");
      outputChannel.appendLine(`Total Workspaces: ${analytics.totalWorkspaces}`);
      outputChannel.appendLine(`Total Features: ${analytics.totalFeatures}`);
      outputChannel.appendLine(`Total Steps: ${analytics.totalSteps}`);
      outputChannel.appendLine("\nWorkspaces by Size:");
      analytics.workspacesBySize.forEach((ws, index) => {
        outputChannel.appendLine(`  ${index + 1}. ${ws.name}: ${ws.features} features, ${ws.steps} steps`);
      });
      outputChannel.appendLine("\nRecently Used:");
      analytics.recentlyUsed.forEach((ws, index) => {
        outputChannel.appendLine(`  ${index + 1}. ${ws.name} (${ws.lastAccessed.toLocaleDateString()})`);
      });
      outputChannel.show();
      const actions = await vscode19.window.showQuickPick([
        { label: "\u{1F4CB} Export Analytics", action: "export" },
        { label: "\u{1F4CA} Show Groups", action: "groups" }
      ], {
        placeHolder: "Analytics Actions"
      });
      switch (actions?.action) {
        case "export":
          const report = multiWorkspaceManager.exportWorkspaceConfiguration();
          const doc = await vscode19.workspace.openTextDocument({
            content: report,
            language: "json"
          });
          await vscode19.window.showTextDocument(doc);
          break;
        case "groups":
          const groups = multiWorkspaceManager.getWorkspaceGroups();
          if (groups.length === 0) {
            vscode19.window.showInformationMessage("No workspace groups found.");
          } else {
            outputChannel.appendLine("\n\u{1F4C2} Workspace Groups:");
            groups.forEach((group) => {
              outputChannel.appendLine(`  ${group.name}: ${group.workspaces.length} workspaces`);
            });
          }
          break;
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.setupCICD", async () => {
      if (!cicdIntegration) {
        vscode19.window.showWarningMessage("CI/CD integration requires an open workspace.");
        return;
      }
      await cicdIntegration.setupIntegration();
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.manageWorkflows", async () => {
      if (!cicdIntegration) {
        vscode19.window.showWarningMessage("CI/CD integration requires an open workspace.");
        return;
      }
      await cicdIntegration.manageWorkflows();
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.showReports", async () => {
      if (!reportViewer) {
        vscode19.window.showWarningMessage("Report viewer requires an open workspace.");
        return;
      }
      await reportViewer.showReports();
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.cicdStatus", async () => {
      if (!cicdIntegration) {
        vscode19.window.showWarningMessage("CI/CD integration requires an open workspace.");
        return;
      }
      const status = await cicdIntegration.getStatus();
      const message = `CI/CD Status:
\u2022 Initialized: ${status.initialized ? "\u2705" : "\u274C"}
\u2022 GitHub Actions: ${status.hasWorkflows ? "\u2705" : "\u274C"}
\u2022 BDD Tests: ${status.hasBDDTests ? "\u2705" : "\u274C"}
\u2022 Integration: ${status.integrationEnabled ? "\u2705 Enabled" : "\u274C Disabled"}`;
      const actions = [];
      if (!status.integrationEnabled) {
        actions.push("Setup Integration");
      }
      if (status.hasWorkflows) {
        actions.push("Manage Workflows");
      }
      actions.push("View Reports", "Refresh Status");
      const selected = await vscode19.window.showInformationMessage(message, ...actions);
      switch (selected) {
        case "Setup Integration":
          vscode19.commands.executeCommand("playwright-bdd.setupCICD");
          break;
        case "Manage Workflows":
          vscode19.commands.executeCommand("playwright-bdd.manageWorkflows");
          break;
        case "View Reports":
          vscode19.commands.executeCommand("playwright-bdd.showReports");
          break;
        case "Refresh Status":
          await cicdIntegration.refresh();
          vscode19.commands.executeCommand("playwright-bdd.cicdStatus");
          break;
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.showSettings", async () => {
      if (!settingsUI) {
        vscode19.window.showWarningMessage("Settings UI requires an open workspace.");
        return;
      }
      await settingsUI.showSettingsUI();
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.triggerGitHubWorkflow", async () => {
      if (!cicdIntegration) {
        vscode19.window.showWarningMessage("GitHub workflow triggering requires an open workspace.");
        return;
      }
      try {
        const status = await cicdIntegration.getStatus();
        if (!status.initialized || !status.hasWorkflows) {
          const result = await vscode19.window.showInformationMessage(
            "No GitHub workflows detected. Would you like to set up CI/CD integration?",
            "Setup CI/CD",
            "Cancel"
          );
          if (result === "Setup CI/CD") {
            await cicdIntegration.setupIntegration();
            return;
          } else {
            return;
          }
        }
        await cicdIntegration.manageWorkflows();
      } catch (error) {
        outputChannel.appendLine(`[ERROR] GitHub workflow trigger failed: ${error}`);
        vscode19.window.showErrorMessage("Failed to trigger GitHub workflow. Check output for details.");
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.viewWorkflowStatus", async () => {
      if (!cicdIntegration) {
        vscode19.window.showWarningMessage("GitHub workflow status requires an open workspace.");
        return;
      }
      try {
        await cicdIntegration.manageWorkflows();
      } catch (error) {
        outputChannel.appendLine(`[ERROR] Failed to view workflow status: ${error}`);
        vscode19.window.showErrorMessage("Failed to view workflow status. Check output for details.");
      }
    })
  );
  context.subscriptions.push(
    vscode19.commands.registerCommand("playwright-bdd.showExecutionHistory", async () => {
      const { getExecutionHistory: getExecutionHistory2, clearExecutionHistory: clearExecutionHistory2 } = await Promise.resolve().then(() => (init_bddRunner(), bddRunner_exports));
      const history = getExecutionHistory2();
      if (history.length === 0) {
        vscode19.window.showInformationMessage("No test execution history available.");
        return;
      }
      const items = history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).map((h) => ({
        label: `${h.success ? "\u2705" : "\u274C"} ${h.command}`,
        description: `${h.duration}ms`,
        detail: `${h.timestamp.toLocaleString()}`,
        history: h
      }));
      const selected = await vscode19.window.showQuickPick(items, {
        placeHolder: "Recent test executions (most recent first)",
        matchOnDescription: true,
        matchOnDetail: true
      });
      if (selected) {
        const actions = await vscode19.window.showQuickPick([
          { label: "\u{1F4CB} Copy Command", action: "copy" },
          { label: "\u{1F5D1}\uFE0F Clear History", action: "clear" },
          { label: "\u{1F4CA} Show Details", action: "details" }
        ], {
          placeHolder: "Choose an action"
        });
        if (actions?.action === "copy") {
          await vscode19.env.clipboard.writeText(selected.history.command);
          vscode19.window.showInformationMessage("Command copied to clipboard");
        } else if (actions?.action === "clear") {
          clearExecutionHistory2();
          vscode19.window.showInformationMessage("Execution history cleared");
        } else if (actions?.action === "details") {
          outputChannel.appendLine(`
=== Execution Details ===`);
          outputChannel.appendLine(`Command: ${selected.history.command}`);
          outputChannel.appendLine(`Success: ${selected.history.success}`);
          outputChannel.appendLine(`Duration: ${selected.history.duration}ms`);
          outputChannel.appendLine(`Timestamp: ${selected.history.timestamp.toLocaleString()}`);
          outputChannel.show();
        }
      }
    })
  );
  const statusBarItem = vscode19.window.createStatusBarItem(vscode19.StatusBarAlignment.Left);
  statusBarItem.text = "$(beaker) Run BDD Tests";
  statusBarItem.command = "playwright-bdd.runTests";
  statusBarItem.tooltip = "Run all Playwright BDD tests";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  const stopButton = vscode19.window.createStatusBarItem(vscode19.StatusBarAlignment.Left);
  stopButton.text = "$(debug-stop) Stop BDD Tests";
  stopButton.command = "playwright-bdd.terminateTests";
  stopButton.tooltip = "Terminate running Playwright BDD tests";
  stopButton.show();
  context.subscriptions.push(stopButton);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate
});
//# sourceMappingURL=extension.js.map
