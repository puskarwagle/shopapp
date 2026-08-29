#!/usr/bin/env node
// Reuse the saved browser session (./profile) and run authenticated Semantro
// calls, sending the accessToken header read from localStorage. Prints raw
// responses for the image/info endpoints.
//
// Usage: node probe.js [productId-index]

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const PROFILE_DIR = path.join(__dirname, 'profile');
const HOME = 'https://www.merokirana.com/';
const QUERY_URL = 'https://www.merokirana.com/semantro-web-interface/query';

const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'merokirana_products.json'), 'utf8')
);
const idx = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
const p = products[idx];

async function runQueryInPage(page, accessToken, actionName, data = {}, pageLimit) {
  return page.evaluate(async ({ QUERY_URL, accessToken, actionName, data, pageLimit }) => {
    const action = { '@context': 'http://semantro.com', '@type': 'KiranaSearch', actionName };
    if (data && Object.keys(data).length) action.data = data;
    if (pageLimit) action.pageLimit = { '@context': 'http://semantro.com/', '@type': 'PageProperty', ...pageLimit };
    const fd = new FormData();
    fd.append('data', JSON.stringify(action));
    const headers = {};
    if (accessToken) headers.accessToken = accessToken;
    const res = await fetch(QUERY_URL, { method: 'POST', headers, body: fd });
    const text = await res.text();
    return { status: res.status, text: text.slice(0, 4000) };
  }, { QUERY_URL, accessToken, actionName, data, pageLimit });
}

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: true,
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(HOME, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2000);

  const ls = await page.evaluate(() => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      o[k] = (localStorage.getItem(k) || '').slice(0, 800);
    }
    return o;
  });
  const auth = ls.customer_authCode || '';
  console.log('customer_authCode:', auth ? auth.slice(0, 60) + '...' : '(empty)');
  console.log('localStorage keys:', Object.keys(ls).join(', '));

  const ident = p.identifier;
  console.log('\nProbing product:', p.name, '\n  identifier:', ident, '\n  id:', p.id);

  for (const [label, action, data] of [
    ['getProductDetailById (+token)', 'getProductDetailById', { '@context': 'http://semantro.com/', '@type': 'KiranaProduct', identifier: ident }],
    ['getProductData (+token)', 'getProductData', { '@context': 'http://semantro.com/', '@type': 'KiranaProduct', identifier: ident }],
    ['listProductImages (+token)', 'listProductImages', { '@context': 'http://semantro.com/', '@type': 'KiranaProduct', identifier: ident }],
  ]) {
    try {
      const r = await runQueryInPage(page, auth, action, data);
      console.log(`\n===== ${label} (HTTP ${r.status}) =====`);
      console.log(r.text);
    } catch (e) {
      console.log(`\n===== ${label} ERROR =====`, e.message);
    }
  }

  await ctx.close();
})();
