from flask import Flask, Response
import os
import sys
import json
from io import BytesIO

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# 导入项目中的Flask应用
from app import app as flask_app

def handler(event, context):
    """Netlify函数处理器"""
    
    # 从事件中提取路径
    path = event.get('path', '/')
    
    # 设置环境变量
    os.environ['BASE_ID'] = os.environ.get('BASE_ID', '')
    os.environ['TABLE_ID'] = os.environ.get('TABLE_ID', '')
    os.environ['APP_ID'] = os.environ.get('APP_ID', '')
    os.environ['APP_SECRET'] = os.environ.get('APP_SECRET', '')
    
    # 启动Flask应用并获取首页
    with flask_app.test_client() as client:
        response = client.get(path)
        
    # 返回Netlify函数响应
    return {
        'statusCode': response.status_code,
        'headers': {
            'Content-Type': response.content_type
        },
        'body': response.data.decode('utf-8')
    }
