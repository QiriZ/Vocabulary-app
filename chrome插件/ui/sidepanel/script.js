/**
 * script.js - 侧边栏交互脚本
 * 处理UI交互和后台通信
 */

// DOM元素引用
const wordForm = document.getElementById('wordForm');
const usernameInput = document.getElementById('username');
const wordInput = document.getElementById('word');
const industryInput = document.getElementById('industry');
const submitBtn = document.getElementById('submitBtn');
const viewHistoryBtn = document.getElementById('viewHistoryBtn');
const statusMessage = document.getElementById('statusMessage');
const historyModal = document.getElementById('historyModal');
const closeModal = document.getElementById('closeModal');
const historyList = document.getElementById('historyList');
const searchHistory = document.getElementById('searchHistory');

// 初始化加载函数
document.addEventListener('DOMContentLoaded', async () => {
  console.log('侧边栏已加载');
  
  // 加载用户名
  loadUsername();
  
  // 接收选中的文本
  getCurrentSelection();
  
  // 监听来自Service Worker的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'newWordSelected') {
      console.log('收到新选中的词语:', message.selection);
      if (message.selection && message.selection.text) {
        wordInput.value = message.selection.text.trim();
      }
    }
    return true;
  });
  
  // 为用户名输入添加失去焦点事件，实时保存
  usernameInput.addEventListener('blur', saveUsername);
  
  // 为用户名输入添加输入事件，延迟保存（边输入边保存）
  usernameInput.addEventListener('input', debounce(saveUsername, 1000));
});

/**
 * 延迟执行函数（防抖）
 */
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

/**
 * 加载保存的用户名
 */
async function loadUsername() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'getUsername'
    });
    
    if (response && response.success) {
      usernameInput.value = response.username;
      console.log('已成功加载保存的用户名:', response.username);
    }
  } catch (error) {
    console.error('加载用户名失败:', error);
  }
}

/**
 * 保存用户名
 */
async function saveUsername() {
  const username = usernameInput.value.trim();
  if (username) {
    try {
      await chrome.storage.local.set({ username: username });
      console.log('用户名已保存:', username);
    } catch (error) {
      console.error('保存用户名失败:', error);
    }
  }
}

/**
 * 获取当前选中的文本
 */
async function getCurrentSelection() {
  try {
    // 使用Service Worker提供的API获取当前选择
    const response = await chrome.runtime.sendMessage({
      type: 'getCurrentSelection'
    });
    
    console.log('获取到的选中内容:', response);
    
    if (response && response.success && response.selection && response.selection.text) {
      wordInput.value = response.selection.text.trim();
      console.log('成功填充选中的词语:', response.selection.text);
    } else {
      console.log('没有找到选中的文本数据');
    }
  } catch (error) {
    console.error('获取当前选中文本失败:', error);
  }
}

/**
 * 显示状态消息
 * @param {string} message 消息内容
 * @param {string} type 消息类型 ('success'|'error')
 */
function showStatusMessage(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = 'status-message show ' + type;
  
  // 3秒后自动隐藏消息
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

/**
 * 提交表单时的处理函数
 */
wordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // 获取表单数据
  const username = usernameInput.value.trim();
  const word = wordInput.value.trim();
  const industry = industryInput.value.trim();
  
  // 简单表单验证
  if (!username || !word || !industry) {
    showStatusMessage('请填写所有必填字段', 'error');
    return;
  }
  
  // 显示提交中状态
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  
  try {
    // 发送数据到Service Worker
    const response = await chrome.runtime.sendMessage({
      type: 'submitToFeishu',
      username,
      word,
      industry
    });
    
    // 处理响应
    if (response && response.success) {
      showStatusMessage(response.message, 'success');
      
      // 成功后清空词语和行业字段
      wordInput.value = '';
      industryInput.value = '';
      
      // 显示成功动画效果
      showConfettiAnimation();
    } else {
      showStatusMessage(response.message || '提交失败', 'error');
    }
  } catch (error) {
    console.error('提交数据时出错:', error);
    showStatusMessage('提交过程中发生错误: ' + error.message, 'error');
  } finally {
    // 恢复按钮状态
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

/**
 * 查看历史记录按钮点击事件
 */
viewHistoryBtn.addEventListener('click', async () => {
  await loadHistoryRecords();
  historyModal.style.display = 'block';
});

/**
 * 关闭模态框按钮点击事件
 */
closeModal.addEventListener('click', () => {
  historyModal.style.display = 'none';
});

/**
 * 点击模态框外部时关闭
 */
window.addEventListener('click', (event) => {
  if (event.target === historyModal) {
    historyModal.style.display = 'none';
  }
});

/**
 * 历史记录搜索
 */
searchHistory.addEventListener('input', (event) => {
  const searchText = event.target.value.toLowerCase();
  const historyItems = document.querySelectorAll('.history-item');
  
  historyItems.forEach(item => {
    const word = item.querySelector('.history-word').textContent.toLowerCase();
    const industry = item.querySelector('.history-industry').textContent.toLowerCase();
    
    if (word.includes(searchText) || industry.includes(searchText)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
});

/**
 * 加载历史记录
 */
async function loadHistoryRecords() {
  try {
    // 显示加载中状态
    historyList.innerHTML = '<div class="history-empty">加载中...</div>';
    
    // 获取历史记录
    const response = await chrome.runtime.sendMessage({
      type: 'getWordHistory'
    });
    
    // 清空搜索框
    searchHistory.value = '';
    
    if (response && response.success && response.history) {
      const history = response.history;
      
      if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
        return;
      }
      
      // 清空历史列表
      historyList.innerHTML = '';
      
      // 添加每条历史记录
      history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        // 格式化时间
        const date = new Date(item.timestamp);
        const formattedTime = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        historyItem.innerHTML = `
          <div class="history-word">${item.word}</div>
          <div class="history-info">
            <span class="history-industry">${item.industry}</span>
            <span class="history-time">${formattedTime}</span>
          </div>
          ${item.sourceUrl ? `<a href="${item.sourceUrl}" target="_blank" class="history-url">${item.sourceUrl}</a>` : ''}
        `;
        
        historyList.appendChild(historyItem);
      });
    } else {
      historyList.innerHTML = '<div class="history-empty">获取历史记录失败</div>';
    }
  } catch (error) {
    console.error('加载历史记录失败:', error);
    historyList.innerHTML = `<div class="history-empty">加载失败: ${error.message}</div>`;
  }
}

/**
 * 显示成功提交的彩色动画效果
 */
function showConfettiAnimation() {
  // 创建简单的彩色动画效果
  const confetti = document.createElement('div');
  confetti.style.position = 'fixed';
  confetti.style.top = '0';
  confetti.style.left = '0';
  confetti.style.width = '100%';
  confetti.style.height = '100%';
  confetti.style.pointerEvents = 'none';
  confetti.style.zIndex = '1000';
  document.body.appendChild(confetti);
  
  // 创建彩色粒子
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = `${Math.random() * 10 + 5}px`;
    particle.style.height = particle.style.width;
    particle.style.backgroundColor = `hsl(${Math.random() * 360}, 80%, 60%)`;
    particle.style.borderRadius = '50%';
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.left = `${Math.random() * 100}%`;
    
    confetti.appendChild(particle);
    
    // 设置动画
    const animation = particle.animate(
      [
        { transform: 'translate(0, 0)', opacity: 1 },
        { transform: `translate(${Math.random() * 200 - 100}px, ${Math.random() * 200}px)`, opacity: 0 }
      ],
      {
        duration: 1000 + Math.random() * 1000,
        easing: 'cubic-bezier(0,0,0.2,1)'
      }
    );
    
    // 动画结束后移除元素
    animation.onfinish = () => {
      particle.remove();
      
      // 当所有粒子都移除后，移除容器
      if (confetti.childElementCount === 0) {
        confetti.remove();
      }
    };
  }
}
