#!/usr/bin/env python3
from pathlib import Path
import datetime as dt
import re


ROOT = Path(__file__).resolve().parents[1]
RECIPES = ROOT / "content" / "recipes"


def ask(label, default=""):
    hint = f" [{default}]" if default else ""
    try:
        value = input(f"{label}{hint}: ").strip()
    except EOFError:
        value = ""
    return value or default


def slugify(value):
    value = value.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    if slug:
        return slug
    return "recipe-" + dt.datetime.now().strftime("%Y%m%d-%H%M%S")


def split_items(value):
    return [item.strip() for item in re.split(r"[,，、]", value) if item.strip()]


def main():
    print("新建一篇菜谱草稿。直接回车会使用默认值。")
    title = ask("菜名")
    if not title:
        raise SystemExit("菜名不能为空。")

    slug = ask("文件名英文 slug", slugify(title))
    category = ask("分类", "家常快手")
    tags = split_items(ask("标签，用逗号分隔", "快手菜"))
    time = ask("时长，分钟", "20")
    difficulty = ask("难度", "简单")
    servings = ask("几人份", "2")
    tools = split_items(ask("工具，用逗号分隔", "炒锅"))

    target = RECIPES / f"{slug}.md"
    if target.exists():
        raise SystemExit(f"文件已存在：{target}")

    tag_text = ", ".join(tags)
    tool_text = "\n".join(f"  - {tool}" for tool in tools)
    text = f"""---
title: {title}
category: {category}
tags: [{tag_text}]
cover: /assets/images/placeholder.svg
time: {time}
difficulty: {difficulty}
servings: {servings}
calories: 0
tools:
{tool_text}
ingredients:
  - name: 食材名
    amount: 用量
favorite: false
last_cooked: ""
draft: true
---

## 步骤

1. 写第一步。
2. 写第二步。

## 注意事项

- 写容易翻车的地方。

## 下次优化

- 写下次想调整的点。
"""

    RECIPES.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")
    print(f"已创建草稿：{target}")
    print("写完后把 frontmatter 里的 draft: true 改成 draft: false，再运行 npm run build。")


if __name__ == "__main__":
    main()
