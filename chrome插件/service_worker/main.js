/**
 * main.js - 扩展的核心逻辑处理中心
 * 这个Service Worker负责协调扩展的各个部分，包括处理右键菜单、
 * 侧边栏通信和飞书API交互等核心功能
 */

// 导入其他模块
import { saveToFeishu, getAccessToken } from './feishu.js';
import { saveToLocalCache, getFromLocalCache } from './cache.js';

// 存储当前选中的文本和上下文信息
let currentSelection = {
  text: '',
  pageUrl: '',
  pageTitle: '',
  timestamp: null
};

// 检查浏览器是否支持侧边栏API
let supportsSidePanel = false;
try {
  supportsSidePanel = typeof chrome.sidePanel !== 'undefined';
  console.log('浏览器' + (supportsSidePanel ? '支持' : '不支持') + '侧边栏API');
} catch (error) {
  console.log('侧边栏API不可用，将使用弹出窗口作为替代');
}

// 在安装扩展时初始化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('生词一键学习与飞书保存扩展已安装');
  
  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'saveWord',
    title: '保存"%s"到生词本',
    contexts: ['selection'],
    documentUrlPatterns: ['*://*/*']
  });

  // 初始化存储
  const userInfo = await chrome.storage.local.get(['username']);
  if (!userInfo.username) {
    // 如果用户名不存在，设置一个默认值
    await chrome.storage.local.set({ username: '默认用户' });
  }
  
  // 如果支持侧边栏API，初始化侧边栏配置
  if (supportsSidePanel) {
    try {
      await chrome.sidePanel.setOptions({
        path: 'ui/sidepanel/index.html',
        enabled: true
      });
      console.log('侧边栏配置成功');
    } catch (error) {
      console.error('侧边栏配置失败:', error);
      supportsSidePanel = false;
    }
  }
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveWord') {
    // 保存当前选择的文本
    currentSelection = {
      text: info.selectionText,
      pageUrl: tab.url,
      pageTitle: tab.title,
      timestamp: new Date().toISOString()
    };
    
    // 将当前选择缓存到本地
    await saveToLocalCache('currentSelection', currentSelection);
    
    try {
      // 根据浏览器支持情况选择不同的打开方式
      if (supportsSidePanel) {
        // 如果支持侧边栏，尝试打开它
        try {
          // 设置侧边栏配置
          await chrome.sidePanel.setOptions({
            path: 'ui/sidepanel/index.html',
            enabled: true
          });
          
          // 显示通知提示用户如何打开侧边栏
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '../assets/icon128.png',
            title: '生词已保存',
            message: `"${info.selectionText}" 已保存。请点击扩展图标，然后点击"打开侧边栏"按钮完成提交。`,
            priority: 2
          });
          
          console.log('已保存生词，等待用户打开侧边栏完成提交');
        } catch (error) {
          console.error('侧边栏操作失败:', error);
          supportsSidePanel = false;
          // 如果侧边栏操作失败，回退到使用弹出窗口
          openPopupWindow();
        }
      } else {
        // 如果不支持侧边栏，打开弹出窗口
        openPopupWindow();
      }
    } catch (error) {
      console.error('操作失败:', error);
      
      // 在出错时显示通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../assets/icon128.png',
        title: '操作提示',
        message: '请点击浏览器工具栏中的扩展图标，然后选择"保存生词"。',
        priority: 2
      });
    }
  }
});

// 打开弹出窗口作为侧边栏的替代方案
function openPopupWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL('ui/popup/index.html'),
    type: 'popup',
    width: 400,
    height: 600
  });
}

// 监听来自内容脚本和侧边栏/弹出窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理从内容脚本接收到的文本选择消息
  if (message.type === 'textSelected') {
    currentSelection = {
      text: message.text,
      pageUrl: message.pageUrl,
      pageTitle: message.pageTitle || '未知页面',
      timestamp: new Date().toISOString()
    };
    saveToLocalCache('currentSelection', currentSelection);
    sendResponse({ success: true });
  }
  
  // 处理来自侧边栏/弹出窗口的提交请求
  else if (message.type === 'submitToFeishu') {
    (async () => {
      try {
        // 获取飞书访问令牌
        const token = await getAccessToken();
        
        // 提交数据到飞书
        const result = await saveToFeishu(token, {
          username: message.username,
          word: message.word,
          industry: message.industry,
          sourceUrl: message.sourceUrl || currentSelection.pageUrl
        });
        
        // 保存成功后的处理
        if (result.success) {
          // 保存到本地历史记录
          const history = await getFromLocalCache('wordHistory') || [];
          history.unshift({
            word: message.word,
            industry: message.industry,
            sourceUrl: message.sourceUrl || currentSelection.pageUrl,
            timestamp: new Date().toISOString()
          });
          
          // 最多保存100条历史记录
          if (history.length > 100) {
            history.pop();
          }
          
          await saveToLocalCache('wordHistory', history);
          await chrome.storage.local.set({ username: message.username });
          
          sendResponse({ 
            success: true, 
            message: `成功保存"${message.word}"到飞书多维表格`
          });
        } else {
          sendResponse({ 
            success: false, 
            message: '保存到飞书失败: ' + (result.error || '未知错误')
          });
        }
      } catch (error) {
        console.error('提交到飞书时出错:', error);
        sendResponse({ 
          success: false, 
          message: '提交过程中发生错误: ' + error.message
        });
      }
    })();
    
    return true; // 保持消息通道开放以支持异步响应
  }
  
  // 处理获取历史记录的请求
  else if (message.type === 'getWordHistory') {
    (async () => {
      try {
        const history = await getFromLocalCache('wordHistory') || [];
        sendResponse({ 
          success: true, 
          history: history 
        });
      } catch (error) {
        console.error('获取历史记录失败:', error);
        sendResponse({ 
          success: false, 
          message: '获取历史记录失败: ' + error.message
        });
      }
    })();
    
    return true; // 保持消息通道开放以支持异步响应
  }
  
  // 请求当前用户名
  else if (message.type === 'getUsername') {
    (async () => {
      try {
        const data = await chrome.storage.local.get(['username']);
        sendResponse({ 
          success: true, 
          username: data.username || '默认用户'
        });
      } catch (error) {
        console.error('获取用户名失败:', error);
        sendResponse({ 
          success: false, 
          message: '获取用户名失败: ' + error.message
        });
      }
    })();
    
    return true; // 保持消息通道开放以支持异步响应
  }
  
  // 获取当前选择的词语
  else if (message.type === 'getCurrentSelection') {
    (async () => {
      try {
        const selection = await getFromLocalCache('currentSelection');
        sendResponse({ 
          success: true, 
          selection: selection || null
        });
      } catch (error) {
        console.error('获取当前选择失败:', error);
        sendResponse({ 
          success: false, 
          message: '获取当前选择失败: ' + error.message
        });
      }
    })();
    
    return true; // 保持消息通道开放以支持异步响应
  }
});
