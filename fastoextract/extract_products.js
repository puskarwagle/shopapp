const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://api.fasto.com.np';
const API_KEY = 'FAST0*#Kathmandu@2025-10-17$#$^';
const DEVICE_INFO = JSON.stringify({
  device_type: "web", device_name: "web", brand: "web", model: "web",
  os_version: "web", app_version: "web", build_number: "web", device_id: "web"
});

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'X-Fasto-App-Key': API_KEY,
        'X-device-info': DEVICE_INFO,
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  const allProducts = [];
  const seen = new Set();
  let nextUrl = `${BASE_URL}/products-by-subcategory/?store_id=1`;
  let pageCount = 0;

  while (nextUrl) {
    const resp = await fetch(nextUrl);
    if (!resp.results || !resp.results.data) {
      console.error('Failed:', JSON.stringify(resp).slice(0, 300));
      break;
    }

    for (const group of resp.results.data) {
      const subcategory = group.subcategory || null;
      if (!Array.isArray(group.products)) continue;
      for (const item of group.products) {
        if (!item || seen.has(item.product_id)) continue;
        seen.add(item.product_id);
        const imageUrl = item.images && item.images[0]
          ? `https://cdn.fasto.com.np${item.images[0]}`
          : null;
        const category = item.categories && item.categories[0] ? item.categories[0].name : null;
        allProducts.push({
          id: item.product_id,
          name: item.product_name,
          price: item.price,
          marked_price: item.marked_price,
          discount_percent: item.discount_percent,
          category,
          subcategory,
          imageUrl,
          brand: item.brand ? item.brand.name : null,
        });
      }
    }

    pageCount++;
    console.log(`Page ${resp.current_page}/${resp.total_pages}: unique products so far: ${allProducts.length}`);
    nextUrl = resp.next ? resp.next.replace('http://', 'https://') : null;
  }

  fs.writeFileSync('fasto_products.json', JSON.stringify(allProducts, null, 2));
  console.log(`Done. ${allProducts.length} unique products saved to fasto_products.json`);
}

main().catch(e => { console.error(e); process.exit(1); });