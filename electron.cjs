const { app, BrowserWindow, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');

// Forzar modo producción si no estamos explícitamente en desarrollo
if (process.env.NODE_ENV !== 'development') {
    process.env.NODE_ENV = 'production';
}

const isDev = process.env.NODE_ENV === 'development';
const port = process.env.PORT || 3000;

// Bloqueo de instancia única
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('Another instance is already running. Exiting...');
    app.quit();
} else {
    // ---------------------------------------------------------
    // LÓGICA PRINCIPAL DE LA APP
    // ---------------------------------------------------------

    let mainWindow;

    // Manejar segunda instancia (enfocar ventana existente)
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

        // Configurar menú de la aplicación
        if (isDev) {
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
                            label: `Version ${app.getVersion()}`,
                            enabled: false
                        }
                    ]
                }
            ];

            const menu = Menu.buildFromTemplate(template);
            Menu.setApplicationMenu(menu);
        } else {
            Menu.setApplicationMenu(null);
        }

        // Abrir enlaces externos en el navegador del sistema
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('https:') || url.startsWith('http:')) {
                require('electron').shell.openExternal(url);
                return { action: 'deny' };
            }
            return { action: 'allow' };
        });

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

                // Mantener referencia para limpieza
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

    // Configuración de actualizaciones
    autoUpdater.autoDownload = false;
    autoUpdater.allowPrerelease = true;

    // Logging para depuración
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'silly';
    console.log('El archivo de log está en: ', log.transports.file.getFile().path);
    log.info('App starting...');

    // Event listeners adicionales
    autoUpdater.on('checking-for-update', () => {
        log.info('Checking for updates...');
    });

    autoUpdater.on('update-not-available', () => {
        log.info('App is up to date.');
    });

    autoUpdater.on('error', (error) => {
        log.error('Update error:', error);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        log.info(log_message);
    });

    // Eventos de actualización
    autoUpdater.on('update-available', (info) => {
        log.info('Update available:', info.version);
        dialog.showMessageBox({
            type: 'info',
            title: 'Actualización Disponible',
            message: `Nueva versión ${info.version} disponible. ¿Descargar ahora?`,
            buttons: ['Sí', 'No']
        }).then((result) => {
            if (result.response === 0) {
                log.info('User selected to download update.');
                autoUpdater.downloadUpdate();
            } else {
                log.info('User selected NOT to download update.');
            }
        });
    });

    // Modificar update-downloaded para mostrar versión
    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded:', info.version);
        dialog.showMessageBox({
            type: 'info',
            title: 'Actualización Lista',
            message: `Versión ${info.version} descargada. Reiniciar para instalar.`,
            buttons: ['Reiniciar', 'Más Tarde']
        }).then((result) => {
            if (result.response === 0) {
                log.info('User selected to restart and install.');
                autoUpdater.quitAndInstall();
            } else {
                log.info('User selected to install later.');
            }
        });
    });

    // Ciclo de vida de la aplicación
    app.whenReady().then(async () => {
        try {
            const isAutomation = process.argv.includes('--automation');

            if (!isAutomation) {
                await startNextServer();
            } else {
                console.log('Running in automation mode - skipping server start');
            }

            createWindow();

            if (app.isPackaged || isDev) {
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

    // Limpieza robusta
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
