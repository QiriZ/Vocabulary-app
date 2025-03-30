// 这是一个简单的Electron应用，专门用于测试全局快捷键
const { app, BrowserWindow, globalShortcut, dialog } = require('electron');

// 保存窗口引用
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 500,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 加载一个简单的HTML内容
  mainWindow.loadURL(`data:text/html,
    <html>
      <head>
        <title>快捷键测试</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          p { margin: 10px 0; }
          .info { background: #f0f0f0; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>快捷键测试应用</h1>
        <p>请在任意应用中按下 <b>Alt+Space</b> 快捷键</p>
        <p>如果快捷键生效，将会显示一个弹窗</p>
        <div class="info">
          <p>如果没有反应，可能是因为：</p>
          <ol>
            <li>Alt+Space 已被其他应用程序占用</li>
            <li>操作系统保留了这个快捷键组合</li>
          </ol>
        </div>
      </body>
    </html>
  `);

  // 打开开发者工具
  mainWindow.webContents.openDevTools();

  // 窗口关闭时的处理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // 注册Alt+Space快捷键
  const ret = globalShortcut.register('Alt+Space', () => {
    console.log('检测到Alt+Space快捷键被按下');
    
    // 显示一个弹窗
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '快捷键已触发',
      message: 'Alt+Space 快捷键工作正常！',
      detail: '检测到您按下了Alt+Space快捷键。如果您可以看到这个弹窗，说明快捷键已被正确注册。'
    });
  });

  if (!ret) {
    console.error('注册Alt+Space快捷键失败 - 可能已被其他应用占用');
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: '快捷键注册失败',
      message: 'Alt+Space 快捷键无法注册',
      detail: '这可能是因为Alt+Space已被系统或其他应用程序占用。\n\n请尝试使用其他快捷键组合。'
    });
  } else {
    console.log('Alt+Space快捷键注册成功');
  }
  
  // 尝试注册其他备选快捷键
  const altShiftS = globalShortcut.register('Alt+Shift+S', () => {
    console.log('检测到Alt+Shift+S快捷键被按下');
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '备选快捷键已触发',
      message: 'Alt+Shift+S 快捷键工作正常！',
      detail: '这是一个备选快捷键，如果Alt+Space不起作用，您可以使用这个替代。'
    });
  });
  
  if (altShiftS) {
    console.log('Alt+Shift+S备选快捷键注册成功');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  // 注销所有快捷键
  globalShortcut.unregisterAll();
});
