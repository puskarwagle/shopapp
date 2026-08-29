#!/usr/bin/env node
// Intercept actual query POST bodies the live site makes, so we learn exactly
// which actions return product image URLs.
const path = require('path');
const { chromium } = require('playwright');

const PROFILE_DIR = path.join(__dirname, 'profile');
const HOME = 'https://www.merokirana.com/';

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { channel: 'chrome', headless: true });
  const page = await ctx.newPage();
  page.on('request', (req) => {
    if (req.url().includes('/semantro-web-interface/query')) {
      try {
        const d = req.postData() || '';
        const m = d.match(/data=(.+)$/);
        if (m) {
          const json = decodeURIComponent(m[1]);
          const obj = JSON.parse(json);
          console.log('Q:', obj.actionName);
        }
      } catch (e) {}
    }
  });
  await page.goto(HOME, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  await ctx.close();
})();
