import {
  ApiVncRecord,
  ApiStatsResponse,
  ApiSearchResponse,
  LiveCheckResult,
  ApiDiagnosticEntry,
} from '../types';

interface CacheItem<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Check if running inside Capacitor or native Android/iOS wrapper
 */
export function isNativeMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any)?.Capacitor?.isNativePlatform?.() ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && !window.location.port && window.location.protocol.startsWith('http'))
  );
}

/**
 * Resolve API URL for both web browser and Capacitor/Android native environments.
 * On Android, if no custom server is specified, connects directly to Computernewb.com (CORS enabled).
 */
export function resolveApiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('vnc_custom_server_url');
    if (customUrl && customUrl.trim()) {
      return `${customUrl.trim().replace(/\/$/, '')}${path}`;
    }

    if (isNativeMobile()) {
      if (path.startsWith('/api/proxy/')) {
        const subPath = path.replace(/^\/api\/proxy\//, '');
        return `https://computernewb.com/vncresolver/api/v1/${subPath}`;
      }
    }
  }
  return path;
}

// Client-side in-memory repository
class VncRepository {
  private cache = new Map<string, CacheItem<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private diagnostics: ApiDiagnosticEntry[] = [];
  private rateLimitWaitUntil: number = 0;
  private subscribers: Array<(logs: ApiDiagnosticEntry[]) => void> = [];

  // Subscribe to diagnostics updates
  public subscribeDiagnostics(cb: (logs: ApiDiagnosticEntry[]) => void): () => void {
    this.subscribers.push(cb);
    cb([...this.diagnostics]);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private emitDiagnostics() {
    const list = [...this.diagnostics];
    this.subscribers.forEach((cb) => cb(list));
  }

  private addDiagnostic(entry: Omit<ApiDiagnosticEntry, 'id'>) {
    const newEntry: ApiDiagnosticEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
    };
    this.diagnostics.unshift(newEntry);
    if (this.diagnostics.length > 50) {
      this.diagnostics.pop();
    }
    this.emitDiagnostics();
  }

  public getDiagnostics(): ApiDiagnosticEntry[] {
    return [...this.diagnostics];
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Centralized fetch executor with deduplication, retry, and rate-limit guard
   */
  private async executeFetch<T>(
    endpoint: string,
    cacheKey: string,
    ttlMs: number,
    abortSignal?: AbortSignal
  ): Promise<{ data: T; fromCache: boolean; cachedAt?: number }> {
    // 1. Check rate limit wait
    if (Date.now() < this.rateLimitWaitUntil) {
      const remainingSec = Math.ceil((this.rateLimitWaitUntil - Date.now()) / 1000);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
      }
      throw new Error(`Rate limit reached. Please wait ${remainingSec}s before retrying.`);
    }

    // 2. Check local client cache
    const cachedItem = this.cache.get(cacheKey);
    if (cachedItem && Date.now() < cachedItem.expiresAt) {
      this.addDiagnostic({
        timestamp: Date.now(),
        endpoint,
        status: 200,
        durationMs: 1,
        cacheHit: true,
        resultCount: Array.isArray((cachedItem.data as any)?.results)
          ? (cachedItem.data as any).results.length
          : 1,
      });
      return { data: cachedItem.data, fromCache: true, cachedAt: cachedItem.cachedAt };
    }

    // 3. Request Deduplication: if same request is already in flight, reuse its promise
    if (this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey)!;
    }

    // 4. Perform actual fetch with retry (up to 2 retries with exponential backoff)
    const fetchPromise = (async () => {
      const startTime = Date.now();
      let attempt = 0;
      const maxRetries = 2;
      let lastError: any = null;

      while (attempt <= maxRetries) {
        try {
          if (abortSignal?.aborted) {
            throw new Error('Request cancelled');
          }

          const targetUrl = resolveApiUrl(endpoint);
          let response: Response;
          try {
            response = await fetch(targetUrl, {
              signal: abortSignal,
              headers: { Accept: 'application/json' },
            });
          } catch (networkErr: any) {
            // Automatic failover: If the primary request failed with network error / Failed to fetch,
            // and it was trying a proxy path or custom server, immediately attempt direct Computernewb fallback!
            if (endpoint.startsWith('/api/proxy/') && !targetUrl.includes('computernewb.com')) {
              const fallbackUrl = `https://computernewb.com/vncresolver/api/v1/${endpoint.replace(/^\/api\/proxy\//, '')}`;
              response = await fetch(fallbackUrl, {
                signal: abortSignal,
                headers: { Accept: 'application/json' },
              });
            } else {
              throw networkErr;
            }
          }

          const durationMs = Date.now() - startTime;

          // Handle 429 Rate Limit
          if (response.status === 429) {
            this.rateLimitWaitUntil = Date.now() + 15000; // back off 15s
            const errText = 'Rate limit reached. Please wait before retrying.';
            this.addDiagnostic({
              timestamp: Date.now(),
              endpoint,
              status: 429,
              durationMs,
              cacheHit: false,
              error: errText,
            });

            // If stale cache exists, return it!
            if (cachedItem) {
              return { data: cachedItem.data, fromCache: true, cachedAt: cachedItem.cachedAt };
            }
            throw new Error(errText);
          }

          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            const errText = errBody.error || `HTTP ${response.status} ${response.statusText}`;
            this.addDiagnostic({
              timestamp: Date.now(),
              endpoint,
              status: response.status,
              durationMs,
              cacheHit: false,
              error: errText,
            });

            if (cachedItem) {
              return { data: cachedItem.data, fromCache: true, cachedAt: cachedItem.cachedAt };
            }
            throw new Error(errText);
          }

          const data = await response.json();
          const resultCount = Array.isArray(data?.results) ? data.results.length : 1;

          this.addDiagnostic({
            timestamp: Date.now(),
            endpoint,
            status: 200,
            durationMs,
            cacheHit: false,
            resultCount,
          });

          // Store in client cache
          const cachedAt = Date.now();
          this.cache.set(cacheKey, {
            data,
            cachedAt,
            expiresAt: cachedAt + ttlMs,
          });

          return { data, fromCache: false, cachedAt };
        } catch (err: any) {
          lastError = err;
          if (err.name === 'AbortError' || err.message === 'Request cancelled') {
            throw err;
          }
          attempt++;
          if (attempt <= maxRetries) {
            // Exponential backoff: 300ms, 800ms
            await new Promise((res) => setTimeout(res, attempt * 400));
          }
        }
      }

      // If all retries failed, fallback to stale cache if available
      if (cachedItem) {
        return { data: cachedItem.data, fromCache: true, cachedAt: cachedItem.cachedAt };
      }

      this.addDiagnostic({
        timestamp: Date.now(),
        endpoint,
        status: 'Error',
        durationMs: Date.now() - startTime,
        cacheHit: false,
        error: lastError?.message || 'API request failed',
      });

      throw lastError || new Error('API request failed');
    })();

    this.inFlightRequests.set(cacheKey, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.inFlightRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch backend stats
   */
  public async getStats(signal?: AbortSignal): Promise<{ data: ApiStatsResponse; fromCache: boolean; cachedAt?: number }> {
    return this.executeFetch<ApiStatsResponse>(
      '/api/proxy/stats',
      'stats',
      60 * 1000, // 60s
      signal
    );
  }

  /**
   * Fetch random VNC server
   * When connectable=true (default), only returns an endpoint confirmed reachable via live TCP/RFB handshake
   */
  public async getRandomVnc(
    options?: { connectable?: boolean; signal?: AbortSignal } | AbortSignal
  ): Promise<{ data: ApiVncRecord; fromCache: boolean }> {
    let connectable = true;
    let signal: AbortSignal | undefined;

    if (options instanceof AbortSignal) {
      signal = options;
    } else if (options) {
      if (options.connectable !== undefined) connectable = options.connectable;
      signal = options.signal;
    }

    const startTime = Date.now();
    try {
      let url = resolveApiUrl(connectable ? '/api/proxy/random?connectable=true' : '/api/proxy/random');
      // If querying Computernewb directly, the official endpoint is /api/v1/random
      if (url.includes('computernewb.com')) {
        url = 'https://computernewb.com/vncresolver/api/v1/random';
      }

      let res: Response;
      try {
        res = await fetch(url, {
          signal,
          headers: { Accept: 'application/json' },
        });
      } catch (netErr) {
        // Fallback to direct official API if local proxy failed
        res = await fetch('https://computernewb.com/vncresolver/api/v1/random', {
          signal,
          headers: { Accept: 'application/json' },
        });
      }
      const durationMs = Date.now() - startTime;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || `HTTP ${res.status}`;
        this.addDiagnostic({
          timestamp: Date.now(),
          endpoint: connectable ? '/api/v1/random?connectable=true' : '/api/v1/random',
          status: res.status,
          durationMs,
          cacheHit: false,
          error: msg,
        });
        throw new Error(msg);
      }
      const data = await res.json();
      this.addDiagnostic({
        timestamp: Date.now(),
        endpoint: connectable ? '/api/v1/random?connectable=true' : '/api/v1/random',
        status: 200,
        durationMs,
        cacheHit: false,
        resultCount: 1,
      });

      // Cache this record by ID
      if (data?.id) {
        this.cache.set(`id:${data.id}`, {
          data,
          cachedAt: Date.now(),
          expiresAt: Date.now() + 600 * 1000,
        });
      }

      return { data, fromCache: false };
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        this.addDiagnostic({
          timestamp: Date.now(),
          endpoint: connectable ? '/api/v1/random?connectable=true' : '/api/v1/random',
          status: 'Error',
          durationMs: Date.now() - startTime,
          cacheHit: false,
          error: err.message,
        });
      }
      throw err;
    }
  }

  /**
   * Fetch VNC by ID
   */
  public async getVncById(id: number, signal?: AbortSignal): Promise<{ data: ApiVncRecord; fromCache: boolean; cachedAt?: number }> {
    return this.executeFetch<ApiVncRecord>(
      `/api/proxy/id/${id}`,
      `id:${id}`,
      600 * 1000, // 10 minutes cache
      signal
    );
  }

  /**
   * Search VNC records with documented parameters
   */
  public async searchVncs(
    params: {
      desktop_name?: string;
      country?: string;
      asn?: string;
      full?: boolean;
    },
    signal?: AbortSignal
  ): Promise<{ data: ApiSearchResponse; fromCache: boolean; cachedAt?: number }> {
    const searchParams = new URLSearchParams();
    if (params.desktop_name) searchParams.set('desktop_name', params.desktop_name);
    if (params.country) searchParams.set('country', params.country.toUpperCase());
    if (params.asn) searchParams.set('asn', params.asn);
    searchParams.set('full', params.full === false ? 'false' : 'true');

    const queryString = searchParams.toString();
    const endpoint = `/api/proxy/search?${queryString}`;
    const cacheKey = `search:${queryString}`;

    const res = await this.executeFetch<ApiSearchResponse>(
      endpoint,
      cacheKey,
      180 * 1000, // 3 min cache
      signal
    );

    // Also populate individual ID cache for quick drilldown
    if (Array.isArray(res.data?.results)) {
      res.data.results.forEach((item) => {
        if (item?.id) {
          this.cache.set(`id:${item.id}`, {
            data: item,
            cachedAt: Date.now(),
            expiresAt: Date.now() + 600 * 1000,
          });
        }
      });
    }

    return res;
  }

  /**
   * Safe Non-Intrusive Live Reachability Check
   * Calls /api/check?ip=...&port=...
   */
  public async checkLiveConnection(ip: string, port: number, signal?: AbortSignal): Promise<LiveCheckResult> {
    const customServer = typeof window !== 'undefined' ? localStorage.getItem('vnc_custom_server_url') : null;
    if (isNativeMobile() && !customServer) {
      return {
        status: 'unavailable',
        tcpConnected: false,
        rfbHandshake: false,
        error: 'Live TCP port test requires Bridge Server URL (configurable in Settings)',
        checkedAt: Date.now(),
      };
    }
    try {
      const res = await fetch(resolveApiUrl(`/api/check?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(port)}`), {
        signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          status: 'unavailable',
          tcpConnected: false,
          rfbHandshake: false,
          error: err.error || `HTTP ${res.status}`,
          checkedAt: Date.now(),
        };
      }
      const result: LiveCheckResult = await res.json();
      return result;
    } catch (err: any) {
      return {
        status: 'unavailable',
        tcpConnected: false,
        rfbHandshake: false,
        error: err?.message || 'Network error / connection check failed',
        checkedAt: Date.now(),
      };
    }
  }

  /**
   * Rapid batch connection check for search results
   */
  public async batchCheckConnections(
    targets: Array<{ id: number | string; ip: string; port: number }>,
    signal?: AbortSignal
  ): Promise<Record<string | number, LiveCheckResult>> {
    if (targets.length === 0) return {};
    const customServer = typeof window !== 'undefined' ? localStorage.getItem('vnc_custom_server_url') : null;
    if (isNativeMobile() && !customServer) {
      return {};
    }
    try {
      const res = await fetch(resolveApiUrl('/api/check-batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targets }),
        signal,
      });
      if (!res.ok) {
        throw new Error(`Batch check returned HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.results || {};
    } catch (err) {
      console.warn('Batch check endpoint failed or aborted, returning empty', err);
      return {};
    }
  }

  /**
   * AI-powered Natural Language Prompt Parsing
   */
  public async parsePromptAI(prompt: string): Promise<any> {
    const customServer = typeof window !== 'undefined' ? localStorage.getItem('vnc_custom_server_url') : null;
    if (isNativeMobile() && !customServer) {
      // Use local regex & keyword engine immediately
      return null;
    }
    try {
      const res = await fetch(resolveApiUrl('/api/ai/parse-prompt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}

// Singleton repository
export const vncRepo = new VncRepository();
