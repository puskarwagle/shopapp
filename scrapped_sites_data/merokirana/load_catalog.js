#!/usr/bin/env node
// Load Mero products into product_catalog with:
// - Category mapping (Mero leaf → Fasto category)
// - Skip same-size duplicates (19 products already in Fasto)
// - Batch insert via Management API

const fs = require('fs');
const https = require('https');
const path = require('path');

const PROJECT_REF = 'bvjumsiwjigbcemzejkf';
const TOKEN = process.env.SUPABASE_PAT;
if (!TOKEN) {
  console.error('Set SUPABASE_PAT env var');
  process.exit(1);
}
const CHUNK = 200;

const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'merokirana_products.json'), 'utf8')
);

// ── Category mapping: Mero leaf category → Fasto category ──
const CATEGORY_MAP = {
  // Beauty Store
  '1. Make Up': 'Beauty & Personal Care',
  'Korean Beauty': 'Beauty & Personal Care',
  'Shampoo & Conditioner': 'Hair Care Essentials',
  'Hair Care': 'Hair Care Essentials',
  'Oral Care': 'Oral Care',
  'Female Hygiene': 'Female Hygiene',
  'Soaps, Handwash & Body Wash': 'Beauty & Personal Care',
  '2. Skin Care': 'Skin Care Essentials',
  'Deodrant & Fragrance': 'Deodrants & Perfumes',
  '3. Eye Care': 'Health Care Essentials',
  'Mens Grooming': 'Mens Grooming',

  // Packaged Food
  'Biscuits & Cookies': 'Biscuits & Cookies',
  'Chocolates & Candies': 'Chocolates & Sweets',
  'Snacks': 'Chips, Cheese Balls & Snacks',
  'Spreads, Sauce & Ketchup': 'Ketchups, Sauces & Pickles',
  'Noodles & Pasta': 'Pasta, Noodles & Soup',
  'Breakfast Cereals': 'Breakfast & Cereals',
  'Canned & Processed Food': 'Frozen & Canned Food',
  'Sweets Corner': 'Chocolates & Sweets',
  'Frozen Meals & Snacks': 'Frozen & Canned Food',
  'Energy Bar': 'Breakfast & Cereals',
  'Ready to Cook Mixes': 'Kitchen Essentials',

  // Household Items
  'Tissues & Disposable': 'Home Care',
  'Detergents & Dishwash': 'Detergents',
  'Car & Shoe Care': 'Footware & Shoe Care',
  'All Purpose Cleaner': 'Home Care',
  'Health & Medicine': 'Health Care Essentials',
  'Air Freshener': 'Home Care',
  'Insect & Mosquito Repellents': 'Home Care',
  'Scrubs & Mops': 'Home Care',
  'Air Purifiers': 'Home Appliances',

  // Baby Store
  'Baby Bottles': 'Baby Care Essentials',
  'Baby Diapers & Wipes': 'Baby Care Essentials',
  'Baby Toys': 'Toys',
  'Baby Products': 'Baby Care Essentials',
  'Baby Food & formula': 'Baby Care Essentials',
  'School Supplies': 'Stationery',

  // Grocery
  '1. Rice & Rice Products': 'Rice',
  'Spices & Masala': 'Masala, Papad & Herbs',
  'Local Grocery from Nepal': 'Chiura, Bhuja and Masyura',
  'Dry Fruits': 'Dry Fruits & Nuts',
  'Atta, Flour & Suji': 'Aata, Maida & Other Flours',
  'Salt & Sugar': 'Salt & Sugar',

  // Beverage
  'Tea': 'Tea & Coffee',
  'Fruit Juice & Drinks': 'Soft Drinks & Juices',
  'Soft Drinks': 'Soft Drinks & Juices',

  // Kitchen & Pet Food
  'Kitchen Appliances': 'Kitchen Electronics',

  // Eggs & Meat
  'Frozen Meat': 'Meat & Poultry',
  'Sausages, Ham & Salami': 'Meat & Poultry',

  // Top-level categories used as leaf (920 products with null parentCategory)
  'Grocery': 'Chiura, Bhuja and Masyura',
  'Beverage': 'Soft Drinks & Juices',
  'Eggs & Meat': 'Meat & Poultry',
  'Household Items': 'Home Care',
  'Kitchen & Pet Food': 'Kitchen Essentials',
  'Packaged Food': 'Chips, Cheese Balls & Snacks',
  'The Baby Store': 'Baby Care Essentials',
  'The Beauty Store': 'Beauty & Personal Care',
  'Veg & Fruits': 'Fruits & Vegetables',
  'Bakery & Dairy': 'Dairy',
};

// ── Find same-size duplicates to skip ──
function core(s) {
  return (s || '').toLowerCase()
    .replace(/mrp\s*\d+/g, '')
    .replace(/\d+(\.\d+)?\s*(ml|l|kg|gm|g|ltr|litre|liter|pcs|pack|tube|sachet|pkt|box|bag|can|bottle|jar|tin|roll|sheet|bar|cube|pouch|strip|no\.?)/gi, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function size(s) {
  const m = (s || '').toLowerCase().match(/(\d+(?:\.\d+)?)\s*(ml|l|kg|gm|g|ltr|pcs|pack|tube|sachet|pkt|box|bag|can|bottle|jar|tin|roll|sheet|bar|cube|pouch|strip|no\.?)/i);
  return m ? m[1] + m[2] : null;
}

const fasto = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'fasto', 'fasto_products.json'), 'utf8')
);
const fastoCore = {};
fasto.forEach(p => { const c = core(p.name); if (c.length >= 3) fastoCore[c] = (fastoCore[c] || []).concat(p); });

const skipIds = new Set();
products.forEach(p => {
  const c = core(p.name);
  const s = size(p.name);
  if (fastoCore[c]) {
    const match = fastoCore[c].find(fp => {
      const fs2 = size(fp.name);
      return s && fs2 && s === fs2;
    });
    if (match) skipIds.add(p.id);
  }
});

const filtered = products.filter(p => !skipIds.has(p.id));
console.log(`Total Mero: ${products.length} | Duplicates to skip: ${skipIds.size} | Loading: ${filtered.length}`);

// ── Category stats ──
const catStats = {};
const unmapped = new Set();
filtered.forEach(p => {
  const cat = CATEGORY_MAP[p.category] || CATEGORY_MAP[p.parentCategory] || null;
  if (cat) catStats[cat] = (catStats[cat] || 0) + 1;
  else unmapped.add(`${p.parentCategory || 'null'} → ${p.category}`);
});
console.log('\nCategories after mapping:');
Object.entries(catStats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v}\t${k}`));
if (unmapped.size > 0) {
  console.log('\nUNMAPPED:');
  unmapped.forEach(u => console.log(`  ${u}`));
}

// ── DB insert ──
function escape(s) { return s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`; }
function num(n) { return n == null ? 'NULL' : Number(n); }

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
    }, res => {
      let data = '';
      res.on('data', c => data += c);
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
  const cols = '(id, name, price, marked_price, discount_percent, category, subcategory, image_url, brand, source)';
  let inserted = 0;
  for (let i = 0; i < filtered.length; i += CHUNK) {
    const slice = filtered.slice(i, i + CHUNK);
    const rows = slice.map(p => {
      const category = CATEGORY_MAP[p.category] || CATEGORY_MAP[p.parentCategory] || null;
      return `(${escape(p.id)}, ${escape(p.name)}, ${num(p.price)}, NULL, 0, ${escape(category)}, NULL, NULL, ${escape(p.brand)}, 'merokirana')`;
    }).join(',\n');
    const sql = `INSERT INTO product_catalog ${cols} VALUES\n${rows}\nON CONFLICT (id) DO UPDATE SET\n  name = EXCLUDED.name,\n  price = EXCLUDED.price,\n  category = EXCLUDED.category,\n  brand = EXCLUDED.brand,\n  source = EXCLUDED.source;`;
    await postQuery(sql);
    inserted += slice.length;
    console.log(`Inserted ${inserted}/${filtered.length}`);
  }
  const res = await postQuery('SELECT source, count(*) AS n FROM product_catalog GROUP BY source ORDER BY source;');
  console.log('\nFinal catalog by source:', JSON.stringify(res));
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
