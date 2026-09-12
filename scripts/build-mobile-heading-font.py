"""Build the mobile and web Turkish-capable Caprasimo derivative (fonttools==4.65.0).

Run from any directory: python scripts/build-mobile-heading-font.py [--check]
The original font and its OFL license remain in mobile/assets/fonts.
"""

import argparse
from pathlib import Path

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


FONT_DIR = Path(__file__).resolve().parents[1] / "mobile" / "assets" / "fonts"
SOURCE = FONT_DIR / "Caprasimo-Regular.ttf"
OUTPUT = FONT_DIR / "TravyonDisplay-Regular.ttf"
WEB_OUTPUT = FONT_DIR.parents[2] / "web" / "public" / "fonts" / OUTPUT.name
# Existing accents, lifted by the same offset used by the font's Idieresis.
# The tall ear of g needs the capital-height breve to avoid collisions.
ADDITIONS = {
    0x011E: ("Gbreve", "G", "breve", 426),
    0x011F: ("gbreve", "g", "breve", 426),
    0x0130: ("Idotaccent", "I", "dotaccent", 426),
    0x015E: ("Scedilla", "S", "cedilla", 0),
    0x015F: ("scedilla", "s", "cedilla", 0),
}
TURKISH = "ÇĞİÖŞÜçğıöşü"


def validate(font, source):
    cmap = font.getBestCmap()
    for char in TURKISH:
        assert cmap.get(ord(char)), f"Missing Turkish character: U+{ord(char):04X}"
    # Preserve all original character mappings, outlines, metrics and hinting.
    for codepoint, name in source.getBestCmap().items():
        assert cmap[codepoint] == name
    for name in source.getGlyphOrder():
        assert font["hmtx"][name] == source["hmtx"][name], name
        assert font["glyf"][name].compile(font["glyf"]) == source["glyf"][name].compile(source["glyf"]), name
    for codepoint, (name, base, accent, dy) in ADDITIONS.items():
        assert cmap[codepoint] == name
        glyph = font["glyf"][name]
        assert glyph.isComposite()
        assert [c.glyphName for c in glyph.components] == [base, accent]
        assert (glyph.components[0].x, glyph.components[0].y) == (0, 0)
        assert glyph.components[1].y == dy
        assert font["hmtx"][name][0] == source["hmtx"][base][0]
        assert glyph.yMax <= font["OS/2"].usWinAscent
        assert -glyph.yMin <= font["OS/2"].usWinDescent
    assert font["name"].getDebugName(1) == "Travyon Display"


def build():
    font = TTFont(SOURCE, recalcTimestamp=False)
    glyf = font["glyf"]
    for codepoint, (name, base, accent, dy) in ADDITIONS.items():
        base_glyph, accent_glyph = glyf[base], glyf[accent]
        base_glyph.recalcBounds(glyf)
        accent_glyph.recalcBounds(glyf)
        dx = round((base_glyph.xMin + base_glyph.xMax - accent_glyph.xMin - accent_glyph.xMax) / 2)
        pen = TTGlyphPen(font.getGlyphSet())
        pen.addComponent(base, (1, 0, 0, 1, 0, 0))
        pen.addComponent(accent, (1, 0, 0, 1, dx, dy))
        glyph = pen.glyph()
        glyf[name] = glyph
        glyph.recalcBounds(glyf)
        font["hmtx"][name] = (font["hmtx"][base][0], glyph.xMin)
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[codepoint] = name
        font["OS/2"].usWinAscent = max(font["OS/2"].usWinAscent, glyph.yMax)
        font["OS/2"].usWinDescent = max(font["OS/2"].usWinDescent, -glyph.yMin)
    font["OS/2"].recalcUnicodeRanges(font)
    font["OS/2"].recalcCodePageRanges(font)
    names = {
        1: "Travyon Display",
        2: "Regular",
        3: "1.001;Travyon;TravyonDisplay-Regular;Turkish-1",
        4: "Travyon Display Regular",
        6: "TravyonDisplay-Regular",
        16: "Travyon Display",
        17: "Regular",
    }
    for name_id, value in names.items():
        font["name"].removeNames(nameID=name_id)
        font["name"].setName(value, name_id, 3, 1, 0x409)
    font["name"].setName(
        "Caprasimo derivative for Travyon. Adds Turkish composite glyphs using "
        "the original outlines. Licensed under SIL OFL 1.1.", 10, 3, 1, 0x409
    )
    # Existing copyright, designer credits and OFL metadata remain unchanged.
    font.save(OUTPUT)
    font.save(WEB_OUTPUT)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate without writing")
    args = parser.parse_args()
    if not args.check:
        build()
    validate(TTFont(OUTPUT), TTFont(SOURCE))
    validate(TTFont(WEB_OUTPUT), TTFont(SOURCE))
    assert OUTPUT.read_bytes() == WEB_OUTPUT.read_bytes(), "Mobile/web fonts differ"
    print("PASS: Turkish coverage, original outlines/hinting, metrics and font naming.")
