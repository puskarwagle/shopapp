import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEV_BYPASS_AUTH } from '../lib/config';
import { SEED_PRODUCTS } from '../lib/seedInventory';
import { SEED_CUSTOMERS } from '../lib/seedCustomers';

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const genInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const IMAGE_PLACEHOLDER = 'https://via.placeholder.com/150/f1f5f9/64748b?text=P';

const CATALOG_VERSION = 2;

const useStore = create(
  persist(
    (set, get) => ({
      user: null, // { id, email, role }
      setUser: (user) => set({ user }),

      // Current shop (tenant). Empty until the user creates/joins one.
      shopId: null,
      shopName: null,
      shopInviteCode: null,
      inviteExpiresAt: null,
      setShopId: (shopId, shopName) => set({ shopId, shopName }),

      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      inspectMode: false,
      toggleInspectMode: () => set((state) => ({ inspectMode: !state.inspectMode })),
      inspectTarget: null,
      setInspectTarget: (target) => set({ inspectTarget: target }),
      clearInspectTarget: () => set({ inspectTarget: null }),
      inspectCopied: false,
      setInspectCopied: (val) => set({ inspectCopied: val }),
      inspectInfo: null,
      setInspectInfo: (info) => set({ inspectInfo: info }),
      fontSizeScale: 1,
      setFontSizeScale: (scale) => set({ fontSizeScale: scale }),
      thumbnailScale: 1,
      setThumbnailScale: (scale) => set({ thumbnailScale: scale }),
      customerView: 'list',
      setCustomerView: (view) => set({ customerView: view === 'grid' ? 'grid' : 'list' }),
      inventoryView: 'grid',
      setInventoryView: (view) => set({ inventoryView: view === 'list' ? 'list' : 'grid' }),

      activeCustomer: null,
      setActiveCustomer: (customer) => set({ activeCustomer: customer }),

      history: [],
      addToHistory: (order) =>
        set((state) => ({
          history: [{ ...order, id: order.id || uid(), timestamp: order.timestamp || new Date().toISOString() }, ...state.history].slice(0, 200),
        })),
      updateHistory: (id, updates) =>
        set((state) => ({
          history: state.history.map(h => h.id === id ? { ...h, ...updates } : h),
        })),

      cart: [], // { id, name, price, quantity }
      addToCart: (product) => set((state) => {
        const existing = state.cart.find(item => item.id === product.id);
        if (existing) {
          return {
            cart: state.cart.map(item =>
              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            )
          };
        }
        return { cart: [...state.cart, { ...product, quantity: 1 }] };
      }),
      removeFromCart: (productId) => set((state) => ({
        cart: state.cart.map(item =>
          item.id === productId ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
        ).filter(item => item.quantity > 0)
      })),
      clearCart: () => set({ cart: [] }),
      clearSession: () => set({ cart: [], activeCustomer: null }),

      // Product catalog from Fasto (read-only, fetched from Supabase)
      productCatalog: [],
      catalogCategories: [],
      catalogVersion: 0,
      fetchCatalog: async () => {
        if (!isSupabaseConfigured) return;
        if (get().catalogVersion === CATALOG_VERSION && get().productCatalog.length > 0) return;
        let all = [], from = 0, size = 1000;
        while (true) {
          const { data, error } = await supabase
            .from('product_catalog')
            .select('*')
            .order('category')
            .order('name')
            .range(from, from + size - 1);
          if (error) return;
          if (!data) break;
          all = all.concat(data);
          if (data.length < size) break;
          from += size;
        }
        const categories = [...new Set(all.map(p => p.category).filter(Boolean))];
        set({ productCatalog: all, catalogCategories: categories, catalogVersion: CATALOG_VERSION });
      },

      // Offline-first data (persisted locally; synced to Supabase when online)
      products: [],
      customers: [],
      syncQueue: [],
      isSyncing: false,
      lastSyncedAt: null,

      createShop: async (name) => {
        if (!isSupabaseConfigured) {
          const code = genInviteCode();
          const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          set({ shopId: 'local', shopName: name || 'Local Shop', shopInviteCode: code, inviteExpiresAt: expires });
          return { ok: true };
        }
        const clean = (name || '').trim();
        if (!clean) return { ok: false, error: 'Enter a shop name.' };
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { ok: false, error: 'Not signed in.' };
        const shopId = uid();
        const inviteCode = genInviteCode();
        const { error } = await supabase.from('shops').insert({
          id: shopId, name: clean, invite_code: inviteCode, owner_id: user.id,
        });
        if (error) return { ok: false, error: error.message };
        await supabase.from('profiles').upsert(
          { id: user.id, email: user.email, shop_id: shopId, role: 'admin' },
          { onConflict: 'id' }
        );
        // Generate first dynamic invite
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await supabase.from('shop_invites').insert({
          shop_id: shopId,
          code: inviteCode,
          expires_at: expiresAt,
        });
        set({
          shopId,
          shopName: clean,
          shopInviteCode: inviteCode,
          inviteExpiresAt: expiresAt,
          user: { ...get().user, id: user.id, email: user.email, role: 'admin' },
        });
        return { ok: true };
      },

      generateInvite: async () => {
        if (!isSupabaseConfigured) {
          const code = genInviteCode();
          const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          set({ shopInviteCode: code, inviteExpiresAt: expires });
          return { ok: true, code, expiresAt: expires };
        }
        const shopId = get().shopId;
        if (!shopId) return { ok: false, error: 'No shop.' };
        // Cleanup expired invites for this shop
        await supabase.rpc('cleanup_expired_invites', { p_shop_id: shopId });
        const code = genInviteCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const { error } = await supabase.from('shop_invites').insert({
          shop_id: shopId,
          code,
          expires_at: expiresAt,
        });
        if (error) return { ok: false, error: error.message };
        set({ shopInviteCode: code, inviteExpiresAt: expiresAt });
        return { ok: true, code, expiresAt };
      },

      joinShop: async (code) => {
        if (!isSupabaseConfigured) {
          set({ shopId: 'local', shopName: 'Local Shop' });
          return { ok: true };
        }
        const clean = (code || '').trim().toUpperCase();
        if (!clean) return { ok: false, error: 'Enter the invite code from the QR.' };
        const { data: invite, error } = await supabase
          .from('shop_invites')
          .select('shop_id, shops(id, name)')
          .eq('code', clean)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        if (error || !invite) return { ok: false, error: 'Invalid or expired code. Ask the shop owner for a new one.' };
        const shop = invite.shops;
        if (!shop) return { ok: false, error: 'Shop not found.' };
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ shop_id: shop.id }).eq('id', user.id);
          const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
          if (prof?.role) set((s) => ({ user: { ...s.user, role: prof.role } }));
        }
        set({ shopId: shop.id, shopName: shop.name });
        return { ok: true };
      },

      addProduct: (product) => {
        if (!get().shopId) return;
        const row = { ...product, id: product.id || uid(), shop_id: get().shopId, updated_at: new Date().toISOString() };
        set((state) => ({ products: [row, ...state.products] }));
        get().enqueueSync({ table: 'products', op: 'upsert', row });
      },
      updateProduct: (productId, patch) => {
        if (!get().shopId) return;
        set((state) => ({
          products: state.products.map(p =>
            p.id === productId ? { ...p, ...patch, updated_at: new Date().toISOString() } : p
          )
        }));
        const updated = get().products.find(p => p.id === productId);
        if (updated) get().enqueueSync({ table: 'products', op: 'upsert', row: updated });
      },
      deleteProduct: (productId) => {
        set((state) => ({
          products: state.products.filter(p => p.id !== productId),
          cart: state.cart.filter(i => i.id !== productId),
        }));
        get().enqueueSync({ table: 'products', op: 'delete', row: { id: productId } });
      },
      seedSampleInventory: () => {
        if (!get().shopId) return { ok: false, error: 'No shop.' };
        const existing = new Set(get().products.map(p => (p.name || '').trim().toLowerCase()));
        const fresh = SEED_PRODUCTS.filter(p => !existing.has(p.name.trim().toLowerCase()));
        fresh.forEach(p => get().addProduct({
          name: p.name, price: p.price, stock: p.stock, image: p.image,
        }));
        return { ok: true, added: fresh.length, skipped: SEED_PRODUCTS.length - fresh.length };
      },
      // Internal: patches Unsplash faces onto seed-named rows that still
      // carry the old placeholder (or no) image. Never adds rows, never
      // touches user-picked photos. Runs silently on app start.
      backfillSamplePhotos: () => {
        if (!get().shopId) return { ok: false, refreshed: 0, pruned: 0 };
        // Prune samples retired by the 12 -> 10 trim. Only untouched rows
        // (seed name + seed due + seed/placeholder/blank photo) are removed;
        // anything the user edited or photographed is left alone.
        const RETIRED = new Map([['sher bahadur rai', 0], ['nirmala limbu', 1980]]);
        const pruneIds = get().customers
          .filter(c => {
            const key = (c.name || '').trim().toLowerCase();
            if (!RETIRED.has(key) || c.is_deleted) return false;
            if (Number(c.due) !== RETIRED.get(key)) return false;
            const img = c.image || '';
            return img === '' || img.includes('via.placeholder.com')
              || img.includes('placehold.co') || img.includes('images.unsplash.com/');
          })
          .map(c => c.id);
        if (pruneIds.length > 0) {
          const ids = new Set(pruneIds);
          set((state) => ({ customers: state.customers.filter(c => !ids.has(c.id)) }));
          pruneIds.forEach(id => get().enqueueSync({ table: 'customers', op: 'delete', row: { id } }));
        }
        const seedByName = new Map(SEED_CUSTOMERS.map(c => [c.name.trim().toLowerCase(), c]));
        let refreshed = 0;
        get().customers.forEach(c => {
          const seed = seedByName.get((c.name || '').trim().toLowerCase());
          if (!seed || !seed.image) return;
          const img = c.image || '';
          if (img === seed.image) return;
          if (img === '' || img.includes('via.placeholder.com') || img.includes('placehold.co')) {
            get().updateCustomer(c.id, { image: seed.image });
            refreshed += 1;
          }
        });
        return { ok: true, refreshed, pruned: pruneIds.length };
      },
      seedSampleCustomers: () => {
        if (!get().shopId) return { ok: false, error: 'No shop.' };
        const existing = new Set(get().customers.map(c => (c.name || '').trim().toLowerCase()));
        const fresh = SEED_CUSTOMERS.filter(c => !existing.has(c.name.trim().toLowerCase()));
        fresh.forEach(c => get().addCustomer({
          name: c.name, due: c.due, image: c.image,
        }));
        const { refreshed, pruned } = get().backfillSamplePhotos();
        return { ok: true, added: fresh.length, refreshed, pruned, skipped: SEED_CUSTOMERS.length - fresh.length };
      },
      addCustomer: (customer) => {
        if (!get().shopId) return;
        const row = { ...customer, id: customer.id || uid(), shop_id: get().shopId, is_deleted: false };
        set((state) => ({ customers: [row, ...state.customers] }));
        get().enqueueSync({ table: 'customers', op: 'upsert', row });
      },
      updateCustomer: (customerId, patch) => {
        if (!get().shopId) return;
        set((state) => ({
          customers: state.customers.map(c =>
            c.id === customerId ? { ...c, ...patch } : c
          )
        }));
        const updated = get().customers.find(c => c.id === customerId);
        if (updated) get().enqueueSync({ table: 'customers', op: 'upsert', row: updated });
      },
      deleteCustomer: (customerId) => {
        const c = get().customers.find(x => x.id === customerId);
        if (!c) return;
        get().updateCustomer(customerId, { is_deleted: true });
      },
      restoreCustomer: (customerId) => {
        const c = get().customers.find(x => x.id === customerId);
        if (!c) return;
        get().updateCustomer(customerId, { is_deleted: false });
      },
      addToCustomerDue: (customerId, amount) => {
        const c = get().customers.find(x => x.id === customerId);
        if (!c) return;
        get().updateCustomer(customerId, { due: (Number(c.due) || 0) + (Number(amount) || 0) });
      },
      receivePayment: (customerId, customerName, amount, processedBy) => {
        const value = Number(amount) || 0;
        if (value <= 0) return;
        const c = get().customers.find(x => x.id === customerId);
        if (c) {
          get().updateCustomer(customerId, { due: Math.max(0, (Number(c.due) || 0) - value) });
        }
        const now = new Date().toISOString();
        const record = {
          id: uid(),
          customerId,
          customerName,
          total: 0,
          dueAmount: -value,
          items: [{ name: 'Payment received', quantity: 1, price: -value }],
          processedBy: processedBy || 'Unknown',
          timestamp: now,
        };
        get().addToHistory(record);
        get().pushTransaction(record);
      },
      pushTransaction: (order) => {
        if (!get().shopId) return;
        get().enqueueSync({
          table: 'transactions',
          op: 'upsert',
          row: {
            id: order.id,
            shop_id: get().shopId,
            customer_id: order.customerId,
            customer_name: order.customerName,
            total: order.total,
            due_amount: order.dueAmount,
            items: order.items,
            processed_by: order.processedBy,
            created_at: order.timestamp,
          },
        });
      },

      enqueueSync: (op) => {
        if (DEV_BYPASS_AUTH) return;
        set((state) => ({ syncQueue: [...state.syncQueue, op] }));
        setTimeout(() => get().flushSync(), 500);
      },
      flushSync: async () => {
        if (DEV_BYPASS_AUTH || !isSupabaseConfigured) return;
        const queue = get().syncQueue;
        if (queue.length === 0) return;
        set({ isSyncing: true });
        const remaining = [];
        for (const op of queue) {
          if (op.op === 'delete') {
            const { error } = await supabase.from(op.table).delete().eq('id', op.row.id);
            if (error) remaining.push(op);
          } else {
            const { error } = await supabase.from(op.table).upsert(op.row, { onConflict: 'id' });
            if (error) remaining.push(op);
          }
        }
        set({
          syncQueue: remaining,
          isSyncing: false,
          lastSyncedAt: new Date().toISOString(),
        });
      },
      pullAll: async () => {
        if (!isSupabaseConfigured || !get().shopId) {
          if (get().shopId === 'local') { set({ isSyncing: false }); return; }
          return;
        }
        set({ isSyncing: true });
        try {
          await get().flushSync();
        } catch (_) {
          // ignore; offline push will be retried next time
        }
        const [pRes, cRes, tRes] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('customers').select('*'),
          supabase.from('transactions').select('*'),
        ]);
        set((state) => {
          const productsMap = new Map(state.products.map(p => [p.id, p]));
          (pRes.data || []).forEach(p => productsMap.set(p.id, {
            id: p.id, name: p.name, price: Number(p.price),
            stock: Number(p.stock), image: p.image,
            shop_id: p.shop_id ?? productsMap.get(p.id)?.shop_id ?? get().shopId,
          }));

          const customersMap = new Map(state.customers.map(c => [c.id, c]));
          // Ids with an unsynced local write: the push hasn't landed yet
          // (offline, or the is_deleted column missing remotely), so the
          // local copy wins and a refresh must not resurrect archived rows.
          const pendingCustomerIds = new Set(
            state.syncQueue
              .filter(op => op.table === 'customers' && op.op === 'upsert' && op.row?.id)
              .map(op => op.row.id)
          );
          (cRes.data || []).forEach(c => {
            const local = customersMap.get(c.id);
            customersMap.set(c.id, {
              id: c.id, name: c.name, image: c.image, due: Number(c.due),
              shop_id: c.shop_id ?? local?.shop_id ?? get().shopId,
              is_deleted: pendingCustomerIds.has(c.id) ? !!local?.is_deleted : !!c.is_deleted,
            });
          });

          const histMap = new Map(state.history.map(h => [h.id, h]));
          (tRes.data || []).forEach(t => histMap.set(t.id, {
            id: t.id, customerId: t.customer_id, customerName: t.customer_name,
            total: Number(t.total), dueAmount: Number(t.due_amount),
            items: t.items || [], processedBy: t.processed_by, timestamp: t.created_at,
          }));

          return {
            products: Array.from(productsMap.values()),
            customers: Array.from(customersMap.values()),
            history: Array.from(histMap.values())
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .slice(0, 200),
            isSyncing: false,
            lastSyncedAt: new Date().toISOString(),
          };
        });
      },

      logout: async () => {
        if (isSupabaseConfigured) {
          await supabase.auth.signOut();
        }
        set({
          user: null,
          cart: [],
          activeCustomer: null,
          shopId: null,
          shopName: null,
          shopInviteCode: null,
          inviteExpiresAt: null,
          syncQueue: [],
        });
      },
    }),
    {
      name: 'shop-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        shopId: state.shopId,
        shopName: state.shopName,
        shopInviteCode: state.shopInviteCode,
        inviteExpiresAt: state.inviteExpiresAt,
        activeCustomer: state.activeCustomer,
        isDarkMode: state.isDarkMode,
        fontSizeScale: state.fontSizeScale,
        thumbnailScale: state.thumbnailScale,
        customerView: state.customerView,
        inventoryView: state.inventoryView,
        cart: state.cart,
        history: state.history,
        products: state.products,
        customers: state.customers,
        productCatalog: state.productCatalog,
        catalogCategories: state.catalogCategories,
        catalogVersion: state.catalogVersion,
        syncQueue: state.syncQueue,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

export default useStore;