export declare function createPromptAttachmentWithButton(testCaseStartedId: string | undefined, testStepId: string | undefined, prompt: string): {
    attachment: import("@cucumber/messages").Attachment;
};
/**
 * Custom script - setup "Copy prompt" button click handlers.
 */
export declare const scriptCopyPrompt = "\n<script>\nfunction copyPrompt(button, prompt) {\n  var originalText = button.textContent;\n  if (originalText === 'Copied') return;\n  navigator.clipboard.writeText(prompt).then(() => {\n    button.textContent = 'Copied';\n    setTimeout(() => button.textContent = originalText, 2000);\n  });\n}\n</script>\n";
//# sourceMappingURL=promptAttachment.d.ts.map