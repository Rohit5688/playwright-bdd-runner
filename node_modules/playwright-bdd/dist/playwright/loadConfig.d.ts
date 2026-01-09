export declare function loadConfig(cliConfigPath?: string): Promise<{
    resolvedConfigFile: string;
}>;
/**
 * Returns Playwright config dir considering cli --config option.
 * Note: This fn must be called only in main process, because in workers
 * process.argv is different.
 */
export declare function resolveConfigDir(): string;
export declare function resolveConfigFile(cliConfigPath?: string): string;
//# sourceMappingURL=loadConfig.d.ts.map