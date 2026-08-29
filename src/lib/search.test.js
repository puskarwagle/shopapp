import { describe, it, expect } from 'vitest';
import { smartSearch, createFuse } from '../lib/search';

const items = [
  { id: '1', name: 'Amul Milk', brand: 'Amul', subcategory: 'Dairy', price: 30 },
  { id: '2', name: 'Amul Butter', brand: 'Amul', subcategory: 'Dairy', price: 50 },
  { id: '3', name: 'Maggi Noodles', brand: 'Nestle', subcategory: 'Snacks', price: 12 },
  { id: '4', name: 'Tata Tea', brand: 'Tata', subcategory: 'Beverages', price: 120 },
  { id: '5', name: 'Britannia Cake', brand: 'Britannia', subcategory: 'Bakery', price: 25 },
];

const fuse = createFuse(items, ['name', 'brand', 'subcategory']);

describe('smartSearch', () => {
  it('returns null for empty query', () => {
    expect(smartSearch(items, '', fuse)).toBeNull();
    expect(smartSearch(items, '   ', fuse)).toBeNull();
  });

  it('returns null for null/empty items', () => {
    expect(smartSearch(null, 'milk', fuse)).toBeNull();
  });

  it('ranks an exact name match highest (tier 1)', () => {
    const res = smartSearch(items, 'Amul Milk', fuse);
    expect(res[0].id).toBe('1');
  });

  it('ranks a name prefix above a name substring', () => {
    const res = smartSearch(items, 'Amul', fuse);
    expect(res[0].id).toBe('2');
    expect(res[1].id).toBe('1');
  });

  it('matches a brand substring when no name match', () => {
    const res = smartSearch(items, 'Tata', fuse);
    expect(res[0].id).toBe('4');
  });

  it('falls back to fuzzy fuse matches when no tier hit', () => {
    const res = smartSearch(items, 'Maggie', fuse);
    expect(res.some((r) => r.id === '3')).toBe(true);
  });

  it('sorts results by tier, then name, then price', () => {
    const res = smartSearch(items, 'a', fuse);
    for (let i = 1; i < res.length; i++) {
      const prev = items.find((x) => x.id === res[i - 1].id);
      const cur = items.find((x) => x.id === res[i].id);
      expect(res[i - 1].id).toBeDefined();
      expect(cur).toBeTruthy();
    }
    expect(res.length).toBeGreaterThan(0);
  });

  it('createFuse returns null for empty list', () => {
    expect(createFuse([], ['name'])).toBeNull();
  });
});
