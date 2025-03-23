"""
生词学习网站主应用
功能：从飞书多维表格获取数据并展示在网页上
增加用户登录验证功能和个性化词汇展示功能
"""
from flask import Flask, render_template, request, redirect, url_for, session, flash
import requests
import json
import time
import hashlib
import os
import sqlite3
from functools import wraps
from config import Config

# 创建Flask应用
app = Flask(__name__)
app.config.from_object(Config)

# 确保设置了密钥，用于session安全
if not app.config.get('SECRET_KEY'):
    app.config['SECRET_KEY'] = os.urandom(24).hex()

# 会话超时时间（秒）
SESSION_TIMEOUT = 30 * 60  # 30分钟

# 初始化SQLite数据库
def init_db():
    """初始化本地SQLite数据库，创建用户表"""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # 创建用户表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    conn.commit()
    conn.close()
    print("数据库初始化完成")

# 创建数据库
init_db()

def login_required(f):
    """登录验证装饰器，用于保护需要登录才能访问的页面"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 检查用户是否已登录
        if 'user_id' not in session:
            # 如果未登录，重定向到登录页面
            return redirect(url_for('login'))
        # 检查会话是否过期
        if 'last_activity' in session:
            last_activity = session['last_activity']
            now = time.time()
            if now - last_activity > SESSION_TIMEOUT:
                # 会话超时，清除会话并重定向到登录页面
                session.clear()
                return redirect(url_for('login'))
            # 更新最后活动时间
            session['last_activity'] = now
        return f(*args, **kwargs)
    return decorated_function

def hash_password(password):
    """使用SHA-256哈希算法对密码进行哈希处理"""
    return hashlib.sha256(password.encode()).hexdigest()

def get_user_by_id(user_id):
    """通过用户代号查询用户"""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    user = cursor.fetchone()
    
    conn.close()
    
    if user:
        return {
            'id': user[0],
            'user_id': user[1],
            'password_hash': user[2],
            'created_at': user[3]
        }
    return None

def create_user(user_id, password_hash):
    """创建新用户"""
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO users (user_id, password_hash) VALUES (?, ?)",
            (user_id, password_hash)
        )
        
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        # 用户名已存在
        return False
    except Exception as e:
        print(f"创建用户异常: {str(e)}")
        return False

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
    
    # 如果用户已登录，只获取与该用户关联的词汇
    params = {}
    if 'user_id' in session:
        # 添加过滤条件，只获取"填写代号"字段等于当前用户ID的记录
        params["filter"] = f"CurrentValue.[填写代号] = \"{session['user_id']}\""
    
    try:
        print(f"请求参数: {params}")  # 调试日志
        response = requests.get(url, headers=headers, params=params)
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

token_info = {
    "access_token": None,
    "expires_at": 0
}

def process_records(records):
    """
    处理从飞书获取的原始记录数据
    转换为前端可用的格式
    """
    processed_data = []
    
    for record in records:
        record_id = record.get("record_id", "")
        fields = record.get("fields", {})
        
        input_word = fields.get("生词或书目", "")
        title = fields.get("标题", "无标题")
        sentence_raw = fields.get("这是什么.输出结果", "")
        content = fields.get("生活化案例", "")
        comment = fields.get("记忆方法", "")
        domain = fields.get("学科领域", "")
        position = fields.get("产业链位置", "")
        reference = fields.get("参考资料", "")
        created_time = fields.get("生成时间", "")
        
        sentence = ""
        if sentence_raw:
            try:
                sentence_data = json.loads(sentence_raw)
                if isinstance(sentence_data, list):
                    for item in sentence_data:
                        if isinstance(item, dict) and 'text' in item:
                            sentence += item['text']
                elif isinstance(sentence_data, dict) and 'text' in sentence_data:
                    sentence = sentence_data['text']
                else:
                    sentence = sentence_raw
            except (json.JSONDecodeError, TypeError):
                sentence = sentence_raw
        
        sentence = sentence.replace('\n', ' ').strip()
        
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
    
    processed_data.sort(key=lambda x: x.get("created_time", ""), reverse=True)
    
    return processed_data

@app.route('/')
@login_required
def index():
    records = get_bitable_records()
    words = process_records(records)
    return render_template('index.html', words=words)

@app.route('/detail/<record_id>')
@login_required
def detail(record_id):
    records = get_bitable_records()
    
    word = None
    for record in records:
        if record.get("record_id") == record_id:
            word = process_records([record])[0]
            break
    
    if not word:
        return redirect(url_for('index'))
    
    return render_template('detail.html', word=word)

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    
    if 'user_id' in session:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        user_id = request.form.get('user_id')
        password = request.form.get('password')
        
        if not user_id or not password:
            error = "用户代号和密码不能为空"
        else:
            user = get_user_by_id(user_id)
            
            if user:
                stored_hash = user.get('password_hash', '')
                if stored_hash and stored_hash == hash_password(password):
                    session['user_id'] = user_id
                    session['last_activity'] = time.time()
                    
                    return redirect(url_for('index'))
                else:
                    error = "用户不存在或密码错误"
            else:
                error = "用户不存在或密码错误"
    
    return render_template('login.html', error=error)

@app.route('/register', methods=['GET', 'POST'])
def register():
    error = None
    
    if 'user_id' in session:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        user_id = request.form.get('user_id')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if not user_id or not password or not confirm_password:
            error = "所有字段都必须填写"
        elif password != confirm_password:
            error = "两次输入的密码不一致"
        else:
            existing_user = get_user_by_id(user_id)
            
            if existing_user:
                error = "该用户代号已存在，请使用其他代号"
            else:
                password_hash = hash_password(password)
                
                success = create_user(user_id, password_hash)
                
                if success:
                    session['user_id'] = user_id
                    session['last_activity'] = time.time()
                    
                    return redirect(url_for('index'))
                else:
                    error = "注册失败，请稍后再试"
    
    return render_template('register.html', error=error)

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    
    return redirect(url_for('login'))

@app.context_processor
def inject_user():
    return {
        'current_user': session.get('user_id', None)
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=app.config['DEBUG'])
