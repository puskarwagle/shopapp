const https = require('https');
const fs = require('fs');
const path = require('path');

const PRODUCT_IMG_DIR = 'images/products';

const CONCURRENCY = parseInt(process.env.CONCURRENCY || '8', 10);

function mkdir(p) { fs.mkdirSync(p, { recursive: true }); }

function download(url, filepath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filepath)) return resolve('exists');
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 308) {
        res.resume();
        return resolve('redirect:' + res.statusCode);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve('skip:' + res.statusCode);
      }
      const stream = fs.createWriteStream(filepath);
      res.pipe(stream);
      stream.on('finish', () => stream.close(() => resolve('ok')));
      stream.on('error', (e) => { try { fs.unlinkSync(filepath); } catch (_) {} reject(e); });
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
    .slice(0, 60);
}

function extOf(url) {
  try {
    const p = new URL(url).pathname;
    const i = p.lastIndexOf('.');
    return i >= 0 ? p.slice(i).toLowerCase() : '';
  } catch (_) { return ''; }
}

async function main() {
  mkdir(PRODUCT_IMG_DIR);

  const products = JSON.parse(fs.readFileSync('merokirana_products.json', 'utf8'));
  const todo = products.filter(p => p.image_url && extOf(p.image_url));
  console.log(`Total ${products.length} | to download: ${todo.length}`);

  let done = 0, ok = 0, fail = 0;
  let next = 0;

  async function worker() {
    while (next < todo.length) {
      const p = todo[next++];
      const ext = extOf(p.image_url);
      const filepath = path.join(PRODUCT_IMG_DIR, `${p.identifier}_${slug(p.name)}${ext}`);
      let result;
      try {
        result = await download(p.image_url, filepath);
      } catch (e) {
        result = 'error';
      }
      if (result === 'ok') ok++;
      else if (result !== 'exists') fail++;
      done++;
      if (done % 100 === 0) console.log(`  progress ${done}/${todo.length} (ok=${ok} fail=${fail})`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\nDone. ok=${ok} exists=${done - ok - fail} fail=${fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });