/**
 * feishu.js - 飞书API适配器
 * 负责处理与飞书API的交互，包括OAuth认证、数据提交等
 */

// 飞书应用配置
const FEISHU_CONFIG = {
  // 飞书应用凭证
  APP_ID: "【请输入自建飞书APPID】",
  APP_SECRET: "【请输入自建飞书APPSECRET】",
  
  // 多维表格配置
  BASE_ID: "【请输入自建表格ID】",
  TABLE_ID: "【请输入自建表格ID】",
  
  // API终端点
  BASE_URL: "https://open.feishu.cn/open-apis",
  AUTH_URL: "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
  TABLE_URL: "https://open.feishu.cn/open-apis/bitable/v1/apps"
};

// 字段映射配置
const FIELD_CONFIG = {
  // 账户名
  ACCOUNT_NAME: "填写代号",
  // 词语（索引列）
  WORD: "生词或书目",
  // 行业分类
  INDUSTRY: "学科领域",
  // 来源URL
  SOURCE_URL: "相关链接"
};

/**
 * 获取飞书API访问令牌
 * @returns {Promise<string>} 访问令牌
 */
export async function getAccessToken() {
  try {
    // 首先尝试从本地缓存获取有效的令牌
    const cachedToken = await chrome.storage.local.get(['feishuToken', 'tokenExpiry']);
    
    // 检查令牌是否存在且未过期（提前5分钟视为过期）
    const now = Date.now();
    if (cachedToken.feishuToken && cachedToken.tokenExpiry && 
        now < cachedToken.tokenExpiry - 5 * 60 * 1000) {
      console.log('使用缓存的飞书访问令牌');
      return cachedToken.feishuToken;
    }
    
    // 如果没有有效的缓存令牌，请求新令牌
    console.log('正在获取新的飞书访问令牌...');
    
    const response = await fetch(FEISHU_CONFIG.AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: FEISHU_CONFIG.APP_ID,
        app_secret: FEISHU_CONFIG.APP_SECRET
      })
    });
    
    const data = await response.json();
    
    if (data.code !== 0) {
      console.error('获取飞书访问令牌失败:', data);
      throw new Error(`飞书API错误: ${data.msg || '未知错误'}`);
    }
    
    const token = data.tenant_access_token;
    const expiryTime = now + data.expire * 1000; // expire单位为秒，转换为毫秒
    
    // 缓存访问令牌
    await chrome.storage.local.set({
      feishuToken: token,
      tokenExpiry: expiryTime
    });
    
    return token;
  } catch (error) {
    console.error('获取飞书访问令牌时出错:', error);
    throw new Error('无法获取飞书访问令牌: ' + error.message);
  }
}

/**
 * 将生词数据保存到飞书多维表格
 * @param {string} token 飞书访问令牌
 * @param {Object} data 要保存的数据对象
 * @param {string} data.username 用户名
 * @param {string} data.word 生词
 * @param {string} data.industry 行业分类
 * @param {string} data.sourceUrl 来源URL
 * @returns {Promise<Object>} 保存结果
 */
export async function saveToFeishu(token, data) {
  try {
    // 构建API请求URL
    const apiUrl = `${FEISHU_CONFIG.TABLE_URL}/${FEISHU_CONFIG.BASE_ID}/tables/${FEISHU_CONFIG.TABLE_ID}/records`;
    
    // 规范化URL格式
    const sourceUrl = data.sourceUrl.startsWith('http') 
      ? data.sourceUrl 
      : `https://${data.sourceUrl}`;
    
    // 构建请求体
    const requestBody = {
      fields: {
        [FIELD_CONFIG.ACCOUNT_NAME]: data.username,
        [FIELD_CONFIG.WORD]: data.word,
        [FIELD_CONFIG.INDUSTRY]: data.industry,
        [FIELD_CONFIG.SOURCE_URL]: sourceUrl
      }
    };
    
    // 打印请求体以便调试
    console.log("发送到飞书的数据:", JSON.stringify(requestBody));
    
    // 发送请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseData = await response.json();
    
    // 检查响应状态
    if (responseData.code !== 0) {
      console.error('保存到飞书多维表格失败:', JSON.stringify(responseData));
      return {
        success: false,
        error: `飞书API错误: ${responseData.msg || JSON.stringify(responseData) || '未知错误'}`
      };
    }
    
    return {
      success: true,
      recordId: responseData.data?.record?.id
    };
  } catch (error) {
    console.error('保存到飞书多维表格时出错:', error);
    // 确保返回字符串形式的错误信息
    let errorMessage = '未知错误';
    if (error.message) {
      errorMessage = error.message;
    } else if (typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    } else {
      errorMessage = String(error);
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 实现指数退避的网络请求重试策略
 * @param {Function} operation 要执行的异步操作
 * @param {number} retries 最大重试次数
 * @returns {Promise<any>} 操作结果
 */
export async function retryOperation(operation, retries = 3) {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`操作失败，尝试重试 (${i + 1}/${retries})...`);
      lastError = error;
      
      // 如果不是最后一次尝试，等待一段时间后重试
      if (i < retries - 1) {
        // 指数退避策略: 等待时间随重试次数指数增长
        // 1000ms, 2000ms, 4000ms, ...
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
