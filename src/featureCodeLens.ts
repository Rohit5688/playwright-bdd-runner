// import * as vscode from 'vscode';

// export class FeatureCodeLensProvider implements vscode.CodeLensProvider {
//   constructor(private enableFeatureGen: boolean) {}

//   provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
//     const lenses: vscode.CodeLens[] = [];
//     const text = document.getText();
//     const lines = text.split('\n');

//     // 🔹 Add CodeLens at the top of the file to run the whole feature
//     const featureMatch = text.match(/^\s*Feature:\s*(.+)/m);
//     if (featureMatch) {
//       const featureName = featureMatch[1].trim();
//       const range = new vscode.Range(0, 0, 0, lines[0].length);
//       lenses.push(new vscode.CodeLens(range, {
//         title: "▶ Run Feature",
//         command: "playwright-bdd.runScenarioDynamic",
//         arguments: [featureName, this.enableFeatureGen]
//       }));
//     }

//     // 🔹 Add CodeLens for each scenario
//     for (let i = 0; i < lines.length; i++) {
//       const scenarioMatch = lines[i].match(/^\s*Scenario(?: Outline)?:\s*(.+)/);
//       if (scenarioMatch) {
//         let tag: string | undefined;

//         // Look upward for the nearest tag line
//         for (let j = i - 1; j >= 0; j--) {
//           const tagMatch = lines[j].match(/^\s*@(\w+)/);
//           if (tagMatch) {
//             tag = `@${tagMatch[1]}`;
//             break;
//           } else if (lines[j].trim() === '') {
//             continue;
//           } else {
//             break;
//           }
//         }

//         const range = new vscode.Range(i, 0, i, lines[i].length);
//         const grepArg = tag ?? scenarioMatch[1];

//         lenses.push(new vscode.CodeLens(range, {
//           title: "▶ Run Scenario",
//           command: "playwright-bdd.runScenarioDynamic",
//           arguments: [grepArg, this.enableFeatureGen]
//         }));
//       }
//     }

//     return lenses;
//   }
// }

import * as vscode from 'vscode';

export class FeatureCodeLensProvider implements vscode.CodeLensProvider {
  constructor(private enableFeatureGen: boolean) { }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // 🔹 Add CodeLens at the top of the file to run the whole feature
    const featureMatch = text.match(/^\s*Feature:\s*(.+)/m);
    if (featureMatch) {
      const featureName = featureMatch[1].trim();
      const range = new vscode.Range(0, 0, 0, lines[0].length);

      lenses.push(new vscode.CodeLens(range, {
        title: "▶ Run Feature",
        command: "playwright-bdd.runScenarioDynamic",
        arguments: [featureName, this.enableFeatureGen]
      }));

      console.log(`[DEBUG] CodeLens featureName: ${featureName}`);

      lenses.push(new vscode.CodeLens(range, {
        title: "🐞 Debug Feature",
        command: "playwright-bdd.debugScenario",
        arguments: [featureName]
      }));
    }

    // 🔹 Add CodeLens for each scenario
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
          command: "playwright-bdd.runScenarioDynamic",
          arguments: [grepArg, this.enableFeatureGen]
        }));

        lenses.push(new vscode.CodeLens(range, {
          title: "🐞 Debug Scenario",
          command: "playwright-bdd.debugScenario",
          arguments: [grepArg]
        }));
      }
    }

    return lenses;
  }
}
