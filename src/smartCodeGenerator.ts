import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectPattern, ProjectAnalyzer } from './projectAnalyzer';

export interface StepPattern {
    keyword: string;
    regex: RegExp;
    utility: string;
    template: (params: string[]) => string;
    imports: string[];
}

export interface GeneratedCode {
    imports: string[];
    functionName: string;
    implementation: string;
    fullCode: string;
}

export class SmartCodeGenerator {
    private projectAnalyzer: ProjectAnalyzer;
    private projectPattern?: ProjectPattern;
    private outputChannel: vscode.OutputChannel;
    private workspaceRoot: string;

    constructor(workspaceRoot: string, outputChannel: vscode.OutputChannel) {
        this.workspaceRoot = workspaceRoot;
        this.outputChannel = outputChannel;
        this.projectAnalyzer = new ProjectAnalyzer(workspaceRoot, outputChannel);
    }

    /**
     * Initialize by analyzing the project
     */
    async initialize(): Promise<void> {
        this.projectPattern = await this.projectAnalyzer.analyzeProject();
    }

    /**
     * Generate step definition code
     */
    async generateStepCode(
        stepText: string,
        stepType: 'Given' | 'When' | 'Then'
    ): Promise<GeneratedCode> {
        if (!this.projectPattern) {
            await this.initialize();
        }

        this.outputChannel.appendLine(`[SmartCodeGenerator] Generating code for: "${stepText}"`);

        // 1. Try user instructions first
        const userCode = await this.tryUserInstructions(stepText, stepType);
        if (userCode) {
            this.outputChannel.appendLine('[SmartCodeGenerator] Using user instructions');
            return userCode;
        }

        // 2. Match to detected project patterns
        const pattern = this.matchStepToPattern(stepText);
        if (pattern) {
            this.outputChannel.appendLine(`[SmartCodeGenerator] Matched pattern: ${pattern.keyword}`);
            return this.generateFromPattern(stepText, stepType, pattern);
        }

        // 3. Fallback to generic templates
        this.outputChannel.appendLine('[SmartCodeGenerator] Using generic template');
        return this.generateGenericCode(stepText, stepType);
    }

    /**
     * Try to load user custom instructions
     */
    private async tryUserInstructions(stepText: string, stepType: string): Promise<GeneratedCode | null> {
        const instructionsPath = path.join(this.workspaceRoot, '.bdd-instructions.md');

        if (!fs.existsSync(instructionsPath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(instructionsPath, 'utf8');
            const instructions = this.parseInstructions(content);

            for (const instruction of instructions) {
                if (instruction.regex.test(stepText)) {
                    return this.generateFromPattern(stepText, stepType, instruction);
                }
            }
        } catch (error) {
            this.outputChannel.appendLine(`[SmartCodeGenerator] Failed to parse instructions: ${error}`);
        }

        return null;
    }

    /**
     * Parse .bdd-instructions.md content
     */
    private parseInstructions(content: string): StepPattern[] {
        const patterns: StepPattern[] = [];
        const sections = content.split(/^##\s+/m);

        for (const section of sections) {
            const matchLine = section.match(/- Match:\s+`([^`]+)`/);
            const codeLine = section.match(/- Code:\s+`([^`]+)`/);
            const importsLine = section.match(/- Imports?:\s+`([^`]+)`/);

            if (matchLine && codeLine) {
                const matchPattern = matchLine[1];
                const codeTemplate = codeLine[1];
                const imports = importsLine ? [importsLine[1]] : [];

                // Convert "I click {string}" to regex
                // {string} -> (.+)
                // {int} -> (\d+)
                const regexStr = matchPattern
                    .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // Escape special chars
                    .replace(/\\\{string\\\}/g, '(.+)')
                    .replace(/\\\{int\\\}/g, '(\\d+)');

                patterns.push({
                    keyword: 'custom',
                    regex: new RegExp(regexStr, 'i'),
                    utility: 'custom',
                    template: (params) => {
                        let code = codeTemplate;
                        params.forEach((param, index) => {
                            code = code.replace(new RegExp(`\\{${index}\\}`, 'g'), param);
                        });
                        return code;
                    },
                    imports: imports
                });
            }
        }

        return patterns;
    }

    /**
     * Match step text to a pattern
     */
    private matchStepToPattern(stepText: string): StepPattern | null {
        const patterns = this.getPatterns();

        for (const pattern of patterns) {
            if (pattern.regex.test(stepText)) {
                return pattern;
            }
        }

        return null;
    }

    /**
     * Get patterns based on detected project structure
     */
    private getPatterns(): StepPattern[] {
        if (!this.projectPattern) {
            return this.getGenericPatterns();
        }

        const framework = this.projectPattern.framework.name;

        // vasu31dev pattern
        if (framework === 'vasu31dev-playwright-ts') {
            return this.getVasu31devPatterns();
        }

        // Custom utilities pattern
        if (framework === 'custom-utilities') {
            return this.getCustomUtilityPatterns(this.projectPattern.utilities);
        }

        // Vanilla Playwright
        return this.getVanillaPlaywrightPatterns();
    }

    /**
     * Get patterns for vasu31dev framework
     */
    private getVasu31devPatterns(): StepPattern[] {
        return [
            {
                keyword: 'navigate',
                regex: /(?:navigate|go|open).+(?:to|the)\s+(.+)/i,
                utility: 'gotoURL',
                template: (params) => `await gotoURL('${params[0]}');`,
                imports: ["import { gotoURL } from '@ActionUtils';"]
            },
            {
                keyword: 'click',
                regex: /(?:click|press).+(?:on|the)\s+(.+)/i,
                utility: 'click',
                template: (params) => `await click(getLocatorByRole('button', { name: '${params[0]}' }));`,
                imports: [
                    "import { click } from '@ActionUtils';",
                    "import { getLocatorByRole } from '@LocatorUtils';"
                ]
            },
            {
                keyword: 'fill',
                regex: /(?:fill|enter|type).+['"](.+)['"].+(?:in|into)\s+(.+)/i,
                utility: 'fill',
                template: (params) => `await fill(getLocator('${params[1]}'), '${params[0]}');`,
                imports: [
                    "import { fill } from '@ActionUtils';",
                    "import { getLocator } from '@LocatorUtils';"
                ]
            },
            {
                keyword: 'see',
                regex: /(?:should see|see|verify).+['"](.+)['"]/i,
                utility: 'expectElementToBeVisible',
                template: (params) => `await expectElementToBeVisible(getLocator('text=${params[0]}'));`,
                imports: [
                    "import { expectElementToBeVisible } from '@AssertUtils';",
                    "import { getLocator } from '@LocatorUtils';"
                ]
            }
        ];
    }

    /**
     * Get patterns based on detected custom utilities
     */
    private getCustomUtilityPatterns(utilities: any): StepPattern[] {
        const patterns: StepPattern[] = [];

        // 1. Action Patterns (click, tap, etc.)
        if (utilities.actions && utilities.actions.length > 0) {
            // Find best match for 'click'
            const clickUtil = utilities.actions.find((u: string) => u.toLowerCase().includes('click')) || utilities.actions[0];

            patterns.push({
                keyword: 'click',
                regex: /(?:click|tap|press)\s+(?:on\s+)?(.+)/i,
                utility: clickUtil,
                template: (params) => `await ${clickUtil}(${this.formatSelector(params[0])});`,
                imports: [`import { ${clickUtil} } from '${this.findImportPath(clickUtil)}';`]
            });

            // Find best match for 'type'/'fill'
            const fillUtil = utilities.actions.find((u: string) => u.toLowerCase().includes('fill') || u.toLowerCase().includes('type'));
            if (fillUtil) {
                patterns.push({
                    keyword: 'fill',
                    regex: /(?:fill|type|enter)\s+"([^"]+)"\s+(?:into|in)\s+(.+)/i,
                    utility: fillUtil,
                    template: (params) => `await ${fillUtil}(${this.formatSelector(params[1])}, '${params[0]}');`,
                    imports: [`import { ${fillUtil} } from '${this.findImportPath(fillUtil)}';`]
                });
            }
        }

        // 2. Navigation Patterns
        if (utilities.navigation && utilities.navigation.length > 0) {
            const navUtil = utilities.navigation.find((u: string) => u.toLowerCase().includes('goto') || u.toLowerCase().includes('nav'));
            if (navUtil) {
                patterns.push({
                    keyword: 'navigate',
                    regex: /(?:navigate|go|open).+(?:to|the)\s+(.+)/i,
                    utility: navUtil,
                    template: (params) => `await ${navUtil}('${params[0]}');`,
                    imports: [`import { ${navUtil} } from '${this.findImportPath(navUtil)}';`]
                });
            }
        }

        // 3. Assertion Patterns
        if (utilities.assertions && utilities.assertions.length > 0) {
            const assertUtil = utilities.assertions.find((u: string) => u.toLowerCase().includes('visible'));
            if (assertUtil) {
                patterns.push({
                    keyword: 'see',
                    regex: /(?:see|should see|verify)\s+(.+)/i,
                    utility: assertUtil,
                    template: (params) => `await ${assertUtil}(${this.formatSelector(params[0])});`,
                    imports: [`import { ${assertUtil} } from '${this.findImportPath(assertUtil)}';`]
                });
            }
        }

        return patterns;
    }

    /**
     * Helper to find import path for a utility
     */
    private findImportPath(utilityName: string): string {
        // In a real implementation, we would map exports to files in ProjectAnalyzer
        // For now, we'll try to guess based on common conventions or use a placeholder
        if (this.projectPattern?.imports) {
            for (const [category, imports] of this.projectPattern.imports) {
                if (imports.includes(utilityName)) {
                    // This is a simplification. Ideally ProjectAnalyzer provides the file path.
                    return `@${category}`;
                }
            }
        }
        return '@/utils'; // Default fallback
    }

    /**
     * Helper to format selector (simple heuristic)
     */
    private formatSelector(text: string): string {
        if (text.startsWith('"') || text.startsWith("'")) return text;
        return `'${text}'`;
    }

    /**
     * Get patterns for vanilla Playwright
     */
    private getVanillaPlaywrightPatterns(): StepPattern[] {
        return [
            {
                keyword: 'navigate',
                regex: /(?:navigate|go|open).+(?:to|the)\s+(.+)/i,
                utility: 'page.goto',
                template: (params) => `await page.goto('${params[0]}');`,
                imports: []
            },
            {
                keyword: 'click',
                regex: /(?:click|press).+(?:on|the)\s+(.+)/i,
                utility: 'page.click',
                template: (params) => `await page.click('${params[0]}');`,
                imports: []
            },
            {
                keyword: 'fill',
                regex: /(?:fill|enter|type).+['"](.+)['"].+(?:in|into)\s+(.+)/i,
                utility: 'page.fill',
                template: (params) => `await page.fill('${params[1]}', '${params[0]}');`,
                imports: []
            },
            {
                keyword: 'see',
                regex: /(?:should see|see|verify).+['"](.+)['"]/i,
                utility: 'expect',
                template: (params) => `await expect(page.locator('text=${params[0]}')).toBeVisible();`,
                imports: ["import { expect } from '@playwright/test';"]
            }
        ];
    }

    /**
     * Get generic fallback patterns
     */
    private getGenericPatterns(): StepPattern[] {
        return this.getVanillaPlaywrightPatterns();
    }

    /**
     * Generate code from a matched pattern
     */
    private generateFromPattern(
        stepText: string,
        stepType: string,
        pattern: StepPattern
    ): GeneratedCode {
        // Extract parameters from step text
        const match = stepText.match(pattern.regex);
        const params = match ? Array.from(match).slice(1) : [];

        // Generate function name
        const functionName = this.generateFunctionName(stepText, stepType);

        // Generate implementation
        const implementation = pattern.template(params);

        // Build imports
        const imports = this.deduplicateImports(pattern.imports);

        // Build full code
        const fullCode = this.buildFullCode(imports, functionName, implementation);

        return {
            imports,
            functionName,
            implementation,
            fullCode
        };
    }

    /**
     * Generate generic code when no pattern matches
     */
    private generateGenericCode(stepText: string, stepType: string): GeneratedCode {
        const functionName = this.generateFunctionName(stepText, stepType);
        const implementation = '// TODO: Implement step logic';
        const imports: string[] = [];

        const fullCode = this.buildFullCode(imports, functionName, implementation);

        return {
            imports,
            functionName,
            implementation,
            fullCode
        };
    }

    /**
     * Generate a function name from step text
     */
    private generateFunctionName(stepText: string, stepType: string): string {
        // Remove special characters and convert to camelCase
        const words = stepText
            .toLowerCase()
            .replace(/['"<>{}]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 0);

        // Capitalize first letter of each word except the first
        const camelCase = words
            .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
            .join('');

        return camelCase;
    }

    /**
     * Build full code string
     */
    private buildFullCode(imports: string[], functionName: string, implementation: string): string {
        const codeStyle = this.projectPattern?.codeStyle;

        let code = '';

        // Add imports
        if (imports.length > 0) {
            code += imports.join('\n') + '\n\n';
        }

        // Add function based on code style
        if (codeStyle?.exports === 'class-based') {
            code += `export class ${this.capitalize(functionName)} {\n`;
            code += `  async execute() {\n`;
            code += `    ${implementation}\n`;
            code += `  }\n`;
            code += `}\n`;
        } else {
            // Named export (functional)
            code += `export async function ${functionName}() {\n`;
            code += `  ${implementation}\n`;
            code += `}\n`;
        }

        return code;
    }

    /**
     * De-duplicate imports
     */
    private deduplicateImports(imports: string[]): string[] {
        return Array.from(new Set(imports));
    }

    /**
     * Capitalize first letter
     */
    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Refresh project analysis
     */
    async refresh(): Promise<void> {
        this.projectAnalyzer.clearCache();
        this.projectPattern = undefined;
        await this.initialize();
    }

    /**
     * Generate .bdd-instructions.md based on project analysis
     */
    async generateInstructions(): Promise<string> {
        if (!this.projectPattern) {
            await this.initialize();
        }

        const pattern = this.projectPattern!;
        let content = `# BDD Smart Instructions\n\n`;
        content += `> Auto-generated based on project analysis. Customize these rules to control code generation.\n\n`;

        // 1. Actions
        if (pattern.utilities.actions.length > 0) {
            content += `## Actions\n\n`;

            const clickUtil = pattern.utilities.actions.find(u => u.toLowerCase().includes('click'));
            if (clickUtil) {
                content += `### Click Steps\n`;
                content += `- Match: \`I click {string}\`\n`;
                content += `- Code: \`await ${clickUtil}({0})\`\n`;
                content += `- Import: \`import { ${clickUtil} } from '@/utils'\`\n\n`;
            }

            const fillUtil = pattern.utilities.actions.find(u => u.toLowerCase().includes('fill'));
            if (fillUtil) {
                content += `### Input Steps\n`;
                content += `- Match: \`I fill {string} with {string}\`\n`;
                content += `- Code: \`await ${fillUtil}({0}, {1})\`\n`;
                content += `- Import: \`import { ${fillUtil} } from '@/utils'\`\n\n`;
            }
        }

        // 2. Navigation
        if (pattern.utilities.navigation.length > 0) {
            content += `## Navigation\n\n`;
            const navUtil = pattern.utilities.navigation.find(u => u.toLowerCase().includes('goto') || u.toLowerCase().includes('nav'));
            if (navUtil) {
                content += `### Navigate Steps\n`;
                content += `- Match: \`I go to {string}\`\n`;
                content += `- Code: \`await ${navUtil}({0})\`\n`;
                content += `- Import: \`import { ${navUtil} } from '@/utils'\`\n\n`;
            }
        }

        // 3. Assertions
        if (pattern.utilities.assertions.length > 0) {
            content += `## Assertions\n\n`;
            const assertUtil = pattern.utilities.assertions.find(u => u.toLowerCase().includes('visible'));
            if (assertUtil) {
                content += `### Visibility Steps\n`;
                content += `- Match: \`I should see {string}\`\n`;
                content += `- Code: \`await ${assertUtil}({0})\`\n`;
                content += `- Import: \`import { ${assertUtil} } from '@/utils'\`\n\n`;
            }
        }

        const filePath = path.join(this.workspaceRoot, '.bdd-instructions.md');
        fs.writeFileSync(filePath, content, 'utf8');

        return filePath;
    }
}
