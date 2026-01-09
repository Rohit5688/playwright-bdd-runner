"use strict";
/**
 * Cucumber junit reporter.
 * Based on: https://github.com/cucumber/cucumber-js/blob/main/src/formatter/junit_formatter.ts
 * Junit spec(ish): https://github.com/testmoapp/junitxml
 * See also: https://github.com/cucumber/cucumber-junit-xml-formatter
 * See also: https://github.com/microsoft/playwright/blob/main/packages/playwright/src/reporters/junit.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable visual/complexity, max-lines, max-statements, max-lines-per-function */
const xmlbuilder_1 = __importDefault(require("xmlbuilder"));
const messages_1 = require("@cucumber/messages");
const base_1 = __importDefault(require("./base"));
const valueChecker_1 = require("../../cucumber/valueChecker");
const GherkinDocumentParser_1 = require("../../cucumber/formatter/GherkinDocumentParser");
const PickleParser_1 = require("../../cucumber/formatter/PickleParser");
const GherkinDocument_1 = require("./messagesBuilder/GherkinDocument");
const Projects_1 = require("./messagesBuilder/Projects");
class JunitReporter extends base_1.default {
    constructor(internalOptions, userOptions = {}) {
        super(internalOptions);
        this.userOptions = userOptions;
        this.names = {};
        this.setOutputStream(this.userOptions.outputFile);
        this.eventBroadcaster.on('envelope', (envelope) => {
            if ((0, valueChecker_1.doesHaveValue)(envelope.testRunFinished)) {
                this.onTestRunFinished();
            }
        });
    }
    get suiteName() {
        return (0, valueChecker_1.valueOrDefault)(this.userOptions.suiteName, 'cucumber-js');
    }
    getTestCases() {
        return this.eventDataCollector
            .getTestCaseAttempts()
            .filter((attempt) => !attempt.willBeRetried);
    }
    getTestSteps(testCaseAttempt, gherkinStepMap, pickleStepMap) {
        return testCaseAttempt.testCase.testSteps.map((testStep) => {
            const isBeforeHook = !(0, valueChecker_1.doesHaveValue)(testStep.pickleStepId);
            return this.getTestStep({
                isBeforeHook,
                gherkinStepMap,
                pickleStepMap,
                testStep,
                testStepAttachments: testCaseAttempt.stepAttachments[testStep.id],
                testStepResult: testCaseAttempt.stepResults[testStep.id],
            });
        });
    }
    getTestStep({ isBeforeHook, gherkinStepMap, pickleStepMap, testStep, testStepAttachments, testStepResult, }) {
        const data = {};
        if (testStep.pickleStepId) {
            const pickleStep = pickleStepMap[testStep.pickleStepId];
            data.keyword = (0, PickleParser_1.getStepKeyword)({ pickleStep, gherkinStepMap });
            data.line = gherkinStepMap[pickleStep.astNodeIds[0]].location.line;
            data.name = pickleStep.text;
        }
        else {
            data.keyword = isBeforeHook ? 'Before' : 'After';
            data.hidden = true;
        }
        data.result = testStepResult;
        data.time = testStepResult.duration ? this.durationToSeconds(testStepResult.duration) : 0;
        data.attachments = testStepAttachments;
        return data;
    }
    getTestCaseResult(steps) {
        const { status, message, exception } = (0, messages_1.getWorstTestStepResult)(steps.map((step) => step.result));
        return {
            status,
            failure: message || exception
                ? {
                    type: exception?.type || '',
                    message: exception?.message,
                    detail: message || '',
                }
                : undefined,
        };
    }
    durationToSeconds(duration) {
        const NANOS_IN_SECOND = 1_000_000_000;
        return (duration.seconds * NANOS_IN_SECOND + duration.nanos) / NANOS_IN_SECOND;
    }
    nameOrDefault(name, fallbackSuffix) {
        if (!name) {
            return `(unnamed ${fallbackSuffix})`;
        }
        return name;
    }
    getTestCaseName(featureName, rule, pickle) {
        const pickleName = this.nameOrDefault(pickle.name, 'scenario');
        const testCaseName = [
            featureName,
            rule ? this.nameOrDefault(rule.name, 'rule') : '',
            pickleName,
        ]
            .filter(Boolean)
            .join(Projects_1.TITLE_SEPARATOR);
        if (!this.names[featureName]) {
            this.names[featureName] = [];
        }
        let index = 0;
        while (this.names[featureName].includes(index > 0 ? `${testCaseName} [${index}]` : testCaseName)) {
            index++;
        }
        const name = index > 0 ? `${testCaseName} [${index}]` : testCaseName;
        this.names[featureName].push(name);
        return name;
    }
    formatTestSteps(steps) {
        return steps
            .filter((step) => !step.hidden)
            .map((step) => {
            const statusText = step.result.status.toLowerCase();
            const maxLength = 80 - statusText.length - 3;
            const stepText = `${step.keyword}${step.name}`
                .padEnd(maxLength, '.')
                .substring(0, maxLength);
            return `${stepText}...${statusText}`;
        })
            .join('\n');
    }
    onTestRunFinished() {
        const testCases = this.getTestCases();
        const tests = testCases.map((testCaseAttempt) => {
            const { gherkinDocument, pickle } = testCaseAttempt;
            const { feature } = gherkinDocument;
            if (!feature) {
                throw new Error(`Gherkin document without feature: ${gherkinDocument.uri}`);
            }
            const meta = GherkinDocument_1.GherkinDocumentMessage.extractMeta(gherkinDocument);
            const gherkinExampleRuleMap = (0, GherkinDocumentParser_1.getGherkinExampleRuleMap)(gherkinDocument);
            const rule = gherkinExampleRuleMap[pickle.astNodeIds[0]];
            const gherkinStepMap = (0, GherkinDocumentParser_1.getGherkinStepMap)(gherkinDocument);
            const pickleStepMap = (0, PickleParser_1.getPickleStepMap)(pickle);
            const steps = this.getTestSteps(testCaseAttempt, gherkinStepMap, pickleStepMap);
            const stepDuration = steps.reduce((total, step) => total + (step.time || 0), 0);
            const featureName = this.nameOrDefault(feature.name, 'feature');
            const featureNameWithProject = (0, Projects_1.getFeatureNameWithProject)(meta.projectName, featureName);
            return {
                classname: featureName,
                // always add project to testcase name
                // see: https://github.com/microsoft/playwright/issues/23432
                name: this.getTestCaseName(featureNameWithProject, rule, pickle),
                time: stepDuration,
                result: this.getTestCaseResult(steps),
                systemOutput: this.formatTestSteps(steps),
                steps,
            };
        });
        const passed = tests.filter((item) => item.result.status === messages_1.TestStepResultStatus.PASSED).length;
        const skipped = tests.filter((item) => item.result.status === messages_1.TestStepResultStatus.SKIPPED).length;
        const failures = tests.length - passed - skipped;
        const testSuite = {
            name: this.suiteName,
            tests,
            failures,
            skipped,
            time: tests.reduce((total, test) => total + test.time, 0),
        };
        this.outputStream.write(this.buildXmlReport(testSuite));
    }
    buildXmlReport(testSuite) {
        const xmlReport = xmlbuilder_1.default
            .create('testsuite', { encoding: 'UTF-8', invalidCharReplacement: '' })
            .att('failures', testSuite.failures)
            .att('skipped', testSuite.skipped)
            .att('name', testSuite.name)
            .att('time', testSuite.time)
            .att('tests', testSuite.tests.length);
        testSuite.tests.forEach((test) => {
            const xmlTestCase = xmlReport.ele('testcase', {
                classname: test.classname,
                name: test.name,
                time: test.time,
            });
            if (test.result.status === messages_1.TestStepResultStatus.SKIPPED) {
                xmlTestCase.ele('skipped');
            }
            else if (test.result.status !== messages_1.TestStepResultStatus.PASSED) {
                const xmlFailure = xmlTestCase.ele('failure', {
                    type: test.result.failure?.type,
                    message: test.result.failure?.message,
                });
                if (test.result?.failure) {
                    xmlFailure.cdata(test.result.failure.detail);
                }
            }
            xmlTestCase.ele('system-out', {}).cdata(test.systemOutput);
        });
        return xmlReport.end({ pretty: true });
    }
}
exports.default = JunitReporter;
//# sourceMappingURL=junit.js.map