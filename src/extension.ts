import * as vscode from 'vscode';

let gDC: vscode.DiagnosticCollection;

function findAndReportUnusedImports(document: vscode.TextDocument) {
    const text = document.getText();
    const lines = text.split('\n');
    const imports: { name: string, lineNumber: number }[] = [];
    const tags: string[] = [];

    // Iterate through each line of the document
    lines.forEach((line, index) => {
        const importStatement = line.match(/^import\s+(.*?)\s+from\s+/);
        if (importStatement) {
            // Line contains an import statement, extract imported module name
            const importModule = importStatement[1].trim().replace(/[{,}\s]/g, '');
            // Store module name + line number
            imports.push({ name: importModule, lineNumber: index });
        } else {
            // No import statement found, check whether line contains XML tags
            let match;
            let regexp = /<([A-Z][^\s>\/]+)/g;
            while ((match = regexp.exec(line)) !== null) {
                tags.push(match[1]);
            }
            
            // Also check for src={XYZ} patterns
            regexp = /src=\{(\w+)\}/g;
            while ((match = regexp.exec(line)) !== null) {
                tags.push(match[1]);
            }
        }
    });

    // Find unused imports by comparing imported module names with tag names
    const unusedImports = imports.filter(importItem => !tags.includes(importItem.name));

    // Create error message for each unused import
    const diagnostics: vscode.Diagnostic[] = unusedImports.map(unusedImport => {
        const range = new vscode.Range(unusedImport.lineNumber, 0, unusedImport.lineNumber, lines[unusedImport.lineNumber].length);
        const diagnostic = new vscode.Diagnostic(
            range,
            `Unused import "${unusedImport.name}"`,
            vscode.DiagnosticSeverity.Error
        );
        return diagnostic;
    });

    gDC.set(document.uri, diagnostics);
}

export function activate(context: vscode.ExtensionContext) {
    if (!gDC) {
        gDC = vscode.languages.createDiagnosticCollection('unusedImports');
    }
    vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
        if (document.languageId === 'markdown') {
            findAndReportUnusedImports(document);
        }
    });

    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        if (document.languageId === 'markdown') {
            findAndReportUnusedImports(document);
        }
    });

    vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
        if (editor && editor.document.languageId === 'markdown') {
            findAndReportUnusedImports(editor.document);
        }
    });
}

export function deactivate() {}