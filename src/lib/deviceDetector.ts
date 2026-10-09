// Comprehensive Device, Mobile Model, Browser, OS, Network & Geo Detector
// Engineered for zero-misinformation across Bangladeshi mobile users & networks

export type DeviceInfo = {
  brand: string;
  device_model: string;
  os: string;
  browser: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  network_type: string;
};

export type GeoInfo = {
  ip: string;
  country: string;
  region: string;
  city: string;
  upazila?: string;
  isp: string;
  org?: string;
  latitude?: number;
  longitude?: number;
  flag?: string;
  is_vpn?: boolean;
  is_proxy?: boolean;
  is_datacenter?: boolean;
  vpn_note?: string;
  vpn_gateway_location?: string;
  display_location: string;
  location_accuracy: 'gps_exact' | 'ip_approximate' | 'vpn_gateway' | 'unknown';
  gps_verified?: boolean;
  gps_latitude?: number;
  gps_longitude?: number;
};

// Known popular mobile model mappings in Bangladesh
const MODEL_MAPPINGS: Record<string, string> = {
  // Samsung A-Series & M-Series
  'SM-A055F': 'Samsung Galaxy A05',
  'SM-A057F': 'Samsung Galaxy A05s',
  'SM-A155F': 'Samsung Galaxy A15',
  'SM-A156E': 'Samsung Galaxy A15 5G',
  'SM-A256E': 'Samsung Galaxy A25 5G',
  'SM-A356E': 'Samsung Galaxy A35 5G',
  'SM-A556E': 'Samsung Galaxy A55 5G',
  'SM-A546E': 'Samsung Galaxy A54 5G',
  'SM-A346E': 'Samsung Galaxy A34 5G',
  'SM-A528B': 'Samsung Galaxy A52s 5G',
  'SM-A525F': 'Samsung Galaxy A52',
  'SM-A515F': 'Samsung Galaxy A51',
  'SM-A325F': 'Samsung Galaxy A32',
  'SM-A225F': 'Samsung Galaxy A22',
  'SM-A125F': 'Samsung Galaxy A12',
  'SM-A135F': 'Samsung Galaxy A13',
  'SM-A145P': 'Samsung Galaxy A14',
  'SM-A235F': 'Samsung Galaxy A23',
  'SM-A042F': 'Samsung Galaxy A04e',
  'SM-A045F': 'Samsung Galaxy A04',
  'SM-A047F': 'Samsung Galaxy A04s',
  'SM-M146B': 'Samsung Galaxy M14 5G',
  'SM-M346B': 'Samsung Galaxy M34 5G',
  'SM-M546B': 'Samsung Galaxy M54 5G',
  'SM-M215F': 'Samsung Galaxy M21',
  'SM-M315F': 'Samsung Galaxy M31',
  'SM-M127F': 'Samsung Galaxy M12',
  'SM-M325FV': 'Samsung Galaxy M32',
  'SM-G998B': 'Samsung Galaxy S21 Ultra',
  'SM-S908B': 'Samsung Galaxy S22 Ultra',
  'SM-S918B': 'Samsung Galaxy S23 Ultra',
  'SM-S928B': 'Samsung Galaxy S24 Ultra',

  // Xiaomi & Redmi
  '23129RN51X': 'Xiaomi Redmi 13C',
  '23124RA7EO': 'Xiaomi Redmi Note 13',
  '23117RA68G': 'Xiaomi Redmi Note 13 Pro',
  '23076RN4BI': 'Xiaomi Redmi 12 5G',
  '23053RN02Y': 'Xiaomi Redmi 12',
  '23028RN4DG': 'Xiaomi Redmi 12C',
  '2201117TG': 'Xiaomi Redmi Note 11',
  '2201117TY': 'Xiaomi Redmi Note 11S',
  '2201116TG': 'Xiaomi Redmi Note 11 Pro',
  '2109119DG': 'Xiaomi 11 Lite 5G NE',
  'M2010J19SG': 'Xiaomi Redmi 9T',
  'M2004J19G': 'Xiaomi Redmi 9',
  'M2006C3MNG': 'Xiaomi Redmi 9C',
  '220733SI': 'Xiaomi Redmi A1',
  '23030RAC7Y': 'Xiaomi Redmi A2',
  '2303ERA42L': 'Xiaomi Redmi Note 12 4G',

  // OPPO
  'CPH2579': 'OPPO A18',
  'CPH2527': 'OPPO A38',
  'CPH2529': 'OPPO A58',
  'CPH2477': 'OPPO A17',
  'CPH2269': 'OPPO A16',
  'CPH2349': 'OPPO A16k',
  'CPH2185': 'OPPO A15',
  'CPH2239': 'OPPO A54',
  'CPH2607': 'OPPO Reno 11F 5G',

  // Vivo
  'V2342': 'Vivo Y28',
  'V2310': 'Vivo Y17s',
  'V2322': 'Vivo Y27',
  'V2249': 'Vivo Y02t',
  'V2248': 'Vivo Y02',
  'V2247': 'Vivo Y16',
  'V2236': 'Vivo Y22',
  'V2144': 'Vivo Y15s',
  'V2111': 'Vivo Y21',
  'V2027': 'Vivo Y20',
  'V2043': 'Vivo Y20s',
  'V2120': 'Vivo Y33s',

  // Realme
  'RMX3890': 'Realme C67',
  'RMX3830': 'Realme C51',
  'RMX3760': 'Realme C53',
  'RMX3710': 'Realme C55',
  'RMX3581': 'Realme C30',
  'RMX3511': 'Realme C35',
  'RMX3263': 'Realme C21Y',
  'RMX3231': 'Realme C11 (2021)',
  'RMX3085': 'Realme 8',
  'RMX3195': 'Realme 8 5G',
  'RMX3363': 'Realme GT Master Edition',

  // Infinix
  'X6528': 'Infinix Hot 40i',
  'X6836': 'Infinix Hot 40 Pro',
  'X6837': 'Infinix Note 40',
  'X6525': 'Infinix Smart 8',
  'X6515': 'Infinix Smart 7',
  'X6511B': 'Infinix Smart 6',
  'X657B': 'Infinix Smart 5',
  'X688B': 'Infinix Hot 10 Play',
  'X6816D': 'Infinix Hot 12 Play',
  'X669': 'Infinix Hot 30i',

  // TECNO
  'BG6': 'TECNO Spark 20',
  'KJ5': 'TECNO Spark 20C',
  'BG7': 'TECNO Pop 8',
  'BF7': 'TECNO Pop 7',
  'KL5k': 'TECNO Spark 10C',
  'KG5k': 'TECNO Spark 8C',
};

/**
 * Accurately determines iPhone models based on hardware screen metrics
 */
function detectIPhoneModel(): string | null {
  if (typeof window === 'undefined' || typeof screen === 'undefined') return null;
  const w = Math.min(screen.width, screen.height);
  const h = Math.max(screen.width, screen.height);
  const dpr = window.devicePixelRatio || 1;

  if (w === 430 && h === 932) return 'Apple iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus';
  if (w === 393 && h === 852) return 'Apple iPhone 14 Pro / 15 / 15 Pro / 16';
  if (w === 428 && h === 926) return 'Apple iPhone 12 Pro Max / 13 Pro Max / 14 Plus';
  if (w === 390 && h === 844) return 'Apple iPhone 12 / 12 Pro / 13 / 13 Pro / 14';
  if (w === 414 && h === 896 && dpr === 3) return 'Apple iPhone 11 Pro Max / XS Max';
  if (w === 414 && h === 896 && dpr === 2) return 'Apple iPhone 11 / XR';
  if (w === 375 && h === 812 && dpr === 3) return 'Apple iPhone 11 Pro / X / XS';
  if (w === 375 && h === 667) return 'Apple iPhone SE (2nd/3rd Gen) / 8 / 7';
  if (w === 360 && h === 780) return 'Apple iPhone 12 mini / 13 mini';
  if (w === 414 && h === 736) return 'Apple iPhone 8 Plus / 7 Plus / 6s Plus';

  return null;
}

/**
 * Resolves a model token into a recognizable phone model name.
 * Strictly ignores Chromium User-Agent Reduction placeholder token 'K'.
 */
function resolveModelName(rawCode: string): { brand: string; model: string } {
  const clean = rawCode.trim();
  if (!clean || clean.toUpperCase() === 'K' || clean.toLowerCase() === 'mobile' || clean.toLowerCase() === 'linux') {
    return { brand: 'Android', model: 'Android Smartphone' };
  }

  if (MODEL_MAPPINGS[clean]) {
    const full = MODEL_MAPPINGS[clean];
    return { brand: full.split(' ')[0], model: full };
  }

  if (/SM-[A-Z0-9]+/i.test(clean)) {
    const smCode = clean.match(/SM-[A-Z0-9]+/i)?.[0] || clean;
    if (MODEL_MAPPINGS[smCode]) {
      return { brand: 'Samsung', model: MODEL_MAPPINGS[smCode] };
    }
    if (/^SM-S/i.test(smCode)) return { brand: 'Samsung', model: `Samsung Galaxy S-Series (${smCode})` };
    if (/^SM-A/i.test(smCode)) return { brand: 'Samsung', model: `Samsung Galaxy A-Series (${smCode})` };
    if (/^SM-M/i.test(smCode)) return { brand: 'Samsung', model: `Samsung Galaxy M-Series (${smCode})` };
    if (/^SM-F/i.test(smCode)) return { brand: 'Samsung', model: `Samsung Galaxy Z-Series (${smCode})` };
    return { brand: 'Samsung', model: `Samsung Galaxy (${smCode})` };
  }

  if (/Redmi|POCO|Mi\s/i.test(clean)) {
    return { brand: 'Xiaomi', model: clean.startsWith('Xiaomi') ? clean : `Xiaomi ${clean}` };
  }

  if (/2[123]\d{7}[A-Z]/i.test(clean)) {
    return { brand: 'Xiaomi', model: `Xiaomi (${clean})` };
  }

  if (/vivo|V2\d{3}|Y\d{2}/i.test(clean)) {
    return { brand: 'Vivo', model: clean.toLowerCase().startsWith('vivo') ? clean : `Vivo ${clean}` };
  }

  if (/OPPO|CPH\d{4}/i.test(clean)) {
    return { brand: 'Oppo', model: clean.toLowerCase().startsWith('oppo') ? clean : `OPPO ${clean}` };
  }

  if (/realme|RMX\d{4}/i.test(clean)) {
    return { brand: 'Realme', model: clean.toLowerCase().startsWith('realme') ? clean : `Realme ${clean}` };
  }

  if (/Infinix|X6\d{2}/i.test(clean)) {
    return { brand: 'Infinix', model: clean.toLowerCase().startsWith('infinix') ? clean : `Infinix ${clean}` };
  }

  if (/TECNO|Spark|Camon|KG\d|CK\d/i.test(clean)) {
    return { brand: 'Tecno', model: clean.toLowerCase().startsWith('tecno') ? clean : `TECNO ${clean}` };
  }

  if (/Walton|Primo|Nexg/i.test(clean)) {
    return { brand: 'Walton', model: clean.toLowerCase().startsWith('walton') ? clean : `Walton ${clean}` };
  }

  if (/Symphony|Helio|Z\d{2}/i.test(clean)) {
    return { brand: 'Symphony', model: clean.toLowerCase().startsWith('symphony') ? clean : `Symphony ${clean}` };
  }

  if (/Pixel\s*\d/i.test(clean)) {
    return { brand: 'Google', model: `Google ${clean}` };
  }

  return { brand: 'Mobile', model: clean };
}

/**
 * Synchronous User-Agent parser (baseline)
 */
export function parseUserAgent(uaString?: string): DeviceInfo {
  const ua = uaString || (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  // 1. Device Type
  let device_type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    device_type = 'tablet';
  } else if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop|android/i.test(ua)) {
    device_type = 'mobile';
  }

  // 2. OS Detection
  let os = 'Unknown OS';
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
  else if (/Android\s*([\d.]+)/i.test(ua)) {
    const v = ua.match(/Android\s*([\d.]+)/i)?.[1];
    os = v ? `Android ${v}` : 'Android';
  } else if (/iPhone OS\s*([\d_]+)/i.test(ua)) {
    const v = ua.match(/iPhone OS\s*([\d_]+)/i)?.[1]?.replace(/_/g, '.');
    os = v ? `iOS ${v}` : 'iOS';
  } else if (/iPad.*OS\s*([\d_]+)/i.test(ua)) {
    const v = ua.match(/iPad.*OS\s*([\d_]+)/i)?.[1]?.replace(/_/g, '.');
    os = v ? `iPadOS ${v}` : 'iPadOS';
  } else if (/Mac OS X\s*([\d_]+)/i.test(ua)) {
    const v = ua.match(/Mac OS X\s*([\d_]+)/i)?.[1]?.replace(/_/g, '.');
    os = v ? `macOS ${v}` : 'macOS';
  } else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // 3. Browser Detection
  let browser = 'Unknown Browser';
  if (/SamsungBrowser\/([\d.]+)/i.test(ua)) {
    browser = `Samsung Internet ${ua.match(/SamsungBrowser\/([\d.]+)/i)?.[1] || ''}`.trim();
  } else if (/Edg\/([\d.]+)/i.test(ua)) {
    browser = `Edge ${ua.match(/Edg\/([\d.]+)/i)?.[1] || ''}`.trim();
  } else if (/OPR\/([\d.]+)|Opera\/([\d.]+)/i.test(ua)) {
    browser = `Opera ${ua.match(/OPR\/([\d.]+)|Opera\/([\d.]+)/i)?.[1] || ''}`.trim();
  } else if (/UCBrowser\/([\d.]+)/i.test(ua)) {
    browser = `UC Browser ${ua.match(/UCBrowser\/([\d.]+)/i)?.[1] || ''}`.trim();
  } else if (/Chrome\/([\d.]+)/i.test(ua)) {
    const isMobile = /Mobile/i.test(ua);
    const ver = ua.match(/Chrome\/([\d.]+)/i)?.[1] || '';
    browser = `${isMobile ? 'Chrome Mobile' : 'Chrome'} ${ver}`.trim();
  } else if (/Firefox\/([\d.]+)/i.test(ua)) {
    browser = `Firefox ${ua.match(/Firefox\/([\d.]+)/i)?.[1] || ''}`.trim();
  } else if (/Version\/([\d.]+).*Safari/i.test(ua)) {
    browser = `Safari ${ua.match(/Version\/([\d.]+)/i)?.[1] || ''}`.trim();
  }

  // 4. Brand & Model Detection
  let brand = 'Unknown';
  let device_model = 'Generic Device';

  if (/iPhone/i.test(ua)) {
    brand = 'Apple';
    const iphoneModel = detectIPhoneModel();
    device_model = iphoneModel || 'Apple iPhone';
  } else if (/iPad/i.test(ua)) {
    brand = 'Apple';
    device_model = 'Apple iPad';
  } else if (/Macintosh/i.test(ua)) {
    brand = 'Apple';
    device_model = 'Apple Mac / MacBook';
  } else if (/Windows NT/i.test(ua)) {
    brand = 'Windows';
    device_model = 'Windows PC';
  } else {
    // Extract Android model token
    const androidMatch = ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\sBuild|\))/i);
    const rawCode = (androidMatch ? androidMatch[1].trim() : '').replace(/^(wv|mobile|linux);\s*/i, '');
    const resolved = resolveModelName(rawCode);
    brand = resolved.brand;
    device_model = resolved.model;
  }

  // 5. Network Connection Type
  let network_type = 'Broadband / WiFi';
  if (typeof navigator !== 'undefined') {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string; type?: string } })?.connection;
    if (conn?.effectiveType) {
      network_type = conn.effectiveType.toUpperCase(); // e.g. '4G', '3G'
    } else if (device_type === 'mobile') {
      network_type = 'Cellular (4G/3G)';
    }
  }

  return {
    brand,
    device_model,
    os,
    browser,
    device_type,
    network_type,
  };
}

/**
 * Asynchronous device detector with Client Hints support (bypasses Chromium UA-reduction)
 */
export async function detectDeviceInfo(): Promise<DeviceInfo> {
  const sync = parseUserAgent();

  if (typeof navigator !== 'undefined') {
    const navAny = navigator as unknown as {
      userAgentData?: {
        getHighEntropyValues: (hints: string[]) => Promise<{ model?: string; platform?: string; platformVersion?: string }>;
      };
    };

    if (navAny.userAgentData?.getHighEntropyValues) {
      try {
        const hints = await navAny.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
        if (hints.model && hints.model !== 'K' && hints.model.trim() !== '') {
          const resolved = resolveModelName(hints.model);
          return {
            ...sync,
            device_model: resolved.model,
            brand: resolved.brand || sync.brand,
            os: hints.platform ? `${hints.platform}${hints.platformVersion ? ' ' + hints.platformVersion : ''}` : sync.os,
          };
        }
      } catch {
        /* ignore hints error */
      }
    }
  }

  return sync;
}

const GEO_CACHE_KEY = 'edumate.visitor_geo_cache_v2';
const GEO_CACHE_TTL = 1000 * 60 * 15; // 15 minutes TTL

/**
 * Clean up Bangladeshi ISP / Telecom names
 */
function formatIspName(raw: string): string {
  if (!raw) return 'অজানা নেটওয়ার্ক';
  const l = raw.toLowerCase();
  if (l.includes('grameenphone') || l.includes('gp') || l.includes('telenor')) return 'Grameenphone (GP)';
  if (l.includes('banglalink') || l.includes('veon')) return 'Banglalink';
  if (l.includes('robi') || l.includes('axiata')) return 'Robi Axiata';
  if (l.includes('teletalk')) return 'Teletalk';
  if (l.includes('cloudflare')) return 'Cloudflare (ভিপিএন / প্রক্সি)';
  if (l.includes('google llc') || l.includes('google cloud')) return 'Google Cloud (প্রক্সি)';
  if (l.includes('link3')) return 'Link3 Technologies';
  if (l.includes('amber')) return 'Amber IT';
  if (l.includes('carnival')) return 'Carnival Internet';
  if (l.includes('dot internet')) return 'Dot Internet';
  if (l.includes('sol-bd')) return 'SOL-BD Broadband';
  return raw.replace(/Ltd\.?|Limited|Telecom|Digital Communications/gi, '').trim();
}

/**
 * Fetches accurate Geo & ISP details with zero false defaults (no fake 'Dhaka' or 'Bangladesh').
 * Transparently tags VPN / Cloudflare WARP / Proxy gateways.
 */
export async function getGeoAndIspDetails(): Promise<GeoInfo> {
  // Check session cache first
  try {
    const cached = sessionStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed._timestamp < GEO_CACHE_TTL && parsed.ip) {
        return parsed as GeoInfo;
      }
    }
  } catch {
    /* ignore */
  }

  // 1. Primary: ipwho.is
  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data.ip) {
        const isVpn = Boolean(data.security?.vpn);
        const isProxy = Boolean(data.security?.proxy);
        const isTor = Boolean(data.security?.tor);
        const isHosting = Boolean(data.security?.hosting);
        const rawIsp = data.connection?.isp || data.connection?.org || '';
        const isCloudflare = /cloudflare/i.test(rawIsp) || String(data.connection?.asn) === '13335' || data.ip?.startsWith('104.28.');
        const isGoogle = /google/i.test(rawIsp) || /google llc/i.test(data.connection?.org || '');

        const isShielded = isVpn || isProxy || isTor || isCloudflare || isGoogle || isHosting;

        let vpnNote: string | undefined = undefined;
        if (isCloudflare) vpnNote = 'Cloudflare 1.1.1.1 WARP / Proxy';
        else if (isVpn) vpnNote = 'VPN Service';
        else if (isProxy) vpnNote = 'Web Proxy';
        else if (isTor) vpnNote = 'Tor Exit Node';
        else if (isGoogle || isHosting) vpnNote = 'Cloud Datacenter';

        const country = data.country || '';
        const region = data.region || '';
        const city = data.city || '';

        const gatewayLoc = [city, country].filter(Boolean).join(', ');

        const info: GeoInfo = {
          ip: data.ip,
          country,
          region,
          city,
          upazila: data.postal || undefined,
          isp: formatIspName(rawIsp),
          org: data.connection?.org || undefined,
          latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
          longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
          flag: data.flag?.emoji || (country === 'Bangladesh' ? '🇧🇩' : '🌐'),
          is_vpn: isVpn || isCloudflare,
          is_proxy: isProxy || isCloudflare || isTor,
          is_datacenter: isHosting || isGoogle,
          vpn_note: vpnNote,
          vpn_gateway_location: isShielded ? (gatewayLoc || 'বিদেশি গেটওয়ে') : undefined,
          display_location: isShielded
            ? `ভিপিএন গেটওয়ে: ${gatewayLoc || 'বিদেশি সার্ভার'} (আসল অবস্থান গোপন)`
            : [city, region, country].filter(Boolean).join(', ') || 'অবস্থান শনাক্ত করা যায়নি',
          location_accuracy: isShielded ? 'vpn_gateway' : (city ? 'ip_approximate' : 'unknown'),
        };

        try {
          sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ...info, _timestamp: Date.now() }));
        } catch {}
        return info;
      }
    }
  } catch {
    /* fallback to freeipapi */
  }

  // 2. Secondary fallback: freeipapi.com
  try {
    const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.ipAddress) {
        const country = data.countryName || '';
        const region = data.regionName || '';
        const city = data.cityName || '';
        const rawIsp = data.asnOrganization || '';
        const isCloudflare = /cloudflare/i.test(rawIsp) || data.ipAddress?.startsWith('104.28.');
        const isShielded = isCloudflare;

        const info: GeoInfo = {
          ip: data.ipAddress,
          country,
          region,
          city,
          isp: formatIspName(rawIsp),
          latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
          longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
          flag: country === 'Bangladesh' ? '🇧🇩' : '🌐',
          is_vpn: isCloudflare,
          is_proxy: isCloudflare,
          vpn_note: isCloudflare ? 'Cloudflare 1.1.1.1 WARP / Proxy' : undefined,
          vpn_gateway_location: isShielded ? [city, country].filter(Boolean).join(', ') : undefined,
          display_location: isShielded
            ? `ভিপিএন গেটওয়ে: ${[city, country].filter(Boolean).join(', ')} (আসল অবস্থান গোপন)`
            : [city, region, country].filter(Boolean).join(', ') || 'অবস্থান শনাক্ত করা যায়নি',
          location_accuracy: isShielded ? 'vpn_gateway' : (city ? 'ip_approximate' : 'unknown'),
        };

        try {
          sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ...info, _timestamp: Date.now() }));
        } catch {}
        return info;
      }
    }
  } catch {
    /* fallback to ipify */
  }

  // 3. Fallback: ipify.org (only returns IP, ZERO fake locations)
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        return {
          ip: data.ip,
          country: '',
          region: '',
          city: '',
          isp: 'ইন্টারনেট সংযোগ',
          flag: '🌐',
          display_location: 'অবস্থান লোড করা যায়নি (আইপি সংরক্ষিত)',
          location_accuracy: 'unknown',
        };
      }
    }
  } catch {
    /* ignore */
  }

  // Final truthful fallback
  return {
    ip: 'Unknown IP',
    country: '',
    region: '',
    city: '',
    isp: 'অজানা নেটওয়ার্ক',
    flag: '🌐',
    display_location: 'অবস্থান অনুপলব্ধ',
    location_accuracy: 'unknown',
  };
}

/**
 * Checks for granted HTML5 Geolocation without showing prompts
 */
export async function getSilentGpsLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (status.state !== 'granted') return null;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
        () => resolve(null),
        { timeout: 3000, maximumAge: 300000, enableHighAccuracy: false }
      );
    });
  } catch {
    return null;
  }
}
