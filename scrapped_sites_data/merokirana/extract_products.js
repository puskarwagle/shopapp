#!/usr/bin/env node
// MeroKirana product extractor (no-auth path).
// Uses the discovered Semantro query endpoint:
//   POST /semantro-web-interface/query  (multipart/form-data, field "data" = JSON action)
// Docs/learnings: see NOTES.md in this folder.

const fs = require('fs');
const path = require('path');

const BASE = 'https://www.merokirana.com';
const QUERY_URL = `${BASE}/semantro-web-interface/query`;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const REF = 'https://www.merokirana.com/';

// Node 18+ has global fetch + FormData.
const FD = typeof FormData !== 'undefined' ? FormData : require('form-data');

async function query(actionName, data = {}, pageLimit) {
  const action = { '@context': 'http://semantro.com', '@type': 'KiranaSearch', actionName };
  if (Object.keys(data).length) action.data = data;
  if (pageLimit) action.pageLimit = { '@context': 'http://semantro.com/', '@type': 'PageProperty', ...pageLimit };

  const fd = new FD();
  fd.append('data', JSON.stringify(action));

  const res = await fetch(QUERY_URL, {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: REF },
    body: fd,
  });
  return res.json();
}

const uniq = (arr, key) => {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = x[key];
    if (k == null || seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
};

async function getCategories() {
  const base = await query('listBaseCategories');
  const cats = (base.itemListElement || []).map((c) => ({
    identifier: c.identifier,
    name: c.categoryName,
    image: c.contentUrl || null,
  }));
  // pull child categories for each base category
  for (const cat of cats) {
    try {
      const kids = await query('listChildCategories', { '@context': 'http://semantro.com/', '@type': 'KiranaCategory', identifier: cat.identifier });
      const children = (kids.itemListElement || []).map((c) => ({
        identifier: c.identifier,
        name: c.categoryName,
        parent: cat.name,
        image: c.contentUrl || null,
      }));
      cat.children = children;
    } catch (e) {
      cat.children = [];
    }
  }
  return cats;
}

async function getProductsForCategory(identifier, name, parent) {
  const PAGE = 100;
  const out = [];
  for (let start = 0; ; start += PAGE) {
    const res = await query(
      'listCategoryProducts',
      { '@context': 'http://semantro.com/', '@type': 'KiranaCategory', identifier },
      { start, end: start + PAGE - 1 }
    );
    const items = res.itemListElement || [];
    for (const p of items) {
      let price = null;
      let currency = null;
      try {
        const d = await query('getProductData', { '@context': 'http://semantro.com/', '@type': 'KiranaProduct', identifier: p.identifier });
        price = d.price ?? null;
        currency = d.priceCurrency || null;
      } catch (e) {}
      out.push({
        id: p.productID,
        identifier: p.identifier,
        name: p.productName,
        brand: p.brandName || null,
        category: name,
        parentCategory: parent || null,
        price,
        currency: currency || 'NRs.',
        available: p.available === 'http://schema.org/InStock',
        maxQuantity: p.maxQuantity ?? null,
      });
    }
    if (items.length < PAGE) break;
  }
  return out;
}

async function main() {
  console.log('Fetching category tree...');
  const cats = await getCategories();
  const leaves = [];
  for (const c of cats) {
    leaves.push({ identifier: c.identifier, name: c.name, parent: null });
    for (const k of c.children || []) leaves.push({ identifier: k.identifier, name: k.name, parent: c.name });
  }
  console.log(`Categories: ${cats.length} base, ${leaves.length} leaf nodes`);

  const all = [];
  for (const leaf of leaves) {
    const prods = await getProductsForCategory(leaf.identifier, leaf.name, leaf.parent);
    console.log(`  ${leaf.name}: ${prods.length} products`);
    all.push(...prods);
  }

  const deduped = uniq(all, 'id');
  console.log(`Total products (deduped): ${deduped.length}`);
  fs.writeFileSync(path.join(__dirname, 'merokirana_products.json'), JSON.stringify(deduped, null, 2));
  console.log('Wrote merokirana_products.json');
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
