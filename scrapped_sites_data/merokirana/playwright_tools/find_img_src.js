#!/usr/bin/env node
// Map actionName -> response; report any response that contains KiranaProduct image URLs.
const path = require('path');
const { chromium } = require('playwright');
const PROFILE_DIR = path.join(__dirname, 'profile');
const HOME = 'https://www.merokirana.com/';

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { channel: 'chrome', headless: true });
  const page = await ctx.newPage();

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('semantro') && (res.headers()['content-type'] || '').includes('json')) {
      try {
        const text = await res.text();
        if (text.includes('KiranaProduct') && /cdn\.merokirana\.com|contentUrl|archive/.test(text)) {
          console.log('=== RESPONSE with image hint ===');
          console.log('action:', await res.request().postData());
          console.log(text.slice(0, 1200));
          console.log('==================\n');
        }
      } catch (e) {}
    }
  });

  await page.goto(HOME, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500);
  await ctx.close();
})();
