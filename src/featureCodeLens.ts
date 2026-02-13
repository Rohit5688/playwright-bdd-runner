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
import { isTestRunning, getExecutionHistory } from './bddRunner';

export class FeatureCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor(private enableFeatureGen: boolean) { }

  // Method to refresh CodeLenses (useful when test status changes)
  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    try {
      const lenses: vscode.CodeLens[] = [];
      const text = document.getText();
      
      if (!text.trim()) {
        return lenses;
      }

      const lines = text.split('\n');
      const isRunning = isTestRunning();
      const history = getExecutionHistory();

      // 🔹 Add CodeLens at the top of the file to run the whole feature
      const featureMatch = text.match(/^\s*Feature:\s*(.+)/m);
      if (featureMatch) {
        const featureName = featureMatch[1].trim();
        
        // Find the actual line number where Feature is defined
        let featureLineIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/^\s*Feature:/)) {
            featureLineIndex = i;
            break;
          }
        }
        
        const range = new vscode.Range(featureLineIndex, 0, featureLineIndex, lines[featureLineIndex].length);

        // Get last execution status for this feature
        const lastExecution = history
          .filter(h => h.command.includes(featureName))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

        const runTitle = isRunning ? "⏳ Running..." : 
                        lastExecution?.success === false ? "❌ Run Feature (Failed)" :
                        lastExecution?.success === true ? "✅ Run Feature" : "▶ Run Feature";

        lenses.push(new vscode.CodeLens(range, {
          title: runTitle,
          command: isRunning ? undefined : "playwright-bdd.runScenarioDynamic",
          arguments: isRunning ? undefined : [featureName, this.enableFeatureGen]
        }));

        lenses.push(new vscode.CodeLens(range, {
          title: isRunning ? "⏳ Debug..." : "🐞 Debug Feature",
          command: isRunning ? undefined : "playwright-bdd.debugScenario",
          arguments: isRunning ? undefined : [featureName]
        }));

        // Add execution time if available
        if (lastExecution && lastExecution.duration > 0) {
          const duration = lastExecution.duration > 1000 ? 
            `${Math.round(lastExecution.duration / 1000)}s` : 
            `${lastExecution.duration}ms`;
          
          lenses.push(new vscode.CodeLens(range, {
            title: `⏱ Last run: ${duration}`,
            command: undefined
          }));
        }
      }

      // 🔹 Add CodeLens for each scenario
      for (let i = 0; i < lines.length; i++) {
        const scenarioMatch = lines[i].match(/^\s*Scenario(?: Outline)?:\s*(.+)/);
        if (scenarioMatch) {
          const scenarioName = scenarioMatch[1].trim();
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
          const grepArg = tag ?? scenarioName;

          // Get last execution status for this scenario
          const lastScenarioExecution = history
            .filter(h => h.command.includes(scenarioName) || (tag && h.command.includes(tag)))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

          const scenarioRunTitle = isRunning ? "⏳ Running..." : 
                                  lastScenarioExecution?.success === false ? "❌ Run Scenario (Failed)" :
                                  lastScenarioExecution?.success === true ? "✅ Run Scenario" : "▶ Run Scenario";

          lenses.push(new vscode.CodeLens(range, {
            title: scenarioRunTitle,
            command: isRunning ? undefined : "playwright-bdd.runScenarioDynamic",
            arguments: isRunning ? undefined : [grepArg, this.enableFeatureGen]
          }));

          lenses.push(new vscode.CodeLens(range, {
            title: isRunning ? "⏳ Debug..." : "🐞 Debug Scenario",
            command: isRunning ? undefined : "playwright-bdd.debugScenario",
            arguments: isRunning ? undefined : [grepArg]
          }));
        }
      }

      return lenses;
      
    } catch (error) {
      console.error('[FeatureCodeLensProvider] Error providing code lenses:', error);
      // Return empty array instead of throwing to prevent extension crash
      return [];
    }
  }
}
