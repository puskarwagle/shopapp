import { create } from 'zustand/index.js';
import { persist, createJSONStorage } from 'zustand/middleware.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const useStore = create(
  persist(
    (set, get) => ({
      user: null, // { email, role }
      setUser: (user) => set({ user }),

      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      fontSizeScale: 1,
      setFontSizeScale: (scale) => set({ fontSizeScale: scale }),
      thumbnailScale: 1,
      setThumbnailScale: (scale) => set({ thumbnailScale: scale }),

      activeCustomer: null,
      setActiveCustomer: (customer) => set({ activeCustomer: customer }),

      history: [],
      addToHistory: (order) =>
        set((state) => ({
          history: [{ ...order, id: order.id || uid(), timestamp: order.timestamp || new Date().toISOString() }, ...state.history].slice(0, 200),
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

      // Offline-first data (persisted locally; synced to Supabase when online)
      products: [],
      customers: [],
      syncQueue: [],
      isSyncing: false,
      lastSyncedAt: null,

      addProduct: (product) => {
        const row = { ...product, id: product.id || uid(), updated_at: new Date().toISOString() };
        set((state) => ({ products: [row, ...state.products] }));
        get().enqueueSync({ table: 'products', op: 'upsert', row });
      },
      updateProduct: (productId, patch) => {
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
      addCustomer: (customer) => {
        const row = { ...customer, id: customer.id || uid() };
        set((state) => ({ customers: [row, ...state.customers] }));
        get().enqueueSync({ table: 'customers', op: 'upsert', row });
      },
      pushTransaction: (order) => {
        get().enqueueSync({
          table: 'transactions',
          op: 'upsert',
          row: {
            id: order.id,
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
        set((state) => ({ syncQueue: [...state.syncQueue, op] }));
        setTimeout(() => get().flushSync(), 500);
      },
      flushSync: async () => {
        if (!isSupabaseConfigured) return;
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
        if (!isSupabaseConfigured) return;
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
          }));

          const customersMap = new Map(state.customers.map(c => [c.id, c]));
          (cRes.data || []).forEach(c => customersMap.set(c.id, {
            id: c.id, name: c.name, image: c.image, due: Number(c.due),
          }));

          const histMap = new Map(state.history.map(h => [h.id, h]));
          (tRes.data || []).forEach(t => histMap.set(t.id, {
            id: t.id, customerName: t.customer_name, total: Number(t.total),
            dueAmount: Number(t.due_amount), items: t.items || [],
            processedBy: t.processed_by, timestamp: t.created_at,
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
        set({ user: null, cart: [], activeCustomer: null, syncQueue: [] });
      },
    }),
    {
      name: 'shop-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        activeCustomer: state.activeCustomer,
        isDarkMode: state.isDarkMode,
        fontSizeScale: state.fontSizeScale,
        thumbnailScale: state.thumbnailScale,
        cart: state.cart,
        history: state.history,
        products: state.products,
        customers: state.customers,
        syncQueue: state.syncQueue,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

export default useStore;