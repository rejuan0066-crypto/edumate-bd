// Comprehensive Device, Mobile Model, Browser, OS, Network & Geo Detector
// Designed for high-accuracy detection across Bangladeshi mobile users & networks

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
};

// Known popular model mappings in Bangladesh
const MODEL_MAPPINGS: Record<string, string> = {
  'SM-A528B': 'Samsung Galaxy A52s 5G',
  'SM-A525F': 'Samsung Galaxy A52',
  'SM-A515F': 'Samsung Galaxy A51',
  'SM-A325F': 'Samsung Galaxy A32',
  'SM-A225F': 'Samsung Galaxy A22',
  'SM-A125F': 'Samsung Galaxy A12',
  'SM-A135F': 'Samsung Galaxy A13',
  'SM-A145P': 'Samsung Galaxy A14',
  'SM-A235F': 'Samsung Galaxy A23',
  'SM-A546E': 'Samsung Galaxy A54 5G',
  'SM-A346E': 'Samsung Galaxy A34 5G',
  'SM-A556E': 'Samsung Galaxy A55 5G',
  'SM-A356E': 'Samsung Galaxy A35 5G',
  'SM-M215F': 'Samsung Galaxy M21',
  'SM-M315F': 'Samsung Galaxy M31',
  'SM-M127F': 'Samsung Galaxy M12',
  'SM-M325FV': 'Samsung Galaxy M32',
  'SM-G998B': 'Samsung Galaxy S21 Ultra',
  'SM-S908B': 'Samsung Galaxy S22 Ultra',
  'SM-S918B': 'Samsung Galaxy S23 Ultra',
  'SM-S928B': 'Samsung Galaxy S24 Ultra',
  '2201117TG': 'Xiaomi Redmi Note 11',
  '2201117TY': 'Xiaomi Redmi Note 11S',
  '2109119DG': 'Xiaomi 11 Lite 5G NE',
  'M2010J19SG': 'Xiaomi Redmi 9T',
  'M2004J19G': 'Xiaomi Redmi 9',
  'M2006C3MNG': 'Xiaomi Redmi 9C',
  '220733SI': 'Xiaomi Redmi A1',
  '23028RN4DG': 'Xiaomi Redmi 12C',
  '23053RN02Y': 'Xiaomi Redmi 12',
  'CPH2269': 'OPPO A16',
  'CPH2185': 'OPPO A15',
  'CPH2239': 'OPPO A54',
  'CPH2349': 'OPPO A16k',
  'CPH2477': 'OPPO A17',
  'CPH2579': 'OPPO A18',
  'CPH2527': 'OPPO A38',
  'CPH2529': 'OPPO A58',
  'V2027': 'Vivo Y20',
  'V2043': 'Vivo Y20s',
  'V2111': 'Vivo Y21',
  'V2144': 'Vivo Y15s',
  'V2120': 'Vivo Y33s',
  'V2236': 'Vivo Y22',
  'V2247': 'Vivo Y16',
  'V2248': 'Vivo Y02',
  'V2249': 'Vivo Y02t',
  'V2310': 'Vivo Y17s',
  'V2322': 'Vivo Y27',
  'RMX3231': 'Realme C11 (2021)',
  'RMX3511': 'Realme C35',
  'RMX3263': 'Realme C21Y',
  'RMX3581': 'Realme C30',
  'RMX3760': 'Realme C53',
  'RMX3710': 'Realme C55',
  'RMX3085': 'Realme 8',
  'RMX3195': 'Realme 8 5G',
  'RMX3363': 'Realme GT Master Edition',
  'X657B': 'Infinix Smart 5',
  'X6511B': 'Infinix Smart 6',
  'X6515': 'Infinix Smart 7',
  'X6525': 'Infinix Smart 8',
  'X688B': 'Infinix Hot 10 Play',
  'X6816D': 'Infinix Hot 12 Play',
  'X669': 'Infinix Hot 30i',
  'KG5k': 'TECNO Spark 8C',
  'BF7': 'TECNO Pop 7',
  'KL5k': 'TECNO Spark 10C',
};

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

  // 4. Brand & Detailed Model Detection
  let brand = 'Unknown';
  let device_model = 'Generic Device';

  if (/iPhone/i.test(ua)) {
    brand = 'Apple';
    device_model = 'Apple iPhone';
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

    // Check exact known mapping
    if (rawCode && MODEL_MAPPINGS[rawCode]) {
      device_model = MODEL_MAPPINGS[rawCode];
      brand = device_model.split(' ')[0];
    } else if (/SM-[A-Z0-9]+/i.test(rawCode) || /SAMSUNG/i.test(ua)) {
      brand = 'Samsung';
      const smCode = rawCode.match(/SM-[A-Z0-9]+/i)?.[0] || rawCode;
      if (MODEL_MAPPINGS[smCode]) {
        device_model = MODEL_MAPPINGS[smCode];
      } else if (/^SM-S/i.test(smCode)) {
        device_model = `Samsung Galaxy S-Series (${smCode})`;
      } else if (/^SM-A/i.test(smCode)) {
        device_model = `Samsung Galaxy A-Series (${smCode})`;
      } else if (/^SM-M/i.test(smCode)) {
        device_model = `Samsung Galaxy M-Series (${smCode})`;
      } else if (/^SM-F/i.test(smCode)) {
        device_model = `Samsung Galaxy Z-Series (${smCode})`;
      } else {
        device_model = `Samsung Galaxy (${smCode})`;
      }
    } else if (/Redmi|POCO|Mi\s/i.test(rawCode)) {
      brand = 'Xiaomi';
      device_model = rawCode.startsWith('Xiaomi') ? rawCode : `Xiaomi ${rawCode}`;
    } else if (/2[123]\d{7}[A-Z]/i.test(rawCode)) {
      brand = 'Xiaomi';
      device_model = `Xiaomi (${rawCode})`;
    } else if (/vivo|V2\d{3}|Y\d{2}/i.test(rawCode)) {
      brand = 'Vivo';
      device_model = rawCode.toLowerCase().startsWith('vivo') ? rawCode : `Vivo ${rawCode}`;
    } else if (/OPPO|CPH\d{4}/i.test(rawCode)) {
      brand = 'Oppo';
      device_model = rawCode.toLowerCase().startsWith('oppo') ? rawCode : `OPPO ${rawCode}`;
    } else if (/realme|RMX\d{4}/i.test(rawCode)) {
      brand = 'Realme';
      device_model = rawCode.toLowerCase().startsWith('realme') ? rawCode : `Realme ${rawCode}`;
    } else if (/Infinix|X6\d{2}/i.test(rawCode)) {
      brand = 'Infinix';
      device_model = rawCode.toLowerCase().startsWith('infinix') ? rawCode : `Infinix ${rawCode}`;
    } else if (/TECNO|Spark|Camon|KG\d|CK\d/i.test(rawCode)) {
      brand = 'Tecno';
      device_model = rawCode.toLowerCase().startsWith('tecno') ? rawCode : `TECNO ${rawCode}`;
    } else if (/Walton|Primo|Nexg/i.test(rawCode)) {
      brand = 'Walton';
      device_model = rawCode.toLowerCase().startsWith('walton') ? rawCode : `Walton ${rawCode}`;
    } else if (/Symphony|Helio|Z\d{2}/i.test(rawCode)) {
      brand = 'Symphony';
      device_model = rawCode.toLowerCase().startsWith('symphony') ? rawCode : `Symphony ${rawCode}`;
    } else if (/Pixel\s*\d/i.test(rawCode)) {
      brand = 'Google';
      device_model = `Google ${rawCode}`;
    } else if (/moto|Motorola/i.test(rawCode)) {
      brand = 'Motorola';
      device_model = rawCode;
    } else if (/OnePlus/i.test(rawCode)) {
      brand = 'OnePlus';
      device_model = rawCode;
    } else if (rawCode) {
      brand = 'Mobile';
      device_model = rawCode;
    } else if (device_type === 'mobile') {
      brand = 'Mobile';
      device_model = 'Android Smartphone';
    }
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

const GEO_CACHE_KEY = 'lovable.visitor_geo_cache';
const GEO_CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function getGeoAndIspDetails(): Promise<GeoInfo> {
  // Check sessionStorage cache first
  try {
    const cached = sessionStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed._timestamp < GEO_CACHE_TTL && parsed.ip) {
        return parsed as GeoInfo;
      }
    }
  } catch {
    /* ignore storage errors */
  }

  // 1. Primary: ipwho.is (Fast, HTTPS, CORS-friendly, rich ISP & district data)
  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data.ip) {
        const info: GeoInfo = {
          ip: data.ip,
          country: data.country || 'Bangladesh',
          region: data.region || 'Dhaka',
          city: data.city || 'Dhaka',
          upazila: data.postal || undefined,
          isp: formatIspName(data.connection?.isp || data.connection?.org || 'Broadband'),
          org: data.connection?.org || undefined,
          latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
          longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
          flag: data.flag?.emoji || '🇧🇩',
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
        const info: GeoInfo = {
          ip: data.ipAddress,
          country: data.countryName || 'Bangladesh',
          region: data.regionName || 'Dhaka',
          city: data.cityName || 'Dhaka',
          isp: formatIspName(data.asnOrganization || 'Broadband'),
          latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
          longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
          flag: '🇧🇩',
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

  // 3. Last fallback: api.ipify.org
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        return {
          ip: data.ip,
          country: 'Bangladesh',
          region: 'Bangladesh',
          city: 'Bangladesh',
          isp: 'Internet',
          flag: '🇧🇩',
        };
      }
    }
  } catch {
    /* complete fallback */
  }

  return {
    ip: 'Unknown IP',
    country: 'Bangladesh',
    region: 'Bangladesh',
    city: 'Bangladesh',
    isp: 'Internet Provider',
    flag: '🇧🇩',
  };
}

// Clean up Bangladeshi ISP / Telecom names into clean, recognizable names
function formatIspName(raw: string): string {
  if (!raw) return 'Internet';
  const l = raw.toLowerCase();
  if (l.includes('grameenphone') || l.includes('gp')) return 'Grameenphone (GP)';
  if (l.includes('banglalink')) return 'Banglalink';
  if (l.includes('robi') || l.includes('axiata')) return 'Robi';
  if (l.includes('teletalk')) return 'Teletalk';
  if (l.includes('link3')) return 'Link3 Technologies';
  if (l.includes('amber')) return 'Amber IT';
  if (l.includes('carnival')) return 'Carnival Internet';
  if (l.includes('dot internet')) return 'Dot Internet';
  if (l.includes('sol-bd')) return 'SOL-BD Broadband';
  return raw.replace(/Ltd\.?|Limited|Telecom|Digital Communications/gi, '').trim();
}
