import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

export interface UtilityMap {
    actions: string[];
    assertions: string[];
    locators: string[];
    navigation: string[];
}

export interface ProjectPattern {
    framework: FrameworkType;
    utilities: UtilityMap;
    imports: Map<string, string[]>;
    codeStyle: CodeStyle;
    directories: ProjectDirectories;
}

export interface FrameworkType {
    name: string;
    type: 'custom-utilities' | 'vanilla-playwright' | 'custom-pom' | 'cucumber-style';
    features: string[];
}

export interface CodeStyle {
    exports: 'named' | 'default' | 'class-based';
    async: boolean;
    architecture: 'pom-functional' | 'pom-class' | 'flat' | 'layered';
}

export interface ProjectDirectories {
    pages?: string;
    utils?: string;
    testdata?: string;
    steps?: string;
}

export class ProjectAnalyzer {
    private workspaceRoot: string;
    private outputChannel: vscode.OutputChannel;
    private cachedPattern?: ProjectPattern;

    constructor(workspaceRoot: string, outputChannel: vscode.OutputChannel) {
        this.workspaceRoot = workspaceRoot;
        this.outputChannel = outputChannel;
    }

    /**
     * Analyze the project structure and detect patterns
     */
    async analyzeProject(): Promise<ProjectPattern> {
        if (this.cachedPattern) {
            return this.cachedPattern;
        }

        this.outputChannel.appendLine('[ProjectAnalyzer] Starting project analysis...');

        const pattern: ProjectPattern = {
            framework: await this.detectFramework(),
            utilities: await this.findUtilities(),
            imports: await this.learnImportPatterns(),
            codeStyle: await this.detectCodeStyle(),
            directories: await this.findDirectories()
        };

        this.cachedPattern = pattern;

        // Save analysis results
        await this.saveAnalysis(pattern);

        this.outputChannel.appendLine(`[ProjectAnalyzer] Detected framework: ${pattern.framework.name}`);

        return pattern;
    }

    /**
     * Detect the framework type being used
     */
    private async detectFramework(): Promise<FrameworkType> {
        // Check for vasu31dev pattern
        if (this.hasDirectory('src/vasu-playwright-utils') ||
            this.hasDirectory('vasu-playwright-utils')) {
            return {
                name: 'vasu31dev-playwright-ts',
                type: 'custom-utilities',
                features: ['ActionUtils', 'AssertUtils', 'LocatorUtils', 'POM', 'TestData']
            };
        }

        // Check for custom utilities pattern
        if (this.hasDirectory('utils') || this.hasDirectory('src/utils')) {
            const hasActionUtils = await this.hasFilePattern('**/utils/**/*action*.{ts,js}');
            const hasAssertUtils = await this.hasFilePattern('**/utils/**/*assert*.{ts,js}');

            if (hasActionUtils || hasAssertUtils) {
                return {
                    name: 'custom-utilities',
                    type: 'custom-utilities',
                    features: ['CustomUtils', 'POM']
                };
            }
        }

        // Check for Page Object Model
        if (this.hasDirectory('pages') || this.hasDirectory('src/pages')) {
            return {
                name: 'page-object-model',
                type: 'custom-pom',
                features: ['POM']
            };
        }

        // Check for Cucumber-style
        if (this.hasDirectory('step-definitions') || this.hasDirectory('step_definitions')) {
            return {
                name: 'cucumber-style',
                type: 'cucumber-style',
                features: ['StepDefinitions']
            };
        }

        // Default to vanilla Playwright
        return {
            name: 'vanilla-playwright',
            type: 'vanilla-playwright',
            features: ['Playwright']
        };
    }

    /**
     * Find and categorize utility functions from the entire project
     */
    private async findUtilities(): Promise<UtilityMap> {
        const utilities: UtilityMap = {
            actions: [],
            assertions: [],
            locators: [],
            navigation: []
        };

        // Scan all TypeScript/JavaScript files in src (excluding tests)
        const files = await vscode.workspace.findFiles(
            'src/**/*.{ts,js}',
            '**/{node_modules,test,tests,spec,specs,*.test.*,*.spec.*}/**'
        );

        for (const file of files) {
            const exports = await this.extractExports(file.fsPath);

            // Classify exports based on name heuristics
            for (const exportName of exports) {
                const lowerName = exportName.toLowerCase();

                if (this.isActionUtility(lowerName)) {
                    utilities.actions.push(exportName);
                } else if (this.isAssertionUtility(lowerName)) {
                    utilities.assertions.push(exportName);
                } else if (this.isLocatorUtility(lowerName)) {
                    utilities.locators.push(exportName);
                } else if (this.isNavigationUtility(lowerName)) {
                    utilities.navigation.push(exportName);
                }
            }
        }

        return utilities;
    }

    private isActionUtility(name: string): boolean {
        return name.includes('click') ||
            name.includes('tap') ||
            name.includes('press') ||
            name.includes('type') ||
            name.includes('fill') ||
            name.includes('select') ||
            name.includes('hover');
    }

    private isAssertionUtility(name: string): boolean {
        return name.includes('expect') ||
            name.includes('verify') ||
            name.includes('assert') ||
            name.includes('check');
    }

    private isLocatorUtility(name: string): boolean {
        return name.includes('locator') ||
            name.includes('selector') ||
            name.includes('findelement') ||
            name.includes('getelement');
    }

    private isNavigationUtility(name: string): boolean {
        return name.includes('goto') ||
            name.includes('navigate') ||
            name.includes('visit') ||
            name.includes('openpage');
    }

    /**
     * Extract export names from a TypeScript/JavaScript file
     */
    private async extractExports(filePath: string): Promise<string[]> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const exports: string[] = [];

            // Match: export function name(...) or export const name = ...
            const exportRegex = /export\s+(?:async\s+)?(?:function|const|let)\s+(\w+)/g;
            let match;

            while ((match = exportRegex.exec(content)) !== null) {
                exports.push(match[1]);
            }

            return exports;
        } catch (error) {
            return [];
        }
    }

    /**
     * Learn import patterns from existing files
     */
    private async learnImportPatterns(): Promise<Map<string, string[]>> {
        const imports = new Map<string, string[]>();

        const pagesPattern = '**/pages/**/*.{ts,js}';
        const stepsPattern = '**/step*/**/*.{ts,js}';

        const files = [
            ...glob.sync(pagesPattern, { cwd: this.workspaceRoot, absolute: true }),
            ...glob.sync(stepsPattern, { cwd: this.workspaceRoot, absolute: true })
        ].slice(0, 10); // Analyze first 10 files for speed

        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const fileImports = this.extractImportsFromContent(content);

                for (const imp of fileImports) {
                    const category = this.categorizeImport(imp);
                    if (!imports.has(category)) {
                        imports.set(category, []);
                    }
                    if (!imports.get(category)!.includes(imp)) {
                        imports.get(category)!.push(imp);
                    }
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        return imports;
    }

    /**
     * Extract import statements from file content
     */
    private extractImportsFromContent(content: string): string[] {
        const imports: string[] = [];
        const importRegex = /import\s+{[^}]+}\s+from\s+['"][^'"]+['"]/g;
        const matches = content.match(importRegex);

        if (matches) {
            imports.push(...matches);
        }

        return imports;
    }

    /**
     * Categorize an import statement
     */
    private categorizeImport(importStatement: string): string {
        if (importStatement.includes('ActionUtils') || importStatement.includes('action')) {
            return 'actions';
        }
        if (importStatement.includes('AssertUtils') || importStatement.includes('assert') || importStatement.includes('expect')) {
            return 'assertions';
        }
        if (importStatement.includes('LocatorUtils') || importStatement.includes('locator')) {
            return 'locators';
        }
        if (importStatement.includes('@playwright/test')) {
            return 'playwright';
        }
        return 'other';
    }

    /**
     * Detect code style conventions
     */
    private async detectCodeStyle(): Promise<CodeStyle> {
        const sampleFiles = glob.sync('**/pages/**/*.{ts,js}', {
            cwd: this.workspaceRoot,
            absolute: true
        }).slice(0, 5);

        let namedExports = 0;
        let classExports = 0;
        let asyncCount = 0;

        for (const file of sampleFiles) {
            try {
                const content = fs.readFileSync(file, 'utf8');

                if (content.includes('export async function')) namedExports++;
                if (content.includes('export class')) classExports++;
                if (content.includes('async ')) asyncCount++;
            } catch (error) {
                // Skip
            }
        }

        return {
            exports: classExports > namedExports ? 'class-based' : 'named',
            async: asyncCount > 0,
            architecture: classExports > namedExports ? 'pom-class' : 'pom-functional'
        };
    }

    /**
     * Find project directories
     */
    private async findDirectories(): Promise<ProjectDirectories> {
        const dirs: ProjectDirectories = {};

        const checkDirs = [
            { key: 'pages', patterns: ['pages', 'src/pages', 'src/ui/pages'] },
            { key: 'utils', patterns: ['utils', 'src/utils', 'src/vasu-playwright-utils', 'vasu-playwright-utils'] },
            { key: 'testdata', patterns: ['testdata', 'src/testdata', 'test-data', 'data'] },
            { key: 'steps', patterns: ['steps', 'src/steps', 'step-definitions', 'step_definitions'] }
        ];

        for (const { key, patterns } of checkDirs) {
            for (const pattern of patterns) {
                if (this.hasDirectory(pattern)) {
                    (dirs as any)[key] = pattern;
                    break;
                }
            }
        }

        return dirs;
    }

    /**
     * Check if directory exists
     */
    private hasDirectory(relativePath: string): boolean {
        const fullPath = path.join(this.workspaceRoot, relativePath);
        return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    }

    /**
     * Check if files matching pattern exist
     */
    private async hasFilePattern(pattern: string): Promise<boolean> {
        const files = glob.sync(pattern, { cwd: this.workspaceRoot });
        return files.length > 0;
    }

    /**
     * Save analysis results to file
     */
    private async saveAnalysis(pattern: ProjectPattern): Promise<void> {
        const configPath = path.join(this.workspaceRoot, '.bdd-codegen.json');

        const config = {
            framework: pattern.framework.name,
            detected: new Date().toISOString(),
            utilities: {
                actions: pattern.utilities.actions,
                assertions: pattern.utilities.assertions,
                locators: pattern.utilities.locators,
                navigation: pattern.utilities.navigation
            },
            codeStyle: pattern.codeStyle,
            directories: pattern.directories
        };

        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
            this.outputChannel.appendLine(`[ProjectAnalyzer] Saved analysis to ${configPath}`);
        } catch (error) {
            this.outputChannel.appendLine(`[ProjectAnalyzer] Failed to save analysis: ${error}`);
        }
    }

    /**
     * Clear cached pattern (for refresh)
     */
    clearCache(): void {
        this.cachedPattern = undefined;
    }
}
