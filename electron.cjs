const { app, BrowserWindow, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Force production mode if not explicitly in development
if (process.env.NODE_ENV !== 'development') {
    process.env.NODE_ENV = 'production';
}

const isDev = process.env.NODE_ENV === 'development';
const port = process.env.PORT || 3000;

// SINGLE INSTANCE LOCK
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('Another instance is already running. Exiting...');
    app.quit();
} else {
    // ---------------------------------------------------------
    // PRIMARY APP LOGIC
    // ---------------------------------------------------------

    let mainWindow;

    // Handle second instance (focus existing window)
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

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
            icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
            show: false,
            backgroundColor: '#ffffff',
        });

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
            mainWindow.loadURL(`http://localhost:${port}`);
            mainWindow.webContents.openDevTools();
        } else {
            mainWindow.loadURL(`http://localhost:${port}`);
        }

        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    }

    function startNextServer() {
        return new Promise(async (resolve, reject) => {
            if (isDev) {
                console.log('Development mode: Next.js server already running...');
                setTimeout(resolve, 1000);
                return;
            }

            console.log('Starting Next.js production server...');

            try {
                const { startServer } = require('./server.js');
                const serverInstance = await startServer();

                // Keep reference for cleanup
                if (serverInstance && serverInstance.close) {
                    app.serverInstance = serverInstance;
                }

                console.log('Next.js production server ready!');
                resolve();
            } catch (error) {
                console.error('Failed to start Next.js server:', error);
                reject(error);
            }
        });
    }

    // UPDATE CONFIGURATION
    autoUpdater.autoDownload = false;
    autoUpdater.allowPrerelease = true;

    // Logging para debug
    autoUpdater.logger = console;

    // Event listeners adicionales
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
    });

    autoUpdater.on('update-not-available', () => {
        console.log('App is up to date.');
    });

    autoUpdater.on('error', (error) => {
        console.error('Update error:', error);
    });

    // UPDATE EVENTS
    // Modificar update-available para mostrar versión
    autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        dialog.showMessageBox({
            type: 'info',
            title: 'Actualización Disponible',
            message: `Nueva versión ${info.version} disponible. ¿Descargar ahora?`,
            buttons: ['Sí', 'No']
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });

    // Modificar update-downloaded para mostrar versión
    autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        dialog.showMessageBox({
            type: 'info',
            title: 'Actualización Lista',
            message: `Versión ${info.version} descargada. Reiniciar para instalar.`,
            buttons: ['Reiniciar', 'Más Tarde']
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    // APP LIFECYCLE
    app.whenReady().then(async () => {
        try {
            const isAutomation = process.argv.includes('--automation');

            if (!isAutomation) {
                await startNextServer();
            } else {
                console.log('Running in automation mode - skipping server start');
            }

            createWindow();
            // Removed createAnalysisWindow();

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
            }
        });
    });

    // ROBUST CLEANUP
    app.on('window-all-closed', () => {
        // Force cleanup of server
        if (app.serverInstance && app.serverInstance.close) {
            try {
                app.serverInstance.close();
            } catch (e) {
                console.error('Error closing server:', e);
            }
        }

        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('before-quit', (event) => {
        event.preventDefault();

        // Attempt graceful cleanup with timeout
        const cleanupPromise = new Promise((resolve) => {
            if (app.serverInstance && app.serverInstance.close) {
                try {
                    app.serverInstance.close(() => resolve());
                } catch (e) {
                    resolve();
                }
            } else {
                resolve();
            }
        });

        // 2s Timeout to force exit
        Promise.race([
            cleanupPromise,
            new Promise(resolve => setTimeout(resolve, 2000))
        ]).then(() => {
            app.exit(0);
        });
    });

    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
    });
}
