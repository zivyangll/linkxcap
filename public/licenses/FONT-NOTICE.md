# Font notices / 字体说明

All Chinese and English text uses self-hosted subsets of Source Han Serif SC
(思源宋体), on desktop, tablet, and mobile. The derived family is renamed
`LinkX Source Han Serif`; the source outlines, copyright notices, and SIL OFL
1.1 license records are preserved.

Upstream: https://github.com/adobe-fonts/source-han-serif
License: [SIL OFL 1.1](Source-Han-Serif.txt)

The two WOFF2 subsets cover the site's Latin and Chinese characters and retain
the variable weight axis (250–900). English pages preload the Latin subset;
Chinese pages preload both. Content hashes in the filenames invalidate cached
fonts when their contents change.

Regenerate after changing copy with `scripts/subset-fonts.py`, using the upstream
`SourceHanSerifSC-VF.otf` in `.cache/fonts`. Requires fonttools and brotli.
No exclusive ownership is claimed over the upstream glyph designs.

全站中英文统一使用自托管的思源宋体子集，无需安装系统字体。子集保留原字体字形、
可变字重、版权和许可信息，并使用独立字体名称。修改文案后可用上述脚本重新生成。
