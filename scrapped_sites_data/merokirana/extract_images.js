#!/usr/bin/env node
// Enrich merokirana_products.json with an image_url per product by calling the
// public getMainImageProduct query action (no auth needed):
//   POST /semantro-web-interface/query  (multipart/form-data, field "data")
// Writes back image_url (or null) to each record. Resumable & rate-limited.

const fs = require('fs');
const path = require('path');

const BASE = 'https://www.merokirana.com';
const QUERY_URL = `${BASE}/semantro-web-interface/query`;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const FILE = path.join(__dirname, 'merokirana_products.json');

// Concurrency / pace
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);
const DELAY_MS = Number(process.env.DELAY_MS || 150);   // base delay between requests
const MIN_DETAILS = 0;
const LIMIT = Number(process.env.LIMIT || 0); // >0: only process first N pending

const FD = typeof FormData !== 'undefined' ? FormData : require('form-data');

async function mainImage(identifier, productName) {
  const action = {
    '@context': 'http://semantro.com',
    '@type': 'KiranaSearch',
    actionName: 'getMainImageProduct',
    data: {
      '@context': 'http://semantro.com/',
      '@type': 'KiranaProduct',
      identifier,
      ...(productName ? { productName } : {}),
    },
  };
  const fd = new FD();
  fd.append('data', JSON.stringify(action));
  const res = await fetch(QUERY_URL, {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: `${BASE}/` },
    body: fd,
  });
  const j = await res.json();
  return j.contentUrl || null;
}

// Exponential backoff retry
async function fetchWithRetry(p, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      return await p();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 800 * Math.pow(2, i)));
    }
  }
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

(async () => {
  const products = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const todo = products.filter((p) => p.image_url === undefined || p.image_url === null);
  console.log(`Total ${products.length} | already done: ${products.length - todo.length} | todo: ${todo.length}`);
  if (!todo.length) { console.log('Nothing to do.'); return; }

  const pending = [...todo];
  const limited = LIMIT > 0 ? pending.slice(0, LIMIT) : pending;
  let done = 0;
  let withImg = 0;
  let next = 0;
  const results = new Map();
  let todoCount = limited.length;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= limited.length) break;
      const p = limited[i];
      let url = null;
      try {
        url = await fetchWithRetry(() => mainImage(p.identifier, p.name));
      } catch (e) {
        console.error(`  [${i + 1}/${todoCount}] ERR ${p.id} ${p.name}: ${e.message}`);
      }
      results.set(p.id, url);
      done++;
      if (url) withImg++;
      if (done % 25 === 0 || done === todoCount) {
        applyAndSave();
        console.log(`  progress ${done}/${todoCount} (${withImg} with image)`);
      }
      await sleep(DELAY_MS);
    }
  }

  // Mutate + save occasionally so a crash doesn't lose everything
  function applyAndSave() {
    for (let i = 0; i < products.length; i++) {
      const r = results.get(products[i].id);
      if (r !== undefined) products[i].image_url = r;
    }
    fs.writeFileSync(FILE, JSON.stringify(products, null, 2));
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  applyAndSave();
  console.log(`\nDone. ${withImg}/${todoCount} got an image_url.  Total records now: ${products.length}`);
})();