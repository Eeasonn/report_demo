# 智能战报系统 - 本地到云端部署实战记录

> 本文档记录本次会话中将本地项目（`智能战报 demo`）完整部署到云端、实现公网可访问的**真实操作步骤与踩坑修复过程**。
> 与 `DEPLOY_FREE.md`（简洁速查版）和 `DEPLOY.md`（方案对比版）互为补充。
>
> 适用场景：需要按图索骥复现一遍部署、或排查同类报错时参考。

---

## 一、项目架构

| 层级 | 技术栈 | 说明 |
|------|--------|------|
| 前端 | React 18 + TypeScript + Vite + Ant Design / Ant Design X | 静态单页应用 |
| 后端 | Python 3.11 + FastAPI + LangGraph + MiniMax/Kimi LLM | 提供 AI 对话与战报生成 API |
| 状态管理 | Zustand | 前端全局状态 |
| 部署方案 | **GitHub Pages（前端）+ Render Docker（后端）** | 完全免费 |

---

## 二、最终部署形态

| 服务 | 平台 | 示例地址 |
|------|------|----------|
| 前端 | GitHub Pages | `https://eeasonn.github.io/report_demo/` |
| 后端 | Render | `https://smart-battle-report-backend.onrender.com` |
| LLM | MiniMax | 通过 Render 环境变量注入 |

---

## 三、前置条件

1. 项目代码已初始化 Git 仓库。
2. 已创建公开的 GitHub 仓库（本例：`https://github.com/eeasonn/report_demo.git`）。
3. 已注册 Render 账号（建议用 GitHub 账号登录）。
4. 已准备 MiniMax 或 Kimi API Key。
5. 本地能正常 `pnpm build` / `docker build` 通过。

---

## 四、详细部署步骤

### 步骤 1：将代码推送到 GitHub

```bash
cd "/Users/eason/Documents/Eason's Projects/智能战报 demo"

# 如果已有 origin 但地址不对，先删除再添加
git remote remove origin
git remote add origin https://github.com/eeasonn/report_demo.git

git add .
git commit -m "chore(deploy): 初始化云端部署配置"
git push -u origin main
```

> 若提示 `remote origin already exists`，用 `git remote set-url origin https://github.com/eeasonn/report_demo.git` 修改即可。

---

### 步骤 2：部署后端到 Render

#### 2.1 创建 Web Service

1. 登录 [dashboard.render.com](https://dashboard.render.com)。
2. 点击 **New +** → **Web Service**。
3. 选择 GitHub 仓库 `report_demo`。
4. 填写配置：

| 配置项 | 值 |
|--------|-----|
| **Name** | `smart-battle-report-backend` |
| **Environment** | `Docker` |
| **Dockerfile Path** | `./deploy/Dockerfile.backend` |
| **Branch** | `main` |

#### 2.2 设置环境变量

进入服务 → **Environment** → 添加：

```env
LLM_PROVIDER=minimax
MINIMAX_API_KEY=sk-cp-你的-minimax-key
MINIMAX_BASE_URL=https://api.minimax.io/v1
CORS_ORIGINS=*
```

或使用 Kimi：

```env
LLM_PROVIDER=kimi
KIMI_API_KEY=sk-你的-kimi-key
CORS_ORIGINS=*
```

> 部署成功后，建议将 `CORS_ORIGINS=*` 改为前端 GitHub Pages 域名，例如 `https://eeasonn.github.io`。

#### 2.3 等待 Live

Render 会自动构建 Docker 镜像并启动。状态变为 **Live** 后，记录域名：

```
https://smart-battle-report-backend.onrender.com
```

验证健康检查：

```bash
curl https://smart-battle-report-backend.onrender.com/api/health
```

---

### 步骤 3：配置前端构建与 GitHub Actions

#### 3.1 配置 `frontend/vite.config.ts`

GitHub Pages 部署在子路径下，需要动态设置 `base`：

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  // ... 其他配置
});
```

#### 3.2 创建 GitHub Actions 工作流

文件：`.github/workflows/deploy.yml`

```yaml
name: Deploy Frontend to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: cd frontend && pnpm install

      - name: Build
        run: cd frontend && pnpm build
        env:
          VITE_BASE_PATH: /report_demo/
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./frontend/dist

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

> 注意：不要添加 `actions/configure-pages@v5`，当前 GitHub Actions 运行环境（Node 24）与该 action 不兼容，会报 TypeError。

#### 3.3 配置 GitHub Secret

进入仓库 **Settings** → **Secrets and variables** → **Actions** → **New repository secret**：

| Secret 名称 | 值 |
|-------------|-----|
| `VITE_API_BASE_URL` | `https://smart-battle-report-backend.onrender.com` |

> 末尾**不要**加 `/`。

---

### 步骤 4：启用 GitHub Pages

1. 进入仓库 **Settings** → **Pages**。
2. **Source** 选择 **GitHub Actions**。
3. 保存。

---

### 步骤 5：触发部署

```bash
git add .
git commit -m "chore(deploy): 配置 GitHub Pages + Render 免费部署"
git push origin main
```

推送后：
- GitHub Actions 自动构建并部署前端。
- Render 若开启了自动部署，也会同步更新后端。

访问地址：

```
https://你的用户名.github.io/仓库名/
```

本例：

```
https://eeasonn.github.io/report_demo/
```

---

### 步骤 6：配置 LLM（MiniMax）

本项目使用 MiniMax 的 **OpenAI-Compatible** 接入方式。

1. 访问 [MiniMax 开放平台](https://platform.minimax.io/)。
2. 进入 **Billing > Token Plan**，复制 **Subscription Key**（格式 `sk-cp-...`）。
3. 或进入 **API Keys** 创建 **Pay-as-you-go API Key**。
4. 在 Render 环境变量中填入：

```env
LLM_PROVIDER=minimax
MINIMAX_API_KEY=sk-cp-你的-key
MINIMAX_BASE_URL=https://api.minimax.io/v1
```

5. 点击 Render 的 **Manual Deploy** → **Deploy latest commit** 重启后端，使环境变量生效。

---

## 五、本次部署中做过的关键代码修改

### 1. 修复 Dockerfile 构建上下文

**文件：** `deploy/Dockerfile.backend`

原始问题：Docker build context 不是仓库根目录，导致 `COPY backend/requirements.txt .` 失败。

修改后：

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app.py .
COPY config /app/config
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

> 同时删除了不存在的 `COPY data /app/data` 指令。

### 2. 补齐 Python 依赖

**文件：** `backend/requirements.txt`

新增：

```txt
langchain-openai==1.3.5
langchain-core==1.4.9
langgraph==1.2.9
openai==2.45.0
```

### 3. 修复 BASE_DIR 计算

**文件：** `backend/app.py`

原始问题：Docker 中 `__file__` 路径导致 `BASE_DIR` 计算为 `/`，找不到 `config/reports.json`。

修改后：

```python
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if not os.path.exists(os.path.join(BASE_DIR, "config", "reports.json")):
    BASE_DIR = os.path.dirname(BASE_DIR)
```

### 4. MiniMax Base URL 可配置

**文件：** `backend/app.py`

```python
MINIMAX_BASE_URL = os.environ.get("MINIMAX_BASE_URL", "https://api.minimax.io/v1")
```

同时移除了硬编码的无效 fallback key，强制使用 Render 环境变量中的真实 key。

### 5. 修复 docker-compose 构建上下文

**文件：** `deploy/docker-compose.yml`

```yaml
services:
  backend:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.backend
  frontend:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.frontend
```

> 同时移除了 `data` 卷挂载。

### 6. 前端移动端拖拽支持

**文件：** `frontend/src/components/Layout.tsx`

为报告面板分隔条增加触摸屏事件：

```tsx
const beginDrag = useCallback((clientX: number) => { ... }, [currentReport, reportWidth]);
const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); beginDrag(e.clientX); }, [beginDrag]);
const handleTouchStart = useCallback((e: React.TouchEvent) => { e.preventDefault(); beginDrag(e.touches[0].clientX); }, [beginDrag]);
```

并注册 document 级 `touchmove` / `touchend` 监听器，分隔条宽度从 6px 加宽到 16px，便于手指操作。

---

## 六、踩坑与修复记录

| 报错 / 现象 | 根因 | 修复 |
|-------------|------|------|
| Render build: `"/data": not found` | `data/` 是空目录，未提交到 Git，Dockerfile 却 `COPY data /app/data` | 删除 Dockerfile 中的 `COPY data` 和 docker-compose 中的 data 挂载 |
| `ModuleNotFoundError: No module named 'langchain_openai'` | `requirements.txt` 缺少 langchain 相关依赖 | 添加 `langchain-openai`、`langchain-core`、`langgraph`、`openai` |
| `FileNotFoundError: /config/reports.json` | Docker 中 `BASE_DIR` 算成了 `/` | 在 `app.py` 中增加存在性回退逻辑，找不到时回退到父目录 |
| MiniMax 返回 401 | 使用了无效的硬编码 fallback key；base URL 不匹配 | 移除 fallback key，通过环境变量注入真实 key；`MINIMAX_BASE_URL` 可配置 |
| GitHub Actions: `actions/configure-pages@v5` TypeError | Node 24 运行时不兼容 | 从工作流中删除 `configure-pages` 步骤 |
| 手机上无法拖动调整报告宽度 | 只实现了鼠标事件 | 增加 `touchstart`/`touchmove`/`touchend`，并加宽触摸热区 |

---

## 七、部署后验证清单

- [ ] 访问 `https://你的用户名.github.io/仓库名/`，页面正常加载。
- [ ] 打开浏览器 Console，无 404 或 CORS 报错。
- [ ] 在对话框输入问题，能收到 AI 回复。
- [ ] Render 后端状态为 **Live**。
- [ ] `curl https://你的后端域名/api/health` 返回 200。
- [ ] 手机端可以拖动调整右侧报告面板宽度。

---

## 八、常用维护命令

```bash
# 本地构建前端
cd frontend && pnpm build

# 本地构建后端 Docker
cd deploy
docker build -f Dockerfile.backend -t sbr-backend ..

# 本地启动完整服务
cd deploy
docker-compose up -d

# 查看 GitHub Actions 部署状态
gh run list --workflow deploy.yml

# 强制重新部署 Render 后端
# 在 Render Dashboard → Manual Deploy → Deploy latest commit
```

---

## 九、相关文档

- [DEPLOY_FREE.md](./DEPLOY_FREE.md) — 免费部署速查指南
- [DEPLOY.md](./DEPLOY.md) — 多种部署方案对比
- [deploy/README.md](./deploy/README.md) — Docker Compose 本地部署手册
