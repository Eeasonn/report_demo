# 智能战报系统 - 公网访问部署指南

## 核心问题解答

> "能不能用 GitHub 让别人在互联网上访问我的项目？"

**纯 GitHub 不行** — GitHub Pages 只能托管静态网页（没有后端服务），而你的项目有 FastAPI 后端。必须将**前端**和**后端**分开部署。

---

## 方案对比

| 方案 | 前端 | 后端 | 月费用 | 难度 | 适合 |
|------|------|------|--------|------|------|
| **A: GitHub Pages + Render** | GitHub Pages 免费 | Render 免费 | **¥0** | ⭐ | 演示/测试 |
| **B: Vercel + Render** | Vercel 免费 | Render 免费 | **¥0** | ⭐ | 演示/测试 |
| **C: 云服务器 + Docker** | 服务器 80 端口 | 服务器 8000 端口 | **¥30-60** | ⭐⭐ | 生产环境 |
| **D: Vercel + 云服务器** | Vercel 免费 | 云服务器 | **¥30-60** | ⭐⭐ | 生产环境 |

> 推荐完全免费的 **方案 A（GitHub Pages + Render）**，详见 [DEPLOY_FREE.md](./DEPLOY_FREE.md)。

---

## 方案 A：完全免费（GitHub Pages + Render）

### 前置条件

1. 代码已推送到 **公开的 GitHub 仓库**
2. 注册 [Render](https://render.com) 账号（用 GitHub 登录）
3. 准备一个 Kimi 或 MiniMax API Key

### 部署步骤

完整步骤请参考 **[DEPLOY_FREE.md](./DEPLOY_FREE.md)**，主要流程：

1. 在 Render 部署后端（Dockerfile: `./deploy/Dockerfile.backend`）
2. 在 GitHub 仓库添加 Secret：`VITE_API_BASE_URL`
3. 在 GitHub 仓库 Settings → Pages 选择 **GitHub Actions**
4. 推送代码，自动部署前端到 `https://你的用户名.github.io/仓库名/`

---

## 方案 B：完全免费（Vercel + Render）

### 前置条件

1. 代码已推送到 **GitHub 仓库**
2. 注册 [Vercel](https://vercel.com) 账号（用 GitHub 登录）
3. 注册 [Render](https://render.com) 账号（用 GitHub 登录）

### 步骤一：部署后端到 Render

1. 登录 [dashboard.render.com](https://dashboard.render.com)
2. 点击 **New +** → **Web Service**
3. 选择你的 GitHub 仓库
4. 配置：
   - **Name**: `smart-battle-report-backend`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./deploy/Dockerfile.backend`
5. 添加环境变量：
   - `LLM_PROVIDER` = `kimi` 或 `minimax`
   - `KIMI_API_KEY` = 你的 Kimi API Key
   - `MINIMAX_API_KEY` = 你的 MiniMax API Key（可选）
6. 点击 **Create Web Service**

Render 会自动构建并启动，等待状态变为 **Live**。

**记下你的 Render 域名**：`https://smart-battle-report-backend.onrender.com`

### 步骤二：修改前端 API 地址

编辑 `frontend/src/main.tsx`：

```ts
import axios from 'axios';
axios.defaults.baseURL = 'https://smart-battle-report-backend.onrender.com';
```

### 步骤三：部署前端到 Vercel

```bash
npm install -g vercel
cd frontend
vercel
vercel --prod
```

完成后访问 Vercel 域名。

---

## 方案 C：云服务器部署（更稳定）

```bash
# 1. 安装 Docker
curl -fsSL https://get.docker.com | sh

# 2. 克隆代码
git clone https://github.com/你的用户名/智能战报.git
cd 智能战报

# 3. 配置环境变量
cat > .env << 'EOF'
LLM_PROVIDER=kimi
KIMI_API_KEY=sk-your-kimi-key
EOF

# 4. 启动
cd deploy
docker-compose up -d

# 5. 开放安全组端口 80 和 8000
```

访问：`http://你的服务器IP`

---

## 关键配置速查

### 修改前端 API 地址

```ts
// frontend/src/main.tsx
axios.defaults.baseURL = 'https://你的后端域名';
```

### 修改 CORS

生产环境建议限制跨域来源：

```python
# backend/app.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://你的前端域名"],
    ...
)
```

### 获取 Kimi API Key

1. 访问 [platform.moonshot.cn](https://platform.moonshot.cn)
2. 进入「API Key 管理」
3. 创建并复制 `sk-` 开头的 Key

---

## 常见问题

### Render 免费版限制

- 15 分钟后无请求自动休眠
- 首次访问 30s 冷启动
- 512MB 内存，0.1 CPU
- 每月 750 小时免费运行时间

### GitHub Pages 限制

- 公开仓库免费
- 每月 100GB 带宽
- 只支持静态站点

### 为什么前后端要分开部署？

- 前端是静态文件，适合 CDN / Pages
- 后端是 Python 服务，需要运行环境
- 这是现代 Web 应用的标准架构

---

## 推荐路径

| 场景 | 推荐方案 | 预计时间 |
|------|----------|----------|
| 快速给朋友演示 | **方案 A**（GitHub Pages + Render） | 15 分钟 |
| 想用自定义域名 | **方案 B**（Vercel + Render） | 15 分钟 |
| 稳定长期运行 | **方案 C**（云服务器 + Docker） | 30 分钟 |

---

## 相关文档

- [DEPLOY_FREE.md](./DEPLOY_FREE.md) — 免费 GitHub Pages + Render 完整步骤
- [deploy/README.md](./deploy/README.md) — Docker Compose 详细部署手册
