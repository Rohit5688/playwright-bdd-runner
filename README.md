# BDD TEST RUNNER

**Run Playwright BDD (Gherkin) tests directly from Visual Studio Code with Test Explorer integration, scenario and feature CodeLens, and feature file support.**

---

## Features

- **Test Explorer Integration:**  
  View, run, and debug Playwright BDD scenarios and features from the VS Code Testing sidebar.

- **Scenario & Feature CodeLens:**  
  Inline “▶ Run Scenario” and “▶ Run Feature” buttons above each scenario and at the top of `.feature` files for quick execution.

- **Run & Debug Feature:**  
  Run or debug an entire feature file (all scenarios and examples) directly from the Test Explorer or using the `Run Feature`/`Debug Feature` command or CodeLens.

- **Run & Debug Scenario:**  
  Run or debug individual scenarios or examples directly from the Test Explorer or CodeLens.

- **Scenario Outline Support:**  
  Each example row in a Scenario Outline is discovered as a separate test case. Run or debug all or individual examples directly from the Test Explorer or CodeLens.

- **Precise Example Execution:**  
  When you run or debug a single example from a Scenario Outline (via Test Explorer), only that example is executed (not all examples), thanks to line-number-based execution.

- **Refresh BDD Tests:**  
  Use the `Refresh BDD Tests` command from the Command Palette or context menu to manually reload and rediscover all feature files and scenarios.

- **Native Test Explorer Filtering:**  
  Use the built-in filter/search box at the top of the Testing sidebar to quickly find scenarios, features, or examples by name or tag.  
  > _Tip: Tags are searchable if included in the scenario label or description._

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
  "playwrightBdd.debugCommand": "npx playwright test --debug ${testTarget} ${tsconfigArg} --config=${configPath} ${tagsArg}",
  "playwrightBdd.enableFeatureGen": true,
  "playwrightBdd.featureFolder": "features"
}
```

---

## Usage

- **Test Explorer:**  
  Open the Testing sidebar to view and run or debug discovered features and scenarios.  
  Use the built-in filter/search box at the top of the Testing sidebar to quickly find scenarios, features, or examples by name or tag.

- **Run/Debug Feature:**  
  Right-click a feature file in the Test Explorer and select “Run Feature” or “Debug Feature” to execute or debug all scenarios and examples in that file.

- **CodeLens:**  
  Open a `.feature` file and click:
  - “▶ Run Feature” or “🐞 Debug Feature” at the top of the file to run or debug all scenarios and examples in that feature.
  - “▶ Run Scenario” or “🐞 Debug Scenario” above any scenario to run or debug just that scenario.

- **Commands:**  
  - `Run Playwright BDD Tests`
  - `Run Feature`
  - `Debug Feature`
  - `Run Scenario`
  - `Debug Scenario`
  - `Run Scenario with Feature Generation`
  - `Terminate Playwright BDD Tests`
  - `Run Scenario or Feature (Dynamic)`
  - `Refresh BDD Tests`

  Access via Command Palette (`Cmd+Shift+P`) or right-click context menus.

- **Status Bar:**  
  Click the beaker icon to run all BDD tests.

- **Output:**  
  View logs and errors in the “Playwright BDD” output channel.

---

### Scenario Outline Support

- The extension fully supports [Scenario Outline](https://cucumber.io/docs/gherkin/reference/#scenario-outline) in your `.feature` files.
- Each example row in a Scenario Outline is discovered as a separate test case in the VS Code Test Explorer.

#### Running or Debugging Individual Examples

- **From the Test Explorer:**  
  Expand the Scenario Outline node to see all examples. Click the play or debug button next to any example to run or debug it individually.  
  > **Only the selected example will run or debug, not the entire outline.**  
  This is achieved by passing the correct line number to Playwright, ensuring precise execution.

- **From CodeLens:**  
  If you have CodeLens enabled, you’ll see “▶ Run Scenario” and “🐞 Debug Scenario” buttons above the Scenario Outline. These run or debug all examples for that outline.

- **From Commands:**  
  Use the Command Palette (`Cmd+Shift+P`) and select:
  - `Run Scenario` or `Debug Scenario` to run or debug all examples for a scenario.
  - `Run Scenario or Feature (Dynamic)` to run or debug a specific example by providing a tag or example name.

- **Tag Filtering:**  
  You can filter and run or debug specific examples by tagging them in your `.feature` file and setting the `playwrightBdd.tags` configuration.

---

## Advanced

- **Custom Test/Feature Generation Commands:**  
  Use placeholders like `${configPath}`, `${tsconfigArg}`, `${tagsArg}`, and `${testTarget}` in your commands for dynamic substitution.

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