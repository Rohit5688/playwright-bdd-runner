# 🚀 Getting Started Guide

Welcome to the Playwright BDD Test Runner! This guide will help you get up and running quickly.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [First Setup](#first-setup)
- [Running Your First Test](#running-your-first-test)
- [Exploring AI Features](#exploring-ai-features)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have:

- **VS Code**: Version 1.101.0 or higher
- **Node.js**: Version 16 or higher
- **A project** with `.feature` files (or create one following this guide)

## Installation

### Install the Extension

1. **Via VS Code Marketplace**:
   - Open VS Code
   - Go to Extensions (`Ctrl+Shift+X`)
   - Search for "BDD Test Runner"
   - Click "Install"

2. **Via Command Line**:
   ```bash
   code --install-extension rohitsakhawalkar.playwright-bdd-lens
   ```

### Install Project Dependencies

In your project directory:

```bash
# Install Playwright
npm install @playwright/test

# Optional: Install playwright-bdd for enhanced BDD support
npm install playwright-bdd
```

## First Setup

### 1. Create Project Structure

If you don't have an existing project, create this structure:

```
your-project/
├── features/
│   └── example.feature
├── steps/
│   └── example.steps.ts
├── playwright.config.ts
└── package.json
```

### 2. Create Example Files

#### `features/example.feature`
```gherkin
Feature: Getting Started

  Scenario: My first BDD test
    Given I open the Playwright homepage
    When I click on "Get Started"
    Then I should see the documentation
```

#### `steps/example.steps.ts`
```typescript
import { Given, When, Then } from '@playwright/test';

Given('I open the Playwright homepage', async ({ page }) => {
  await page.goto('https://playwright.dev');
});

When('I click on {string}', async ({ page }, buttonText: string) => {
  await page.click(`text=${buttonText}`);
});

Then('I should see the documentation', async ({ page }) => {
  await expect(page).toHaveTitle(/Playwright/);
});
```

#### `playwright.config.ts`
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './features',
  timeout: 30000,
  use: {
    headless: false,
    screenshot: 'only-on-failure',
  },
});
```

### 3. Auto-Configuration

1. **Open your project** in VS Code
2. **Open Command Palette** (`Ctrl+Shift+P`)
3. **Run**: "BDD Test Runner: Settings"
4. **Enable**: "Auto-Discover Configuration"
5. **Click**: "Auto-Discover Configuration" button

The extension will automatically detect your project structure!

## Running Your First Test

### Method 1: Test Explorer

1. **Open Test Explorer**:
   - Click the test tube icon in the Activity Bar
   - Or use `Ctrl+Shift+U`

2. **Find Your Tests**:
   - Look for "BDD Test Explorer" section
   - Expand to see your feature files

3. **Run a Test**:
   - Click the ▶️ button next to any scenario
   - Watch it execute in real-time

### Method 2: Command Palette

1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Type**: "Run Playwright BDD Tests"
3. **Select**: Your desired test or "All Tests"

### Method 3: CodeLens

1. **Open** any `.feature` file
2. **Look for** "Run Scenario" links above each scenario
3. **Click** to run immediately

## Exploring AI Features

### Enable AI Copilot

1. **Open Settings**:
   ```
   Command Palette → "BDD Test Runner: Settings"
   ```

2. **Navigate to "🤖 AI Copilot" section**

3. **Configure**:
   - ✅ Enable "AI Copilot Integration"
   - Set "Confidence Threshold" to 60
   - Set "Maximum Suggestions" to 5
   - Enable all feature toggles

### Use AI Assistant

#### Interactive Debug Assistant
1. **Position cursor** in any `.feature` file
2. **Command Palette** → "🤖 Copilot Debug Assistant"
3. **Explore** the interactive suggestions

#### AI Panel
1. **Open Test Explorer**
2. **Find "🤖 AI Copilot" panel**
3. **Try the quick action buttons**:
   - 🔍 Debug Assistant
   - 🎯 Smart Breakpoints
   - 💡 Fix Steps
   - 🔬 Analyze Failure
   - ⚡ Improve Tests

### Try Smart Features

#### Smart Breakpoints
1. **Open** a `.feature` file
2. **Command Palette** → "🤖 Suggest Smart Breakpoints"
3. **Review** AI suggestions for optimal breakpoint placement

#### Error Analysis
1. **Run a test** that fails
2. **Command Palette** → "🤖 Analyze Test Failure"
3. **Get** specific recommendations for fixing the issue

## Next Steps

### Explore Advanced Features

1. **Multi-Workspace Support**:
   - Open multiple projects
   - Use "Search Across Workspaces"
   - Run tests in parallel

2. **CI/CD Integration**:
   - Set up GitHub Actions integration
   - Configure workflow triggers
   - Monitor test results

3. **Advanced Debugging**:
   - Set conditional breakpoints
   - Use step-by-step debugging
   - Inspect variables during execution

### Customize Your Setup

1. **Review Settings**:
   - Explore all configuration options
   - Set up environment-specific configs
   - Export/import settings for team sharing

2. **Optimize Performance**:
   - Configure retry mechanisms
   - Set up intelligent caching
   - Tune AI confidence thresholds

### Learn More

- **[Features Guide](FEATURES.md)**: Complete feature overview
- **[Settings Guide](SETTINGS.md)**: Detailed configuration
- **[Troubleshooting](TROUBLESHOOTING.md)**: Common issues and solutions

## Quick Tips

### Keyboard Shortcuts
- `Ctrl+Shift+P`: Command Palette
- `Ctrl+Shift+U`: Test Explorer
- `F5`: Debug current scenario
- `Ctrl+F5`: Run without debugging

### Best Practices
1. **Use meaningful scenario names** for better test organization
2. **Enable auto-discovery** for effortless configuration
3. **Start with default AI settings** and adjust based on your needs
4. **Use tags** (`@smoke`, `@regression`) for test filtering
5. **Regular validation** of settings to catch issues early

### Common Patterns

#### Tag-Based Testing
```gherkin
@smoke @critical
Scenario: User login
  Given I am on the login page
  When I enter valid credentials
  Then I should be logged in
```

#### Data-Driven Testing
```gherkin
Scenario Outline: Multiple user types
  Given I am logged in as "<userType>"
  When I access "<feature>"
  Then I should see "<result>"

  Examples:
    | userType | feature | result |
    | admin    | users   | user list |
    | user     | profile | my profile |
```

## Troubleshooting Quick Fixes

### Tests Not Appearing?
1. Check `featureFolder` setting
2. Ensure `.feature` files exist
3. Run "Refresh Tests" command

### Step Definitions Not Found?
1. Verify `stepsFolder` setting
2. Check `stepsFilePattern` configuration
3. Use "Show Step Definitions" command

### AI Not Working?
1. Ensure `copilot.enabled` is true
2. Check confidence threshold (try lowering it)
3. Verify you're in a `.feature` file

### Performance Issues?
1. Disable `autoRefreshInterval`
2. Reduce `maxSuggestions`
3. Increase `confidenceThreshold`

## Getting Help

- 📚 **Documentation**: Check the [docs](.) directory
- 🔧 **Settings Validation**: Use "Validate Configuration"
- 📋 **Output Panel**: Check "Playwright BDD" for errors
- 💬 **Community**: [GitHub Discussions](https://github.com/Rohit5688/playwright-bdd-runner/discussions)

---

**You're all set!** Start writing tests and let the AI help you debug and optimize them. Happy testing! 🎉
