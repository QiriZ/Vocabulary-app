// 简化版主程序 - 不使用托盘图标
const { app, BrowserWindow, globalShortcut, shell, clipboard } = require('electron');
const path = require('path');
const Store = require('electron-store');

// 初始化配置存储
const store = new Store();

// 窗口引用
let mainWindow = null;
let historyWindow = null;

// 创建主窗口
function createMainWindow() {
  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 350,
    height: 450,
    frame: true,  // 改为有边框窗口，方便调试
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
  
  // 打开开发者工具
  win.webContents.openDevTools();

  // 窗口准备好后显示
  win.once('ready-to-show', () => {
    win.show();
  });

  // 窗口关闭时重置引用
  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

// 创建历史记录窗口
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
  
  // 打开开发者工具
  win.webContents.openDevTools();

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

// 注册全局快捷键
function registerShortcuts() {
  // 注册ALT+SPACE快捷键
  const ret = globalShortcut.register('Alt+Space', () => {
    console.log('检测到Alt+Space快捷键被按下');
    
    // 获取选中的文本
    const selectedText = clipboard.readText('selection');
    console.log('选中的文本:', selectedText);
    
    // 创建或显示主窗口
    if (!mainWindow) {
      mainWindow = createMainWindow();
    } else if (!mainWindow.isVisible()) {
      mainWindow.show();
    } else {
      mainWindow.focus();
    }
    
    // 将选中的文本发送到渲染进程
    if (selectedText && mainWindow) {
      mainWindow.webContents.send('selected-text', selectedText);
    }
  });

  // 检查快捷键是否注册成功
  if (!ret) {
    console.error('快捷键注册失败 - Alt+Space可能已被其他应用占用');
  } else {
    console.log('快捷键注册成功 - Alt+Space');
  }
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  // 直接创建主窗口 - 跳过托盘图标
  mainWindow = createMainWindow();
  
  // 注册全局快捷键
  registerShortcuts();
  
  // 初始化IPC处理程序
  try {
    const { initIpcHandlers } = require('./ipc-handler');
    initIpcHandlers({
      mainWindow,
      historyWindow
    });
    console.log('IPC处理程序初始化成功');
  } catch (error) {
    console.error('IPC处理程序初始化失败:', error);
  }
  
  console.log('应用已成功启动！');
});

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，通常在应用程序中重新创建一个窗口。
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});

// 退出前清理快捷键
app.on('will-quit', () => {
  // 注销所有快捷键
  globalShortcut.unregisterAll();
});
