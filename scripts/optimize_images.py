#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "assets" / "images"
BACKUP_DIR = ROOT / "原图备份" / "images"
MAX_SIZE = 1400
JPEG_QUALITY = "72"

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


def main():
    if not IMG_DIR.exists():
        return
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    changed = 0
    for path in IMG_DIR.iterdir():
        if not path.is_file() or path.suffix.lower() not in EXTS:
            continue
        backup = BACKUP_DIR / path.name
        if not backup.exists():
            shutil.copy2(path, backup)
        source = backup
        dim = dimensions(source)
        if not dim:
            continue
        w, h = dim
        if max(w, h) <= MAX_SIZE and path.stat().st_size < 450_000:
            continue
        tmp = path.with_suffix(path.suffix + ".tmp")
        # Always render website image from original backup to avoid repeated quality loss.
        if path.suffix.lower() == ".png":
            cmd = ["sips", "-Z", str(MAX_SIZE), str(source), "--out", str(tmp)]
        else:
            cmd = ["sips", "-s", "format", "jpeg", "-s", "formatOptions", JPEG_QUALITY, "-Z", str(MAX_SIZE), str(source), "--out", str(tmp)]
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        tmp.replace(path)
        changed += 1
        new_dim = dimensions(path)
        print(f"optimized {path.name}: {w}x{h} -> {new_dim[0]}x{new_dim[1]}, {path.stat().st_size//1024}KB")
    if changed == 0:
        print("images already optimized")


if __name__ == "__main__":
    main()
