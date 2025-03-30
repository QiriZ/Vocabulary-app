/**
 * 简化版主程序 - 不使用托盘图标
 * 解决中文路径下图标加载问题
 */
const { app, BrowserWindow, globalShortcut, Menu, clipboard, screen, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { initIpcHandlers } = require('./ipc-handler');

// 初始化配置存储
const store = new Store();

// 保存窗口引用，防止被JavaScript的垃圾回收机制回收
let mainWindow = null;
let historyWindow = null;

/**
 * 创建主窗口
 * @returns {BrowserWindow} 创建的主窗口实例
 */
function createMainWindow() {
  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 400,
    height: 900,
    frame: true,  // 有边框窗口，方便调试
    resizable: true,
    show: false,  // 初始不显示，等待加载完成
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // 加载主界面HTML文件
  win.loadFile('index.html');

  // 窗口准备好后显示
  win.once('ready-to-show', () => {
    // 获取当前屏幕尺寸
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    // 计算窗口位置，使其居中显示
    const x = Math.floor(width / 2 - 400 / 2);
    const y = Math.floor(height / 2 - 900 / 2);
    win.setPosition(x, y);
    win.show();
  });

  // 创建应用菜单
  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        { 
          label: '查看历史记录', 
          click: () => {
            if (!historyWindow) {
              historyWindow = createHistoryWindow();
            } else {
              historyWindow.show();
            }
          } 
        },
        { 
          label: '前往生词学习系统', 
          click: () => {
            shell.openExternal('http://qiri.pythonanywhere.com');
          } 
        },
        { type: 'separator' },
        { 
          label: '退出', 
          click: () => {
            app.quit();
          } 
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            win.webContents.send('show-about');
          }
        }
      ]
    }
  ]);
  
  Menu.setApplicationMenu(menu);

  // 窗口关闭时重置引用
  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

/**
 * 创建历史记录窗口
 * @returns {BrowserWindow} 创建的历史记录窗口实例
 */
function createHistoryWindow() {
  // 创建浏览器窗口
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

  // 窗口准备好后显示
  win.once('ready-to-show', () => {
    win.show();
  });

  // 窗口关闭时将引用置为null
  win.on('closed', () => {
    historyWindow = null;
  });

  return win;
}

/**
 * 获取当前选中的文本
 * @returns {string} 当前选中的文本
 */
function getSelectedText() {
  return clipboard.readText('selection');
}

/**
 * 注册全局快捷键
 */
function registerShortcuts() {
  // 注册ALT+SPACE快捷键
  const ret = globalShortcut.register('Alt+Space', () => {
    console.log('检测到Alt+Space快捷键被按下');
    
    // 获取选中的文本
    const selectedText = getSelectedText();
    console.log('选中的文本:', selectedText);
    
    // 如果主窗口不存在，则创建
    if (!mainWindow) {
      mainWindow = createMainWindow();
    }
    
    // 显示主窗口
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    } else {
      mainWindow.focus();
    }
    
    // 将选中的文本发送到渲染进程
    if (selectedText) {
      mainWindow.webContents.send('selected-text', selectedText);
    }
  });

  // 检查快捷键是否注册成功
  if (!ret) {
    console.error('快捷键注册失败 - Alt+Space可能已被其他应用占用');
    
    // 尝试注册备用快捷键
    const altRet = globalShortcut.register('Alt+Shift+S', () => {
      console.log('检测到备用快捷键Alt+Shift+S被按下');
      
      // 获取选中的文本
      const selectedText = getSelectedText();
      
      // 如果主窗口不存在，则创建
      if (!mainWindow) {
        mainWindow = createMainWindow();
      }
      
      // 显示主窗口
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      } else {
        mainWindow.focus();
      }
      
      // 将选中的文本发送到渲染进程
      if (selectedText) {
        mainWindow.webContents.send('selected-text', selectedText);
      }
    });
    
    if (altRet) {
      console.log('备用快捷键Alt+Shift+S注册成功');
    } else {
      console.error('备用快捷键Alt+Shift+S注册也失败');
    }
  } else {
    console.log('快捷键Alt+Space注册成功');
  }
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  try {
    // 创建主窗口
    mainWindow = createMainWindow();
    
    // 注册全局快捷键
    registerShortcuts();
    
    // 初始化IPC处理程序
    initIpcHandlers({
      mainWindow,
      historyWindow
    });
    
    // 尝试同步离线记录
    try {
      const feishuApi = require('./feishu-api');
      feishuApi.syncOfflineRecords().catch(err => {
        console.log('同步离线记录失败:', err);
      });
    } catch (error) {
      console.error('同步离线记录初始化失败:', error);
    }
    
    console.log('应用已成功启动');
  } catch (error) {
    console.error('应用启动出错:', error);
    
    // 即使出错，也尝试创建主窗口
    if (!mainWindow) {
      mainWindow = createMainWindow();
    }
  }
});

// 在macOS上，当点击dock图标且没有其他窗口打开时，通常会重新创建一个窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});

// 当所有窗口关闭时退出应用，除了在macOS上
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清除快捷键
app.on('will-quit', () => {
  // 注销所有快捷键
  globalShortcut.unregisterAll();
});
