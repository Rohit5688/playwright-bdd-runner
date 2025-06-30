import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ReportViewer {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;

  constructor(outputChannel: vscode.OutputChannel, workspaceRoot: string) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Show existing reports to user
   */
  async showReports(): Promise<void> {
    this.outputChannel.appendLine('📊 Looking for existing reports...');

    try {
      const reports = await this.findExistingReports();
      
      if (reports.length === 0) {
        vscode.window.showInformationMessage('No test reports found. Run tests first to generate reports.');
        return;
      }

      const selected = await vscode.window.showQuickPick(reports, {
        placeHolder: 'Select a report to view'
      });

      if (selected) {
        await this.openReport(selected.path, selected.type);
      }

    } catch (error) {
      this.outputChannel.appendLine(`❌ Error finding reports: ${error}`);
      vscode.window.showErrorMessage('Failed to find reports');
    }
  }

  /**
   * Find existing report files
   */
  private async findExistingReports(): Promise<Array<{
    label: string;
    description: string;
    path: string;
    type: 'html' | 'json' | 'xml';
  }>> {
    const reports: Array<{
      label: string;
      description: string;
      path: string;
      type: 'html' | 'json' | 'xml';
    }> = [];

    // Common report locations
    const reportLocations = [
      'playwright-report',
      'test-results',
      'cucumber-report',
      'reports'
    ];

    for (const location of reportLocations) {
      const reportDir = path.join(this.workspaceRoot, location);
      
      try {
        if (await this.directoryExists(reportDir)) {
          const foundReports = await this.scanReportDirectory(reportDir, location);
          reports.push(...foundReports);
        }
      } catch (error) {
        // Ignore individual directory errors
      }
    }

    return reports;
  }

  /**
   * Scan a directory for report files
   */
  private async scanReportDirectory(
    dirPath: string, 
    dirName: string
  ): Promise<Array<{
    label: string;
    description: string;
    path: string;
    type: 'html' | 'json' | 'xml';
  }>> {
    const reports = [];

    try {
      const files = await fs.promises.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.promises.stat(filePath);
        
        if (stat.isFile()) {
          const report = this.identifyReportFile(filePath, file, dirName);
          if (report) {
            reports.push(report);
          }
        }
      }
    } catch (error) {
      // Ignore scan errors
    }

    return reports;
  }

  /**
   * Identify if a file is a report
   */
  private identifyReportFile(
    filePath: string, 
    fileName: string, 
    dirName: string
  ): {
    label: string;
    description: string;
    path: string;
    type: 'html' | 'json' | 'xml';
  } | null {
    const lowerFileName = fileName.toLowerCase();
    
    // HTML reports
    if (lowerFileName.includes('index.html') || lowerFileName.includes('report.html')) {
      return {
        label: `📊 ${dirName} - HTML Report`,
        description: `${fileName} • Interactive dashboard`,
        path: filePath,
        type: 'html'
      };
    }

    // JSON reports
    if (lowerFileName.includes('.json') && (
      lowerFileName.includes('test') || 
      lowerFileName.includes('result') || 
      lowerFileName.includes('report')
    )) {
      return {
        label: `📄 ${dirName} - JSON Report`,
        description: `${fileName} • Machine readable`,
        path: filePath,
        type: 'json'
      };
    }

    // XML reports
    if (lowerFileName.includes('.xml') && (
      lowerFileName.includes('test') || 
      lowerFileName.includes('result') || 
      lowerFileName.includes('junit')
    )) {
      return {
        label: `📋 ${dirName} - XML Report`,
        description: `${fileName} • JUnit format`,
        path: filePath,
        type: 'xml'
      };
    }

    return null;
  }

  /**
   * Open a report file
   */
  private async openReport(reportPath: string, type: 'html' | 'json' | 'xml'): Promise<void> {
    try {
      switch (type) {
        case 'html':
          await this.openHTMLReport(reportPath);
          break;
        case 'json':
        case 'xml':
          await this.openTextReport(reportPath);
          break;
      }
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error opening report: ${error}`);
      vscode.window.showErrorMessage('Failed to open report');
    }
  }

  /**
   * Open HTML report in browser
   */
  private async openHTMLReport(reportPath: string): Promise<void> {
    const uri = vscode.Uri.file(reportPath);
    await vscode.env.openExternal(uri);
    this.outputChannel.appendLine(`🌐 Opened HTML report: ${path.basename(reportPath)}`);
  }

  /**
   * Open text-based report in VS Code
   */
  private async openTextReport(reportPath: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(reportPath);
    await vscode.window.showTextDocument(document);
    this.outputChannel.appendLine(`📄 Opened report: ${path.basename(reportPath)}`);
  }

  /**
   * Share report via Slack (if configured)
   */
  async shareReport(reportPath: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('playwrightBdd');
    const slackWebhook = config.get<string>('cicd.slackWebhook');

    if (!slackWebhook) {
      vscode.window.showWarningMessage('Slack webhook not configured');
      return;
    }

    try {
      // Read report summary for sharing
      const reportSummary = await this.generateReportSummary(reportPath);
      
      // For now, just show a success message
      // In full implementation, this would actually send to Slack
      vscode.window.showInformationMessage(`Report summary would be shared to Slack:\n${reportSummary}`);
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error sharing report: ${error}`);
      vscode.window.showErrorMessage('Failed to share report');
    }
  }

  /**
   * Generate a quick summary of the report
   */
  private async generateReportSummary(reportPath: string): Promise<string> {
    try {
      const fileName = path.basename(reportPath);
      const stats = await fs.promises.stat(reportPath);
      
      return `📊 Test Report: ${fileName}\n` +
             `📅 Generated: ${stats.mtime.toLocaleString()}\n` +
             `📁 Location: ${path.relative(this.workspaceRoot, reportPath)}`;
             
    } catch (error) {
      return 'Report summary not available';
    }
  }

  // Utility methods
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
