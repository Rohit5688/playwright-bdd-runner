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
exports.TestStepAttachments = void 0;
const messages = __importStar(require("@cucumber/messages"));
class TestStepAttachments {
    constructor(testCaseRun, testStep, pwStep) {
        this.testCaseRun = testCaseRun;
        this.testStep = testStep;
        this.pwStep = pwStep;
    }
    buildMessages() {
        if (!this.pwStep)
            return [];
        return this.testCaseRun.attachmentMapper
            .getStepAttachments(this.pwStep)
            .map((pwAttachment) => this.buildAttachmentMessage(pwAttachment));
    }
    buildAttachmentMessage(pwAttachment) {
        const attachment = {
            testCaseStartedId: this.testCaseRun.id,
            testStepId: this.testStep.id,
            mediaType: pwAttachment.contentType,
            fileName: pwAttachment.name,
            body: '',
            contentEncoding: messages.AttachmentContentEncoding.IDENTITY,
            // For attachments from global hooks (BeforeAll / AfterAll)
            // cucumber added 'testRunStartedId' field to associate attachment with test run.
            // This is not finalized yet, see: https://github.com/cucumber/cucumber-js/issues/1394
            // Playwright does not allow to attach files in global hooks,
            // b/c there is not testInfo.attach().
        };
        if (pwAttachment.path) {
            // For in-memory messages store absolute path in 'url' field.
            // In reporters we will replace it with relative path
            // or read attachment content and delete 'url' field.
            attachment.url = pwAttachment.path;
        }
        else if (pwAttachment.body) {
            // for now always attach as base64
            // todo: for text/plain and application/json use raw to save some bytes
            attachment.body = pwAttachment.body.toString('base64');
            attachment.contentEncoding = messages.AttachmentContentEncoding.BASE64;
        }
        else {
            throw new Error(`Playwright attachment without path and body`);
        }
        return { attachment };
    }
}
exports.TestStepAttachments = TestStepAttachments;
//# sourceMappingURL=TestStepAttachments.js.map