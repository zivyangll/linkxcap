import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const directory = 'docs/verification/meeting-revision';
const base = process.env.QA_ORIGIN || 'http://127.0.0.1:4321/linkxcap/';
await fs.mkdir(directory,{recursive:true});
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const evidence=[];
async function visit(route) {await page.goto(base+route);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);}
async function capture(name,fullPage=false) {await page.screenshot({path:`${directory}/${name}.png`,fullPage});evidence.push({name,url:page.url(),viewport:page.viewportSize(),scroll:await page.evaluate(()=>scrollY)});}
async function progress(selector,amount) {
 const y=await page.locator(selector).evaluate((el,amount)=>{const parent=el.parentElement;const pinned=parent.classList.contains('pin-spacer');const rect=(pinned ? parent : el).getBoundingClientRect();return rect.top+scrollY+(pinned ? (parent.offsetHeight-el.offsetHeight)*amount : 0);},amount);
 await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(800);
}
await visit('zh/index.html');
await progress('.opening',.65);await capture('home-01-opening');
await progress('.hero',.6);await capture('home-02-hero');
await progress('.about',.75);await capture('home-03-about');
await progress('.research',.9);await capture('home-04-research');
await progress('.focus',0);await page.locator('[data-sector=physical]').hover();await capture('home-05-topology');
await visit('zh/portfolio.html');await page.locator('[data-slug=zhipu-ai]').hover();await capture('portfolio-desktop',true);
await visit('zh/portfolio/zhipu-ai.html');await capture('portfolio-zhipu-ai-desktop');
await page.locator('[data-company-link=mosi]').click();await page.waitForTimeout(350);await capture('portfolio-mosi-desktop');
await visit('zh/team.html');await page.locator('[data-person=elliot]').hover();await capture('team-desktop');
await visit('zh/contact.html');
await progress('.fellow-intro',.34);await capture('contact-desktop');
await progress('.fellow-intro',.95);await capture('fellow-introduction-desktop');
await progress('.fellow-media-section',0);await capture('fellow-small-desktop');
await progress('.fellow-media-section',.96);await capture('fellow-expanded-desktop');
await progress('.contact-hero',0);await capture('join-desktop');
await visit('zh/insights.html');await capture('insights-desktop');
await page.locator('.insight-row h2 a').first().click();await page.evaluate(()=>document.fonts.ready);await capture('article-desktop');
for(const lang of ['zh','en']) {
 await page.setViewportSize({width:390,height:844});
 for(const route of ['index','portfolio','portfolio/mosi','team','contact','insights']) {
   await visit(`${lang}/${route}.html`);
   if(route==='team')await page.locator('[data-person=wenjue]').click();
   await capture(`${lang}-${route.replaceAll('/','-')}-mobile`,route!=='index');
 }
}
await browser.close();
await fs.writeFile(`${directory}/capture-log.json`,JSON.stringify({base,errors,evidence},null,2));
if(errors.length)throw new Error(errors.join('\n'));
console.log(`Captured ${evidence.length} motion states and responsive views.`);
