import * as assert from 'assert';
import { StepDefinitionProvider } from '../stepDefinitionProvider';
import * as vscode from 'vscode';

suite('Step Matching Tests', () => {
    let provider: StepDefinitionProvider;
    let outputChannel: vscode.OutputChannel;

    setup(() => {
        outputChannel = vscode.window.createOutputChannel('Test');
        provider = new StepDefinitionProvider(outputChannel);

        // Manually add step definitions for testing
        (provider as any).stepDefinitions = [
            {
                pattern: "through API for {string} aggregator and {string} I get response with body {string}",
                type: "When",
                file: "test.ts",
                line: 1,
                function: "async () => {}"
            }
        ];
    });

    test('Should match step with multiple string parameters (all literals)', () => {
        const stepText = "through API for 'external' aggregator and 'desktop' I get response with body 'aggregator_request_body'";
        const match = provider.findMatchingStep(stepText);

        assert.ok(match, 'Should match step with multiple string parameters');
        assert.strictEqual(match.pattern, "through API for {string} aggregator and {string} I get response with body {string}");
    });

    test('Should match step with scenario outline parameter in quotes', () => {
        const stepText = "through API for 'external' aggregator and '<device_type>' I get response with body 'aggregator_request_body'";
        const match = provider.findMatchingStep(stepText);

        assert.ok(match, 'Should match step with scenario outline parameter');
        assert.strictEqual(match.pattern, "through API for {string} aggregator and {string} I get response with body {string}");
    });

    test('Should match step with mixed parameters', () => {
        (provider as any).stepDefinitions = [
            {
                pattern: "I have {int} cukes in my {string} belly",
                type: "Given",
                file: "test.ts",
                line: 1,
                function: "async () => {}"
            }
        ];

        const stepText = "I have 42 cukes in my 'big' belly";
        const match = provider.findMatchingStep(stepText);

        assert.ok(match, 'Should match mixed parameters');
    });
});
