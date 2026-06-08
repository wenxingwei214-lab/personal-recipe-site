# Recipe Schema

Use this schema for candidate and approved recipe Markdown.

```yaml
---
title: 菜名
category: 家常快手
tags: [快手菜, 下饭菜]
cover: /assets/images/placeholder.svg
time: 20
difficulty: 简单
servings: 2
calories: 0
tools:
  - 炒锅
ingredients:
  - name: 食材名
    amount: 用量
favorite: false
last_cooked: ""
approved: false
source_platform: 小红书
source_url: https://example.com
source_note: 4-生活汇总/02-美食探店/菜谱做法/待审批/example.md
---
```

Required website fields:

- `title`: dish name.
- `category`: one short category.
- `tags`: list of searchable tags.
- `cover`: path under `/assets/images/`, or `/assets/images/placeholder.svg`.
- `time`: numeric minutes.
- `difficulty`: `简单`, `中等`, or `进阶`.
- `servings`: numeric serving count.
- `calories`: numeric estimate, use `0` if unknown.
- `tools`: list of cooking tools.
- `ingredients`: list of `{ name, amount }`.
- `favorite`: boolean.
- `last_cooked`: `YYYY-MM-DD` or empty string.

Pipeline fields:

- `approved`: must be `true` before ingestion unless the current user message explicitly approves and the script is run with `--force`.
- `source_platform`: source platform or collection type.
- `source_url`: original URL when known.
- `source_note`: Obsidian note path when known.

Approved recipe body:

```markdown
## 步骤

1. ...

## 注意事项

- ...

## 下次优化

- ...

## 来源摘记

- 来源：
- 个人判断：
- 不确定：
```
