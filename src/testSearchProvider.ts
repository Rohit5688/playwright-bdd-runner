import * as vscode from 'vscode';
import * as path from 'path';

export interface TestSearchResult {
  testItem: vscode.TestItem;
  matchType: 'feature' | 'scenario' | 'tag' | 'step';
  matchText: string;
  filePath: string;
  line?: number;
}

export interface SearchFilters {
  tags?: string[];
  featureName?: string;
  scenarioName?: string;
  stepText?: string;
  status?: 'passed' | 'failed' | 'pending' | 'all';
  filePattern?: string;
}

export class TestSearchProvider {
  private outputChannel: vscode.OutputChannel;
  private searchHistory: string[] = [];

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Advanced search across all test items with multiple filter criteria
   */
  async searchTests(
    controller: vscode.TestController,
    searchQuery: string,
    filters: SearchFilters = {}
  ): Promise<TestSearchResult[]> {
    const startTime = Date.now();
    const results: TestSearchResult[] = [];
    
    this.outputChannel.appendLine(`🔍 Starting advanced search: "${searchQuery}"`);
    
    // Add to search history
    this.addToSearchHistory(searchQuery);
    
    // Normalize search query
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    if (!normalizedQuery && Object.keys(filters).length === 0) {
      return results;
    }

    // Search through all test items
    controller.items.forEach(item => {
      this.searchInTestItem(item, normalizedQuery, filters, results);
    });

    // Sort results by relevance
    results.sort((a, b) => this.calculateRelevance(b, normalizedQuery) - this.calculateRelevance(a, normalizedQuery));

    const duration = Date.now() - startTime;
    this.outputChannel.appendLine(`✅ Search completed in ${duration}ms. Found ${results.length} matches.`);
    
    return results;
  }

  /**
   * Recursive search within test items
   */
  private searchInTestItem(
    item: vscode.TestItem,
    query: string,
    filters: SearchFilters,
    results: TestSearchResult[]
  ): void {
    // Check if this item matches the search criteria
    const matches = this.checkItemMatch(item, query, filters);
    
    if (matches.length > 0) {
      results.push(...matches);
    }

    // Search in children
    item.children.forEach(child => {
      this.searchInTestItem(child, query, filters, results);
    });
  }

  /**
   * Check if a test item matches search criteria
   */
  private checkItemMatch(
    item: vscode.TestItem,
    query: string,
    filters: SearchFilters
  ): TestSearchResult[] {
    const matches: TestSearchResult[] = [];
    const itemLabel = item.label.toLowerCase();
    const filePath = item.uri?.fsPath || '';
    const fileName = path.basename(filePath).toLowerCase();

    // File pattern filter
    if (filters.filePattern && !fileName.includes(filters.filePattern.toLowerCase())) {
      return matches;
    }

    // Feature name filter
    if (filters.featureName && !itemLabel.includes(filters.featureName.toLowerCase())) {
      return matches;
    }

    // Scenario name filter (for scenario items)
    if (filters.scenarioName && item.parent && !itemLabel.includes(filters.scenarioName.toLowerCase())) {
      return matches;
    }

    // Basic text search
    if (query && itemLabel.includes(query)) {
      const matchType = this.determineMatchType(item);
      matches.push({
        testItem: item,
        matchType,
        matchText: item.label,
        filePath
      });
    }

    // Tag-based search (search in feature file content)
    if (filters.tags && filters.tags.length > 0) {
      const tagMatches = this.searchForTags(item, filters.tags);
      matches.push(...tagMatches);
    }

    // Step text search (search in feature file content)
    if (filters.stepText) {
      const stepMatches = this.searchForSteps(item, filters.stepText);
      matches.push(...stepMatches);
    }

    return matches;
  }

  /**
   * Search for tags in feature file content
   */
  private searchForTags(item: vscode.TestItem, tags: string[]): TestSearchResult[] {
    const matches: TestSearchResult[] = [];
    
    if (!item.uri) return matches;

    try {
      const content = require('fs').readFileSync(item.uri.fsPath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for tag lines (starting with @)
        if (line.startsWith('@')) {
          const lineTags = line.split(/\s+/).filter(tag => tag.startsWith('@'));
          
          for (const tag of tags) {
            const searchTag = tag.startsWith('@') ? tag : `@${tag}`;
            
            if (lineTags.some(lineTag => lineTag.toLowerCase().includes(searchTag.toLowerCase()))) {
              matches.push({
                testItem: item,
                matchType: 'tag',
                matchText: line,
                filePath: item.uri.fsPath,
                line: i + 1
              });
            }
          }
        }
      }
    } catch (error) {
      // Silently ignore file read errors
    }

    return matches;
  }

  /**
   * Search for step text in feature files
   */
  private searchForSteps(item: vscode.TestItem, stepText: string): TestSearchResult[] {
    const matches: TestSearchResult[] = [];
    
    if (!item.uri) return matches;

    try {
      const content = require('fs').readFileSync(item.uri.fsPath, 'utf8');
      const lines = content.split('\n');
      const searchText = stepText.toLowerCase();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim().toLowerCase();
        
        // Look for step lines (Given, When, Then, And, But)
        if (/^\s*(given|when|then|and|but)\s+/i.test(line)) {
          if (line.includes(searchText)) {
            matches.push({
              testItem: item,
              matchType: 'step',
              matchText: lines[i].trim(),
              filePath: item.uri.fsPath,
              line: i + 1
            });
          }
        }
      }
    } catch (error) {
      // Silently ignore file read errors
    }

    return matches;
  }

  /**
   * Determine the type of test item for categorizing matches
   */
  private determineMatchType(item: vscode.TestItem): 'feature' | 'scenario' | 'tag' | 'step' {
    if (!item.parent) {
      return 'feature';
    } else if (item.children.size > 0) {
      return 'scenario';
    } else {
      return 'scenario'; // Individual test cases/examples
    }
  }

  /**
   * Calculate relevance score for sorting results
   */
  private calculateRelevance(result: TestSearchResult, query: string): number {
    let score = 0;
    const matchText = result.matchText.toLowerCase();
    
    // Exact match gets highest score
    if (matchText === query) {
      score += 100;
    }
    
    // Match at beginning gets high score
    if (matchText.startsWith(query)) {
      score += 50;
    }
    
    // Match type scoring
    switch (result.matchType) {
      case 'feature':
        score += 20;
        break;
      case 'scenario':
        score += 15;
        break;
      case 'tag':
        score += 10;
        break;
      case 'step':
        score += 5;
        break;
    }
    
    // Shorter matches are more relevant
    score += Math.max(0, 20 - matchText.length);
    
    return score;
  }

  /**
   * Quick search with autocomplete suggestions
   */
  async getSearchSuggestions(
    controller: vscode.TestController,
    partialQuery: string
  ): Promise<string[]> {
    const suggestions = new Set<string>();
    const query = partialQuery.toLowerCase();

    // Add from search history
    this.searchHistory
      .filter(h => h.toLowerCase().includes(query))
      .forEach(h => suggestions.add(h));

    // Add feature and scenario names
    controller.items.forEach(item => {
      if (item.label.toLowerCase().includes(query)) {
        suggestions.add(item.label);
      }
      
      item.children.forEach(child => {
        if (child.label.toLowerCase().includes(query)) {
          suggestions.add(child.label);
        }
      });
    });

    return Array.from(suggestions).slice(0, 10); // Limit to 10 suggestions
  }

  /**
   * Advanced filter builder for complex queries
   */
  buildAdvancedFilter(queryString: string): SearchFilters {
    const filters: SearchFilters = {};
    
    // Parse filter syntax: @tag:value feature:name scenario:name step:text file:pattern
    const filterRegex = /(\w+):([^\s]+)/g;
    let match;
    
    while ((match = filterRegex.exec(queryString)) !== null) {
      const [, key, value] = match;
      
      switch (key.toLowerCase()) {
        case 'tag':
          if (!filters.tags) filters.tags = [];
          filters.tags.push(value);
          break;
        case 'feature':
          filters.featureName = value;
          break;
        case 'scenario':
          filters.scenarioName = value;
          break;
        case 'step':
          filters.stepText = value;
          break;
        case 'file':
          filters.filePattern = value;
          break;
        case 'status':
          filters.status = value as 'passed' | 'failed' | 'pending' | 'all';
          break;
      }
    }
    
    return filters;
  }

  /**
   * Export search results for external use
   */
  exportSearchResults(results: TestSearchResult[]): string {
    const report = [
      `# Search Results - ${new Date().toISOString()}`,
      `Total matches: ${results.length}`,
      '',
      '## Results',
      ''
    ];

    results.forEach((result, index) => {
      report.push(`${index + 1}. **${result.matchType.toUpperCase()}**: ${result.matchText}`);
      report.push(`   File: ${result.filePath}`);
      if (result.line) {
        report.push(`   Line: ${result.line}`);
      }
      report.push('');
    });

    return report.join('\n');
  }

  /**
   * Get search statistics
   */
  getSearchStats(): { historySize: number; lastSearch: Date | null } {
    return {
      historySize: this.searchHistory.length,
      lastSearch: this.searchHistory.length > 0 ? new Date() : null
    };
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
    this.outputChannel.appendLine('🧹 Search history cleared');
  }

  /**
   * Add search query to history
   */
  private addToSearchHistory(query: string): void {
    if (query.trim() && !this.searchHistory.includes(query)) {
      this.searchHistory.unshift(query);
      
      // Keep only last 50 searches
      if (this.searchHistory.length > 50) {
        this.searchHistory = this.searchHistory.slice(0, 50);
      }
    }
  }
}
