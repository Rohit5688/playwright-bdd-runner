# 🎭 Playwright BDD Test Runner

A Visual Studio Code extension to run Playwright BDD tests with ease. This extension integrates with the **Test Explorer UI**, supports `.feature` file discovery, and allows you to run all or individual tests directly from the editor.

---

## ✨ Features

- ✅ **Test Explorer Integration** – View and run tests from the Testing panel.
- 🔍 **Auto-discovery of `.feature` files** – Automatically registers all feature files in your workspace.
- ▶️ **Run All or Individual Tests** – Execute tests selectively or all at once.
- ⚙️ **Customizable Commands** – Configure how tests and feature generation are run.
- 📄 **Output Panel** – View test logs in a dedicated "Playwright BDD" output channel.
- 🟢 **Status Bar Buttons** – Quickly run or stop all BDD tests from the status bar.
- 🔎 **Scenario Filtering** – Use the `Filter Scenarios` command to show only matching scenarios by name or tag.
- 💡 **CodeLens Support** – Run individual scenarios directly from the editor using CodeLens links above each scenario.

---

## 🚀 Getting Started

1. Install the extension.
2. Open a folder containing `.feature` files.
3. Open the **Test Explorer** (`View > Testing`).
4. Run tests using the UI, status bar, or the `Run Playwright BDD Tests` command.

---

## ⚙️ Configuration

Customize the extension via `.vscode/settings.json` or global settings:

```json
{
  "playwrightBdd.configPath": "./playwright.config.ts",
  "playwrightBdd.tsconfigPath": "",
  "playwrightBdd.tags": "@smoke and not @wip",
  "playwrightBdd.featureGenCommand": "npx bddgen --config=${configPath}",
  "playwrightBdd.testCommand": "npx playwright test ${tsconfigArg} --config=${configPath} ${tagsArg}",
  "playwrightBdd.enableFeatureGen": true
}
```

### 🔧 Placeholder Variables

- `${configPath}` – Replaced with the value of `playwrightBdd.configPath`.
- `${tsconfigArg}` – Replaced with `--tsconfig=<tsconfigPath>` if provided.
- `${tagsArg}` – Replaced with `--grep "<tags>"` if tags are set.

---

## 🛠️ Commands

- **Run Playwright BDD Tests:**  
  `playwright-bdd.runTests` – Run all tests.
- **Run Scenario:**  
  `playwright-bdd.runScenario` – Run a specific scenario (via CodeLens or command).
- **Terminate Tests:**  
  `playwright-bdd.terminateTests` – Stop running tests (also available via status bar).
- **Filter Scenarios:**  
  `playwright-bdd.filterScenarios` – Filter scenarios by name or tag.

---

## 📦 Requirements

- `Node.js`
- `Playwright`
- `playwright-bdd`

## 📃 License

MIT

---