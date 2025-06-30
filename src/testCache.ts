import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface CachedTestItem {
  id: string;
  label: string;
  uri: string;
  lastModified: number;
  scenarios: Array<{
    id: string;
    label: string;
    examples?: Array<{ id: string; label: string }>;
  }>;
}

export interface TestCache {
  version: string;
  features: Map<string, CachedTestItem>;
  lastScan: number;
}

export class TestDiscoveryCache {
  private cache: TestCache;
  private outputChannel: vscode.OutputChannel;
  private readonly cacheVersion = '1.0.0';

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.cache = {
      version: this.cacheVersion,
      features: new Map(),
      lastScan: 0
    };
  }

  /**
   * Check if a feature file needs to be re-processed
   */
  async needsUpdate(fileUri: vscode.Uri): Promise<boolean> {
    try {
      const filePath = fileUri.fsPath;
      const stat = await fs.promises.stat(filePath);
      const lastModified = stat.mtime.getTime();
      
      const cached = this.cache.features.get(filePath);
      
      if (!cached) {
        return true; // New file, needs processing
      }
      
      if (cached.lastModified < lastModified) {
        this.outputChannel.appendLine(`🔄 File modified: ${path.basename(filePath)}`);
        return true; // File changed, needs reprocessing
      }
      
      return false; // File unchanged, use cache
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error checking file modification: ${error}`);
      return true; // Error checking, process to be safe
    }
  }

  /**
   * Get cached test items for files that haven't changed
   */
  getCachedFeature(fileUri: vscode.Uri): CachedTestItem | undefined {
    return this.cache.features.get(fileUri.fsPath);
  }

  /**
   * Update cache with new test item data
   */
  async updateCache(fileUri: vscode.Uri, testItem: CachedTestItem): Promise<void> {
    try {
      const stat = await fs.promises.stat(fileUri.fsPath);
      testItem.lastModified = stat.mtime.getTime();
      this.cache.features.set(fileUri.fsPath, testItem);
      
      this.outputChannel.appendLine(`💾 Cached feature: ${path.basename(fileUri.fsPath)}`);
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error updating cache: ${error}`);
    }
  }

  /**
   * Remove cached entry for deleted files
   */
  removeFromCache(fileUri: vscode.Uri): void {
    const removed = this.cache.features.delete(fileUri.fsPath);
    if (removed) {
      this.outputChannel.appendLine(`🗑️ Removed from cache: ${path.basename(fileUri.fsPath)}`);
    }
  }

  /**
   * Incremental discovery - only process changed files
   */
  async incrementalDiscovery(
    files: vscode.Uri[],
    processFeatureFile: (file: vscode.Uri, fromCache: boolean) => Promise<vscode.TestItem | null>
  ): Promise<{ processed: number; fromCache: number; duration: number }> {
    const startTime = Date.now();
    let processed = 0;
    let fromCache = 0;

    this.outputChannel.appendLine('🚀 Starting incremental test discovery...');

    for (const file of files) {
      try {
        const needsUpdate = await this.needsUpdate(file);
        
        if (needsUpdate) {
          await processFeatureFile(file, false);
          processed++;
        } else {
          await processFeatureFile(file, true);
          fromCache++;
        }
      } catch (error) {
        this.outputChannel.appendLine(`❌ Error processing ${file.fsPath}: ${error}`);
        // Continue with other files
      }
    }

    const duration = Date.now() - startTime;
    this.cache.lastScan = Date.now();

    this.outputChannel.appendLine(
      `✅ Incremental discovery completed: ${processed} processed, ${fromCache} from cache, ${duration}ms`
    );

    return { processed, fromCache, duration };
  }

  /**
   * Clear entire cache (useful for configuration changes)
   */
  clearCache(): void {
    this.cache.features.clear();
    this.cache.lastScan = 0;
    this.outputChannel.appendLine('🧹 Test discovery cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalFeatures: number; lastScan: Date | null; cacheHitRate: number } {
    const now = Date.now();
    const recentAccesses = Array.from(this.cache.features.values())
      .filter(f => (now - f.lastModified) < 300000); // Last 5 minutes
    
    return {
      totalFeatures: this.cache.features.size,
      lastScan: this.cache.lastScan > 0 ? new Date(this.cache.lastScan) : null,
      cacheHitRate: this.cache.features.size > 0 ? (recentAccesses.length / this.cache.features.size) : 0
    };
  }

  /**
   * Validate cache integrity and clean up stale entries
   */
  async validateAndCleanCache(): Promise<void> {
    const startTime = Date.now();
    let removed = 0;
    
    this.outputChannel.appendLine('🧹 Validating cache integrity...');
    
    for (const [filePath, cachedItem] of this.cache.features.entries()) {
      try {
        // Check if file still exists
        await fs.promises.access(filePath);
      } catch (error) {
        // File doesn't exist, remove from cache
        this.cache.features.delete(filePath);
        removed++;
      }
    }
    
    const duration = Date.now() - startTime;
    this.outputChannel.appendLine(
      `✅ Cache validation completed: ${removed} stale entries removed in ${duration}ms`
    );
  }

  /**
   * Create cached test item from VS Code test item
   */
  createCachedItem(testItem: vscode.TestItem): CachedTestItem {
    const scenarios: Array<{
      id: string;
      label: string;
      examples?: Array<{ id: string; label: string }>;
    }> = [];

    testItem.children.forEach(scenario => {
      const examples: Array<{ id: string; label: string }> = [];
      
      scenario.children.forEach(example => {
        examples.push({
          id: example.id,
          label: example.label
        });
      });

      scenarios.push({
        id: scenario.id,
        label: scenario.label,
        examples: examples.length > 0 ? examples : undefined
      });
    });

    return {
      id: testItem.id,
      label: testItem.label,
      uri: testItem.uri?.toString() || '',
      lastModified: 0, // Will be set by updateCache
      scenarios
    };
  }

  /**
   * Recreate VS Code test item from cached data
   */
  recreateTestItem(
    cached: CachedTestItem,
    controller: vscode.TestController
  ): vscode.TestItem {
    const uri = vscode.Uri.parse(cached.uri);
    const testItem = controller.createTestItem(cached.id, cached.label, uri);
    
    // Recreate scenarios
    for (const scenario of cached.scenarios) {
      const scenarioItem = controller.createTestItem(scenario.id, scenario.label, uri);
      testItem.children.add(scenarioItem);
      
      // Recreate examples if they exist
      if (scenario.examples) {
        for (const example of scenario.examples) {
          const exampleItem = controller.createTestItem(example.id, example.label, uri);
          scenarioItem.children.add(exampleItem);
        }
      }
    }
    
    return testItem;
  }
}
