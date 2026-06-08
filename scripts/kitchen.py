#!/usr/bin/env python3
from pathlib import Path
import datetime as dt
import re
import shutil
import subprocess


ROOT = Path(__file__).resolve().parents[1]
RECIPES = ROOT / "content" / "recipes"
IMAGES = ROOT / "assets" / "images"
DIST_INDEX = ROOT / "dist" / "index.html"


def ask(label, default=""):
    hint = f" [{default}]" if default else ""
    try:
        value = input(f"{label}{hint}: ").strip()
    except EOFError:
        value = ""
    return value or default


def slugify(value):
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if slug:
        return slug
    return "recipe-" + dt.datetime.now().strftime("%Y%m%d-%H%M%S")


def split_items(value):
    return [item.strip() for item in re.split(r"[,，、]", value) if item.strip()]


def run_build():
    subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)


def open_preview():
    run_build()
    subprocess.run(["open", str(DIST_INDEX)], check=False)
    print(f"\n已打开预览：{DIST_INDEX}")


def new_recipe():
    print("\n新建菜谱草稿。不会立刻发布到网页。")
    title = ask("菜名")
    if not title:
        print("菜名不能为空。")
        return

    slug = ask("文件名英文 slug，不懂就回车", slugify(title))
    category = ask("分类", "家常快手")
    tags = split_items(ask("标签，用逗号分隔", "快手菜"))
    time = ask("时长，分钟", "20")
    difficulty = ask("难度", "简单")
    servings = ask("几人份", "2")
    tools = split_items(ask("工具，用逗号分隔", "炒锅"))

    target = RECIPES / f"{slug}.md"
    if target.exists():
        print(f"文件已存在：{target}")
        return

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
    subprocess.run(["open", str(target)], check=False)
    print(f"\n已创建并打开草稿：{target}")
    print("写完后回到这个工作台，选择 2 发布草稿。")


def frontmatter_text(text):
    match = re.match(r"^---\n(.*?)\n---\n?", text, re.S)
    return match.group(1) if match else ""


def title_of(path):
    fm = frontmatter_text(path.read_text(encoding="utf-8"))
    match = re.search(r"^title:\s*(.+)$", fm, re.M)
    return match.group(1).strip().strip("\"'") if match else path.stem


def is_draft(path):
    fm = frontmatter_text(path.read_text(encoding="utf-8"))
    return bool(re.search(r"^draft:\s*true\s*$", fm, re.M))


def publish_draft():
    drafts = [path for path in sorted(RECIPES.glob("*.md")) if is_draft(path)]
    if not drafts:
        print("\n没有待发布草稿。")
        return

    print("\n待发布草稿：")
    for index, path in enumerate(drafts, 1):
        print(f"{index}. {title_of(path)} ({path.name})")

    choice = ask("输入编号发布，或直接回车取消")
    if not choice:
        return
    if not choice.isdigit() or not 1 <= int(choice) <= len(drafts):
        print("编号不正确。")
        return

    path = drafts[int(choice) - 1]
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"^draft:\s*true\s*$", "draft: false", text, flags=re.M)
    path.write_text(text, encoding="utf-8")
    run_build()
    subprocess.run(["open", str(DIST_INDEX)], check=False)
    print(f"\n已发布：{title_of(path)}")
    print(f"预览已更新：{DIST_INDEX}")


def open_recipes_folder():
    subprocess.run(["open", str(RECIPES)], check=False)
    print(f"\n已打开菜谱文件夹：{RECIPES}")


def recipe_files():
    return sorted(path for path in RECIPES.glob("*.md") if not path.name.startswith("_"))


def choose_recipe():
    recipes = recipe_files()
    if not recipes:
        print("\n还没有菜谱。")
        return None

    print("\n选择菜谱：")
    for index, path in enumerate(recipes, 1):
        marker = "草稿" if is_draft(path) else "已发布"
        print(f"{index}. {title_of(path)} ({path.stem}, {marker})")

    choice = ask("输入编号，或直接回车取消")
    if not choice:
        return None
    if not choice.isdigit() or not 1 <= int(choice) <= len(recipes):
        print("编号不正确。")
        return None
    return recipes[int(choice) - 1]


def clean_dragged_path(value):
    value = value.strip().strip("\"'")
    return value.replace("\\ ", " ")


def set_frontmatter_field(text, key, value):
    if re.search(rf"^{re.escape(key)}:\s*.*$", text, re.M):
        return re.sub(rf"^{re.escape(key)}:\s*.*$", f"{key}: {value}", text, count=1, flags=re.M)
    return re.sub(r"^---\n", f"---\n{key}: {value}\n", text, count=1)


def attach_cover_image():
    recipe = choose_recipe()
    if not recipe:
        return

    print("\n把图片文件拖到这里，然后回车。支持 jpg、jpeg、png、webp、svg。")
    source_text = ask("图片文件路径")
    if not source_text:
        return

    source = Path(clean_dragged_path(source_text)).expanduser()
    if not source.exists() or not source.is_file():
        print(f"找不到图片文件：{source}")
        return

    suffix = source.suffix.lower()
    if suffix not in [".jpg", ".jpeg", ".png", ".webp", ".svg"]:
        print("图片格式不支持，请使用 jpg、jpeg、png、webp 或 svg。")
        return

    IMAGES.mkdir(parents=True, exist_ok=True)
    target = IMAGES / f"{recipe.stem}{suffix}"
    shutil.copy2(source, target)

    cover = f"/assets/images/{target.name}"
    text = recipe.read_text(encoding="utf-8")
    recipe.write_text(set_frontmatter_field(text, "cover", cover), encoding="utf-8")
    run_build()
    subprocess.run(["open", str(DIST_INDEX)], check=False)

    print(f"\n已配图：{title_of(recipe)}")
    print(f"菜谱文件：{recipe.name}")
    print(f"图片文件：{target.name}")
    print(f"cover 已更新为：{cover}")


def menu():
    while True:
        print("\n========== 我的菜谱工作台 ==========")
        print("1. 新建一道菜谱草稿")
        print("2. 发布一篇草稿并更新网页")
        print("3. 重新生成并打开预览")
        print("4. 打开菜谱文件夹")
        print("5. 给菜谱配图/换图")
        print("0. 退出")
        choice = ask("请选择")

        if choice == "1":
            new_recipe()
        elif choice == "2":
            publish_draft()
        elif choice == "3":
            open_preview()
        elif choice == "4":
            open_recipes_folder()
        elif choice == "5":
            attach_cover_image()
        elif choice == "0":
            break
        else:
            print("请输入 1、2、3、4、5 或 0。")


if __name__ == "__main__":
    menu()
