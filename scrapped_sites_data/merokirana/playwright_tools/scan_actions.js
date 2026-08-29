#!/usr/bin/env node
// Correlate query actionName -> full response, then find which actions return
// product contentUrl (image).
const path = require('path');
const { chromium } = require('playwright');
const PROFILE_DIR = path.join(__dirname, 'profile');
const HOME = 'https://www.merokirana.com/';

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { channel: 'chrome', headless: true });
  const page = await ctx.newPage();

  let pending = new Map(); // key -> {actionName}
  let seq = 0;

  page.on('request', (req) => {
    if (req.url().includes('/semantro-web-interface/query')) {
      const body = req.postData() || '';
      const m = body.match(/"actionName":"([^"]+)"/);
      const actionName = m ? m[1] : '?';
      const key = 'req' + (++seq);
      pending.set(key, { actionName, fn: req.frame().url().slice(0, 150) });
    }
  });
  page.on('requestfinished', async (req) => {
    if (req.url().includes('/semantro-web-interface/query')) {
      // match by url+order best-effort: just log response independently
    }
  });

  // Simpler: after load, re-run known list actions directly and inspect
  await page.goto(HOME, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500);
  const auth = await page.evaluate(() => localStorage.getItem('customer_authCode') || '');

  const actions = ['listLatestProducts','listFeaturedProducts','listTopProducts','listPopularList',
    'listDefaultProducts','getRecommendedList','listLProducts','listMatchingProducts','listKiranaListProducts',
    'searchProducts','listAllCollectionProducts'];
  for (const a of actions) {
    const res = await page.evaluate(async ({ a, auth }) => {
      const action = { '@context': 'http://semantro.com', '@type': 'KiranaSearch', actionName: a,
        pageLimit: { '@context': 'http://semantro.com/', '@type': 'PageProperty', start: 0, end: 3 } };
      const fd = new FormData();
      fd.append('data', JSON.stringify(action));
      const h = {}; if (auth) h.accessToken = auth;
      const r = await fetch('https://www.merokirana.com/semantro-web-interface/query', { method: 'POST', headers: h, body: fd });
      return { status: r.status, text: await r.text() };
    }, { a, auth });
    const hasCU = /contentUrl/.test(res.text);
    const sample = (res.text.match(/"contentUrl"\s*:\s*"[^"]{0,90}/g) || []).slice(0, 3);
    console.log(`${res.status} ${a}\tcontentUrl=${hasCU} ${sample.join(' | ')}`);
  }
  await ctx.close();
})();
