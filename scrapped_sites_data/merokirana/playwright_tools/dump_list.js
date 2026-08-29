#!/usr/bin/env node
// Dump the FULL raw JSON of listCategoryProducts (and a few other list actions)
// so we can see whether any field carries a product image reference.
// Usage: node dump_list.js <category-identifier>

const path = require('path');
const { chromium } = require('playwright');

const PROFILE_DIR = path.join(__dirname, 'profile');
const HOME = 'https://www.merokirana.com/';
const QUERY_URL = 'https://www.merokirana.com/semantro-web-interface/query';

const CAT = process.argv[2] || '3f70dfcb9e41d142-2a0c9a1a52e2ab4f'; // fallback guess

async function q(page, auth, actionName, data = {}, pageLimit) {
  return page.evaluate(async ({ QUERY_URL, auth, actionName, data, pageLimit }) => {
    const action = { '@context': 'http://semantro.com', '@type': 'KiranaSearch', actionName };
    if (data && Object.keys(data).length) action.data = data;
    if (pageLimit) action.pageLimit = { '@context': 'http://semantro.com/', '@type': 'PageProperty', ...pageLimit };
    const fd = new FormData();
    fd.append('data', JSON.stringify(action));
    const h = {};
    if (auth) h.accessToken = auth;
    const r = await fetch(QUERY_URL, { method: 'POST', headers: h, body: fd });
    return { status: r.status, text: await r.text() };
  }, { QUERY_URL, auth, actionName, data, pageLimit });
}

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { channel: 'chrome', headless: true });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(HOME, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(1500);
  const auth = await page.evaluate(() => localStorage.getItem('customer_authCode') || '');

  // 1. listBaseCategories
  const base = await q(page, auth, 'listBaseCategories');
  const b = JSON.parse(base.text);
  console.log('=== listBaseCategories ===');
  console.log(JSON.stringify(b.itemListElement && b.itemListElement[0], null, 2));

  // 2. pick the first category that has children and dump its listCategoryProducts fully
  const cat = b.itemListElement[0];
  if (cat) {
    console.log('\n=== listCategoryProducts for base cat:', cat.categoryName, '===');
    const list = await q(page, auth, 'listCategoryProducts',
      { '@context': 'http://semantro.com/', '@type': 'KiranaCategory', identifier: cat.identifier },
      { start: 0, end: 4 });
    console.log('HTTP', list.status);
    console.log(list.text.slice(0, 6000));
  }

  await ctx.close();
})();
