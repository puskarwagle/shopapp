#!/usr/bin/env node
const path = require('path');
const { chromium } = require('playwright');
const PROFILE_DIR = path.join(__dirname, 'profile');
const HOME = 'https://www.merokirana.com/';
(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { channel: 'chrome', headless: true });
  const page = await ctx.newPage();
  page.on('request', (req) => {
    if (req.url().includes('/semantro-web-interface/query')) {
      console.log('CT:', req.headers()['content-type']);
      console.log('BODY:', (req.postData() || '').slice(0, 400));
      console.log('---');
    }
  });
  await page.goto(HOME, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  await ctx.close();
})();
