# 华为终端营销策划 Agent 应用 — 开发计划

## 项目概述
基于 DeepAgents 框架 + Kimi API 的华为终端营销策划 Agent Web 应用。

## 技术栈
- **Agent 框架**: LangChain + LangGraph (deepagents)
- **前端**: React 18 + Tailwind CSS + Vite
- **后端**: Python FastAPI
- **模型**: Kimi API (Moonshot AI, OpenAI-compatible)
- **数据获取**: Web 搜索 + 浏览器自动化 (Agent 实时搜索)
- **用户记忆**: 本地 SQLite
- **部署**: 跨平台 (Mac + Windows)

## 阶段划分

### Stage 1: 技术调研与准备
- 检索 Kimi API 格式与限制
- 确定 deepagents 最佳实践
- 初始化项目结构

### Stage 2: 数据初始化（开发阶段完成）
- 搜索华为终端产品谱系（Pura 70/60/50, Mate 70/60/50/40）
- 搜索友商近2-3年旗舰产品（iPhone 15/16/17, 小米14/15, OPPO Find X7/X8, vivo X100/X200）
- 搜索各产品营销物料（官网文案、微博、小红书、B站等）
- 整理为结构化产品知识库（JSON 格式，随应用分发）

### Stage 3: 后端开发
- FastAPI 项目搭建
- Kimi API 封装
- Agent 系统实现:
  - 主 Agent（协调者，Plan-then-Execute）
  - 竞品研究员子 Agent（ReAct，多渠道搜索）
  - 营销策划师子 Agent（ReAct + Reflection）
  - Marketing 7.0 评估师子 Agent（加载 marketing7-auditor skill）
- WebSocket 实时通信（Agent 状态推送）
- 报告生成与导出 API

### Stage 4: 前端开发
- React + Tailwind 项目搭建
- 对话界面（AI 对话框）
- 任务进度看板（实时显示 Agent 工作状态）
- 报告浏览器（竞品分析 / 营销方案 / 审计报告）
- 对比视图（原方案 vs Marketing 7.0 优化版）
- PDF/Markdown 导出

### Stage 5: 集成测试与打包
- 端到端测试（完整链路跑通）
- Mac 部署指南
- Windows 部署指南

## 关键约束
- Agent 所有信息实时从互联网获取，不做持久化知识库
- 用户层面保持记忆（SQLite）
- 所有产品信息必须基于检索事实，不自生成
- 数据初始化在开发阶段完成，随应用分发
