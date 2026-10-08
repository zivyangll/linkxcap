"""Build H5-only Source Han Serif SC subsets without changing desktop fonts.

Requires fonttools and brotli. Run after changing website copy, using the
upstream SourceHanSerifSC-VF.otf in .cache/fonts (SIL OFL 1.1).
"""
from hashlib import sha256
from pathlib import Path
import json

from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '.cache/fonts/SourceHanSerifSC-VF.otf'
FAMILY = 'LinkX H5 Songti'
OUTPUT = ROOT / 'public/fonts'


def unicode_ranges(codepoints):
    ranges = []
    start = previous = codepoints[0]
    for point in codepoints[1:]:
        if point != previous + 1:
            ranges.append((start, previous))
            start = point
        previous = point
    ranges.append((start, previous))
    return ','.join(
        f'U+{start:X}' if start == end else f'U+{start:X}-{end:X}'
        for start, end in ranges
    )


text = ''.join(
    path.read_text()
    for path in sorted((ROOT / 'src').rglob('*'))
    if path.suffix in {'.astro', '.ts', '.json', '.md', '.css'}
)
requested = set(map(ord, text)) | set(range(32, 256))
source = TTFont(SOURCE)
available = sorted(requested.intersection(source.getBestCmap()))
weights = source['fvar'].axes[0]
weight_range = f'{int(weights.minValue)} {int(weights.maxValue)}'
faces = []
report = []
OUTPUT.mkdir(exist_ok=True)

# Keep the language switch's single Chinese character in the Latin subset so
# English pages can avoid downloading CJK unless their content needs it.
for group, points in [
    ('latin', [point for point in available if point < 0x3000 or point == ord('中')]),
    ('cjk', [point for point in available if point >= 0x3000 and point != ord('中')]),
]:
    font = TTFont(SOURCE, recalcTimestamp=False)
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=points)
    subsetter.subset(font)
    # Rename the derived family while preserving copyright and OFL records.
    names = {
        1: FAMILY,
        3: 'LinkXH5Songti-Variable-1.0',
        4: FAMILY + ' Variable',
        6: 'LinkXH5Songti-Variable',
        16: FAMILY,
        25: 'LinkXH5Songti',
    }
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
        elif record.nameID in {instance.postscriptNameID for instance in font['fvar'].instances}:
            renamed = record.toUnicode().replace('SourceHanSerifSCVF', 'LinkXH5Songti')
            record.string = renamed.encode(record.getEncoding())
    font.flavor = 'woff2'
    temporary = OUTPUT / f'h5-songti-{group}.woff2'
    font.save(temporary)
    data = temporary.read_bytes()
    filename = f'h5-songti-{group}-{sha256(data).hexdigest()[:12]}.woff2'
    temporary.rename(OUTPUT / filename)
    faces.append(
        f'@font-face{{font-family:"{FAMILY}";font-style:normal;'
        f'font-weight:{weight_range};font-display:swap;'
        f'src:url("__BASE__fonts/{filename}") format("woff2");'
        f'unicode-range:{unicode_ranges(points)};}}'
    )
    report.append({'file': filename, 'bytes': len(data), 'glyphs': len(points)})

css = '@media (max-width:767px){' + ''.join(faces) + '}'
(ROOT / 'src/data/h5-fonts.json').write_text(
    json.dumps({'family': FAMILY, 'css': css, 'report': report}, indent=2) + '\n'
)
keep = {item['file'] for item in report}
for path in OUTPUT.glob('h5-songti-*.woff2'):
    if path.name not in keep:
        path.unlink()
print(json.dumps(report, indent=2))
