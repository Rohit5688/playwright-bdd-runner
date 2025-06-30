# 🚀 Features Guide

This document provides a comprehensive overview of all features available in the Playwright BDD Test Runner extension.

## 📋 Table of Contents

- [Core Features](#core-features)
- [Test Discovery & Execution](#test-discovery--execution)
- [Debugging Features](#debugging-features)
- [Multi-Workspace Support](#multi-workspace-support)
- [CI/CD Integration](#cicd-integration)
- [Test Management](#test-management)
- [Advanced Features](#advanced-features)

## Core Features

### 🧪 BDD Test Support
- **Feature File Recognition**: Automatic detection of `.feature` files
- **Gherkin Syntax Support**: Full support for Given/When/Then/And/But statements
- **Scenario Outline Support**: Data-driven testing with Examples tables
- **Tag Support**: Filter tests using `@tag` annotations
- **Step Definition Linking**: Navigate from steps to their implementations

### 📁 Project Structure Support
- **Auto-Discovery**: Automatically finds Playwright config, feature folders, and step folders
- **Configurable Paths**: Customize feature and step folder locations
- **TypeScript Support**: Full TypeScript configuration support
- **Multiple Config Support**: Support for different Playwright configurations

## Test Discovery & Execution

### 🔍 Test Discovery
- **Incremental Discovery**: Only processes changed files for better performance
- **Caching System**: Intelligent caching to speed up subsequent discoveries
- **Real-time Updates**: Automatically refreshes when files change
- **Performance Optimized**: Fast discovery even with large test suites

### ▶️ Test Execution
- **Test Explorer Integration**: Run tests directly from VS Code Test Explorer
- **Individual Test Execution**: Run specific scenarios or features
- **Batch Execution**: Run multiple tests with queue management
- **Debug Mode**: Built-in debugging support with breakpoints
- **Retry Logic**: Configurable retry mechanism for flaky tests

### 📊 Test Results
- **Real-time Results**: Live updates during test execution
- **Execution History**: Track previous test runs and their outcomes
- **Performance Metrics**: Duration tracking and performance analysis
- **Export Capabilities**: Export test results and reports

## Debugging Features

### 🔧 Advanced Debugging
- **Step-by-Step Debugging**: Debug individual Gherkin steps
- **Smart Breakpoints**: Set breakpoints on specific steps
- **Conditional Breakpoints**: Breakpoints with custom conditions
- **Variable Inspection**: Inspect variables during step execution
- **Call Stack Analysis**: Full call stack visibility

### 📍 Breakpoint Management
- **Visual Breakpoints**: See breakpoints directly in feature files
- **Breakpoint Persistence**: Breakpoints saved across sessions
- **Bulk Operations**: Clear all breakpoints or manage multiple at once
- **Context-Sensitive**: Breakpoints with step-specific context

## Multi-Workspace Support

### 🏢 Workspace Management
- **Multiple Workspaces**: Manage multiple projects simultaneously
- **Workspace Switching**: Quick switching between active workspaces
- **Cross-Workspace Search**: Search tests across all workspaces
- **Workspace Groups**: Organize related workspaces into groups
- **Workspace Analytics**: Analytics and insights across workspaces

### 🔄 Synchronized Operations
- **Parallel Execution**: Run tests across multiple workspaces in parallel
- **Unified Results**: Consolidated test results from all workspaces
- **Shared Configuration**: Share settings across workspaces
- **Workspace Templates**: Create new workspaces from templates

## CI/CD Integration

### 🔄 GitHub Actions Integration
- **Workflow Management**: Create and manage GitHub Actions workflows
- **Automatic Triggers**: Trigger workflows from VS Code
- **Status Monitoring**: Monitor workflow execution status
- **Result Integration**: Import CI/CD results into VS Code
- **Branch-Based Execution**: Execute tests based on branch changes

### 📋 Report Integration
- **HTML Reports**: Generate and view HTML test reports
- **JSON Reports**: Export structured test data
- **Coverage Reports**: Test coverage analysis and reporting
- **Trend Analysis**: Track test performance over time
- **Integration APIs**: Custom integration with external tools

## Test Management

### 🔍 Advanced Search
- **Global Search**: Search across all tests and files
- **Filter by Tags**: Filter tests using tag-based queries
- **Advanced Filters**: Use complex filters (`tag:smoke feature:login`)
- **Result Export**: Export search results to various formats
- **Saved Searches**: Save frequently used search queries

### 📊 Test Organization
- **Tag Management**: Organize tests using tags
- **Feature Grouping**: Group related features together
- **Test Suites**: Create custom test suites for different purposes
- **Execution Queues**: Manage test execution with priority queues
- **Test Dependencies**: Handle test dependencies and prerequisites

### 📈 Analytics & Reporting
- **Execution Analytics**: Detailed analysis of test execution patterns
- **Performance Trending**: Track performance changes over time
- **Coverage Analysis**: Step definition coverage reporting
- **Success Rate Tracking**: Monitor test reliability
- **Custom Reports**: Create custom reports and dashboards

## Advanced Features

### 🛠️ Step Definition Management
- **Auto-Generation**: Automatically generate step definitions
- **Step Coverage Analysis**: Identify missing step definitions
- **Step Definition Wizard**: Interactive step creation wizard
- **Pattern Matching**: Smart pattern matching for step definitions
- **Refactoring Support**: Safe refactoring of step definitions

### ⚙️ Configuration Management
- **Settings UI**: Comprehensive settings management interface
- **Configuration Validation**: Validate settings for correctness
- **Import/Export**: Backup and restore extension settings
- **Profile Management**: Different configuration profiles
- **Auto-Discovery**: Automatic configuration detection

### 🔌 Extension Integration
- **VS Code Integration**: Deep integration with VS Code features
- **Theme Support**: Respects VS Code theme settings
- **Command Palette**: All features accessible via command palette
- **Status Bar**: Real-time status information
- **Notification System**: Smart notifications and alerts

### 🎨 User Interface
- **Test Explorer**: Enhanced test explorer with filtering
- **Settings Panel**: Comprehensive settings management
- **Progress Indicators**: Visual progress for long-running operations
- **Interactive Dialogs**: User-friendly configuration dialogs

## Feature Matrix

| Feature Category | Basic | Advanced |
|------------------|-------|----------|
| Test Discovery | ✅ | ✅ |
| Test Execution | ✅ | ✅ |
| Debugging | ✅ | ✅ |
| CI/CD Integration | ❌ | ✅ |
| Multi-Workspace | ❌ | ✅ |
| Advanced Analytics | ❌ | ✅ |
| Auto-Generation | ❌ | ✅ |

## Getting Started

To explore these features:

1. **Install the Extension**: Install from VS Code Marketplace
2. **Open a Project**: Open a project with `.feature` files
3. **Configure Settings**: Use the Settings UI to customize behavior
4. **Explore Test Explorer**: Use the enhanced test explorer for test management

## Performance Features

### ⚡ Optimization
- **Incremental Loading**: Only load changed tests
- **Background Processing**: Non-blocking test discovery
- **Memory Efficient**: Optimized memory usage for large projects
- **Parallel Processing**: Parallel test discovery and execution
- **Smart Caching**: Intelligent caching strategies

### 📊 Monitoring
- **Performance Metrics**: Track extension performance
- **Resource Usage**: Monitor CPU and memory usage
- **Execution Times**: Track test execution duration
- **Cache Hit Rates**: Monitor caching effectiveness
- **User Experience Metrics**: Track user interaction patterns

For detailed configuration instructions, see the [Settings Guide](SETTINGS.md).
For troubleshooting help, see the [Troubleshooting Guide](../TROUBLESHOOTING.md).
