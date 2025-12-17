const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    // Add any APIs you want to expose to the renderer process here
    // Example:
    // send: (channel, data) => {
    //   ipcRenderer.send(channel, data);
    // },
    // receive: (channel, func) => {
    //   ipcRenderer.on(channel, (event, ...args) => func(...args));
    // }
});
