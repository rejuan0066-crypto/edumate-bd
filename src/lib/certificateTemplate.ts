// Certificate template config types + defaults + authentic Bangladeshi Madrasa/Board HTML renderers
// Used by Admin Certificate Template Designer and the print flow.

export type CertType = 'certificate' | 'transfer' | 'testimonial';

export type BodyLayout = 'bilingual' | 'bn-only' | 'en-only' | 'ar-only';

export interface CertTemplateConfig {
  // Page Orientation
  orientation?: 'landscape' | 'portrait';

  // Borders / frame
  borderColor: string;          // outer double border color
  innerBorderColor: string;     // inner thin border color
  borderStyle: 'double' | 'solid' | 'dashed';
  showCornerOrnaments: boolean;
  showWatermark: boolean;
  watermarkOpacity: number;     // 0..0.3

  // Background
  bgGradientFrom: string;
  bgGradientTo: string;

  // Title
  titleColor: string;
  titleBn: string;
  titleEn: string;
  titleAr: string;
  titleFontSize: number;        // px
  showCategorySubtitle: boolean;

  // Header (institution)
  showLogo: boolean;
  logoSize: number;             // px (max 120)
  logoPosition: 'left' | 'center' | 'right';
  logoUrlOverride: string;      // if empty -> use institution.logo_url
  showInstitutionName: boolean;
  showAddress: boolean;
  headerAccentColor: string;

  // Body
  bodyLayout: BodyLayout;
  bodyFontSize: number;         // px
  customBodyBn: string;         // optional override; supports {placeholders}
  customBodyEn: string;
  customBodyAr: string;

  // Info grid
  showInfoGrid: boolean;
  infoColumns: 2 | 3 | 4;

  // Signature / footer
  signaturePosition: 'left' | 'center' | 'right';
  showSeal: boolean;
  showWishes: boolean;
  footerText: string;           // optional extra footer line
  footerSpacingTop?: number;    // mm — padding above footer-extra block
  footerSpacingBottom?: number; // mm — bottom margin of footer-extra block
  footerFontSize?: number;      // pt — footer-extra font size

  // Spacing
  pagePadding: number;          // mm

  // Accent / highlight color used inside body
  highlightColor: string;

  // Theme preset identifier
  themePreset?: 'royal-gold' | 'executive-navy' | 'emerald-heritage';
}

/** 1. Royal Gold Luxury Edition — Landscape A4 (297x210mm) for Certificates & Achievements */
export const ROYAL_GOLD_TEMPLATE: CertTemplateConfig = {
  orientation: 'landscape',
  borderColor: '#b8860b',
  innerBorderColor: '#d4af37',
  borderStyle: 'double',
  showCornerOrnaments: true,
  showWatermark: true,
  watermarkOpacity: 0.05,

  bgGradientFrom: '#fffdf9',
  bgGradientTo: '#faf3e2',

  titleColor: '#5c3a0e',
  titleBn: '',
  titleEn: '',
  titleAr: '',
  titleFontSize: 30,
  showCategorySubtitle: true,

  showLogo: true,
  logoSize: 64,
  logoPosition: 'center',
  logoUrlOverride: '',
  showInstitutionName: true,
  showAddress: true,
  headerAccentColor: '#7a5618',

  bodyLayout: 'bilingual',
  bodyFontSize: 12.5,
  customBodyBn: '',
  customBodyEn: '',
  customBodyAr: '',

  showInfoGrid: true,
  infoColumns: 4,

  signaturePosition: 'right',
  showSeal: true,
  showWishes: true,
  footerText: '',

  pagePadding: 16,
  highlightColor: '#8c5a14',
  themePreset: 'royal-gold',
};

/** 2. Executive Academic Navy Edition — Portrait A4 (210x297mm) for 14-Point Board TC */
export const EXECUTIVE_NAVY_TEMPLATE: CertTemplateConfig = {
  orientation: 'portrait',
  borderColor: '#1e3a8a',
  innerBorderColor: '#3b82f6',
  borderStyle: 'solid',
  showCornerOrnaments: true,
  showWatermark: true,
  watermarkOpacity: 0.035,

  bgGradientFrom: '#ffffff',
  bgGradientTo: '#f4f8fb',

  titleColor: '#0f172a',
  titleBn: '',
  titleEn: '',
  titleAr: '',
  titleFontSize: 24,
  showCategorySubtitle: false,

  showLogo: true,
  logoSize: 58,
  logoPosition: 'left',
  logoUrlOverride: '',
  showInstitutionName: true,
  showAddress: true,
  headerAccentColor: '#1e40af',

  bodyLayout: 'bilingual',
  bodyFontSize: 11.5,
  customBodyBn: '',
  customBodyEn: '',
  customBodyAr: '',

  showInfoGrid: false,
  infoColumns: 2,

  signaturePosition: 'right',
  showSeal: true,
  showWishes: false,
  footerText: '',

  pagePadding: 14,
  highlightColor: '#1d4ed8',
  themePreset: 'executive-navy',
};

/** 3. Islamic Heritage Emerald Edition — Portrait A4 (210x297mm) for Official Letterhead Testimonials */
export const EMERALD_HERITAGE_TEMPLATE: CertTemplateConfig = {
  orientation: 'portrait',
  borderColor: '#065f46',
  innerBorderColor: '#059669',
  borderStyle: 'double',
  showCornerOrnaments: true,
  showWatermark: true,
  watermarkOpacity: 0.045,

  bgGradientFrom: '#f6fbf8',
  bgGradientTo: '#e9f6ef',

  titleColor: '#064e3b',
  titleBn: '',
  titleEn: '',
  titleAr: '',
  titleFontSize: 28,
  showCategorySubtitle: true,

  showLogo: true,
  logoSize: 62,
  logoPosition: 'center',
  logoUrlOverride: '',
  showInstitutionName: true,
  showAddress: true,
  headerAccentColor: '#047857',

  bodyLayout: 'bilingual',
  bodyFontSize: 12.5,
  customBodyBn: '',
  customBodyEn: '',
  customBodyAr: '',

  showInfoGrid: true,
  infoColumns: 3,

  signaturePosition: 'right',
  showSeal: true,
  showWishes: true,
  footerText: '',

  pagePadding: 16,
  highlightColor: '#0f766e',
  themePreset: 'emerald-heritage',
};

export const DEFAULT_TEMPLATE: CertTemplateConfig = ROYAL_GOLD_TEMPLATE;

export const DEFAULT_TEMPLATES_BY_TYPE: Record<CertType, CertTemplateConfig> = {
  certificate: ROYAL_GOLD_TEMPLATE,
  transfer: EXECUTIVE_NAVY_TEMPLATE,
  testimonial: EMERALD_HERITAGE_TEMPLATE,
};

export const PRESET_OPTIONS = [
  {
    id: 'royal-gold',
    nameBn: 'রয়্যাল গোল্ডেন সনদ (Landscape A4)',
    nameEn: 'Royal Gold Luxury (Landscape)',
    iconColor: '#b8860b',
    config: ROYAL_GOLD_TEMPLATE,
  },
  {
    id: 'executive-navy',
    nameBn: 'অফিসিয়াল একাডেমি ছাড়পত্র (Portrait A4)',
    nameEn: 'Executive Academic TC (Portrait)',
    iconColor: '#1e3a8a',
    config: EXECUTIVE_NAVY_TEMPLATE,
  },
  {
    id: 'emerald-heritage',
    nameBn: 'ইসলামিক হেরিটেজ প্রশংসাপত্র (Portrait A4)',
    nameEn: 'Islamic Heritage Testimonial (Portrait)',
    iconColor: '#065f46',
    config: EMERALD_HERITAGE_TEMPLATE,
  },
] as const;

export function mergeTemplate(
  partial: Partial<CertTemplateConfig> | null | undefined,
  certType: CertType = 'certificate'
): CertTemplateConfig {
  const base = DEFAULT_TEMPLATES_BY_TYPE[certType] || DEFAULT_TEMPLATE;
  if (!partial || Object.keys(partial).length === 0) {
    return { ...base };
  }
  return { ...base, ...partial };
}

export const escapeHtml = (v: string) => (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Replace {placeholders} inside a custom body. */
export function fillTemplate(tpl: string, data: Record<string, string>): string {
  if (!tpl) return '';
  return tpl.replace(/\{(\w+)\}/g, (_, k) => data[k] ?? '');
}

export function toBanglaDigits(val: string | number | null | undefined): string {
  if (val == null) return '';
  const map: Record<string, string> = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' };
  return String(val).replace(/[0-9]/g, d => map[d] || d);
}

export function toBanglaDateWords(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = d.getDate();
  const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const year = d.getFullYear();
  return `${toBanglaDigits(day)} ${monthNames[d.getMonth()]}, ${toBanglaDigits(year)} খ্রি.`;
}

export const getCornerSVG = (color: string, preset?: string, certType?: CertType) => {
  if (preset === 'executive-navy' || certType === 'transfer') {
    return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="${color}"><path d="M4 24 L4 4 L24 4" stroke-width="2.4"/><rect x="3" y="3" width="7" height="7" fill="${color}"/><circle cx="20" cy="20" r="2" fill="${color}"/></g></svg>`;
  }
  if (preset === 'emerald-heritage' || certType === 'testimonial') {
    return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="${color}" stroke-width="1.3"><path d="M4 26 Q12 16 16 12 Q20 8 26 4"/><path d="M7 26 Q15 19 19 15 Q23 11 26 7" stroke-width="0.8"/><rect x="18" y="18" width="7" height="7" fill="${color}" fill-opacity="0.25" transform="rotate(45 21.5 21.5)"/><rect x="18" y="18" width="7" height="7" stroke="${color}" stroke-width="1" transform="rotate(0 21.5 21.5)"/><circle cx="21.5" cy="21.5" r="1.5" fill="${color}"/><path d="M4 4 L10 10" stroke-width="1.4"/></g></svg>`;
  }
  // Royal gold (default / certificate)
  return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="${color}" stroke-width="1.3"><path d="M4 22 C4 12, 12 4, 22 4"/><path d="M8 22 C8 14, 14 8, 22 8"/><circle cx="22" cy="22" r="3.5" fill="${color}" fill-opacity="0.25"/><circle cx="22" cy="22" r="1.5" fill="${color}"/><path d="M22 4 L28 10 M4 22 L10 28" stroke-width="1.2"/><path d="M4 4 L14 14" stroke-width="1.6"/><circle cx="7" cy="7" r="1.5" fill="${color}"/></g></svg>`;
};

export interface RenderInput {
  cfg: CertTemplateConfig;
  certType: CertType;
  /** Default title fallback (e.g. "Certificate of Achievement") */
  defaultTitleBn: string;
  defaultTitleEn: string;
  defaultTitleAr?: string;
  /** Override the saved cfg.bodyLayout at print time (per-print language choice). */
  bodyLayoutOverride?: BodyLayout;
  /** All resolved placeholder values for body / info etc. */
  data: {
    institutionNameBn: string;
    institutionNameEn: string;
    institutionNameAr?: string;
    institutionAddress: string;
    institutionAddressAr?: string;
    institutionPhone: string;
    institutionEmail: string;
    institutionLogo: string;
    monogram: string;
    serial: string;
    issueDateBn: string;
    issueDateEn: string;
    nameBn: string;
    nameEn: string;
    nameAr?: string;
    fatherName: string;
    fatherNameAr?: string;
    motherName: string;
    motherNameAr?: string;
    classBn: string;
    classEn: string;
    classAr?: string;
    sessionName: string;
    studentId: string;
    rollNumber: string;
    dobBn: string;
    dobEn: string;
    admissionDateBn: string;
    admissionDateEn: string;
    leavingDateBn: string;
    leavingDateEn: string;
    conduct: string;
    conductAr?: string;
    reason: string;
    reasonAr?: string;
    achievements: string;
    achievementsAr?: string;
    purpose: string;
    purposeAr?: string;
    remarks: string;
    remarksAr?: string;
    lastClass: string;
    lastClassAr?: string;
    categoryBn: string;
    categoryEn: string;
    categoryAr?: string;
    bodyBn: string;
    bodyEn: string;
    bodyAr?: string;
    principalName: string;
    principalNameEn?: string;
    principalNameAr?: string;
    principalTitleBn: string;
    principalTitleEn: string;
    principalTitleAr?: string;
    // Additional authentic TC and Testimonial fields
    permanentAddress?: string;
    presentAddress?: string;
    birthRegNo?: string;
    registrationNo?: string;
    examResult?: string;
    duesStatus?: string;
    noObjection?: string;
    establishmentYear?: string;
    registrationNumber?: string;
    officeAssistantName?: string;
    classTeacherName?: string;
  };
}

/** Master renderer dispatcher */
export function renderCertificateHTML(input: RenderInput): string {
  if (input.certType === 'transfer') {
    return renderTransferCertificateHTML(input);
  }
  if (input.certType === 'testimonial') {
    return renderTestimonialHTML(input);
  }
  return renderSanadCertificateHTML(input);
}

/* ═══════════════════════════════════════════════════════════════════
   1. সনদপত্র (CERTIFICATE / SANAD) — LANDSCAPE A4 (297mm × 210mm)
   ═══════════════════════════════════════════════════════════════════ */
function renderSanadCertificateHTML(input: RenderInput): string {
  const { cfg: baseCfg, defaultTitleBn, defaultTitleEn, defaultTitleAr = '', data, certType, bodyLayoutOverride } = input;
  const cfg: CertTemplateConfig = bodyLayoutOverride ? { ...baseCfg, bodyLayout: bodyLayoutOverride } : baseCfg;
  const isLandscape = (cfg.orientation ?? 'landscape') === 'landscape';

  const isBnOnly = cfg.bodyLayout === 'bn-only';
  const isEnOnly = cfg.bodyLayout === 'en-only';
  const isArOnly = cfg.bodyLayout === 'ar-only';
  const showBn = !isEnOnly && !isArOnly;
  const showEn = !isBnOnly && !isArOnly;
  const showAr = isArOnly;

  const titleBn = cfg.titleBn || defaultTitleBn || 'প্রশংসা সনদপত্র';
  const titleEn = cfg.titleEn || defaultTitleEn || 'Certificate of Excellence';
  const titleAr = cfg.titleAr || defaultTitleAr || 'شهادة تقدير وتفوق';

  const bodyBn = cfg.customBodyBn ? fillTemplate(cfg.customBodyBn, data as any) : data.bodyBn;
  const bodyEn = cfg.customBodyEn ? fillTemplate(cfg.customBodyEn, data as any) : data.bodyEn;
  const bodyAr = cfg.customBodyAr ? fillTemplate(cfg.customBodyAr, data as any) : (data.bodyAr || '');

  const logoUrl = cfg.logoUrlOverride || data.institutionLogo;
  const cornerSvg = getCornerSVG(cfg.borderColor, cfg.themePreset, certType);

  const instNamePrimary = isArOnly
    ? (data.institutionNameAr || data.institutionNameBn || data.institutionNameEn)
    : isEnOnly
      ? (data.institutionNameEn || data.institutionNameBn)
      : (data.institutionNameBn || data.institutionNameEn);
  const instNameSecondary = (isEnOnly || isBnOnly || isArOnly)
    ? ''
    : (data.institutionNameEn && data.institutionNameEn !== data.institutionNameBn ? data.institutionNameEn : '');

  const instAddress = isArOnly ? (data.institutionAddressAr || data.institutionAddress) : data.institutionAddress;
  const categoryText = isArOnly ? (data.categoryAr || data.categoryBn) : isBnOnly ? data.categoryBn : (data.categoryEn || data.categoryBn);

  const docDir = isArOnly ? 'rtl' : 'ltr';
  const docLang = isArOnly ? 'ar' : 'bn';

  const pageW = isLandscape ? '297mm' : '210mm';
  const pageH = isLandscape ? '210mm' : '297mm';

  return `<!DOCTYPE html><html lang="${docLang}" dir="${docDir}"><head><meta charset="utf-8">
<title>${escapeHtml(titleEn || titleBn)} — ${escapeHtml(data.nameEn || data.nameBn)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@400;500;600;700&family=Cinzel:wght@500;600;700;800&family=Great+Vibes&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Reem+Kufi:wght@600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:${pageW} ${pageH};margin:0}
  html,body{width:${pageW};height:${pageH};background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color:#1a1410;font-family:'Cormorant Garamond','Noto Serif Bengali',serif}
  .page{width:${pageW};height:${pageH};position:relative;overflow:hidden;background:radial-gradient(ellipse at center,${cfg.bgGradientFrom} 0%,${cfg.bgGradientTo} 100%)}
  
  /* Triple Security Borders */
  .frame-outer{position:absolute;inset:7mm;border:4px ${cfg.borderStyle} ${cfg.borderColor};border-radius:2px;pointer-events:none}
  .frame-inner{position:absolute;inset:10mm;border:1.2px solid ${cfg.innerBorderColor};pointer-events:none}
  .frame-hairline{position:absolute;inset:12mm;border:0.6px solid ${cfg.borderColor};opacity:0.65;pointer-events:none}
  
  /* Guilloche Corner Ornaments */
  .corner{position:absolute;width:44px;height:44px;pointer-events:none}
  .corner svg{display:block;width:100%;height:100%}
  .corner.tl{top:8mm;left:8mm}
  .corner.tr{top:8mm;right:8mm;transform:rotate(90deg)}
  .corner.br{bottom:8mm;right:8mm;transform:rotate(180deg)}
  .corner.bl{bottom:8mm;left:8mm;transform:rotate(270deg)}
  
  /* Watermark */
  .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel',serif;font-size:320px;font-weight:700;color:${cfg.borderColor};opacity:${cfg.watermarkOpacity};pointer-events:none;z-index:0;display:flex;align-items:center;justify-content:center}
  .watermark img{width:110mm;height:110mm;object-fit:contain;filter:grayscale(100%)}
  
  /* Layout Content */
  .content{position:relative;z-index:2;padding:${cfg.pagePadding}mm ${cfg.pagePadding + 4}mm 10mm;height:100%;display:flex;flex-direction:column;justify-content:space-between}
  
  /* Header */
  .bismillah{text-align:center;font-family:'Amiri','Scheherazade New',serif;font-size:16px;font-weight:700;color:${cfg.headerAccentColor};letter-spacing:1px;margin-bottom:2px}
  .header{display:flex;align-items:center;justify-content:center;gap:16px;text-align:center;padding-bottom:6px;border-bottom:1px solid rgba(184,134,11,0.28)}
  .header-logo{width:${cfg.logoSize}px;height:${cfg.logoSize}px;object-fit:contain}
  .inst-bn{font-family:'Noto Serif Bengali',serif;font-size:23px;font-weight:700;color:${cfg.titleColor};line-height:1.2}
  .inst-en{font-family:'Cinzel',serif;font-size:11.5px;font-weight:600;color:${cfg.headerAccentColor};letter-spacing:3px;text-transform:uppercase;margin-top:2px}
  .inst-meta{font-size:10px;color:${cfg.headerAccentColor};margin-top:2px}
  
  /* Grand Cartouche Title Plaque */
  .title-cartouche{text-align:center;margin:6px 0 4px}
  .cartouche-badge{display:inline-block;padding:5px 32px;background:linear-gradient(180deg,#fffefb 0%,#fbf3e0 100%);border:1.5px solid ${cfg.borderColor};border-radius:28px;box-shadow:0 2px 6px rgba(184,134,11,0.15);position:relative}
  .cartouche-badge::before,.cartouche-badge::after{content:'❖';position:absolute;top:50%;transform:translateY(-50%);color:${cfg.borderColor};font-size:11px}
  .cartouche-badge::before{left:12px}
  .cartouche-badge::after{right:12px}
  .cartouche-bn{font-family:'Noto Serif Bengali',serif;font-size:${cfg.titleFontSize}px;font-weight:700;color:${cfg.titleColor};letter-spacing:2px;line-height:1.2}
  .cartouche-en{font-family:'Cinzel',serif;font-size:${Math.round(cfg.titleFontSize * 0.44)}px;font-weight:700;color:${cfg.headerAccentColor};letter-spacing:4px;text-transform:uppercase;margin-top:1px}
  .cartouche-ar{font-family:'Reem Kufi','Amiri',serif;font-size:${cfg.titleFontSize}px;font-weight:700;color:${cfg.titleColor};direction:rtl}
  .category-pill{font-family:'Noto Serif Bengali',serif;font-size:11px;font-weight:600;color:${cfg.headerAccentColor};background:rgba(212,175,55,0.12);padding:2px 14px;border-radius:12px;display:inline-block;margin-top:4px;border:0.5px solid rgba(184,134,11,0.25)}
  
  /* Meta bar */
  .meta-bar{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:${cfg.headerAccentColor};padding:3px 6px;margin:2px 0 4px;border-top:1px dashed rgba(184,134,11,0.3);border-bottom:1px dashed rgba(184,134,11,0.3)}
  .meta-bar b{color:${cfg.titleColor};font-weight:600}
  
  /* Recipient */
  .presented{text-align:center;font-size:11px;color:${cfg.headerAccentColor};letter-spacing:2px;text-transform:uppercase;margin-bottom:2px;font-family:'Noto Serif Bengali',serif}
  .recipient{text-align:center;margin:1px 0 5px}
  .recipient-name{font-family:'Noto Serif Bengali',serif;font-size:26px;font-weight:800;color:${cfg.titleColor};line-height:1.15}
  .recipient-en{font-family:'Great Vibes',cursive;font-size:32px;color:${cfg.headerAccentColor};line-height:1;margin-top:1px}
  .recipient-ar{font-family:'Amiri',serif;font-size:30px;font-weight:700;color:${cfg.titleColor};direction:rtl}
  .recipient-flourish{display:flex;align-items:center;justify-content:center;gap:8px;margin:2px auto 0;color:${cfg.borderColor};font-size:11px}
  .recipient-flourish::before,.recipient-flourish::after{content:'';width:100px;height:1px;background:linear-gradient(90deg,transparent,${cfg.borderColor},transparent)}
  
  /* Student Info Badges */
  .student-strip{display:flex;justify-content:center;flex-wrap:wrap;gap:16px;margin:3px 0 6px;padding:3px 8px;background:rgba(212,175,55,0.06);border-radius:20px;border:0.5px solid rgba(184,134,11,0.15)}
  .strip-item{font-size:10.5px;color:#2c1e0f}
  .strip-item b{color:${cfg.headerAccentColor};font-weight:600;margin-right:4px}
  
  /* Body Citation */
  .body-wrap{margin:4px 0 8px;flex:1;display:flex;flex-direction:column;justify-content:center}
  .body-grid{display:grid;gap:12px}
  .body-grid.two-col{grid-template-columns:1fr 1fr}
  .body-grid.one-col{grid-template-columns:1fr}
  .citation-box{padding:7px 12px;background:rgba(255,253,248,0.7);border-radius:4px;border:1px solid rgba(184,134,11,0.2);line-height:1.8;text-align:justify;font-size:${cfg.bodyFontSize}px;color:#241808}
  .citation-box.bn{font-family:'Noto Serif Bengali',serif}
  .citation-box.en{font-family:'Cormorant Garamond',serif}
  .citation-box.ar{font-family:'Amiri',serif;direction:rtl;font-size:${cfg.bodyFontSize + 2}px;line-height:2.0}
  .lang-tag{font-size:8.5px;font-weight:700;color:${cfg.headerAccentColor};letter-spacing:1.5px;text-transform:uppercase;text-align:center;border-bottom:1px dotted rgba(184,134,11,0.3);padding-bottom:2px;margin-bottom:4px}
  .hl{color:${cfg.highlightColor};font-weight:700}
  
  /* Tri-Signature Bottom Approval */
  .signatures-row{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding-top:6px;border-top:1px solid rgba(184,134,11,0.35);margin-top:auto}
  .sig-col{text-align:center;min-width:180px}
  .sig-col .sig-line{border-top:1.5px solid ${cfg.titleColor};margin:24px 10px 4px}
  .sig-col .sig-name{font-family:'Noto Serif Bengali',serif;font-size:12.5px;font-weight:700;color:${cfg.titleColor}}
  .sig-col .sig-title-bn{font-family:'Noto Serif Bengali',serif;font-size:10.5px;color:${cfg.headerAccentColor}}
  .sig-col .sig-title-en{font-family:'Cinzel',serif;font-size:8.5px;color:${cfg.headerAccentColor};letter-spacing:1px;text-transform:uppercase}
  
  /* Seal Medallion */
  .seal-medallion{width:82px;height:82px;border:2px dashed ${cfg.borderColor};border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:${cfg.headerAccentColor};text-align:center;background:rgba(212,175,55,0.04);position:relative;padding:4px}
  .seal-medallion .seal-ring{position:absolute;inset:3px;border:1px solid ${cfg.innerBorderColor};border-radius:50%;opacity:0.8}
  .seal-medallion .seal-star{font-size:8px;color:${cfg.borderColor};letter-spacing:2px;line-height:1}
  .seal-medallion .seal-main{font-family:'Cinzel',serif;font-size:7px;font-weight:700;letter-spacing:1px;color:${cfg.titleColor};margin:2px 0;text-transform:uppercase}
  .seal-medallion .seal-bn{font-family:'Noto Serif Bengali',serif;font-size:8px;font-weight:700;color:${cfg.titleColor}}
  
  /* Extra Footer */
  .footer-extra{text-align:center;font-size:${cfg.footerFontSize ?? 9}pt;color:${cfg.headerAccentColor};margin-top:4px;padding-top:3px;font-style:italic}
  @media print{body{margin:0}.page{box-shadow:none}}
</style>
</head>
<body>
<div class="page">
  <div class="frame-outer"></div>
  <div class="frame-inner"></div>
  <div class="frame-hairline"></div>
  ${cfg.showCornerOrnaments ? `
    <div class="corner tl">${cornerSvg}</div>
    <div class="corner tr">${cornerSvg}</div>
    <div class="corner bl">${cornerSvg}</div>
    <div class="corner br">${cornerSvg}</div>` : ''}
  
  ${cfg.showWatermark ? `
    <div class="watermark">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt=""/>` : escapeHtml(data.monogram || 'AG')}
    </div>` : ''}

  <div class="content">
    <!-- Header -->
    <div>
      <div class="bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ</div>
      <div class="header">
        ${cfg.showLogo && logoUrl ? `<img src="${escapeHtml(logoUrl)}" class="header-logo" alt=""/>` : ''}
        <div>
          ${cfg.showInstitutionName ? `<div class="inst-bn">${escapeHtml(instNamePrimary)}</div>` : ''}
          ${instNameSecondary ? `<div class="inst-en">${escapeHtml(instNameSecondary)}</div>` : ''}
          ${cfg.showAddress ? `<div class="inst-meta">${escapeHtml(instAddress)}${data.institutionPhone ? ` &middot; ${escapeHtml(data.institutionPhone)}` : ''}${data.institutionEmail ? ` &middot; ${escapeHtml(data.institutionEmail)}` : ''}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Title Cartouche Ribbon -->
    <div class="title-cartouche">
      <div class="cartouche-badge">
        ${showBn ? `<div class="cartouche-bn">${escapeHtml(titleBn)}</div>` : ''}
        ${showEn ? `<div class="cartouche-en">${escapeHtml(titleEn)}</div>` : ''}
        ${showAr ? `<div class="cartouche-ar">${escapeHtml(titleAr)}</div>` : ''}
      </div>
      ${cfg.showCategorySubtitle && categoryText ? `<div><span class="category-pill">${escapeHtml(categoryText)}</span></div>` : ''}
    </div>

    <!-- Meta bar -->
    <div class="meta-bar">
      <span><b>সনদ নং / Certificate No:</b> ${escapeHtml(data.serial)}</span>
      <span><b>প্রদানের তারিখ / Date:</b> ${isEnOnly || isArOnly ? escapeHtml(data.issueDateEn) : isBnOnly ? escapeHtml(data.issueDateBn) : `${escapeHtml(data.issueDateBn)} (${escapeHtml(data.issueDateEn)})`}</span>
    </div>

    <!-- Recipient -->
    <div>
      <div class="presented">${isArOnly ? 'يُمنح هذا التقدير بكل فخر واعتزاز إلى' : isEnOnly ? 'This Certificate of Excellence is Proudly Awarded to' : isBnOnly ? 'এই মর্মে সানন্দে ও মর্যাদার সাথে সনদপত্র প্রদান করা হচ্ছে যে' : 'This Certificate of Excellence is Awarded to &middot; এই মর্মে সনদ প্রদান করা হলো'}</div>
      <div class="recipient">
        ${isArOnly ? `<div class="recipient-ar">${escapeHtml(data.nameAr || data.nameBn || data.nameEn)}</div>` :
          isEnOnly ? `<div class="recipient-name" style="font-family:'Cinzel',serif;">${escapeHtml(data.nameEn || data.nameBn)}</div>` :
          `<div class="recipient-name">${escapeHtml(data.nameBn || data.nameEn)}</div>${showEn && data.nameEn && data.nameEn !== data.nameBn ? `<div class="recipient-en">${escapeHtml(data.nameEn)}</div>` : ''}`}
        <div class="recipient-flourish">❦ ═══════════════ ◆ ═══════════════ ❦</div>
      </div>
    </div>

    <!-- Badges strip -->
    <div class="student-strip">
      ${data.studentId ? `<span class="strip-item"><b>আইডি:</b> ${escapeHtml(data.studentId)}</span>` : ''}
      ${data.rollNumber ? `<span class="strip-item"><b>রোল:</b> ${escapeHtml(data.rollNumber)}</span>` : ''}
      ${data.classBn || data.classEn ? `<span class="strip-item"><b>শ্রেণি:</b> ${escapeHtml(isBnOnly ? data.classBn : data.classEn || data.classBn)}</span>` : ''}
      ${data.sessionName ? `<span class="strip-item"><b>সেশন:</b> ${escapeHtml(data.sessionName)}</span>` : ''}
      ${data.fatherName ? `<span class="strip-item"><b>পিতা:</b> ${escapeHtml(data.fatherName)}</span>` : ''}
      ${data.motherName ? `<span class="strip-item"><b>মাতা:</b> ${escapeHtml(data.motherName)}</span>` : ''}
    </div>

    <!-- Body Citation -->
    <div class="body-wrap">
      ${cfg.bodyLayout === 'bilingual' ? `
        <div class="body-grid two-col">
          <div class="citation-box bn"><div class="lang-tag">বাংলা বিবরণ</div>${bodyBn}</div>
          <div class="citation-box en"><div class="lang-tag">English Citation</div>${bodyEn}</div>
        </div>
      ` : cfg.bodyLayout === 'bn-only' ? `
        <div class="body-grid one-col">
          <div class="citation-box bn">${bodyBn}</div>
        </div>
      ` : cfg.bodyLayout === 'ar-only' ? `
        <div class="body-grid one-col">
          <div class="citation-box ar">${bodyAr}</div>
        </div>
      ` : `
        <div class="body-grid one-col">
          <div class="citation-box en">${bodyEn}</div>
        </div>
      `}
    </div>

    <!-- Tri-Signature Footer -->
    <div>
      <div class="signatures-row">
        <!-- 1. Left: Prepared by -->
        <div class="sig-col">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.officeAssistantName || 'অফিস সহকারী')}</div>
          <div class="sig-title-bn">প্রস্তুতকারক ও যাচাইকারী</div>
          <div class="sig-title-en">Prepared By</div>
        </div>

        <!-- 2. Center: Official Seal -->
        ${cfg.showSeal ? `
          <div class="seal-medallion">
            <div class="seal-ring"></div>
            <div class="seal-star">★ ★ ★</div>
            <div class="seal-main">OFFICIAL SEAL</div>
            <div class="seal-bn">যাচাইকৃত সনদ</div>
            <div class="seal-star">★ ★ ★</div>
          </div>
        ` : '<div></div>'}

        <!-- 3. Right: Principal -->
        <div class="sig-col">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.principalName || 'মুহতামিম / অধ্যক্ষ')}</div>
          ${showEn && data.principalNameEn && data.principalNameEn !== data.principalName ? `<div style="font-family:'Cinzel',serif;font-size:9px;color:${cfg.headerAccentColor};letter-spacing:1px">${escapeHtml(data.principalNameEn)}</div>` : ''}
          <div class="sig-title-bn">${escapeHtml(data.principalTitleBn || 'অধ্যক্ষ / মুহতামিম')}</div>
          <div class="sig-title-en">${escapeHtml(data.principalTitleEn || 'Principal')}</div>
        </div>
      </div>

      ${cfg.footerText ? `<div class="footer-extra">${escapeHtml(cfg.footerText)}</div>` : ''}
    </div>
  </div>
</div>
</body></html>`;
}

/* ═══════════════════════════════════════════════════════════════════
   2. ছাড়পত্র (TRANSFER CERTIFICATE / TC) — PORTRAIT A4 (210mm × 297mm)
   Authentic 14-Point Madrasa & Education Board Official Ledger Form
   ═══════════════════════════════════════════════════════════════════ */
function renderTransferCertificateHTML(input: RenderInput): string {
  const { cfg: baseCfg, data, defaultTitleBn, defaultTitleEn, bodyLayoutOverride } = input;
  const cfg: CertTemplateConfig = bodyLayoutOverride ? { ...baseCfg, bodyLayout: bodyLayoutOverride } : baseCfg;

  const isBnOnly = cfg.bodyLayout === 'bn-only';
  const isEnOnly = cfg.bodyLayout === 'en-only';
  const showEn = !isBnOnly;

  const titleBn = cfg.titleBn || defaultTitleBn || 'ছাড়পত্র';
  const titleEn = cfg.titleEn || defaultTitleEn || 'TRANSFER CERTIFICATE';

  const logoUrl = cfg.logoUrlOverride || data.institutionLogo;
  const instNameBn = data.institutionNameBn || data.institutionNameEn;
  const instNameEn = data.institutionNameEn;

  // Address details
  const permAddr = data.permanentAddress || data.institutionAddress || '—';
  const presAddr = data.presentAddress || data.institutionAddress || '—';

  // DOB in figures and words
  const dobFigures = isBnOnly ? (data.dobBn || data.dobEn || '—') : (data.dobEn || data.dobBn || '—');
  const dobWords = toBanglaDateWords(data.dobEn || data.dobBn);

  const admissionDateStr = isBnOnly ? (data.admissionDateBn || data.admissionDateEn || '—') : (data.admissionDateEn || data.admissionDateBn || '—');
  const examResultStr = data.examResult || data.achievements || 'কৃতকার্য / উত্তীর্ণ (Passed & Promoted)';
  const duesStr = data.duesStatus || 'সম্পূর্ণ পরিশোধিত (All Dues Cleared)';
  const conductStr = data.conduct || 'উত্তম ও প্রশংসনীয় (Exemplary)';
  const noObjStr = data.noObjection || 'কোনো আপত্তি নাই (No Objection)';
  const reasonStr = data.reason || 'অভিভাবকের বদলি / উচ্চ শিক্ষায় ভর্তি';

  const cornerSvg = getCornerSVG(cfg.borderColor, 'executive-navy', 'transfer');

  return `<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8">
<title>${escapeHtml(titleEn)} (${escapeHtml(titleBn)}) — ${escapeHtml(data.nameBn || data.nameEn)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@400;500;600;700&family=Cinzel:wght@600;700&family=Amiri:wght@700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:210mm 297mm;margin:0}
  html,body{width:210mm;height:297mm;background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color:#0f172a;font-family:'Noto Serif Bengali','Cormorant Garamond',serif}
  .page{width:210mm;height:297mm;position:relative;overflow:hidden;background:#ffffff;padding:${cfg.pagePadding}mm}
  
  /* Executive Navy Outer Borders */
  .frame-outer{position:absolute;inset:7mm;border:2.5px solid ${cfg.borderColor};pointer-events:none}
  .frame-inner{position:absolute;inset:9.5mm;border:0.8px solid ${cfg.innerBorderColor};pointer-events:none}
  
  .corner{position:absolute;width:34px;height:34px;pointer-events:none}
  .corner svg{display:block;width:100%;height:100%}
  .corner.tl{top:7.5mm;left:7.5mm}
  .corner.tr{top:7.5mm;right:7.5mm;transform:rotate(90deg)}
  .corner.br{bottom:7.5mm;right:7.5mm;transform:rotate(180deg)}
  .corner.bl{bottom:7.5mm;left:7.5mm;transform:rotate(270deg)}
  
  /* Watermark */
  .watermark{position:absolute;top:52%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel',serif;font-size:260px;font-weight:700;color:${cfg.borderColor};opacity:${cfg.watermarkOpacity};pointer-events:none;z-index:0;display:flex;align-items:center;justify-content:center}
  .watermark img{width:110mm;height:110mm;object-fit:contain;filter:grayscale(100%)}
  
  .content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:space-between}
  
  /* Institutional Pad Header */
  .bismillah{text-align:center;font-family:'Amiri',serif;font-size:15px;color:${cfg.headerAccentColor};font-weight:700;margin-bottom:2px}
  .header{display:flex;align-items:center;justify-content:center;gap:14px;padding-bottom:6px;border-bottom:2px solid ${cfg.borderColor};text-align:center}
  .header-logo{width:${cfg.logoSize}px;height:${cfg.logoSize}px;object-fit:contain}
  .inst-title{font-size:21px;font-weight:800;color:${cfg.titleColor};line-height:1.2}
  .inst-sub{font-size:10px;color:#334155;margin-top:2px}
  .inst-contact{font-size:9.5px;color:${cfg.headerAccentColor};margin-top:1px}
  
  /* Memo & Date bar */
  .memo-date-bar{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:#1e293b;padding:4px 2px;margin:3px 0 4px}
  .memo-date-bar b{color:${cfg.borderColor}}
  
  /* Formal TC Title Box */
  .title-box{text-align:center;margin:3px 0 6px}
  .title-badge{display:inline-block;border:2px solid ${cfg.borderColor};background:#f0f6fc;padding:4px 24px;border-radius:4px}
  .title-main{font-size:16px;font-weight:800;color:${cfg.borderColor};letter-spacing:1px;line-height:1.2}
  .title-sub{font-size:9px;color:#475569;margin-top:1px}
  
  /* 14-Point Numbered Official Ledger Table */
  .tc-table{width:100%;border-collapse:collapse;font-size:10.5px;margin:4px 0 6px}
  .tc-table th,.tc-table td{border:1px solid #cbd5e1;padding:3.8px 7px;vertical-align:middle}
  .tc-table thead th{background:#e2e8f0;color:#0f172a;font-weight:700;text-align:left;font-size:10px}
  .tc-table td.col-num{width:32px;text-align:center;font-weight:700;color:${cfg.borderColor};background:#f8fafc}
  .tc-table td.col-label{width:215px;color:#1e293b;font-weight:600;background:#f8fafc}
  .tc-table td.col-val{color:#091e42}
  .tc-table b{color:#0f172a}
  
  .badge-tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:9.5px;font-weight:700}
  .badge-green{background:#dcfce7;color:#15803d;border:0.5px solid #86efac}
  .badge-blue{background:#e0f2fe;color:#0369a1;border:0.5px solid #7dd3fc}
  
  /* Clearance Declaration */
  .declaration{font-size:10.5px;line-height:1.7;text-align:justify;padding:6px 10px;background:#f8fafc;border-left:3px solid ${cfg.borderColor};border-radius:2px;margin:4px 0 8px;color:#1e293b}
  
  /* Tri-Signature Footer */
  .signatures-row{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:auto;padding-top:6px;border-top:1px solid #cbd5e1}
  .sig-col{text-align:center;flex:1}
  .sig-col .sig-line{border-top:1.5px solid #1e293b;margin:28px 12px 3px}
  .sig-col .sig-name{font-size:11.5px;font-weight:700;color:#0f172a}
  .sig-col .sig-title-bn{font-size:10px;color:#334155}
  .sig-col .sig-title-en{font-size:8.5px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px}
  
  /* Official TC Circular Seal */
  .tc-seal-col{text-align:center;width:90px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .tc-seal-ring{width:70px;height:70px;border:1.5px dashed ${cfg.borderColor};border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3px;text-align:center;font-size:7px;color:${cfg.headerAccentColor};background:#f8fafc}
  .tc-seal-ring b{font-size:7.5px;color:${cfg.borderColor};display:block;margin-bottom:1px}
  
  .footer-extra{text-align:center;font-size:${cfg.footerFontSize ?? 9}pt;color:#64748b;margin-top:4px}
  @media print{body{margin:0}.page{box-shadow:none}}
</style>
</head>
<body>
<div class="page">
  <div class="frame-outer"></div>
  <div class="frame-inner"></div>
  ${cfg.showCornerOrnaments ? `
    <div class="corner tl">${cornerSvg}</div>
    <div class="corner tr">${cornerSvg}</div>
    <div class="corner bl">${cornerSvg}</div>
    <div class="corner br">${cornerSvg}</div>` : ''}

  ${cfg.showWatermark ? `
    <div class="watermark">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt=""/>` : 'TC'}
    </div>` : ''}

  <div class="content">
    <!-- Header -->
    <div>
      <div class="bismillah">بِسْمِ اللهِ الرَّحْمٰনِ الرَّحِيمِ</div>
      <div class="header">
        ${cfg.showLogo && logoUrl ? `<img src="${escapeHtml(logoUrl)}" class="header-logo" alt=""/>` : ''}
        <div>
          <div class="inst-title">${escapeHtml(instNameBn)}</div>
          ${instNameEn && instNameEn !== instNameBn ? `<div style="font-family:'Cinzel',serif;font-size:11px;font-weight:600;color:${cfg.headerAccentColor};letter-spacing:2px;text-transform:uppercase;">${escapeHtml(instNameEn)}</div>` : ''}
          <div class="inst-sub">বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড / শিক্ষা মন্ত্রণালয় অনুমোদিত &bull; কোড/রেজি: ${escapeHtml(data.registrationNumber || data.serial.split('-')[1] || 'স্বীকৃত')}</div>
          <div class="inst-contact">${escapeHtml(data.institutionAddress)}${data.institutionPhone ? ` &bull; ফোন: ${escapeHtml(data.institutionPhone)}` : ''}${data.institutionEmail ? ` &bull; ইমেইল: ${escapeHtml(data.institutionEmail)}` : ''}</div>
        </div>
      </div>
    </div>

    <!-- Memo & Date Bar -->
    <div class="memo-date-bar">
      <span><b>স্মারক নং / Memo No:</b> ${escapeHtml(data.serial)}</span>
      <span><b>তারিখ / Date:</b> ${escapeHtml(data.issueDateBn)} (${escapeHtml(data.issueDateEn)})</span>
    </div>

    <!-- Formal TC Title Box -->
    <div class="title-box">
      <div class="title-badge">
        <div class="title-main">${escapeHtml(titleBn)} ${showEn ? `(${escapeHtml(titleEn)})` : ''}</div>
        <div class="title-sub">অত্র প্রতিষ্ঠানের মূল ভর্তি ও ছাত্র-ছাত্রী হাজিরা রেজিস্টার বহি অনুযায়ী প্রদত্ত ছাড়পত্র</div>
      </div>
    </div>

    <!-- 14-Point Numbered Official Ledger Table -->
    <table class="tc-table">
      <thead>
        <tr>
          <th style="width:34px;text-align:center">ক্র.</th>
          <th style="width:220px">বিবরণ / Particulars</th>
          <th>তথ্যাবলি / Student's Records</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="col-num">০১</td>
          <td class="col-label">শিক্ষার্থীর পূর্ণ নাম / Full Name</td>
          <td class="col-val"><b>${escapeHtml(data.nameBn)}</b> ${data.nameEn && data.nameEn !== data.nameBn ? `(${escapeHtml(data.nameEn)})` : ''}</td>
        </tr>
        <tr>
          <td class="col-num">০২</td>
          <td class="col-label">পিতার নাম / Father's Name</td>
          <td class="col-val">${escapeHtml(data.fatherName || '—')}</td>
        </tr>
        <tr>
          <td class="col-num">০৩</td>
          <td class="col-label">মাতার নাম / Mother's Name</td>
          <td class="col-val">${escapeHtml(data.motherName || '—')}</td>
        </tr>
        <tr>
          <td class="col-num">০৪</td>
          <td class="col-label">স্থায়ী ঠিকানা / Permanent Address</td>
          <td class="col-val">${escapeHtml(permAddr)}</td>
        </tr>
        <tr>
          <td class="col-num">০৫</td>
          <td class="col-label">বর্তমান ঠিকানা / Present Address</td>
          <td class="col-val">${escapeHtml(presAddr)}</td>
        </tr>
        <tr>
          <td class="col-num">০৬</td>
          <td class="col-label">জন্ম তারিখ / Date of Birth</td>
          <td class="col-val"><b>${escapeHtml(dobFigures)}</b> ${dobWords ? `<span style="color:#475569;margin-left:4px;">(কথায়: ${escapeHtml(dobWords)})</span>` : ''}</td>
        </tr>
        <tr>
          <td class="col-num">০৭</td>
          <td class="col-label">জন্ম নিবন্ধন / এনআইডি নম্বর</td>
          <td class="col-val">${escapeHtml(data.birthRegNo || data.registrationNo || data.studentId || '—')}</td>
        </tr>
        <tr>
          <td class="col-num">০৮</td>
          <td class="col-label">অত্র প্রতিষ্ঠানে ভর্তির তারিখ ও শ্রেণি</td>
          <td class="col-val">ভর্তির তারিখ: <b>${escapeHtml(admissionDateStr)}</b></td>
        </tr>
        <tr>
          <td class="col-num">০৯</td>
          <td class="col-label">সর্বশেষ অধ্যয়নরত শ্রেণি ও রোল</td>
          <td class="col-val">শ্রেণি: <b>${escapeHtml(data.lastClass || data.classBn || 'দশম')}</b>, রোল নং: <b>${escapeHtml(data.rollNumber || '—')}</b>, সেশন: <b>${escapeHtml(data.sessionName || '—')}</b></td>
        </tr>
        <tr>
          <td class="col-num">১০</td>
          <td class="col-label">সর্বশেষ বার্ষিক পরীক্ষার ফলাফল</td>
          <td class="col-val"><span class="badge-tag badge-blue">${escapeHtml(examResultStr)}</span></td>
        </tr>
        <tr>
          <td class="col-num">১১</td>
          <td class="col-label">প্রতিষ্ঠান ত্যাগের তারিখ ও কারণ</td>
          <td class="col-val">${data.leavingDateBn ? `ত্যাগের তারিখ: <b>${escapeHtml(data.leavingDateBn)}</b>, ` : ''}কারণ: <b>${escapeHtml(reasonStr)}</b></td>
        </tr>
        <tr>
          <td class="col-num">১২</td>
          <td class="col-label">সকল প্রকার বেতন ও বকেয়া পাওনা</td>
          <td class="col-val"><span class="badge-tag badge-green">${escapeHtml(duesStr)}</span></td>
        </tr>
        <tr>
          <td class="col-num">১৩</td>
          <td class="col-label">শিক্ষার্থীর চরিত্র ও নৈতিক আচরণ</td>
          <td class="col-val"><b>${escapeHtml(conductStr)}</b></td>
        </tr>
        <tr>
          <td class="col-num">১৪</td>
          <td class="col-label">অন্য প্রতিষ্ঠানে ভর্তিতে কোনো আপত্তি</td>
          <td class="col-val"><b>${escapeHtml(noObjStr)}</b></td>
        </tr>
      </tbody>
    </table>

    <!-- Official Clearance Declaration -->
    <div class="declaration">
      <b>প্রত্যয়নপত্র:</b> এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, উপরোক্ত যাবতীয় তথ্যাবলি অত্র প্রতিষ্ঠানের মূল ভর্তি ও হাজিরা রেজিস্টার অনুযায়ী পুঙ্খানুপুঙ্খরূপে যাচাই করিয়া সঠিক পাওয়া গিয়াছে। অত্র প্রতিষ্ঠানে অধ্যয়নকালে তাহার নৈতিক চরিত্র ও আচরণ সন্তোষজনক ছিল। তাহার ভবিষ্যৎ শিক্ষাজীবনের সর্বাঙ্গীন মঙ্গল ও উত্তরোত্তর সাফল্য কামনা করি।
    </div>

    <!-- Tri-Signature Approval Footer -->
    <div>
      <div class="signatures-row">
        <!-- 1. Left: Office Assistant -->
        <div class="sig-col">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.officeAssistantName || 'অফিস সহকারী')}</div>
          <div class="sig-title-bn">প্রস্তুতকারক ও রেজিস্টার যাচাইকারী</div>
          <div class="sig-title-en">Office Assistant</div>
        </div>

        <!-- 2. Center: Class Teacher -->
        <div class="sig-col">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.classTeacherName || 'শ্রেণি শিক্ষক')}</div>
          <div class="sig-title-bn">সংশ্লিষ্ট শ্রেণি শিক্ষক</div>
          <div class="sig-title-en">Class Teacher</div>
        </div>

        <!-- Official Seal Circle -->
        ${cfg.showSeal ? `
          <div class="tc-seal-col">
            <div class="tc-seal-ring">
              <b>সিলমোহর</b>
              <span>প্রতিষ্ঠান প্রধানের</span>
              <span>কার্যালয়</span>
            </div>
          </div>
        ` : ''}

        <!-- 3. Right: Principal -->
        <div class="sig-col">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.principalName || 'মুহতামিম / অধ্যক্ষ')}</div>
          <div class="sig-title-bn">${escapeHtml(data.principalTitleBn || 'অধ্যক্ষ / প্রতিষ্ঠান প্রধান')}</div>
          <div class="sig-title-en">${escapeHtml(data.principalTitleEn || 'Principal / Headmaster')}</div>
        </div>
      </div>

      ${cfg.footerText ? `<div class="footer-extra">${escapeHtml(cfg.footerText)}</div>` : ''}
    </div>
  </div>
</div>
</body></html>`;
}

/* ═══════════════════════════════════════════════════════════════════
   3. প্রশংসাপত্র (TESTIMONIAL) — PORTRAIT A4 (210mm × 297mm)
   Authentic Madrasa & College Official Letterhead / Pad Testimonial
   ═══════════════════════════════════════════════════════════════════ */
function renderTestimonialHTML(input: RenderInput): string {
  const { cfg: baseCfg, data, defaultTitleBn, defaultTitleEn, defaultTitleAr, bodyLayoutOverride } = input;
  const cfg: CertTemplateConfig = bodyLayoutOverride ? { ...baseCfg, bodyLayout: bodyLayoutOverride } : baseCfg;

  const isBnOnly = cfg.bodyLayout === 'bn-only';
  const isEnOnly = cfg.bodyLayout === 'en-only';
  const isArOnly = cfg.bodyLayout === 'ar-only';
  const showEn = !isBnOnly && !isArOnly;

  const titleBn = cfg.titleBn || defaultTitleBn || 'প্রশংসাপত্র';
  const titleEn = cfg.titleEn || defaultTitleEn || 'TESTIMONIAL';
  const titleAr = cfg.titleAr || defaultTitleAr || 'شهادة حسن سيرة وسلوك';

  const logoUrl = cfg.logoUrlOverride || data.institutionLogo;
  const instNameBn = data.institutionNameBn || data.institutionNameEn;
  const instNameEn = data.institutionNameEn;

  const permAddr = data.permanentAddress || data.institutionAddress || 'অত্র প্রতিষ্ঠান এলাকা';

  const cornerSvg = getCornerSVG(cfg.borderColor, 'emerald-heritage', 'testimonial');

  return `<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8">
<title>${escapeHtml(titleEn)} (${escapeHtml(titleBn)}) — ${escapeHtml(data.nameBn || data.nameEn)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@400;500;600;700&family=Cinzel:wght@600;700&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:210mm 297mm;margin:0}
  html,body{width:210mm;height:297mm;background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color:#064e3b;font-family:'Noto Serif Bengali','Cormorant Garamond',serif}
  .page{width:210mm;height:297mm;position:relative;overflow:hidden;background:radial-gradient(ellipse at top,${cfg.bgGradientFrom} 0%,${cfg.bgGradientTo} 100%);padding:${cfg.pagePadding}mm}
  
  /* Emerald Heritage Frame */
  .frame-outer{position:absolute;inset:7mm;border:3.5px double ${cfg.borderColor};pointer-events:none}
  .frame-inner{position:absolute;inset:10mm;border:0.8px solid ${cfg.innerBorderColor};pointer-events:none}
  
  .corner{position:absolute;width:40px;height:40px;pointer-events:none}
  .corner svg{display:block;width:100%;height:100%}
  .corner.tl{top:8mm;left:8mm}
  .corner.tr{top:8mm;right:8mm;transform:rotate(90deg)}
  .corner.br{bottom:8mm;right:8mm;transform:rotate(180deg)}
  .corner.bl{bottom:8mm;left:8mm;transform:rotate(270deg)}
  
  /* Watermark */
  .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel',serif;font-size:280px;font-weight:700;color:${cfg.borderColor};opacity:${cfg.watermarkOpacity};pointer-events:none;z-index:0;display:flex;align-items:center;justify-content:center}
  .watermark img{width:115mm;height:115mm;object-fit:contain;filter:grayscale(100%)}
  
  .content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:space-between}
  
  /* Institutional Letterhead / Pad */
  .bismillah{text-align:center;font-family:'Amiri',serif;font-size:16px;color:${cfg.headerAccentColor};font-weight:700;margin-bottom:2px}
  .pad-header{display:flex;align-items:center;justify-content:center;gap:16px;padding-bottom:8px;text-align:center}
  .pad-logo{width:${cfg.logoSize}px;height:${cfg.logoSize}px;object-fit:contain}
  .pad-inst-bn{font-size:23px;font-weight:800;color:${cfg.titleColor};line-height:1.2}
  .pad-inst-en{font-family:'Cinzel',serif;font-size:11.5px;font-weight:600;color:${cfg.headerAccentColor};letter-spacing:2.5px;text-transform:uppercase;margin-top:2px}
  .pad-inst-meta{font-size:10px;color:#047857;margin-top:2px}
  
  /* Ornate Horizontal Rule */
  .pad-divider{display:flex;align-items:center;justify-content:center;gap:10px;margin:2px 0 6px}
  .pad-divider .line{flex:1;height:1.2px;background:linear-gradient(90deg,transparent,${cfg.innerBorderColor},transparent)}
  .pad-divider .diamond{width:7px;height:7px;background:${cfg.borderColor};transform:rotate(45deg)}
  
  /* Ref & Date Row */
  .ref-row{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:${cfg.headerAccentColor};padding:4px 6px;margin-bottom:6px;border-top:1px dashed rgba(6,95,70,0.25);border-bottom:1px dashed rgba(6,95,70,0.25)}
  .ref-row b{color:${cfg.titleColor}}
  
  /* Testimonial Plaque */
  .title-wrap{text-align:center;margin:6px 0 10px}
  .title-badge{display:inline-block;padding:6px 36px;background:linear-gradient(180deg,#ffffff 0%,#f0fdf4 100%);border:1.5px solid ${cfg.borderColor};border-radius:30px;box-shadow:0 2px 6px rgba(6,95,70,0.12)}
  .title-bn{font-size:24px;font-weight:800;color:${cfg.titleColor};letter-spacing:3px;line-height:1.2}
  .title-en{font-family:'Cinzel',serif;font-size:10px;font-weight:700;color:${cfg.headerAccentColor};letter-spacing:4px;text-transform:uppercase;margin-top:1px}
  .title-sub{font-size:10.5px;color:#047857;margin-top:3px;font-style:italic}
  
  /* Authentic 3-Paragraph Appraisal Prose */
  .prose-card{padding:12px 16px;background:rgba(255,255,255,0.85);border-radius:6px;border:1px solid rgba(6,95,70,0.2);box-shadow:0 1px 4px rgba(6,95,70,0.06);margin-bottom:8px}
  .prose-p{font-size:${cfg.bodyFontSize}px;line-height:2.05;text-align:justify;color:#1c3829;margin-bottom:10px}
  .prose-p:last-child{margin-bottom:0}
  .prose-p b{color:${cfg.titleColor};font-weight:700}
  .highlight-badge{color:${cfg.highlightColor};font-weight:700;border-bottom:1.5px solid ${cfg.innerBorderColor};padding-bottom:1px}
  
  /* Character Appraisal Grid */
  .attribute-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:8px 0 10px}
  .attr-card{background:rgba(240,253,244,0.9);border:1px solid rgba(5,150,105,0.3);border-radius:6px;padding:8px 10px;text-align:center}
  .attr-card .attr-title{font-size:9.5px;font-weight:700;color:${cfg.headerAccentColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
  .attr-card .attr-val{font-size:11.5px;font-weight:700;color:${cfg.titleColor}}
  
  /* Islamic Dua Box */
  .dua-box{text-align:center;padding:8px 14px;background:rgba(6,95,70,0.04);border:1px dashed ${cfg.innerBorderColor};border-radius:6px;margin:6px 0 10px}
  .dua-ar{font-family:'Amiri',serif;font-size:14px;font-weight:700;color:${cfg.titleColor};direction:rtl;margin-bottom:2px}
  .dua-bn{font-size:10.5px;color:${cfg.headerAccentColor};font-style:italic}
  
  /* Circular Official Seal + Principal Signature */
  .signatures-row{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-top:auto;padding-top:10px;border-top:1.5px solid rgba(6,95,70,0.3)}
  .seal-block{display:flex;align-items:center;gap:12px}
  .circular-seal{width:86px;height:86px;border:2px dashed ${cfg.borderColor};border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:${cfg.headerAccentColor};text-align:center;background:rgba(6,95,70,0.03);padding:4px}
  .circular-seal .ring{position:absolute;inset:3px;border:1px solid ${cfg.innerBorderColor};border-radius:50%;opacity:0.75}
  .circular-seal .txt-head{font-family:'Amiri',serif;font-size:9.5px;font-weight:700}
  .circular-seal .txt-sub{font-size:8px;font-weight:700;color:${cfg.titleColor};margin:1px 0}
  .circular-seal .txt-star{font-size:8px;color:${cfg.borderColor}}
  
  .sig-col{text-align:center;min-width:210px}
  .sig-col .sig-line{border-top:1.5px solid ${cfg.titleColor};margin:28px 14px 4px}
  .sig-col .sig-name{font-size:13px;font-weight:700;color:${cfg.titleColor}}
  .sig-col .sig-title-bn{font-size:11px;color:${cfg.headerAccentColor}}
  .sig-col .sig-title-en{font-family:'Cinzel',serif;font-size:9px;color:${cfg.headerAccentColor};letter-spacing:1px;text-transform:uppercase}
  
  .footer-extra{text-align:center;font-size:${cfg.footerFontSize ?? 9}pt;color:#047857;margin-top:4px}
  @media print{body{margin:0}.page{box-shadow:none}}
</style>
</head>
<body>
<div class="page">
  <div class="frame-outer"></div>
  <div class="frame-inner"></div>
  ${cfg.showCornerOrnaments ? `
    <div class="corner tl">${cornerSvg}</div>
    <div class="corner tr">${cornerSvg}</div>
    <div class="corner bl">${cornerSvg}</div>
    <div class="corner br">${cornerSvg}</div>` : ''}

  ${cfg.showWatermark ? `
    <div class="watermark">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt=""/>` : 'TM'}
    </div>` : ''}

  <div class="content">
    <!-- Letterhead -->
    <div>
      <div class="bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ</div>
      <div class="pad-header">
        ${cfg.showLogo && logoUrl ? `<img src="${escapeHtml(logoUrl)}" class="pad-logo" alt=""/>` : ''}
        <div>
          <div class="pad-inst-bn">${escapeHtml(instNameBn)}</div>
          ${instNameEn && instNameEn !== instNameBn ? `<div class="pad-inst-en">${escapeHtml(instNameEn)}</div>` : ''}
          <div class="pad-inst-meta">বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড / শিক্ষা মন্ত্রণালয় অনুমোদিত &bull; কোড: ${escapeHtml(data.registrationNumber || 'স্বীকৃত')}</div>
          <div class="pad-inst-meta">${escapeHtml(data.institutionAddress)}${data.institutionPhone ? ` &bull; ফোন: ${escapeHtml(data.institutionPhone)}` : ''}${data.institutionEmail ? ` &bull; ইমেইল: ${escapeHtml(data.institutionEmail)}` : ''}</div>
        </div>
      </div>
      <div class="pad-divider">
        <span class="line"></span><span class="diamond"></span><span class="line"></span>
      </div>
    </div>

    <!-- Reference & Date -->
    <div class="ref-row">
      <span><b>স্মারক নং / Ref:</b> ${escapeHtml(data.serial)}</span>
      <span><b>তারিখ / Date:</b> ${escapeHtml(data.issueDateBn)} খ্রি. (${escapeHtml(data.issueDateEn)})</span>
    </div>

    <!-- Title Plaque -->
    <div class="title-wrap">
      <div class="title-badge">
        <div class="title-bn">${escapeHtml(titleBn)}</div>
        ${showEn ? `<div class="title-en">${escapeHtml(titleEn)}</div>` : ''}
        ${isArOnly ? `<div style="font-family:'Amiri',serif;font-size:18px;font-weight:700;color:${cfg.titleColor};direction:rtl">${escapeHtml(titleAr)}</div>` : ''}
      </div>
      <div class="title-sub">চারিত্রিক ও শিক্ষা সমাপনী প্রত্যয়নপত্র &bull; Character & Academic Conduct Appraisal</div>
    </div>

    <!-- Authentic 3-Paragraph Appraisal Prose -->
    <div class="prose-card">
      <p class="prose-p">
        এই মর্মে প্রত্যয়ন ও প্রশংসা করা যাচ্ছে যে, <b>${escapeHtml(data.nameBn)}</b>${data.nameEn && data.nameEn !== data.nameBn ? ` (${escapeHtml(data.nameEn)})` : ''}, পিতা: <b>${escapeHtml(data.fatherName || '—')}</b>, মাতা: <b>${escapeHtml(data.motherName || '—')}</b>, স্থায়ী ঠিকানা: <b>${escapeHtml(permAddr)}</b>, অত্র প্রতিষ্ঠানের <b>${escapeHtml(data.classBn || 'নিয়মিত')}</b> শ্রেণির একজন নিয়মিত, ভদ্র ও কৃতী শিক্ষার্থী ছিল। তাহার রোল নম্বর: <b>${escapeHtml(data.rollNumber || '—')}</b> এবং ছাত্র আইডি: <b>${escapeHtml(data.studentId || '—')}</b>। সে <b>${escapeHtml(data.sessionName || 'অত্র')}</b> শিক্ষাবর্ষে সুনাম ও কৃতিত্বের সহিত অধ্যয়ন সম্পন্ন করিয়াছে।
      </p>

      <p class="prose-p">
        অধ্যয়নকালে সে শিক্ষকগণের প্রতি শ্রদ্ধাশীল, পাঠে মনোযোগী এবং সহপাঠীদের সহিত সৌহার্দ্যপূর্ণ আচরণের পরিচয় দিয়াছে। আমার জানামতে সে প্রতিষ্ঠান-বিরোধী কিংবা সমাজ ও রাষ্ট্রবিরোধী কোনো কার্যকলাপে কখনো লিপ্ত ছিল না। তাহার নৈতিক চরিত্র, দ্বীনি আদর্শ ও আচার-ব্যবহার অত্যন্ত <span class="highlight-badge">${escapeHtml(data.conduct || 'উত্তম ও প্রশংসনীয়')}</span>।
      </p>

      <p class="prose-p">
        আমি তাহার ভবিষ্যৎ শিক্ষাজীবনে উত্তরোত্তর সাফল্য এবং পার্থিব ও পারলৌকিক জীবনের সর্বাঙ্গীন কল্যাণ ও মঙ্গল কামনা করি।
      </p>
    </div>

    <!-- Character Appraisal Grid -->
    <div class="attribute-grid">
      <div class="attr-card">
        <div class="attr-title">নৈতিক চরিত্র</div>
        <div class="attr-val">উত্তম ও নিষ্কলুষ (Exemplary)</div>
      </div>
      <div class="attr-card">
        <div class="attr-title">শৃঙ্খলা ও ব্যবহার</div>
        <div class="attr-val">সন্তোষজনক ও প্রশংসনীয়</div>
      </div>
      <div class="attr-card">
        <div class="attr-title">মেধা ও পাঠাভ্যাস</div>
        <div class="attr-val">মেধাবী ও নিষ্ঠাবান</div>
      </div>
    </div>

    <!-- Islamic Dua Box -->
    <div class="dua-box">
      <div class="dua-ar">اللهم بارك له في علمه وعمله وارزقه التوفيق والنجاح والتفوق</div>
      <div class="dua-bn">“আল্লাহ তায়ালা তাহার ইলম ও আমলে বরকত দান করুন এবং ভবিষ্যৎ জীবনকে আলোকিত ও কল্যাণময় করুন। আমিন।”</div>
    </div>

    <!-- Official Circular Seal & Principal Signature -->
    <div>
      <div class="signatures-row">
        <!-- Circular Seal -->
        ${cfg.showSeal ? `
          <div class="seal-block">
            <div class="circular-seal">
              <span class="txt-head">شهادة تقدير</span>
              <span class="txt-star">★ ★ ★</span>
              <span class="txt-sub">সিলমোহর ও প্রতিস্বাক্ষর</span>
              <span class="txt-star">★ ★ ★</span>
            </div>
            <div style="font-size:9.5px;color:#047857;line-height:1.4">
              <b>যাচাইকৃত প্রশংসাপত্র</b><br/>
              অফিসিয়াল রেকর্ড শাখা
            </div>
          </div>
        ` : '<div></div>'}

        <!-- Principal Signature -->
        <div class="sig-col">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.principalName || 'মুহতামিম / অধ্যক্ষ')}</div>
          ${showEn && data.principalNameEn && data.principalNameEn !== data.principalName ? `<div style="font-family:'Cinzel',serif;font-size:9.5px;color:${cfg.headerAccentColor};letter-spacing:1px;margin-top:1px">${escapeHtml(data.principalNameEn)}</div>` : ''}
          <div class="sig-title-bn">${escapeHtml(data.principalTitleBn || 'অধ্যক্ষ / প্রতিষ্ঠান প্রধান')}</div>
          <div class="sig-title-en">${escapeHtml(data.principalTitleEn || 'Principal')}</div>
        </div>
      </div>

      ${cfg.footerText ? `<div class="footer-extra">${escapeHtml(cfg.footerText)}</div>` : ''}
    </div>
  </div>
</div>
</body></html>`;
}
