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
import { SEED_PRODUCTS } from '../lib/seedInventory';

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

  it('updateCustomer patches existing customer in place', () => {
    useStore.getState().addCustomer({ name: 'Ram', due: 0 });
    const id = useStore.getState().customers[0].id;
    useStore.getState().updateCustomer(id, { name: 'Ram Bahadur', due: 500 });
    const updated = useStore.getState().customers[0];
    expect(updated.id).toBe(id);
    expect(updated.name).toBe('Ram Bahadur');
    expect(updated.due).toBe(500);
  });

  it('deleteCustomer archives instead of removing (ledger + history kept)', () => {
    useStore.getState().addCustomer({ name: 'Ram', due: 100 });
    const id = useStore.getState().customers[0].id;
    useStore.getState().addToHistory({
      id: 'o1', customerId: id, customerName: 'Ram', total: 100, dueAmount: 100,
      items: [], processedBy: 'staff', timestamp: new Date().toISOString(),
    });
    useStore.getState().deleteCustomer(id);
    const kept = useStore.getState().customers.find(x => x.id === id);
    expect(kept).toBeDefined();
    expect(kept.is_deleted).toBe(true);
    expect(kept.due).toBe(100);
    expect(useStore.getState().history).toHaveLength(1);
    const ops = useStore.getState().syncQueue;
    expect(ops).toHaveLength(2);
    expect(ops[1]).toMatchObject({ table: 'customers', op: 'upsert' });
    expect(ops[1].row.is_deleted).toBe(true);
  });

  it('deleteCustomer ignores unknown ids', () => {
    useStore.getState().deleteCustomer('nope');
    expect(useStore.getState().customers).toEqual([]);
    expect(useStore.getState().syncQueue).toEqual([]);
  });

  it('restoreCustomer un-archives the customer', () => {
    useStore.getState().addCustomer({ name: 'Ram', due: 50 });
    const id = useStore.getState().customers[0].id;
    useStore.getState().deleteCustomer(id);
    expect(useStore.getState().customers[0].is_deleted).toBe(true);
    useStore.getState().restoreCustomer(id);
    expect(useStore.getState().customers[0].is_deleted).toBe(false);
    expect(useStore.getState().customers[0].due).toBe(50);
  });
});

describe('checkout save path', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.setState({
      cart: [],
      products: [],
      customers: [],
      history: [],
      shopId: 'test-shop',
      syncQueue: [],
    });
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('addToHistory persists the order locally with id + timestamp', () => {
    const order = {
      customerId: 'c1',
      customerName: 'Ram',
      total: 150,
      dueAmount: 150,
      items: [],
      processedBy: 'test@example.com',
      timestamp: new Date().toISOString(),
    };
    useStore.getState().addToHistory(order);
    const history = useStore.getState().history;
    expect(history).toHaveLength(1);
    expect(history[0].customerId).toBe('c1');
    expect(history[0].total).toBe(150);
    expect(history[0].id).toBeTruthy();
    expect(history[0].timestamp).toBeTruthy();
  });

  it('due-only checkout (empty cart) still records history', () => {
    const s = useStore.getState();
    expect(s.cart).toEqual([]);
    s.addToHistory({
      customerId: 'c1',
      customerName: 'Ram',
      total: 150,
      dueAmount: 150,
      items: [],
      processedBy: 'test@example.com',
      timestamp: new Date().toISOString(),
    });
    expect(useStore.getState().history).toHaveLength(1);
  });

  it('pushTransaction enqueues a shop-tagged row for sync', () => {
    const order = {
      id: 'o1',
      customerId: 'c1',
      customerName: 'Ram',
      total: 150,
      dueAmount: 50,
      items: [{ name: 'Milk', quantity: 1, price: 150 }],
      processedBy: 'test@example.com',
      timestamp: new Date().toISOString(),
    };
    useStore.getState().pushTransaction(order);
    const queue = useStore.getState().syncQueue;
    expect(queue).toHaveLength(1);
    expect(queue[0].table).toBe('transactions');
    expect(queue[0].row.shop_id).toBe('test-shop');
    expect(queue[0].row.total).toBe(150);
    expect(queue[0].row.due_amount).toBe(50);
  });

  it('clearing the session after checkout keeps history', () => {
    const s = useStore.getState();
    s.addToHistory({
      id: 'o1',
      customerId: 'c1',
      customerName: 'Ram',
      total: 100,
      dueAmount: 0,
      items: [],
      processedBy: 'test@example.com',
      timestamp: new Date().toISOString(),
    });
    s.addToCart({ id: 'p1', name: 'Milk', price: 30 });
    s.clearSession();
    expect(useStore.getState().cart).toEqual([]);
    expect(useStore.getState().activeCustomer).toBeNull();
    expect(useStore.getState().history).toHaveLength(1);
  });
});

describe('customer due ledger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.setState({
      cart: [],
      products: [],
      customers: [],
      history: [],
      shopId: 'test-shop',
      syncQueue: [],
    });
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('addToCustomerDue accumulates onto the customer balance', () => {
    useStore.getState().addCustomer({ name: 'Ram', due: 66 });
    const id = useStore.getState().customers[0].id;
    useStore.getState().addToCustomerDue(id, 77);
    expect(useStore.getState().customers[0].due).toBe(143);
  });

  it('addToCustomerDue ignores unknown ids (e.g. walk-in)', () => {
    useStore.getState().addToCustomerDue('other', 77);
    expect(useStore.getState().customers).toEqual([]);
    expect(useStore.getState().syncQueue).toEqual([]);
  });

  it('receivePayment reduces the balance and logs a payment record', () => {
    useStore.getState().addCustomer({ name: 'Ram', due: 100 });
    const id = useStore.getState().customers[0].id;
    useStore.getState().receivePayment(id, 'Ram', 40, 'staff@shop.com');
    expect(useStore.getState().customers[0].due).toBe(60);
    const [record] = useStore.getState().history;
    expect(record.customerId).toBe(id);
    expect(record.total).toBe(0);
    expect(record.dueAmount).toBe(-40);
    expect(record.processedBy).toBe('staff@shop.com');
    const tables = useStore.getState().syncQueue.map(op => op.table);
    expect(tables).toContain('customers');
    expect(tables).toContain('transactions');
  });

  it('receivePayment floors the balance at 0 and ignores non-positive amounts', () => {
    useStore.getState().addCustomer({ name: 'Ram', due: 30 });
    const id = useStore.getState().customers[0].id;
    useStore.getState().receivePayment(id, 'Ram', 100, 'staff@shop.com');
    expect(useStore.getState().customers[0].due).toBe(0);
    const count = useStore.getState().history.length;
    useStore.getState().receivePayment(id, 'Ram', 0, 'staff@shop.com');
    useStore.getState().receivePayment(id, 'Ram', -5, 'staff@shop.com');
    expect(useStore.getState().history.length).toBe(count);
  });
});

describe('seed sample inventory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reset();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('adds one product per seed category, tagged with shop_id', () => {
    const res = useStore.getState().seedSampleInventory();
    expect(res.ok).toBe(true);
    expect(res.added).toBe(SEED_PRODUCTS.length);
    const products = useStore.getState().products;
    expect(products).toHaveLength(SEED_PRODUCTS.length);
    expect(products.every(p => p.shop_id === 'test-shop')).toBe(true);
    expect(products.every(p => p.id && p.name && p.image)).toBe(true);
  });

  it('skips names already in inventory on re-run', () => {
    useStore.getState().seedSampleInventory();
    const res = useStore.getState().seedSampleInventory();
    expect(res.ok).toBe(true);
    expect(res.added).toBe(0);
    expect(res.skipped).toBe(SEED_PRODUCTS.length);
    expect(useStore.getState().products).toHaveLength(SEED_PRODUCTS.length);
  });

  it('refuses to seed without a shop', () => {
    useStore.setState({ shopId: null });
    const res = useStore.getState().seedSampleInventory();
    expect(res.ok).toBe(false);
    expect(useStore.getState().products).toEqual([]);
  });
});

describe('persistence partialize', () => {  it('only persists the whitelisted keys', () => {
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
