# ⚙️ Settings Guide

This document provides comprehensive information about configuring the Playwright BDD Test Runner extension.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Settings UI](#settings-ui)
- [Core Configuration](#core-configuration)
- [Test Execution Settings](#test-execution-settings)
- [AI Copilot Configuration](#ai-copilot-configuration)
- [UI & Display Settings](#ui--display-settings)
- [Discovery & Automation](#discovery--automation)
- [CI/CD Integration](#cicd-integration)
- [Advanced Configuration](#advanced-configuration)
- [Import/Export Settings](#importexport-settings)

## Quick Start

### Accessing Settings

1. **Via Command Palette**: 
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "BDD Test Runner: Settings"
   - Press Enter

2. **Via Test Explorer**:
   - Open the Test Explorer panel
   - Click the settings gear icon in the BDD Test Explorer

3. **Via Extension Settings**:
   - Go to VS Code Settings (`Ctrl+,`)
   - Search for "playwrightBdd"

## Settings UI

The extension provides a comprehensive settings interface with organized sections:

### Settings Sections
- **Core Configuration**: Essential project setup
- **Test Execution**: Test running and retry configuration
- **🤖 AI Copilot**: AI-powered assistance settings
- **Discovery & Automation**: Auto-discovery features
- **CI/CD Integration**: GitHub Actions and workflow settings
- **User Interface**: UI customization options

### Settings Actions
- **💾 Save All Settings**: Save all current settings
- **🔄 Reset to Defaults**: Reset all settings to default values
- **📋 Export Settings**: Export settings to JSON file
- **📁 Import Settings**: Import settings from JSON file
- **✅ Validate Configuration**: Check settings for correctness

## Core Configuration

### Essential Settings

#### `playwrightBdd.configPath`
- **Type**: String (Path)
- **Default**: `./playwright.config.ts`
- **Description**: Path to your Playwright configuration file
- **Example**: `./configs/playwright.config.js`

#### `playwrightBdd.featureFolder`
- **Type**: String (Path)
- **Default**: `features`
- **Description**: Folder containing your `.feature` files
- **Example**: `tests/features` or `src/features`

#### `playwrightBdd.stepsFolder`
- **Type**: String (Path)
- **Default**: `steps`
- **Description**: Folder containing step definition files
- **Example**: `tests/steps` or `src/step-definitions`

#### `playwrightBdd.tsconfigPath`
- **Type**: String (Path, Optional)
- **Default**: `""` (empty)
- **Description**: Custom TypeScript configuration for tests
- **Example**: `./tsconfig.test.json`

### Auto-Discovery

#### `playwrightBdd.autoDiscoverConfig`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Automatically discover project configuration
- **Benefits**: Reduces manual configuration, adapts to project structure

## Test Execution Settings

### Command Configuration

#### `playwrightBdd.testCommand`
- **Type**: String (Command Template)
- **Default**: `npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}`
- **Description**: Template for running Playwright tests
- **Placeholders**:
  - `${configPath}`: Replaced with config path
  - `${tsconfigArg}`: Replaced with TypeScript config argument
  - `${tagsArg}`: Replaced with tag filter arguments

#### `playwrightBdd.featureGenCommand`
- **Type**: String (Command Template)
- **Default**: `npx bddgen --config=${configPath}`
- **Description**: Command to generate features before testing
- **Use Case**: When using playwright-bdd package for feature generation

#### `playwrightBdd.enableFeatureGen`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Run feature generation before tests

### Test Filtering

#### `playwrightBdd.tags`
- **Type**: String
- **Default**: `""` (empty)
- **Description**: Default tag filter for test execution
- **Examples**: 
  - `@smoke` - Run only smoke tests
  - `@smoke,@regression` - Run smoke and regression tests
  - `@smoke and not @slow` - Complex tag expressions

### Retry Configuration

#### `playwrightBdd.execution.retryCount`
- **Type**: Number (1-10)
- **Default**: `2`
- **Description**: Number of retry attempts for failed tests
- **Notes**: 
  - `1` = No retry (run once)
  - `2` = 1 retry (run up to 2 times)
  - `3` = 2 retries (run up to 3 times)

#### `playwrightBdd.execution.retryDelay`
- **Type**: Number (100-30000 milliseconds)
- **Default**: `2000`
- **Description**: Delay between retry attempts
- **Recommendations**:
  - `1000` for fast feedback
  - `2000` for moderate delay
  - `5000` for slower environments

## AI Copilot Configuration

### Core AI Settings

#### `playwrightBdd.copilot.enabled`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Enable AI-powered debugging assistance
- **Impact**: Controls all AI features in the extension

#### `playwrightBdd.copilot.autoShowSuggestions`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Automatically show suggestions when debugging starts
- **Behavior**: Shows copilot panel when debug sessions begin

### Suggestion Configuration

#### `playwrightBdd.copilot.confidenceThreshold`
- **Type**: Number (0-100)
- **Default**: `60`
- **Description**: Minimum confidence level for showing suggestions
- **Usage**:
  - `30-50`: Show more suggestions (some may be less relevant)
  - `60-70`: Balanced approach (recommended)
  - `80-90`: Only high-confidence suggestions

#### `playwrightBdd.copilot.maxSuggestions`
- **Type**: Number (1-20)
- **Default**: `5`
- **Description**: Maximum number of suggestions to display
- **Performance**: Lower values improve UI responsiveness

### Feature Toggles

#### `playwrightBdd.copilot.enableStepAnalysis`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Analyze individual steps for issues and improvements

#### `playwrightBdd.copilot.enableErrorAnalysis`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Automatically analyze error messages

#### `playwrightBdd.copilot.enablePerformanceHints`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Show performance optimization suggestions

#### `playwrightBdd.copilot.smartBreakpoints`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Enable intelligent breakpoint placement suggestions

### AI Provider Configuration

#### `playwrightBdd.copilot.apiProvider`
- **Type**: Dropdown
- **Default**: `local`
- **Options**:
  - `local`: Built-in rule-based suggestions
  - `openai`: OpenAI API integration (future)
  - `github-copilot`: GitHub Copilot integration (future)
  - `custom`: Custom API endpoint

#### `playwrightBdd.copilot.customApiEndpoint`
- **Type**: String (URL)
- **Default**: `""` (empty)
- **Description**: Custom API endpoint for AI suggestions
- **Example**: `https://api.example.com/v1/suggestions`
- **Required When**: `apiProvider` is set to `custom`

## UI & Display Settings

### Test Explorer

#### `playwrightBdd.ui.showTagFilters`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Show tag filtering options in test explorer

#### `playwrightBdd.ui.showStatusFilters`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Show status filtering options in test explorer

#### `playwrightBdd.ui.showExecutionHistory`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Enable test execution history tracking

### Copilot Panel

#### `playwrightBdd.ui.showCopilotPanel`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Show the AI Copilot panel in test explorer
- **Impact**: Hides/shows the entire copilot UI panel

### Performance

#### `playwrightBdd.ui.autoRefreshInterval`
- **Type**: Number (seconds)
- **Default**: `0`
- **Description**: Interval for auto-refreshing test discovery
- **Values**:
  - `0`: Disabled (recommended)
  - `30`: Refresh every 30 seconds
  - `60`: Refresh every minute

## Discovery & Automation

### File Patterns

#### `playwrightBdd.stepsFilePattern`
- **Type**: String (Glob Pattern)
- **Default**: `**/*.{js,ts,mjs,mts}`
- **Description**: Pattern for finding step definition files
- **Examples**:
  - `**/*.steps.{js,ts}`: Only files ending with .steps
  - `**/step-definitions/**/*.{js,ts}`: Files in step-definitions folders

### Auto-Discovery Behavior

When `autoDiscoverConfig` is enabled, the extension automatically:
1. Searches for Playwright configuration files
2. Detects feature file locations
3. Finds step definition folders
4. Applies discovered settings

## CI/CD Integration

### GitHub Actions

#### `playwrightBdd.cicd.githubToken`
- **Type**: String (Token)
- **Default**: `""` (empty)
- **Description**: Personal Access Token for GitHub API
- **Security**: Stored securely in VS Code secrets
- **Permissions**: Requires workflow permissions

#### `playwrightBdd.cicd.autoTriggerWorkflows`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Automatically trigger workflows on test execution
- **Use Case**: Useful for continuous integration workflows

### CI/CD Platform Support

#### `playwrightBdd.cicd.mode`
- **Type**: Dropdown
- **Default**: `github`
- **Options**: `github`, `gitlab`, `azure`, `jenkins`, `custom`
- **Description**: CI/CD platform integration mode

#### `playwrightBdd.cicd.enabled`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable CI/CD integration features

## Advanced Configuration

### Custom Command Templates

You can customize command templates using placeholders:

```bash
# Custom test command with additional options
npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg} --reporter=html

# Custom feature generation with environment
NODE_ENV=test npx bddgen --config=${configPath} --output-dir=generated
```

### Environment-Specific Settings

Create different configurations for different environments:

#### Development
```json
{
  "playwrightBdd.tags": "@dev",
  "playwrightBdd.execution.retryCount": 1,
  "playwrightBdd.copilot.confidenceThreshold": 50
}
```

#### Production
```json
{
  "playwrightBdd.tags": "@smoke",
  "playwrightBdd.execution.retryCount": 3,
  "playwrightBdd.copilot.confidenceThreshold": 80
}
```

### Performance Optimization

For large projects:
- Set `autoRefreshInterval` to 0
- Increase `confidenceThreshold` to reduce AI processing
- Reduce `maxSuggestions` for faster UI
- Use specific `stepsFilePattern` to limit file scanning

## Import/Export Settings

### Exporting Settings

1. Open Settings UI
2. Click "📋 Export Settings"
3. Save the generated JSON file
4. Share or backup the configuration

### Importing Settings

1. Open Settings UI
2. Click "📁 Import Settings"
3. Select your JSON configuration file
4. Settings will be automatically applied

### Example Settings Export

```json
{
  "timestamp": "2025-06-30T15:30:00.000Z",
  "version": "0.4.0",
  "settings": {
    "playwrightBdd.configPath": "./playwright.config.ts",
    "playwrightBdd.featureFolder": "features",
    "playwrightBdd.stepsFolder": "steps",
    "playwrightBdd.copilot.enabled": true,
    "playwrightBdd.copilot.confidenceThreshold": 70,
    "playwrightBdd.execution.retryCount": 2
  }
}
```

## Validation & Troubleshooting

### Settings Validation

The extension automatically validates:
- File paths exist
- Retry counts are within limits
- Confidence thresholds are valid percentages
- Command templates have proper placeholders

### Common Issues

#### Configuration Not Found
- **Problem**: Playwright config file not found
- **Solution**: Update `configPath` or enable `autoDiscoverConfig`

#### Tests Not Discovered
- **Problem**: No feature files found
- **Solution**: Check `featureFolder` setting and file structure

#### Step Definitions Missing
- **Problem**: Steps not linking to definitions
- **Solution**: Verify `stepsFolder` and `stepsFilePattern` settings

#### AI Features Not Working
- **Problem**: Copilot not providing suggestions
- **Solution**: Ensure `copilot.enabled` is true and check confidence threshold

### Getting Help

If you encounter issues:
1. Use "✅ Validate Configuration" in Settings UI
2. Check the Output panel for error messages
3. Refer to the [Troubleshooting Guide](../TROUBLESHOOTING.md)
4. Reset to defaults if needed

## Best Practices

### Recommended Settings for Teams

```json
{
  "playwrightBdd.autoDiscoverConfig": true,
  "playwrightBdd.execution.retryCount": 2,
  "playwrightBdd.copilot.enabled": true,
  "playwrightBdd.copilot.confidenceThreshold": 65,
  "playwrightBdd.ui.showExecutionHistory": true
}
```

### Performance-Optimized Settings

```json
{
  "playwrightBdd.ui.autoRefreshInterval": 0,
  "playwrightBdd.copilot.maxSuggestions": 3,
  "playwrightBdd.copilot.confidenceThreshold": 75
}
```

For more information about features, see the [Features Guide](FEATURES.md).
For troubleshooting help, see the [Troubleshooting Guide](../TROUBLESHOOTING.md).
