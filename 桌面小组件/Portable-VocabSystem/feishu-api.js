/**
 * 飞书多维表格API模块
 * 负责与飞书API进行通信，实现数据同步功能
 */

const axios = require('axios');
const Store = require('electron-store');

// 初始化本地存储
const store = new Store();

// 飞书应用配置
const FEISHU_CONFIG = {
  APP_ID: "cli_a75c9fd3d739d01c",
  APP_SECRET: "v9eox66YI74zlIjE1VMNpfuJ1TCUVqUo",
  BASE_ID: "KQOCbxJmcarEi0sfi7TcOBZpnUf",
  TABLE_ID: "tbltF9AtefTWsKUO"
};

// 字段配置
const FIELD_CONFIG = {
  ACCOUNT_NAME: "填写代号",
  WORD: "生词或书目",
  INDUSTRY: "学科领域",
  SOURCE_URL: "相关链接"
};

// 飞书API基础URL
const BASE_URL = 'https://open.feishu.cn/open-apis';

/**
 * 获取飞书访问令牌
 * @returns {Promise<string>} 访问令牌
 */
async function getAccessToken() {
  try {
    // 检查缓存中是否有有效的令牌
    const cachedToken = store.get('feishuToken');
    const tokenExpiry = store.get('feishuTokenExpiry');
    
    // 如果令牌存在且未过期，直接返回
    if (cachedToken && tokenExpiry && new Date().getTime() < tokenExpiry) {
      return cachedToken;
    }
    
    // 获取新的访问令牌
    const response = await axios.post(`${BASE_URL}/auth/v3/tenant_access_token/internal`, {
      app_id: FEISHU_CONFIG.APP_ID,
      app_secret: FEISHU_CONFIG.APP_SECRET
    });
    
    if (response.data.code !== 0) {
      throw new Error(`获取访问令牌失败: ${response.data.msg}`);
    }
    
    const token = response.data.tenant_access_token;
    const expiryTime = new Date().getTime() + (response.data.expire * 1000) - 60000; // 提前1分钟过期
    
    // 缓存令牌
    store.set('feishuToken', token);
    store.set('feishuTokenExpiry', expiryTime);
    
    return token;
  } catch (error) {
    console.error('获取飞书访问令牌失败:', error);
    throw error;
  }
}

/**
 * 添加生词记录到飞书多维表格
 * @param {Object} record 生词记录对象
 * @param {string} record.accountName 账户名称
 * @param {string} record.word 生词
 * @param {string} record.industry 学科领域
 * @param {string} record.sourceUrl 来源URL
 * @returns {Promise<Object>} 添加结果
 */
async function addVocabularyRecord(record) {
  try {
    // 获取访问令牌
    const token = await getAccessToken();
    
    // 准备记录数据
    const recordData = {
      fields: {
        [FIELD_CONFIG.ACCOUNT_NAME]: record.accountName,
        [FIELD_CONFIG.WORD]: record.word,
        [FIELD_CONFIG.INDUSTRY]: record.industry,
        [FIELD_CONFIG.SOURCE_URL]: record.sourceUrl || ''
      }
    };
    
    // 发送请求添加记录
    const response = await axios.post(
      `${BASE_URL}/bitable/v1/apps/${FEISHU_CONFIG.BASE_ID}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
      recordData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`添加记录失败: ${response.data.msg}`);
    }
    
    return response.data.data;
  } catch (error) {
    console.error('添加生词记录失败:', error);
    
    // 检查是否是网络错误
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      throw new Error('offline');
    }
    
    throw error;
  }
}

/**
 * 获取生词记录列表
 * @param {Object} options 查询选项
 * @param {number} options.pageSize 每页记录数
 * @param {string} options.pageToken 分页标记
 * @returns {Promise<Object>} 记录列表和分页信息
 */
async function getVocabularyRecords(options = {}) {
  try {
    // 获取访问令牌
    const token = await getAccessToken();
    
    // 准备查询参数
    const params = {};
    if (options.pageSize) params.page_size = options.pageSize;
    if (options.pageToken) params.page_token = options.pageToken;
    
    // 发送请求获取记录
    const response = await axios.get(
      `${BASE_URL}/bitable/v1/apps/${FEISHU_CONFIG.BASE_ID}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
      {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`获取记录失败: ${response.data.msg}`);
    }
    
    // 处理记录数据，转换为更易用的格式
    const records = response.data.data.items.map(item => {
      return {
        id: item.record_id,
        accountName: item.fields[FIELD_CONFIG.ACCOUNT_NAME] || '',
        word: item.fields[FIELD_CONFIG.WORD] || '',
        industry: item.fields[FIELD_CONFIG.INDUSTRY] || '',
        sourceUrl: item.fields[FIELD_CONFIG.SOURCE_URL] || '',
        createTime: item.created_at || ''
      };
    });
    
    return {
      records,
      pageToken: response.data.data.page_token,
      hasMore: response.data.data.has_more
    };
  } catch (error) {
    console.error('获取生词记录失败:', error);
    
    // 检查是否是网络错误
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      throw new Error('offline');
    }
    
    throw error;
  }
}

/**
 * 更新生词记录
 * @param {string} recordId 记录ID
 * @param {Object} record 更新的记录数据
 * @returns {Promise<Object>} 更新结果
 */
async function updateVocabularyRecord(recordId, record) {
  try {
    // 获取访问令牌
    const token = await getAccessToken();
    
    // 准备更新数据
    const updateData = {
      fields: {}
    };
    
    // 只更新提供的字段
    if (record.accountName) updateData.fields[FIELD_CONFIG.ACCOUNT_NAME] = record.accountName;
    if (record.word) updateData.fields[FIELD_CONFIG.WORD] = record.word;
    if (record.industry) updateData.fields[FIELD_CONFIG.INDUSTRY] = record.industry;
    if (record.sourceUrl !== undefined) updateData.fields[FIELD_CONFIG.SOURCE_URL] = record.sourceUrl;
    
    // 发送请求更新记录
    const response = await axios.put(
      `${BASE_URL}/bitable/v1/apps/${FEISHU_CONFIG.BASE_ID}/tables/${FEISHU_CONFIG.TABLE_ID}/records/${recordId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`更新记录失败: ${response.data.msg}`);
    }
    
    return response.data.data;
  } catch (error) {
    console.error('更新生词记录失败:', error);
    
    // 检查是否是网络错误
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      throw new Error('offline');
    }
    
    throw error;
  }
}

/**
 * 删除生词记录
 * @param {string} recordId 记录ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteVocabularyRecord(recordId) {
  try {
    // 获取访问令牌
    const token = await getAccessToken();
    
    // 发送请求删除记录
    const response = await axios.delete(
      `${BASE_URL}/bitable/v1/apps/${FEISHU_CONFIG.BASE_ID}/tables/${FEISHU_CONFIG.TABLE_ID}/records/${recordId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`删除记录失败: ${response.data.msg}`);
    }
    
    return true;
  } catch (error) {
    console.error('删除生词记录失败:', error);
    
    // 检查是否是网络错误
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      throw new Error('offline');
    }
    
    throw error;
  }
}

/**
 * 同步离线队列中的记录
 * @returns {Promise<Object>} 同步结果
 */
async function syncOfflineRecords() {
  try {
    // 获取离线队列
    const offlineQueue = store.get('offlineQueue') || [];
    
    if (offlineQueue.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }
    
    // 同步结果统计
    const result = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };
    
    // 逐个同步记录
    const newQueue = [];
    for (const record of offlineQueue) {
      try {
        await addVocabularyRecord(record);
        result.synced++;
      } catch (error) {
        // 如果仍然离线，保留在队列中
        if (error.message === 'offline') {
          newQueue.push(record);
        } else {
          result.failed++;
          result.errors.push({
            record,
            error: error.message
          });
        }
      }
    }
    
    // 更新离线队列
    store.set('offlineQueue', newQueue);
    
    // 如果有记录未能同步，标记为部分成功
    if (newQueue.length > 0 || result.failed > 0) {
      result.success = false;
    }
    
    return result;
  } catch (error) {
    console.error('同步离线记录失败:', error);
    return {
      success: false,
      synced: 0,
      failed: 0,
      error: error.message
    };
  }
}

// 导出模块函数
module.exports = {
  addVocabularyRecord,
  getVocabularyRecords,
  updateVocabularyRecord,
  deleteVocabularyRecord,
  syncOfflineRecords
};