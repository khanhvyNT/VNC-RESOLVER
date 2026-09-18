import { ApiVncRecord, NormalizedVnc, SavedVncMetadata, SavedSearch } from '../types';
import { normalizeVncRecord } from '../utils/formatters';

const STORAGE_KEYS = {
  SAVED_VNCS: 'vnc_resolver_saved_records_v1',
  COLLECTIONS: 'vnc_resolver_collections_v1',
  RECENT_VNCS: 'vnc_resolver_recently_viewed_v1',
  SAVED_SEARCHES: 'vnc_resolver_saved_searches_v1',
  COMPARE_LIST: 'vnc_resolver_compare_ids_v1',
};

const DEFAULT_COLLECTIONS = ['Interesting resolutions', 'Research', 'Desktop names', 'Unusual ports'];

// --- Saved / Favorites ---
export function getSavedVncs(): Record<number, SavedVncMetadata> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_VNCS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getSavedVncMetadata(vncId: number): SavedVncMetadata | undefined {
  const map = getSavedVncs();
  return map[vncId];
}

export function getSavedVncList(): NormalizedVnc[] {
  const map = getSavedVncs();
  const list: NormalizedVnc[] = [];
  for (const id in map) {
    if (map[id]?.cachedRecord) {
      list.push(normalizeVncRecord(map[id].cachedRecord));
    }
  }
  return list;
}

export function saveVnc(vnc: NormalizedVnc | ApiVncRecord, collections: string[] = [], notes: string = ''): void {
  try {
    const map = getSavedVncs();
    const rawRecord: ApiVncRecord = 'raw' in vnc ? vnc.raw : vnc;
    map[rawRecord.id] = {
      vncId: rawRecord.id,
      savedAt: Date.now(),
      collections,
      notes,
      cachedRecord: rawRecord,
    };
    localStorage.setItem(STORAGE_KEYS.SAVED_VNCS, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save VNC locally:', err);
  }
}

export function removeSavedVnc(vncId: number): void {
  try {
    const map = getSavedVncs();
    delete map[vncId];
    localStorage.setItem(STORAGE_KEYS.SAVED_VNCS, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to remove saved VNC:', err);
  }
}

export function toggleSavedVnc(vnc: NormalizedVnc | ApiVncRecord): boolean {
  const id = vnc.id;
  const map = getSavedVncs();
  if (map[id]) {
    removeSavedVnc(id);
    return false;
  } else {
    saveVnc(vnc);
    return true;
  }
}

export function isVncSaved(vncId: number): boolean {
  const map = getSavedVncs();
  return Boolean(map[vncId]);
}

export function updateSavedVncMetadata(vncId: number, update: Partial<SavedVncMetadata>): void {
  try {
    const map = getSavedVncs();
    if (map[vncId]) {
      map[vncId] = { ...map[vncId], ...update };
      localStorage.setItem(STORAGE_KEYS.SAVED_VNCS, JSON.stringify(map));
    }
  } catch (err) {
    console.error('Failed to update saved VNC metadata:', err);
  }
}

// --- Collections ---
export function getCollections(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    return raw ? JSON.parse(raw) : DEFAULT_COLLECTIONS;
  } catch {
    return DEFAULT_COLLECTIONS;
  }
}

export function addCollection(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return getCollections();
  const current = getCollections();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(updated));
    } catch {}
    return updated;
  }
  return current;
}

export function deleteCollection(name: string): string[] {
  const current = getCollections().filter((c) => c !== name);
  try {
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(current));
    // Also remove from any saved records
    const map = getSavedVncs();
    let modified = false;
    for (const id in map) {
      if (map[id].collections.includes(name)) {
        map[id].collections = map[id].collections.filter((c) => c !== name);
        modified = true;
      }
    }
    if (modified) {
      localStorage.setItem(STORAGE_KEYS.SAVED_VNCS, JSON.stringify(map));
    }
  } catch {}
  return current;
}

// Alias for backwards compatibility
export const removeCollection = deleteCollection;

// --- Recently Viewed ---
export function getRecentlyViewed(): NormalizedVnc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_VNCS);
    if (!raw) return [];
    const parsed: ApiVncRecord[] = JSON.parse(raw);
    return parsed.map(normalizeVncRecord);
  } catch {
    return [];
  }
}

export function addRecentlyViewed(vnc: NormalizedVnc | ApiVncRecord): NormalizedVnc[] {
  try {
    const rawRecord: ApiVncRecord = 'raw' in vnc ? vnc.raw : vnc;
    const rawList = localStorage.getItem(STORAGE_KEYS.RECENT_VNCS);
    let list: ApiVncRecord[] = rawList ? JSON.parse(rawList) : [];
    list = list.filter((item) => item.id !== rawRecord.id);
    list.unshift(rawRecord);
    const limited = list.slice(0, 30);
    localStorage.setItem(STORAGE_KEYS.RECENT_VNCS, JSON.stringify(limited));
    return limited.map(normalizeVncRecord);
  } catch (err) {
    console.error('Failed to add recently viewed:', err);
    return getRecentlyViewed();
  }
}

export function clearRecentlyViewed(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.RECENT_VNCS);
  } catch {}
}

// --- Saved Searches ---
export function getSavedSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_SEARCHES);
    return raw ? JSON.parse(raw) : [
      {
        id: 'default-1',
        name: 'Japan VNCs',
        query: 'country:JP',
        params: { country: 'JP' },
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'default-2',
        name: 'JDownloader Desktops',
        query: 'desktop:JDownloader',
        params: { desktop_name: 'JDownloader' },
        createdAt: Date.now() - 172800000,
      },
      {
        id: 'default-3',
        name: 'Romania AS8708',
        query: 'country:RO asn:AS8708',
        params: { country: 'RO', asn: 'AS8708' },
        createdAt: Date.now() - 259200000,
      }
    ];
  } catch {
    return [];
  }
}

export function saveSearch(name: string, query: string, params: SavedSearch['params']): SavedSearch {
  const current = getSavedSearches();
  const newSearch: SavedSearch = {
    id: 'search-' + Date.now().toString(36),
    name: name.trim() || query,
    query,
    params,
    createdAt: Date.now(),
  };
  const updated = [newSearch, ...current];
  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_SEARCHES, JSON.stringify(updated));
  } catch {}
  return newSearch;
}

export function deleteSavedSearch(id: string): void {
  try {
    const updated = getSavedSearches().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_SEARCHES, JSON.stringify(updated));
  } catch {}
}

// --- Compare List (2-4 VNC records) ---
export function getCompareIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPARE_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleCompareId(id: number): number[] {
  const current = getCompareIds();
  let updated: number[];
  if (current.includes(id)) {
    updated = current.filter((i) => i !== id);
  } else {
    if (current.length >= 4) {
      updated = [...current.slice(1), id];
    } else {
      updated = [...current, id];
    }
  }
  try {
    localStorage.setItem(STORAGE_KEYS.COMPARE_LIST, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function clearCompare(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.COMPARE_LIST);
  } catch {}
}
