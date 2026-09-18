import { ApiVncRecord, NormalizedVnc } from '../types';

// Convert ISO 3166-1 alpha-2 code to Flag Emoji
export function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const code = countryCode.toUpperCase();
  const first = code.charCodeAt(0) - 65 + 0x1f1e6;
  const second = code.charCodeAt(1) - 65 + 0x1f1e6;
  if (first < 0x1f1e6 || first > 0x1f1ff || second < 0x1f1e6 || second > 0x1f1ff) {
    return '🌐';
  }
  return String.fromCodePoint(first, second);
}

// Common country code to English name lookup
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  CN: 'China',
  DE: 'Germany',
  RU: 'Russia',
  FR: 'France',
  GB: 'United Kingdom',
  JP: 'Japan',
  KR: 'South Korea',
  IT: 'Italy',
  NL: 'Netherlands',
  CA: 'Canada',
  BR: 'Brazil',
  AU: 'Australia',
  ES: 'Spain',
  PL: 'Poland',
  RO: 'Romania',
  UA: 'Ukraine',
  IN: 'India',
  SG: 'Singapore',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  SE: 'Sweden',
  CH: 'Switzerland',
  AT: 'Austria',
  CZ: 'Czech Republic',
  FI: 'Finland',
  NO: 'Norway',
  DK: 'Denmark',
  BE: 'Belgium',
  IE: 'Ireland',
  TR: 'Turkey',
  MX: 'Mexico',
  ZA: 'South Africa',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  TH: 'Thailand',
  VN: 'Vietnam',
  ID: 'Indonesia',
  MY: 'Malaysia',
  PH: 'Philippines',
  NZ: 'New Zealand',
  PT: 'Portugal',
  GR: 'Greece',
  HU: 'Hungary',
  BG: 'Bulgaria',
  IL: 'Israel',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
};

export function getCountryName(code: string | null | undefined): string {
  if (!code) return 'Unknown';
  const upper = code.toUpperCase();
  return COUNTRY_NAMES[upper] || upper;
}

// Aspect ratio calculation using GCD
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height || width <= 0 || height <= 0) return 'Unknown';
  
  // Approximate standard ratios first
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.02) return '16:9';
  if (Math.abs(ratio - 4 / 3) < 0.02) return '4:3';
  if (Math.abs(ratio - 16 / 10) < 0.02 || Math.abs(ratio - 8 / 5) < 0.02) return '16:10';
  if (Math.abs(ratio - 5 / 4) < 0.02) return '5:4';
  if (Math.abs(ratio - 21 / 9) < 0.05) return '21:9';
  if (Math.abs(ratio - 1) < 0.01) return '1:1';

  const divisor = gcd(Math.round(width), Math.round(height));
  const wRatio = Math.round(width / divisor);
  const hRatio = Math.round(height / divisor);
  if (wRatio > 50 || hRatio > 50) {
    return `${(width / height).toFixed(2)}:1`;
  }
  return `${wRatio}:${hRatio}`;
}

// Human-readable scan age
export function formatScanAge(timestampSec: number): string {
  if (!timestampSec) return 'Unknown age';
  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = Math.max(0, nowSec - timestampSec);

  const minutes = Math.floor(diffSec / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (diffSec < 60) return 'Scanned just now';
  if (minutes < 60) return `Scanned ${minutes} min ago`;
  if (hours < 24) return `Scanned ${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
  if (days === 1) return 'Scanned yesterday';
  if (days < 30) return `Scanned ${days} days ago`;
  if (months < 12) return `Scanned ${months} ${months === 1 ? 'month' : 'months'} ago`;
  return `Scanned ${years} ${years === 1 ? 'year' : 'years'} ago`;
}

// Format full UTC date
export function formatUtcDate(timestampSec: number): string {
  if (!timestampSec) return '—';
  const d = new Date(timestampSec * 1000);
  return d.toUTCString();
}

// Parse ASN into AS Number + Organization
export function parseAsn(asnString: string | null | undefined): { code: string; org: string } {
  if (!asnString) return { code: 'Unknown', org: 'Unknown' };
  const match = asnString.match(/^(AS\d+)\s*(.*)$/i);
  if (match) {
    return {
      code: match[1].toUpperCase(),
      org: match[2].trim() || 'Unknown Org',
    };
  }
  return {
    code: asnString.startsWith('AS') ? asnString : `AS${asnString}`,
    org: 'Unknown Org',
  };
}

// Transform raw API VNC record to internal normalized model
export function normalizeVncRecord(raw: ApiVncRecord): NormalizedVnc {
  const scannedTimestamp = raw.scanned_on || 0;
  const scannedDate = new Date(scannedTimestamp * 1000);
  const { code: asnCode, org: asnOrg } = parseAsn(raw.asn);
  const countryCode = (raw.geo_country || '').toUpperCase();
  const countryFlag = getCountryFlag(countryCode);
  const countryName = getCountryName(countryCode);
  const width = raw.width || 0;
  const height = raw.height || 0;

  return {
    id: raw.id,
    scannedTimestamp,
    scannedDate,
    formattedDate: formatUtcDate(scannedTimestamp),
    scanAgeHuman: formatScanAge(scannedTimestamp),
    ipAddress: raw.ip_address || '',
    rdnsHostname: raw.rdns_hostname || null,
    port: raw.port || 5900,
    asn: raw.asn || 'Unknown',
    asnCode,
    asnOrg,
    countryCode,
    countryName,
    countryFlag,
    state: raw.geo_state || '',
    city: raw.geo_city || '',
    desktopName: raw.desktop_name || null,
    width,
    height,
    resolution: width && height ? `${width} × ${height}` : 'Unknown',
    aspectRatio: calculateAspectRatio(width, height),
    hasPassword: Boolean(raw.password && raw.password.trim().length > 0),
    raw,
  };
}
