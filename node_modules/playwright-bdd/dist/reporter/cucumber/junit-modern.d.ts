/**
 * New Junit reporter, uses separate package @cucumber/junit-xml-formatter.
 *
 * See: https://github.com/cucumber/junit-xml-formatter
 * See: https://github.com/cucumber/cucumber-js/pull/2445
 * See: https://github.com/cucumber/cucumber-js/blob/main/src/plugin/plugin_manager.ts#L41
 */
import BaseReporter, { InternalOptions } from './base';
type JunitReporterOptions = {
    outputFile?: string;
    suiteName?: string;
};
export default class JunitReporter extends BaseReporter {
    protected userOptions: JunitReporterOptions;
    constructor(internalOptions: InternalOptions, userOptions?: JunitReporterOptions);
    init(): Promise<void>;
}
export {};
//# sourceMappingURL=junit-modern.d.ts.map