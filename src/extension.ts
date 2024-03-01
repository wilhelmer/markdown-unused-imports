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
        const importStatement = line.match(/^import\s+(.*?)\s+from\s+/);
        if (importStatement) {
            // Line contains an import statement, extract imported module name
            const importModule = importStatement[1].trim().replace(/[{,}\s]/g, '');
            //output.appendLine("Import module found: " + importModule);
            imports.push(importModule);
        } else {
            // No import statement found, check whether line contains XML tags
            let match;
            let regexp = /<([A-Z][^\s>\/]+)/g;
            while ((match = regexp.exec(line)) !== null) {
                //output.appendLine("Tag found:" + match[1]);
                tags.push(match[1]);
            }
            
            // Also check for src={XYZ} patterns
            regexp = /src=\{(\w+)\}/g;
            while ((match = regexp.exec(line)) !== null) {
                //output.appendLine("Src found:" + match[1]);
                tags.push(match[1]);
            }
        }
    });

    // Find unused imports by comparing imported module names with tag names
    const unusedImports = imports.filter(importName => !tags.includes(importName));

    // Create error message for each unused import
    const diagnostics: vscode.Diagnostic[] = unusedImports.map(unusedImport => {
        //output.appendLine("Unused import: " + unusedImport);
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