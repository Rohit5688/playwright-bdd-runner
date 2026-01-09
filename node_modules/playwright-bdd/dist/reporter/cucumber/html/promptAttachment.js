"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptCopyPrompt = void 0;
exports.createPromptAttachmentWithButton = createPromptAttachmentWithButton;
/**
 * Extra attachment with button that copies prompt to clipboard.
 */
const utils_1 = require("../../../utils");
const helpers_1 = require("../attachments/helpers");
function createPromptAttachmentWithButton(testCaseStartedId, testStepId, prompt) {
    const html = createPromptAttachmentHtml(prompt);
    return (0, helpers_1.createLogAttachment)(testCaseStartedId, testStepId, html);
}
function createPromptAttachmentHtml(prompt) {
    const escapedPrompt = (0, utils_1.escapeHtml)(JSON.stringify(prompt));
    return [
        `<button data-custom-html style="width: 100px" onclick='copyPrompt(this, ${escapedPrompt})'>Copy prompt</button>`,
        `<a href="https://chatgpt.com/" target="_blank">Open ChatGPT</a>`,
    ].join(' | ');
}
/**
 * Custom script - setup "Copy prompt" button click handlers.
 */
exports.scriptCopyPrompt = `
<script>
function copyPrompt(button, prompt) {
  var originalText = button.textContent;
  if (originalText === 'Copied') return;
  navigator.clipboard.writeText(prompt).then(() => {
    button.textContent = 'Copied';
    setTimeout(() => button.textContent = originalText, 2000);
  });
}
</script>
`;
//# sourceMappingURL=promptAttachment.js.map