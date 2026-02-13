// Minimal mock of VS Code API used by stepDefinitionProvider for tests
export const window = {
    createOutputChannel: (name?: string) => ({
        appendLine: (msg: string) => console.log(`[${name ?? 'output'}] ${msg}`),
        show: () => { }
    })
};

export const workspace = {
    findFiles: async () => [],
    workspaceFolders: []
};

export const languages = {
    createDiagnosticCollection: () => ({
        set: () => { },
        clear: () => { },
        dispose: () => { }
    })
};

export const Uri = {
    file: (f: string) => ({ fsPath: f })
};

export class Position {
    constructor(public line: number, public character: number) { }
}

export class Location {
    constructor(public uri: any, public rangeOrPosition: any) { }
}

export const DiagnosticSeverity = {
    Warning: 2,
    Error: 0,
    Information: 3,
    Hint: 4
};

export class Diagnostic {
    constructor(public range: any, public message: string, public severity: number) { }
}

export class Range {
    constructor(public startLine: number, public startChar: number, public endLine: number, public endChar: number) { }
}
