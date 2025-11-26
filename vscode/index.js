// Minimal mock of VS Code API for test environment
module.exports = {
    window: {
        createOutputChannel: (name) => ({
            appendLine: (msg) => console.log(`[${name}] ${msg}`),
        }),
    },
    workspace: {
        findFiles: async () => [],
        workspaceFolders: [],
    },
    languages: {
        createDiagnosticCollection: () => ({
            set: () => { },
            clear: () => { },
            dispose: () => { },
        }),
    },
    Uri: {
        file: (f) => ({ fsPath: f }),
    },
    Position: class {
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    },
    Location: class {
        constructor(uri, rangeOrPosition) {
            this.uri = uri;
            this.rangeOrPosition = rangeOrPosition;
        }
    },
    DiagnosticSeverity: {
        Warning: 2,
        Error: 0,
        Information: 3,
        Hint: 4,
    },
    Diagnostic: class {
        constructor(range, message, severity) {
            this.range = range;
            this.message = message;
            this.severity = severity;
        }
    },
    Range: class {
        constructor(startLine, startChar, endLine, endChar) {
            this.start = { line: startLine, character: startChar };
            this.end = { line: endLine, character: endChar };
        }
    },
};
