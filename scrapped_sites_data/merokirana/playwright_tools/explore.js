#!/usr/bin/env node
// Explore a real MeroKirana product page and capture the network traffic that
// loads its images, so we can learn the exact endpoint/URL pattern for images.
//
// Usage:
//   node explore.js <url>      open a given product URL (or category), log image/img requests
//   node explore.js            default: search & open first product via the site

const path = require('path');
const { chromium } = require('playwright');

const PROFILE_DIR = path.join(__dirname, 'profile');
const HOME = 'https://www.merokirana.com/';

const TARGET = process.argv[2];

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: true,
  });
  const page = await ctx.newPage();

  // Log every request whose URL looks like an image / product asset
  page.on('request', (req) => {
    const u = req.url();
    if (/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(u) || /(image|img|cdn)/i.test(u)) {
      console.log('IMG-REQ', u.slice(0, 220));
    }
  });
  page.on('response', (res) => {
    const u = res.url();
    if (/(listProductImages|getProductData|getProductDetail|query)/i.test(u) || /KiranaProduct/i.test(u)) {
      console.log('API-RES', res.status(), u.slice(0, 200));
    }
  });

  if (TARGET) {
    console.log('Opening:', TARGET);
    await page.goto(TARGET, { waitUntil: 'networkidle' }).catch((e) => console.log('goto err', e.message));
  } else {
    // Fallback: go home, grab first product link from a category
    await page.goto(HOME, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(4000);
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href*="/product"]'))
        .map((a) => a.href)
        .filter((h, i, arr) => arr.indexOf(h) === i)
        .slice(0, 5)
    );
    console.log('Found product links:', links);
    if (links.length) {
      console.log('Opening first product...');
      await page.goto(links[0], { waitUntil: 'networkidle' }).catch((e) => console.log('goto2 err', e.message));
    }
  }

  await page.waitForTimeout(4000);

  // Also dump window-level images found in the DOM
  const imgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).map((i) => ({ src: i.src?.slice(0, 240), alt: i.alt?.slice(0, 60) }))
  );
  console.log('\nDOM <img> tags on page:');
  imgs.slice(0, 25).forEach((i) => console.log('  ', i.src || '(none)', '|', i.alt));

  // Dump localStorage auth header we can reuse
  const auth = await page.evaluate(() => (localStorage.getItem('customer_authCode') || '').slice(0, 20));
  console.log('\nauth (first 20):', auth, auth ? '...' : '(none)');

  await ctx.close();
})();
