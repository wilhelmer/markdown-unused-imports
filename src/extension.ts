import * as vscode from 'vscode';

let gDC: vscode.DiagnosticCollection;
//let output = vscode.window.createOutputChannel("Extension Output");

function findAndReportUnusedImports(document: vscode.TextDocument) {
    const text = document.getText();
    const lines = text.split('\n');
    const imports: string[] = [];
    const tags: string[] = [];

    // Iterate through each line of the document
    lines.forEach(line => {
        // Match import statements and extract imported module names
        const importMatch = line.match(/^import\s+(.*?)\s+from\s+/);
        if (importMatch) {
            const importStatement = importMatch[1].trim().replace(/[{,}\s]/g, '');
            imports.push(importStatement);
        } else {
            // Match XML tags and extract tag names
            const tagMatch = line.match(/<([A-Z][^\s>\/]+)/);
            if (tagMatch) {
                const tagName = tagMatch[1];
                //output.appendLine("Tag found: " + tagName);
                tags.push(tagName);
            }
            // Match src={XYZ} patterns and extract XYZ values
            // Treat them as tag names for simplicity
            const srcMatch = line.match(/src=\{(\w+)\}/);
            if (srcMatch) {
                const srcValue = srcMatch[1];
                tags.push(srcValue);
            }
        }
    });

    // Find unused imports by comparing imported module names with tag names
    const unusedImports = imports.filter(importName => !tags.includes(importName));

    // Create error message for each unused import
    const diagnostics: vscode.Diagnostic[] = unusedImports.map(unusedImport => {
        let lineNumber = lines.findIndex(line => line.match(`import.*?${unusedImport}.*?from`));
        if (lineNumber !== -1) {
            const range = new vscode.Range(lineNumber, 0, lineNumber, lines[lineNumber].length);
            const diagnostic = new vscode.Diagnostic(
                range,
                `Unused import "${unusedImport}"`,
                vscode.DiagnosticSeverity.Error
            );
            return diagnostic;
        }
        return null;
    }).filter(diagnostic => diagnostic !== null) as vscode.Diagnostic[];

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
    //output.show();
}

export function deactivate() {}