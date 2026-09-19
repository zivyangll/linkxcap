// Lab measurements only: Chromium desktop CPU emulation is not a real handset.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:4321/linkxcap/';
const browser = await chromium.launch();
const results = [];
for (const route of ['zh/index.html', 'en/index.html', 'zh/portfolio.html'])
  for (let run = 1; run <= 3; run++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__lab = { lcp: 0, cls: 0, longTasks: [], events: [] };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__lab.lcp = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      let start = 0,
        last = 0,
        sum = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          if (e.startTime - last > 1000 || e.startTime - start > 5000) {
            start = e.startTime;
            sum = 0;
          }
          sum += e.value;
          last = e.startTime;
          window.__lab.cls = Math.max(window.__lab.cls, sum);
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        window.__lab.longTasks.push(
          ...list.getEntries().map((e) => e.duration),
        );
      }).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver((list) => {
        window.__lab.events.push(
          ...list
            .getEntries()
            .filter((e) => e.interactionId)
            .map((e) => e.duration),
        );
      }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    });
    await page.goto(origin + route);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const initial = await page.evaluate(() => ({
      ...window.__lab,
      resources: performance
        .getEntriesByType('resource')
        .map((e) => ({
          name: e.name,
          bytes: e.encodedBodySize,
          start: e.startTime,
          end: e.responseEnd,
        })),
      html: performance.getEntriesByType('navigation')[0].encodedBodySize,
    }));
    await page.locator('[data-menu-open]').click();
    await page.locator('[data-menu-close]').click();
    await page.waitForTimeout(350);
    const interaction = await page.evaluate(() =>
      Math.max(0, ...window.__lab.events),
    );
    const entry = {
      route,
      run,
      lcpMs: Math.round(initial.lcp),
      cls: initial.cls,
      initialBytes:
        initial.html + initial.resources.reduce((n, x) => n + x.bytes, 0),
      fontBytes: initial.resources
        .filter((x) => new URL(x.name).pathname.endsWith('.woff2'))
        .reduce((n, x) => n + x.bytes, 0),
      longTasks: initial.longTasks.map(Math.round),
      scriptedInteractionMaxMs: interaction,
    };
    results.push(entry);
    console.log(JSON.stringify(entry));
    await context.close();
  }
await browser.close();
await fs.mkdir('.cache', { recursive: true });
await fs.writeFile(
  '.cache/performance-report.json',
  JSON.stringify(
    {
      conditions: {
        viewport: '390×844',
        network: '1.6 Mbps down / 750 Kbps up / 150 ms RTT',
        cpu: '4× Chromium CPU slowdown',
        cache: 'fresh browser context, cache disabled',
        origin,
      },
      results,
    },
    null,
    2,
  ),
);
