#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "assets" / "images"
RECIPES_DIR = ROOT / "content" / "recipes"
MAX_SIZE = 1100
JPEG_QUALITY = "68"
MIN_SAFE_OUTPUT_SIZE = 80_000
MIN_SAFE_RATIO = 0.12
MAX_PUBLISH_SIZE = 350_000

EXTS = {".jpg", ".jpeg", ".png"}


def dimensions(path: Path):
    try:
        out = subprocess.check_output(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)], text=True, stderr=subprocess.DEVNULL)
    except Exception:
        return None
    width = height = None
    for line in out.splitlines():
        line = line.strip()
        if line.startswith("pixelWidth:"):
            width = int(line.split(":", 1)[1].strip())
        if line.startswith("pixelHeight:"):
            height = int(line.split(":", 1)[1].strip())
    return width, height


def optimize_to_jpeg(source: Path, target: Path):
    tmp = target.with_suffix(target.suffix + ".tmp")
    cmd = [
        "sips",
        "-s",
        "format",
        "jpeg",
        "-s",
        "formatOptions",
        JPEG_QUALITY,
        "-Z",
        str(MAX_SIZE),
        str(source),
        "--out",
        str(tmp),
    ]
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    tmp.replace(target)


def normalize_recipe_covers():
    if not RECIPES_DIR.exists():
        return 0
    changed = 0
    for recipe in RECIPES_DIR.glob("*.md"):
        if recipe.name.startswith("_"):
            continue
        text = recipe.read_text()
        lines = text.splitlines()
        next_lines = []
        file_changed = False
        for line in lines:
            if line.startswith("cover:"):
                raw_cover = line.split(":", 1)[1].strip().strip("\"'")
                relative = raw_cover.lstrip("/")
                source = ROOT / relative
                if source.suffix.lower() == ".png" and source.exists():
                    target = source.with_suffix(".jpg")
                    if not target.exists() or source.stat().st_mtime > target.stat().st_mtime:
                        optimize_to_jpeg(source, target)
                        print(f"converted {source.name} -> {target.name}, {target.stat().st_size//1024}KB")
                    next_cover = "/" + str(target.relative_to(ROOT))
                    next_lines.append(f"cover: {next_cover}")
                    file_changed = True
                    continue
            next_lines.append(line)
        if file_changed:
            recipe.write_text("\n".join(next_lines) + ("\n" if text.endswith("\n") else ""))
            changed += 1
    return changed


def main():
    if not IMG_DIR.exists():
        return
    changed = 0
    changed += normalize_recipe_covers()
    for path in IMG_DIR.iterdir():
        if not path.is_file() or path.suffix.lower() not in EXTS:
            continue
        if path.suffix.lower() == ".png" and path.with_suffix(".jpg").exists():
            continue
        dim = dimensions(path)
        if not dim:
            continue
        w, h = dim
        if max(w, h) <= MAX_SIZE and path.stat().st_size < MAX_PUBLISH_SIZE:
            continue
        tmp = path.with_suffix(path.suffix + ".tmp")
        if path.suffix.lower() == ".png":
            cmd = ["sips", "-s", "format", "jpeg", "-s", "formatOptions", JPEG_QUALITY, "-Z", str(MAX_SIZE), str(path), "--out", str(tmp)]
        else:
            cmd = ["sips", "-s", "format", "jpeg", "-s", "formatOptions", JPEG_QUALITY, "-Z", str(MAX_SIZE), str(path), "--out", str(tmp)]
        original_size = path.stat().st_size
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        optimized_size = tmp.stat().st_size
        suspiciously_tiny = (
            path.suffix.lower() != ".png"
            and original_size > 450_000
            and optimized_size < MIN_SAFE_OUTPUT_SIZE
            and optimized_size < original_size * MIN_SAFE_RATIO
        )
        if suspiciously_tiny:
            tmp.unlink(missing_ok=True)
            print(f"skipped {path.name}: optimized result looked corrupt ({optimized_size//1024}KB)")
            continue
        tmp.replace(path)
        changed += 1
        new_dim = dimensions(path)
        print(f"optimized {path.name}: {w}x{h} -> {new_dim[0]}x{new_dim[1]}, {path.stat().st_size//1024}KB")
    if changed == 0:
        print("images already optimized")


if __name__ == "__main__":
    main()
