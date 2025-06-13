/**
 * Cucumber junit reporter.
 * Based on: https://github.com/cucumber/cucumber-js/blob/main/src/formatter/junit_formatter.ts
 * Junit spec(ish): https://github.com/testmoapp/junitxml
 * See also: https://github.com/cucumber/cucumber-junit-xml-formatter
 * See also: https://github.com/microsoft/playwright/blob/main/packages/playwright/src/reporters/junit.ts
 */
import BaseReporter, { InternalOptions } from './base';
type JunitReporterOptions = {
    outputFile?: string;
    suiteName?: string;
};
export default class JunitReporter extends BaseReporter {
    protected userOptions: JunitReporterOptions;
    private readonly names;
    constructor(internalOptions: InternalOptions, userOptions?: JunitReporterOptions);
    get suiteName(): string;
    private getTestCases;
    private getTestSteps;
    private getTestStep;
    private getTestCaseResult;
    private durationToSeconds;
    private nameOrDefault;
    private getTestCaseName;
    private formatTestSteps;
    private onTestRunFinished;
    private buildXmlReport;
}
export {};
//# sourceMappingURL=junit.d.ts.map