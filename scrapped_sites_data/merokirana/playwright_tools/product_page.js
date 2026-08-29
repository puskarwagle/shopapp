#!/usr/bin/env node
const path = require('path');
const { chromium } = require('playwright');
const PROFILE_DIR = path.join(__dirname, 'profile');
const HOME = 'https://www.merokirana.com/';
(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { channel: 'chrome', headless: true });
  const page = await ctx.newPage();
  await page.goto(HOME, { waitUntil: 'networkidle' }).catch((e) => console.log('g1', e.message));
  await page.waitForTimeout(2000);
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).map(a=>a.href).filter(h=>/\/product\//i.test(h))
      .filter((h,i,arr)=>arr.indexOf(h)===i).slice(0,8));
  console.log('product links:', links);
  if (links.length) {
    const first = links[0];
    console.log('\nOpening:', first);
    const imgs = [];
    page.on('response', async (res) => {
      if ((res.headers()['content-type']||'').includes('json') && res.url().includes('semantro')) {
        try { const t = await res.text(); if(/cdn|contentUrl|image/i.test(t)) console.log('RES-json', res.url().slice(0,60), t.slice(0,300).replace(/\n/g,' ')); } catch(e){}
      }
    });
    await page.goto(first, { waitUntil: 'networkidle' }).catch((e)=>console.log('g2', e.message));
    await page.waitForTimeout(2500);
    const dom = await page.evaluate(()=>Array.from(document.querySelectorAll('img')).map(i=>({src:i.src?.slice(0,160),alt:i.alt?.slice(0,50)})));
    console.log('\nDOM imgs on product page:');
    dom.slice(0,20).forEach(d=>console.log('  ', d.src, '|', d.alt));
    console.log('\nURL now:', page.url());
  }
  await ctx.close();
})();
