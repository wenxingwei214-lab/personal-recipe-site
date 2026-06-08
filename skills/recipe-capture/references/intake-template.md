# Intake Template

Create candidate notes under:

`4-生活汇总/02-美食探店/菜谱做法/待审批`

Filename pattern:

`YYYY-MM-DD 平台｜菜名｜待审批.md`

Candidate note structure:

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

After user approval, either change `approved: true` or run the ingestion script with `--force` only when approval is explicit in the current conversation.
