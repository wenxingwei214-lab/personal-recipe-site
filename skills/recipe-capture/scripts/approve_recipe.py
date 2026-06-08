#!/usr/bin/env python3
import argparse
import datetime as dt
import os
import re
import subprocess
from pathlib import Path


REQUIRED = [
    "title",
    "category",
    "tags",
    "cover",
    "time",
    "difficulty",
    "servings",
    "calories",
    "tools",
    "ingredients",
    "favorite",
    "last_cooked",
]


def parse_frontmatter(text):
    match = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not match:
        raise SystemExit("Candidate must start with YAML frontmatter.")
    return parse_yaml(match.group(1)), match.group(2).strip()


def parse_yaml(yaml):
    data = {}
    lines = yaml.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            i += 1
            continue
        pair = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not pair:
            i += 1
            continue
        key, value = pair.group(1), pair.group(2)
        if value != "":
            data[key] = parse_scalar(value)
            i += 1
            continue
        block = []
        i += 1
        while i < len(lines) and (lines[i].startswith(" ") or lines[i].startswith("\t")):
            block.append(lines[i])
            i += 1
        data[key] = parse_block(block)
    return data


def parse_block(lines):
    items = []
    current = None
    for raw in lines:
        line = raw.strip()
        if line.startswith("- "):
            rest = line[2:]
            if ": " in rest:
                key, value = rest.split(": ", 1)
                current = {key: parse_scalar(value)}
                items.append(current)
            else:
                current = parse_scalar(rest)
                items.append(current)
        elif isinstance(current, dict) and ": " in line:
            key, value = line.split(": ", 1)
            current[key] = parse_scalar(value)
    return items


def parse_scalar(value):
    value = value.strip()
    if value in ("true", "false"):
        return value == "true"
    if value == '""':
        return ""
    if re.match(r"^\d+$", value):
        return int(value)
    if value.startswith("[") and value.endswith("]"):
        raw_items = value[1:-1].split(",")
        return [item.strip().strip("\"'") for item in raw_items if item.strip()]
    return value.strip("\"'")


def yaml_value(value, indent=0):
    pad = " " * indent
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, list):
        if not value:
            return "[]"
        lines = []
        for item in value:
            if isinstance(item, dict):
                keys = list(item.keys())
                first = keys[0]
                lines.append(f"{pad}- {first}: {item[first]}")
                for key in keys[1:]:
                    lines.append(f"{pad}  {key}: {item[key]}")
            else:
                lines.append(f"{pad}- {item}")
        return "\n" + "\n".join(lines)
    if value == "":
        return '""'
    return str(value)


def dump_frontmatter(data):
    keys = REQUIRED + ["source_platform", "source_url", "source_note"]
    seen = set()
    lines = ["---"]
    for key in keys:
        if key in data:
            seen.add(key)
            rendered = yaml_value(data[key], 2)
            if rendered.startswith("\n"):
                lines.append(f"{key}:{rendered}")
            else:
                lines.append(f"{key}: {rendered}")
    for key in data:
        if key not in seen and key not in ("approved", "status"):
            rendered = yaml_value(data[key], 2)
            if rendered.startswith("\n"):
                lines.append(f"{key}:{rendered}")
            else:
                lines.append(f"{key}: {rendered}")
    lines.append("---")
    return "\n".join(lines)


def slugify(title):
    ascii_slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    if ascii_slug:
        return ascii_slug[:64].strip("-")
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"recipe-{stamp}"


def validate(data, force):
    missing = [key for key in REQUIRED if key not in data]
    if missing:
        raise SystemExit(f"Missing required fields: {', '.join(missing)}")
    if not force and data.get("approved") is not True:
        raise SystemExit("Candidate is not approved. Set approved: true or pass --force after explicit user approval.")
    if not isinstance(data.get("ingredients"), list) or not data["ingredients"]:
        raise SystemExit("ingredients must be a non-empty list.")


def append_source_link(source_note, recipe_path, title):
    if not source_note:
        return
    source = Path(source_note)
    if not source.exists():
        return
    rel = os.path.relpath(recipe_path, source.parent)
    link = f"\n\n## 已入库菜谱\n\n- [{title}]({rel})\n"
    text = source.read_text(encoding="utf-8")
    if str(recipe_path) not in text and rel not in text:
        source.write_text(text.rstrip() + link, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Approve a candidate recipe into the personal static recipe site.")
    parser.add_argument("--candidate", required=True, help="Path to candidate Markdown.")
    parser.add_argument("--site-root", required=True, help="Path to 5-个人网站/个人菜谱.")
    parser.add_argument("--slug", help="Optional recipe slug.")
    parser.add_argument("--source-note", help="Optional source Obsidian note to backlink.")
    parser.add_argument("--force", action="store_true", help="Allow ingestion when approved is not true, only after explicit user approval.")
    parser.add_argument("--build", action="store_true", help="Run npm run build after writing.")
    args = parser.parse_args()

    candidate = Path(args.candidate)
    site_root = Path(args.site_root)
    if not candidate.exists():
        raise SystemExit(f"Candidate not found: {candidate}")
    if not site_root.exists():
        raise SystemExit(f"Site root not found: {site_root}")

    data, body = parse_frontmatter(candidate.read_text(encoding="utf-8"))
    validate(data, args.force)

    if args.source_note and "source_note" not in data:
        data["source_note"] = args.source_note

    slug = args.slug or slugify(str(data["title"]))
    target_dir = site_root / "content" / "recipes"
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{slug}.md"
    if target.exists():
        raise SystemExit(f"Recipe already exists: {target}")

    target.write_text(dump_frontmatter(data) + "\n\n" + body.strip() + "\n", encoding="utf-8")
    append_source_link(args.source_note or data.get("source_note"), target, data["title"])

    if args.build:
        subprocess.run(["npm", "run", "build"], cwd=site_root, check=True)

    print(f"Approved recipe written: {target}")


if __name__ == "__main__":
    main()
