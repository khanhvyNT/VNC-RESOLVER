export interface ParsedPromptResult {
  rawPrompt: string;
  isNaturalLanguage: boolean;
  convertedQueryString: string;
  apiParams: {
    desktop?: string;
    country?: string;
    asn?: string;
    id?: string;
  };
  localFilters: {
    resolution: 'all' | '1080p' | '720p' | '480p' | 'custom';
    port: 'all' | '5900' | '5901' | 'nonstandard';
    auth: 'all' | 'no_password' | 'requires_password';
    live: 'all' | 'reachable' | 'offline';
  };
  tokens: Array<{
    type: 'country' | 'desktop' | 'asn' | 'id' | 'port' | 'resolution' | 'auth' | 'live';
    label: string;
    value: string;
  }>;
  aiContext?: any;
}

// Remove Vietnamese accents/diacritics for flexible fuzzy matching
export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Country mappings (Vietnamese and English)
const COUNTRY_MAP: Array<{ patterns: string[]; code: string; nameVi: string }> = [
  { patterns: ['viet nam', 'vietnam', 'vn'], code: 'VN', nameVi: 'Việt Nam' },
  { patterns: ['nhat ban', 'nhat', 'japan', 'jp'], code: 'JP', nameVi: 'Nhật Bản' },
  { patterns: ['my', 'hoa ky', 'usa', 'united states', 'us'], code: 'US', nameVi: 'Hoa Kỳ / Mỹ' },
  { patterns: ['duc', 'germany', 'de'], code: 'DE', nameVi: 'Đức' },
  { patterns: ['nga', 'russia', 'ru'], code: 'RU', nameVi: 'Nga' },
  { patterns: ['han quoc', 'han', 'korea', 'south korea', 'kr'], code: 'KR', nameVi: 'Hàn Quốc' },
  { patterns: ['trung quoc', 'trung', 'china', 'cn'], code: 'CN', nameVi: 'Trung Quốc' },
  { patterns: ['phap', 'france', 'fr'], code: 'FR', nameVi: 'Pháp' },
  { patterns: ['anh', 'vuong quoc anh', 'united kingdom', 'uk', 'gb'], code: 'GB', nameVi: 'Vương Quốc Anh' },
  { patterns: ['y', 'italia', 'italy', 'it'], code: 'IT', nameVi: 'Ý (Italy)' },
  { patterns: ['singapore', 'sing', 'sg'], code: 'SG', nameVi: 'Singapore' },
  { patterns: ['dai loan', 'taiwan', 'tw'], code: 'TW', nameVi: 'Đài Loan' },
  { patterns: ['thai lan', 'thailand', 'th'], code: 'TH', nameVi: 'Thái Lan' },
  { patterns: ['uc', 'australia', 'au'], code: 'AU', nameVi: 'Úc' },
  { patterns: ['ha lan', 'netherlands', 'nl'], code: 'NL', nameVi: 'Hà Lan' },
  { patterns: ['tay ban nha', 'spain', 'es'], code: 'ES', nameVi: 'Tây Ban Nha' },
  { patterns: ['canada', 'ca'], code: 'CA', nameVi: 'Canada' },
  { patterns: ['brazil', 'br'], code: 'BR', nameVi: 'Brazil' },
  { patterns: ['romania', 'ro'], code: 'RO', nameVi: 'Romania' },
  { patterns: ['ba lan', 'poland', 'pl'], code: 'PL', nameVi: 'Ba Lan' },
  { patterns: ['ukraine', 'ua'], code: 'UA', nameVi: 'Ukraine' },
  { patterns: ['an do', 'india', 'in'], code: 'IN', nameVi: 'Ấn Độ' },
  { patterns: ['thuy si', 'switzerland', 'ch'], code: 'CH', nameVi: 'Thụy Sĩ' },
  { patterns: ['thuy dien', 'sweden', 'se'], code: 'SE', nameVi: 'Thụy Điển' },
  { patterns: ['tho nhi ky', 'turkey', 'tr'], code: 'TR', nameVi: 'Thổ Nhĩ Kỳ' },
  { patterns: ['indonesia', 'id'], code: 'ID', nameVi: 'Indonesia' },
  { patterns: ['malaysia', 'my'], code: 'MY', nameVi: 'Malaysia' },
  { patterns: ['philippines', 'ph'], code: 'PH', nameVi: 'Philippines' },
];

// Common known desktop / OS identifiers
const DESKTOP_PATTERNS: Array<{ pattern: RegExp; desktopName: string }> = [
  { pattern: /\b(?:windows\s*11|win\s*11)\b/i, desktopName: 'Windows 11' },
  { pattern: /\b(?:windows\s*10|win\s*10)\b/i, desktopName: 'Windows 10' },
  { pattern: /\b(?:windows\s*7|win\s*7)\b/i, desktopName: 'Windows 7' },
  { pattern: /\b(?:windows|win)\b/i, desktopName: 'Windows' },
  { pattern: /\b(?:hmi)\b/i, desktopName: 'HMI' },
  { pattern: /\b(?:plc)\b/i, desktopName: 'PLC' },
  { pattern: /\b(?:scada)\b/i, desktopName: 'SCADA' },
  { pattern: /\b(?:ubuntu)\b/i, desktopName: 'Ubuntu' },
  { pattern: /\b(?:linux)\b/i, desktopName: 'Linux' },
  { pattern: /\b(?:macos|mac\s*os|macintosh)\b/i, desktopName: 'Mac' },
  { pattern: /\b(?:server)\b/i, desktopName: 'Server' },
  { pattern: /\b(?:qemu)\b/i, desktopName: 'QEMU' },
  { pattern: /\b(?:xfce)\b/i, desktopName: 'XFCE' },
  { pattern: /\b(?:kde)\b/i, desktopName: 'KDE' },
  { pattern: /\b(?:gnome)\b/i, desktopName: 'GNOME' },
  { pattern: /\b(?:raspberry|raspbian)\b/i, desktopName: 'Raspberry' },
  { pattern: /\b(?:android)\b/i, desktopName: 'Android' },
];

/**
 * Intelligent Auto-Prompt Parser for natural language queries in Vietnamese & English.
 * Translates queries like "tìm vnc ở nhật bản cổng 5900 desktop windows"
 * into structured API parameters and local filters.
 */
export function parseNaturalPrompt(input: string): ParsedPromptResult {
  const raw = input.trim();
  if (!raw) {
    return {
      rawPrompt: '',
      isNaturalLanguage: false,
      convertedQueryString: '',
      apiParams: {},
      localFilters: {
        resolution: 'all',
        port: 'all',
        auth: 'all',
        live: 'all',
      },
      tokens: [],
    };
  }

  // Check if query is already strictly using prefix syntax (e.g. "country:JP port:5900")
  const hasPrefixSyntax = /\b(country|desktop|asn|id|port|res|resolution):/i.test(raw);

  const normalized = removeVietnameseTones(raw.toLowerCase());
  let workingText = normalized;

  const tokens: ParsedPromptResult['tokens'] = [];
  const apiParams: ParsedPromptResult['apiParams'] = {};
  const localFilters: ParsedPromptResult['localFilters'] = {
    resolution: 'all',
    port: 'all',
    auth: 'all',
    live: 'all',
  };

  // 1. Direct ID extraction (#12345 or "id 12345" or "ma 12345" or isolated 7-9 digit number)
  const idMatch = raw.match(/(?:#|id\s*:?\s*|ma\s*:?\s*)(\d{5,10})\b/i);
  if (idMatch) {
    apiParams.id = idMatch[1];
    tokens.push({ type: 'id', label: 'Mã ID', value: idMatch[1] });
    workingText = workingText.replace(new RegExp(idMatch[0].toLowerCase(), 'g'), ' ');
  } else if (/^\d{6,9}$/.test(raw)) {
    apiParams.id = raw;
    tokens.push({ type: 'id', label: 'Mã ID', value: raw });
  }

  // 2. Port extraction ("cong 5900", "port 5900", "cong 5901", "port 5901", "5900", "5901")
  const portMatch = workingText.match(/\b(?:cong|port)\s*:?\s*(\d{2,5})\b/i);
  if (portMatch) {
    const portVal = portMatch[1];
    if (portVal === '5900') localFilters.port = '5900';
    else if (portVal === '5901') localFilters.port = '5901';
    else localFilters.port = 'nonstandard';
    tokens.push({ type: 'port', label: 'Cổng Port', value: portVal });
    workingText = workingText.replace(portMatch[0], ' ');
  } else if (/\b5900\b/.test(workingText)) {
    localFilters.port = '5900';
    tokens.push({ type: 'port', label: 'Cổng Port', value: '5900' });
    workingText = workingText.replace(/\b5900\b/, ' ');
  } else if (/\b5901\b/.test(workingText)) {
    localFilters.port = '5901';
    tokens.push({ type: 'port', label: 'Cổng Port', value: '5901' });
    workingText = workingText.replace(/\b5901\b/, ' ');
  }

  // 3. Country extraction
  // Check country prefix first e.g. "country:JP"
  const countryPrefixMatch = raw.match(/\bcountry:([a-z]{2})\b/i);
  if (countryPrefixMatch) {
    apiParams.country = countryPrefixMatch[1].toUpperCase();
    tokens.push({ type: 'country', label: 'Quốc gia', value: apiParams.country });
  } else {
    // Scan through country patterns
    for (const c of COUNTRY_MAP) {
      // Check longer patterns first
      const sortedPatterns = [...c.patterns].sort((a, b) => b.length - a.length);
      for (const pattern of sortedPatterns) {
        // Must match either "o [pattern]", "tai [pattern]", "in [pattern]", or word boundary
        const regex = new RegExp(`\\b(?:o|tai|in|nuoc|quoc gia|country)?\\s*(${pattern})\\b`, 'i');
        if (regex.test(workingText)) {
          apiParams.country = c.code;
          tokens.push({ type: 'country', label: `Quốc gia (${c.nameVi})`, value: c.code });
          workingText = workingText.replace(regex, ' ');
          break;
        }
      }
      if (apiParams.country) break;
    }
  }

  // 4. Desktop extraction
  // Check desktop prefix first e.g. "desktop:windows"
  const desktopPrefixMatch = raw.match(/\bdesktop:([^\s]+)\b/i);
  if (desktopPrefixMatch) {
    apiParams.desktop = desktopPrefixMatch[1];
    tokens.push({ type: 'desktop', label: 'Tên Desktop', value: apiParams.desktop });
  } else {
    for (const d of DESKTOP_PATTERNS) {
      if (d.pattern.test(workingText)) {
        apiParams.desktop = d.desktopName;
        tokens.push({ type: 'desktop', label: 'Tên Desktop', value: d.desktopName });
        workingText = workingText.replace(d.pattern, ' ');
        break;
      }
    }
  }

  // 5. ASN extraction
  const asnPrefixMatch = raw.match(/\basn:([^\s]+)\b/i);
  if (asnPrefixMatch) {
    apiParams.asn = asnPrefixMatch[1];
    tokens.push({ type: 'asn', label: 'Nhà mạng ASN', value: apiParams.asn });
  } else {
    const asnMatch = workingText.match(/\b(?:asn|nha mang|mang|isp)\s*:?\s*(as\d+|\w+)\b/i);
    if (asnMatch) {
      apiParams.asn = asnMatch[1];
      tokens.push({ type: 'asn', label: 'Nhà mạng ASN', value: asnMatch[1] });
      workingText = workingText.replace(asnMatch[0], ' ');
    } else {
      // Known ISPs in Vietnam & global
      const isps = ['viettel', 'vnpt', 'fpt', 'fastweb', 'comcast', 'ovh', 'hetzner', 'cloudflare'];
      for (const isp of isps) {
        if (new RegExp(`\\b${isp}\\b`, 'i').test(workingText)) {
          apiParams.asn = isp;
          tokens.push({ type: 'asn', label: 'Nhà mạng ASN', value: isp });
          workingText = workingText.replace(new RegExp(`\\b${isp}\\b`, 'i'), ' ');
          break;
        }
      }
    }
  }

  // 6. Resolution extraction
  if (/\b(?:1080p|full\s*hd|1920x1080|fhd)\b/i.test(workingText)) {
    localFilters.resolution = '1080p';
    tokens.push({ type: 'resolution', label: 'Độ phân giải', value: '1080p (Full HD)' });
  } else if (/\b(?:720p|1280x720|hd)\b/i.test(workingText)) {
    localFilters.resolution = '720p';
    tokens.push({ type: 'resolution', label: 'Độ phân giải', value: '720p (HD)' });
  } else if (/\b(?:480p|sd|640x480|800x600)\b/i.test(workingText)) {
    localFilters.resolution = '480p';
    tokens.push({ type: 'resolution', label: 'Độ phân giải', value: '480p (SD)' });
  }

  // 7. Authentication / Password requirement
  if (/\b(?:khong\s*(?:can\s*)?mat\s*khau|khong\s*pass|ko\s*pass|no\s*password|no\s*auth|unprotected)\b/i.test(workingText)) {
    localFilters.auth = 'no_password';
    tokens.push({ type: 'auth', label: 'Bảo mật', value: 'Không mật khẩu' });
  } else if (/\b(?:co\s*mat\s*khau|yeu\s*cau\s*mat\s*khau|can\s*pass|requires?\s*password)\b/i.test(workingText)) {
    localFilters.auth = 'requires_password';
    tokens.push({ type: 'auth', label: 'Bảo mật', value: 'Cần mật khẩu' });
  }

  // 8. Live Reachability
  if (/\b(?:ket\s*noi\s*duoc|online|dang\s*chay|song|live|reachable|hoat\s*dong)\b/i.test(workingText)) {
    localFilters.live = 'reachable';
    tokens.push({ type: 'live', label: 'Kết nối trực tiếp', value: 'Reachable Only' });
  }

  // Check residual text for a desktop name if nothing else matched
  // e.g. "tim may chu ubuntu" -> desktop:ubuntu
  const cleanedResidual = workingText
    .replace(/\b(?:tim|kiem|search|vnc|may|may tinh|he thong|desktop|tai|o|in|with|co|cac|cho|toi|hoac|va|and|or)\b/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (!apiParams.desktop && cleanedResidual.length >= 2 && !apiParams.id) {
    // If not a pure number or country code
    if (!/^\d+$/.test(cleanedResidual) && cleanedResidual.length < 30) {
      apiParams.desktop = cleanedResidual;
      tokens.push({ type: 'desktop', label: 'Tên Desktop', value: cleanedResidual });
    }
  }

  // Build the clean converted search query string
  const parts: string[] = [];
  if (apiParams.desktop) parts.push(apiParams.desktop);
  if (apiParams.country) parts.push(`country:${apiParams.country}`);
  if (apiParams.asn) parts.push(`asn:${apiParams.asn}`);
  if (apiParams.id) parts.push(`id:${apiParams.id}`);
  if (localFilters.port !== 'all') parts.push(`port:${localFilters.port}`);
  if (localFilters.resolution !== 'all') parts.push(`res:${localFilters.resolution}`);
  if (localFilters.auth === 'no_password') parts.push('noauth:true');

  const convertedQueryString = parts.join(' ');
  const isNaturalLanguage = tokens.length > 0 && (!hasPrefixSyntax || tokens.length >= 2);

  return {
    rawPrompt: raw,
    isNaturalLanguage,
    convertedQueryString: convertedQueryString || raw,
    apiParams,
    localFilters,
    tokens,
  };
}
