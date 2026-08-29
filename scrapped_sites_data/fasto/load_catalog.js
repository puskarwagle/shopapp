#!/usr/bin/env node
// Load all products from fasto_products.json into Supabase product_catalog
// using the Management API SQL endpoint (PAT grants privileged role, bypasses RLS).

const fs = require('fs');
const https = require('https');
const path = require('path');

const PROJECT_REF = 'bvjumsiwjigbcemzejkf';
const TOKEN = '';
const CHUNK = 200;

const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fasto_products.json'), 'utf8')
);

const escape = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const num = (n) => (n == null ? 'NULL' : Number(n));

function postQuery(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const req = https.request(
      {
        hostname: 'api.supabase.com',
        path: `/v1/projects/${PROJECT_REF}/database/query`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error(`${res.statusCode}: ${data}`));
          try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`Truncating product_catalog...`);
  await postQuery('TRUNCATE product_catalog;');

  const cols = '(id, name, price, marked_price, discount_percent, category, subcategory, image_url, brand, source)';
  let inserted = 0;
  for (let i = 0; i < products.length; i += CHUNK) {
    const slice = products.slice(i, i + CHUNK);
    const rows = slice
      .map(
        (p) =>
          `(${escape(p.id)}, ${escape(p.name)}, ${num(p.price)}, ${num(p.marked_price)}, ${num(
            p.discount_percent
          )}, ${escape(p.category)}, ${escape(p.subcategory)}, ${escape(p.imageUrl)}, ${escape(
            p.brand
          )}, 'fasto')`
      )
      .join(',\n');
    const sql = `INSERT INTO product_catalog ${cols} VALUES\n${rows};`;
    await postQuery(sql);
    inserted += slice.length;
    console.log(`Inserted ${inserted}/${products.length}`);
  }

  const res = await postQuery('SELECT count(*) AS n FROM product_catalog;');
  console.log('Final count:', JSON.stringify(res));
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
