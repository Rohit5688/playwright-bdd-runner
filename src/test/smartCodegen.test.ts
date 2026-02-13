import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { ProjectAnalyzer } from '../projectAnalyzer';
import { SmartCodeGenerator } from '../smartCodeGenerator';

suite('Smart Code Generation Tests', () => {
    let tempDir: string;
    let outputChannel: vscode.OutputChannel;

    setup(() => {
        // Create temp directory
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-codegen-test-'));

        // Mock OutputChannel
        outputChannel = {
            name: 'Mock Output',
            append: () => { },
            appendLine: () => { },
            replace: () => { },
            clear: () => { },
            show: () => { },
            hide: () => { },
            dispose: () => { }
        };
    });

    teardown(() => {
        // Cleanup temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('ProjectAnalyzer detects vasu31dev pattern', async () => {
        // Setup vasu31dev structure
        const utilsDir = path.join(tempDir, 'src', 'vasu-playwright-utils');
        fs.mkdirSync(utilsDir, { recursive: true });

        // Create dummy util file
        fs.writeFileSync(path.join(utilsDir, 'ActionUtils.ts'), 'export async function click() {}');

        const analyzer = new ProjectAnalyzer(tempDir, outputChannel);
        const pattern = await analyzer.analyzeProject();

        assert.strictEqual(pattern.framework.name, 'vasu31dev-playwright-ts');
        assert.strictEqual(pattern.framework.type, 'custom-utilities');
    });

    test('ProjectAnalyzer detects vanilla Playwright pattern', async () => {
        // Setup vanilla structure (no special utils)
        fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });

        const analyzer = new ProjectAnalyzer(tempDir, outputChannel);
        const pattern = await analyzer.analyzeProject();

        assert.strictEqual(pattern.framework.name, 'vanilla-playwright');
        assert.strictEqual(pattern.framework.type, 'vanilla-playwright');
    });

    test('SmartCodeGenerator generates vasu31dev code', async () => {
        // Setup vasu31dev structure
        const utilsDir = path.join(tempDir, 'src', 'vasu-playwright-utils');
        fs.mkdirSync(utilsDir, { recursive: true });
        fs.writeFileSync(path.join(utilsDir, 'ActionUtils.ts'), 'export async function click() {}');

        const generator = new SmartCodeGenerator(tempDir, outputChannel);
        await generator.initialize();

        const result = await generator.generateStepCode('I click on the login button', 'When');

        // Verify imports
        assert.ok(result.imports.some(i => i.includes('@ActionUtils')));

        // Verify implementation uses custom utility
        assert.ok(result.implementation.includes('await click('));
        assert.ok(result.implementation.includes("getLocatorByRole('button', { name: 'login button' })"));
    });

    test('SmartCodeGenerator generates vanilla Playwright code', async () => {
        // Setup vanilla structure
        fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });

        const generator = new SmartCodeGenerator(tempDir, outputChannel);
        await generator.initialize();

        const result = await generator.generateStepCode('I click on the login button', 'When');

        // Verify implementation uses page.click
        assert.ok(result.implementation.includes("await page.click('login button')"));
    });
});
