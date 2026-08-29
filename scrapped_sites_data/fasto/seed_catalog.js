#!/usr/bin/env node
/**
 * Generate SQL to seed product_catalog from fasto_products.json.
 *
 * Usage:
 *   node seed_catalog.js > seed.sql          # pipe to file
 *   node seed_catalog.js | pbcopy           # copy to clipboard
 *   node seed_catalog.js                    # print to stdout
 */

const fs = require('fs');
const path = require('path');

const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fasto_products.json'), 'utf8')
);

const escape = (s) => s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
const num = (n) => n == null ? 'NULL' : Number(n);

const lines = products.map((p) =>
  `(${escape(p.id)}, ${escape(p.name)}, ${num(p.price)}, ${num(p.marked_price)}, ${num(p.discount_percent)}, ${escape(p.category)}, ${escape(p.subcategory)}, ${escape(p.imageUrl)}, ${escape(p.brand)}, 'fasto')`
);

const sql = `-- Fasto product catalog seed (${products.length} products)
-- Run in Supabase SQL Editor after migration 0004

INSERT INTO product_catalog (id, name, price, marked_price, discount_percent, category, subcategory, image_url, brand, source)
VALUES
${lines.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  marked_price = EXCLUDED.marked_price,
  discount_percent = EXCLUDED.discount_percent,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  image_url = EXCLUDED.image_url,
  brand = EXCLUDED.brand;
`;

process.stdout.write(sql);
