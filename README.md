# 智能战报系统 — Agent 交接文档

> ⚠️ 本文档为 Agent 间交接用，记录截至 2026-07-13 的项目完整状态。

---

## 一、项目概述

基于 AI 的智能战报查询与分析系统。用户通过自然语言对话查找、查看、修改和订阅数据战报。

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Ant Design X (`@ant-design/x` v1.0.0) + Zustand |
| 后端 | Python 3 + FastAPI + LangGraph (`create_react_agent`) + LangChain OpenAI |
| LLM | MiniMax-M3（默认）或 **Kimi**（Moonshot-v1-8k，通过 `LLM_PROVIDER` 切换） |
| 数据 | 内存模拟 PSI 数据（基于 `random.seed(42)` 生成，可替换为真实 Excel） |
| 部署 | Docker + Docker Compose / Vercel + Render |

---

## 二、服务启动

```bash
# 后端（端口 8000）
cd backend
pip3 install -r requirements.txt  # 首次
python3 app.py &

# 前端（端口 5173）
cd frontend
npm install  # 首次
npx vite --port 5173 &
```

验证：
```bash
curl http://localhost:8000/api/health   # → {"status":"ok","llm":"Kimi (Moonshot-v1-8k)"}
curl http://localhost:5173 | head -1    # → <!doctype html>
```

Docker 一键启动：
```bash
cd deploy
docker-compose up -d
```

---

## 三、已完成功能（✅）

### 3.1 核心对话流程

| # | 功能 | 说明 |
|---|------|------|
| 1 | 查找战报 | 用户输入地区/关键词，LLM 调用 `list_reports` 工具 |
| 2 | 气泡卡片选择 | LLM 列出多个战报时，前端渲染带圆角卡片（含地区/品类/周期信息），**点击卡片直接发送并展示** |
| 3 | 展示战报 | 选择后右侧弹出 `ReportViewer`，展示渲染后的战报内容 |
| 4 | 修改时间范围 | 用户说"时间改成 7.11-7.19"，LLM 调用 `modify_time` |
| 5 | 调整重点机型 | 用户说"重点机型换成 Mate XT"，LLM 调用 `modify_focus_models` |
| 6 | 右侧动态面板 | 未选择战报时右侧隐藏（width=0），选择后平滑展开 500px |

### 3.2 快捷操作 → 填入输入框（非直接发送）

**关键改动**：用户点击"修改时间范围""调整重点机型"等按钮后，**示例文本填入输入框**，用户可修改后再发送，而非直接生效。

- Prompts 推荐问题（"您可以试试"）→ 点击填入输入框
- "您接下来可以"区域的修改按钮 → 点击填入输入框
- 战报卡片选择 → 点击**直接发送**（这是用户的选择，需要立即生效）

### 3.3 保存到工作台 → 订阅推送流程

**新交互流程**：
```
展示战报后
    └─ 您接下来可以：
        ├─ 修改时间范围（填入输入框）
        ├─ 调整重点机型（填入输入框）
        └─ 保存到工作台（直接执行）
                    └─ 保存成功 ✅
                        └─ 询问：是否需要订阅推送？
                            ├─ 确认订阅 → 创建订阅
                            └─ 暂不订阅 → 结束
```

### 3.4 对话历史

- 所有对话自动持久化到 `localStorage`
- 刷新页面后对话历史不丢失
- 左侧边栏显示对话列表，支持点击切换
- **支持删除**：鼠标悬停对话项，点击右侧「...」菜单 → 删除
- 战报展示后自动提取战报名称更新对话标题

### 3.5 战报库

- 独立 Tab 页"战报库"，展示 10 张预定义标准战报
- **BI 筛选器**：支持按地区 / 品类 / 周期筛选
- 统计面板：战报总数 / 日销 / 周销 / 覆盖地区
- 每张卡片可「查看」（加载到右侧）或「订阅」

### 3.6 我的工作台（原"我的订阅"）

- **命名变化**：从"我的订阅"改为"我的工作台"
- **功能整合**：分为两个 Tab：
  - 「已保存的战报」：查看/预览/删除从对话中保存的战报配置
  - 「我的订阅」：管理已订阅的推送（开关/删除/预览）
- 公共订阅 vs 自定义订阅区分：紫色标签「自定义」/ 蓝色标签「公共」
- 自定义订阅显示配置摘要（时间范围、重点机型）
- ⚠️ **数据存在内存中**：后端 `WORKBENCH` 和 `SUBSCRIPTIONS` 数组，重启后丢失

### 3.7 工作台 API

- `POST /api/workbench` — 保存战报配置到工作台
- `GET /api/workbench` — 获取工作台列表
- `DELETE /api/workbench/{id}` — 删除工作台项

### 3.8 可修改部分高亮

- 时间周期区域：黄色虚线边框背景（`.editable-highlight`）
- 重点机型区域：同上
- Agent 回复后自动附加 Tag 提示「时间范围」「重点机型」
- 展示战报后新增蓝色「您接下来可以」提示框，含快捷按钮

### 3.9 区域权限隔离

- 后端 `_has_permission()` 函数实现鉴权
- 默认权限 `GLOBAL`（全部地区）
- 非 GLOBAL 用户只返回其权限范围内的战报
- 前端 Welcome 页显示当前权限范围提示

### 3.10 思考链路（ThoughtChain）

- 显示 LLM 的思考步骤：理解意图 → 调用工具 → 成功/错误
- 可开关：左下角 Tag「思考链路: 开/关」

### 3.11 自动化测试面板

- 新增「测试」Tab，可通过菜单进入
- 预定义测试场景：墨西哥战报完整对话流、Fallback 欢迎语
- 一键运行，自动验证每步的 action 和关键词
- 实时显示通过/失败状态、响应时间
- 支持下载 JSON 格式交互日志
- 后端测试脚本：`scripts/test_conversation.py`

### 3.12 LLM 提供商切换（MiniMax ↔ Kimi）

- 环境变量 `LLM_PROVIDER=minimax` 或 `kimi`
- `KIMI_API_KEY` 用于 Kimi（Moonshot-v1-8k）
- `MINIMAX_API_KEY` 用于 MiniMax-M3
- 默认有 fallback key（仅用于开发测试）
- 健康检查 `/api/health` 返回当前使用的 LLM 名称

---

## 四、关键文件说明

### 4.1 前端

| 文件 | 行数 | 职责 |
|------|------|------|
| `frontend/src/components/ChatPanel.tsx` | 481 | 核心对话面板。消息渲染（含气泡卡片、可修改Tag、"您接下来可以"提示、保存→订阅交互区域）、Prompts推荐问题、Sender输入框 |
| `frontend/src/components/Layout.tsx` | 184 | 三栏布局框架。左侧Sider（菜单+对话历史）、中间Content（ChatPanel/ReportLibrary/WorkbenchManager/TestPanel）、右侧动态ReportViewer |
| `frontend/src/components/ReportViewer.tsx` | 139 | 右侧战报查看器。头部（标题+订阅/分享/导出/关闭按钮）、战报内容、底部"通过对话修改"按钮 |
| `frontend/src/components/ReportContent.tsx` | 201 | 战报内容渲染。series/category/comprehensive 三种模板渲染，可修改高亮样式 |
| `frontend/src/components/ReportLibrary.tsx` | 236 | 战报库页面。搜索、BI筛选器（地区/品类/周期）、统计面板、卡片网格 |
| `frontend/src/components/WorkbenchManager.tsx` | 302 | 工作台管理。已保存战报列表 + 订阅列表，双Tab切换，预览/开关/删除 |
| `frontend/src/components/TestPanel.tsx` | 260 | 自动化测试面板。运行测试场景、验证结果、下载日志 |
| `frontend/src/store.ts` | 307 | Zustand 全局状态。消息/对话/sessionId/当前战报/思考链路/权限/**工作台项** |
| `frontend/src/main.tsx` | 12 | 入口文件。配置 axios 全局 baseURL（支持 VITE_API_BASE_URL 环境变量） |
| `frontend/src/vite-env.d.ts` | 8 | Vite 环境变量类型声明 |
| `frontend/src/index.css` | ~250 | 全局样式。editable-highlight、fadeIn动画、scrollbar、Ant Design X 自定义 |

### 4.2 后端

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/app.py` | 1058 | 主服务。FastAPI路由、LangGraph Agent、Tools（5个）、PSI数据生成与计算、战报渲染、**工作台管理**、**订阅管理**、权限API、**LLM双提供商支持** |
| `config/reports.json` | - | 10张战报的模板定义（产品列表、分组方式、显示选项） |
| `config/semantics.json` | - | 语义配置：地区映射、意图关键词、同义词 |

### 4.3 部署配置

| 文件 | 说明 |
|------|------|
| `deploy/docker-compose.yml` | Docker Compose 编排，同时启动前后端 |
| `deploy/Dockerfile.backend` | 后端容器构建（Python + FastAPI） |
| `deploy/Dockerfile.frontend` | 前端容器构建（Node build + Nginx） |
| `deploy/nginx.conf` | Nginx 反向代理配置（前端静态文件 + API 转发到后端） |
| `deploy/README.md` | 部署操作手册 |
| `vercel.json` | Vercel 前端部署配置 |
| `render.yaml` | Render 后端部署配置 |
| `frontend/.env.example` | 前端环境变量模板 |
| `.github/workflows/deploy.yml` | GitHub Actions 自动部署工作流 |

---

## 五、API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查，返回 llm 状态和提供商 |
| GET | `/api/reports` | 战报列表，支持 `?q=` 搜索 |
| GET | `/api/reports/{id}` | 战报详情 |
| POST | `/api/reports/{id}/render` | 渲染战报。Body: `{reportId, dateRange?, focusModels?}` |
| POST | `/api/chat` | 核心对话。Body: `{message, sessionId?, context?}` |
| GET | `/api/user/permissions` | 获取用户权限 |
| **GET** | **`/api/workbench`** | **工作台列表（新增）** |
| **POST** | **`/api/workbench`** | **保存到工作台（新增）** |
| **DELETE** | **`/api/workbench/{id}`** | **删除工作台项（新增）** |
| GET | `/api/subscriptions` | 订阅列表 |
| POST | `/api/subscriptions` | 创建订阅 |
| DELETE | `/api/subscriptions/{id}` | 删除订阅 |
| PUT | `/api/subscriptions/{id}/toggle` | 切换订阅开关 |

---

## 六、LLM 调用链路

```
用户输入 → POST /api/chat
    → session_id 从请求或新生成
    → 设置用户权限到 session context
    → 【优先】LangGraph Agent 调用
        → system prompt 定义 5 个 tools
        → LLM (MiniMax-M3 或 Kimi) 决策调用哪个 tool
        → tool 执行后更新 session context
        → 最终回复提取到 reply
        → 如果调用了 list_reports 且未选择战报 → 构建 choose_report action+options
        → 如果已有 current_report_id → 构建 show_report action+content
    → 【Fallback】如果 agent 为 None 或出错
        → 规则引擎：地区匹配 / 战报名称匹配 / 时间修改 / 机型修改
    → 返回 ChatResponse {reply, action, data, sessionId, thoughtChain}
```

**重要**：LLM 返回的 `action` 字段由后端推断（不是 LLM 直接输出），前端根据 `action` 渲染不同 UI：
- `choose_report` → 渲染气泡卡片
- `show_report` → 渲染右侧战报 + 更新标题 + 显示"您接下来可以"
- `ask_subscribe` → 渲染"是否订阅推送"交互区域
- `null` → 纯文本回复

---

## 七、已知问题 / 待办事项

### 🔴 高优先级

1. **云端部署（待讨论）**
   - 当前项目仅在本地运行，需要部署到互联网公网供外部访问
   - 已准备方案：Vercel（前端）+ Render（后端），或 Docker + 云服务器
   - 参考文件：`DEPLOY.md`、`deploy/docker-compose.yml`、`render.yaml`、`vercel.json`
   - 相关配置：LLM 已支持切换为 Kimi API（`LLM_PROVIDER=kimi` + `KIMI_API_KEY`）

2. **SUBSCRIPTIONS / WORKBENCH 内存存储**
   - 后端 `SUBSCRIPTIONS` 和 `WORKBENCH` 是全局列表变量，重启后清空
   - **需要**：持久化到文件/数据库

### 🟡 中优先级

3. **对话历史删除后 UI 状态**
   - 删除最后一个对话后，当前对话为 null，需手动新建对话
   - 可能需要自动创建默认对话

4. **权限系统可配置**
   - 当前默认 GLOBAL，需要支持实际用户权限配置（登录/鉴权）

### 🟢 低优先级

5. **分享功能**：ReportViewer 中的「分享」按钮目前只是复制文本到剪贴板，需要支持更多格式（图片/PDF/链接）
6. **导出功能**：目前导出 JSON，需要支持 Excel/PDF
7. **前端端口占用**：可能有多个 vite 进程残留（5173/5174/5175），启动前需清理

---

## 八、关键配置

### LLM API Key

**MiniMax-M3**（默认）：
硬编码在 `backend/app.py`，可通过环境变量 `MINIMAX_API_KEY` 覆盖。

**Kimi（Moonshot）**：
从 [platform.moonshot.cn](https://platform.moonshot.cn) 获取 API Key，通过环境变量 `KIMI_API_KEY` 设置。

切换方式：
```bash
# 环境变量
LLM_PROVIDER=kimi
KIMI_API_KEY=sk-your-key

# 验证
curl http://localhost:8000/api/health
# → {"status": "ok", "llm": "Kimi (Moonshot-v1-8k)", "provider": "kimi"}
```

### 战报模板

`config/reports.json` 定义 10 张战报，覆盖地区：MEA / LATAM / EU / APAC / CN / GLOBAL，品类：手机 / 耳机 / 穿戴 / 综合。

### PSI 数据

`backend/app.py` 使用 `random.seed(42)` 生成 30 天的模拟数据，替换为真实数据即可切换。

---

## 九、Agent 交接检查清单

接手本项目的 Agent 应该：

- [ ] 读取 `backend/app.py` 了解 API 和 Agent 工具定义
- [ ] 读取 `frontend/src/store.ts` 了解状态结构和持久化逻辑（注意新增了 `workbenchItems`）
- [ ] 读取 `frontend/src/components/ChatPanel.tsx` 了解消息渲染和交互（注意 `handleQuickAction` 和 `handleSaveToWorkbench`）
- [ ] 读取 `frontend/src/components/WorkbenchManager.tsx` 了解工作台功能
- [ ] 读取 `frontend/src/components/Layout.tsx` 了解布局框架（注意新增的 `test` Tab）
- [ ] 确认前后端服务已启动（`curl http://localhost:8000/api/health`）
- [ ] 运行 `cd frontend && npx tsc --noEmit` 确认 TypeScript 无错误

---

*最后更新: 2026-07-13*
