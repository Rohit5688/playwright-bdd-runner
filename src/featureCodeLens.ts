import * as vscode from 'vscode';

export class FeatureCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const scenarioMatch = lines[i].match(/^\s*Scenario(?: Outline)?:\s*(.+)/);
      if (scenarioMatch) {
        let tag: string | undefined;

        // Look upward for the nearest tag line
        for (let j = i - 1; j >= 0; j--) {
          const tagMatch = lines[j].match(/^\s*@(\w+)/);
          if (tagMatch) {
            tag = `@${tagMatch[1]}`;
            break;
          } else if (lines[j].trim() === '') {
            continue;
          } else {
            break;
          }
        }

        const range = new vscode.Range(i, 0, i, lines[i].length);
        const grepArg = tag ?? scenarioMatch[1];
        lenses.push(new vscode.CodeLens(range, {
          title: "▶ Run Scenario",
          command: "playwright-bdd.runScenario",
          arguments: [grepArg]
        }));
      }
    }

    return lenses;
  }
}
