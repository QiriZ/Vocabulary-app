# 个人生词学习网站 Vocabulary-app

👉 👉 [立即体验](https://vocabulary-ow7f9x79s-qiri-zhangs-projects.vercel.app/) | 📖 [开发文档](#技术架构)

[![GitHub Stars](https://img.shields.io/github/stars/QiriZ/vocab-website?style=social)](https://github.com/QiriZ/vocab-website)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

*个人生词学习网站，从飞书多维表格获取数据的工作流。 灵感是阅读way to AGI社区学习资料时获得的，开源万岁*

一个基于Flask构建的个人知识管理工具，通过对接飞书多维表格实现数据同步，设计风格与中国红主题色结合，提供优雅高效的学习体验。

## 🌟 项目特色
- **双源数据驱动**：直连飞书多维表格实时同步词库
- **极简美学设计**：极简设计规范，融入中国红品牌色
- **认知科学加持**：结构化呈现学科领域/产业链位置/记忆方法论
- **场景化学习**：每个概念匹配生活案例与实践指引

## 🛠️ 技术栈
| 领域        | 技术选型                          |
|-------------|-----------------------------------|
| **前端**    | HTML5/CSS3/JavaScript + Jinja2模板 |
| **后端**    | Flask + RESTful API设计           |
| **数据层**  | 飞书多维表格API + 本地缓存机制     |
| **部署**    | Docker容器化 + Nginx反向代理       |

## 📚 核心功能

### 首页看板
- 🗂️ 知识卡片流式布局
- 🔍 关键词快速检索
- 📌 学科标签云导航
- 🎯 产业链位置可视化
- 📖 案例预览（智能截取前100字）
- ➕ 新标签页详情跳转

### 文章详情页
- 🏷️ 完整概念解析
- 🧬 多维知识图谱：
  - 学科归属
  - 产业坐标
  - 记忆矩阵
- 🎯 3D学习路径：
  - 基础认知→案例实践→扩展阅读
- 📚 权威参考文献溯源

## 🚀 快速开始

### 环境准备
```bash
git clone https://github.com/QiriZ/vocab-website.git
cd vocab-website
pip install -r requirements.txt
