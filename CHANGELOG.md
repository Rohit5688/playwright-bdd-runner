# Changelog

All notable changes to the Playwright BDD Test Runner extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.3] - 2025-11-26

### Fixed
- **Go to Definition Priority**: Fixed issue where "Go to Definition" would sometimes jump to an incorrect step definition
  - Prioritized Exact and Regex matches over Fuzzy and Structural matches
  - Ensures that steps with complex parameters (like `{ $testInfo }`) are correctly matched to their definitions
  - Prevents structural matches from shadowing more accurate regex matches
## [0.4.2] - 2025-11-26

### Added
- **Generate Step Definition**: New context menu command to generate individual step definitions from feature files
  - Right-click on any step in a `.feature` file and select "Generate Step Definition"
  - Automatically detects step parameters and generates appropriate Cucumber expressions (`{string}`, `{int}`, `{float}`)
  - Smart placeholder generation for quoted strings, integers, and floating-point numbers
  - Option to append to existing step definition files or create new ones
- **Generate All Step Definitions**: Bulk generation command for creating multiple step definitions at once
  - Right-click in a `.feature` file and select "Generate All Step Definitions"
  - Analyzes entire feature file and identifies all missing step definitions
  - Generates all steps in a single operation to the same target file
  - Saves time when setting up step definitions for new feature files

### Fixed
- **File Append Logic**: Fixed issue where selecting an existing file would create a new file instead of appending
  - Now correctly uses `fs.existsSync()` for reliable file existence checking
  - Appends step definitions to existing files without duplicating imports
  - Creates new files with proper `playwright-bdd` imports when needed
  - Added debug logging to track file operations in the Output channel

### Technical Details
- Updated `generateStepDefinition()` method in `stepCreationWizard.ts` with robust file existence checking
- Implemented `createStepsFromFeature()` method for bulk step generation
- Registered new commands in `extension.ts`: `playwright-bdd.generateStepDefinitions` and `playwright-bdd.generateAllStepDefinitions`
- Added commands to editor context menu for `.feature` files
- Step pattern generation uses Cucumber expression syntax for better compatibility


## [0.4.1] - 2025-01-25

### Fixed
- **Step Definition Navigation**: Fixed "Go to Definition" (F12) for steps with scenario outline placeholders
  - Steps like `Given I open the '<value>' homepage` now correctly match definitions with `{string}` parameters
  - Improved pattern matching order to handle scenario outline placeholders before Cucumber parameter types
- **Step Validation**: Added real-time diagnostic provider for feature files
  - Feature files now show warnings for steps without matching definitions
  - Yellow underline indicators appear immediately for undefined steps
  - Automatic validation when files are opened, changed, or modified

### Technical Details
- Refactored `findMatchingStep()` method in `stepDefinitionProvider.ts` to process placeholders in correct order
- Added `validateFeatureFile()` method with diagnostic collection
- Registered document change listeners for real-time validation feedback

## [0.4.0] - 2025-06-30

### Added
- Comprehensive Settings UI with all configuration options
- Retry mechanism with configurable count and delay
- Import/Export settings functionality
- Enhanced error analysis and debugging
- Better test discovery performance with caching
- Multi-workspace support and management
- CI/CD integration with GitHub Actions
