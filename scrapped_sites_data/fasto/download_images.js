const https = require('https');
const fs = require('fs');
const path = require('path');

const PRODUCT_IMG_DIR = 'images/products';
const CATEGORY_IMG_DIR = 'images/categories';

const CATEGORY_MAP = {
  'fruits-and-vegetables': 'Fruits & Vegetables',
  'riced-and-convenience': 'Rice & Convenience',
};

function mkdir(p) { fs.mkdirSync(p, { recursive: true }); }

function download(url, filepath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filepath)) return resolve('exists');
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve('skip:' + res.statusCode);
      }
      const stream = fs.createWriteStream(filepath);
      res.pipe(stream);
      stream.on('finish', () => stream.close(() => resolve('ok')));
      stream.on('error', (e) => { fs.unlinkSync(filepath); reject(e); });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout ' + url)); });
  });
}

function slug(name) {
  return (name || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function main() {
  mkdir(PRODUCT_IMG_DIR);
  mkdir(CATEGORY_IMG_DIR);

  const products = JSON.parse(fs.readFileSync('fasto_products.json', 'utf8'));
  console.log(`Downloading ${products.length} product images...`);
  let ok = 0, fail = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p.imageUrl) { fail++; continue; }
    const ext = path.extname(new URL(p.imageUrl).pathname) || '.png';
    const filepath = path.join(PRODUCT_IMG_DIR, `${p.id}_${slug(p.name)}${ext}`);
    const result = await download(p.imageUrl, filepath);
    if (result === 'ok') ok++;
    else if (result !== 'exists') fail++;
    if ((i + 1) % 50 === 0) console.log(`  ...${i + 1}/${products.length} (ok=${ok} fail=${fail})`);
  }
  console.log(`Products: ok=${ok} fail=${fail} (incl. missing urls)`);

  const flightRaw = fs.readFileSync('rsc_flight_raw.txt', 'utf8');
  const catRe = /\\"src\\":\\"(https:\/\/cdn\.fasto\.com\.np\/media\/src\/images\/category_images\/[^\\"]+)\\",\\"alt\\":\\"([^"]+)\\"/g;
  const categories = [];
  let match;
  const seen = new Set();
  while ((match = catRe.exec(flightRaw)) !== null) {
    const [, url, alt] = match;
    if (seen.has(url)) continue;
    seen.add(url);
    categories.push({ name: alt.replace(/\\u0026/g, '&'), imageUrl: url.replace(/\\u0026/g, '&') });
  }
  console.log(`\nFound ${categories.length} category images. Downloading...`);
  let cOk = 0, cFail = 0;
  for (const c of categories) {
    const ext = path.extname(new URL(c.imageUrl).pathname) || '.png';
    const filepath = path.join(CATEGORY_IMG_DIR, `${slug(c.name)}${ext}`);
    const result = await download(c.imageUrl, filepath);
    if (result === 'ok') cOk++;
    else if (result !== 'exists') cFail++;
  }
  console.log(`Categories: ok=${cOk} fail=${cFail}`);

  fs.writeFileSync('category_index.json', JSON.stringify(categories, null, 2));
  console.log('\nSaved category_index.json');
}

main().catch(e => { console.error(e); process.exit(1); });