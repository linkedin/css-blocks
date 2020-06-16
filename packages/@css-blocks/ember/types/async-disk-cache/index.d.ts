declare module 'async-disk-cache' {
  namespace AsyncDiskCache {
    export interface Options {
      location?: string | undefined;
      compression?: 'deflate';
    }
  }

  interface CacheEntry<T> {
    isCached: boolean;
    value: T;
  }

  class AsyncDiskCache {
    root: string;
    constructor(cacheKey: string, options: AsyncDiskCache.Options)
    get<T>(key: string): Promise<CacheEntry<T>>;
    set<T>(key: string, value: T): Promise<void>;
  }
  export = AsyncDiskCache;
}