import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export interface QueueItem {
  id: string;
  type: 'feature' | 'scenario' | 'example';
  name: string;
  command: string;
  testItem?: vscode.TestItem;
  priority: number;
  addedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: {
    success: boolean;
    duration: number;
    output: string;
    error?: string;
  };
}

export interface QueueProgress {
  total: number;
  completed: number;
  running: number;
  pending: number;
  failed: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export class TestQueueManager extends EventEmitter {
  private queue: QueueItem[] = [];
  private running: Map<string, QueueItem> = new Map();
  private maxConcurrent: number = 1;
  private outputChannel: vscode.OutputChannel;
  private progressReporter?: vscode.Progress<{ message?: string; increment?: number }>;
  private currentToken?: vscode.CancellationToken;

  constructor(outputChannel: vscode.OutputChannel, maxConcurrent: number = 1) {
    super();
    this.outputChannel = outputChannel;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add items to the execution queue
   */
  addToQueue(items: Omit<QueueItem, 'id' | 'addedAt' | 'status'>[]): void {
    const newItems = items.map(item => ({
      ...item,
      id: this.generateId(),
      addedAt: new Date(),
      status: 'pending' as const
    }));

    // Sort by priority (higher priority first)
    newItems.sort((a, b) => b.priority - a.priority);
    
    this.queue.push(...newItems);
    
    this.outputChannel.appendLine(`📋 Added ${newItems.length} items to execution queue`);
    this.emit('queueUpdated', this.getProgress());
    
    // Start processing if not already running
    this.processQueue();
  }

  /**
   * Start queue processing with progress tracking
   */
  async startWithProgress(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<void> {
    this.progressReporter = progress;
    this.currentToken = token;

    // Handle cancellation
    token.onCancellationRequested(() => {
      this.cancelAll();
    });

    this.outputChannel.appendLine('🚀 Starting queue execution with progress tracking...');
    this.emit('queueStarted');
    
    return this.processQueue();
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      if (this.currentToken?.isCancellationRequested) {
        break;
      }

      const item = this.queue.shift();
      if (!item) continue;

      await this.executeItem(item);
    }

    // Check if queue is complete
    if (this.queue.length === 0 && this.running.size === 0) {
      this.onQueueComplete();
    }
  }

  /**
   * Execute a single queue item
   */
  private async executeItem(item: QueueItem): Promise<void> {
    item.status = 'running';
    item.startedAt = new Date();
    this.running.set(item.id, item);

    this.outputChannel.appendLine(`▶️ Executing: ${item.name}`);
    this.updateProgress(`Running: ${item.name}`);
    this.emit('itemStarted', item);

    try {
      const result = await this.runCommand(item.command);
      
      item.status = 'completed';
      item.completedAt = new Date();
      item.result = {
        success: result.success,
        duration: Date.now() - (item.startedAt?.getTime() || 0),
        output: result.output,
        error: result.error
      };

      this.outputChannel.appendLine(`✅ Completed: ${item.name} (${item.result.duration}ms)`);
      
    } catch (error) {
      item.status = 'failed';
      item.completedAt = new Date();
      item.result = {
        success: false,
        duration: Date.now() - (item.startedAt?.getTime() || 0),
        output: '',
        error: error instanceof Error ? error.message : String(error)
      };

      this.outputChannel.appendLine(`❌ Failed: ${item.name} - ${item.result.error}`);
    }

    this.running.delete(item.id);
    this.emit('itemCompleted', item);
    this.emit('queueUpdated', this.getProgress());

    // Continue processing
    this.processQueue();
  }

  /**
   * Run a command (placeholder - integrate with existing BDD runner)
   */
  private async runCommand(command: string): Promise<{ success: boolean; output: string; error?: string }> {
    // This would integrate with the existing bddRunner
    // For now, simulate execution
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate for simulation
        resolve({
          success,
          output: success ? 'Test passed' : 'Test failed',
          error: success ? undefined : 'Simulated test failure'
        });
      }, Math.random() * 2000 + 500); // 500ms to 2.5s execution time
    });
  }

  /**
   * Update progress reporter
   */
  private updateProgress(message: string): void {
    if (this.progressReporter) {
      const progress = this.getProgress();
      this.progressReporter.report({
        message: `${message} (${progress.completed}/${progress.total})`,
        increment: progress.percentage
      });
    }
  }

  /**
   * Get current queue progress
   */
  getProgress(): QueueProgress {
    const completed = this.getCompletedItems().length;
    const running = this.running.size;
    const pending = this.queue.length;
    const failed = this.getFailedItems().length;
    const total = completed + running + pending;

    const progress: QueueProgress = {
      total,
      completed,
      running,
      pending,
      failed,
      percentage: total > 0 ? (completed / total) * 100 : 0
    };

    // Estimate time remaining based on average execution time
    if (running > 0 || pending > 0) {
      const completedItems = this.getCompletedItems();
      if (completedItems.length > 0) {
        const avgDuration = completedItems.reduce((sum, item) => 
          sum + (item.result?.duration || 0), 0) / completedItems.length;
        
        progress.estimatedTimeRemaining = Math.round(
          (pending + running) * avgDuration / Math.max(1, this.maxConcurrent)
        );
      }
    }

    return progress;
  }

  /**
   * Get all items (completed and running)
   */
  getAllItems(): QueueItem[] {
    return [
      ...Array.from(this.running.values()),
      ...this.getCompletedItems(),
      ...this.queue
    ];
  }

  /**
   * Get completed items
   */
  private getCompletedItems(): QueueItem[] {
    // In a real implementation, this would be stored separately
    // For now, we'll track completed items in a separate array
    return this.completedItems || [];
  }

  private completedItems: QueueItem[] = [];

  /**
   * Get failed items
   */
  getFailedItems(): QueueItem[] {
    return this.getCompletedItems().filter(item => !item.result?.success);
  }

  /**
   * Cancel all queued and running items
   */
  cancelAll(): void {
    this.outputChannel.appendLine('🛑 Cancelling all queue items...');
    
    // Cancel pending items
    this.queue.forEach(item => {
      item.status = 'cancelled';
      item.completedAt = new Date();
    });
    this.queue = [];

    // Cancel running items (in real implementation, would terminate processes)
    this.running.forEach(item => {
      item.status = 'cancelled';
      item.completedAt = new Date();
      this.completedItems.push(item);
    });
    this.running.clear();

    this.emit('queueCancelled');
    this.emit('queueUpdated', this.getProgress());
  }

  /**
   * Pause queue execution
   */
  pause(): void {
    this.outputChannel.appendLine('⏸️ Queue execution paused');
    this.emit('queuePaused');
  }

  /**
   * Resume queue execution
   */
  resume(): void {
    this.outputChannel.appendLine('▶️ Queue execution resumed');
    this.emit('queueResumed');
    this.processQueue();
  }

  /**
   * Clear completed items
   */
  clearCompleted(): void {
    this.completedItems = [];
    this.outputChannel.appendLine('🧹 Cleared completed items');
    this.emit('queueUpdated', this.getProgress());
  }

  /**
   * Retry failed items
   */
  retryFailed(): void {
    const failedItems = this.getFailedItems();
    if (failedItems.length === 0) {
      this.outputChannel.appendLine('ℹ️ No failed items to retry');
      return;
    }

    const retryItems = failedItems.map(item => ({
      type: item.type,
      name: `${item.name} (retry)`,
      command: item.command,
      testItem: item.testItem,
      priority: item.priority + 1 // Higher priority for retries
    }));

    this.addToQueue(retryItems);
    this.outputChannel.appendLine(`🔄 Added ${retryItems.length} failed items for retry`);
  }

  /**
   * Set maximum concurrent executions
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    this.outputChannel.appendLine(`⚙️ Max concurrent executions set to ${this.maxConcurrent}`);
    
    // Continue processing if we can now run more items
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Get queue statistics
   */
  getStatistics(): {
    totalExecuted: number;
    successRate: number;
    averageDuration: number;
    fastestExecution: number;
    slowestExecution: number;
  } {
    const completed = this.getCompletedItems();
    const successful = completed.filter(item => item.result?.success);
    const durations = completed
      .map(item => item.result?.duration || 0)
      .filter(d => d > 0);

    return {
      totalExecuted: completed.length,
      successRate: completed.length > 0 ? (successful.length / completed.length) * 100 : 0,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      fastestExecution: durations.length > 0 ? Math.min(...durations) : 0,
      slowestExecution: durations.length > 0 ? Math.max(...durations) : 0
    };
  }

  /**
   * Export queue results for reporting
   */
  exportResults(): string {
    const items = this.getAllItems();
    const stats = this.getStatistics();
    
    const report = [
      `# Test Execution Queue Report - ${new Date().toISOString()}`,
      '',
      `## Summary`,
      `- Total Items: ${items.length}`,
      `- Success Rate: ${stats.successRate.toFixed(2)}%`,
      `- Average Duration: ${stats.averageDuration.toFixed(0)}ms`,
      `- Fastest: ${stats.fastestExecution}ms`,
      `- Slowest: ${stats.slowestExecution}ms`,
      '',
      `## Items`,
      ''
    ];

    items.forEach((item, index) => {
      const duration = item.result?.duration ? `${item.result.duration}ms` : 'N/A';
      const status = item.status.toUpperCase();
      report.push(`${index + 1}. **${status}**: ${item.name} (${duration})`);
      
      if (item.result?.error) {
        report.push(`   Error: ${item.result.error}`);
      }
      report.push('');
    });

    return report.join('\n');
  }

  /**
   * Handle queue completion
   */
  private onQueueComplete(): void {
    const stats = this.getStatistics();
    this.outputChannel.appendLine(`\n🎉 Queue execution completed!`);
    this.outputChannel.appendLine(`   Total: ${stats.totalExecuted}`);
    this.outputChannel.appendLine(`   Success Rate: ${stats.successRate.toFixed(2)}%`);
    this.outputChannel.appendLine(`   Average Duration: ${stats.averageDuration.toFixed(0)}ms`);
    
    this.emit('queueCompleted', stats);
    
    if (this.progressReporter) {
      this.progressReporter.report({ 
        message: `Completed ${stats.totalExecuted} tests (${stats.successRate.toFixed(1)}% success)`,
        increment: 100 
      });
    }
  }

  /**
   * Generate unique ID for queue items
   */
  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
