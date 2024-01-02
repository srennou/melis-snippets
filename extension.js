const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const fsPromises = require('fs').promises;
const vm = require('vm');

async function getModuleNames() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found. Please open a workspace.');
        return [];
    }

    const modulesPath = path.join(workspaceFolders[0].uri.fsPath, 'module');
    try {
        const moduleEntries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(modulesPath));
        const moduleNames = moduleEntries
            .filter(([name, type]) => type === vscode.FileType.Directory && name !== 'MelisSites' && name !== 'MelisModuleConfig')
            .map(([name]) => name);
        const melisSitesPath = path.join(modulesPath, 'MelisSites');
        let melisSitesModuleNames = [];
        if (fs.existsSync(melisSitesPath)) {
            const melisSitesEntries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(melisSitesPath));
            melisSitesModuleNames = melisSitesEntries
                .filter(([name, type]) => type === vscode.FileType.Directory)
                .map(([name]) => `MelisSites/${name}`);
        }
        return [...moduleNames, ...melisSitesModuleNames];
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading module directories: ${error.message}`);
        return [];
    }
}

async function addController() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found. Please open a workspace.');
        return;
    }

    try {
        const moduleNames = await getModuleNames();
        if (moduleNames.length === 0) {
            vscode.window.showErrorMessage('No modules found in the project.');
            return;
        }

        const selectedModuleName = await vscode.window.showQuickPick(moduleNames, {
            placeHolder: 'Select a module:',
        });

        if (!selectedModuleName) {
            return;
        }

        const moduleName = selectedModuleName;

        if (!moduleName) {
            return;
        }

        const modulePath = path.join(workspaceFolders[0].uri.fsPath, 'module', moduleName);

        if (!fs.existsSync(modulePath)) {
            vscode.window.showErrorMessage(`Module '${moduleName}' does not exist in the project!`);
            return;
        }

        const controllerName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the controller:',
            placeHolder: 'e.g., test',
        });

        if (!controllerName) {
            return;
        }
        const customModuleName = selectedModuleName.replace(/^MelisSites\//, '');

        const controllerDir = path.join(modulePath, 'src', customModuleName, 'controller');
        const controllerPath = path.join(controllerDir, `${controllerName}Controller.php`);

        try {
            await fsPromises.mkdir(controllerDir, { recursive: true });
        } catch (err) {
            vscode.window.showErrorMessage(`Error creating directory structure: ${err.message}`);
            return;
        }

        try {
            await fsPromises.access(controllerPath);
            vscode.window.showErrorMessage(`Controller '${controllerName}Controller' in module '${moduleName}' already exists!`);
        } catch (err) {
            const templatePath = path.join(__dirname, 'templates', 'controllerTemplate.php');
            const controllerTemplate = await fsPromises.readFile(templatePath, 'utf8');
            const controllerContent = controllerTemplate
                .replace(/#modulename/g, customModuleName)
                .replace(/#controllername/g, controllerName);

            await fsPromises.writeFile(controllerPath, controllerContent);

            const configFile = path.join(modulePath, 'config', 'module.config.php');
            const configContent = await fsPromises.readFile(configFile, 'utf8');
            const newLine = `            '${customModuleName}\\Controller\\${controllerName}'         => \\${customModuleName}\\Controller\\${controllerName}Controller::class,`;

            const updatedConfigContent = configContent.replace(/'controllers' => \[\s*'invokables' => \[/, `$&\n${newLine}`);

            await fsPromises.writeFile(configFile, updatedConfigContent);
            vscode.window.showInformationMessage(`Controller '${controllerName}' in module '${moduleName}' created successfully!`);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`An error occurred: ${err.message}`);
    }
}

async function addService() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found. Please open a workspace.');
        return;
    }

    try {
        const moduleNames = await getModuleNames();
        if (moduleNames.length === 0) {
            vscode.window.showErrorMessage('No modules found in the project.');
            return;
        }

        const selectedModuleName = await vscode.window.showQuickPick(moduleNames, {
            placeHolder: 'Select a module:',
        });

        if (!selectedModuleName) {
            return;
        }

        const moduleName = selectedModuleName;

        if (!moduleName) {
            return;
        }

        const modulePath = path.join(workspaceFolders[0].uri.fsPath, 'module', moduleName);

        if (!fs.existsSync(modulePath)) {
            vscode.window.showErrorMessage(`Module '${moduleName}' does not exist in the project!`);
            return;
        }

        const serviceName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the service:',
            placeHolder: 'e.g., test',
        });

        if (!serviceName) {
            return;
        }
        const customModuleName = selectedModuleName.replace(/^MelisSites\//, '');

        const serviceDir = path.join(modulePath, 'src', customModuleName, 'Service');
        const servicePath = path.join(serviceDir, `${serviceName}Service.php`);

        try {
            await fsPromises.mkdir(serviceDir, { recursive: true });
        } catch (err) {
            vscode.window.showErrorMessage(`Error creating directory structure: ${err.message}`);
            return;
        }

        try {
            await fsPromises.access(servicePath);
            vscode.window.showErrorMessage(`Service '${serviceName}Service' in module '${moduleName}' already exists!`);
        } catch (err) {

            const templatePath = path.join(__dirname, 'templates', 'serviceTemplate.php');
            const serviceTemplate = await fsPromises.readFile(templatePath, 'utf8');
            const serviceContent = serviceTemplate
                .replace(/#modulename/g, customModuleName)
                .replace(/#servicename/g, serviceName);

            await fsPromises.writeFile(servicePath, serviceContent);

            const configFile = path.join(modulePath, 'config', 'module.config.php');
            const configContent = await fsPromises.readFile(configFile, 'utf8');
            const newLine = `            '${serviceName}Service'         => \\${customModuleName}\\Service\\${serviceName}Service::class,`;

            const updatedConfigContent = configContent.replace(/'service_manager' => \[\s*'aliases' => \[/, `$&\n${newLine}`);

            await fsPromises.writeFile(configFile, updatedConfigContent);
            vscode.window.showInformationMessage(`Service '${serviceName}' in module '${moduleName}' created successfully!`);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`An error occurred: ${err.message}`);
    }
}

module.exports = {
    activate: context => {
        let addControllerDisposable = vscode.commands.registerCommand('melis.addController', addController);
        let addServiceDisposable = vscode.commands.registerCommand('melis.addService', addService);
        context.subscriptions.push(
            vscode.commands.registerCommand('melis.start', () => {
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
            }, addControllerDisposable, addServiceDisposable)
        );
    }
}

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

        // Split the extracted properties into key-value pairs
        const keyValuePairs = property.extractedProperties.split(',');

        keyValuePairs.forEach(pair => {
            const [key, value] = pair.split('=>').map(str => str.trim());
            html += `<tr><td>${key}</td><td>${value}</td></tr>`;
        });

        html += '</table>';
    });

    html += '</body></html>';
    return html;
}