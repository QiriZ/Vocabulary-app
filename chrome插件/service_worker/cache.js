/**
 * cache.js - 本地缓存管理模块
 * 负责处理扩展的本地数据存储，包括用户设置、历史记录和离线数据
 */

/**
 * 将数据保存到本地缓存
 * @param {string} key 缓存键名
 * @param {any} value 要缓存的数据
 * @returns {Promise<void>}
 */
export async function saveToLocalCache(key, value) {
  try {
    // 使用chrome.storage.local API保存数据
    await chrome.storage.local.set({ [key]: value });
    console.log(`数据已成功保存到本地缓存: ${key}`);
    return true;
  } catch (error) {
    console.error(`保存数据到本地缓存失败: ${key}`, error);
    throw new Error(`无法保存数据: ${error.message}`);
  }
}

/**
 * 从本地缓存获取数据
 * @param {string} key 缓存键名
 * @returns {Promise<any>} 缓存的数据
 */
export async function getFromLocalCache(key) {
  try {
    // 使用chrome.storage.local API获取数据
    const result = await chrome.storage.local.get([key]);
    return result[key];
  } catch (error) {
    console.error(`从本地缓存获取数据失败: ${key}`, error);
    throw new Error(`无法获取数据: ${error.message}`);
  }
}

/**
 * 从本地缓存删除数据
 * @param {string} key 缓存键名
 * @returns {Promise<boolean>} 操作结果
 */
export async function removeFromLocalCache(key) {
  try {
    // 使用chrome.storage.local API删除数据
    await chrome.storage.local.remove([key]);
    console.log(`数据已从本地缓存删除: ${key}`);
    return true;
  } catch (error) {
    console.error(`从本地缓存删除数据失败: ${key}`, error);
    throw new Error(`无法删除数据: ${error.message}`);
  }
}

/**
 * 清除所有本地缓存数据
 * @returns {Promise<boolean>} 操作结果
 */
export async function clearLocalCache() {
  try {
    // 使用chrome.storage.local API清除所有数据
    await chrome.storage.local.clear();
    console.log('所有本地缓存数据已清除');
    return true;
  } catch (error) {
    console.error('清除本地缓存数据失败', error);
    throw new Error(`无法清除缓存数据: ${error.message}`);
  }
}

/**
 * 保存离线队列数据
 * 当网络不可用时，将数据保存到离线队列，以便在网络恢复后再次尝试提交
 * @param {Object} data 要保存的数据对象
 * @returns {Promise<boolean>} 操作结果
 */
export async function saveToOfflineQueue(data) {
  try {
    // 获取当前离线队列
    const queue = await getFromLocalCache('offlineQueue') || [];
    
    // 添加新数据到队列，并附加时间戳
    queue.push({
      ...data,
      queueTimestamp: new Date().toISOString()
    });
    
    // 保存更新后的队列
    await saveToLocalCache('offlineQueue', queue);
    console.log('数据已保存到离线队列，将在网络可用时提交');
    return true;
  } catch (error) {
    console.error('保存数据到离线队列失败', error);
    throw new Error(`无法保存到离线队列: ${error.message}`);
  }
}

/**
 * 获取离线队列
 * @returns {Promise<Array>} 离线队列中的数据
 */
export async function getOfflineQueue() {
  return await getFromLocalCache('offlineQueue') || [];
}

/**
 * 从离线队列中移除数据
 * @param {number} index 要移除的数据索引
 * @returns {Promise<boolean>} 操作结果
 */
export async function removeFromOfflineQueue(index) {
  try {
    // 获取当前离线队列
    const queue = await getFromLocalCache('offlineQueue') || [];
    
    // 检查索引是否有效
    if (index < 0 || index >= queue.length) {
      throw new Error('无效的队列索引');
    }
    
    // 移除指定索引的数据
    queue.splice(index, 1);
    
    // 保存更新后的队列
    await saveToLocalCache('offlineQueue', queue);
    console.log(`数据已从离线队列移除，索引: ${index}`);
    return true;
  } catch (error) {
    console.error('从离线队列移除数据失败', error);
    throw new Error(`无法从离线队列移除数据: ${error.message}`);
  }
}
