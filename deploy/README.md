# 智能战报系统 - 云端部署指南

## 概述

本系统支持以下部署方案：

| 方案 | 适用场景 | 难度 | 成本 |
|------|----------|------|------|
| **GitHub Pages + Render** | 完全免费上线 | ⭐ | ¥0（详见 [DEPLOY_FREE.md](../DEPLOY_FREE.md)） |
| **Docker Compose** | 自有服务器/云主机 | ⭐⭐ | 低 |
| **Vercel + 云函数** | 快速上线、无服务器运维 | ⭐ | 免费额度 |
| **分离部署** | 前端 CDN + 后端云服务器 | ⭐⭐⭐ | 中等 |

> 想完全免费部署？直接看 [DEPLOY_FREE.md](../DEPLOY_FREE.md)。


---

## 方案一：Docker Compose 部署（推荐）

### 1. 准备环境

需要一台云服务器（如阿里云 ECS、腾讯云 CVM、AWS EC2）：
- **最低配置**：1核2G、Ubuntu 22.04
- **推荐配置**：2核4G

安装 Docker：
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 docker-compose
sudo apt install docker-compose-plugin
```

### 2. 配置环境变量

```bash
# 在项目根目录创建 .env 文件
cat > .env << 'EOF'
# LLM 提供商选择：minimax 或 kimi
LLM_PROVIDER=minimax

# MiniMax API Key（默认有 fallback key，生产环境建议替换）
MINIMAX_API_KEY=your_minimax_key_here

# Kimi API Key（如需使用 Kimi）
KIMI_API_KEY=your_kimi_key_here

# CORS 配置（生产环境建议指定域名）
CORS_ORIGINS=*
EOF
```

### 3. 构建并启动

```bash
# 进入 deploy 目录
cd deploy

# 构建镜像
docker-compose build

# 后台启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 4. 验证部署

```bash
# 健康检查
curl http://localhost:8000/api/health

# 前端访问
open http://localhost
```

---

## 方案二：Vercel 前端 + 云服务器后端

### 前端部署到 Vercel

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 配置前端 API 地址
cat > frontend/.env.production << 'EOF'
VITE_API_BASE_URL=https://your-server-ip:8000
EOF

# 3. 部署
cd frontend
vercel --prod
```

### 后端部署到云服务器

按方案一部署后端即可，只需要修改 `docker-compose.yml` 只启动 `backend` 服务。

---

## 方案三：使用 Kimi API（Moonshot AI）

### 切换 LLM 提供商

#### 方式一：环境变量（推荐）

```bash
# 在 .env 文件中设置
LLM_PROVIDER=kimi
KIMI_API_KEY=sk-your-kimi-api-key

# 重启服务
docker-compose restart backend
```

#### 方式二：直接修改后端代码

编辑 `backend/app.py`：
```python
LLM_PROVIDER = "kimi"  # 改为 "kimi"
```

### 验证 LLM 切换

```bash
curl http://localhost:8000/api/health
# 应返回：{"status": "ok", "llm": "Kimi (Moonshot-v1-8k)", "provider": "kimi"}
```

---

## 目录结构说明

```
智能战报/
├── backend/              # FastAPI 后端
│   ├── app.py           # 主应用
│   └── requirements.txt # 依赖
├── frontend/            # React 前端
│   ├── src/
│   └── package.json
├── deploy/              # 部署配置
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
└── scripts/             # 工具脚本
    └── test_conversation.py
```

---

## 常见问题

### Q: 前端无法连接后端？

检查 `frontend/.env` 或 `vite.config.ts` 中的 API 地址配置：
```ts
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```

### Q: 如何更新部署？

```bash
# 拉取最新代码
git pull

# 重新构建并重启
docker-compose down
docker-compose up -d --build
```

### Q: 数据持久化？

当前版本使用内存存储（会话、订阅、工作台）。生产环境建议：
- 添加 SQLite/PostgreSQL 持久化
- 使用 Redis 存储会话状态
- 挂载数据卷到宿主机

```yaml
# docker-compose.yml 中添加
volumes:
  - ./data:/app/data  # 数据持久化
```

---

## 安全建议

1. **生产环境务必移除 fallback API key**
2. **设置 CORS 为具体域名**（非 `*`）
3. **配置 HTTPS**（使用 Nginx + Let's Encrypt）
4. **设置防火墙规则**，仅开放必要端口
