import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_RECENT_SEARCHES, Product } from '../constants/mockData';

export interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
  language: string;
  currency: string;
  is_premium: boolean;
}

export interface PriceAlert {
  productId: string;
  productNameAr: string;
  targetPrice: number;
  currency: 'AED' | 'SAR';
  createdAt: string;
  alertType?: 'target_price' | 'pct_drop' | 'lowest_90' | 'beat_amazon' | 'coupon' | 'free_delivery' | 'rare_deal';
  active?: boolean;
}

export type WishlistCategory =
  | 'general' | 'home' | 'electronics' | 'kids' | 'school' | 'gifts' | 'ramadan' | 'travel';

export const WISHLIST_CATEGORY_LABELS: Record<WishlistCategory, { ar: string; en: string; icon: string }> = {
  general:    { ar: 'عام',        en: 'General',    icon: '🛍️' },
  home:       { ar: 'المنزل',     en: 'Home',       icon: '🏠' },
  electronics:{ ar: 'الإلكترونيات', en: 'Electronics', icon: '📱' },
  kids:       { ar: 'الأطفال',    en: 'Kids',       icon: '🧸' },
  school:     { ar: 'المدرسة',    en: 'School',     icon: '📚' },
  gifts:      { ar: 'الهدايا',    en: 'Gifts',      icon: '🎁' },
  ramadan:    { ar: 'رمضان/العيد', en: 'Ramadan/Eid', icon: '🌙' },
  travel:     { ar: 'السفر',      en: 'Travel',     icon: '✈️' },
};

export interface WishlistItem {
  id: string;
  productId: string;
  productNameAr: string;
  productName: string;
  imageUrl: string;
  category: WishlistCategory;
  targetPrice?: number;
  alertEnabled: boolean;
  status: 'watching' | 'buy_soon' | 'waiting_deal' | 'purchased';
  addedAt: string;
  purchasedAt?: string;
  currentBestPrice: number;
  purchasePrice?: number;
  estimatedSaving?: number;
  currency: 'AED' | 'SAR';
}

export interface PurchasedDeal {
  productId: string;
  productNameAr: string;
  purchasePrice: number;
  marketAvgPrice: number;
  savedAmount: number;
  currency: 'AED' | 'SAR';
  purchasedAt: string;
  category: string;
}

export interface UserBadge {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  earnedAt: string;
}

export const ALL_BADGES: Omit<UserBadge, 'earnedAt'>[] = [
  { id: 'deal_hunter',    nameAr: 'صائد العروض',          nameEn: 'Deal Hunter',         icon: '🎯' },
  { id: 'smart_buyer',    nameAr: 'المشتري الذكي',         nameEn: 'Smart Buyer',         icon: '🧠' },
  { id: 'savings_expert', nameAr: 'خبير التوفير',          nameEn: 'Savings Expert',      icon: '💰' },
  { id: 'fake_detector',  nameAr: 'كاشف الخصومات الوهمية', nameEn: 'Fake Discount Buster', icon: '🔍' },
  { id: 'electronics_king', nameAr: 'ملك الإلكترونيات',   nameEn: 'Electronics King',    icon: '👑' },
  { id: 'budget_hero',    nameAr: 'بطل الميزانية',         nameEn: 'Budget Hero',         icon: '🛡️' },
];

interface WaffirStore {
  // Auth
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;

  // Search
  searchQuery: string;
  isSearching: boolean;
  searchResults: Product[];
  recentSearches: string[];
  selectedProduct: Product | null;

  // Preferences
  currency: 'AED' | 'SAR';
  language: 'ar' | 'en';

  // Price alerts
  priceAlerts: PriceAlert[];

  // Wishlist
  wishlist: WishlistItem[];

  // Savings / gamification
  purchasedDeals: PurchasedDeal[];
  badges: UserBadge[];
  weeklyStreak: number;
  totalFakesAvoided: number;

  // Actions
  setSearchQuery: (q: string) => void;
  setIsSearching: (v: boolean) => void;
  setSearchResults: (r: Product[]) => void;
  addRecentSearch: (q: string) => void;
  setSelectedProduct: (p: Product | null) => void;
  setCurrency: (c: 'AED' | 'SAR') => void;
  setLanguage: (l: 'ar' | 'en') => void;
  addPriceAlert: (alert: PriceAlert) => void;
  removePriceAlert: (productId: string) => void;

  // Wishlist actions
  addToWishlist: (item: Omit<WishlistItem, 'id' | 'addedAt'>) => void;
  removeFromWishlist: (id: string) => void;
  updateWishlistItem: (id: string, updates: Partial<WishlistItem>) => void;
  markPurchased: (id: string, purchasePrice: number) => void;

  // Gamification
  recordPurchasedDeal: (deal: PurchasedDeal) => void;
  incrementFakesAvoided: () => void;
}

export const useWaffirStore = create<WaffirStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      clearAuth: () => set({ user: null, accessToken: null }),

      searchQuery: '',
      isSearching: false,
      searchResults: [],
      recentSearches: MOCK_RECENT_SEARCHES,
      selectedProduct: null,

      currency: 'AED',
      language: 'ar',

      priceAlerts: [],
      wishlist: [],
      purchasedDeals: [],
      badges: [],
      weeklyStreak: 0,
      totalFakesAvoided: 0,

      setSearchQuery: (q) => set({ searchQuery: q }),
      setIsSearching: (v) => set({ isSearching: v }),
      setSearchResults: (r) => set({ searchResults: r }),
      addRecentSearch: (q) =>
        set((s) => ({
          recentSearches: [q, ...s.recentSearches.filter((r) => r !== q)].slice(0, 8),
        })),
      setSelectedProduct: (p) => set({ selectedProduct: p }),
      setCurrency: (c) => set({ currency: c }),
      setLanguage: (l) => set({ language: l }),
      addPriceAlert: (alert) =>
        set((s) => ({
          priceAlerts: [
            { ...alert, active: true },
            ...s.priceAlerts.filter((a) => a.productId !== alert.productId),
          ],
        })),
      removePriceAlert: (productId) =>
        set((s) => ({ priceAlerts: s.priceAlerts.filter((a) => a.productId !== productId) })),

      addToWishlist: (item) =>
        set((s) => {
          if (s.wishlist.some(w => w.productId === item.productId)) return s;
          return {
            wishlist: [
              { ...item, id: `w_${Date.now()}`, addedAt: new Date().toISOString() },
              ...s.wishlist,
            ],
          };
        }),
      removeFromWishlist: (id) =>
        set((s) => ({ wishlist: s.wishlist.filter(w => w.id !== id) })),
      updateWishlistItem: (id, updates) =>
        set((s) => ({
          wishlist: s.wishlist.map(w => w.id === id ? { ...w, ...updates } : w),
        })),
      markPurchased: (id, purchasePrice) =>
        set((s) => ({
          wishlist: s.wishlist.map(w =>
            w.id === id
              ? { ...w, status: 'purchased', purchasedAt: new Date().toISOString(), purchasePrice,
                  estimatedSaving: Math.max(0, w.currentBestPrice - purchasePrice) }
              : w
          ),
        })),

      recordPurchasedDeal: (deal) =>
        set((s) => {
          const deals = [deal, ...s.purchasedDeals];
          const totalSaved = deals.reduce((acc, d) => acc + d.savedAmount, 0);
          const newBadges = [...s.badges];
          if (deals.length >= 3 && !newBadges.find(b => b.id === 'smart_buyer')) {
            newBadges.push({ id: 'smart_buyer', nameAr: 'المشتري الذكي', nameEn: 'Smart Buyer', icon: '🧠', earnedAt: new Date().toISOString() });
          }
          if (totalSaved >= 500 && !newBadges.find(b => b.id === 'savings_expert')) {
            newBadges.push({ id: 'savings_expert', nameAr: 'خبير التوفير', nameEn: 'Savings Expert', icon: '💰', earnedAt: new Date().toISOString() });
          }
          return { purchasedDeals: deals, badges: newBadges };
        }),

      incrementFakesAvoided: () =>
        set((s) => {
          const next = s.totalFakesAvoided + 1;
          const newBadges = [...s.badges];
          if (next >= 3 && !newBadges.find(b => b.id === 'fake_detector')) {
            newBadges.push({ id: 'fake_detector', nameAr: 'كاشف الخصومات الوهمية', nameEn: 'Fake Discount Buster', icon: '🔍', earnedAt: new Date().toISOString() });
          }
          return { totalFakesAvoided: next, badges: newBadges };
        }),
    }),
    {
      name: 'waffir-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        recentSearches: state.recentSearches,
        priceAlerts: state.priceAlerts,
        currency: state.currency,
        language: state.language,
        wishlist: state.wishlist,
        purchasedDeals: state.purchasedDeals,
        badges: state.badges,
        weeklyStreak: state.weeklyStreak,
        totalFakesAvoided: state.totalFakesAvoided,
      }),
    }
  )
);
