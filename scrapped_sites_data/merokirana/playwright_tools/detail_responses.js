#!/usr/bin/env node
// On a product detail page, log every semantro query response + its actionName,
// and flag any that contains the KiranaProduct CDN URL.
const path = require('path');
const { chromium } = require('playwright');
const PROFILE_DIR = path.join(__dirname, 'profile');
const DETAIL = 'https://www.merokirana.com/#/detail/0e91b1b3aa834511-8c6a12cff3991737/Royal-Toilet-Tissue-Paper-Roll-2Ply-200-Pulls-1-Roll.html';

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { channel: 'chrome', headless: true });
  const page = await ctx.newPage();
  page.on('response', async (res) => {
    if (!res.url().includes('semantro')) return;
    if (!(res.headers()['content-type']||'').includes('json')) return;
    try {
      const t = await res.text();
      const am = t.match(/"actionName"\s*:\s*"([^"]+)"/);
      const hasImg = /cdn\.merokirana\.com\/archive\/KiranaProduct/.test(t);
      const hasCU = /"contentUrl"\s*:\s*"[^"]+"/.test(t);
      console.log((hasImg?'[IMAGE] ':(hasCU?'[CU] ':'     ')) + 'len=' + t.length
        + (am?(' action='+am[1]):'')
        + (hasImg?(' img='+(t.match(/cdn\.merokirana\.com\/archive\/KiranaProduct\/[a-f0-9]+\.jpg/)||[''])[0]):''));
    } catch(e) {}
  });
  await page.goto(DETAIL, { waitUntil: 'domcontentloaded' }).catch(()=>{});
  await page.waitForTimeout(4500);
  await ctx.close();
})();
