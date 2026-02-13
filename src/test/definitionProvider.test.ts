import * as assert from 'assert';
import { StepDefinitionProvider } from '../stepDefinitionProvider';

// Mock vscode
const vscode = {
    window: {
        createOutputChannel: () => ({
            appendLine: (msg: string) => console.log(msg)
        })
    },
    languages: {
        createDiagnosticCollection: () => ({
            set: () => { },
            clear: () => { },
            dispose: () => { }
        })
    },
    Uri: {
        file: (f: string) => ({ fsPath: f })
    },
    Position: class {
        constructor(public line: number, public character: number) { }
    },
    Location: class {
        constructor(public uri: any, public rangeOrPosition: any) { }
    }
};

suite('StepDefinitionProvider Matching Logic', () => {
    let provider: any;

    setup(() => {
        provider = new StepDefinitionProvider(vscode.window.createOutputChannel() as any);
        // Inject mock dependencies if needed
        (provider as any).diagnosticCollection = vscode.languages.createDiagnosticCollection();
    });

    test('Should match step with multiple string parameters', () => {
        const stepDef = {
            pattern: "through API for {string} aggregator and {string} I get response with body {string}",
            type: "When",
            file: "steps.ts",
            line: 1,
            function: "fn"
        };
        provider.stepDefinitions = [stepDef];

        const stepText = "through API for 'external' aggregator and 'desktop' I get response with body 'aggregator_request_body'";
        const match = provider.findMatchingStep(stepText);

        assert.ok(match, 'Should match step with multiple string parameters');
        assert.strictEqual(match.pattern, stepDef.pattern);
    });

    test('Should match step with scenario outline parameter in quotes', () => {
        const stepDef = {
            pattern: "through API for {string} aggregator and {string} I get response with body {string}",
            type: "When",
            file: "steps.ts",
            line: 1,
            function: "fn"
        };
        provider.stepDefinitions = [stepDef];

        const stepText = "through API for 'external' aggregator and '<device_type>' I get response with body 'aggregator_request_body'";
        const match = provider.findMatchingStep(stepText);

        assert.ok(match, 'Should match step with scenario outline parameter');
    });

    test('Should match step with mixed parameters', () => {
        const stepDef = {
            pattern: "I have {int} cukes in my {string} belly",
            type: "Given",
            file: "steps.ts",
            line: 1,
            function: "fn"
        };
        provider.stepDefinitions = [stepDef];

        const stepText = "I have 42 cukes in my 'big' belly";
        const match = provider.findMatchingStep(stepText);

        assert.ok(match, 'Should match mixed parameters');
    });
});
