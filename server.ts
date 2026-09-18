import 'dotenv/config';
import express from 'express';
import path from 'path';
import net from 'net';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for API requests to minimize load on computernewb.com and respect rate limits
interface CacheEntry {
  data: any;
  cachedAt: number;
  ttlMs: number;
}
const apiCache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > entry.ttlMs) {
    apiCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any, ttlMs: number) {
  apiCache.set(key, { data, cachedAt: Date.now(), ttlMs });
  // Prune cache if oversized
  if (apiCache.size > 1000) {
    const oldestKey = apiCache.keys().next().value;
    if (oldestKey) apiCache.delete(oldestKey);
  }
}

// Diagnostics log store for the API diagnostics view
export interface DiagnosticLog {
  id: string;
  timestamp: number;
  endpoint: string;
  status: number | string;
  durationMs: number;
  cacheHit: boolean;
  resultCount?: number;
  error?: string | null;
}
const recentDiagnostics: DiagnosticLog[] = [];

function recordDiagnostic(diag: DiagnosticLog) {
  recentDiagnostics.unshift(diag);
  if (recentDiagnostics.length > 50) {
    recentDiagnostics.pop();
  }
}

// IP validation to prevent SSRF
function isPrivateOrReservedIp(ip: string): boolean {
  // Check IPv4
  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) {
    // If not standard IPv4, reject for safety
    return true;
  }
  const octets = ipv4Match.slice(1, 5).map(Number);
  if (octets.some(o => o < 0 || o > 255)) return true;

  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  if (a >= 224) return true; // Multicast & broadcast
  return false;
}

// --- Safe Non-Intrusive Live Connectivity Check Helper ---
export interface ReachabilityResult {
  status: 'reachable' | 'port_reachable' | 'not_reachable' | 'unavailable';
  tcpConnected: boolean;
  rfbHandshake: boolean;
  banner?: string;
  latencyMs?: number;
  error?: string;
  checkedAt: number;
}

export function checkTargetReachability(ip: string, port: number, timeoutMs = 2500): Promise<ReachabilityResult> {
  return new Promise((resolve) => {
    if (!ip || isNaN(port) || port < 1 || port > 65535) {
      return resolve({
        status: 'unavailable',
        tcpConnected: false,
        rfbHandshake: false,
        error: 'Invalid IP address or port',
        checkedAt: Date.now(),
      });
    }

    if (isPrivateOrReservedIp(ip)) {
      return resolve({
        status: 'unavailable',
        tcpConnected: false,
        rfbHandshake: false,
        error: 'Prohibited target address (private/internal range)',
        checkedAt: Date.now(),
      });
    }

    const startTime = Date.now();
    let finished = false;
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    const finish = (result: Omit<ReachabilityResult, 'checkedAt'>) => {
      if (finished) return;
      finished = true;
      try {
        socket.destroy();
      } catch {}
      resolve({
        ...result,
        checkedAt: Date.now(),
      });
    };

    let tcpConnected = false;
    let connectLatency = 0;

    socket.connect(port, ip, () => {
      tcpConnected = true;
      connectLatency = Date.now() - startTime;
    });

    socket.on('data', (data) => {
      const banner = data.toString('utf-8').trim();
      if (banner.startsWith('RFB ')) {
        finish({
          status: 'reachable',
          tcpConnected: true,
          rfbHandshake: true,
          banner: banner.slice(0, 32),
          latencyMs: connectLatency || (Date.now() - startTime),
        });
      } else {
        finish({
          status: 'port_reachable',
          tcpConnected: true,
          rfbHandshake: false,
          banner: banner.slice(0, 32),
          latencyMs: connectLatency || (Date.now() - startTime),
          error: 'Non-RFB protocol response',
        });
      }
    });

    socket.on('timeout', () => {
      if (tcpConnected) {
        finish({
          status: 'port_reachable',
          tcpConnected: true,
          rfbHandshake: false,
          latencyMs: connectLatency,
          error: 'TCP connected; VNC/RFB handshake timed out',
        });
      } else {
        finish({
          status: 'not_reachable',
          tcpConnected: false,
          rfbHandshake: false,
          error: 'Connection timed out',
        });
      }
    });

    socket.on('error', (err: any) => {
      let message = 'Connection failed';
      if (err?.code === 'ECONNREFUSED') {
        message = 'Connection refused';
      } else if (err?.code === 'EHOSTUNREACH' || err?.code === 'ENETUNREACH') {
        message = 'Host unreachable';
      } else if (err?.code === 'ETIMEDOUT') {
        message = 'Connection timed out';
      } else if (err?.message) {
        message = err.message;
      }

      finish({
        status: 'not_reachable',
        tcpConnected: false,
        rfbHandshake: false,
        error: message,
      });
    });
  });
}

// Pool of verified connectable endpoints discovered during sessions
const verifiedConnectablePool: Array<{ record: any; liveCheck: ReachabilityResult; addedAt: number }> = [];

async function fetchOneRandomCandidate(): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch('https://computernewb.com/vncresolver/api/v1/random', {
      signal: controller.signal,
      headers: { 'User-Agent': 'VNC-Resolver-Explorer/1.0' },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function findRandomConnectableVnc(maxBatches = 8): Promise<{ record: any; liveCheck: ReachabilityResult } | null> {
  // 1. Check pool first (within 3 minutes old)
  const now = Date.now();
  while (verifiedConnectablePool.length > 0) {
    const popped = verifiedConnectablePool.shift();
    if (popped && now - popped.addedAt < 3 * 60 * 1000) {
      // Re-verify with fast 1.5s check
      const recheck = await checkTargetReachability(popped.record.ip_address, popped.record.port, 1500);
      if (recheck.tcpConnected) {
        return { record: popped.record, liveCheck: recheck };
      }
    }
  }

  // 2. Fetch candidates in concurrent batches of 3
  for (let batch = 0; batch < maxBatches; batch++) {
    const candidates = await Promise.all([
      fetchOneRandomCandidate(),
      fetchOneRandomCandidate(),
      fetchOneRandomCandidate(),
    ]);

    const validCandidates = candidates.filter((c): c is NonNullable<typeof c> => Boolean(c && c.ip_address && c.port));
    if (validCandidates.length === 0) continue;

    const probeResults = await Promise.all(
      validCandidates.map(async (c) => {
        const liveCheck = await checkTargetReachability(c.ip_address, c.port, 2500);
        return { record: c, liveCheck };
      })
    );

    const connectables = probeResults.filter((p) => p.liveCheck.tcpConnected);
    if (connectables.length > 0) {
      const selected = connectables[0];
      // Save any additional connectable candidates to pool for fast subsequent requests
      for (let i = 1; i < connectables.length; i++) {
        verifiedConnectablePool.push({ ...connectables[i], addedAt: Date.now() });
      }
      return selected;
    }
  }

  return null;
}

// --- Health ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// --- API Diagnostics log ---
app.get('/api/diagnostics/logs', (req, res) => {
  res.json({ logs: recentDiagnostics });
});

// --- Computernewb Proxy: Stats ---
app.get('/api/proxy/stats', async (req, res) => {
  const cacheKey = 'stats';
  const cached = getCached(cacheKey);
  const startTime = Date.now();

  if (cached) {
    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: '/api/v1/stats',
      status: 200,
      durationMs: Date.now() - startTime,
      cacheHit: true,
      resultCount: 1,
    });
    return res.json({ ...cached, _fromCache: true });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    // Primary endpoint: /api/v1/stats
    let response = await fetch('https://computernewb.com/vncresolver/api/v1/stats', {
      signal: controller.signal,
      headers: { 'User-Agent': 'VNC-Resolver-Explorer/1.0' },
    });

    if (!response.ok) {
      // Fallback
      response = await fetch('https://computernewb.com/vncresolver/api/stats', {
        signal: controller.signal,
        headers: { 'User-Agent': 'VNC-Resolver-Explorer/1.0' },
      });
    }
    clearTimeout(timeout);

    const durationMs = Date.now() - startTime;
    if (!response.ok) {
      const errorText = `HTTP ${response.status} ${response.statusText}`;
      recordDiagnostic({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        endpoint: '/api/v1/stats',
        status: response.status,
        durationMs,
        cacheHit: false,
        error: errorText,
      });
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    setCache(cacheKey, data, 60 * 1000); // 60s cache
    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: '/api/v1/stats',
      status: 200,
      durationMs,
      cacheHit: false,
      resultCount: 1,
    });
    res.json(data);
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: '/api/v1/stats',
      status: 'Error',
      durationMs,
      cacheHit: false,
      error: err?.message || 'Network error',
    });
    res.status(502).json({ error: 'Failed to reach VNC Resolver API', details: err?.message });
  }
});

// --- Computernewb Proxy: Random ---
app.get('/api/proxy/random', async (req, res) => {
  const onlyConnectable = req.query.connectable === 'true' || req.query.only_connectable === 'true';

  if (onlyConnectable) {
    const startTime = Date.now();
    try {
      const match = await findRandomConnectableVnc(8);
      const durationMs = Date.now() - startTime;
      if (match) {
        recordDiagnostic({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          endpoint: '/api/v1/random?connectable=true',
          status: 200,
          durationMs,
          cacheHit: false,
          resultCount: 1,
        });
        return res.json({
          ...match.record,
          liveCheck: match.liveCheck,
        });
      } else {
        return res.status(504).json({
          error: 'Could not find a connectable VNC after testing multiple candidate records. Please try again.',
        });
      }
    } catch (err: any) {
      return res.status(502).json({
        error: 'Failed to find connectable VNC',
        details: err?.message,
      });
    }
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch('https://computernewb.com/vncresolver/api/v1/random', {
      signal: controller.signal,
      headers: { 'User-Agent': 'VNC-Resolver-Explorer/1.0' },
    });
    clearTimeout(timeout);

    const durationMs = Date.now() - startTime;
    if (!response.ok) {
      const errorText = `HTTP ${response.status} ${response.statusText}`;
      recordDiagnostic({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        endpoint: '/api/v1/random',
        status: response.status,
        durationMs,
        cacheHit: false,
        error: errorText,
      });
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    if (data?.id) {
      // Also cache this individual record by ID
      setCache(`id:${data.id}`, data, 300 * 1000);
    }

    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: '/api/v1/random',
      status: 200,
      durationMs,
      cacheHit: false,
      resultCount: 1,
    });
    res.json(data);
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: '/api/v1/random',
      status: 'Error',
      durationMs,
      cacheHit: false,
      error: err?.message || 'Network error',
    });
    res.status(502).json({ error: 'Failed to fetch random VNC', details: err?.message });
  }
});

// --- Computernewb Proxy: ID ---
app.get('/api/proxy/id/:id', async (req, res) => {
  const { id } = req.params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return res.status(400).json({ error: 'Invalid VNC ID' });
  }

  const cacheKey = `id:${numId}`;
  const cached = getCached(cacheKey);
  const startTime = Date.now();

  if (cached) {
    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: `/api/v1/id/${numId}`,
      status: 200,
      durationMs: Date.now() - startTime,
      cacheHit: true,
      resultCount: 1,
    });
    return res.json({ ...cached, _fromCache: true });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`https://computernewb.com/vncresolver/api/v1/id/${numId}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VNC-Resolver-Explorer/1.0' },
    });
    clearTimeout(timeout);

    const durationMs = Date.now() - startTime;
    if (!response.ok) {
      const errorText = `HTTP ${response.status} ${response.statusText}`;
      recordDiagnostic({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        endpoint: `/api/v1/id/${numId}`,
        status: response.status,
        durationMs,
        cacheHit: false,
        error: errorText,
      });
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    setCache(cacheKey, data, 600 * 1000); // 10 minutes cache for static record

    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: `/api/v1/id/${numId}`,
      status: 200,
      durationMs,
      cacheHit: false,
      resultCount: 1,
    });
    res.json(data);
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: `/api/v1/id/${numId}`,
      status: 'Error',
      durationMs,
      cacheHit: false,
      error: err?.message || 'Network error',
    });
    res.status(502).json({ error: `Failed to fetch VNC #${numId}`, details: err?.message });
  }
});

// --- Computernewb Proxy: Search ---
app.get('/api/proxy/search', async (req, res) => {
  const { desktop_name, country, asn, full } = req.query;

  // Build documented query params only
  const params = new URLSearchParams();
  if (typeof desktop_name === 'string' && desktop_name.trim()) {
    params.set('desktop_name', desktop_name.trim());
  }
  if (typeof country === 'string' && country.trim()) {
    params.set('country', country.trim().toUpperCase());
  }
  if (typeof asn === 'string' && asn.trim()) {
    params.set('asn', asn.trim());
  }
  // Default to full=true for explorer if not explicitly false
  params.set('full', full === 'false' ? 'false' : 'true');

  const queryString = params.toString();
  const cacheKey = `search:${queryString}`;
  const cached = getCached(cacheKey);
  const startTime = Date.now();

  if (cached) {
    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: `/api/v1/search?${queryString}`,
      status: 200,
      durationMs: Date.now() - startTime,
      cacheHit: true,
      resultCount: Array.isArray(cached?.results) ? cached.results.length : 0,
    });
    return res.json({ ...cached, _fromCache: true });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const targetUrl = `https://computernewb.com/vncresolver/api/v1/search?${queryString}`;
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VNC-Resolver-Explorer/1.0' },
    });
    clearTimeout(timeout);

    const durationMs = Date.now() - startTime;
    if (!response.ok) {
      const errorText = `HTTP ${response.status} ${response.statusText}`;
      recordDiagnostic({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        endpoint: `/api/v1/search?${queryString}`,
        status: response.status,
        durationMs,
        cacheHit: false,
        error: errorText,
      });
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const resultList = data?.results || [];

    // Cache individual records found in results
    if (Array.isArray(resultList)) {
      resultList.forEach((item: any) => {
        if (item && item.id) {
          setCache(`id:${item.id}`, item, 600 * 1000);
        }
      });
    }

    setCache(cacheKey, data, 180 * 1000); // 3 minutes cache for search results

    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: `/api/v1/search?${queryString}`,
      status: 200,
      durationMs,
      cacheHit: false,
      resultCount: resultList.length,
    });
    res.json(data);
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    recordDiagnostic({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: `/api/v1/search?${queryString}`,
      status: 'Error',
      durationMs,
      cacheHit: false,
      error: err?.message || 'Network error',
    });
    res.status(502).json({ error: 'Search failed or timed out', details: err?.message });
  }
});

// --- Safe Non-Intrusive Live Connectivity Check ---
// Protocol compliance with Section 8:
// - TCP connection test to advertised port
// - RFB banner detection (VNC servers immediately transmit RFB 003.008\n or similar upon connection)
// - Latency measurement
// - STRICTLY stops immediately after basic reachability/protocol check
// - NO credentials, NO auth packets, NO keyboard/mouse, NO interaction
app.get('/api/check', async (req, res) => {
  const ip = req.query.ip as string;
  const portStr = req.query.port as string;
  const port = parseInt(portStr, 10);

  const result = await checkTargetReachability(ip, port, 3500);
  res.json(result);
});

// Batch check endpoint for rapid parallel connectivity analysis of search results
app.post('/api/check-batch', async (req, res) => {
  const targets = req.body?.targets;
  if (!Array.isArray(targets) || targets.length === 0) {
    return res.status(400).json({ error: 'targets array required' });
  }

  const slice = targets.slice(0, 100);
  const results: Record<string | number, ReachabilityResult> = {};
  const concurrency = 8;
  let index = 0;

  async function worker() {
    while (index < slice.length) {
      const item = slice[index++];
      if (item?.ip && item?.port) {
        const id = item.id ?? `${item.ip}:${item.port}`;
        results[id] = await checkTargetReachability(item.ip, item.port, 2500);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, slice.length) }, () => worker());
  await Promise.all(workers);
  res.json({ results });
});

// AI-powered Natural Language Prompt Parsing endpoint (Vietnamese & English)
let genAIClient: any = null;
function getGenAI() {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    try {
      genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.error('Failed to initialize GoogleGenAI:', err);
      genAIClient = null;
    }
  }
  return genAIClient;
}

app.post('/api/ai/parse-prompt', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt string required' });
  }

  const ai = getGenAI();
  if (!ai) {
    return res.json({
      fallback: true,
      message: 'Gemini API not configured, using client-side prompt parsing engine',
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json',
        systemInstruction: `You are the UNIVERSAL AI CLIENTNAME RESOLVER for a VNC (Virtual Network Computing) Server metadata database.
Your primary task is to convert a user's natural-language request (written in Vietnamese or English) into realistic clientname search candidates that are likely to exist in the VNC database.

FUNDAMENTAL RULE
NEVER assume that the user's keyword is the actual "clientname". The user describes what they want to find. The VNC database contains identifiers reported by actual VNC servers, applications, devices, operating systems, embedded systems, management software, vendor software, or other environments.

Therefore:
USER LANGUAGE -> USER INTENT -> TARGET/DOMAIN -> TECHNOLOGY/ECOSYSTEM -> LIKELY SOFTWARE/SERVER IDENTIFIERS -> CLIENTNAME CANDIDATES -> VNC SEARCH

1. UNIVERSAL SEMANTIC INTERPRETATION
Determine: What does the user actually want? What category does it belong to? What OS or embedded platform is commonly involved? What VNC server implementations expose it? What abbreviations or vendor platforms may appear as "clientname"? This applies to computers, servers, NAS, routers, cameras, industrial systems, POS, gaming, thin clients, etc.

2. EXAMPLES OF MENTAL MODEL
- User: "tìm camera". DO NOT search clientname=camera. Infer: nvr, dvr, ipc, ipcamera, surveillance.
- User: "tìm máy Windows". DO NOT search clientname=windows. Infer: realvnc, tightvnc, ultravnc, tigervnc, xrdp, mstsc.
- User: "tìm máy Linux". Infer: x11vnc, tigervnc, tightvnc, vino, vncserver, qemu.
- User: "tìm NAS". Infer: Synology, QNAP, TrueNAS.
- User: "tìm Raspberry Pi". Infer: x11vnc, tigervnc, realvnc, vncserver.
- User: "tìm máy POS". Infer: POS environments or vendor-specific identifiers.

3. DOMAIN -> ECOSYSTEM -> CLIENTNAME
Stage A: Domain (camera, networking, server, desktop, industrial, IoT, storage, POS, etc.)
Stage B: Ecosystem (Windows, Linux, Android, embedded Linux, vendor platform)
Stage C/D: Convert implementations into actual candidate strings.

4. DO NOT INVENT CLIENTNAMES
Every candidate should be a known software identifier (TigerVNC, x11vnc), protocol identifier (xrdp), device identifier (nvr, ipc), vendor identifier, or known abbreviation. If uncertain, lower confidence.

5. NEGATIVE CONSTRAINTS & MULTI-INTENT QUERIES
If user says "tìm máy Linux nhưng không phải camera", avoid nvr, dvr, ipc. If user says "camera Hikvision ở Việt Nam", intent=camera, vendor=Hikvision, location=VN.

6. RAW KEYWORD FALLBACK RULE
Only use the raw keyword directly if it is a known clientname or semantic expansion produces no candidates. DO NOT COPY RAW USER KEYWORD blindly.

7. EXACT SEARCH MODE
If user says "search exact clientname: x11vnc", then DO NOT reinterpret. exact_mode=true, search x11vnc.

8. INTERNAL OUTPUT FORMAT
You MUST respond ONLY with a valid JSON object matching this schema exactly. DO NOT wrap in markdown blocks.

{
  "raw_query": "...",
  "intent": "...",
  "domain": "...",
  "ecosystems": ["..."],
  "clientname_candidates": [
    {
      "value": "string (the actual desktop name to search for)",
      "confidence": 0.0,
      "reason": "...",
      "priority": 1
    }
  ],
  "fallback_terms": ["..."],
  "filters": {
    "country": "ISO 2-letter uppercase country code (e.g. VN, US, DE). Empty if none.",
    "asn": "Network provider or AS number (e.g. Viettel, AS7552). Empty if none.",
    "id": "Numeric ID if mentioned. Empty if none.",
    "port": "Port ('5900', '5901', 'nonstandard', or 'all').",
    "resolution": "Resolution string ('1080p', '720p', '480p', or 'all').",
    "auth": "'no_password', 'requires_password', or 'all'. 'no_password' if user says 'không mật khẩu', 'ko pass', 'mở', 'không bảo mật'.",
    "live": "'reachable' or 'all'. 'reachable' if user says 'kết nối được', 'live', 'online', 'đang chạy', 'sống'."
  },
  "exact_mode": false,
  "explanationVi": "Brief explanation in Vietnamese of your semantic expansion and filters extracted (max 20 words)."
}`
      },
      contents: `User query: "${prompt.replace(/"/g, '\\"')}"`,
    });

    let rawText = response.text ? response.text.trim() : '';
    // Strip markdown formatting if any
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(rawText);
    
    // Map the Universal Resolver format to the frontend's flat format
    let topCandidate = '';
    if (parsed.exact_mode && parsed.raw_query) {
      // Very basic extraction if exact mode is requested
      const exactMatch = parsed.raw_query.match(/exact(?:ly)?\s*(?:clientname)?\s*:\s*([^\s]+)/i);
      if (exactMatch) topCandidate = exactMatch[1];
    }
    
    if (!topCandidate) {
      topCandidate = parsed.clientname_candidates && parsed.clientname_candidates.length > 0
        ? parsed.clientname_candidates[0].value 
        : (parsed.fallback_terms && parsed.fallback_terms.length > 0 ? parsed.fallback_terms[0] : '');
    }

    const legacyFormat = {
      success: true,
      desktop: topCandidate,
      country: parsed.filters?.country || '',
      asn: parsed.filters?.asn || '',
      id: parsed.filters?.id || '',
      port: parsed.filters?.port || 'all',
      resolution: parsed.filters?.resolution || 'all',
      auth: parsed.filters?.auth || 'all',
      live: parsed.filters?.live || 'all',
      explanationVi: parsed.explanationVi || '',
      _resolverContext: parsed
    };

    res.json(legacyFormat);
  } catch (err: any) {
    res.json({
      fallback: true,
      error: err?.message,
    });
  }
});

// Start server with Vite middleware in dev or static files in production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VNC Resolver Explorer server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
