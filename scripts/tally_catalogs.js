#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'scrapped_sites_data');
const PAT = process.env.SUPABASE_PAT;
if (!PAT) {
  console.error('Set SUPABASE_PAT env var');
  process.exit(1);
}
const API = 'https://api.supabase.com/v1/projects/bvjumsiwjigbcemzejkf/database/query';

function runSQL(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const req = https.request(API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error(`Parse error: ${body.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // --- Load local JSONs ---
  const fasto = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'fasto', 'fasto_products.json'), 'utf-8'));
  const mero  = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'merokirana', 'merokirana_products.json'), 'utf-8'));

  console.log('=== LOCAL DATA ===');
  console.log(`Fasto: ${fasto.length} products`);
  console.log(`Mero:  ${mero.length} products`);

  const fastoIds = new Set(fasto.map(p => String(p.id)));
  const meroIds  = new Set(mero.map(p => String(p.id)));
  const overlapIds = [...fastoIds].filter(id => meroIds.has(id));
  console.log(`Overlap (same ID): ${overlapIds.length}`);
  console.log(`Union (distinct IDs): ${fastoIds.size + meroIds.size - overlapIds.length}`);

  // --- Query live DB ---
  console.log('\n=== LIVE Supabase product_catalog ===');
  const dbRows = await runSQL('SELECT id, source, name FROM product_catalog ORDER BY id LIMIT 5');
  console.log('Sample rows:', JSON.stringify(dbRows, null, 2));

  const dbCount = await runSQL('SELECT count(*) AS n FROM product_catalog');
  const dbSources = await runSQL('SELECT source, count(*) AS n FROM product_catalog GROUP BY source');
  console.log('Total:', dbCount[0]?.n);
  console.log('By source:', JSON.stringify(dbSources));

  const dbIds = new Set((await runSQL('SELECT id FROM product_catalog')).map(r => r.id));
  console.log(`DB has ${dbIds.size} distinct IDs`);

  // --- Cross-tally ---
  const fastoInDb = [...fastoIds].filter(id => dbIds.has(id)).length;
  const fastoNotInDb = fastoIds.size - fastoInDb;
  const meroInDb = [...meroIds].filter(id => dbIds.has(id)).length;
  const meroNotInDb = meroIds.size - meroInDb;
  const dbNotInLocal = [...dbIds].filter(id => !fastoIds.has(id) && !meroIds.has(id));

  console.log('\n=== CROSS-TALLY ===');
  console.log(`Fasto in DB: ${fastoInDb}/${fastoIds.size} | Fasto NOT in DB: ${fastoNotInDb}`);
  console.log(`Mero in DB:  ${meroInDb}/${meroIds.size} | Mero NOT in DB: ${meroNotInDb}`);
  console.log(`DB IDs not in either local JSON: ${dbNotInLocal.length}`);
  if (dbNotInLocal.length > 0 && dbNotInLocal.length <= 10) {
    console.log('  Orphan DB IDs:', dbNotInLocal);
  }

  // --- Recommended union ---
  const unionIds = new Set([...fastoIds, ...meroIds]);
  console.log('\n=== RECOMMENDED UNION (both sources) ===');
  console.log(`Total distinct products if both loaded: ${unionIds.size}`);

  // --- Field coverage ---
  console.log('\n=== FIELD COVERAGE ===');
  const fImg = fasto.filter(p => p.imageUrl).length;
  const fBrand = fasto.filter(p => p.brand).length;
  const fDisc = fasto.filter(p => p.discount_percent > 0).length;
  const mImg = mero.filter(p => p.imageUrl).length;
  const mBrand = mero.filter(p => p.brand).length;
  console.log(`Fasto: ${fImg} images, ${fBrand} brands, ${fDisc} discounted`);
  console.log(`Mero:  ${mImg} images, ${mBrand} brands, NO discount/markdown fields`);
}

main().catch(err => { console.error(err); process.exit(1); });
