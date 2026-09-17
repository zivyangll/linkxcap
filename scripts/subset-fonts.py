"""Build self-hosted subsets from the upstream OFL fonts in .cache/fonts.

Run after changing site copy. The Latin subset is reused across languages;
Chinese is split into small unicode ranges to avoid downloading unused glyphs.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
import json
from io import BytesIO

def rename_subset(font, family, style):
    # Subsets are derived font programs: keep the license and copyright,
    # but use distinct family / PostScript names rather than reserved names.
    postscript = family.replace(' ', '') + '-' + style
    values = {1: family, 2: style, 3: postscript + '-1.0', 4: family + ' ' + style, 6: postscript, 16: family, 17: style}
    for record in font['name'].names:
        if record.nameID in values:
            record.string = values[record.nameID].encode(record.getEncoding(), errors='replace')
    if 'CFF ' in font:
        cff = font['CFF '].cff
        cff.fontNames = [postscript]
        for top in cff.topDictIndex:
            top.FamilyName = family
            top.FullName = family + ' ' + style

root = Path(__file__).resolve().parent.parent
text = ''.join(p.read_text() for p in (root / 'src').rglob('*') if p.suffix in {'.astro', '.ts', '.json', '.md'})
chars = sorted(set(text) | set(chr(n) for n in range(32, 127)))
out = root / 'public/fonts'
out.mkdir(exist_ok=True)
css = []
report = []
priority = json.loads((root / 'src/data/font-priority.json').read_text()) if (root / 'src/data/font-priority.json').exists() else {}
for family, filename, variable in [('LinkX Serif', 'SourceHanSerifSC-VF.otf', True), ('LinkX Sans', 'LXGWNeoXiHei.ttf', False)]:
    font = TTFont(root / '.cache/fonts' / filename)
    source_subset = subset.Subsetter()
    source_subset.populate(unicodes=[ord(c) for c in chars])
    source_subset.subset(font)
    # Use the exact Regular face for the common text; a separate Medium face
    # carries the page headings and cards. Preserve source outlines.
    weights = [400, 500, 600, 700, 900] if variable else [400]
    for weight in weights:
        face = instantiateVariableFont(font, {'wght': weight}, inplace=False) if variable else font
        face_bytes = BytesIO()
        face.save(face_bytes)
        cmap = face.getBestCmap()
        available = [ord(c) for c in chars if ord(c) in cmap]
        latin = [c for c in available if c < 0x3000]
        chinese = [c for c in available if c >= 0x3000]
        key = f"{'serif' if variable else 'sans'}-{weight}"
        groups = [latin]
        remaining = set(chinese)
        shared = ''.join(usage.get('shared', {}).get(key, '') for usage in priority.values())
        samples = [shared] + [usage.get('critical', {}).get(key, '') for usage in priority.values()] + [usage.get('body', {}).get(key, '') for usage in priority.values()]
        for sample in samples:
            codes = sorted({ord(c) for c in sample} & remaining)
            remaining -= set(codes)
            groups.extend(codes[n:n+180] for n in range(0, len(codes), 180))
        rest = sorted(remaining)
        groups.extend(rest[n:n+180] for n in range(0, len(rest), 180))
        for index, codepoints in enumerate(groups):
            if not codepoints: continue
            f = TTFont(BytesIO(face_bytes.getvalue()))
            options = subset.Options()
            options.flavor = 'woff2'
            options.layout_features = ['*']
            sub = subset.Subsetter(options=options)
            sub.populate(unicodes=codepoints)
            sub.subset(f)
            rename_subset(f, family, {400:'Regular',500:'Medium',600:'SemiBold',700:'Bold',900:'Heavy'}[weight])
            f.flavor = 'woff2'
            name = f"{'serif' if variable else 'sans'}-{weight}-{index}.woff2"
            f.save(out / name)
            ranges = ','.join(f'U+{c:X}' for c in codepoints)
            css.append(f'@font-face{{font-family:"{family}";font-style:normal;font-weight:{weight};font-display:swap;src:url("__BASE__fonts/{name}") format("woff2");unicode-range:{ranges};}}')
            report.append({'file': name, 'bytes': (out / name).stat().st_size, 'glyphs': len(codepoints)})
italic = TTFont(out / 'source-serif-italic.woff2')
if 'fvar' in italic:
    italic = instantiateVariableFont(italic, {a.axisTag: 400 if a.axisTag == 'wght' else a.defaultValue for a in italic['fvar'].axes}, inplace=True)
italic_subset = subset.Subsetter()
italic_subset.populate(unicodes=list(range(32, 256)))
italic_subset.subset(italic)
rename_subset(italic, 'LinkX Web Italic', 'Italic')
italic.flavor = 'woff2'
italic.save(out / 'source-serif-italic.woff2')
css.append('@font-face{font-family:"LinkX Web Italic";font-style:italic;font-weight:400;font-display:swap;src:url("__BASE__fonts/source-serif-italic.woff2") format("woff2");}')
(root / 'src/data/fonts.json').write_text(json.dumps({'css': '\n'.join(css), 'report': report}))
print(json.dumps(report, indent=2))
