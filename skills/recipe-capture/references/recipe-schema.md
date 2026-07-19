# 菜谱字段规范

这个规范用于“待审批菜谱”和“已入库菜谱”的 Markdown 文件。

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

## 网站必需字段

- `title`：菜名。
- `category`：一个简短分类。
- `tags`：便于搜索的标签列表。
- `cover`：图片路径，通常在 `/assets/images/` 下；没有图片时用 `/assets/images/placeholder.svg`。
- `time`：数字，单位为分钟。
- `difficulty`：只能是 `简单`、`中等` 或 `进阶`。
- `servings`：数字，表示份量/人数。
- `calories`：数字估计值；不清楚就填 `0`。
- `tools`：厨具列表。
- `ingredients`：食材列表，格式是 `{ name, amount }`。
- `favorite`：布尔值，`true` 或 `false`。
- `last_cooked`：上次做这道菜的日期，格式 `YYYY-MM-DD`；没有就填空字符串 `""`。

## 入库流程字段

- `approved`：正式入库前必须是 `true`；除非本轮对话里用户已经明确批准，并且脚本使用了 `--force`。
- `source_platform`：来源平台或收集类型。
- `source_url`：已知时填写原始链接。
- `source_note`：已知时填写 Obsidian 来源笔记路径。

## 已入库菜谱正文格式

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
