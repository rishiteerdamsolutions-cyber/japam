#!/usr/bin/env python3
"""
Unify Padyam / Snanam / Namaskaram tiles with the rest of the set:
1) pushpa_chroma_flatten.py — flat / corner-matched pixels → transparent
2) Alpha-composite onto median border RGB from the other 13 shodashopachara PNGs
3) Polish outer ring: neutral gray + light halos → plate color

Run from repo root:
  python3 scripts/pushpa_tile_unify_three.py
"""
from __future__ import annotations

import statistics
import subprocess
import sys
from pathlib import Path

from PIL import Image

BASE = Path(__file__).resolve().parent.parent / "public" / "images" / "pushpa" / "shodashopachara"
TARGETS = ("padyam.png", "snanam.png", "namaskaram.png")


def median_border_rgb() -> tuple[int, int, int]:
    good = [
        "dhyana-avahana",
        "asanam",
        "arghyam",
        "achamaniyam",
        "vastram",
        "yagnopavitham",
        "gandham",
        "pushpam",
        "dhoopam",
        "deepam",
        "naivedyam",
        "tamboolam",
        "neeranjanam",
    ]
    rs: list[int] = []
    gs: list[int] = []
    bs: list[int] = []
    for name in good:
        im = Image.open(BASE / f"{name}.png").convert("RGB")
        w, h = im.size
        strip = 10
        px = im.load()
        for y in range(h):
            for x in range(w):
                if x < strip or x >= w - strip or y < strip or y >= h - strip:
                    c = px[x, y]
                    rs.append(c[0])
                    gs.append(c[1])
                    bs.append(c[2])
    return (
        int(statistics.median(rs)),
        int(statistics.median(gs)),
        int(statistics.median(bs)),
    )


def _is_neutral_gray(r: int, g: int, b: int) -> bool:
    m, M = min(r, g, b), max(r, g, b)
    if M - m > 18:
        return False
    avg = (r + g + b) / 3
    return 48 < avg < 125


def _is_light_gray(r: int, g: int, b: int) -> bool:
    if min(r, g, b) > 165:
        return True
    if max(r, g, b) - min(r, g, b) < 12 and min(r, g, b) > 150:
        return True
    return False


def polish_tile_borders(path: Path, plate: tuple[int, int, int, int], strip: int = 14) -> None:
    """Remove gray / off-white halos left in the outer ring after compositing."""
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if not (x < strip or x >= w - strip or y < strip or y >= h - strip):
                continue
            r, g, b, a = px[x, y]
            if a < 200:
                continue
            if _is_neutral_gray(r, g, b) or _is_light_gray(r, g, b):
                px[x, y] = plate
    im.save(path, "PNG")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    chroma = root / "scripts" / "pushpa_chroma_flatten.py"
    for t in TARGETS:
        p = BASE / t
        if not p.exists():
            print("skip missing", p, file=sys.stderr)
            continue
        subprocess.run([sys.executable, str(chroma), str(p)], check=True, capture_output=True, text=True)
    plate_rgb = median_border_rgb()
    plate = plate_rgb + (255,)
    print("plate RGBA", plate)
    for t in TARGETS:
        p = BASE / t
        fg = Image.open(p).convert("RGBA")
        bottom = Image.new("RGBA", fg.size, plate)
        Image.alpha_composite(bottom, fg).save(p, "PNG")
        polish_tile_borders(p, plate)
        print("composited+border", p)


if __name__ == "__main__":
    main()
