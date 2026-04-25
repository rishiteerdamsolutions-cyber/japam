#!/usr/bin/env python3
"""
Composite Pushpa shodashopachara PNGs onto an opaque plate matching other tiles (dark warm brown).

Use when a tile was exported with a fully transparent "background" so it looks empty inside
the in-app slot frame. Samples background RGB from a reference tile, then:
  out = solid plate + alpha-composite original on top.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def sample_bg_rgb(ref: Image.Image) -> tuple[int, int, int]:
    """Average RGB from reference corners + a few interior edge samples (opaque pixels)."""
    px = ref.load()
    w, h = ref.size
    coords = [
        (2, 2),
        (w - 3, 2),
        (2, h - 3),
        (w - 3, h - 3),
        (w // 2, 3),
        (3, h // 2),
        (w - 4, h // 2),
        (w // 2, h - 4),
    ]
    rs: list[int] = []
    gs: list[int] = []
    bs: list[int] = []
    for x, y in coords:
        if 0 <= x < w and 0 <= y < h:
            r, g, b, a = px[x, y]
            if a > 160:
                rs.append(r)
                gs.append(g)
                bs.append(b)
    if not rs:
        return (42, 36, 32)
    n = len(rs)
    return (sum(rs) // n, sum(gs) // n, sum(bs) // n)


def backfill(path: Path, bg_rgb: tuple[int, int, int]) -> None:
    fg = Image.open(path).convert("RGBA")
    w, h = fg.size
    plate = Image.new("RGBA", (w, h), bg_rgb + (255,))
    out = Image.alpha_composite(plate, fg)
    out.save(path, "PNG")
    print("ok", path)


def main() -> None:
    base = Path(__file__).resolve().parent.parent / "public" / "images" / "pushpa" / "shodashopachara"
    ref_path = base / "arghyam.png"
    if not ref_path.exists():
        print("missing ref", ref_path, file=sys.stderr)
        sys.exit(1)
    ref = Image.open(ref_path).convert("RGBA")
    bg = sample_bg_rgb(ref)
    for name in sys.argv[1:] or ["padyam.png", "snanam.png", "namaskaram.png"]:
        p = base / name
        if not p.exists():
            print("skip missing", p, file=sys.stderr)
            continue
        backfill(p, bg)


if __name__ == "__main__":
    main()
