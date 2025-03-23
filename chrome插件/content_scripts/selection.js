/**
 * selection.js - 选区监听脚本
 * 这个脚本会被注入到用户访问的所有网页中，负责监听用户选中文本的操作
 */

// 检查扩展环境是否可用
let extensionAvailable = true;

try {
  // 尝试访问 chrome.runtime.id 来检查扩展环境是否有效
  if (!chrome.runtime.id) {
    extensionAvailable = false;
  }
} catch (error) {
  extensionAvailable = false;
  console.log('扩展环境不可用，内容脚本将以有限功能运行');
}

// 防抖函数：避免频繁触发事件
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// 安全地发送消息到扩展后台
function safeSendMessage(message) {
  if (!extensionAvailable) {
    console.log('扩展环境不可用，无法发送消息');
    return;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        // 静默处理错误，防止控制台报错
        console.log('发送消息时遇到错误，可能是扩展已重新加载');
        // 标记扩展为不可用
        extensionAvailable = false;
      }
    });
  } catch (error) {
    // 捕获并处理错误，防止扩展崩溃
    console.log('与扩展通信时发生错误，请刷新页面');
    extensionAvailable = false;
  }
}

// 监听用户鼠标松开事件，检测是否有文本被选中
function setupSelectionListener() {
  if (!extensionAvailable) return;

  document.addEventListener('mouseup', debounce(() => {
    if (!extensionAvailable) return;

    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString().trim();
        
        // 只有当选中内容至少有2个字符时才处理
        if (selectedText.length >= 2) {
          // 使用安全方法发送消息到Service Worker
          safeSendMessage({
            type: 'textSelected',
            text: selectedText,
            pageUrl: window.location.href,
            pageTitle: document.title
          });
        }
      }
    } catch (error) {
      console.log('处理文本选择时发生错误:', error);
    }
  }, 300));
}

// 初始化内容脚本
function initialize() {
  if (extensionAvailable) {
    // 设置选择监听器
    setupSelectionListener();
    
    // 监听来自Service Worker的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        if (message.type === 'getSelectedText') {
          const selection = window.getSelection();
          const selectedText = selection ? selection.toString().trim() : '';
          sendResponse({ text: selectedText });
        }
        return true; // 保持消息通道开放以支持异步响应
      } catch (error) {
        console.log('处理扩展消息时发生错误:', error);
        // 确保在错误情况下也有响应
        sendResponse({ error: '处理消息时发生错误' });
        extensionAvailable = false;
        return false;
      }
    });
    
    console.log('生词一键学习与飞书保存：选区监听脚本已加载');
  }
}

// 运行初始化
initialize();
