#!/usr/bin/env python3
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VAULT = ROOT.parents[1]
APP_JSON = VAULT / ".obsidian" / "app.json"
SITE = "5-个人网站/个人菜谱"

IGNORE_PATTERNS = [
    f"{SITE}/.git",
    f"{SITE}/.git/**",
    f"{SITE}/assets",
    f"{SITE}/assets/",
    f"{SITE}/assets/**",
    f"{SITE}/content",
    f"{SITE}/content/",
    f"{SITE}/content/**",
    f"{SITE}/docs",
    f"{SITE}/docs/",
    f"{SITE}/docs/**",
    f"{SITE}/scripts",
    f"{SITE}/scripts/",
    f"{SITE}/scripts/**",
    f"{SITE}/skills",
    f"{SITE}/skills/",
    f"{SITE}/skills/**",
    f"{SITE}/src",
    f"{SITE}/src/",
    f"{SITE}/src/**",
    f"{SITE}/package.json",
    "**/.DS_Store",
]


def main():
    if not APP_JSON.exists():
        raise SystemExit(f"Obsidian app config not found: {APP_JSON}")

    data = json.loads(APP_JSON.read_text(encoding="utf-8"))
    current = data.get("userIgnoreFilters", [])
    merged = []
    seen = set()
    for pattern in current + IGNORE_PATTERNS:
        if pattern not in seen:
            merged.append(pattern)
            seen.add(pattern)
    data["userIgnoreFilters"] = merged
    APP_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated Obsidian ignore filters: {APP_JSON}")
    print("Restart Obsidian or use Reload app without saving if the file tree still shows hidden folders.")


if __name__ == "__main__":
    main()
