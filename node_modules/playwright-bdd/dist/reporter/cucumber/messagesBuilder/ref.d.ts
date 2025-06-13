/**
 * Returns reference to a messagesBuilder singleton instance.
 * We pass onTestEnd and onEnd calls only for the first reference (reporter),
 * otherwise all events will be duplicated.
 */
import * as pw from '@playwright/test/reporter';
import { MessagesBuilder } from '.';
export type MessagesBuilderRef = ReturnType<typeof getMessagesBuilderRef>;
export declare function getMessagesBuilderRef(): {
    builder: MessagesBuilder;
    onBegin(config: pw.FullConfig): void;
    onTestEnd(test: pw.TestCase, result: pw.TestResult): void;
    onEnd(fullResult: pw.FullResult): void;
    onError(error: pw.TestError): void;
};
//# sourceMappingURL=ref.d.ts.map