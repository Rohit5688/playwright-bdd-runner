import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface StepDefinition {
  pattern: string;
  type: 'Given' | 'When' | 'Then';
  file: string;
  line: number;
  function: string;
}

export class StepDefinitionProvider implements vscode.DefinitionProvider {
  private stepDefinitions: StepDefinition[] = [];
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  async discoverStepDefinitions(workspaceRoot: string, stepsFolder: string = 'src/steps'): Promise<void> {
    try {
      this.outputChannel.appendLine('🔍 Starting step definition discovery...');
      const startTime = Date.now();
      
      this.stepDefinitions = [];
      const stepsPath = path.resolve(workspaceRoot, stepsFolder);
      
      if (!fs.existsSync(stepsPath)) {
        this.outputChannel.appendLine(`⚠️ Steps folder not found: ${stepsPath}`);
        return;
      }

      const stepFiles = await this.findStepFiles(stepsPath);
      this.outputChannel.appendLine(`📁 Found ${stepFiles.length} step definition files`);

      for (const file of stepFiles) {
        try {
          await this.parseStepFile(file);
        } catch (error) {
          this.outputChannel.appendLine(`❌ Error parsing step file ${file}: ${error}`);
        }
      }

      const duration = Date.now() - startTime;
      this.outputChannel.appendLine(`✅ Step discovery completed in ${duration}ms. Found ${this.stepDefinitions.length} step definitions.`);

    } catch (error) {
      this.outputChannel.appendLine(`❌ Step definition discovery failed: ${error}`);
    }
  }

  private async findStepFiles(stepsPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = (dir: string) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          try {
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              scanDirectory(fullPath);
            } else if (item.endsWith('.ts') || item.endsWith('.js')) {
              files.push(fullPath);
            }
          } catch (error) {
            continue;
          }
        }
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Error scanning directory ${dir}: ${error}`);
      }
    };

    scanDirectory(stepsPath);
    return files;
  }

  private async parseStepFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Enhanced step definition patterns - covers ALL types of step definitions
        const stepPatterns = [
          // Standard format: Given('pattern', function)
          /^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(.+)\)/,
          
          // Alternative formats: Given("pattern", async () => {})
          /^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\s*\)\s*=>\s*\{/,
          
          // Function declaration: Given("pattern", async function() {})
          /^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s+function\s*\(/,
          
          // TypeScript arrow functions: Given("pattern", async (): Promise<void> => {})
          /^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\([^)]*\)\s*:\s*[^=]*=>\s*\{/,
          
          // Cucumber-style with decorators: @Given("pattern")
          /^@(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/,
          
          // Multi-line step definitions (check if next lines contain function)
          /^(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*$/
        ];

        for (const pattern of stepPatterns) {
          const stepMatch = line.match(pattern);
          
          if (stepMatch) {
            const [fullMatch, type, stepPattern] = stepMatch;
            let functionDef = '';
            
            // For single-line matches, extract function definition
            if (fullMatch.includes(',')) {
              const commaIndex = fullMatch.indexOf(',');
              functionDef = fullMatch.substring(commaIndex + 1).trim();
            } else {
              // For multi-line definitions, look at next few lines
              let nextLineIndex = i + 1;
              while (nextLineIndex < lines.length && nextLineIndex < i + 5) {
                const nextLine = lines[nextLineIndex].trim();
                if (nextLine.includes('async') || nextLine.includes('function') || nextLine.includes('=>')) {
                  functionDef = nextLine;
                  break;
                }
                nextLineIndex++;
              }
            }
            
            // Only add if we haven't already found this pattern (avoid duplicates)
            const isDuplicate = this.stepDefinitions.some(existing => 
              existing.pattern === stepPattern && 
              existing.type === type && 
              existing.file === filePath
            );
            
            if (!isDuplicate) {
              this.stepDefinitions.push({
                pattern: stepPattern,
                type: type as 'Given' | 'When' | 'Then',
                file: filePath,
                line: i + 1,
                function: functionDef || 'function definition'
              });

              this.outputChannel.appendLine(`  📝 Found ${type}: "${stepPattern}" in ${path.basename(filePath)}:${i + 1}`);
            }
            
            break; // Found a match, no need to check other patterns
          }
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error reading step file ${filePath}: ${error}`);
    }
  }

  // VS Code DefinitionProvider interface
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Definition | undefined> {
    const line = document.lineAt(position);
    const stepMatch = line.text.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)/);
    
    if (stepMatch) {
      const stepText = stepMatch[2].trim();
      return await this.findStepDefinition(stepText);
    }
    
    return undefined;
  }

  async findStepDefinition(stepText: string): Promise<vscode.Location | undefined> {
    const matchedStep = this.findMatchingStep(stepText);
    
    if (matchedStep) {
      const uri = vscode.Uri.file(matchedStep.file);
      const position = new vscode.Position(matchedStep.line - 1, 0);
      return new vscode.Location(uri, position);
    }
    
    return undefined;
  }

  findMatchingStep(stepText: string): StepDefinition | undefined {
    // Enhanced logging for debugging
    this.outputChannel.appendLine(`🔍 Looking for step: "${stepText}"`);
    
    return this.stepDefinitions.find(step => {
      try {
        this.outputChannel.appendLine(`  🎯 Testing pattern: "${step.pattern}"`);
        
        // Strategy 1: Direct string comparison (for exact matches)
        if (stepText.toLowerCase() === step.pattern.toLowerCase()) {
          this.outputChannel.appendLine(`  ✅ Direct match found!`);
          return true;
        }
        
        // Strategy 2: Enhanced parameter replacement for scenario outlines + API calls
        let enhancedPattern = step.pattern;
        
        // Handle scenario outline parameters first (most specific)
        enhancedPattern = enhancedPattern
          .replace(/'<[^>]+>'/g, '\'[^\']*\'')    // '<param>' -> match any quoted content
          .replace(/"<[^>]+>"/g, '"[^"]*"')       // "<param>" -> match any quoted content
          .replace(/<[^>]+>/g, '[^\\s]+');        // <param> -> match any non-space content
        
        // Handle Cucumber parameters
        enhancedPattern = enhancedPattern
          .replace(/\{string\}/g, '["\']([^"\']*)["\']')  // {string} -> match quoted strings
          .replace(/\{int\}/g, '\\d+')                     // {int} -> match numbers
          .replace(/\{float\}/g, '\\d+\\.?\\d*')           // {float} -> match decimals
          .replace(/\{word\}/g, '[a-zA-Z0-9_]+')           // {word} -> match word characters
          .replace(/\{[^}]+\}/g, '[^\\s]+');               // {anyParam} -> match non-space
        
        // Handle quoted strings (API endpoints, JSON, etc.)
        enhancedPattern = enhancedPattern
          .replace(/'[^']*'/g, '\'[^\']*\'')       // Match any single-quoted string
          .replace(/"[^"]*"/g, '"[^"]*"');         // Match any double-quoted string
        
        // Normalize whitespace
        enhancedPattern = enhancedPattern.replace(/\s+/g, '\\s+');
        
        try {
          const regex = new RegExp(`^${enhancedPattern}$`, 'i');
          if (regex.test(stepText)) {
            this.outputChannel.appendLine(`  ✅ Enhanced pattern match: "${enhancedPattern}"`);
            return true;
          }
        } catch (regexError) {
          this.outputChannel.appendLine(`  ⚠️ Enhanced regex failed: ${regexError}`);
        }
        
        // Strategy 3: Fuzzy matching for API steps with parameters
        const fuzzyMatch = this.performApiAwareFuzzyMatch(stepText, step.pattern);
        if (fuzzyMatch) {
          this.outputChannel.appendLine(`  ✅ API-aware fuzzy match found!`);
          return true;
        }
        
        // Strategy 4: Structural matching (ignore parameter values, focus on structure)
        const structuralMatch = this.performStructuralMatch(stepText, step.pattern);
        if (structuralMatch) {
          this.outputChannel.appendLine(`  ✅ Structural match found!`);
          return true;
        }
        
        return false;
        
      } catch (error) {
        this.outputChannel.appendLine(`  ❌ Error matching "${step.pattern}": ${error}`);
        return false;
      }
    });
  }

  /**
   * API-aware fuzzy matching that understands scenario outline parameters
   */
  private performApiAwareFuzzyMatch(stepText: string, pattern: string): boolean {
    try {
      // Normalize both strings for comparison
      const normalizeForApiComparison = (str: string) => {
        return str.toLowerCase()
          // Replace scenario outline parameters with placeholders
          .replace(/'<[^>]+>'/g, 'SCENARIO_PARAM')
          .replace(/"<[^>]+>"/g, 'SCENARIO_PARAM')
          .replace(/<[^>]+>/g, 'SCENARIO_PARAM')
          
          // Replace cucumber parameters with placeholders
          .replace(/\{[^}]+\}/g, 'CUCUMBER_PARAM')
          
          // Replace quoted strings with placeholders
          .replace(/'[^']*'/g, 'QUOTED_STRING')
          .replace(/"[^"]*"/g, 'QUOTED_STRING')
          
          // Normalize whitespace and punctuation
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const normalizedStep = normalizeForApiComparison(stepText);
      const normalizedPattern = normalizeForApiComparison(pattern);
      
      // Check if the normalized structures are similar
      if (normalizedStep === normalizedPattern) {
        return true;
      }
      
      // For API steps, check if key API terms match
      const apiTerms = ['api', 'call', 'request', 'response', 'get', 'post', 'put', 'delete', 'patch', 'through', 'aggregator', 'endpoint'];
      const stepApiTerms = apiTerms.filter(term => normalizedStep.includes(term));
      const patternApiTerms = apiTerms.filter(term => normalizedPattern.includes(term));
      
      // If both have API terms, check if they match
      if (stepApiTerms.length > 0 && patternApiTerms.length > 0) {
        const matchingApiTerms = stepApiTerms.filter(term => patternApiTerms.includes(term));
        return matchingApiTerms.length > 0;
      }
      
      return false;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Structural matching that focuses on sentence structure rather than parameter values
   */
  private performStructuralMatch(stepText: string, pattern: string): boolean {
    try {
      // Extract structural elements (words that are not parameters)
      const extractStructure = (str: string) => {
        return str.toLowerCase()
          // Remove all parameter-like content
          .replace(/'<[^>]+>'/g, '')
          .replace(/"<[^>]+>"/g, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\{[^}]+\}/g, '')
          .replace(/'[^']*'/g, '')
          .replace(/"[^"]*"/g, '')
          
          // Extract remaining meaningful words
          .split(/\s+/)
          .filter(word => word.length > 2)
          .filter(word => !['and', 'the', 'for', 'with', 'from', 'that'].includes(word));
      };
      
      const stepStructure = extractStructure(stepText);
      const patternStructure = extractStructure(pattern);
      
      // Check if most structural words match
      if (stepStructure.length === 0 || patternStructure.length === 0) {
        return false;
      }
      
      const matchingWords = stepStructure.filter(word => 
        patternStructure.some(patternWord => 
          word.includes(patternWord) || patternWord.includes(word)
        )
      );
      
      const matchRatio = matchingWords.length / Math.max(stepStructure.length, patternStructure.length);
      return matchRatio >= 0.6; // 60% structural similarity
      
    } catch (error) {
      return false;
    }
  }

  getAllStepDefinitions(): StepDefinition[] {
    return [...this.stepDefinitions];
  }

  getStepCoverageForFeature(featureFile: string): { covered: number; total: number; missing: string[] } {
    try {
      const content = fs.readFileSync(featureFile, 'utf8');
      const lines = content.split('\n');
      const steps: string[] = [];
      const missing: string[] = [];

      for (const line of lines) {
        const stepMatch = line.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)/);
        
        if (stepMatch) {
          const stepText = stepMatch[2].trim();
          steps.push(stepText);
          
          const matchedDefinition = this.findMatchingStep(stepText);
          if (!matchedDefinition) {
            missing.push(stepText);
          }
        }
      }

      return {
        covered: steps.length - missing.length,
        total: steps.length,
        missing
      };
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error analyzing step coverage for ${featureFile}: ${error}`);
      return { covered: 0, total: 0, missing: [] };
    }
  }
}
