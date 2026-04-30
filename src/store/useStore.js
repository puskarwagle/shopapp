import { create } from 'zustand/index.js';
import { persist, createJSONStorage } from 'zustand/middleware.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useStore = create(
  persist(
    (set) => ({
      user: null, // { email, role }
      setUser: (user) => set({ user }),
      
      // Settings
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      fontSizeScale: 1,
      setFontSizeScale: (scale) => set({ fontSizeScale: scale }),
      thumbnailScale: 1,
      setThumbnailScale: (scale) => set({ thumbnailScale: scale }),

      activeCustomer: null,
      setActiveCustomer: (customer) => set({ activeCustomer: customer }),
      
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
      clearCart: () => set({ cart: [], activeCustomer: null }),
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
      }),
    }
  )
);

export default useStore;
