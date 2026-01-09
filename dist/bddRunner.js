"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBDDTests = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
function runBDDTests(run, controller, testItem, outputChannel) {
    var _a;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('❌ No workspace folder open.');
        return;
    }
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const config = vscode.workspace.getConfiguration();
    const enableFeatureGen = config.get('playwrightBdd.enableFeatureGen', true);
    const configPath = config.get('playwrightBdd.configPath') || './playwright.config.ts';
    const tsconfigPath = config.get('playwrightBdd.tsconfigPath') || '';
    const tags = config.get('playwrightBdd.tags') || '';
    let featureGenCommand = config.get('playwrightBdd.featureGenCommand');
    let testCommand = config.get('playwrightBdd.testCommand');
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
    // If running a specific test file
    if ((_a = testItem === null || testItem === void 0 ? void 0 : testItem.uri) === null || _a === void 0 ? void 0 : _a.fsPath) {
        testCommand += ` "${testItem.uri.fsPath}"`;
    }
    const runCommand = (cmd, label, onSuccess) => {
        outputChannel === null || outputChannel === void 0 ? void 0 : outputChannel.appendLine(`▶️ Running ${label}: ${cmd}`);
        (0, child_process_1.exec)(cmd, { cwd: projectRoot }, (err, stdout, stderr) => {
            if (err) {
                outputChannel === null || outputChannel === void 0 ? void 0 : outputChannel.appendLine(`❌ ${label} failed:\n${stderr}`);
                run === null || run === void 0 ? void 0 : run.appendOutput(stderr);
                run === null || run === void 0 ? void 0 : run.failed(testItem !== null && testItem !== void 0 ? testItem : controller === null || controller === void 0 ? void 0 : controller.items.get('root'), new vscode.TestMessage(stderr));
            }
            else {
                outputChannel === null || outputChannel === void 0 ? void 0 : outputChannel.appendLine(`✅ ${label} completed:\n${stdout}`);
                run === null || run === void 0 ? void 0 : run.appendOutput(stdout);
                run === null || run === void 0 ? void 0 : run.passed(testItem !== null && testItem !== void 0 ? testItem : controller === null || controller === void 0 ? void 0 : controller.items.get('root'));
                if (onSuccess) {
                    onSuccess(); // ✅ Call the success callback
                }
            }
            run === null || run === void 0 ? void 0 : run.end();
        });
    };
    if (enableFeatureGen) {
        runCommand(featureGenCommand, 'Feature generation', () => {
            runCommand(testCommand, 'BDD test run');
        });
    }
    else {
        runCommand(testCommand, 'BDD test run');
    }
}
exports.runBDDTests = runBDDTests;
