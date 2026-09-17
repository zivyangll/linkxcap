import fs from 'node:fs/promises';
const root = 'docs/verification/visual-audit';
const frames = JSON.parse(await fs.readFile(`${root}/frames.json`));
const metrics = JSON.parse(await fs.readFile(`${root}/after-metrics.json`));
const routes = JSON.parse(await fs.readFile(`${root}/route-audit.json`));
const labels = {
  526: 'Portfolio · 完整列表',
  1282: 'Portfolio · 智谱详情',
  1359: 'Portfolio · 模思详情',
  1569: 'Fellow A · 开场',
  1617: 'Fellow B · 轮廓文字',
  1692: 'Fellow B · The Next Signal',
  1753: 'Fellow B · 介绍',
  1811: 'Fellow B · 媒体卡片',
  1869: 'Fellow B · 媒体放大',
  1919: 'Fellow A · 媒体放大',
  1969: 'Fellow A · 介绍与媒体',
  2021: 'Fellow B · Join Us',
  2082: 'Fellow A · Join Us',
  4567: 'Team · 首屏',
  4631: 'Team · 王璞悬停',
  4729: 'Team · 完整列表',
  2833: 'Insight · 完整列表',
  3112: 'Insight · 首屏另一版本',
  3191: 'Home · 菜单',
  3297: 'Home · Open Signal',
  3348: 'Home · 品牌主视觉',
  3393: 'Home · About 进入状态',
  3438: 'Home · About 展开',
  3487: 'Home · Research',
  3549: 'Home · Focus 初始',
  3659: 'Home · 基础模型选中',
  3769: 'Home · 智能应用选中',
  3883: 'Home · 物理智能选中',
};
const notes = {
  1359: 'Figma 复用了智谱正文；实现保留模思内容，待确认。',
  1569: 'A 组备选；当前采用 B 组开场与 Join Us。',
  1617: '轮廓文字状态尚未实现；Figma 未提供关键帧。',
  1753: '当前首页未包含该介绍状态；范围待确认。',
  1811: '当前首页未包含该媒体卡片；范围及视频待确认。',
  1869: '当前首页未包含该媒体放大状态；范围及视频待确认。',
  1919: 'A 组备选媒体状态，未采用。',
  1969: 'A 组备选介绍／媒体状态，未采用。',
  2082: 'A 组备选 Join Us；当前采用 B 组 2021。',
  4567: '同一团队页与 4729 的人物素材存在差异；实现以完整画板为准。',
  4631: '悬停文字已补齐，右侧人物仍使用 4729 完整稿素材。',
  3112: '与 2833 标题尺寸、位置和筛选不同；当前实现采用 2833。',
  3393: '独立进入状态未实现；当前直接进入 About 展开内容。',
  3438: '正文保持清晰；Figma 含渐变模糊，尚未确认其最终阅读状态。',
  3487: '保留 MOCK 数据标注；该标注未出现在 Figma。',
};
const items = frames.map((f) => {
  const id = f.id.split(':')[1];
  return {
    ...f,
    id,
    title: labels[id],
    note: notes[id] || '存在字体、抗锯齿、细线或状态细节差异，未达到零差异。',
    metric: metrics.find((m) => m.id === id),
  };
});
await fs.writeFile(
  `${root}/index.html`,
  `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link-X · Figma 全页视觉核对</title>
<style>*{box-sizing:border-box}body{margin:0;font:14px/1.6 system-ui,sans-serif;background:#f4f2ed;color:#202026}header{padding:24px 32px;background:#202026;color:white}h1{margin:0 0 8px;font-size:26px}header p{margin:0;color:#ceccd5;max-width:1000px}a{color:#69518d}header a{color:#dfcaff}main{padding:24px 32px}nav{display:flex;gap:16px;margin-bottom:20px}button,select,input{font:inherit}button,select{padding:8px 12px;border:1px solid #bbb6c4;background:white;border-radius:6px}button{cursor:pointer}button[aria-pressed=true]{background:#69518d;color:white}label{display:inline-flex;gap:8px;align-items:center}.toolbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:12px 0}.notice{padding:12px 16px;background:#eee5d8;border-left:3px solid #97672d}.metrics{font-variant-numeric:tabular-nums;margin:12px 0}.viewport{overflow:auto;max-height:76vh;border:1px solid #ccc;background:#dedbd5;padding:10px}.canvas{position:relative;display:flex;align-items:flex-start;gap:16px;width:max-content}.canvas img{display:block;max-width:none}.pane p{margin:0 0 6px;font-weight:600}.overlay .pane{position:relative}.overlay .actual{position:absolute;top:0;left:0}.overlay .actual p{visibility:hidden}.overlay .actual img{opacity:var(--alpha,.5)}.missing{padding:18px;background:#fff4dc}.route-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}.route-grid article{padding:12px;background:white;border:1px solid #d2ced8}.route-grid h3{font-size:13px;overflow-wrap:anywhere;margin:0 0 8px}.route-grid a{display:block;max-height:520px;overflow:auto;background:#e7e5df}.route-grid img{display:block;width:100%}small{color:#696477}.route-grid small{display:block;margin-top:8px}[hidden]{display:none!important}@media(max-width:700px){main,header{padding:16px}.toolbar{gap:8px}h1{font-size:21px}}</style>
<header><h1>Link-X · 全页视觉核对</h1><p>28 个 Figma 画板／状态，19 组同尺寸页面截图，70 个中英文 URL，280 次响应式检查。此报告未判定“100% 还原”。无实现对应的画板明确标记，不计为通过。</p></header>
<main><nav><button id="framesTab" aria-pressed="true">Figma 对照</button><button id="routesTab" aria-pressed="false">全站页面截图</button></nav>
<section id="framesView"><label>画板 <select id="frame"></select></label><div class="toolbar"><label>对照 <select id="version"><option value="after">本轮修正后</option><option value="before">修正前</option></select></label><label>模式 <select id="mode"><option value="side">并排</option><option value="overlay">透明叠加</option><option value="diff">差异图（通道差 &gt;16）</option></select></label><label>显示比例 <select id="zoom"><option value=".4">40%</option><option value=".5">50%</option><option value="1">100% · 原始像素</option><option value="2">200%</option></select></label><label>网页不透明度 <input id="alpha" type="range" min="0" max="100" value="50"></label></div><p id="note" class="notice"></p><p id="metrics" class="metrics"></p><div class="viewport"><div id="canvas" class="canvas"></div></div><p><small>指标始终按原始像素计算，界面缩放只影响显示。未自动对齐、未裁切差异区、未遮罩文字。差异百分比不是“还原率”；空白背景会稀释显著的局部问题。红色差异图仅表示任一 RGB 通道相差超过 16。</small></p></section>
<section id="routesView" hidden><div class="toolbar"><label>语言 <select id="lang"><option value="zh">中文</option><option value="en">English</option></select></label><label>屏宽 <select id="width"><option value="360">360px 手机</option><option value="1440">1440px 桌面</option></select></label></div><p class="notice">这些页面已实际加载并截图。英文、移动端、其他公司详情、团队个人页及文章详情没有独立 Figma 验收稿，截图用于检查布局与内容，不能据此认定像素还原通过。桌面缩略图缩为 720px 宽。</p><div id="routeGrid" class="route-grid"></div></section></main>
<script>const frames=${JSON.stringify(items).replaceAll('<', '\\u003c')};const routes=${JSON.stringify(routes.results).replaceAll('<', '\\u003c')};const el=id=>document.getElementById(id);for(const f of frames){const o=document.createElement('option');o.value=f.id;o.textContent=f.id+' · '+f.title;el('frame').append(o)}function imagePane(src,label,w){const p=document.createElement('div');p.className='pane';const title=document.createElement('p');title.textContent=label;const img=document.createElement('img');img.src=src;img.alt=label;img.style.width=w+'px';p.append(title,img);return p}function draw(){const f=frames.find(x=>x.id===el('frame').value),v=el('version').value,mode=el('mode').value,z=Number(el('zoom').value),c=el('canvas');c.replaceChildren();c.className='canvas '+(mode==='overlay'?'overlay':'');c.style.setProperty('--alpha',el('alpha').value/100);el('note').textContent=f.note;const m=f.metric;el('metrics').textContent=m?'原稿 '+m.reference.join(' × ')+'；网页 '+m.actual.join(' × ')+'。修正后任意差异像素 '+m.differentPixelPercent.toFixed(3)+'%；通道差 >16：'+m.over16PixelPercent.toFixed(3)+'%；平均通道差 '+m.meanAbsoluteChannelDifference.toFixed(3)+' / 255。':'原稿 '+f.width+' × '+f.height+'；当前没有可对应截图，未纳入像素测量。';if(mode==='diff'&&m){c.append(imagePane('diff/'+f.id+'.png','修正后差异图',f.width*z));return}c.append(imagePane('reference/'+f.id+'.png','Figma · '+f.id,f.width*z));if(m){const p=imagePane(v+'/'+f.id+'.png',v==='after'?'网页 · 修正后':'网页 · 修正前',f.width*z);p.classList.add('actual');c.append(p)}else{const p=document.createElement('p');p.className='missing';p.textContent='无对应实现／备选状态，等待确认';c.append(p)}}for(const id of ['frame','version','mode','zoom','alpha'])el(id).addEventListener('input',draw);function drawRoutes(){const g=el('routeGrid');g.replaceChildren();for(const r of routes.filter(x=>x.width===Number(el('width').value)&&x.route.startsWith(el('lang').value+'/'))){const card=document.createElement('article'),h=document.createElement('h3'),a=document.createElement('a'),img=document.createElement('img'),s=document.createElement('small');h.textContent=r.route;a.href=r.thumbnail;a.target='_blank';img.src=r.thumbnail;img.alt=r.route;img.loading='lazy';a.append(img);s.textContent='HTTP '+r.status+' · '+r.width+'px · 高 '+r.height+'px · 横向溢出 '+r.overflow;card.append(h,a,s);g.append(card)}}for(const id of ['lang','width'])el(id).addEventListener('change',drawRoutes);for(const [button,other,view,otherView] of [['framesTab','routesTab','framesView','routesView'],['routesTab','framesTab','routesView','framesView']])el(button).onclick=()=>{el(button).setAttribute('aria-pressed','true');el(other).setAttribute('aria-pressed','false');el(view).hidden=false;el(otherView).hidden=true;if(view==='routesView')drawRoutes()};draw();</script></html>`,
);
console.log('Built native-pixel comparison gallery.');
