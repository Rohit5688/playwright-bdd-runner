import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface StepTemplate {
  stepType: 'Given' | 'When' | 'Then';
  stepText: string;
  functionName: string;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    defaultValue?: string;
  }>;
  hasDataTable?: boolean;
  hasDocString?: boolean;
  implementation: string;
}

export interface StepCreationOptions {
  targetFile?: string;
  language: 'typescript' | 'javascript';
  framework: 'playwright-bdd' | 'cucumber' | 'generic';
  addImports: boolean;
  addComments: boolean;
}

export class StepCreationWizard {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;

  constructor(outputChannel: vscode.OutputChannel, workspaceRoot: string) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Launch the step creation wizard
   */
  async launchWizard(stepText?: string): Promise<void> {
    try {
      this.outputChannel.appendLine('🧙‍♂️ Launching Step Creation Wizard...');

      // Step 1: Get step text if not provided
      const finalStepText = stepText || await this.getStepText();
      if (!finalStepText) {
        return;
      }

      // Step 2: Analyze the step text
      const analysis = this.analyzeStepText(finalStepText);

      // Step 3: Get creation options
      const options = await this.getCreationOptions();
      if (!options) {
        return;
      }

      // Step 4: Create step template
      const template = await this.createStepTemplate(analysis, options);

      // Step 5: Show preview and confirm
      const confirmed = await this.showPreviewAndConfirm(template, options);
      if (!confirmed) {
        return;
      }

      // Step 6: Generate and save the step definition
      await this.generateStepDefinition(template, options);

      vscode.window.showInformationMessage('✅ Step definition created successfully!');

    } catch (error) {
      this.outputChannel.appendLine(`❌ Step creation failed: ${error}`);
      vscode.window.showErrorMessage(`Failed to create step definition: ${error}`);
    }
  }

  /**
   * Create step definition from missing step
   */
  async createFromMissingStep(stepText: string, stepType: string): Promise<void> {
    this.outputChannel.appendLine(`🔧 Creating step definition for missing step: ${stepText}`);

    const analysis = {
      stepType: stepType as 'Given' | 'When' | 'Then',
      originalText: stepText,
      cleanText: stepText,
      parameters: this.extractParametersFromText(stepText),
      suggestedFunctionName: this.generateFunctionName(stepText)
    };

    const options = await this.getQuickCreationOptions();
    if (!options) {
      return;
    }

    const template = await this.createStepTemplate(analysis, options);
    await this.generateStepDefinition(template, options);

    vscode.window.showInformationMessage('✅ Step definition created from missing step!');
  }

  /**
   * Get step text from user
   */
  private async getStepText(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: 'Enter the step text (e.g., "I click on the login button")',
      placeHolder: 'Step text...',
      validateInput: (value) => {
        if (!value.trim()) {
          return 'Step text cannot be empty';
        }
        return undefined;
      }
    });
  }

  /**
   * Analyze step text to extract information
   */
  private analyzeStepText(stepText: string): {
    stepType: 'Given' | 'When' | 'Then';
    originalText: string;
    cleanText: string;
    parameters: Array<{ name: string; type: string; value: string }>;
    suggestedFunctionName: string;
  } {
    // Determine step type based on keywords
    const stepType = this.determineStepType(stepText);

    // Clean the text (remove step type if present)
    const cleanText = stepText.replace(/^(Given|When|Then|And|But)\s+/i, '').trim();

    // Extract parameters
    const parameters = this.extractParametersFromText(cleanText);

    // Generate function name
    const suggestedFunctionName = this.generateFunctionName(cleanText);

    return {
      stepType,
      originalText: stepText,
      cleanText,
      parameters,
      suggestedFunctionName
    };
  }

  /**
   * Determine step type from text
   */
  private determineStepType(stepText: string): 'Given' | 'When' | 'Then' {
    const text = stepText.toLowerCase();

    if (text.includes('given') || text.includes('assume') || text.includes('setup')) {
      return 'Given';
    } else if (text.includes('when') || text.includes('click') || text.includes('enter') || text.includes('select')) {
      return 'When';
    } else {
      return 'Then';
    }
  }

  /**
   * Extract parameters from step text
   */
  private extractParametersFromText(text: string): Array<{ name: string; type: string; value: string }> {
    const parameters: Array<{ name: string; type: string; value: string }> = [];

    // Extract quoted strings
    const stringMatches = text.match(/"([^"]+)"/g) || [];
    stringMatches.forEach((match, index) => {
      const value = match.slice(1, -1);
      parameters.push({
        name: `text${index + 1}`,
        type: 'string',
        value
      });
    });

    // Extract numbers
    const numberMatches = text.match(/\b\d+(\.\d+)?\b/g) || [];
    numberMatches.forEach((match, index) => {
      parameters.push({
        name: `number${index + 1}`,
        type: 'number',
        value: match
      });
    });

    return parameters;
  }

  /**
   * Generate function name from step text
   */
  private generateFunctionName(stepText: string): string {
    return stepText
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
      .replace(/^\d/, 'step$&'); // Prefix with 'step' if starts with number
  }

  /**
   * Get creation options from user
   */
  private async getCreationOptions(): Promise<StepCreationOptions | undefined> {
    // Language selection
    const language = await vscode.window.showQuickPick(['typescript', 'javascript'], {
      placeHolder: 'Select language for step definition'
    });
    if (!language) return undefined;

    // Framework selection
    const framework = await vscode.window.showQuickPick(
      ['playwright-bdd', 'cucumber', 'generic'],
      { placeHolder: 'Select testing framework' }
    );
    if (!framework) return undefined;

    // Target file selection
    const targetFile = await this.selectTargetFile(language);
    if (!targetFile) return undefined;

    return {
      targetFile,
      language: language as 'typescript' | 'javascript',
      framework: framework as 'playwright-bdd' | 'cucumber' | 'generic',
      addImports: true,
      addComments: true
    };
  }

  /**
   * Get quick creation options (for missing steps)
   */
  private async getQuickCreationOptions(): Promise<StepCreationOptions | undefined> {
    const config = vscode.workspace.getConfiguration('playwrightBdd');
    const stepsFolder = config.get<string>('stepsFolder', 'steps');

    // Try to find existing step files
    const stepFiles = await this.findStepFiles();

    let targetFile: string;

    if (stepFiles.length > 0) {
      // Use existing file or create new one
      const fileOptions = [
        ...stepFiles.map(f => ({ label: path.basename(f), detail: f })),
        { label: '$(plus) Create new file', detail: 'new' }
      ];

      const selected = await vscode.window.showQuickPick(fileOptions, {
        placeHolder: 'Select target file for step definition'
      });

      if (!selected) return undefined;

      if (selected.detail === 'new') {
        targetFile = await this.createNewStepFile(stepsFolder);
      } else {
        targetFile = selected.detail;
      }
    } else {
      targetFile = await this.createNewStepFile(stepsFolder);
    }

    return {
      targetFile,
      language: 'typescript',
      framework: 'playwright-bdd',
      addImports: true,
      addComments: false
    };
  }

  /**
   * Select target file for step definition
   */
  private async selectTargetFile(language: string): Promise<string | undefined> {
    const stepFiles = await this.findStepFiles();

    const options = [
      ...stepFiles.map(file => ({
        label: path.basename(file),
        detail: file,
        description: 'Existing file'
      })),
      {
        label: '$(plus) Create new file',
        detail: 'new',
        description: 'Create a new step definition file'
      }
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select target file for step definition'
    });

    if (!selected) return undefined;

    if (selected.detail === 'new') {
      const config = vscode.workspace.getConfiguration('playwrightBdd');
      const stepsFolder = config.get<string>('stepsFolder', 'steps');
      return await this.createNewStepFile(stepsFolder);
    }

    return selected.detail;
  }

  /**
   * Find existing step definition files
   */
  private async findStepFiles(): Promise<string[]> {
    const config = vscode.workspace.getConfiguration('playwrightBdd');
    const stepsFolder = config.get<string>('stepsFolder', 'steps');
    const filePattern = config.get<string>('stepsFilePattern', '**/*.{js,ts,mjs,mts}');

    try {
      const files = await vscode.workspace.findFiles(
        `${stepsFolder}/${filePattern}`,
        '**/node_modules/**',
        50
      );

      return files.map(file => file.fsPath);
    } catch {
      return [];
    }
  }

  /**
   * Create a new step definition file
   */
  private async createNewStepFile(stepsFolder: string): Promise<string> {
    const fileName = await vscode.window.showInputBox({
      prompt: 'Enter name for new step definition file',
      placeHolder: 'e.g., loginSteps.ts',
      value: 'newSteps.ts',
      validateInput: (value) => {
        if (!value.trim()) {
          return 'File name cannot be empty';
        }
        if (!/\.(ts|js|mjs|mts)$/.test(value)) {
          return 'File must have .ts, .js, .mjs, or .mts extension';
        }
        return undefined;
      }
    });

    if (!fileName) {
      throw new Error('File name is required');
    }

    const fullPath = path.join(this.workspaceRoot, stepsFolder, fileName);

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });

    return fullPath;
  }

  /**
   * Create step template
   */
  private async createStepTemplate(
    analysis: any,
    options: StepCreationOptions
  ): Promise<StepTemplate> {
    const template: StepTemplate = {
      stepType: analysis.stepType,
      stepText: analysis.cleanText,
      functionName: analysis.suggestedFunctionName,
      parameters: analysis.parameters.map((p: any) => ({
        name: p.name,
        type: p.type,
        defaultValue: p.value
      })),
      hasDataTable: false,
      hasDocString: false,
      implementation: this.generateImplementation(analysis, options)
    };

    return template;
  }

  /**
   * Generate step implementation code
   */
  private generateImplementation(analysis: any, options: StepCreationOptions): string {
    const { language, framework } = options;
    const isTypeScript = language === 'typescript';

    let impl = '';

    if (framework === 'playwright-bdd') {
      impl = '// TODO: Implement step logic\n';
      impl += 'await page.pause(); // Remove this line and add your implementation';
    } else if (framework === 'cucumber') {
      impl = '// TODO: Implement step logic\n';
      impl += 'throw new Error("Step not implemented");';
    } else {
      impl = '// TODO: Implement step logic';
    }

    return impl;
  }

  /**
   * Show preview and get confirmation
   */
  private async showPreviewAndConfirm(
    template: StepTemplate,
    options: StepCreationOptions
  ): Promise<boolean> {
    const code = this.generateStepCode(template, options);

    const doc = await vscode.workspace.openTextDocument({
      content: code,
      language: options.language
    });

    await vscode.window.showTextDocument(doc, { preview: true });

    const result = await vscode.window.showInformationMessage(
      'Preview the step definition. Do you want to create it?',
      'Create Step',
      'Cancel'
    );

    return result === 'Create Step';
  }

  /**
   * Generate step definition code
   */
  private generateStepCode(template: StepTemplate, options: StepCreationOptions): string {
    const { language, framework, addImports, addComments } = options;
    const isTypeScript = language === 'typescript';

    let code = '';

    // Add imports
    if (addImports) {
      if (framework === 'playwright-bdd') {
        // Don't add individual imports - they're added at file level
      } else if (framework === 'cucumber') {
        code += `import { ${template.stepType} } from '@cucumber/cucumber';\n`;
      }
      code += '\n';
    }

    // Add comments
    if (addComments) {
      code += `/**\n * ${template.stepType}: ${template.stepText}\n`;
      if (template.parameters.length > 0) {
        template.parameters.forEach(param => {
          code += ` * @param {${param.type}} ${param.name}\n`;
        });
      }
      code += ' */\n';
    }

    // Generate step definition
    const paramList = template.parameters.map(p => {
      if (isTypeScript) {
        return `${p.name}: ${p.type}`;
      }
      return p.name;
    }).join(', ');

    const stepPattern = this.createStepPattern(template.stepText, template.parameters);

    if (framework === 'playwright-bdd') {
      code += `${template.stepType}('${stepPattern}', async ({ page }${paramList ? `, ${paramList}` : ''}) => {\n`;
    } else {
      code += `${template.stepType}('${stepPattern}', async (${paramList}) => {\n`;
    }

    // Add implementation
    code += '  ' + template.implementation.replace(/\n/g, '\n  ') + '\n';
    code += '});\n';

    return code;
  }

  /**
   * Create step pattern with parameter placeholders
   */
  private createStepPattern(stepText: string, parameters: any[]): string {
    let pattern = stepText;

    // Convert actual values to Cucumber expressions
    // Replace quoted strings with {string}
    pattern = pattern.replace(/'[^']+'/g, '{string}');
    pattern = pattern.replace(/"[^"]+"/g, '{string}');

    // Replace numbers with {int} or {float}
    pattern = pattern.replace(/\b\d+\.\d+\b/g, '{float}');
    pattern = pattern.replace(/\b\d+\b/g, '{int}');

    return pattern;
  }
  /**
   * Generate and save step definition
   */
  private async generateStepDefinition(template: StepTemplate, options: StepCreationOptions): Promise<void> {
    const code = this.generateStepCode(template, options);
    const targetFile = path.normalize(options.targetFile!);
    this.outputChannel.appendLine(`Checking if file exists: ${targetFile}`);

    // Check if file exists
    let fileExists = false;
    try {
      fileExists = fs.existsSync(targetFile);
    } catch (e) {
      this.outputChannel.appendLine(`Error checking file existence: ${e}`);
      fileExists = false;
    }

    this.outputChannel.appendLine(`File exists: ${fileExists}`);

    if (fileExists) {
      // Append to existing file
      const existingContent = await fs.promises.readFile(targetFile, 'utf8');
      const newContent = existingContent + '\n' + code;
      await fs.promises.writeFile(targetFile, newContent);
    } else {
      // Create new file with imports and step
      let fileContent = '';

      if (options.addImports && options.framework === 'playwright-bdd') {
        fileContent += `import { createBdd } from 'playwright-bdd';\n`;
        fileContent += `const { Given, When, Then } = createBdd();\n`;
        fileContent += '\n';
      }

      fileContent += code;

      await fs.promises.writeFile(targetFile, fileContent);
    }

    // Open the file and navigate to the new step
    const doc = await vscode.workspace.openTextDocument(targetFile);
    await vscode.window.showTextDocument(doc);

    this.outputChannel.appendLine(`✅ Step definition created in: ${targetFile}`);
  }

  /**
   * Bulk create steps from feature file
   */
  async createStepsFromFeature(featureUri: vscode.Uri): Promise<void> {
    try {
      this.outputChannel.appendLine(`🔍 Analyzing feature file: ${path.basename(featureUri.fsPath)}`);

      const content = await fs.promises.readFile(featureUri.fsPath, 'utf8');
      const missingSteps = this.findMissingSteps(content);

      if (missingSteps.length === 0) {
        vscode.window.showInformationMessage('No missing steps found in this feature file.');
        return;
      }

      const result = await vscode.window.showInformationMessage(
        `Found ${missingSteps.length} missing steps. Create all step definitions?`,
        'Create All',
        'Cancel'
      );

      if (result === 'Create All') {
        const options = await this.getQuickCreationOptions();
        if (!options) return;

        for (const step of missingSteps) {
          const analysis = this.analyzeStepText(step);
          const template = await this.createStepTemplate(analysis, options);
          await this.generateStepDefinition(template, options);
        }

        vscode.window.showInformationMessage(`✅ Created ${missingSteps.length} step definitions!`);
      }

    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to create steps from feature: ${error}`);
      vscode.window.showErrorMessage(`Failed to create steps: ${error}`);
    }
  }

  /**
   * Find missing steps in feature content
   */
  private findMissingSteps(content: string): string[] {
    const lines = content.split('\n');
    const steps: string[] = [];

    for (const line of lines) {
      const stepMatch = line.trim().match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        const fullStep = `${stepMatch[1]} ${stepMatch[2]}`;
        if (!steps.includes(fullStep)) {
          steps.push(fullStep);
        }
      }
    }

    return steps;
  }
}
