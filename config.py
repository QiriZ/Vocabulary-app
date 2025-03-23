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
    # 飞书应用配置 - 直接设置值而不是通过环境变量
    FEISHU_APP_ID = "cli_a75c9fd3d739d01c"
    FEISHU_APP_SECRET = "v9eox66YI74zlIjE1VMNpfuJ1TCUVqUo"
    
    # 多维表格配置 - 直接设置值而不是通过环境变量
    BASE_ID = "KQOCbxJmcarEi0sfi7TcOBZpnUf"
    TABLE_ID = "tbltF9AtefTWsKUO"
    
    # 应用配置
    SECRET_KEY = os.getenv("SECRET_KEY", "FEISHU_APP_SECRET")
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
