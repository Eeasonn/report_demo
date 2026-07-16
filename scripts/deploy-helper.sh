#!/usr/bin/env bash
# 智能战报系统 - GitHub Pages + Render 免费部署助手
# 用法: bash scripts/deploy-helper.sh

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }

info "智能战报 - 免费部署助手"
info "项目路径: $ROOT_DIR"
echo ""

# 1. 检查前置条件
info "检查前置条件..."

if ! command -v git &> /dev/null; then
    err "未安装 git，请先安装"
    exit 1
fi

if ! command -v node &> /dev/null; then
    err "未安装 Node.js，请先安装 (建议 v20+)"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    err "未安装 npm"
    exit 1
fi

ok "git、Node.js、npm 均已安装"

# 2. 检查 GitHub 仓库
info "检查 Git 仓库..."
if ! git -C "$ROOT_DIR" rev-parse --git-dir &> /dev/null; then
    warn "当前目录不是 Git 仓库"
    warn "请先执行: cd \"$ROOT_DIR\" && git init && git remote add origin <你的 GitHub 仓库地址>"
    exit 1
fi

REMOTE_URL=$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null || echo "")
if [ -z "$REMOTE_URL" ]; then
    warn "Git 仓库未关联远程地址"
    warn "请先执行: git remote add origin https://github.com/你的用户名/仓库名.git"
    exit 1
fi

ok "Git 远程仓库: $REMOTE_URL"

# 3. 安装前端依赖并构建
info "安装前端依赖..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    npm install
else
    ok "node_modules 已存在，跳过安装"
fi

info "验证前端生产构建..."
VITE_BASE_PATH=/demo-repo/ VITE_API_BASE_URL=https://example.onrender.com npm run build
ok "前端生产构建成功"

# 清理构建产物（由 GitHub Actions 重新构建）
rm -rf "$FRONTEND_DIR/dist"
info "已清理本地构建产物"

# 4. 检查必要文件
info "检查部署配置文件..."
REQUIRED_FILES=(
    ".github/workflows/deploy.yml"
    "deploy/Dockerfile.backend"
    "render.yaml"
    "DEPLOY_FREE.md"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$ROOT_DIR/$file" ]; then
        ok "$file"
    else
        err "缺少文件: $file"
        exit 1
    fi
done

# 5. 提交并推送
info "检查是否有未提交更改..."
if [ -n "$(git -C "$ROOT_DIR" status --short)" ]; then
    info "发现未提交更改，正在提交..."
    git -C "$ROOT_DIR" add .
    git -C "$ROOT_DIR" commit -m "chore(deploy): 配置 GitHub Pages + Render 免费部署" || true
    git -C "$ROOT_DIR" push origin $(git -C "$ROOT_DIR" branch --show-current)
    ok "已推送到 GitHub"
else
    ok "没有未提交更改"
fi

echo ""
echo "========================================"
ok "本地部署准备完成！"
echo "========================================"
echo ""
info "接下来需要你手动完成的步骤："
echo ""
echo "1. 确保 GitHub 仓库是 public（私有仓库 Pages 需付费）"
echo "2. 访问 https://dashboard.render.com 部署后端："
echo "   - New + → Web Service → 选择本仓库"
echo "   - Dockerfile Path: ./deploy/Dockerfile.backend"
echo "   - 环境变量："
echo "     LLM_PROVIDER=kimi"
echo "     KIMI_API_KEY=sk-your-kimi-api-key"
echo "     CORS_ORIGINS=*"
echo "3. 记下 Render 域名，例如："
echo "   https://smart-battle-report-backend.onrender.com"
echo "4. 在 GitHub 仓库 Settings → Secrets → Actions 中添加："
echo "   VITE_API_BASE_URL=https://smart-battle-report-backend.onrender.com"
echo "5. 在 GitHub 仓库 Settings → Pages → Source 选择 GitHub Actions"
echo "6. 等待 GitHub Actions 运行完成，访问："
echo "   https://你的用户名.github.io/仓库名/"
echo ""
info "详细说明请查看: $ROOT_DIR/DEPLOY_FREE.md"
