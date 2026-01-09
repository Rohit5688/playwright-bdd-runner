/**
 * Creating Cucumber errors from Playwright errors.
 */
import * as pw from '@playwright/test/reporter';
import * as messages from '@cucumber/messages';
export declare function buildErrorMessage(error: pw.TestError): string;
export declare function buildException(error: pw.TestError): messages.Exception;
//# sourceMappingURL=error.d.ts.map