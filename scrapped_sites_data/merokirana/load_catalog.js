#!/usr/bin/env node
// Load scrapped_sites_data/merokirana/merokirana_products.json into the
// Supabase `product_catalog` table (source = 'merokirana').
// Runs via the Management API SQL endpoint (PAT -> privileged role, bypasses RLS).
// Token is read from env SUPABASE_PAT (kept out of this file).

const fs = require('fs');
const https = require('https');
const path = require('path');

const PROJECT_REF = 'bvjumsiwjigbcemzejkf';
const TOKEN = process.env.SUPABASE_PAT;
const CHUNK = 200;

if (!TOKEN) {
  console.error('Set SUPABASE_PAT env var');
  process.exit(1);
}

const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'merokirana_products.json'), 'utf8')
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
  const cols = '(id, name, price, marked_price, discount_percent, category, subcategory, image_url, brand, source)';
  let inserted = 0;
  for (let i = 0; i < products.length; i += CHUNK) {
    const slice = products.slice(i, i + CHUNK);
    const rows = slice
      .map((p) => {
        const category = p.parentCategory || p.category || null;
        const subcategory = p.category || null;
        return `(${escape(p.id)}, ${escape(p.name)}, ${num(p.price)}, NULL, 0, ${escape(
          category
        )}, ${escape(subcategory)}, NULL, ${escape(p.brand)}, 'merokirana')`;
      })
      .join(',\n');
    const sql = `INSERT INTO product_catalog ${cols} VALUES\n${rows}\nON CONFLICT (id) DO UPDATE SET\n  name = EXCLUDED.name,\n  price = EXCLUDED.price,\n  category = EXCLUDED.category,\n  subcategory = EXCLUDED.subcategory,\n  brand = EXCLUDED.brand,\n  source = EXCLUDED.source;`;
    await postQuery(sql);
    inserted += slice.length;
    console.log(`Inserted ${inserted}/${products.length}`);
  }
  const res = await postQuery(
    "SELECT source, count(*) AS n FROM product_catalog GROUP BY source ORDER BY source;"
  );
  console.log('Catalog by source:', JSON.stringify(res));
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
