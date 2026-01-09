"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestStepRun = void 0;
const messages = __importStar(require("@cucumber/messages"));
const timing_1 = require("./timing");
const TestStepAttachments_1 = require("./TestStepAttachments");
const pwStepUtils_1 = require("./pwStepUtils");
const error_1 = require("./error");
/**
 * Run of messages.TestStep from hook or scenario.
 */
class TestStepRun {
    constructor(testCaseRun, testStep, pwStep) {
        this.testCaseRun = testCaseRun;
        this.testStep = testStep;
        this.pwStep = pwStep;
    }
    buildMessages() {
        const stepAttachments = new TestStepAttachments_1.TestStepAttachments(this.testCaseRun, this.testStep, this.pwStep);
        return [
            this.buildTestStepStarted(), // prettier-ignore
            ...stepAttachments.buildMessages(),
            this.buildTestStepFinished(),
        ];
    }
    isHook() {
        return Boolean(this.testStep.hookId);
    }
    wasExecuted() {
        return Boolean(this.pwStep);
    }
    get startTime() {
        return this.wasExecuted() ? this.pwStep.startTime : this.testCaseRun.result.startTime;
    }
    get duration() {
        return this.wasExecuted() ? this.pwStep.duration : 0;
    }
    buildTestStepStarted() {
        const testStepStarted = {
            testCaseStartedId: this.testCaseRun.id,
            testStepId: this.testStep.id,
            timestamp: (0, timing_1.toCucumberTimestamp)(this.startTime.getTime()),
        };
        return { testStepStarted };
    }
    buildTestStepFinished() {
        const error = this.getStepError();
        const status = this.getStatus(error);
        const testStepFinished = {
            testCaseStartedId: this.testCaseRun.id,
            testStepId: this.testStep.id,
            testStepResult: {
                duration: messages.TimeConversion.millisecondsToDuration(this.duration),
                status,
                // 'message' is deprecated since cucumber 10.4 in favor of 'exception' field
                // But we keep both for compatibility with other reporters.
                // See: https://github.com/cucumber/react-components/pull/345
                message: isStepFailed(status) && error ? (0, error_1.buildErrorMessage)(error) : undefined,
                exception: isStepFailed(status) && error ? (0, error_1.buildException)(error) : undefined,
            },
            timestamp: (0, timing_1.toCucumberTimestamp)(this.startTime.getTime() + this.duration),
        };
        return { testStepFinished };
    }
    getStatus(error) {
        switch (true) {
            // When calling test.skip(), it actually throws an error
            case (0, pwStepUtils_1.isSkippedError)(error):
                return messages.TestStepResultStatus.SKIPPED;
            case Boolean(error):
                return messages.TestStepResultStatus.FAILED;
            // For hooks that were not executed we return PASSED, not SKIPPED.
            // Because these hooks can be from another run attempt of this testCase.
            // If marked as skipped, the whole run is marked as skipped in reporter.
            case !this.isHook() && !this.wasExecuted():
                return messages.TestStepResultStatus.SKIPPED;
            default:
                return messages.TestStepResultStatus.PASSED;
        }
    }
    getStepError() {
        if (this.pwStep) {
            return this.testCaseRun.getStepError(this.pwStep);
        }
    }
}
exports.TestStepRun = TestStepRun;
function isStepFailed(status) {
    return status === messages.TestStepResultStatus.FAILED;
}
//# sourceMappingURL=TestStepRun.js.map