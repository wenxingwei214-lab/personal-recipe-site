---
name: recipe-capture
description: 快速维护 Obsidian 驱动的个人菜谱网站：把用户口述、图片、截图、网页或收集箱里的菜谱整理成结构化 Markdown，压缩封面图，构建 docs 发布目录，并在需要时推送到 GitHub Pages。适用于新增菜谱、替换封面、修复手机图片慢/黑屏、简化菜谱网站发布流程。
---

# 菜谱网站快速维护

## 目标

默认少打扰用户：能直接做就直接做。只有信息明显不确定、来源复杂、版权/图片选择需要用户决定，才先做待确认版本。

## 项目路径

- 网站根目录：`5-个人网站/个人菜谱`
- 正式菜谱：`content/recipes`
- 封面图：`assets/images`
- 发布目录：`docs`
- 清单：`01-我的菜谱清单.md`
- 待审批：`4-生活汇总/02-美食探店/菜谱做法/待审批`

## 三种入口

### 1. 快速新增菜谱

当用户明确说“加进去、放进网站、收录、加入菜谱”，或者给了菜名/做法/图片并表达要更新网站时，直接正式入库，不再额外创建待审批笔记。

步骤：

1. 从用户素材生成 `content/recipes/<slug>.md`。
2. 如有图片，先处理成 `assets/images/<slug>.jpg`，再写 `cover`。
3. 更新 `01-我的菜谱清单.md`。
4. 运行 `npm run build`。
5. 验证 `docs/recipes/index.html` 包含新菜名，`docs/assets/images/<slug>.jpg` 存在且大小合理。
6. 需要公网时，提交并 `git push`；或让用户双击 `发布到GitHubPages.command`。

### 2. 复杂来源才待审批

只有这些情况先创建待审批笔记：

- 用户说“先整理、先草稿、我再确认”。
- 来源是长网页/视频转写/多道菜混杂，可能提错。
- 食材、步骤、图片方案明显不确定。

候选格式按 `references/recipe-schema.md`；审批脚本：

```bash
python3 skills/recipe-capture/scripts/approve_recipe.py \
  --candidate "<candidate>.md" \
  --site-root "5-个人网站/个人菜谱" \
  --slug "<slug>" \
  --force \
  --build
```

### 3. 只换图片或修图片

当用户说图片黑、慢、打不开、想换封面：

1. 先查 `content/recipes/<slug>.md` 的 `cover`。
2. 图片必须先保存到本地临时文件或 `assets/images`，不要只贴外站图片 URL 给用户。
3. 用 `view_image` 或等价方式确认图片能显示、不是黑图。
4. 转为 JPG，最长边建议 `1200px`，质量 `72` 左右，目标通常小于 `350KB`。
5. 更新 `cover`，运行 `npm run build`。
6. 检查生成 HTML 里图片带 `?v=` 版本参数，避免手机缓存旧图。

## 图片硬规则

- 用户上传的成品图：优先使用。
- 网图候选：必须下载到本地并可视检查后再展示，展示本地图片，不要只给网站链接。
- 网站封面优先用 `.jpg`；不要把大 PNG 作为封面。
- 如果图片超过 `450KB`，必须压缩或说明原因。
- 如果压缩后异常小、黑屏、空白，视为失败，回退到原图或重新找图。

常用压缩命令：

```bash
sips -s format jpeg -s formatOptions 72 -Z 1200 "<input>" --out "assets/images/<slug>.jpg"
```

## 正式菜谱字段

需要包含：

- `title`
- `category`
- `tags`
- `cover`
- `time`
- `difficulty`
- `servings`
- `calories`
- `tools`
- `ingredients`
- `favorite`
- `last_cooked`
- `source_platform`
- `source_url`
- `source_note`

正文顺序：

```markdown
## 步骤

## 注意事项

## 下次优化
```

## 构建和发布

本地构建：

```bash
npm run build
```

公网发布：

```bash
git add <changed-files>
git commit -m "<message>"
git push
```

或让用户双击：

```text
发布到GitHubPages.command
```

如果 `git push` 因网络失败，最多自动重试一次；仍失败就停止，告诉用户本地已提交、只差推送。

## 最终回复

保持短：

- 加了/改了哪道菜。
- 图片是否已压缩，大小是多少。
- 是否已构建/推送。
- 给公网链接，必要时带 `?v=<commit>`。
