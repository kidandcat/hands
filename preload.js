const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    fingersData: (data) => ipcRenderer.send('fingers-data', data)
})