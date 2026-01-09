/**
 * Based on: https://github.com/cucumber/cucumber-js/blob/main/src/value_checker.ts
 */
export declare function doesHaveValue<T>(value: T): value is NonNullable<T>;
export declare function doesNotHaveValue<T>(value: T): value is Extract<T, null | undefined>;
export declare function valueOrDefault<T>(value: T | undefined, defaultValue: T): T;
//# sourceMappingURL=valueChecker.d.ts.map