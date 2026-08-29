import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
  },
}));

vi.mock('../lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: false,
}));

const useStore = (await import('../store/useStore')).default;

const reset = () =>
  useStore.setState({
    cart: [],
    products: [],
    customers: [],
    shopId: 'test-shop',
    syncQueue: [],
  });

describe('cart logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reset();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('addToCart adds a new product with quantity 1', () => {
    useStore.getState().addToCart({ id: 'p1', name: 'Milk', price: 30 });
    expect(useStore.getState().cart).toEqual([{ id: 'p1', name: 'Milk', price: 30, quantity: 1 }]);
  });

  it('addToCart increments quantity when product already in cart', () => {
    const s = useStore.getState();
    s.addToCart({ id: 'p1', name: 'Milk', price: 30 });
    s.addToCart({ id: 'p1', name: 'Milk', price: 30 });
    expect(useStore.getState().cart).toEqual([{ id: 'p1', name: 'Milk', price: 30, quantity: 2 }]);
  });

  it('removeFromCart decrements quantity', () => {
    const s = useStore.getState();
    s.addToCart({ id: 'p1', name: 'Milk', price: 30 });
    s.addToCart({ id: 'p1', name: 'Milk', price: 30 });
    s.removeFromCart('p1');
    expect(useStore.getState().cart[0].quantity).toBe(1);
  });

  it('removeFromCart drops the item once quantity hits 0', () => {
    const s = useStore.getState();
    s.addToCart({ id: 'p1', name: 'Milk', price: 30 });
    s.removeFromCart('p1');
    expect(useStore.getState().cart).toEqual([]);
  });

  it('clearCart empties the cart', () => {
    const s = useStore.getState();
    s.addToCart({ id: 'p1', name: 'Milk', price: 30 });
    s.clearCart();
    expect(useStore.getState().cart).toEqual([]);
  });
});

describe('product + customer operations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reset();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('addProduct prepends to products and tags shop_id', () => {
    useStore.getState().addProduct({ name: 'Eggs', price: 10, stock: 5 });
    const products = useStore.getState().products;
    expect(products).toHaveLength(1);
    expect(products[0].shop_id).toBe('test-shop');
    expect(products[0].name).toBe('Eggs');
    expect(products[0].id).toBeTruthy();
  });

  it('updateProduct patches an existing product', () => {
    useStore.getState().addProduct({ name: 'Eggs', price: 10, stock: 5 });
    const id = useStore.getState().products[0].id;
    useStore.getState().updateProduct(id, { price: 12, stock: 3 });
    const p = useStore.getState().products[0];
    expect(p.price).toBe(12);
    expect(p.stock).toBe(3);
  });

  it('deleteProduct removes product and any cart lines', () => {
    const s = useStore.getState();
    s.addProduct({ name: 'Eggs', price: 10, stock: 5 });
    const id = useStore.getState().products[0].id;
    s.addToCart({ id, name: 'Eggs', price: 10 });
    s.deleteProduct(id);
    expect(useStore.getState().products).toEqual([]);
    expect(useStore.getState().cart).toEqual([]);
  });

  it('addCustomer prepends and tags shop_id', () => {
    useStore.getState().addCustomer({ name: 'Ram', due: 0 });
    const c = useStore.getState().customers[0];
    expect(c.name).toBe('Ram');
    expect(c.shop_id).toBe('test-shop');
  });
});

describe('persistence partialize', () => {
  it('only persists the whitelisted keys', () => {
    const partialize = useStore.persist.getOptions().partialize;
    const full = useStore.getState();
    const persisted = partialize(full);
    const allowed = [
      'user', 'shopId', 'shopName', 'shopInviteCode', 'inviteExpiresAt',
      'activeCustomer', 'isDarkMode', 'fontSizeScale', 'thumbnailScale',
      'cart', 'history', 'products', 'customers', 'productCatalog',
      'catalogCategories', 'catalogVersion', 'syncQueue', 'lastSyncedAt',
    ];
    expect(Object.keys(persisted).sort()).toEqual([...allowed].sort());
    expect(persisted).not.toHaveProperty('enqueueSync');
    expect(persisted).not.toHaveProperty('flushSync');
  });
});
