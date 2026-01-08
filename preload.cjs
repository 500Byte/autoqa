const { contextBridge, ipcRenderer } = require('electron');

// Exponer métodos protegidos para el proceso de renderizado
// sin exponer el objeto completo
contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    // APIs expuestas al renderizador
    // send: (channel, data) => {
    //   ipcRenderer.send(channel, data);
    // },
    // receive: (channel, func) => {
    //   ipcRenderer.on(channel, (event, ...args) => func(...args));
    // }
});
