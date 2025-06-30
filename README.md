# 🎭 Playwright BDD Test Runner

A comprehensive VS Code extension for running Playwright BDD tests with advanced debugging and multi-workspace support.

[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=rohitsakhawalkar.playwright-bdd-lens)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.101.0+-brightgreen.svg)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🚀 Quick Start

1. **Install the Extension**: Search for "BDD Test Runner" in the VS Code Marketplace
2. **Open Your Project**: Open a workspace containing `.feature` files
3. **Configure**: Access settings via Command Palette → "BDD Test Runner: Settings"
4. **Run Tests**: Use the Test Explorer or Command Palette to execute your tests
5. **Start Testing**: Begin running and debugging your BDD tests

## ✨ Key Features

### 🧪 **Core BDD Testing**
- **Full Gherkin Support**: Given/When/Then/And/But statements with Scenario Outlines
- **Test Discovery**: Automatic detection and caching of feature files
- **Test Explorer Integration**: Native VS Code Test Explorer support
- **Step Definition Linking**: Navigate from steps to their implementations
- **Tag-Based Filtering**: Run specific test subsets using `@tag` annotations

### 🛠️ **Advanced Debugging**
- **Step-by-Step Debugging**: Debug individual Gherkin steps with full context
- **Visual Breakpoints**: Set breakpoints directly on feature file steps
- **Variable Inspection**: Inspect variables and application state during execution
- **Conditional Breakpoints**: Advanced breakpoint conditions for complex scenarios

### 🏢 **Multi-Workspace Support**
- **Workspace Management**: Handle multiple projects simultaneously
- **Cross-Workspace Search**: Search tests across all open workspaces
- **Parallel Execution**: Run tests across multiple workspaces in parallel
- **Workspace Analytics**: Track performance and metrics across projects

### 🔄 **CI/CD Integration**
- **GitHub Actions**: Built-in GitHub workflow management
- **Workflow Triggers**: Trigger CI/CD pipelines directly from VS Code
- **Report Integration**: Import and view CI/CD test results
- **Status Monitoring**: Real-time workflow status updates

### ⚙️ **Comprehensive Configuration**
- **Settings UI**: User-friendly configuration interface
- **Auto-Discovery**: Automatic project configuration detection
- **Import/Export**: Backup and share configuration settings
- **Validation**: Built-in configuration validation and error detection

## 📚 Documentation

### 📖 **Complete Guides**
- **[🚀 Features Guide](docs/FEATURES.md)** - Comprehensive overview of all features
- **[⚙️ Settings Guide](docs/SETTINGS.md)** - Complete configuration documentation
- **[🔧 Troubleshooting](docs/TROUBLESHOOTING.md)** - Solutions for common issues
- **[🎨 UI Guide](docs/UI_GUIDE.md)** - User interface and navigation
- **[🧪 Test Settings](docs/TEST_SETTINGS.md)** - Test-specific configuration

### 🎯 **Quick Links**
- [Installation & Setup](#installation--setup)
- [Basic Usage](#basic-usage)
- [Advanced Features](#advanced-features)
- [Contributing](#contributing)

## 🛠️ Installation & Setup

### Prerequisites
- **VS Code**: Version 1.101.0 or higher
- **Node.js**: Version 16 or higher
- **Playwright**: Installed in your project (`npm install @playwright/test`)
- **Playwright BDD**: Optional, for enhanced BDD support (`npm install playwright-bdd`)

### Installation Steps

1. **Install Extension**:
   ```bash
   # Via VS Code Marketplace
   code --install-extension rohitsakhawalkar.playwright-bdd-lens
   ```

2. **Open Project**: Open a workspace containing `.feature` files

3. **Auto-Configuration**: The extension will automatically detect your project structure

4. **Manual Configuration** (if needed):
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run "BDD Test Runner: Settings"
   - Configure paths and preferences

### Project Structure

```
your-project/
├── features/                 # Feature files (.feature)
│   ├── login.feature
│   └── dashboard.feature
├── steps/                    # Step definitions
│   ├── login.steps.ts
│   └── common.steps.ts
├── playwright.config.ts      # Playwright configuration
└── package.json
```

## 🎮 Basic Usage

### Running Tests

#### Via Test Explorer
1. Open the **Test Explorer** panel in VS Code
2. Find the **"BDD Test Explorer"** section
3. Click ▶️ to run individual tests or entire features
4. View results in real-time

#### Via Command Palette
- `Ctrl+Shift+P` → "Run Playwright BDD Tests"
- Choose specific scenarios or run all tests

#### Via CodeLens
- Open any `.feature` file
- Click the "Run Scenario" links above each scenario

### Debugging Tests

#### Setting Breakpoints
1. Open a `.feature` file
2. Click in the gutter next to any step to set a breakpoint
3. Run the test in debug mode
4. Execution will pause at your breakpoint

#### Step-by-Step Debugging
1. Position cursor on a scenario
2. Command Palette → "Start Step-by-Step Debugging"
3. Step through each Gherkin step individually

## 🔧 Advanced Features

### Multi-Workspace Management

#### Setting Up Multiple Workspaces
1. Open multiple workspace folders in VS Code
2. Extension automatically detects all workspaces
3. Use "Show Workspaces" command to manage

#### Cross-Workspace Operations
- **Search**: `Command Palette → "Search Across Workspaces"`
- **Run Tests**: `Command Palette → "Run Tests Across Workspaces"`
- **Analytics**: `Command Palette → "Workspace Analytics"`

### CI/CD Integration

#### GitHub Actions Setup
1. **Configure Token**:
   - Settings → CI/CD Integration → GitHub Token
   - Provide Personal Access Token with workflow permissions

2. **Enable Integration**:
   - Enable "CI/CD Integration"
   - Set "Auto-Trigger Workflows" if desired

3. **Manage Workflows**:
   - `Command Palette → "Manage GitHub Workflows"`
   - Create, trigger, and monitor workflows

### Custom Configuration

#### Environment-Specific Settings

**Development**:
```json
{
  "playwrightBdd.tags": "@dev",
  "playwrightBdd.execution.retryCount": 1
}
```

**Production**:
```json
{
  "playwrightBdd.tags": "@smoke",
  "playwrightBdd.execution.retryCount": 3
}
```

#### Custom Commands
```json
{
  "playwrightBdd.testCommand": "npx playwright test --config=custom.config.ts ${tagsArg}",
  "playwrightBdd.featureGenCommand": "npm run generate-features"
}
```

## 📊 Configuration Examples

### Minimal Setup
```json
{
  "playwrightBdd.configPath": "./playwright.config.ts",
  "playwrightBdd.featureFolder": "features",
  "playwrightBdd.stepsFolder": "steps"
}
```

### Full Featured Setup
```json
{
  "playwrightBdd.configPath": "./playwright.config.ts",
  "playwrightBdd.featureFolder": "features",
  "playwrightBdd.stepsFolder": "steps",
  "playwrightBdd.autoDiscoverConfig": true,
  "playwrightBdd.execution.retryCount": 2,
  "playwrightBdd.execution.retryDelay": 2000,
  "playwrightBdd.cicd.enabled": true
}
```

### Performance Optimized
```json
{
  "playwrightBdd.ui.autoRefreshInterval": 0,
  "playwrightBdd.stepsFilePattern": "**/*.steps.{js,ts}"
}
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
```bash
# Clone the repository
git clone https://github.com/Rohit5688/playwright-bdd-runner.git

# Install dependencies
cd playwright-bdd-runner
npm install

# Build the extension
npm run compile

# Run tests
npm test
```

### Contributing Guidelines
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Areas for Contribution
- 🐛 **Bug Fixes**: Help us identify and fix issues
- ✨ **Features**: Implement new functionality
- 📚 **Documentation**: Improve guides and examples
- 🧪 **Testing**: Add test coverage
- 🎨 **UI/UX**: Enhance user experience

## 📝 Changelog

### Version 0.4.0 (Latest)
- ✨ **NEW**: Comprehensive Settings UI with all configuration options
- ✨ **NEW**: Retry mechanism with configurable count and delay
- ✨ **NEW**: Import/Export settings functionality
- 🛠️ **IMPROVED**: Enhanced error analysis and debugging
- 🛠️ **IMPROVED**: Better test discovery performance with caching
- 🛠️ **IMPROVED**: Multi-workspace support and management
- 🛠️ **IMPROVED**: CI/CD integration with GitHub Actions

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

## 🆘 Support & Help

### Getting Help
1. **Documentation**: Check our comprehensive [docs](docs/) directory
2. **Settings Validation**: Use "Validate Configuration" in Settings UI
3. **Output Panel**: Check the "Playwright BDD" output for error details
4. **Issues**: Report bugs on [GitHub Issues](https://github.com/Rohit5688/playwright-bdd-runner/issues)

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Tests not discovered | Check `featureFolder` setting and file structure |
| Step definitions not found | Verify `stepsFolder` and `stepsFilePattern` |
| Performance issues | Disable `autoRefreshInterval` for better performance |

### Community
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Rohit5688/playwright-bdd-runner/discussions)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Rohit5688/playwright-bdd-runner/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/Rohit5688/playwright-bdd-runner/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Playwright Team**: For the excellent testing framework
- **VS Code Team**: For the robust extension platform
- **BDD Community**: For valuable feedback and contributions
- **Contributors**: Everyone who has helped improve this extension

---

**Made with ❤️ for the testing community**

[⬆️ Back to top](#-playwright-bdd-test-runner)
