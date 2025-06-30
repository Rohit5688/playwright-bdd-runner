import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ProjectConfiguration {
  playwrightConfig?: string;
  featureFolder?: string;
  stepsFolder?: string;
  tsconfigPath?: string;
  hasPlaywrightBdd?: boolean;
  packageJsonExists?: boolean;
}

export class AutoDiscoveryService {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;

  constructor(outputChannel: vscode.OutputChannel, workspaceRoot: string) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Auto-discover project configuration
   */
  async discoverProjectConfiguration(): Promise<ProjectConfiguration> {
    const config: ProjectConfiguration = {};
    
    this.outputChannel.appendLine('🔍 Starting auto-discovery of project configuration...');

    try {
      // Discover Playwright config files
      const configs = await this.discoverPlaywrightConfig();
      config.playwrightConfig = configs.length > 0 ? configs[0] : undefined;
      
      // Discover feature folders
      config.featureFolder = await this.discoverFeatureFolder();
      
      // Discover steps folders
      config.stepsFolder = await this.discoverStepsFolder();
      
      // Discover tsconfig files
      config.tsconfigPath = await this.discoverTsconfig();
      
      // Check for playwright-bdd dependency
      config.hasPlaywrightBdd = await this.checkPlaywrightBddDependency();
      config.packageJsonExists = await this.checkPackageJson();

      this.logDiscoveryResults(config);
      return config;

    } catch (error) {
      this.outputChannel.appendLine(`❌ Auto-discovery failed: ${error}`);
      return config;
    }
  }

  /**
   * Discover Playwright configuration files dynamically across all folders
   */
  private async discoverPlaywrightConfig(): Promise<string[]> {
    const configPatterns = [
      'playwright.config.js',
      'playwright.config.ts', 
      'playwright.config.mjs',
      'playwright.config.mts',
      'playwright.config.cjs',
      'playwright.config.cts'
    ];

    const configs: string[] = [];
    this.outputChannel.appendLine('🔍 Searching for Playwright configs in all workspace folders...');
    
    try {
      // Search for configs in root and all subdirectories
      for (const pattern of configPatterns) {
        const files = await vscode.workspace.findFiles(
          `**/${pattern}`, 
          '**/node_modules/**'
        );
        
        for (const file of files) {
          const relativePath = vscode.workspace.asRelativePath(file);
          configs.push(relativePath);
          this.outputChannel.appendLine(`📋 Found Playwright config: ${relativePath}`);
        }
      }

      // Also check for configs that might be named differently but contain playwright configuration
      const potentialConfigs = await this.findConfigsByContent();
      configs.push(...potentialConfigs);

      // Sort by proximity to root (prefer configs closer to workspace root)
      configs.sort((a, b) => {
        const aDepth = a.split('/').length;
        const bDepth = b.split('/').length;
        return aDepth - bDepth;
      });

      this.outputChannel.appendLine(`✅ Total Playwright configs found: ${configs.length}`);
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error during config discovery: ${error}`);
    }

    return configs;
  }

  /**
   * Find configuration files by examining their content for Playwright setup
   */
  private async findConfigsByContent(): Promise<string[]> {
    const potentialConfigs: string[] = [];
    
    try {
      // Search for any .js/.ts files that might contain Playwright config
      const jsFiles = await vscode.workspace.findFiles(
        '**/*.{js,ts,mjs,mts,cjs,cts}', 
        '**/node_modules/**'
      );

      const configKeywords = [
        'defineConfig',
        '@playwright/test',
        'PlaywrightTestConfig',
        'devices:',
        'projects:',
        'testDir:',
        'use:.*baseURL'
      ];

      for (const file of jsFiles) {
        try {
          const content = await vscode.workspace.fs.readFile(file);
          const text = content.toString();
          
          // Check if file contains Playwright configuration patterns
          const hasPlaywrightConfig = configKeywords.some(keyword => {
            const regex = new RegExp(keyword, 'i');
            return regex.test(text);
          });

          if (hasPlaywrightConfig) {
            const relativePath = vscode.workspace.asRelativePath(file);
            // Avoid common false positives
            if (!relativePath.includes('test') && 
                !relativePath.includes('spec') && 
                !relativePath.includes('example') &&
                !potentialConfigs.includes(relativePath)) {
              potentialConfigs.push(relativePath);
              this.outputChannel.appendLine(`🔧 Detected Playwright config by content: ${relativePath}`);
            }
          }
        } catch (error) {
          // Skip files we can't read
          continue;
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`Warning: Content-based config discovery failed: ${error}`);
    }

    return potentialConfigs;
  }

  /**
   * Discover feature folders dynamically across entire workspace
   */
  private async discoverFeatureFolder(): Promise<string | undefined> {
    this.outputChannel.appendLine('🔍 Searching for feature folders in all workspace directories...');
    
    try {
      // Search for all .feature files in the workspace
      const featureFiles = await vscode.workspace.findFiles('**/*.feature', '**/node_modules/**');
      
      if (featureFiles.length === 0) {
        this.outputChannel.appendLine('⚠️ No .feature files found in workspace');
        return undefined;
      }

      // Analyze feature file locations to find the most common directory
      const featureDirs = new Map<string, number>();
      
      for (const file of featureFiles) {
        const relativePath = vscode.workspace.asRelativePath(file);
        const dir = path.dirname(relativePath);
        
        // Count features in each directory
        featureDirs.set(dir, (featureDirs.get(dir) || 0) + 1);
        
        this.outputChannel.appendLine(`📋 Found feature file: ${relativePath}`);
      }

      // Find the directory with the most feature files
      let bestDir = '';
      let maxCount = 0;
      
      for (const [dir, count] of featureDirs.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestDir = dir;
        }
      }

      // Prefer root-level feature directories
      const sortedDirs = Array.from(featureDirs.keys()).sort((a, b) => {
        const aDepth = a.split('/').length;
        const bDepth = b.split('/').length;
        const aCount = featureDirs.get(a) || 0;
        const bCount = featureDirs.get(b) || 0;
        
        // Prefer directories with more files, then prefer shallower directories
        if (aCount !== bCount) {
          return bCount - aCount;
        }
        return aDepth - bDepth;
      });

      const selectedDir = sortedDirs[0] || bestDir;
      
      this.outputChannel.appendLine(`✅ Selected feature folder: ${selectedDir} (${featureDirs.get(selectedDir)} features)`);
      this.outputChannel.appendLine(`📊 Feature distribution:`);
      
      for (const [dir, count] of featureDirs.entries()) {
        this.outputChannel.appendLine(`   ${dir}: ${count} feature(s)`);
      }
      
      return selectedDir;
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error during feature folder discovery: ${error}`);
      return undefined;
    }
  }

  /**
   * Discover step definition folders dynamically across entire workspace
   */
  private async discoverStepsFolder(): Promise<string | undefined> {
    this.outputChannel.appendLine('🔍 Searching for step definition folders in all workspace directories...');
    
    try {
      // Search for all JavaScript/TypeScript files that might contain step definitions
      const jsFiles = await vscode.workspace.findFiles(
        '**/*.{js,ts,mjs,mts,cjs,cts}', 
        '**/node_modules/**'
      );

      if (jsFiles.length === 0) {
        this.outputChannel.appendLine('⚠️ No JavaScript/TypeScript files found in workspace');
        return undefined;
      }

      // Enhanced step definition detection patterns - includes ALL types
      const stepPatterns = [
        // Standard Cucumber/BDD step definition patterns
        /\b(Given|When|Then|And|But)\s*\(/,
        /\b(given|when|then|and|but)\s*\(/,
        /@(Given|When|Then|And|But)/,
        
        // Step function calls with quotes
        /(Given|When|Then)\s*\(\s*['"`]/,
        
        // API and HTTP related patterns (for API-only steps)
        /axios\.|fetch\(|request\(|http\./,
        /\.get\(|\.post\(|\.put\(|\.delete\(|\.patch\(/,
        /api\.|API\.|endpoint|baseURL/,
        
        // Database and data patterns
        /query\(|execute\(|connection\.|database\./,
        /\.findOne\(|\.find\(|\.create\(|\.update\(|\.delete\(/,
        
        // Assertion and validation patterns
        /expect\(|assert\(|should\.|chai\./,
        /\.toBe\(|\.toEqual\(|\.toMatch\(/,
        
        // Common testing utilities
        /before\(|after\(|beforeEach\(|afterEach\(/,
        /describe\(|it\(|test\(/,
        
        // BDD-specific libraries and imports
        /playwright-bdd|@cucumber|cucumber/,
        /defineParameterType|setDefaultTimeout/,
        /from\s+['"]@cucumber|require\s*\(\s*['"]@cucumber/,
        
        // Step definition exports and modules
        /export.*step|module\.exports.*step/i,
        /export.*Given|export.*When|export.*Then/i,
        
        // File naming patterns
        /step.*def|.*steps\.|.*step\./i,
        
        // Configuration and setup patterns
        /config\.|setup\.|teardown\./,
        /environment\.|env\.|process\.env/,
        
        // Utility and helper patterns (often contain API steps)
        /utils\.|helpers\.|common\./,
        /shared\.|base\.|abstract\./,
        
        // Data manipulation patterns
        /JSON\.|parse\(|stringify\(/,
        /\.map\(|\.filter\(|\.reduce\(/,
        
        // File and system operations
        /fs\.|path\.|os\.|crypto\./,
        /readFile|writeFile|exists|mkdir/,
        
        // Date and time operations
        /Date\.|moment\(|dayjs\(/,
        /setTimeout|setInterval/,
        
        // Random and generation patterns
        /Math\.random|uuid|generate/,
        /faker\.|chance\./
      ];

      const stepDirs = new Map<string, { count: number; files: string[] }>();
      
      for (const file of jsFiles) {
        try {
          const content = await vscode.workspace.fs.readFile(file);
          const text = content.toString();
          const relativePath = vscode.workspace.asRelativePath(file);
          
          // Check if file contains step definition patterns
          const hasStepDefinitions = stepPatterns.some(pattern => pattern.test(text));
          
          if (hasStepDefinitions) {
            const dir = path.dirname(relativePath);
            
            if (!stepDirs.has(dir)) {
              stepDirs.set(dir, { count: 0, files: [] });
            }
            
            const dirInfo = stepDirs.get(dir)!;
            dirInfo.count++;
            dirInfo.files.push(path.basename(relativePath));
            
            this.outputChannel.appendLine(`🔧 Found step definitions in: ${relativePath}`);
          }
        } catch (error) {
          // Skip files we can't read
          continue;
        }
      }

      if (stepDirs.size === 0) {
        this.outputChannel.appendLine('⚠️ No step definition files found');
        return undefined;
      }

      // Find the best directory for step definitions
      let bestDir = '';
      let maxScore = 0;
      
      for (const [dir, info] of stepDirs.entries()) {
        // Score based on number of step files and directory depth (prefer shallower)
        const depthPenalty = dir.split('/').length * 0.1;
        const score = info.count - depthPenalty;
        
        if (score > maxScore) {
          maxScore = score;
          bestDir = dir;
        }
      }

      this.outputChannel.appendLine(`✅ Selected steps folder: ${bestDir} (${stepDirs.get(bestDir)?.count} step files)`);
      this.outputChannel.appendLine(`📊 Step definition distribution:`);
      
      for (const [dir, info] of stepDirs.entries()) {
        this.outputChannel.appendLine(`   ${dir}: ${info.count} file(s) [${info.files.join(', ')}]`);
      }
      
      return bestDir;
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error during step folder discovery: ${error}`);
      return undefined;
    }
  }

  /**
   * Discover tsconfig files
   */
  private async discoverTsconfig(): Promise<string | undefined> {
    const tsconfigFiles = [
      'tsconfig.json',
      'tests/tsconfig.json',
      'e2e/tsconfig.json',
      'test/tsconfig.json',
      'tsconfig.test.json'
    ];

    for (const configFile of tsconfigFiles) {
      const fullPath = path.join(this.workspaceRoot, configFile);
      if (await this.fileExists(fullPath)) {
        // Skip if it's the main tsconfig.json (usually not needed for tests)
        if (configFile !== 'tsconfig.json') {
          this.outputChannel.appendLine(`✅ Found tsconfig: ${configFile}`);
          return `./${configFile}`;
        }
      }
    }

    return undefined;
  }

  /**
   * Check if playwright-bdd is installed
   */
  private async checkPlaywrightBddDependency(): Promise<boolean> {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    
    if (await this.fileExists(packageJsonPath)) {
      try {
        const content = await this.readFileContent(packageJsonPath);
        const packageJson = JSON.parse(content);
        
        const hasDependency = 
          (packageJson.dependencies && packageJson.dependencies['playwright-bdd']) ||
          (packageJson.devDependencies && packageJson.devDependencies['playwright-bdd']);
        
        if (hasDependency) {
          this.outputChannel.appendLine(`✅ Found playwright-bdd dependency`);
          return true;
        }
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Error reading package.json: ${error}`);
      }
    }

    this.outputChannel.appendLine(`⚠️ playwright-bdd dependency not found`);
    return false;
  }

  /**
   * Check if package.json exists
   */
  private async checkPackageJson(): Promise<boolean> {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    return await this.fileExists(packageJsonPath);
  }

  /**
   * Update VS Code settings with discovered configuration
   */
  async applyDiscoveredConfiguration(config: ProjectConfiguration): Promise<void> {
    const vsConfig = vscode.workspace.getConfiguration('playwrightBdd');
    const updates: Array<{ key: string; value: any; discovered: string }> = [];

    if (config.playwrightConfig && vsConfig.get('configPath') === './playwright.config.ts') {
      updates.push({
        key: 'configPath',
        value: config.playwrightConfig,
        discovered: config.playwrightConfig
      });
    }

    if (config.featureFolder && vsConfig.get('featureFolder') === 'features') {
      updates.push({
        key: 'featureFolder',
        value: config.featureFolder,
        discovered: config.featureFolder
      });
    }

    if (config.stepsFolder && vsConfig.get('stepsFolder') === 'steps') {
      updates.push({
        key: 'stepsFolder',
        value: config.stepsFolder,
        discovered: config.stepsFolder
      });
    }

    if (config.tsconfigPath && !vsConfig.get('tsconfigPath')) {
      updates.push({
        key: 'tsconfigPath',
        value: config.tsconfigPath,
        discovered: config.tsconfigPath
      });
    }

    if (updates.length > 0) {
      this.outputChannel.appendLine(`\n🔧 Applying discovered configuration...`);
      
      for (const update of updates) {
        await vsConfig.update(update.key, update.value, vscode.ConfigurationTarget.Workspace);
        this.outputChannel.appendLine(`   ${update.key}: ${update.discovered}`);
      }

      vscode.window.showInformationMessage(
        `Auto-discovered and applied ${updates.length} configuration settings. Check Playwright BDD settings for details.`
      );
    } else {
      this.outputChannel.appendLine(`ℹ️ No configuration updates needed`);
    }
  }

  /**
   * Validate current configuration
   */
  async validateConfiguration(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const config = vscode.workspace.getConfiguration('playwrightBdd');

    // Check Playwright config
    const configPath = config.get<string>('configPath');
    if (configPath) {
      const fullConfigPath = path.join(this.workspaceRoot, configPath);
      if (!(await this.fileExists(fullConfigPath))) {
        issues.push(`Playwright config not found: ${configPath}`);
      }
    }

    // Check feature folder
    const featureFolder = config.get<string>('featureFolder');
    if (featureFolder) {
      const fullFeaturePath = path.join(this.workspaceRoot, featureFolder);
      if (!(await this.directoryExists(fullFeaturePath))) {
        issues.push(`Feature folder not found: ${featureFolder}`);
      }
    }

    // Check steps folder
    const stepsFolder = config.get<string>('stepsFolder');
    if (stepsFolder) {
      const fullStepsPath = path.join(this.workspaceRoot, stepsFolder);
      if (!(await this.directoryExists(fullStepsPath))) {
        issues.push(`Steps folder not found: ${stepsFolder}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Utility methods
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async hasFeatureFiles(dirPath: string): Promise<boolean> {
    try {
      const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
      return files.some(file => 
        (file.isFile() && file.name.endsWith('.feature')) ||
        (file.isDirectory() && file.name !== 'node_modules')
      );
    } catch {
      return false;
    }
  }

  private async hasStepDefinitionFiles(dirPath: string): Promise<boolean> {
    try {
      const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && /\.(js|ts|mjs|mts)$/.test(file.name)) {
          const content = await this.readFileContent(path.join(dirPath, file.name));
          if (this.looksLikeStepDefinition(content)) {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async readFileContent(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, 'utf8');
    } catch {
      return '';
    }
  }

  private looksLikeStepDefinition(content: string): boolean {
    const stepPatterns = [
      /\b(Given|When|Then|And|But)\s*\(/,
      /\b(given|when|then|and|but)\s*\(/,
      /@(Given|When|Then|And|But)/,
      /cucumber\.|@cucumber/,
      /playwright-bdd/
    ];

    return stepPatterns.some(pattern => pattern.test(content));
  }

  private logDiscoveryResults(config: ProjectConfiguration): void {
    this.outputChannel.appendLine('\n📋 Auto-discovery results:');
    this.outputChannel.appendLine(`   Playwright Config: ${config.playwrightConfig || 'Not found'}`);
    this.outputChannel.appendLine(`   Feature Folder: ${config.featureFolder || 'Not found'}`);
    this.outputChannel.appendLine(`   Steps Folder: ${config.stepsFolder || 'Not found'}`);
    this.outputChannel.appendLine(`   TSConfig: ${config.tsconfigPath || 'Not found'}`);
    this.outputChannel.appendLine(`   Playwright-BDD: ${config.hasPlaywrightBdd ? 'Installed' : 'Not found'}`);
    this.outputChannel.appendLine(`   Package.json: ${config.packageJsonExists ? 'Found' : 'Not found'}`);
  }
}
