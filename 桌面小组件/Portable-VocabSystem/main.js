const { app, BrowserWindow, globalShortcut, Tray, Menu, clipboard, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs'); // 添加fs模块
const Store = require('electron-store');
const { initIpcHandlers } = require('./ipc-handler');

// 初始化配置存储
const store = new Store();

// 保存窗口引用，防止被JavaScript的垃圾回收机制回收
let mainWindow = null;
let historyWindow = null;
let tray = null;

/**
 * 创建主窗口
 * @returns {BrowserWindow} 创建的主窗口实例
 */
function createMainWindow() {
  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 400,
    height: 900,
    frame: false,  // 无边框窗口
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
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
    // 获取当前屏幕尺寸
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    // 计算窗口位置，使其居中显示
    const x = Math.floor(width / 2 - 400 / 2);
    const y = Math.floor(height / 2 - 900 / 2);
    win.setPosition(x, y);
    win.show();
  });

  // 窗口失去焦点时隐藏
  win.on('blur', () => {
    win.hide();
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
 * 创建系统托盘图标
 */
function createTray() {
  // 创建托盘图标 - 使用绝对路径解决编码问题
  const trayIconPath = path.resolve(__dirname, 'assets', 'tray-icon.png');
  console.log('托盘图标路径:', trayIconPath);
  
  // 检查图标文件是否存在
  if (!fs.existsSync(trayIconPath)) {
    console.error('托盘图标文件不存在:', trayIconPath);
    // 使用内置图标作为备选
    tray = new Tray(null);
  } else {
    tray = new Tray(trayIconPath);
  }
  
  // 设置托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '显示主窗口', 
      click: () => {
        if (!mainWindow) {
          mainWindow = createMainWindow();
        } else {
          mainWindow.show();
        }
      } 
    },
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
  ]);
  
  tray.setToolTip('生词学习系统');
  tray.setContextMenu(contextMenu);
  
  // 点击托盘图标显示主窗口
  tray.on('click', () => {
    if (!mainWindow) {
      mainWindow = createMainWindow();
    } else {
      mainWindow.show();
    }
  });
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
    // 获取选中的文本
    const selectedText = getSelectedText();
    
    // 如果主窗口不存在，则创建
    if (!mainWindow) {
      mainWindow = createMainWindow();
    }
    
    // 显示主窗口
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    
    // 将选中的文本发送到渲染进程
    if (selectedText) {
      mainWindow.webContents.send('selected-text', selectedText);
    }
  });

  // 检查快捷键是否注册成功
  if (!ret) {
    console.log('快捷键注册失败');
  }
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  try {
    // 创建系统托盘图标
    createTray();
    
    // 创建主窗口
    mainWindow = createMainWindow();
    
    // 注册全局快捷键
    registerShortcuts();
    
    // 初始化IPC处理程序
    initIpcHandlers({
      mainWindow,
      historyWindow
    });
    
    console.log('应用已成功启动');
  } catch (error) {
    console.error('应用启动出错:', error);
    
    // 即使托盘图标创建失败，也继续创建主窗口
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

// 应用退出前注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});