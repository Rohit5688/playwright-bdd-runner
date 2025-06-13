"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.esmLoaderInstalled = void 0;
exports.installEsmLoaderIfNeeded = installEsmLoaderIfNeeded;
/**
 * See: https://github.com/microsoft/playwright/blob/main/packages/playwright/src/common/esmLoaderHost.ts
 */
const utils_1 = require("./utils");
const node_fs_1 = __importDefault(require("node:fs"));
let called = false;
exports.esmLoaderInstalled = false;
async function installEsmLoaderIfNeeded() {
    if (called)
        return;
    called = true;
    if (!require('node:module').register)
        return;
    const esmLoaderHostPath = (0, utils_1.getPlaywrightModulePath)('lib/common/esmLoaderHost.js');
    if (!node_fs_1.default.existsSync(esmLoaderHostPath))
        return;
    const { registerESMLoader } = (0, utils_1.requirePlaywrightModule)(esmLoaderHostPath);
    // registerESMLoader was added in PW 1.41 and allows to setup esm loader hook without process restart.
    // In pw-bdd we keep only this way for esm support.
    // PW has older way with process restart that is complicated.
    // see: https://github.com/microsoft/playwright/pull/28526/files#diff-490565cd49c7e9417108773db457433c2af9a123443be8b5dae11be091107d65
    if (registerESMLoader) {
        exports.esmLoaderInstalled = true;
        await registerESMLoader();
    }
}
//# sourceMappingURL=esmLoader.js.map