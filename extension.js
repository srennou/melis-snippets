const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const fsPromises = require('fs').promises;
const codeGenerator = require('./codeGenerator');



function readPropertiesFromFiles() {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a workspace.');
            return [];
        }

        const folderPath = path.join(workspaceFolders[0].uri.fsPath, 'config', 'autoload', 'platforms');

        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.php'));

        const properties = [];

        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');

                const match = fileContent.match(/'driver'\s*=>\s*'Mysqli',\s*'hostname'\s*=>\s*'[^']*',\s*'database'\s*=>\s*'[^']*',\s*'username'\s*=>\s*'[^']*',\s*'password'\s*=>\s*'[^']*',\s*'port'\s*=>\s*'[^']*',\s*'charset'\s*=>\s*'utf8'/s);

                if (match) {
                    const extractedProperties = match[0];
                    properties.push({
                        fileName: file,
                        extractedProperties: extractedProperties,
                    });
                } else {
                    console.error(`Error parsing file '${file}': Unable to extract specific properties`);
                }
            } catch (error) {
                console.error(`Error processing file '${file}': ${error.message}`);
            }
        });
        return properties;
    } catch (error) {
        console.error(`Error reading module directories: ${error.message}`);
        return [];
    }
}

function generateHtml(properties) {
    let html = '<html><body>';

    properties.forEach(property => {
        html += `<h2>${property.fileName}</h2>`;
        html += '<table border="1">';
        html += '<tr><th>Key</th><th>Value</th></tr>';

        const keyValuePairs = property.extractedProperties.split(',');

        keyValuePairs.forEach(pair => {
            const [key, value] = pair.split('=>').map(str => str.trim());
            html += `<tr><td>${key}</td><td>${value.slice(1, -1)}</td></tr>`;
        });

        html += '</table>';
    });

    html += '</body></html>';
    return html;
}

module.exports = {
    activate: context => {
        let addControllerDisposable = vscode.commands.registerCommand('melis.addController', codeGenerator.addController);
        let addServiceDisposable = vscode.commands.registerCommand('melis.addService', codeGenerator.addService);
        let addTableDisposable = vscode.commands.registerCommand('melis.addTable', codeGenerator.addTable);
        let bdConfigDisposable = vscode.commands.registerCommand('melis.start', () => {
            const panel = vscode.window.createWebviewPanel(
                'melis',
                'Melis DB config',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                }
            );
            const properties = readPropertiesFromFiles();
            const htmlContent = generateHtml(properties);
            panel.webview.html = htmlContent;
        });
        context.subscriptions.push(addControllerDisposable,
            addServiceDisposable,
            addTableDisposable,
            bdConfigDisposable);
    }
}