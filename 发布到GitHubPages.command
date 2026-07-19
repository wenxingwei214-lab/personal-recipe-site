#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"

REPO_OWNER="wenxingwei214-lab"
REPO_NAME="personal-recipe-site"
REPO="$REPO_OWNER/$REPO_NAME"
URL="https://$REPO_OWNER.github.io/$REPO_NAME/"

echo "==> 1. 重新生成网站"
npm run quiet-sidebar
npm run build

echo "==> 2. 清理发布目录"
find docs -name ".DS_Store" -delete
touch docs/.nojekyll

echo "==> 3. 初始化/更新 Git 仓库"
if [ ! -d .git ]; then
  git init
fi
git branch -M main
if ! git config user.name >/dev/null; then
  git config user.name "wenxingwei214-lab"
fi
if ! git config user.email >/dev/null; then
  git config user.email "wenxingwei214-lab@users.noreply.github.com"
fi

echo "==> 4. 提交当前网站（只上传 docs 发布目录，不上传原图和工作区）"
git add docs .gitignore "发布到GitHubPages.command"
if git diff --cached --quiet; then
  echo "没有新的文件变更，跳过 commit。"
else
  git commit -m "Update personal recipe site"
fi

echo "==> 5. 创建或连接 GitHub 仓库"
if gh repo view "$REPO" >/dev/null 2>&1; then
  echo "仓库已存在：$REPO"
else
  gh repo create "$REPO_NAME" --public
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "https://github.com/$REPO.git"
fi

echo "==> 6. 推送 main 分支"
git push -u origin main

echo "==> 7. 检查 GitHub Pages 公网地址"
if curl -L -s --head "$URL" | grep -q "200"; then
  echo "GitHub Pages 已可访问。"
else
  echo "已经推送到 GitHub。GitHub Pages 可能还在刷新，请等 1-3 分钟。"
fi

echo ""
echo "发布完成。公网网址："
echo "$URL"
echo ""
echo "如果第一次打开 404，请等 1-3 分钟再刷新。"
