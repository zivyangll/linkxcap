import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
const dir='docs/verification/meeting-revision';
const log=JSON.parse(await fs.readFile(`${dir}/capture-log.json`,'utf8'));
const labels={
 'home-01-opening':'首页 01 · 点沿轨迹移动', 'home-02-hero':'首页 02 · 圆弧与标题渐显', 'home-03-about':'首页 03 · 内容进入', 'home-04-research':'首页 04 · 数字分组进入', 'home-05-topology':'首页 05 · 3D 节点悬停',
 'portfolio-desktop':'Portfolio · 黑色星群与 Logo 点亮','portfolio-zhipu-ai-desktop':'公司详情 · 智谱 AI','portfolio-mosi-desktop':'公司详情 · 滚动切换模思智能','team-desktop':'团队 · 三人、右侧悬停简介','contact-desktop':'Fellow · 圆弧与摆点','fellow-introduction-desktop':'Fellow · 标题缩小／内容进入','fellow-small-desktop':'Fellow · 视频小窗口（素材待提供）','fellow-expanded-desktop':'Fellow · 放大状态（素材待提供）','join-desktop':'Join Us · 联系入口','insights-desktop':'Insight · 保留当前列表','article-desktop':'Insight · 站内详情与原文链接',
};
const styles=`*{box-sizing:border-box}body{margin:0;padding:40px;background:#edeae4;color:#26202c;font:16px/1.5 system-ui,sans-serif}h1{font:500 32px/1.2 system-ui;margin:0 0 12px}header p{color:#6a626e;margin:0 0 28px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.card{margin:0;background:#fcfbf5;padding:14px;border:1px solid #d8d2db}.card h2{font-size:16px;font-weight:500;margin:0 0 12px}.card img{display:block;width:100%;height:410px;object-fit:contain;object-position:center top;background:#f8f6f2}.card a{display:block}h2.section{margin-top:40px}.mobile{grid-template-columns:repeat(3,minmax(0,1fr))}.mobile img{height:1000px}footer{font-size:12px;color:#6a626e;margin-top:24px}`;
const card=(name)=>`<figure class="card"><h2>${labels[name]||name.replaceAll('-',' ')}</h2><a href="${name}.png"><img src="${name}.png" alt="${labels[name]||name}"></a></figure>`;
const wrap=(title,subtitle,names,cls='')=>`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${title}</title><style>${styles}</style><header><h1>${title}</h1><p>${subtitle}</p></header><main class="grid ${cls}">${names.map(card).join('')}</main><footer>2026-09-19 · 真实浏览器截图。品牌视频和部分文案仍待提供；本轮不宣称逐像素验收通过。</footer></html>`;
await fs.writeFile(`${dir}/index.html`,wrap('星连资本 · 会议修改预览','桌面正常动效状态与中英文手机页面。点击截图查看原尺寸；实施记录见 docs/07。',log.evidence.map(e=>e.name)));
await fs.writeFile(`${dir}/desktop-overview.html`,wrap('星连资本 · 本轮修改','五屏滚动、3D 星图、投资详情联动、三人团队和 Fellow 联系页面。',['home-05-topology','portfolio-desktop','portfolio-mosi-desktop','team-desktop','contact-desktop','fellow-expanded-desktop']));
await fs.writeFile(`${dir}/mobile-overview.html`,wrap('星连资本 · 手机预览','390px 触摸布局：先选择公司再阅读简介；点选团队头像；Fellow 自然滚动。',['zh-portfolio-mosi-mobile','zh-team-mobile','zh-contact-mobile'],'mobile'));
const keep=new Set([...log.evidence.map(e=>`${e.name}.png`),'desktop-overview.png','mobile-overview.png']);
for(const file of await fs.readdir(dir))if(file.endsWith('.png')&&!keep.has(file))await fs.unlink(`${dir}/${file}`);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
for(const name of ['desktop-overview','mobile-overview']) {await p.goto(pathToFileURL(`${process.cwd()}/${dir}/${name}.html`).href);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`${dir}/${name}.png`,fullPage:true});}
await b.close();
