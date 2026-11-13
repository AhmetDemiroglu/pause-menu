"""Builds the Pause Menu brand asset set.

Step 1 (this script): writes every source SVG with the lettering converted to
outlines, so no font has to be installed to open them.
Step 2 (render.mjs): rasterises the SVGs listed in renders.json.
Step 3 (this script with --finalize): writes favicon.ico and flattens the
icons that app stores require without an alpha channel.

Usage, from brand/tools:
    python3 build.py && node render.mjs && python3 build.py --finalize
"""
import json
import sys
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

TOOLS = Path(__file__).resolve().parent
BRAND = TOOLS.parent
SRC = BRAND / "logo" / "svg"

CREAM = "#FBF6EA"
INK = "#14101F"
PINK = "#FF2E88"
CAP = 200.0  # cap height of the block lettering, in SVG units
PAD = 48.0

anton = TTFont(TOOLS / "fonts/Anton-Regular.ttf")
dafoe = TTFont(TOOLS / "fonts/MrDafoe-Regular.ttf")


# ---------------------------------------------------------------- lettering

def glyph_bounds(font, char):
    glyphs = font.getGlyphSet()
    pen = BoundsPen(glyphs)
    glyphs[font.getBestCmap()[ord(char)]].draw(pen)
    return pen.bounds


ANTON_SCALE = CAP / glyph_bounds(anton, "P")[3]
ANTON_EM = anton["head"].unitsPerEm * ANTON_SCALE
TRACK = ANTON_EM * 0.012


def text(font, string, scale, x, baseline, tracking=0.0):
    """Path data for a string set at x / baseline."""
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    pen = SVGPathPen(glyphs, lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    cursor = x
    for i, ch in enumerate(string):
        name = cmap[ord(ch)]
        glyphs[name].draw(TransformPen(pen, Transform(scale, 0, 0, -scale, cursor, baseline)))
        cursor += hmtx[name][0] * scale + (tracking if i < len(string) - 1 else 0)
    return pen.getCommands()


def ink_extent(font, string, scale, tracking=0.0):
    """Left bearing of the first glyph and right ink edge of the string."""
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    first = glyph_bounds(font, string[0])
    last = glyph_bounds(font, string[-1])
    advance = sum(hmtx[cmap[ord(c)]][0] for c in string) * scale + tracking * (len(string) - 1)
    return first[0] * scale, advance - (hmtx[cmap[ord(string[-1])]][0] - last[2]) * scale


# ---------------------------------------------------------------- primitives

BAR_GRADIENTS = (
    '<linearGradient id="barA" x1="0" y1="0" x2="0" y2="1">'
    '<stop offset="0" stop-color="#FF2E88"/><stop offset="1" stop-color="#5B0FB0"/></linearGradient>'
    '<linearGradient id="barB" x1="0" y1="0" x2="0" y2="1">'
    '<stop offset="0" stop-color="#FF8A1F"/><stop offset="0.55" stop-color="#C2187A"/>'
    '<stop offset="1" stop-color="#3A0CA3"/></linearGradient>'
)
SUNSET = (
    '<linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">'
    '<stop offset="0" stop-color="#4B0AA6"/><stop offset="0.58" stop-color="#FF2476"/>'
    '<stop offset="1" stop-color="#FF8A12"/></linearGradient>'
)
SUNSET_H = (
    '<linearGradient id="sunsetH" x1="0" y1="0" x2="1" y2="0">'
    '<stop offset="0" stop-color="#4B0AA6"/><stop offset="0.5" stop-color="#FF2476"/>'
    '<stop offset="1" stop-color="#FF8A12"/></linearGradient>'
)


def bars(x, y, w, h, gap, r, fills=("url(#barA)", "url(#barB)")):
    return (
        f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" rx="{r:.2f}" fill="{fills[0]}"/>'
        f'<rect x="{x + w + gap:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" rx="{r:.2f}" fill="{fills[1]}"/>'
    )


def write_svg(path, width, height, body, defs=BAR_GRADIENTS):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {height:.0f}" '
        f'width="{width:.0f}" height="{height:.0f}" role="img" aria-label="Pause Menu">'
        f"<title>Pause Menu</title><defs>{defs}</defs>{body}</svg>\n"
    )


def centered_bars(size, height_ratio, fills, defs=BAR_GRADIENTS, background=""):
    """Square canvas with the pause bars centred. Bar proportions follow the app icon."""
    bh = size * height_ratio
    bw, gap = bh * 0.315, bh * 0.214
    x = (size - bw * 2 - gap) / 2
    return background + bars(x, (size - bh) / 2, bw, bh, gap, bw * 0.25, fills)


# ---------------------------------------------------------------- logos

def logo_primary(color):
    """Bars, block PAUSE and the script Menu. Bars optically match the cap height of the P."""
    base = PAD + CAP
    over = CAP * 0.015  # rounded bar ends read shorter than flat letter tops
    bw, gap, side = CAP * 0.28, CAP * 0.13, CAP * 0.24
    tx = PAD + bw * 2 + gap + side
    left, right = ink_extent(anton, "PAUSE", ANTON_SCALE, TRACK)
    word = text(anton, "PAUSE", ANTON_SCALE, tx - left, base, TRACK)

    script_scale = ANTON_EM * 0.80 / dafoe["head"].unitsPerEm
    sleft, sright = ink_extent(dafoe, "Menu", script_scale)
    script_right = tx + (right - left) + CAP * 0.46
    script_base = base + CAP * 0.36
    pivot_x = script_right - (sright - sleft) / 2
    script = text(dafoe, "Menu", script_scale, script_right - sright, script_base)

    body = (
        bars(PAD, PAD - over, bw, CAP + over * 2, gap, bw * 0.22)
        + f'<path d="{word}" fill="{color}"/>'
        + f'<path d="{script}" fill="{PINK}" '
        f'transform="rotate(-10 {pivot_x:.2f} {script_base - CAP * 0.15:.2f})"/>'
    )
    return script_right + PAD, script_base + CAP * 0.34 + PAD, body


def logo_stacked(color):
    """PAUSE over MENU, bars spanning both lines."""
    total = CAP * 2.17
    bw, gap, side = total * 0.285, total * 0.092, total * 0.165
    tx = PAD + bw * 2 + gap + side
    left, right = ink_extent(anton, "PAUSE", ANTON_SCALE, TRACK)
    mleft, _ = ink_extent(anton, "MENU", ANTON_SCALE, TRACK)
    lines = text(anton, "PAUSE", ANTON_SCALE, tx - left, PAD + CAP, TRACK) + text(
        anton, "MENU", ANTON_SCALE, tx - mleft, PAD + total, TRACK
    )
    body = bars(PAD, PAD, bw, total, gap, bw * 0.30) + f'<path d="{lines}" fill="{color}"/>'
    return tx + (right - left) + PAD, total + PAD * 2, body


def logo_horizontal(color):
    """PAUSE || MENU on one line, for navigation bars."""
    base = PAD + CAP
    left, right = ink_extent(anton, "PAUSE", ANTON_SCALE, TRACK)
    bw, gap, side = CAP * 0.29, CAP * 0.15, CAP * 0.30
    bx = PAD - left + right + side
    mleft, mright = ink_extent(anton, "MENU", ANTON_SCALE, TRACK)
    mx = bx + bw * 2 + gap + side - mleft
    body = (
        f'<path d="{text(anton, "PAUSE", ANTON_SCALE, PAD - left, base, TRACK)}" fill="{color}"/>'
        + bars(bx, PAD - CAP * 0.015, bw, CAP * 1.03, gap, bw * 0.22)
        + f'<path d="{text(anton, "MENU", ANTON_SCALE, mx, base, TRACK)}" fill="{color}"/>'
    )
    return mx + mright + PAD, CAP + PAD * 2, body


def build_svgs():
    for name, builder in (("primary", logo_primary), ("stacked", logo_stacked), ("horizontal", logo_horizontal)):
        for tone, color in (("on-dark", CREAM), ("on-light", INK)):
            write_svg(SRC / f"logo-{name}-{tone}.svg", *builder(color))

    write_svg(SRC / "mark.svg", 444, 616, bars(48, 48, 150, 520, 48, 40))

    size = 1024.0
    full = f'<rect width="{size:.0f}" height="{size:.0f}" fill="url(#sunset)"/>'
    rounded = f'<rect width="{size:.0f}" height="{size:.0f}" rx="230" fill="url(#sunset)"/>'
    circle = f'<circle cx="512" cy="512" r="512" fill="url(#sunset)"/>'
    cream = (CREAM, CREAM)
    write_svg(SRC / "icon.svg", size, size, centered_bars(size, 0.539, cream, background=full), SUNSET)
    write_svg(SRC / "icon-rounded.svg", size, size, centered_bars(size, 0.539, cream, background=rounded), SUNSET)
    write_svg(SRC / "icon-round.svg", size, size, centered_bars(size, 0.46, cream, background=circle), SUNSET)

    # Android adaptive icon layers: 108dp canvas, keep the art inside the 66dp safe circle.
    write_svg(SRC / "android-foreground.svg", size, size, centered_bars(size, 0.42, cream), "")
    write_svg(SRC / "android-background.svg", size, size, full, SUNSET)
    write_svg(SRC / "android-monochrome.svg", size, size, centered_bars(size, 0.42, ("#FFFFFF", "#FFFFFF")), "")

    # Splash: gradient bars on a transparent canvas, shown on the ink background.
    write_svg(SRC / "splash.svg", size, size, centered_bars(size, 0.42, ("url(#barA)", "url(#barB)")))
    legacy_h = 579.0
    legacy_bars = centered_bars(legacy_h, 0.62, ("url(#barA)", "url(#barB)"))
    write_svg(SRC / "splash-legacy.svg", 719, legacy_h,
              f'<g transform="translate({(719 - legacy_h) / 2:.2f} 0)">{legacy_bars}</g>')

    # Default social preview, 1200 x 630.
    w, h, logo = logo_primary(CREAM)
    scale = min(820 / w, 400 / h)
    ox, oy = (1200 - w * scale) / 2, (630 - h * scale) / 2 - 20
    url = text(anton, "PAUSEMENU.APP", ANTON_SCALE * 0.13, 0, 0, TRACK * 0.5)
    ul, ur = ink_extent(anton, "PAUSEMENU.APP", ANTON_SCALE * 0.13, TRACK * 0.5)
    og = (
        f'<rect width="1200" height="630" fill="{INK}"/>'
        f'<g transform="translate({ox:.2f} {oy:.2f}) scale({scale:.4f})">{logo}</g>'
        f'<path d="{url}" fill="{CREAM}" opacity="0.7" transform="translate({600 - (ur + ul) / 2:.2f} 572)"/>'
        '<rect y="618" width="1200" height="12" fill="url(#sunsetH)"/>'
    )
    write_svg(BRAND / "social" / "svg" / "og-default.svg", 1200, 630, og, BAR_GRADIENTS + SUNSET_H)


# ---------------------------------------------------------------- finalize

def finalize():
    from PIL import Image

    web = BRAND / "web"
    icon = Image.open(web / "favicon-source.png").convert("RGBA")
    icon.save(web / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    (web / "favicon-source.png").unlink()

    for path in json.loads((TOOLS / "renders.json").read_text())["flatten"]:
        target = BRAND / path
        image = Image.open(target).convert("RGBA")
        flat = Image.new("RGB", image.size, INK)
        flat.paste(image, mask=image.split()[3])
        flat.save(target, optimize=True)
    print("finalize ok")


if __name__ == "__main__":
    if "--finalize" in sys.argv:
        finalize()
    else:
        build_svgs()
        print("svg ok")
