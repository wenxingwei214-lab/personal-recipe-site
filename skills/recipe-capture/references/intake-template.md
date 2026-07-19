# 待审批菜谱模板

待审批候选笔记统一创建在：

`4-生活汇总/02-美食探店/菜谱做法/待审批`

文件名格式：

`YYYY-MM-DD 平台｜菜名｜待审批.md`

候选笔记结构：

```markdown
---
title:
category:
tags: []
cover: /assets/images/placeholder.svg
time: 0
difficulty: 简单
servings: 1
calories: 0
tools: []
ingredients:
  - name:
    amount:
favorite: false
last_cooked: ""
approved: false
source_platform:
source_url:
source_note:
---

## 步骤

1.

## 注意事项

-

## 下次优化

-

## 来源摘记

- 原始标题：
- 来源链接：
- 关键做法：
- 不确定信息：
```

用户批准后，有两种方式正式入库：

1. 把候选文件里的 `approved` 改成 `true`；或
2. 仅当本轮对话里用户已经明确批准时，运行入库脚本并加 `--force`。
