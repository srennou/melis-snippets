const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const fsPromises = require('fs').promises;

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

async function addTable() {
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

        const TableClassName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the Table Class without "Table":',
            placeHolder: 'e.g., Users',
        });

        if (!TableClassName) {
            return;
        }
        const TableName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the Table:',
            placeHolder: 'e.g., users_table',
        });

        if (!TableName) {
            return;
        }
        const PrimaryName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the primary key :',
            placeHolder: 'e.g., id',
        });

        if (!PrimaryName) {
            return;
        }

        const customModuleName = selectedModuleName.replace(/^MelisSites\//, '');

        const tableClassDir = path.join(modulePath, 'src', customModuleName, 'Model', 'Tables');
        const tableClassPath = path.join(tableClassDir, `${TableClassName}Table.php`);

        try {
            await fsPromises.mkdir(tableClassDir, { recursive: true });
        } catch (err) {
            vscode.window.showErrorMessage(`Error creating directory structure: ${err.message}`);
            return;
        }

        try {
            await fsPromises.access(tableClassPath);
            vscode.window.showErrorMessage(`Table '${TableClassName}Table' in module '${moduleName}' already exists!`);
        } catch (err) {
            const templatePath = path.join(__dirname, 'templates', 'tableClassTemplate.php');
            const tableClassTemplate = await fsPromises.readFile(templatePath, 'utf8');
            const tableClassContent = tableClassTemplate
                .replace(/#modulename/g, customModuleName)
                .replace(/#tableName/g, TableName)
                .replace(/#primaryName/g, PrimaryName)
                .replace(/#tableClassName/g, TableClassName);


            await fsPromises.writeFile(tableClassPath, tableClassContent);

            const configFile = path.join(modulePath, 'config', 'module.config.php');
            const configContent = await fsPromises.readFile(configFile, 'utf8');
            const newLine = `            '${TableClassName}Table'         => \\${customModuleName}\\Model\\Tables\\${TableClassName}Table::class,`;

            const updatedConfigContent = configContent.replace(/'service_manager' => \[\s*'aliases' => \[/, `$&\n${newLine}`);

            await fsPromises.writeFile(configFile, updatedConfigContent);
            vscode.window.showInformationMessage(`Controller '${TableClassName}' in module '${moduleName}' created successfully!`);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`An error occurred: ${err.message}`);
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
            prompt: 'Enter the name of the controller without "Controller":',
            placeHolder: 'e.g., Home',
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
            prompt: 'Enter the name of the service without "Service":',
            placeHolder: 'e.g., tool',
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
    getModuleNames,
    addTable,
    addController,
    addService
};
