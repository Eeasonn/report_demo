# 华为营销策划 Agent

基于 DeepAgents 框架 + Kimi API 的华为终端营销策划 Agent Web 应用。用户输入新品信息后，Agent 会自动检索上一代产品、同级别华为产品和友商近似产品的营销物料，综合分析后输出营销策划方案，并可基于 Marketing 7.0 理论进行评估优化。

## 功能特性

- **AI 对话界面**：自然语言输入新品信息，Agent 自动执行策划流程
- **竞品研究**：自动分析华为上一代产品、同级别产品和友商产品
- **营销策划**：生成完整的营销方案（定位、卖点、叙事、渠道、节奏、物料）
- **Marketing 7.0 评估**：基于 Philip Kotler《营销7.0》理论对营销方案进行审计评分
- **实时状态推送**：WebSocket 实时显示 Agent 执行进度
- **报告导出**：支持 Markdown / PDF 格式导出

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                       前端 (React 18)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ 对话界面  │  │ 任务看板  │  │ 报告浏览器│  │ 审计面板     │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API + WebSocket
┌──────────────────────────┴──────────────────────────────────┐
│                      后端 (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 主 Agent (协调)│  │ 竞品研究员   │  │ 营销策划师       │  │
│  │              │  │ 子 Agent     │  │ 子 Agent         │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 评估师 Agent  │  │ Kimi API    │  │ 产品知识库       │  │
│  │ (Marketing7.0)│  │ 客户端       │  │ (products.json)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 项目结构

```
huawei-marketing-agent/
├── README.md                    # 本文件
├── backend/                     # 后端代码
│   ├── main.py                  # FastAPI 主入口
│   ├── config.py                # 配置管理
│   ├── models.py                # Pydantic 数据模型
│   ├── agent_system.py          # Agent 系统核心
│   ├── kimi_client.py           # Kimi API 封装
│   ├── session_manager.py       # 会话管理
│   ├── report_service.py        # 报告服务
│   └── requirements.txt         # Python 依赖
├── frontend/                    # 前端代码
│   ├── index.html               # HTML 入口
│   ├── package.json             # 依赖配置
│   ├── vite.config.js           # Vite 配置
│   └── src/
│       ├── main.jsx             # React 入口
│       ├── App.jsx              # 主应用组件
│       ├── index.css            # 全局样式
│       ├── context/AppContext.jsx    # 全局状态管理
│       ├── components/          # UI 组件
│       │   ├── ChatInterface.jsx     # 对话界面
│       │   ├── TaskBoard.jsx         # 任务看板
│       │   ├── ReportViewer.jsx      # 报告浏览器
│       │   ├── AuditPanel.jsx        # 审计面板
│       │   ├── MessageBubble.jsx     # 消息气泡
│       │   └── Sidebar.jsx           # 侧边栏
│       ├── hooks/               # 自定义 Hooks
│       │   ├── useWebSocket.js       # WebSocket
│       │   └── useApi.js             # API 调用
│       └── utils/               # 工具函数
│           ├── export.js             # 导出功能
│           └── markdown.js           # Markdown 渲染
└── data/
    └── products.json            # 产品知识库
```

## 环境要求

- **Python**: 3.12+
- **Node.js**: 20+
- **Kimi API Key**: 从 [platform.moonshot.cn](https://platform.moonshot.cn) 获取

---

## 部署指南

### 一、macOS 部署

#### 1. 克隆/解压项目

```bash
cd ~/huawei-marketing-agent
```

#### 2. 配置 Kimi API Key

```bash
export KIMI_API_KEY="your-kimi-api-key-here"
```

> 建议将上述命令添加到 `~/.zshrc` 或 `~/.bash_profile` 中

#### 3. 启动后端

```bash
# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r backend/requirements.txt

# 启动服务
cd backend
python main.py
```

后端服务将在 `http://localhost:8000` 启动。

#### 4. 启动前端（新终端窗口）

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将在 `http://localhost:3000` 启动，自动代理 API 请求到后端。

#### 5. 使用

打开浏览器访问 `http://localhost:3000`

---

### 二、Windows 部署

#### 1. 克隆/解压项目

```cmd
cd C:\huawei-marketing-agent
```

#### 2. 配置 Kimi API Key

```cmd
set KIMI_API_KEY=your-kimi-api-key-here
```

> 建议通过"系统属性 → 环境变量"永久设置

#### 3. 启动后端

```cmd
:: 创建虚拟环境
python -m venv .venv
.venv\Scripts\activate

:: 安装依赖
pip install -r backend\requirements.txt

:: 启动服务
cd backend
python main.py
```

后端服务将在 `http://localhost:8000` 启动。

#### 4. 启动前端（新命令提示符窗口）

```cmd
cd frontend

:: 安装依赖
npm install

:: 启动开发服务器
npm run dev
```

前端将在 `http://localhost:3000` 启动。

#### 5. 使用

打开浏览器访问 `http://localhost:3000`

---

### 三、生产环境部署

#### 构建前端

```bash
cd frontend
npm install
npm run build
```

构建产物在 `frontend/dist/` 目录下。

#### 配置后端静态文件

将 `frontend/dist/` 目录复制到 `backend/static/`，后端会自动提供静态文件服务。

```bash
cp -r frontend/dist backend/static
```

#### 使用 Gunicorn/Uvicorn 运行后端

```bash
cd backend
pip install gunicorn
gunicorn main:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 -w 4
```

---

## 使用流程

1. **新建会话**：点击侧边栏"新建会话"，输入产品名称（如"Mate 90 Pro"）
2. **开始策划**：在对话框中输入需求，如"我想为 Mate 90 Pro 制定上市营销方案"
3. **等待 Agent 执行**：观察任务看板中的实时进度
4. **查看报告**：在报告浏览器中查看竞品分析和营销方案
5. **Marketing 7.0 评估**：勾选评估选项，或事后在审计面板触发评估
6. **导出结果**：将报告导出为 Markdown 或 PDF 格式

---

## API 文档

启动后端后访问 `http://localhost:8000/docs` 查看完整 API 文档。

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/sessions` | POST | 创建会话 |
| `/api/sessions/{id}/chat` | POST | 发送消息 |
| `/api/sessions/{id}/status` | GET | 获取状态 |
| `/api/sessions/{id}/reports/{type}` | GET | 获取报告 |
| `/api/sessions/{id}/audit` | POST | 触发评估 |
| `/api/products` | GET | 获取产品知识库 |
| `/ws/{session_id}` | WS | 实时状态推送 |

---

## 数据初始化说明

产品知识库文件 `data/products.json` 已预置以下产品信息：

**华为产品**：
- Pura 系列：Pura 80 Ultra/Pro、Pura 70 Ultra/Pro
- Mate 系列：Mate 70 Pro+/Pro、Mate 60 Pro

**友商产品**：
- Apple：iPhone 16 Pro Max
- 小米：小米15 Ultra/Pro
- OPPO：Find X8 Ultra
- vivo：X200 Ultra

---

## 许可证

MIT License
