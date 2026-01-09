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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Meta = void 0;
/**
 * Builds meta message.
 * See: https://github.com/cucumber/cucumber-js/blob/main/src/cli/helpers.ts#L100
 */
const node_os_1 = __importDefault(require("node:os"));
const messages = __importStar(require("@cucumber/messages"));
const index_js_1 = require("../../../utils/index.js");
class Meta {
    buildMessage() {
        const playwrightBddVersion = (0, index_js_1.getPackageVersion)('playwright-bdd');
        const playwrightVersion = (0, index_js_1.getPackageVersion)('@playwright/test');
        const meta = {
            protocolVersion: messages.version,
            implementation: {
                version: `${playwrightBddVersion} (playwright ${playwrightVersion})`,
                name: 'playwright-bdd',
            },
            cpu: {
                name: node_os_1.default.arch(),
            },
            os: {
                name: node_os_1.default.platform(),
                version: node_os_1.default.release(),
            },
            runtime: {
                name: 'node.js',
                version: process.versions.node,
            },
        };
        return { meta };
    }
}
exports.Meta = Meta;
//# sourceMappingURL=Meta.js.map