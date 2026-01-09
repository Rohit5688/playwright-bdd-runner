import parseTagsExpression from '@cucumber/tag-expressions';
type TagString = string | undefined;
export type TagsExpression = ReturnType<typeof parseTagsExpression>;
/**
 * Combines several tags strings and build tags expression.
 */
export declare function buildTagsExpression(tagStrings: TagString[]): TagsExpression | undefined;
/**
 * Extracts all '@'-prefixed tags from a given file path.
 *
 * Example:
 * 'features/@foo-bar/@baz.ts' -> ['@foo-bar', '@baz']
 */
export declare function extractTagsFromPath(filePath: string): string[];
export {};
//# sourceMappingURL=tags.d.ts.map