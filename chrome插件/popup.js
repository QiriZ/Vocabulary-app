/**
 * popup.js - 扩展弹出窗口的交互脚本
 */

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 获取打开侧边栏按钮
  const openSidePanelButton = document.getElementById('openSidePanel');
  
  // 添加点击事件监听器
  if (openSidePanelButton) {
    openSidePanelButton.addEventListener('click', async () => {
      try {
        // 修复调用方式，符合Chrome API的格式
        // chrome.sidePanel.open()方法可能需要指定参数
        if (typeof chrome.sidePanel !== 'undefined') {
          // 尝试使用不同的调用方式
          if (typeof chrome.sidePanel.open === 'function') {
            // 方法一：不传递任何参数
            await chrome.sidePanel.open();
          } else if (typeof chrome.sidePanel.setOptions === 'function') {
            // 方法二：先设置选项，然后再打开
            await chrome.sidePanel.setOptions({
              path: 'ui/sidepanel/index.html',
              enabled: true
            });
            // 然后提示用户手动打开侧边栏
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'green';
            errorDiv.style.marginTop = '10px';
            errorDiv.textContent = '请点击Chrome右上角的侧边栏图标打开侧边栏。';
            document.body.appendChild(errorDiv);
          }
          window.close(); // 打开侧边栏后关闭弹出窗口
        } else {
          throw new Error('此版本Chrome不支持侧边栏功能');
        }
      } catch (error) {
        console.error('打开侧边栏失败:', error);
        // 如果新API不可用，显示提示信息
        const errorDiv = document.createElement('div');
        errorDiv.style.color = 'red';
        errorDiv.style.marginTop = '10px';
        errorDiv.textContent = '侧边栏打开失败: ' + error.message + '。将尝试使用弹出窗口替代。';
        document.body.appendChild(errorDiv);
        
        // 延迟后打开弹出窗口作为替代方案
        setTimeout(() => {
          chrome.windows.create({
            url: chrome.runtime.getURL('ui/popup/index.html'),
            type: 'popup',
            width: 400,
            height: 600
          });
          window.close();
        }, 2000);
      }
    });
  }
});
