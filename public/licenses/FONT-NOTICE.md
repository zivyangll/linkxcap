# Font notices / 字体说明

The distributed fonts are renamed subsets. The original outlines, copyright
notices and licenses are preserved; unused glyphs / variation weights were
removed for transfer size. Subset generation is in `scripts/subset-fonts.py`.

| Distributed family | Upstream source | License |
| --- | --- | --- |
| LinkX Serif | https://github.com/adobe-fonts/source-han-serif | SIL OFL 1.1 (Source-Han-Serif.txt) |
| LinkX Web Italic | https://github.com/adobe-fonts/source-serif | SIL OFL 1.1 (Source-Serif-4.txt) |
| LinkX Sans | https://github.com/lxgw/LxgwNeoXiHei | IPA Font License 1.0 (LXGW-Neo-XiHei.txt) |

## Restoring the original IPA font

Download the original **IPAexGothic / IPAexゴシック** from
https://moji.or.jp/ipafont/ipafontdownload/ and install it on your device.
Reload the website. Its sans-serif font stack lists `IPAexGothic` before `LinkX Sans`, so the
installed original is preferred over the derived WOFF2 fonts.
The original uses Japanese glyph forms for some characters.

For a maintained local copy of the website, put the downloaded `ipaexg.ttf` in
`public/fonts/`, replace the LinkX Sans font-face declarations in
`src/data/fonts.json` with a rule pointing to that original file, and rebuild.
Preserve the original name, bytes and included IPA license when redistributing it.

The derived fonts are provided under the same licenses as their upstreams.
No exclusive ownership is claimed over the upstream glyph designs.

如果希望恢复原始字体，请下载并安装 IPAexGothic，重新加载网页即可。
网页字体规则优先调用本地已安装的原始 IPA 字体。
