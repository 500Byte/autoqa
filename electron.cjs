const { app, BrowserWindow, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Force production mode if not explicitly in development
// This is critical for the packaged app to know it should run in production mode
if (process.env.NODE_ENV !== 'development') {
    process.env.NODE_ENV = 'production';
}

let mainWindow;
let analysisWindow;
const isDev = process.env.NODE_ENV === 'development';
const port = process.env.PORT || 3000;

// Enable remote debugging for Playwright to attach
app.commandLine.appendSwitch('remote-debugging-port', '9222');

function createAnalysisWindow() {
    analysisWindow = new BrowserWindow({
        width: 1280, // Aumentamos tamaño para simular desktop real
        height: 720,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,             // <--- CRÍTICO: Debe ser false para inyectar scripts complejos
            backgroundThrottling: false, // <--- CRÍTICO: Evita que Chrome congele la tab oculta
            webSecurity: false          // <--- RECOMENDADO: Evita bloqueos de CORS en assets externos
        },
    });

    analysisWindow.loadURL('data:text/html,<html><head><title>AnalysisWorker</title></head><body><h1>Analysis Worker</h1></body></html>');

    analysisWindow.on('closed', () => {
        analysisWindow = null;
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
        icon: path.join(__dirname, 'public', 'favicon.ico'),
        show: false,
        backgroundColor: '#ffffff',
    });

    // Show window when ready to avoid visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Set application menu
    const template = [
        {
            label: 'File',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About AutoQA',
                    click: async () => {
                        const { shell } = require('electron');
                        await shell.openExternal('https://github.com');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    if (isDev) {
        // Development mode: load from Next.js dev server
        mainWindow.loadURL(`http://localhost:${port}`);
        mainWindow.webContents.openDevTools();
    } else {
        // Production mode: load from Next.js production server
        mainWindow.loadURL(`http://localhost:${port}`);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startNextServer() {
    return new Promise(async (resolve, reject) => {
        // In development mode, the server is already started by concurrently
        if (isDev) {
            console.log('Development mode: Next.js server should already be running...');
            setTimeout(resolve, 1000);
            return;
        }

        // In production mode, start the Next.js production server programmatically
        console.log('Starting Next.js production server...');

        try {
            const { startServer } = require('./server.js');
            await startServer();
            console.log('Next.js production server is ready!');
            resolve();
        } catch (error) {
            console.error('Failed to start Next.js server:', error);
            reject(error);
        }
    });
}

// Configuración de Update
autoUpdater.autoDownload = false;
autoUpdater.allowPrerelease = true; // Importante para esta etapa

// Eventos de actualización
autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Actualización Disponible',
        message: 'Hay una nueva versión de AutoQA. ¿Quieres descargarla ahora?',
        buttons: ['Sí', 'No']
    }).then((result) => {
        if (result.response === 0) { // Si dice Sí
            autoUpdater.downloadUpdate();
        }
    });
});

autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Actualización Lista',
        message: 'La actualización se ha descargado. La aplicación se reiniciará para instalarla.',
        buttons: ['Reiniciar']
    }).then(() => {
        autoUpdater.quitAndInstall();
    });
});

app.whenReady().then(async () => {
    try {
        // Check if running in automation mode (triggered by Puppeteer)
        const isAutomation = process.argv.includes('--automation');

        if (!isAutomation) {
            await startNextServer();
        } else {
            console.log('Running in automation mode - skipping server start');
        }

        createWindow();
        createAnalysisWindow(); // Create the hidden worker window

        // Solo chequear en producción (empaquetado)
        if (app.isPackaged) {
            autoUpdater.checkForUpdates();
        }
    } catch (error) {
        console.error('Error starting application:', error);
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
            createAnalysisWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Kill server process if it exists
    if (app.serverProcess) {
        app.serverProcess.kill();
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Kill server process if it exists
    if (app.serverProcess) {
        app.serverProcess.kill();
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
