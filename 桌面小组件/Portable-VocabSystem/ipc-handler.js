/**
 * IPC通信处理模块
 * 负责处理主进程和渲染进程之间的通信
 */

const { ipcMain, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const feishuApi = require('./feishu-api');

// 保存窗口引用
let mainWindow = null;
let historyWindow = null;

/**
 * 初始化IPC通信处理
 * @param {Object} windows 窗口对象引用
 */
function initIpcHandlers(windows) {
  // 保存窗口引用
  mainWindow = windows.mainWindow;
  historyWindow = windows.historyWindow;
  
  // 处理提交生词记录请求
  ipcMain.handle('submit-vocabulary', async (event, data) => {
    try {
      // 调用飞书API添加记录
      const result = await feishuApi.addVocabularyRecord(data);
      return result;
    } catch (error) {
      console.error('提交生词记录失败:', error);
      throw error;
    }
  });
  
  // 处理获取生词记录请求
  ipcMain.handle('get-records', async (event, accountName) => {
    try {
      // 获取所有记录
      let allRecords = [];
      let hasMore = true;
      let pageToken = null;
      
      // 分页获取所有记录
      while (hasMore) {
        const result = await feishuApi.getVocabularyRecords({
          pageSize: 100,
          pageToken
        });
        
        allRecords = allRecords.concat(result.records);
        hasMore = result.hasMore;
        pageToken = result.pageToken;
      }
      
      // 按创建时间降序排序
      allRecords.sort((a, b) => {
        return new Date(b.createTime) - new Date(a.createTime);
      });
      
      // 如果提供了账户名称，则筛选该账户上传的记录
      if (accountName) {
        allRecords = allRecords.filter(record => record.accountName === accountName);
      }
      
      return allRecords;
    } catch (error) {
      console.error('获取生词记录失败:', error);
      throw error;
    }
  });
  
  // 处理更新生词记录请求
  ipcMain.handle('update-record', async (event, recordId, data) => {
    try {
      // 调用飞书API更新记录
      const result = await feishuApi.updateVocabularyRecord(recordId, data);
      return result;
    } catch (error) {
      console.error('更新生词记录失败:', error);
      throw error;
    }
  });
  
  // 处理删除生词记录请求
  ipcMain.handle('delete-record', async (event, recordId) => {
    try {
      // 调用飞书API删除记录
      const result = await feishuApi.deleteVocabularyRecord(recordId);
      return result;
    } catch (error) {
      console.error('删除生词记录失败:', error);
      throw error;
    }
  });
  
  // 处理导出CSV请求
  ipcMain.handle('export-csv', async (event) => {
    try {
      // 获取所有记录
      const records = await ipcMain.handlers.get('get-records').handle(event);
      
      if (records.length === 0) {
        throw new Error('没有可导出的记录');
      }
      
      // 打开保存对话框
      const { filePath } = await dialog.showSaveDialog({
        title: '导出CSV',
        defaultPath: path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', '生词记录.csv'),
        filters: [{ name: 'CSV文件', extensions: ['csv'] }]
      });
      
      if (!filePath) {
        throw new Error('导出已取消');
      }
      
      // 创建CSV写入器
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'word', title: '生词' },
          { id: 'industry', title: '学科领域' },
          { id: 'createTime', title: '创建时间' },
          { id: 'accountName', title: '创建人' },
          { id: 'sourceUrl', title: '来源URL' }
        ],
        encoding: 'utf8'
      });
      
      // 写入CSV
      await csvWriter.writeRecords(records);
      
      // 打开文件所在目录
      shell.showItemInFolder(filePath);
      
      return { success: true, filePath };
    } catch (error) {
      console.error('导出CSV失败:', error);
      throw error;
    }
  });
  
  // 处理打开历史记录窗口请求
  ipcMain.on('open-history-window', (event, accountName) => {
    if (!historyWindow) {
      // 如果历史记录窗口不存在，创建一个新窗口
      const win = new BrowserWindow({
        width: 600,
        height: 500,
        frame: true,
        resizable: true,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true
        }
      });
      
      // 加载历史记录HTML文件
      win.loadFile('history.html');
      
      // 窗口准备好后显示并传递账户名称
      win.once('ready-to-show', () => {
        win.show();
        // 将账户名称传递给history.html
        if (accountName) {
          win.webContents.send('set-account-name', accountName);
        }
      });
      
      // 窗口关闭时将引用置为null
      win.on('closed', () => {
        historyWindow = null;
      });
      
      // 更新窗口引用
      historyWindow = win;
    } else {
      // 如果历史记录窗口已存在，显示它并传递账户名称
      historyWindow.show();
      if (accountName) {
        historyWindow.webContents.send('set-account-name', accountName);
      }
    }
  });
  
  // 处理同步离线记录请求
  ipcMain.handle('sync-offline-records', async () => {
    try {
      // 调用飞书API同步离线记录
      const result = await feishuApi.syncOfflineRecords();
      return result;
    } catch (error) {
      console.error('同步离线记录失败:', error);
      throw error;
    }
  });
}

module.exports = {
  initIpcHandlers
};