import { useCallback, useEffect, useState } from 'react';
import { SEED_PRODUCTS } from '../data/seedData';
import type { Product } from '../types';

const STORAGE_KEY = 'wicked_recently_viewed';
const MAX_ITEMS = 8;

function readStoredIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<string[]>(() => readStoredIds());

  useEffect(() => {
    const onStorage = () => setRecentIds(readStoredIds());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const recordView = useCallback((productId: string) => {
    if (!productId) return;
    setRecentIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota / privacy errors
      }
      return next;
    });
  }, []);

  const getProducts = useCallback(
    (catalog: Product[] = SEED_PRODUCTS, excludeId?: string, limit = 4): Product[] => {
      return recentIds
        .filter((id) => id !== excludeId)
        .map((id) => catalog.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p))
        .slice(0, limit);
    },
    [recentIds]
  );

  return { recentIds, recordView, getProducts };
}
