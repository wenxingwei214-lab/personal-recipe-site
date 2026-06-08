# 我的个人菜谱网站

这是一个轻量级静态菜谱网站 Demo：内容在 Obsidian 中用 Markdown 维护，网页通过 `scripts/build.js` 自动生成。没有后台、登录和数据库，适合个人长期维护。

## 目录结构

```text
个人菜谱/
├── content/
│   ├── recipes/          # 每一道菜一个 Markdown 文件
│   └── week-menu.md      # 本周菜单，手动维护
├── assets/
│   └── images/           # 所有菜谱图片和封面图
├── src/
│   ├── styles.css        # 网站样式
│   └── app.js            # 列表页筛选
├── scripts/
│   └── build.js          # 静态网站生成脚本
└── dist/                 # 构建产物，部署这个目录
```

## 本地预览

最简单的方式：直接打开 `dist/index.html`。

如果你修改了菜谱或样式，先重新构建：

```bash
npm run build
```

也可以用本地服务器预览：

```bash
npm run serve
```

然后打开：

```text
http://localhost:4173
```

## 新增一道菜

最省事的方式：双击 `菜谱工作台.command`，选择 `1. 新建一道菜谱草稿`。

写完后再次双击 `菜谱工作台.command`，选择 `2. 发布一篇草稿并更新网页`。

手动方式如下：

在 `content/recipes/` 里新增一个 `.md` 文件，例如 `braised-tofu.md`：

```markdown
---
title: 红烧豆腐
category: 家常快手
tags: [豆腐, 下饭菜]
cover: /assets/images/braised-tofu.jpg
time: 20
difficulty: 简单
servings: 2
calories: 380
tools:
  - 炒锅
ingredients:
  - name: 豆腐
    amount: 1 块
  - name: 生抽
    amount: 1 汤匙
favorite: false
last_cooked: 2026-06-07
---

## 步骤

1. 写第一步。
2. 写第二步。

## 注意事项

- 写容易翻车的地方。

## 下次优化

- 写下次想调整的点。
```

保存后重新运行 `npm run build`，新菜谱会自动出现在首页、列表页、详情页和食材索引页。

## 替换图片

把图片放到 `assets/images/`，然后在菜谱 frontmatter 里修改：

```yaml
cover: /assets/images/你的图片名.jpg
```

图片建议使用横图，比例接近 `4:3` 或 `16:10`。文件名尽量使用英文、数字和短横线，部署时更稳。

## 部署上线

运行：

```bash
npm run build
```

把生成的 `dist/` 目录部署到任意静态托管服务即可，例如 GitHub Pages、Netlify、Vercel、Cloudflare Pages 或自己的服务器。

如果用 GitHub Pages，可以把 `dist/` 内容作为发布目录；如果用 Netlify/Vercel，构建命令填 `npm run build`，发布目录填 `dist`。

## Frontmatter 字段

每篇菜谱建议保留这些字段：

```yaml
title: 菜名
category: 分类
tags: [标签1, 标签2]
cover: /assets/images/cover.jpg
time: 30
difficulty: 简单
servings: 2
calories: 400
tools:
  - 炒锅
ingredients:
  - name: 食材名
    amount: 用量
favorite: false
last_cooked: 2026-06-07
```

其中 `favorite: true` 的菜会显示在首页「常做菜」。
