#!/usr/bin/env node
// Populate image_url in product_catalog for merokirana rows.
// Reads image_url from merokirana_products.json (enriched by extract_images.js)
// and updates the matching row by id via the Management API (PAT / superuser,
// bypasses the admin-write RLS). Safe to re-run: idempotent per row.

const fs = require('fs');
const https = require('https');
const path = require('path');

const PROJECT_REF = 'bvjumsiwjigbcemzejkf';
const TOKEN = process.env.SUPABASE_PAT || process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('Set SUPABASE_PAT (or SUPABASE_ACCESS_TOKEN) env var');
  process.exit(1);
}
const CHUNK = 200;

const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'merokirana_products.json'), 'utf8')
);

const updates = products.filter((p) => p.image_url);
console.log(`Products with image_url: ${updates.length}/${products.length}`);

function escape(s) {
  return s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
}

function postQuery(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`${res.statusCode}: ${data}`));
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  let updated = 0;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const slice = updates.slice(i, i + CHUNK);
    const cases = slice
      .map((p, j) => `WHEN '${p.id}' THEN ${escape(p.image_url)}`)
      .join('\n');
    const sql =
      `UPDATE product_catalog SET image_url = CASE id ` +
      cases +
      ` END ` +
      `WHERE id IN (${slice.map((p) => `'${p.id}'`).join(',')}) AND source = 'merokirana';`;
    try {
      await postQuery(sql);
      updated += slice.length;
      console.log(`Updated ${updated}/${updates.length}`);
    } catch (e) {
      console.error(`Chunk failed at ${i}: ${e.message}`);
      throw e;
    }
  }

  const res = await postQuery(
    `SELECT count(*) FILTER (WHERE image_url IS NOT NULL) AS has_img, count(*) AS total FROM product_catalog WHERE source='merokirana';`
  );
  console.log('\nDB after update:', JSON.stringify(res));
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
