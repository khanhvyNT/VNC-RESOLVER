/**
 * Types for VNC Resolver Explorer
 */

// Original API VNC record shape returned by computernewb.com/vncresolver
export interface ApiVncRecord {
  id: number;
  scanned_on: number;
  ip_address: string;
  rdns_hostname: string | null;
  port: number;
  asn: string;
  geo_country: string;
  geo_state: string;
  geo_city: string;
  desktop_name: string | null;
  width: number;
  height: number;
  password?: string;
  _fromCache?: boolean;
  liveCheck?: LiveCheckResult;
}

export interface ApiStatsResponse {
  nr_vncs: number;
  status: string;
  _fromCache?: boolean;
}

export interface ApiSearchResponse {
  results: ApiVncRecord[];
  _fromCache?: boolean;
}

// Normalized internal VNC model
export interface NormalizedVnc {
  id: number;
  scannedTimestamp: number;
  scannedDate: Date;
  formattedDate: string;
  scanAgeHuman: string;
  ipAddress: string;
  rdnsHostname: string | null;
  port: number;
  asn: string;
  asnCode: string;
  asnOrg: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  state: string;
  city: string;
  desktopName: string | null;
  width: number;
  height: number;
  resolution: string;
  aspectRatio: string;
  hasPassword?: boolean;
  // Preserved original raw object
  raw: ApiVncRecord;
}

// Live Connection Check state
export type LiveCheckStatus = 'idle' | 'checking' | 'reachable' | 'port_reachable' | 'not_reachable' | 'unavailable';

export interface LiveCheckResult {
  status: LiveCheckStatus;
  tcpConnected: boolean;
  rfbHandshake: boolean;
  banner?: string;
  latencyMs?: number;
  error?: string | null;
  checkedAt: number;
}

// Local user application metadata (stored separately in localStorage)
export interface SavedVncMetadata {
  vncId: number;
  savedAt: number;
  collections: string[];
  notes: string;
  cachedRecord?: ApiVncRecord;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  params: {
    desktop_name?: string;
    country?: string;
    asn?: string;
    vnc_id?: string;
  };
  createdAt: number;
}

// Navigation sections
export type NavigationSection = 'explore' | 'search' | 'random' | 'analytics' | 'saved' | 'detail';

// Diagnostics
export interface ApiDiagnosticEntry {
  id: string;
  timestamp: number;
  endpoint: string;
  status: number | string;
  durationMs: number;
  cacheHit: boolean;
  resultCount?: number;
  error?: string | null;
}
