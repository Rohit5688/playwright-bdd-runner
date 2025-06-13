"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamplesTitleBuilder = void 0;
const GherkinTemplate_1 = require("../utils/GherkinTemplate");
class ExamplesTitleBuilder {
    constructor(options) {
        this.options = options;
        this.exampleIndex = 0;
    }
    buildTitle(examples, exampleRow) {
        this.exampleIndex++;
        const titleTemplate = this.getTitleTemplate(examples);
        return this.fillTemplate(titleTemplate, examples, exampleRow);
    }
    getTitleTemplate(examples) {
        return (this.getTitleFromComment(examples) ||
            this.getTitleFromExamplesName(examples) ||
            this.getTitleFromScenarioName(examples) ||
            this.getTitleFromConfig() ||
            this.getDefaultTitle(examples));
    }
    fillTemplate(titleTemplate, examples, exampleRow) {
        const params = {
            _index_: this.exampleIndex,
        };
        exampleRow.cells.forEach((cell, index) => {
            const colName = examples.tableHeader?.cells[index]?.value;
            if (colName)
                params[colName] = cell.value;
        });
        return new GherkinTemplate_1.GherkinTemplate(titleTemplate).fill(params);
    }
    getTitleFromComment(examples) {
        const { gherkinDocument } = this.options;
        const { line } = examples.location;
        const titleFormatCommentLine = line - 1;
        const comment = gherkinDocument.comments.find((c) => {
            return c.location.line === titleFormatCommentLine;
        });
        const commentText = comment?.text?.trim();
        const prefix = '# title-format:';
        return commentText?.startsWith(prefix) ? commentText.replace(prefix, '').trim() : '';
    }
    /**
     * If Examples block is named with columns from Examples, use it as title format:
     * Examples: test user with <name> and <age>
     */
    getTitleFromExamplesName(examples) {
        return this.getTitleFromString(examples, examples.name);
    }
    /**
     * If scenario is named with columns from Examples, use it as title format:
     * Scenario: test user with <name> and <age>
     */
    getTitleFromScenarioName(examples) {
        return this.getTitleFromString(examples, this.options.scenario.name);
    }
    /**
     * Check if string can be an examples title template:
     * Contains at least one column name in <>.
     * E.g.: test user with <name> and <age>
     */
    getTitleFromString(examples, str = '') {
        const columns = new GherkinTemplate_1.GherkinTemplate(str).extractParams();
        const hasColumnsInStr = columns.length &&
            examples.tableHeader?.cells?.some((cell) => {
                return cell.value && columns.includes(cell.value);
            });
        return hasColumnsInStr ? str : '';
    }
    getTitleFromConfig() {
        return this.options.config.examplesTitleFormat;
    }
    getDefaultTitle(examples) {
        return this.options.isEnglish
            ? `Example #<_index_>` // for english use 'Example' not 'Examples', and without ':'
            : `${examples.keyword}: #<_index_>`;
    }
}
exports.ExamplesTitleBuilder = ExamplesTitleBuilder;
//# sourceMappingURL=examplesTitleBuilder.js.map