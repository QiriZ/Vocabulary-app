"""
生词学习网站主应用
功能：从飞书多维表格获取数据并展示在网页上
"""
from flask import Flask, render_template, request, redirect, url_for, jsonify
import requests
import json
import time
from config import Config
import os
from flask_cors import CORS

# 创建Flask应用
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# 用于存储访问令牌和过期时间
token_info = {
    "access_token": None,
    "expires_at": 0
}

def get_access_token():
    """
    获取飞书API访问令牌
    如果令牌未过期，则直接返回缓存的令牌
    否则重新获取新的令牌
    """
    global token_info
    current_time = time.time()
    
    # 如果令牌未过期且存在，直接返回
    if token_info["access_token"] and token_info["expires_at"] > current_time:
        return token_info["access_token"]
    
    # 否则获取新的令牌
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "app_id": app.config["FEISHU_APP_ID"],
        "app_secret": app.config["FEISHU_APP_SECRET"]
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response_data = response.json()
        
        if response_data.get("code") == 0:
            # 成功获取令牌，更新缓存
            access_token = response_data.get("tenant_access_token")
            expires_in = response_data.get("expire")
            
            token_info["access_token"] = access_token
            token_info["expires_at"] = current_time + expires_in
            
            return access_token
        else:
            print(f"获取飞书访问令牌失败: {response_data}")
            return None
    except Exception as e:
        print(f"获取飞书访问令牌异常: {str(e)}")
        return None

def get_bitable_records():
    """
    从飞书多维表格获取数据
    返回所有记录列表
    """
    access_token = get_access_token()
    if not access_token:
        return []
    
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app.config['BASE_ID']}/tables/{app.config['TABLE_ID']}/records"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response_data = response.json()
        
        # 打印完整的响应数据，用于调试
        print("飞书API响应内容：")
        print(json.dumps(response_data, indent=2, ensure_ascii=False))
        
        if response_data.get("code") == 0:
            items = response_data.get("data", {}).get("items", [])
            return items
        else:
            print(f"获取多维表格数据失败: {response_data}")
            return []
    except Exception as e:
        print(f"获取多维表格数据异常: {str(e)}")
        return []

def process_records(records):
    """
    处理从飞书获取的原始记录数据
    转换为前端可用的格式
    """
    processed_data = []
    
    # 打印原始记录数据，用于调试
    print("原始记录数据：")
    for i, record in enumerate(records):
        print(f"记录 {i+1}:")
        print(json.dumps(record, indent=2, ensure_ascii=False))
    
    for record in records:
        record_id = record.get("record_id", "")
        fields = record.get("fields", {})
        
        # 使用飞书多维表格的实际字段名称
        input_word = fields.get("生词或书目", "")
        title = fields.get("标题", "无标题")
        sentence = fields.get("这是什么.输出结果", "")
        content = fields.get("生活化案例", "")
        comment = fields.get("记忆方法", "")
        domain = fields.get("学科领域", "")
        position = fields.get("产业链位置", "")
        reference = fields.get("参考资料", "")
        created_time = fields.get("生成时间", "")
        
        # 内容预览（前100字）
        preview = content[:100] + "..." if len(content) > 100 else content
        
        processed_data.append({
            "id": record_id,
            "input_word": input_word,
            "title": title,
            "sentence": sentence,
            "comment": comment,
            "content": content,
            "preview": preview,
            "domain": domain,
            "position": position,
            "reference": reference,
            "created_time": created_time
        })
    
    # 按生成时间降序排序（最新的排在前面）
    processed_data.sort(key=lambda x: x.get("created_time", ""), reverse=True)
    
    return processed_data

@app.route('/')
def index():
    """首页路由 - 显示所有单词和预览"""
    records = get_bitable_records()
    words = process_records(records)
    return render_template('index.html', words=words)

@app.route('/detail/<record_id>')
def detail(record_id):
    """详情页路由 - 显示特定单词的详细信息"""
    records = get_bitable_records()
    
    # 查找指定ID的记录
    word = None
    for record in records:
        if record.get("record_id") == record_id:
            word = process_records([record])[0]
            break
    
    # 如果找不到记录，重定向到首页
    if not word:
        return redirect(url_for('index'))
    
    return render_template('detail.html', word=word)

@app.errorhandler(Exception)
def handle_error(e):
    """全局错误处理函数，捕获所有异常并返回友好的错误页面"""
    app.logger.error(f"发生错误: {str(e)}")
    return render_template('error.html', error=str(e)), 500

@app.route('/health')
def health_check():
    """健康检查接口，用于验证应用是否正常运行"""
    return jsonify({"status": "ok", "env": os.environ.get('VERCEL_ENV', 'development')})

# 启动应用
if __name__ == '__main__':
    # 本地开发环境
    app.run(host='0.0.0.0', port=5000, debug=True)
