import { useState, useCallback } from 'react';
import { searchProducts } from '../services/api';
import { MOCK_PRODUCTS } from '../constants/mockData';
import type { Product } from '../constants/mockData';

interface UseSearchResult {
  results: Product[];
  isLoading: boolean;
  error: string | null;
  search: (query: string, currency?: 'AED' | 'SAR') => Promise<void>;
  clear: () => void;
}

export function useSearch(): UseSearchResult {
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, currency: 'AED' | 'SAR' = 'AED') => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await searchProducts(query, currency);
      setResults(data.length ? data : _mockFallback(query));
    } catch {
      // Network unavailable or backend down — fall back to mock so the UI stays usable
      setResults(_mockFallback(query));
      setError('تعذّر الاتصال بالخادم، نعرض نتائج تجريبية');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, isLoading, error, search, clear };
}

function _mockFallback(query: string): Product[] {
  const q = query.toLowerCase();
  const matched = MOCK_PRODUCTS.filter(
    (p) =>
      p.nameAr.includes(query) ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
  );
  return matched.length ? matched : MOCK_PRODUCTS.slice(0, 3);
}
