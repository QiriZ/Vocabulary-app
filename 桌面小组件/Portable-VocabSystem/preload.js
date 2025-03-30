/**
 * 预加载脚本
 * 用于在渲染进程中安全地暴露主进程的功能
 */

const { contextBridge, ipcRenderer } = require('electron');

// 在window对象上暴露API，供渲染进程使用
contextBridge.exposeInMainWorld('electronAPI', {
  // 发送选中的文本到渲染进程
  onSelectedText: (callback) => ipcRenderer.on('selected-text', callback),
  
  // 提交生词记录
  submitVocabulary: (data) => ipcRenderer.invoke('submit-vocabulary', data),
  
  // 获取生词记录
  getRecords: () => ipcRenderer.invoke('get-records'),
  
  // 更新生词记录
  updateRecord: (recordId, data) => ipcRenderer.invoke('update-record', recordId, data),
  
  // 删除生词记录
  deleteRecord: (recordId) => ipcRenderer.invoke('delete-record', recordId),
  
  // 导出CSV
  exportCSV: () => ipcRenderer.invoke('export-csv'),
  
  // 打开历史记录窗口
  openHistoryWindow: () => ipcRenderer.send('open-history-window'),
  
  // 同步离线记录
  syncOfflineRecords: () => ipcRenderer.invoke('sync-offline-records')
});