import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Config:
    """
    配置类 - 存储应用所需的所有配置信息
    你可以直接在这里填写飞书应用信息，但出于安全考虑，
    建议使用环境变量或者.env文件
    """
    # 飞书应用配置 - 从环境变量中获取，不再直接硬编码
    FEISHU_APP_ID = os.getenv("FEISHU_APP_ID")
    FEISHU_APP_SECRET = os.getenv("FEISHU_APP_SECRET")
    
    # 多维表格配置 - 从环境变量中获取，不再直接硬编码
    BASE_ID = os.getenv("BASE_ID")
    TABLE_ID = os.getenv("TABLE_ID")
    
    # 应用配置
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
