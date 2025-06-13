Here’s a cleanly formatted and polished version of your documentation for the **🎭 Playwright BDD Test Runner** VS Code extension:

---

# 🎭 Playwright BDD Test Runner

A Visual Studio Code extension to run Playwright BDD tests with ease. This extension integrates with the **Test Explorer UI**, supports `.feature` file discovery, and allows you to run all or individual tests directly from the editor.

---

## ✨ Features

- ✅ **Test Explorer Integration** – View and run tests from the Testing panel.
- 🔍 **Auto-discovery of `.feature` files** – Automatically registers all feature files in your workspace.
- ▶️ **Run All or Individual Tests** – Execute tests selectively or all at once.
- ⚙️ **Customizable Commands** – Configure how tests and feature generation are run.
- 📄 **Output Panel** – View test logs in a dedicated "Playwright BDD" output channel.

---

## 🚀 Getting Started

1. Install the extension.
2. Open a folder containing `.feature` files.
3. Open the **Test Explorer** (`View > Testing`).
4. Run tests using the UI or the `Run Playwright BDD Tests` command.

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
- `${tsconfigArg}` – Replaced with `--project=<tsconfigPath>` if provided.
- `${tagsArg}` – Replaced with `--grep "<tags>"` if tags are set.

---

## 📦 Requirements

- `Node.js`
- `Playwright`
- `playwright-bdd`

Install dependencies using:

```bash
npm install
```

---

## 🧪 Example `.feature` File

```gherkin
Feature: Login functionality

  Scenario: Successful login
    Given the user navigates to the login page
    When the user enters valid credentials
    Then the user should be redirected to the dashboard
```

---

## 🛠️ Development

To build and test the extension locally:

```bash
npm install
npm run compile
code .
```

---

## 📃 License

MIT

---

## 🙌 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---
