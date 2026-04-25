#!/usr/bin/env python3
"""
Make near-uniform edge / corner color transparent (for AI tiles with flat backgrounds).
Usage: python3 scripts/pushpa_chroma_flatten.py file1.png file2.png ...
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def dedupe_bg(path: Path, threshold: float = 38.0) -> None:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    # Sample background from four corners (mean RGB)
    corners = [
        px[0, 0][:3],
        px[w - 1, 0][:3],
        px[0, h - 1][:3],
        px[w - 1, h - 1][:3],
    ]
    br, bg, bb = (
        sum(c[0] for c in corners) / 4,
        sum(c[1] for c in corners) / 4,
        sum(c[2] for c in corners) / 4,
    )

    def dist(r: int, g: int, b: int) -> float:
        return ((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2) ** 0.5

    thr2 = threshold**2
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d2 = (r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2
            if d2 <= thr2:
                px[x, y] = (r, g, b, 0)
    im.save(path, "PNG")


def main() -> None:
    for p in sys.argv[1:]:
        dedupe_bg(Path(p))
        print("ok", p)


if __name__ == "__main__":
    main()
