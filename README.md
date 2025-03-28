# 个人生词学习网站
![版本](https://img.shields.io/badge/版本-1.0.0-orange)
![Flask](https://img.shields.io/badge/Flask-2.0.1-blue)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.0-purple)
[![GitHub Stars](https://img.shields.io/github/stars/QiriZ/Vocabulary-app?style=social)](https://github.com/QiriZ/Vocabulary-app)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)


飞书文档说明：https://l93sy3jua5.feishu.cn/docx/XQRBdNEL2oUEG3xfka6cxTwrnwO?from=from_copylink

这是一个基于 Flask 的个人生词学习网站，可以随时桌面划词录入生词。采用苹果设计风格，融入中国红主题色，提供简洁优雅的学习体验。

## 功能特点

1. 用户管理功能
   - 用户注册与登录系统
   - 密码安全加密存储
   - 会话管理（30分钟无操作自动登出）
   - 个人账户与生词关联

2. 个性化内容展示
   - 用户登录后仅展示与其关联的词汇
   - 顶部导航栏显示当前用户信息
   - 一键登出功能

3. 首页展示
   - 生词或书目
   - 这是什么.输出结果
   - 学科领域
   - 产业链位置
   - 记忆方法
   - 生活化案例（前100字）
   - 新标签页打开文章详情

4. 文章详情页
   - 完整标题
   - 生词或书目
   - 这是什么.输出结果
   - 学科领域
   - 产业链位置
   - 记忆方法
   - 生活化案例（前100字）
   - 产业链位置
   - 参考资料
     
5. 桌面小组件
   - 开发中

## 技术栈

- 后端：Python Flask 3.0.0
- 前端：原生HTML/CSS，采用苹果设计风格
- 数据源：飞书多维表格
- 用户认证：基于SQLite的本地数据库
- 密码安全：SHA-256哈希加密

## 飞书配置要求

1. 创建飞书应用
   - 获取应用凭证（App ID 和 App Secret）
   - 开启多维表格权限：`bitable:record:read`

2. 创建多维表格
   - 创建包含以下字段的表格：
     * 标题
     * 生词或书目
     * 这是什么.输出结果
     * 生活化案例
     * 记忆方法
     * 学科领域
     * 产业链位置
     * 参考资料
     * 填写代号（用于关联用户账号）

## 快速开始

1. 克隆项目后，创建以下目录结构：
```
blog/
├── README.md
├── requirements.txt
├── config.py           # 配置文件
├── app.py              # 主应用
├── users.db            # 用户数据库
├── static/             # 静态文件
│   ├── css/
│   └── js/
└── templates/          # HTML模板
    ├── base.html       # 基础模板
    ├── index.html      # 首页
    ├── detail.html     # 详情页
    ├── login.html      # 登录页面
    └── register.html   # 注册页面
```

2. 安装依赖：
```bash
pip install -r requirements.txt
```

3. 配置飞书应用信息
在 `config.py` 中填入您的飞书应用信息：
```python
class Config:
    # 飞书应用配置
    FEISHU_APP_ID="cli_a75c9fd3d739d01c"
    FEISHU_APP_SECRET="v9eox66YI74zlIjE1VMNpfuJ1TCUVqUo"
    
    # 多维表格配置
    BASE_ID="KQOCbxJmcarEi0sfi7TcOBZpnUf"
    TABLE_ID="tbltF9AtefTWsKUO"
    
    # Flask配置
    SECRET_KEY="设置一个随机字符串作为密钥"
    DEBUG=True
```

4. 运行应用：
```bash
python app.py
```

5. 访问网站：
打开浏览器访问 http://localhost:5000

## 使用指南

1. 首次使用
   - 点击右上角"注册"按钮创建账号
   - 输入用户代号和密码（记住用户代号，需要在飞书表格中使用）
   - 注册成功后会自动登录

2. 添加生词
   - 在飞书多维表格中添加新记录
   - 确保"填写代号"字段填写了您的用户代号
   - 刷新网站首页即可看到新添加的生词

3. 数据隔离
   - 每个用户只能看到"填写代号"与自己用户名匹配的生词
   - 可以为不同用户创建专属的学习空间

## 常见问题

1. 数据显示异常
   - 检查飞书应用权限是否正确开启
   - 验证多维表格的字段名称是否与代码中完全一致
   - 确认表格中已添加数据，且"填写代号"字段与您的用户名匹配

2. 登录问题
   - 确保用户名和密码输入正确
   - 如忘记密码，请重新注册账号（目前不支持密码找回）
   - 长时间未操作会自动登出，需要重新登录

## 安全说明

- 所有密码均使用SHA-256算法加密存储，不会明文保存
- 用户会话有30分钟的有效期，之后需重新登录
- 建议不要在公共设备保持登录状态

## 联系方式

 2025 个人生词学习系统 需求更新联系 Qiri Zhang 19946286616 微信同号
