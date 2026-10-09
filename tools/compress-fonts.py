"""Lossless WOFF2 packaging of the committed OFL fonts; no glyph subsetting."""
from pathlib import Path
from fontTools.ttLib import TTFont

for source in sorted(Path('public/assets/fonts').glob('*.ttf')):
    font = TTFont(source, recalcTimestamp=False)
    font.flavor = 'woff2'
    dest = source.with_suffix('.woff2')
    font.save(dest)
    print(dest.name, dest.stat().st_size)
