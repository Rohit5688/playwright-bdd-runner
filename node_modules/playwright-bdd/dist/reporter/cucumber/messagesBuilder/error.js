"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildErrorMessage = buildErrorMessage;
exports.buildException = buildException;
const stripAnsiEscapes_1 = require("../../../utils/stripAnsiEscapes");
function buildErrorMessage(error) {
    return (0, stripAnsiEscapes_1.stripAnsiEscapes)([error.message, error.snippet].filter(Boolean).join('\n'));
}
function buildException(error) {
    return {
        type: 'Error',
        message: buildErrorMessage(error),
        // todo: extract only trace?
        stackTrace: error.stack ? extractStackTrace((0, stripAnsiEscapes_1.stripAnsiEscapes)(error.stack)) : undefined,
    };
}
function extractStackTrace(errorStack) {
    return errorStack
        .split('\n')
        .filter((line) => line.match(/^\s+at .*/))
        .join('\n');
}
//# sourceMappingURL=error.js.map