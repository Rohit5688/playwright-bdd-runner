import * as vscode from 'vscode';
import * as path from 'path';
import { StepDefinitionProvider } from './stepDefinitionProvider';
import { ExecutionHistoryTracker } from './executionHistoryTracker';

export interface HoverContext {
  stepText: string;
  stepType: 'Given' | 'When' | 'Then' | 'And' | 'But';
  lineNumber: number;
  hasDefinition: boolean;
  definitionFile?: string;
  definitionLine?: number;
  suggestions?: string[];
  parameters?: Array<{ name: string; value: string; type?: string }>;
  stepFunction?: string;
  tags?: string[];
  scenarioContext?: {
    scenarioName?: string;
    featureName?: string;
    isOutline?: boolean;
  };
  executionHistory?: {
    lastRun?: Date;
    success?: boolean;
    duration?: number;
  };
}

export class BDDHoverProvider implements vscode.HoverProvider {
  private stepDefinitionProvider: StepDefinitionProvider;
  private outputChannel: vscode.OutputChannel;
  private historyTracker?: ExecutionHistoryTracker;

  constructor(
    stepDefinitionProvider: StepDefinitionProvider,
    outputChannel: vscode.OutputChannel,
    historyTracker?: ExecutionHistoryTracker
  ) {
    this.stepDefinitionProvider = stepDefinitionProvider;
    this.outputChannel = outputChannel;
    this.historyTracker = historyTracker;
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    try {
      const line = document.lineAt(position);
      const context = this.analyzeHoverContext(line, position.line, document);

      if (!context) {
        return undefined;
      }

      const hoverContent = this.buildHoverContent(context);

      if (hoverContent.length === 0) {
        return undefined;
      }

      // Create hover range for the entire step
      const range = new vscode.Range(
        new vscode.Position(position.line, 0),
        new vscode.Position(position.line, line.text.length)
      );

      return new vscode.Hover(hoverContent, range);

    } catch (error) {
      this.outputChannel.appendLine(`[ERROR] Hover provider failed: ${error}`);
      return undefined;
    }
  }

  /**
   * Analyze the line to determine if it's a step and extract context
   */
  private analyzeHoverContext(line: vscode.TextLine, lineNumber: number, document: vscode.TextDocument): HoverContext | undefined {
    const text = line.text.trim();

    // Match step lines (Given, When, Then, And, But)
    const stepMatch = text.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/i);

    if (!stepMatch) {
      return undefined;
    }

    const [, stepType, stepText] = stepMatch;
    const cleanStepText = stepText.trim();

    // Find matching step definition
    const matchedStep = this.stepDefinitionProvider.findMatchingStep(cleanStepText);

    const context: HoverContext = {
      stepText: cleanStepText,
      stepType: stepType as 'Given' | 'When' | 'Then' | 'And' | 'But',
      lineNumber: lineNumber + 1,
      hasDefinition: !!matchedStep
    };

    if (matchedStep) {
      context.definitionFile = matchedStep.file;
      context.definitionLine = matchedStep.line;
      context.stepFunction = matchedStep.function;

      // Extract parameters from step text and pattern
      context.parameters = this.extractParameters(cleanStepText, matchedStep.pattern);
    } else {
      // Find similar steps as suggestions
      const allSteps = this.stepDefinitionProvider.getAllStepDefinitions();
      context.suggestions = this.findSimilarSteps(cleanStepText, allSteps).slice(0, 3);
    }

    // Extract additional context information
    context.scenarioContext = this.extractScenarioContext(document, lineNumber);
    context.tags = this.extractTags(document, lineNumber);
    context.executionHistory = this.getExecutionHistory(cleanStepText);

    return context;
  }

  /**
   * Build hover content based on context
   */
  private buildHoverContent(context: HoverContext): vscode.MarkdownString[] {
    const content: vscode.MarkdownString[] = [];

    if (context.hasDefinition && context.definitionFile && context.definitionLine) {
      // Step definition found
      const definitionInfo = new vscode.MarkdownString();
      definitionInfo.isTrusted = true;
      definitionInfo.supportHtml = true;

      definitionInfo.appendMarkdown(`### ✅ Step Definition Found\n\n`);
      definitionInfo.appendMarkdown(`**Step:** \`${context.stepText}\`\n\n`);
      definitionInfo.appendMarkdown(`**Type:** ${context.stepType}\n\n`);
      definitionInfo.appendMarkdown(`**Location:** ${path.basename(context.definitionFile)}:${context.definitionLine}\n\n`);

      // Add step function if available
      if (context.stepFunction) {
        definitionInfo.appendMarkdown(`**Function:** \`${context.stepFunction}\`\n\n`);
      }

      // Add parameters if available
      if (context.parameters && context.parameters.length > 0) {
        definitionInfo.appendMarkdown(`**Parameters:**\n`);
        context.parameters.forEach(param => {
          const typeInfo = param.type ? ` (${param.type})` : '';
          definitionInfo.appendMarkdown(`- \`${param.name}\`: "${param.value}"${typeInfo}\n`);
        });
        definitionInfo.appendMarkdown(`\n`);
      }

      // Add scenario context if available
      if (context.scenarioContext) {
        definitionInfo.appendMarkdown(`**Context:**\n`);
        if (context.scenarioContext.featureName) {
          definitionInfo.appendMarkdown(`- Feature: ${context.scenarioContext.featureName}\n`);
        }
        if (context.scenarioContext.scenarioName) {
          definitionInfo.appendMarkdown(`- Scenario: ${context.scenarioContext.scenarioName}\n`);
        }
        if (context.scenarioContext.isOutline) {
          definitionInfo.appendMarkdown(`- Type: Scenario Outline\n`);
        }
        definitionInfo.appendMarkdown(`\n`);
      }

      // Add execution history if available
      if (context.executionHistory?.lastRun && this.historyTracker) {
        const history = this.historyTracker.getStepHistory(context.stepText);
        if (history) {
          const successRate = history.totalRuns > 0 ? (history.successCount / history.totalRuns) * 100 : 0;
          const icon = successRate >= 90 ? '✅' : successRate >= 70 ? '⚠️' : '❌';
          const status = context.executionHistory.success ? 'Passed' : 'Failed';

          definitionInfo.appendMarkdown(`**Execution Stats:** ${icon} ${Math.round(successRate)}% success rate\n`);
          definitionInfo.appendMarkdown(`- Last Run: ${status} (${context.executionHistory.duration}ms)\n`);
          definitionInfo.appendMarkdown(`- Total Runs: ${history.totalRuns} (✅ ${history.successCount} | ❌ ${history.failureCount})\n`);
          definitionInfo.appendMarkdown(`- Avg Duration: ${history.avgDuration}ms\n\n`);
        }
      }

      // Add tags if available
      if (context.tags && context.tags.length > 0) {
        definitionInfo.appendMarkdown(`**Tags:** ${context.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`);
      }

      definitionInfo.appendMarkdown(`[Go to Definition](command:vscode.open?${encodeURIComponent(JSON.stringify([vscode.Uri.file(context.definitionFile), { selection: new vscode.Range(context.definitionLine - 1, 0, context.definitionLine - 1, 0) }]))})`);

      content.push(definitionInfo);
    } else {
      // Step definition not found
      const missingInfo = new vscode.MarkdownString();
      missingInfo.isTrusted = true;

      missingInfo.appendMarkdown(`### ❌ Step Definition Missing\n\n`);
      missingInfo.appendMarkdown(`**Step:** \`${context.stepText}\`\n\n`);
      missingInfo.appendMarkdown(`**Type:** ${context.stepType}\n\n`);
      missingInfo.appendMarkdown(`⚠️ No matching step definition found.\n\n`);

      if (context.suggestions && context.suggestions.length > 0) {
        missingInfo.appendMarkdown(`**Similar steps found:**\n\n`);
        context.suggestions.forEach((suggestion, index) => {
          missingInfo.appendMarkdown(`${index + 1}. \`${suggestion}\`\n`);
        });
        missingInfo.appendMarkdown(`\n`);
      }

      // Add step creation template
      missingInfo.appendMarkdown(`**Suggested step definition:**\n\n`);
      missingInfo.appendMarkdown(`\`\`\`typescript\n${context.stepType.toLowerCase()}('${context.stepText}', async () => {\n  // TODO: Implement step\n});\n\`\`\`\n\n`);

      missingInfo.appendMarkdown(`💡 Create a step definition in your steps folder to resolve this.`);

      content.push(missingInfo);
    }

    return content;
  }

  /**
   * Extract parameters from step text based on step definition pattern
   */
  private extractParameters(stepText: string, pattern: string): Array<{ name: string; value: string; type?: string }> {
    const parameters: Array<{ name: string; value: string; type?: string }> = [];

    try {
      // Handle different parameter formats: {param}, <param>, "string", 'string', numbers
      const parameterPatterns = [
        { regex: /\{([^}]+)\}/g, type: 'variable' },
        { regex: /\<([^>]+)\>/g, type: 'placeholder' },
        { regex: /"([^"]+)"/g, type: 'string' },
        { regex: /'([^']+)'/g, type: 'string' },
        { regex: /\b(\d+(?:\.\d+)?)\b/g, type: 'number' }
      ];

      let paramIndex = 0;
      for (const patternInfo of parameterPatterns) {
        let match;
        const regex = new RegExp(patternInfo.regex.source, 'g');

        while ((match = regex.exec(stepText)) !== null) {
          parameters.push({
            name: patternInfo.type === 'variable' || patternInfo.type === 'placeholder'
              ? match[1]
              : `param${paramIndex++}`,
            value: match[1] || match[0],
            type: patternInfo.type
          });
        }
      }
    } catch (error) {
      // Ignore parameter extraction errors
    }

    return parameters;
  }

  /**
   * Extract scenario and feature context from document
   */
  private extractScenarioContext(document: vscode.TextDocument, currentLine: number): HoverContext['scenarioContext'] {
    const lines = document.getText().split('\n');
    let featureName: string | undefined;
    let scenarioName: string | undefined;
    let isOutline = false;

    // Look backwards for feature and scenario
    for (let i = currentLine; i >= 0; i--) {
      const line = lines[i].trim();

      // Find scenario
      if (!scenarioName) {
        const scenarioMatch = line.match(/^\s*Scenario(?: Outline)?:\s*(.+)/);
        if (scenarioMatch) {
          scenarioName = scenarioMatch[1].trim();
          isOutline = line.includes('Outline');
        }
      }

      // Find feature
      if (!featureName) {
        const featureMatch = line.match(/^\s*Feature:\s*(.+)/);
        if (featureMatch) {
          featureName = featureMatch[1].trim();
          break; // Feature found, stop searching
        }
      }
    }

    return featureName || scenarioName ? {
      featureName,
      scenarioName,
      isOutline
    } : undefined;
  }

  /**
   * Extract tags from the lines above the current step
   */
  private extractTags(document: vscode.TextDocument, currentLine: number): string[] {
    const lines = document.getText().split('\n');
    const tags: string[] = [];

    // Look backwards for tags (lines starting with @)
    for (let i = currentLine - 1; i >= 0; i--) {
      const line = lines[i].trim();

      if (line.startsWith('@')) {
        const lineTags = line.split(/\s+/).filter(tag => tag.startsWith('@'));
        tags.unshift(...lineTags);
      } else if (line !== '' && !line.startsWith('#')) {
        // Stop at non-empty, non-comment line
        break;
      }
    }

    return tags;
  }

  /**
   * Get execution history for a step
   */
  private getExecutionHistory(stepText: string): HoverContext['executionHistory'] {
    if (!this.historyTracker) {
      return undefined;
    }

    const history = this.historyTracker.getStepHistory(stepText);
    if (!history) {
      return undefined;
    }

    return {
      lastRun: new Date(history.lastRun),
      success: history.lastResult === 'success',
      duration: history.lastDuration
    };
  }

  /**
   * Find similar step definitions for suggestions
   */
  private findSimilarSteps(stepText: string, allSteps: any[]): string[] {
    const stepLower = stepText.toLowerCase();
    const similar: Array<{ pattern: string; score: number; popularity: number }> = [];

    for (const step of allSteps) {
      const patternLower = step.pattern.toLowerCase();

      // Calculate multiple similarity metrics
      const wordScore = this.calculateWordSimilarity(stepLower, patternLower);
      const editScore = this.calculateEditDistance(stepLower, patternLower);
      const structureScore = this.calculateStructureSimilarity(stepLower, patternLower);

      // Weighted combined score
      const score = (wordScore * 0.4) + (editScore * 0.3) + (structureScore * 0.3);

      // Get popularity from execution history
      const history = this.historyTracker?.getStepHistory(step.pattern);
      const popularity = history ? history.totalRuns : 0;

      if (score > 0.3) { // Minimum similarity threshold
        similar.push({ pattern: step.pattern, score, popularity });
      }
    }

    // Sort by score first, then by popularity
    return similar
      .sort((a, b) => {
        if (Math.abs(b.score - a.score) > 0.1) {
          return b.score - a.score;
        }
        return b.popularity - a.popularity;
      })
      .map(s => s.pattern);
  }

  /**
   * Calculate word-based similarity
   */
  private calculateWordSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.split(/\s+/).filter(w => w.length > 2);

    let commonWords = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        commonWords++;
      }
    }

    const maxWords = Math.max(words1.length, words2.length);
    return maxWords > 0 ? commonWords / maxWords : 0;
  }

  /**
   * Calculate edit distance based similarity (Levenshtein)
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Use simplified distance for performance
    const maxLen = Math.max(len1, len2);
    let distance = 0;

    for (let i = 0; i < Math.min(len1, len2); i++) {
      if (str1[i] !== str2[i]) {
        distance++;
      }
    }
    distance += Math.abs(len1 - len2);

    return 1 - (distance / maxLen);
  }

  /**
   * Calculate structural similarity (parameter patterns)
   */
  private calculateStructureSimilarity(str1: string, str2: string): number {
    // Remove parameter placeholders and compare structure
    const normalize = (s: string) => s
      .replace(/\{[^}]+\}/g, 'PARAM')
      .replace(/<[^>]+>/g, 'PARAM')
      .replace(/["'][^"']*["']/g, 'STRING')
      .replace(/\d+/g, 'NUM');

    const n1 = normalize(str1);
    const n2 = normalize(str2);

    return n1 === n2 ? 1 : this.calculateWordSimilarity(n1, n2);
  }
}
