"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Custom Cucumber reporter.
 * See: https://github.com/cucumber/cucumber-js/blob/main/docs/custom_formatters.md
 */
const base_1 = __importDefault(require("./base"));
const getColorFns_1 = __importDefault(require("../../cucumber/formatter/getColorFns"));
const requireOrImport_1 = require("../../playwright/requireOrImport");
class CustomReporter extends base_1.default {
    constructor(internalOptions, reporterPathOrModule, userOptions = {}) {
        super(internalOptions);
        this.reporterPathOrModule = reporterPathOrModule;
        this.userOptions = userOptions;
        this.setOutputStream(this.userOptions.outputFile);
    }
    printsToStdio() {
        // currently always return true, b/c loading of custom reporter is async,
        // but printsToStdio() is called synchronously at the beginning.
        return true;
    }
    async init() {
        const formatterOptions = this.buildFormatterOptions();
        const FormatterConstructor = await this.loadFormatterFromFile();
        this.formatter = new FormatterConstructor(formatterOptions);
    }
    async finished() {
        await this.formatter?.finished();
        await super.finished();
    }
    async loadFormatterFromFile() {
        // see: https://github.com/microsoft/playwright/blob/main/packages/playwright/src/common/config.ts#L225
        const reporterPath = require.resolve(this.reporterPathOrModule, {
            paths: [this.internalOptions.cwd],
        });
        return (0, requireOrImport_1.requireOrImportDefaultFunction)(reporterPath, true);
    }
    buildFormatterOptions() {
        const colorFns = (0, getColorFns_1.default)(this.outputStream, process.env, this.userOptions.colorsEnabled);
        return {
            cwd: this.internalOptions.cwd,
            eventBroadcaster: this.eventBroadcaster,
            eventDataCollector: this.eventDataCollector,
            parsedArgvOptions: this.userOptions,
            colorFns,
            stream: this.outputStream,
            log: this.outputStream.write.bind(this.outputStream),
            cleanup: async () => { },
            snippetBuilder: null,
            // Build truncated supportCodeLibrary object. It can lead to errors in custom reporters.
            // For full object see:
            // https://github.com/cucumber/cucumber-js/blob/main/src/support_code_library_builder/types.ts#L160
            supportCodeLibrary: {
                World: {},
            },
        };
    }
}
exports.default = CustomReporter;
//# sourceMappingURL=custom.js.map