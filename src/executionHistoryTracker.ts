import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface StepExecutionRecord {
    timestamp: string;
    result: 'success' | 'failure' | 'skipped';
    duration: number;
    feature?: string;
    scenario?: string;
    error?: string;
}

export interface StepHistory {
    stepText: string;
    totalRuns: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    lastRun: string;
    lastResult: 'success' | 'failure' | 'skipped';
    lastDuration: number;
    avgDuration: number;
    recentRuns: StepExecutionRecord[];
}

interface HistoryData {
    version: string;
    steps: { [stepText: string]: StepHistory };
}

export class ExecutionHistoryTracker {
    private history: HistoryData;
    private historyFile: string;
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private isDirty: boolean = false;
    private saveTimeout?: NodeJS.Timeout;
    private enabled: boolean = true;

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.history = {
            version: '1.0',
            steps: {}
        };

        // Store in workspace .vscode folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const vscodeFolder = path.join(workspaceFolder.uri.fsPath, '.vscode');
            this.historyFile = path.join(vscodeFolder, 'bdd-execution-history.json');
        } else {
            // Fallback to global storage
            this.historyFile = path.join(context.globalStorageUri.fsPath, 'execution-history.json');
        }
    }

    /**
     * Initialize the tracker by loading existing history
     */
    async initialize(): Promise<void> {
        const config = vscode.workspace.getConfiguration('playwrightBdd.executionHistory');
        this.enabled = config.get<boolean>('enabled', true);

        if (!this.enabled) {
            this.outputChannel.appendLine('[History] Execution history tracking is disabled');
            return;
        }

        try {
            await this.load();
            this.outputChannel.appendLine(`[History] Initialized with ${Object.keys(this.history.steps).length} tracked steps`);

            // Clean old entries
            await this.cleanOldEntries();

            // Setup auto-save
            this.setupAutoSave();
        } catch (error) {
            this.outputChannel.appendLine(`[History] Failed to initialize: ${error}`);
        }
    }

    /**
     * Load history from disk
     */
    private async load(): Promise<void> {
        try {
            if (fs.existsSync(this.historyFile)) {
                const data = fs.readFileSync(this.historyFile, 'utf8');
                this.history = JSON.parse(data);
                this.outputChannel.appendLine(`[History] Loaded from ${this.historyFile}`);
            } else {
                this.outputChannel.appendLine('[History] No existing history file, starting fresh');
            }
        } catch (error) {
            this.outputChannel.appendLine(`[History] Failed to load: ${error}`);
            // Start with empty history on error
            this.history = { version: '1.0', steps: {} };
        }
    }

    /**
     * Save history to disk (debounced)
     */
    private async save(): Promise<void> {
        if (!this.enabled || !this.isDirty) {
            return;
        }

        try {
            // Ensure directory exists
            const dir = path.dirname(this.historyFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write to file
            fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2), 'utf8');
            this.isDirty = false;
            this.outputChannel.appendLine('[History] Saved to disk');
        } catch (error) {
            this.outputChannel.appendLine(`[History] Failed to save: ${error}`);
        }
    }

    /**
     * Setup auto-save with debouncing
     */
    private setupAutoSave(): void {
        // Save on extension deactivation
        this.context.subscriptions.push({
            dispose: () => {
                if (this.saveTimeout) {
                    clearTimeout(this.saveTimeout);
                }
                // Synchronous save on dispose
                if (this.isDirty) {
                    try {
                        const dir = path.dirname(this.historyFile);
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true });
                        }
                        fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2), 'utf8');
                    } catch (error) {
                        // Ignore errors during disposal
                    }
                }
            }
        });
    }

    /**
     * Record a step execution
     */
    recordStepExecution(
        stepText: string,
        result: 'success' | 'failure' | 'skipped',
        duration: number,
        context?: { feature?: string; scenario?: string; error?: string }
    ): void {
        if (!this.enabled) {
            return;
        }

        const config = vscode.workspace.getConfiguration('playwrightBdd.executionHistory');
        const maxEntries = config.get<number>('maxEntriesPerStep', 10);

        // Get or create step history
        let stepHistory = this.history.steps[stepText];
        if (!stepHistory) {
            stepHistory = {
                stepText,
                totalRuns: 0,
                successCount: 0,
                failureCount: 0,
                skippedCount: 0,
                lastRun: new Date().toISOString(),
                lastResult: result,
                lastDuration: duration,
                avgDuration: duration,
                recentRuns: []
            };
            this.history.steps[stepText] = stepHistory;
        }

        // Update counters
        stepHistory.totalRuns++;
        if (result === 'success') {
            stepHistory.successCount++;
        } else if (result === 'failure') {
            stepHistory.failureCount++;
        } else {
            stepHistory.skippedCount++;
        }

        // Update last run info
        stepHistory.lastRun = new Date().toISOString();
        stepHistory.lastResult = result;
        stepHistory.lastDuration = duration;

        // Calculate average duration
        const totalDuration = stepHistory.recentRuns.reduce((sum, run) => sum + run.duration, 0) + duration;
        const count = stepHistory.recentRuns.length + 1;
        stepHistory.avgDuration = Math.round(totalDuration / count);

        // Add to recent runs
        const record: StepExecutionRecord = {
            timestamp: new Date().toISOString(),
            result,
            duration,
            feature: context?.feature,
            scenario: context?.scenario,
            error: context?.error
        };
        stepHistory.recentRuns.unshift(record);

        // Keep only max entries
        if (stepHistory.recentRuns.length > maxEntries) {
            stepHistory.recentRuns = stepHistory.recentRuns.slice(0, maxEntries);
        }

        // Mark as dirty and schedule save
        this.isDirty = true;
        this.scheduleSave();
    }

    /**
     * Schedule a save with debouncing
     */
    private scheduleSave(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.save();
        }, 2000); // Save 2 seconds after last change
    }

    /**
     * Get execution history for a specific step
     */
    getStepHistory(stepText: string): StepHistory | undefined {
        return this.history.steps[stepText];
    }

    /**
     * Get all step histories
     */
    getAllHistory(): StepHistory[] {
        return Object.values(this.history.steps);
    }

    /**
     * Get top executed steps
     */
    getTopSteps(limit: number = 10): StepHistory[] {
        return Object.values(this.history.steps)
            .sort((a, b) => b.totalRuns - a.totalRuns)
            .slice(0, limit);
    }

    /**
     * Get recently failed steps
     */
    getRecentlyFailedSteps(limit: number = 10): StepHistory[] {
        return Object.values(this.history.steps)
            .filter(step => step.lastResult === 'failure')
            .sort((a, b) => new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime())
            .slice(0, limit);
    }

    /**
     * Clean entries older than retention period
     */
    private async cleanOldEntries(): Promise<void> {
        const config = vscode.workspace.getConfiguration('playwrightBdd.executionHistory');
        const retentionDays = config.get<number>('retentionDays', 30);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        let cleaned = 0;
        for (const stepText in this.history.steps) {
            const step = this.history.steps[stepText];
            const lastRunDate = new Date(step.lastRun);

            if (lastRunDate < cutoffDate) {
                delete this.history.steps[stepText];
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.outputChannel.appendLine(`[History] Cleaned ${cleaned} old entries`);
            this.isDirty = true;
            await this.save();
        }
    }

    /**
     * Clear all history
     */
    async clearHistory(): Promise<void> {
        this.history.steps = {};
        this.isDirty = true;
        await this.save();
        this.outputChannel.appendLine('[History] Cleared all history');
    }

    /**
     * Export history as JSON
     */
    exportHistory(): string {
        return JSON.stringify(this.history, null, 2);
    }

    /**
     * Get statistics
     */
    getStatistics(): {
        totalSteps: number;
        totalRuns: number;
        totalSuccesses: number;
        totalFailures: number;
        avgSuccessRate: number;
    } {
        const steps = Object.values(this.history.steps);
        const totalSteps = steps.length;
        const totalRuns = steps.reduce((sum, s) => sum + s.totalRuns, 0);
        const totalSuccesses = steps.reduce((sum, s) => sum + s.successCount, 0);
        const totalFailures = steps.reduce((sum, s) => sum + s.failureCount, 0);
        const avgSuccessRate = totalRuns > 0 ? totalSuccesses / totalRuns : 0;

        return {
            totalSteps,
            totalRuns,
            totalSuccesses,
            totalFailures,
            avgSuccessRate
        };
    }
}
