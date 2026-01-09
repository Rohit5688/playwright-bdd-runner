/**
 * Manage hooks for test file.
 *
 * For worker hooks we generate test.beforeAll() / test.afterAll() that call $runWorkerFixture
 * and pass all needed fixtures to it.
 *
 * For scenario hooks we generate test.beforeEach() / test.afterEach()
 * that just reference $beforeEach/$afterEach fixtures,
 * to get them executed during fixtures setup and call scenario hooks.
 * Additionally, we generate all scenario-hooks used fixtures in $beforeEachFixtures/$afterEachFixtures.
 * The approach is different for beforeAll/afterAll.
 * If we follow the same approach and call scenario hooks directly inside test.beforeEach,
 * them in case of error in hook, Playwright will execute Background steps.
 * See: https://github.com/microsoft/playwright/issues/33314
 */
import { ScenarioHookType } from '../hooks/scenario';
import { Formatter } from './formatter';
import { TestGen } from './test';
export declare class TestFileHooks {
    private formatter;
    private beforeAll;
    private afterAll;
    before: ScenarioHooks<"before">;
    after: ScenarioHooks<"after">;
    constructor(formatter: Formatter);
    fillFromTests(tests: TestGen[]): void;
    getCustomTestInstances(): Set<import("../playwright/types").TestTypeCommon>;
    getWorldFixtureNames(): Set<string>;
    render(): string[];
}
declare class ScenarioHooks<T extends ScenarioHookType> {
    private type;
    private formatter;
    private hooks;
    constructor(type: T, formatter: Formatter);
    registerHooksForTest(test: TestGen): void;
    getCustomTestInstances(): Set<import("../playwright/types").TestTypeCommon>;
    render(): string[];
    getFixtureNames(): string[];
    getWorldFixtureNames(): Set<string>;
}
export {};
//# sourceMappingURL=hooks.d.ts.map