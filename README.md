# BDD TEST RUNNER

**Run Playwright BDD (Gherkin) tests directly from Visual Studio Code with Test Explorer integration, scenario and feature CodeLens, and feature file support.**

---

## Features

- **Test Explorer Integration:**  
  View, run, and debug Playwright BDD scenarios and features from the VS Code Testing sidebar.

- **Scenario & Feature CodeLens:**  
  Inline “▶ Run Scenario” and “▶ Run Feature” buttons above each scenario and at the top of `.feature` files for quick execution.

- **Run Feature:**  
  Run an entire feature file (all scenarios and examples) directly from the Test Explorer or using the `Run Feature` command or CodeLens.

- **Scenario Outline Support:**  
  Each example row in a Scenario Outline is discovered as a separate test case. Run all or individual examples directly from the Test Explorer or CodeLens.

- **Precise Example Execution:**  
  When you run a single example from a Scenario Outline (via Test Explorer), only that example is executed (not all examples), thanks to line-number-based execution.

- **Custom Commands:**  
  - Run all tests
  - Run individual scenarios
  - Run scenario with feature generation
  - Run an entire feature
  - Terminate running tests
  - Filter scenarios by tags

- **Configurable:**  
  - Custom Playwright config and tsconfig paths
  - Custom test and feature generation commands
  - Tag-based test filtering

- **Status Bar Integration:**  
  Quick access to run all BDD tests from the VS Code status bar.

- **Automatic Test Discovery:**  
  Watches your feature files and updates the test tree on changes.

- **Rich Output:**  
  View detailed logs and errors in the “Playwright BDD” output channel.

---

## Getting Started

### 1. **Install the Extension**

Search for **“BDD Test Runner”** in the VS Code Extensions Marketplace and install.

### 2. **Project Setup**

- Ensure you have [Playwright](https://playwright.dev/) and [playwright-bdd](https://github.com/vitalets/playwright-bdd) installed in your project.
- Place your `.feature` files in the `features` folder (default) or configure a custom folder.

### 3. **Configuration (Optional)**

You can customize extension behavior in your VS Code settings (`.vscode/settings.json`):

```json
{
  "playwrightBdd.configPath": "./playwright.config.ts",
  "playwrightBdd.tsconfigPath": "--tsconfig=./tsconfig.json",
  "playwrightBdd.tags": "",
  "playwrightBdd.featureGenCommand": "npx bddgen --config=${configPath}",
  "playwrightBdd.testCommand": "npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}",
  "playwrightBdd.enableFeatureGen": true,
  "playwrightBdd.featureFolder": "features"
}
```

---

## Usage

- **Test Explorer:**  
  Open the Testing sidebar to view and run discovered features and scenarios.

- **Run Feature:**  
  Right-click a feature file in the Test Explorer and select “Run Feature” to execute all scenarios and examples in that file.

- **CodeLens:**  
  Open a `.feature` file and click:
  - “▶ Run Feature” at the top of the file to run all scenarios and examples in that feature.
  - “▶ Run Scenario” above any scenario to run just that scenario.

- **Commands:**  
  - `Run Playwright BDD Tests`
  - `Run Feature`
  - `Run Scenario`
  - `Run Scenario with Feature Generation`
  - `Terminate Playwright BDD Tests`
  - `Filter Scenarios`
  - `Run Scenario or Feature (Dynamic)`

  Access via Command Palette (`Cmd+Shift+P`) or right-click context menus.

- **Status Bar:**  
  Click the beaker icon to run all BDD tests.

- **Output:**  
  View logs and errors in the “Playwright BDD” output channel.

---

### Scenario Outline Support

- The extension fully supports [Scenario Outline](https://cucumber.io/docs/gherkin/reference/#scenario-outline) in your `.feature` files.
- Each example row in a Scenario Outline is discovered as a separate test case in the VS Code Test Explorer.

#### Running Individual Examples

- **From the Test Explorer:**  
  Expand the Scenario Outline node to see all examples. Click the play button next to any example to run it individually.  
  > **Only the selected example will run, not the entire outline.**  

- **From CodeLens:**  
  If you have CodeLens enabled, you’ll see a “▶ Run Scenario” button above the Scenario Outline. This runs all examples for that outline.

- **From Commands:**  
  Use the Command Palette (`Cmd+Shift+P`) and select:
  - `Run Scenario` to run all examples for a scenario.
  - `Run Scenario or Feature (Dynamic)` to run a specific example by providing a tag or example name.

- **Tag Filtering:**  
  You can filter and run specific examples by tagging them in your `.feature` file and setting the `playwrightBdd.tags` configuration.

---

## Advanced

- **Custom Test/Feature Generation Commands:**  
  Use placeholders like `${configPath}`, `${tsconfigArg}`, and `${tagsArg}` in your commands for dynamic substitution.

- **Tag Filtering:**  
  Set `playwrightBdd.tags` to filter scenarios or examples by tags (e.g., `@smoke`).

---

## Contributing

1. Fork the repo and clone.
2. Run `npm install`.
3. Open in VS Code and press `F5` to launch the extension development host.
4. Submit pull requests for improvements or bug fixes!

---

## License

[MIT](LICENSE)

---

## Credits

- [Playwright](https://playwright.dev/)
- [playwright-bdd](https://github.com/vitalets/playwright-bdd)
- [VS Code Extension API](https://code.visualstudio.com/api)

---

## Issues & Feedback

Please [open an issue](https://github.com/Rohit5688/playwright-bdd-runner/issues) for bugs, feature requests, or questions.