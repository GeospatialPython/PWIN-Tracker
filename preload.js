const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pwinApi', {
  getDb: () => ipcRenderer.invoke('db:get'),
  saveAssessment: (payload) => ipcRenderer.invoke('db:save-assessment', payload),
  updateOpportunity: (payload) => ipcRenderer.invoke('db:update-opportunity', payload),
  deleteOpportunity: (id) => ipcRenderer.invoke('db:delete-opportunity', id),
  exportOpportunity: (opportunity) => ipcRenderer.invoke('export:opportunity', opportunity)
});
