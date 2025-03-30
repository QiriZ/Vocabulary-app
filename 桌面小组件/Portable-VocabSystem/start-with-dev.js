const { spawn } = require('child_process');
const path = require('path');
const electronPath = path.join(__dirname, 'electron-v34.4.1-win32-x64', 'electron.exe');

// 启动Electron应用并开启开发者工具
const electronProcess = spawn(electronPath, ['.', '--dev'], {
  stdio: 'inherit',
  cwd: __dirname
});

electronProcess.on('close', (code) => {
  console.log(`Electron应用已退出，退出码: ${code}`);
});
