/**
 * script.js - 弹出窗口交互脚本
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
  console.log('弹出窗口已加载');
  
  // 加载用户名
  loadUsername();
  
  // 接收选中的文本
  getCurrentSelection();
  
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
  
  // 3秒后自动隐藏
  setTimeout(() => {
    statusMessage.className = 'status-message';
  }, 3000);
}

/**
 * 提交表单时的处理函数
 */
wordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // 获取表单数据
  const formData = {
    username: usernameInput.value.trim(),
    word: wordInput.value.trim(),
    industry: industryInput.value
  };
  
  // 验证数据
  if (!formData.username) {
    showStatusMessage('请输入您的账户名称', 'error');
    return;
  }
  
  if (!formData.word) {
    showStatusMessage('请输入词语', 'error');
    return;
  }
  
  if (!formData.industry) {
    showStatusMessage('请选择行业分类', 'error');
    return;
  }
  
  // 禁用提交按钮，防止重复提交
  submitBtn.disabled = true;
  submitBtn.textContent = '提交中...';
  
  try {
    // 发送到Service Worker处理
    const response = await chrome.runtime.sendMessage({
      type: 'submitToFeishu',
      ...formData
    });
    
    // 处理响应
    if (response && response.success) {
      // 显示成功消息
      showStatusMessage(response.message, 'success');
      
      // 清空词语和行业输入
      wordInput.value = '';
      industryInput.value = '';
      
      // 展示成功动画
      showConfettiAnimation();
    } else {
      // 显示错误消息
      showStatusMessage(response.message || '提交失败，请重试', 'error');
    }
  } catch (error) {
    console.error('提交数据失败:', error);
    showStatusMessage('提交过程中发生错误', 'error');
  } finally {
    // 恢复提交按钮状态
    submitBtn.disabled = false;
    submitBtn.textContent = '提交保存';
  }
});

/**
 * 查看历史记录按钮点击事件
 */
viewHistoryBtn.addEventListener('click', () => {
  loadHistoryRecords();
  historyModal.style.display = 'block';
});

/**
 * 关闭模态框按钮点击事件
 */
closeModal.addEventListener('click', () => {
  historyModal.style.display = 'none';
});

/**
 * 点击模态框外部关闭模态框
 */
window.addEventListener('click', (event) => {
  if (event.target === historyModal) {
    historyModal.style.display = 'none';
  }
});

/**
 * 历史记录搜索功能
 */
searchHistory.addEventListener('input', (event) => {
  const searchTerm = event.target.value.toLowerCase();
  const historyItems = historyList.querySelectorAll('.history-item');
  
  historyItems.forEach(item => {
    const word = item.querySelector('.history-word').textContent.toLowerCase();
    const industry = item.querySelector('.history-industry').textContent.toLowerCase();
    
    if (word.includes(searchTerm) || industry.includes(searchTerm)) {
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
    // 清空历史记录列表
    historyList.innerHTML = '';
    
    // 显示加载中提示
    historyList.innerHTML = '<div class="loading">加载中...</div>';
    
    // 获取历史记录
    const response = await chrome.runtime.sendMessage({
      type: 'getWordHistory'
    });
    
    // 清空加载中提示
    historyList.innerHTML = '';
    
    if (response && response.success && response.history && response.history.length > 0) {
      // 格式化并显示历史记录
      response.history.forEach(item => {
        const historyItem = document.createElement('li');
        historyItem.className = 'history-item';
        
        // 格式化日期
        const date = new Date(item.timestamp);
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        historyItem.innerHTML = `
          <div class="history-word">${item.word}</div>
          <div class="history-industry">行业分类: <span>${item.industry}</span></div>
          <div class="history-meta">
            <span>${formattedDate}</span>
            ${item.sourceUrl ? `<a href="${item.sourceUrl}" class="history-link" target="_blank">查看来源</a>` : ''}
          </div>
        `;
        
        historyList.appendChild(historyItem);
      });
    } else {
      // 显示无记录提示
      historyList.innerHTML = '<div class="no-history">暂无历史记录</div>';
    }
  } catch (error) {
    console.error('加载历史记录失败:', error);
    historyList.innerHTML = '<div class="error">加载历史记录失败</div>';
  }
}

/**
 * 显示成功提交的彩色动画效果
 */
function showConfettiAnimation() {
  // 创建一个临时canvas元素
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  const colors = ['#1e88e5', '#43a047', '#ffb300', '#e53935', '#5e35b1'];
  
  // 彩色碎片数量
  const particleCount = 100;
  const particles = [];
  
  // 创建彩色碎片
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      size: Math.random() * 10 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20 - 5,
      gravity: 0.5
    });
  }
  
  // 动画函数
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let completed = true;
    
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.size *= 0.97;
      
      if (p.size > 0.5) {
        completed = false;
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    if (!completed) {
      requestAnimationFrame(animate);
    } else {
      // 移除canvas
      canvas.remove();
    }
  }
  
  // 开始动画
  animate();
}
