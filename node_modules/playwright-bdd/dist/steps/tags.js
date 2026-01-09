"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTagsExpression = buildTagsExpression;
exports.extractTagsFromPath = extractTagsFromPath;
const tag_expressions_1 = __importDefault(require("@cucumber/tag-expressions"));
const utils_1 = require("../utils");
const node_path_1 = __importDefault(require("node:path"));
/**
 * Combines several tags strings and build tags expression.
 */
function buildTagsExpression(tagStrings) {
    tagStrings = (0, utils_1.removeDuplicates)(tagStrings.filter(Boolean));
    if (tagStrings.length === 0)
        return;
    const joinedTagString = tagStrings.map((tag) => `(${tag})`).join(' and ');
    return (0, tag_expressions_1.default)(joinedTagString);
}
/**
 * Extracts all '@'-prefixed tags from a given file path.
 *
 * Example:
 * 'features/@foo-bar/@baz.ts' -> ['@foo-bar', '@baz']
 */
function extractTagsFromPath(filePath) {
    const tags = [];
    // for filename take first part before dot to omit extension and sub-extension.
    const fileNamePart = node_path_1.default.basename(filePath).split('.')[0] || '';
    const dirParts = node_path_1.default.dirname(filePath).split(node_path_1.default.sep);
    [...dirParts, fileNamePart].forEach((part) => {
        // consider any @-prefixed symbols as tag
        const partTags = part.match(/@[^@\s]+/g) || [];
        tags.push(...partTags);
    });
    return tags;
}
//# sourceMappingURL=tags.js.map