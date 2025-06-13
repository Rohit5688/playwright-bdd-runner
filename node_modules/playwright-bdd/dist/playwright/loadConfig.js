"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.resolveConfigDir = resolveConfigDir;
exports.resolveConfigFile = resolveConfigFile;
/**
 * Loading Playwright config.
 * See: https://github.com/microsoft/playwright/blob/main/packages/playwright-test/src/common/configLoader.ts
 */
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const utils_1 = require("./utils");
const exit_1 = require("../utils/exit");
const requireOrImport_1 = require("./requireOrImport");
const options_1 = require("../cli/options");
async function loadConfig(cliConfigPath) {
    const resolvedConfigFile = resolveConfigFile(cliConfigPath);
    assertConfigFileExists(resolvedConfigFile, cliConfigPath);
    await (0, requireOrImport_1.requireOrImport)(resolvedConfigFile);
    return { resolvedConfigFile };
}
/**
 * Returns Playwright config dir considering cli --config option.
 * Note: This fn must be called only in main process, because in workers
 * process.argv is different.
 */
function resolveConfigDir() {
    const cliConfigPath = (0, options_1.getCliConfigPath)();
    const playwrightConfigFileFromCli = resolveConfigFile(cliConfigPath);
    return playwrightConfigFileFromCli ? node_path_1.default.dirname(playwrightConfigFileFromCli) : process.cwd();
}
function resolveConfigFile(cliConfigPath) {
    const { resolveConfigFile, resolveConfigLocation } = (0, utils_1.requirePlaywrightModule)('lib/common/configLoader.js');
    // Since Playwright 1.44 configLoader.js exports resolveConfigLocation()
    // See: https://github.com/microsoft/playwright/pull/30275
    if (typeof resolveConfigLocation === 'function') {
        return resolveConfigLocation(cliConfigPath).resolvedConfigFile || '';
    }
    else {
        const configFileOrDirectory = getConfigFilePath(cliConfigPath);
        return resolveConfigFile(configFileOrDirectory) || '';
    }
}
function getConfigFilePath(cliConfigPath) {
    return cliConfigPath ? node_path_1.default.resolve(process.cwd(), cliConfigPath) : process.cwd();
}
function assertConfigFileExists(resolvedConfigFile, cliConfigPath) {
    if (!resolvedConfigFile || !node_fs_1.default.existsSync(resolvedConfigFile)) {
        const configFilePath = getConfigFilePath(cliConfigPath);
        (0, exit_1.exit)(`Can't find Playwright config file in: ${configFilePath}`);
    }
}
//# sourceMappingURL=loadConfig.js.map