declare module 'sync-disk-cache' {
  namespace SyncDiskCache {
    export interface Options {
      location?: string | undefined;
    }
  }

  interface CacheEntry<T> {
    isCached: boolean;
    value: T;
  }

  class SyncDiskCache {
    root: string;
    constructor(cacheKey: string, options: SyncDiskCache.Options)
    get<T>(key: string): CacheEntry<T>;
    set<T>(key: string, value: T): void;
  }
  export = SyncDiskCache;
}