import Fuse from 'fuse.js';

const normalize = (s) => (s == null ? '' : String(s)).trim().toLowerCase();

export function createFuse(items, keyList, extra = {}) {
  if (!items || items.length === 0) return null;
  return new Fuse(items, {
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 1,
    shouldSort: true,
    ...extra,
    keys: keyList,
  });
}

const TIER_FALLBACK = 6;

export function smartSearch(items, query, fuse) {
  const q = normalize(query);
  if (!q || !items) return null;

  const scored = [];
  const seen = new Set();

  for (const item of items) {
    const name = normalize(item.name);
    const brand = normalize(item.brand);
    const subcat = normalize(item.subcategory);

    let tier = 0;
    if (name === q) tier = 1;
    else if (name.startsWith(q)) tier = 2;
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) tier = 3;
    else if (name.includes(q)) tier = 4;
    else if (brand.startsWith(q) || subcat.startsWith(q) || brand.includes(q) || subcat.includes(q)) tier = 5;

    if (tier > 0) {
      seen.add(item.id);
      scored.push({ item, tier, name, price: Number(item.price) || 0 });
    }
  }

  if (fuse) {
    for (const r of fuse.search(q)) {
      if (seen.has(r.item.id)) continue;
      scored.push({
        item: r.item,
        tier: TIER_FALLBACK,
        fuseScore: r.score,
        name: normalize(r.item.name),
        price: Number(r.item.price) || 0,
      });
    }
  }

  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.tier === TIER_FALLBACK && a.fuseScore !== b.fuseScore) {
      return a.fuseScore - b.fuseScore;
    }
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    return a.price - b.price;
  });

  return scored.map((s) => s.item);
}
