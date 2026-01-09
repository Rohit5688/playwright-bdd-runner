/**
 * Class to build examples title.
 */
import { Examples, Scenario, TableRow } from '@cucumber/messages';
import { GherkinDocumentWithPickles } from '../gherkin/types';
import { BDDConfig } from '../config/types';
type ExamplesTitleBuilderOptions = {
    config: BDDConfig;
    gherkinDocument: GherkinDocumentWithPickles;
    isEnglish: boolean;
    scenario: Scenario;
};
export declare class ExamplesTitleBuilder {
    private options;
    private exampleIndex;
    constructor(options: ExamplesTitleBuilderOptions);
    buildTitle(examples: Examples, exampleRow: TableRow): string;
    private getTitleTemplate;
    private fillTemplate;
    private getTitleFromComment;
    /**
     * If Examples block is named with columns from Examples, use it as title format:
     * Examples: test user with <name> and <age>
     */
    private getTitleFromExamplesName;
    /**
     * If scenario is named with columns from Examples, use it as title format:
     * Scenario: test user with <name> and <age>
     */
    private getTitleFromScenarioName;
    /**
     * Check if string can be an examples title template:
     * Contains at least one column name in <>.
     * E.g.: test user with <name> and <age>
     */
    private getTitleFromString;
    private getTitleFromConfig;
    private getDefaultTitle;
}
export {};
//# sourceMappingURL=examplesTitleBuilder.d.ts.map