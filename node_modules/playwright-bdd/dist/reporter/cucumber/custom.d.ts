/**
 * Custom Cucumber reporter.
 * See: https://github.com/cucumber/cucumber-js/blob/main/docs/custom_formatters.md
 */
import BaseReporter, { InternalOptions } from './base';
import { IFormatterOptions } from '../../cucumber/formatter';
export type CustomReporterOptions = {
    colorsEnabled?: boolean;
    outputFile?: string;
    [k: string]: unknown;
};
export default class CustomReporter extends BaseReporter {
    protected reporterPathOrModule: string;
    protected userOptions: CustomReporterOptions;
    private formatter?;
    constructor(internalOptions: InternalOptions, reporterPathOrModule: string, userOptions?: CustomReporterOptions);
    printsToStdio(): boolean;
    init(): Promise<void>;
    finished(): Promise<void>;
    protected loadFormatterFromFile(): Promise<any>;
    protected buildFormatterOptions(): IFormatterOptions;
}
//# sourceMappingURL=custom.d.ts.map