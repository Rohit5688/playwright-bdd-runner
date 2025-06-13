"use strict";
/**
 * Returns reference to a messagesBuilder singleton instance.
 * We pass onTestEnd and onEnd calls only for the first reference (reporter),
 * otherwise all events will be duplicated.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessagesBuilderRef = getMessagesBuilderRef;
const _1 = require(".");
let instance;
let referenceCount = 0;
function getMessagesBuilderRef() {
    if (!instance)
        instance = new _1.MessagesBuilder();
    const isFirstRef = ++referenceCount === 1;
    return {
        builder: instance,
        onBegin(config) {
            if (isFirstRef)
                this.builder.onBegin(config);
        },
        onTestEnd(test, result) {
            if (isFirstRef)
                this.builder.onTestEnd(test, result);
        },
        onEnd(fullResult) {
            if (isFirstRef)
                this.builder.onEnd(fullResult);
        },
        onError(error) {
            if (isFirstRef)
                this.builder.onError(error);
        },
    };
}
//# sourceMappingURL=ref.js.map