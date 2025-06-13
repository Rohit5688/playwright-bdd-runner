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
exports.FeatureCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
class FeatureCodeLensProvider {
    provideCodeLenses(document) {
        const lenses = [];
        const text = document.getText();
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const scenarioMatch = lines[i].match(/^\s*Scenario(?: Outline)?:\s*(.+)/);
            if (scenarioMatch) {
                let tag;
                // Look upward for the nearest tag line
                for (let j = i - 1; j >= 0; j--) {
                    const tagMatch = lines[j].match(/^\s*@(\w+)/);
                    if (tagMatch) {
                        tag = `@${tagMatch[1]}`;
                        break;
                    }
                    else if (lines[j].trim() === '') {
                        continue;
                    }
                    else {
                        break;
                    }
                }
                const range = new vscode.Range(i, 0, i, lines[i].length);
                const grepArg = tag !== null && tag !== void 0 ? tag : scenarioMatch[1];
                lenses.push(new vscode.CodeLens(range, {
                    title: "▶ Run Scenario",
                    command: "playwright-bdd.runScenario",
                    arguments: [grepArg]
                }));
            }
        }
        return lenses;
    }
}
exports.FeatureCodeLensProvider = FeatureCodeLensProvider;
