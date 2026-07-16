# 智能战报系统 - 免费部署指南（GitHub Pages + Render）

> 目标：完全 0 元，让前端和后端都能在互联网上访问。

---

## 架构

| 服务 | 平台 | 费用 | 说明 |
|------|------|------|------|
| 前端 | **GitHub Pages** | 免费 | 静态站点，永不休眠 |
| 后端 | **Render** | 免费 | 15 分钟无访问会休眠，首次访问约 30s 冷启动 |
| LLM | MiniMax / Kimi | 新账号有试用额度 | 超出后需充值 |

---

## 前置条件

1. 代码已推送到 **公开的 GitHub 仓库**
2. 注册 [Render](https://render.com) 账号（建议用 GitHub 登录）
3. 准备一个 Kimi 或 MiniMax API Key

---

## 第一步：部署后端到 Render

### 1. 在 Render Dashboard 创建 Web Service

1. 访问 [dashboard.render.com](https://dashboard.render.com)
2. 点击 **New +** → **Web Service**
3. 选择你的 GitHub 仓库
4. 按以下配置：

| 配置项 | 值 |
|--------|-----|
| **Name** | `smart-battle-report-backend`（可改） |
| **Environment** | `Docker` |
| **Dockerfile Path** | `./deploy/Dockerfile.backend` |
| **Branch** | `main` 或 `master` |

### 2. 设置环境变量

在 Render Dashboard → 你的服务 → **Environment** 中添加：

```env
LLM_PROVIDER=kimi
KIMI_API_KEY=sk-your-kimi-api-key
CORS_ORIGINS=*
```

> 生产环境建议把 `CORS_ORIGINS` 改成你的 GitHub Pages 地址，例如 `https://yourname.github.io`。

### 3. 等待部署完成

Render 会自动构建 Docker 镜像并启动。

等待状态变为 **Live**，记下域名：

```
https://smart-battle-report-backend.onrender.com
```

验证后端健康：

```bash
curl https://smart-battle-report-backend.onrender.com/api/health
```

---

## 第二步：配置 GitHub Secrets

在你的 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** 中添加：

| Secret 名称 | 值 |
|-------------|-----|
| `VITE_API_BASE_URL` | `https://smart-battle-report-backend.onrender.com` |

> 注意：末尾**不要**加 `/`。

---

## 第三步：启用 GitHub Pages

1. 进入仓库 **Settings** → **Pages**
2. **Source** 选择 **GitHub Actions**
3. 保存

系统会自动识别 `.github/workflows/deploy.yml`。

---

## 第四步：触发自动部署

把当前修改推送到 `main` 分支：

```bash
git add .
git commit -m "chore(deploy): 配置 GitHub Pages + Render 免费部署"
git push origin main
```

GitHub Actions 会自动：
1. 安装前端依赖
2. 设置正确的 `VITE_BASE_PATH` 和 `VITE_API_BASE_URL`
3. 构建前端
4. 部署到 GitHub Pages

部署完成后，访问：

```
https://你的用户名.github.io/仓库名/
```

例如：

```
https://easonzhang.github.io/smart-battle-report/
```

---

## 第五步：更新 Render CORS（可选但推荐）

后端部署成功后，把 `CORS_ORIGINS` 从 `*` 改为你的 GitHub Pages 地址：

```env
CORS_ORIGINS=https://你的用户名.github.io
```

然后点击 Render 的 **Manual Deploy** → **Deploy latest commit** 重启服务。

---

## 免费版限制

### Render 免费版

- 15 分钟无请求后自动休眠
- 首次访问需要 30 秒–1 分钟冷启动
- 512MB 内存 / 0.1 CPU
- 每月 750 小时免费运行时间

### GitHub Pages

- 公开仓库免费
- 每月 100GB 带宽
- 只支持静态站点（本项目前端符合）

### LLM API

- Kimi / MiniMax 不是免费的，新账号通常有少量额度
- 建议先用 Kimi（国内访问稳定）

---

## 故障排查

### 前端页面空白

1. 打开浏览器开发者工具 → Console
2. 检查是否 404，可能是 `VITE_BASE_PATH` 不对
3. 检查 GitHub Actions 日志中的 `VITE_BASE_PATH` 输出

### 前端无法连接后端

1. 确认 `VITE_API_BASE_URL` Secret 已设置且正确
2. 确认 Render 后端状态为 **Live**
3. 确认 `CORS_ORIGINS` 包含你的 GitHub Pages 域名
4. 打开浏览器 Network 面板查看具体报错

### Render 冷启动慢

这是免费版正常行为。如果需要秒开，需要升级到 Render 付费版（$7/月起）或迁移到云服务器。

---

## 升级路径

| 阶段 | 前端 | 后端 | 月费用 |
|------|------|------|--------|
| 演示/测试 | GitHub Pages | Render 免费 | ¥0 |
| 稳定运行 | GitHub Pages / Vercel | Render 付费 / 云服务器 | ¥50-100 |
| 全部自己掌控 | 云服务器 + Nginx | 云服务器 + Docker | ¥30-60 |

---

## 相关文件

- `.github/workflows/deploy.yml` — GitHub Actions 自动部署
- `frontend/vite.config.ts` — Vite base 路径配置
- `frontend/.env.example` — 环境变量模板
- `deploy/Dockerfile.backend` — 后端 Docker 构建
- `render.yaml` — Render 部署配置
