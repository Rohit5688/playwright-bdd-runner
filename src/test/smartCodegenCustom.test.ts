import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { SmartCodeGenerator } from '../smartCodeGenerator';

// Mock vscode
const vscode = {
    window: {
        createOutputChannel: (_?: string) => ({
            appendLine: (msg: string) => console.log(msg)
        })
    },
    workspace: {
        findFiles: async () => [],
        workspaceFolders: [{ uri: { fsPath: path.resolve(__dirname, '../../test-workspace') } }]
    }
};

// Mock ProjectAnalyzer
const mockAnalyzer = {
    analyzeProject: async () => ({
        framework: { name: 'custom-utilities', type: 'custom-utilities', features: [] },
        utilities: {
            actions: ['myClick', 'myType'],
            assertions: ['myAssertVisible'],
            navigation: ['myGoTo'],
            locators: []
        },
        imports: new Map(),
        codeStyle: { exports: 'named', async: true, architecture: 'flat' },
        directories: {}
    }),
    clearCache: () => { }
};

suite('SmartCodeGenerator Custom Framework Tests', () => {
    const outputChannel = vscode.window.createOutputChannel('Test');
    const workspaceRoot = path.resolve(__dirname, '../../test-workspace');

    test('Should generate patterns from discovered utilities', async () => {
        const generator = new SmartCodeGenerator(workspaceRoot, outputChannel as any);
        // Inject mock analyzer (casting to any to bypass private access)
        (generator as any).projectAnalyzer = mockAnalyzer;

        const code = await generator.generateStepCode('I click "Submit"', 'When');

        assert.ok(code.implementation.includes('await myClick'), 'Should use discovered click utility');
        assert.ok(code.imports[0].includes('myClick'), 'Should import discovered utility');
    });

    test('Should prioritize .bdd-instructions.md over discovered patterns', async () => {
        const generator = new SmartCodeGenerator(workspaceRoot, outputChannel as any);
        (generator as any).projectAnalyzer = mockAnalyzer;

        // Create temporary instructions file
        const instructionsPath = path.join(workspaceRoot, '.bdd-instructions.md');
        const instructionsContent = `
## Custom Click
- Match: \`I click {string}\`
- Code: \`await customClick({0})\`
- Import: \`import { customClick } from '@/custom'\`
        `;

        if (!fs.existsSync(workspaceRoot)) {
            fs.mkdirSync(workspaceRoot, { recursive: true });
        }
        fs.writeFileSync(instructionsPath, instructionsContent);

        try {
            const code = await generator.generateStepCode('I click "Submit"', 'When');
            assert.ok(code.implementation.includes('await customClick'), 'Should use instruction code');
            assert.ok(code.imports[0].includes('customClick'), 'Should use instruction import');
        } finally {
            // Cleanup
            if (fs.existsSync(instructionsPath)) {
                fs.unlinkSync(instructionsPath);
            }
        }
    });

    test('Should generate .bdd-instructions.md content correctly', async () => {
        const generator = new SmartCodeGenerator(workspaceRoot, outputChannel as any);
        (generator as any).projectAnalyzer = mockAnalyzer;

        const filePath = await generator.generateInstructions();
        const content = fs.readFileSync(filePath, 'utf8');

        assert.ok(content.includes('Match: `I click {string}`'), 'Should include click pattern');
        assert.ok(content.includes('Code: `await myClick({0})`'), 'Should include discovered utility in code');

        // Cleanup
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });
});
