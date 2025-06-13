"use strict";
/**
 * New Junit reporter, uses separate package @cucumber/junit-xml-formatter.
 *
 * See: https://github.com/cucumber/junit-xml-formatter
 * See: https://github.com/cucumber/cucumber-js/pull/2445
 * See: https://github.com/cucumber/cucumber-js/blob/main/src/plugin/plugin_manager.ts#L41
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
const GherkinDocument_1 = require("./messagesBuilder/GherkinDocument");
class JunitReporter extends base_1.default {
    constructor(internalOptions, userOptions = {}) {
        super(internalOptions);
        this.userOptions = userOptions;
        this.setOutputStream(this.userOptions.outputFile);
    }
    async init() {
        const { default: junitFormatterPlugin } = await import('@cucumber/junit-xml-formatter');
        junitFormatterPlugin.formatter({
            options: { suiteName: this.userOptions.suiteName },
            on: (_, handler) => this.eventBroadcaster.on('envelope', (envelope) => {
                if (envelope.gherkinDocument) {
                    // Add project and feature name to testcase name.
                    // See: https://github.com/microsoft/playwright/issues/23432
                    // Todo: https://github.com/cucumber/junit-xml-formatter/issues/74
                    envelope = { gherkinDocument: addPrefixToNames(envelope.gherkinDocument) };
                }
                handler(envelope);
            }),
            write: (data) => this.outputStream.write(data),
        });
    }
}
exports.default = JunitReporter;
function addPrefixToNames(gherkinDocument) {
    const meta = GherkinDocument_1.GherkinDocumentMessage.extractMeta(gherkinDocument);
    const gherkinDocumentClone = JSON.parse(JSON.stringify(gherkinDocument));
    const buildPrefixedName = (name) => [meta.projectName, gherkinDocumentClone?.feature?.name, name].filter(Boolean).join(' - ');
    gherkinDocumentClone.feature?.children.forEach((child) => {
        if (child.rule)
            child.rule.name = buildPrefixedName(child.rule.name);
        if (child.scenario)
            child.scenario.name = buildPrefixedName(child.scenario.name);
    });
    return gherkinDocumentClone;
}
//# sourceMappingURL=junit-modern.js.map