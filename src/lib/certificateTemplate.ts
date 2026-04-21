// Certificate template config types + defaults + HTML renderer
// Used by Admin Certificate Template Designer and the print flow.

export type CertType = 'certificate' | 'transfer' | 'testimonial';

export type BodyLayout = 'bilingual' | 'bn-only' | 'en-only' | 'ar-only';

export interface CertTemplateConfig {
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
}

export const DEFAULT_TEMPLATE: CertTemplateConfig = {
  borderColor: '#b8860b',
  innerBorderColor: '#d4af37',
  borderStyle: 'double',
  showCornerOrnaments: true,
  showWatermark: true,
  watermarkOpacity: 0.05,

  bgGradientFrom: '#fefaf0',
  bgGradientTo: '#f8efd4',

  titleColor: '#5c3a0e',
  titleBn: '',
  titleEn: '',
  titleAr: '',
  titleFontSize: 30,
  showCategorySubtitle: true,

  showLogo: true,
  logoSize: 62,
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

  pagePadding: 18,

  highlightColor: '#7a4f0d',
};

export function mergeTemplate(partial: Partial<CertTemplateConfig> | null | undefined): CertTemplateConfig {
  return { ...DEFAULT_TEMPLATE, ...(partial || {}) };
}

const escapeHtml = (v: string) => (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Replace {placeholders} inside a custom body. */
export function fillTemplate(tpl: string, data: Record<string, string>): string {
  if (!tpl) return '';
  return tpl.replace(/\{(\w+)\}/g, (_, k) => data[k] ?? '');
}

const CORNER_SVG = (color: string) => `<svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="${color}" stroke-width="1.2"><path d="M2 14 Q2 2 14 2"/><path d="M6 14 Q6 6 14 6"/><circle cx="14" cy="14" r="2.5" fill="${color}"/><path d="M14 2 L18 6 M2 14 L6 18" stroke-width="1"/></g></svg>`;

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
    bodyBn: string;        // pre-built default sentence
    bodyEn: string;
    bodyAr?: string;
    principalName: string;
    principalNameEn?: string;
    principalNameAr?: string;
    principalTitleBn: string;
    principalTitleEn: string;
    principalTitleAr?: string;
  };
}

export function renderCertificateHTML(input: RenderInput): string {
  const { cfg: baseCfg, defaultTitleBn, defaultTitleEn, defaultTitleAr = '', data, certType, bodyLayoutOverride } = input;
  const cfg: CertTemplateConfig = bodyLayoutOverride ? { ...baseCfg, bodyLayout: bodyLayoutOverride } : baseCfg;
  const isBnOnly = cfg.bodyLayout === 'bn-only';
  const isEnOnly = cfg.bodyLayout === 'en-only';
  const isArOnly = cfg.bodyLayout === 'ar-only';
  const showBn = !isEnOnly && !isArOnly;
  const showEn = !isBnOnly && !isArOnly;
  const showAr = isArOnly;

  const titleBn = cfg.titleBn || defaultTitleBn;
  const titleEn = cfg.titleEn || defaultTitleEn;
  const titleAr = cfg.titleAr || defaultTitleAr;

  const bodyBn = cfg.customBodyBn ? fillTemplate(cfg.customBodyBn, data as any) : data.bodyBn;
  const bodyEn = cfg.customBodyEn ? fillTemplate(cfg.customBodyEn, data as any) : data.bodyEn;
  const bodyAr = cfg.customBodyAr ? fillTemplate(cfg.customBodyAr, data as any) : (data.bodyAr || '');

  const logoUrl = cfg.logoUrlOverride || data.institutionLogo;
  const headerJustify = cfg.logoPosition === 'left' ? 'flex-start' : cfg.logoPosition === 'right' ? 'flex-end' : 'center';

  const sigJustify = cfg.signaturePosition === 'left' ? 'flex-start' : cfg.signaturePosition === 'center' ? 'center' : 'flex-end';

  // Bilingual label helper
  const dual = (en: string, bn: string, ar?: string) =>
    isArOnly ? (ar || en) : isEnOnly ? en : isBnOnly ? bn : `${en} / ${bn}`;

  const corners = cfg.showCornerOrnaments ? `
    <div class="corner tl">${CORNER_SVG(cfg.borderColor)}</div>
    <div class="corner tr">${CORNER_SVG(cfg.borderColor)}</div>
    <div class="corner bl">${CORNER_SVG(cfg.borderColor)}</div>
    <div class="corner br">${CORNER_SVG(cfg.borderColor)}</div>` : '';

  const watermark = cfg.showWatermark
    ? (logoUrl
        ? `<div class="watermark watermark-logo"><img src="${escapeHtml(logoUrl)}" alt=""/></div>`
        : `<div class="watermark">${escapeHtml(data.monogram)}</div>`)
    : '';

  const headerLogo = cfg.showLogo && logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="" style="width:${cfg.logoSize}px;height:${cfg.logoSize}px;object-fit:contain"/>` : '';

  // Institution name — pick by language.
  const instNamePrimary = isArOnly
    ? (data.institutionNameAr || data.institutionNameBn || data.institutionNameEn)
    : isEnOnly
      ? (data.institutionNameEn || data.institutionNameBn)
      : (data.institutionNameBn || data.institutionNameEn);
  const instNameSecondary = (isEnOnly || isBnOnly || isArOnly)
    ? ''
    : (data.institutionNameEn && data.institutionNameEn !== data.institutionNameBn ? data.institutionNameEn : '');

  const instAddress = isArOnly
    ? (data.institutionAddressAr || data.institutionAddress)
    : data.institutionAddress;

  const instBlock = `
    <div class="header-text">
      ${cfg.showInstitutionName ? `<div class="name-bn"${isEnOnly ? ` style="font-family:'Cinzel',serif;letter-spacing:2px;text-transform:uppercase;font-size:18px;"` : ''}${isArOnly ? ` style="font-family:'Amiri','Scheherazade New',serif;font-size:24px;direction:rtl;"` : ''}>${escapeHtml(instNamePrimary)}</div>${instNameSecondary ? `<div class="name-en">${escapeHtml(instNameSecondary)}</div>` : ''}` : ''}
      ${cfg.showAddress ? `<div class="addr"${isArOnly ? ` style="font-family:'Amiri',serif;direction:rtl;"` : ''}>${escapeHtml(instAddress)}${data.institutionPhone ? ` &middot; ${escapeHtml(data.institutionPhone)}` : ''}${data.institutionEmail ? ` &middot; ${escapeHtml(data.institutionEmail)}` : ''}</div>` : ''}
    </div>`;

  const infoCells: string[] = [];
  const arVal = (ar: string | undefined, fallback: string) => isArOnly ? (ar || fallback) : fallback;
  if (data.studentId) infoCells.push(`<div><b>${dual('Student ID', 'ছাত্র আইডি', 'رقم الطالب')}</b><span>${escapeHtml(data.studentId)}</span></div>`);
  if (data.rollNumber) infoCells.push(`<div><b>${dual('Roll', 'রোল', 'الرقم التسلسلي')}</b><span>${escapeHtml(data.rollNumber)}</span></div>`);
  if (data.classEn || data.classBn || data.classAr) {
    const classVal = isArOnly
      ? (data.classAr || data.classBn || data.classEn)
      : isBnOnly ? (data.classBn || data.classEn) : (data.classEn || data.classBn);
    infoCells.push(`<div><b>${dual('Class', 'শ্রেণী', 'الصف')}</b><span>${escapeHtml(classVal)}</span></div>`);
  }
  if (data.sessionName) infoCells.push(`<div><b>${dual('Session', 'সেশন', 'العام الدراسي')}</b><span>${escapeHtml(data.sessionName)}</span></div>`);
  if (data.fatherName) infoCells.push(`<div><b>${dual('Father', 'পিতা', 'الأب')}</b><span>${escapeHtml(arVal(data.fatherNameAr, data.fatherName))}</span></div>`);
  if (data.motherName) infoCells.push(`<div><b>${dual('Mother', 'মাতা', 'الأم')}</b><span>${escapeHtml(arVal(data.motherNameAr, data.motherName))}</span></div>`);
  const dobShown = isBnOnly ? data.dobBn : data.dobEn;
  if (dobShown) infoCells.push(`<div><b>${dual('Date of Birth', 'জন্ম তারিখ', 'تاريخ الميلاد')}</b><span>${escapeHtml(dobShown)}</span></div>`);
  if (certType === 'transfer') {
    const admShown = isBnOnly ? data.admissionDateBn : data.admissionDateEn;
    const lvShown = isBnOnly ? data.leavingDateBn : data.leavingDateEn;
    if (admShown) infoCells.push(`<div><b>${dual('Admitted On', 'ভর্তির তারিখ', 'تاريخ القبول')}</b><span>${escapeHtml(admShown)}</span></div>`);
    if (lvShown) infoCells.push(`<div><b>${dual('Date of Leaving', 'প্রস্থানের তারিখ', 'تاريخ المغادرة')}</b><span>${escapeHtml(lvShown)}</span></div>`);
  }
  if (certType !== 'certificate' && data.conduct) infoCells.push(`<div><b>${dual('Conduct', 'আচরণ', 'السلوك')}</b><span>${escapeHtml(arVal(data.conductAr, data.conduct))}</span></div>`);

  const bodyGrid = (() => {
    if (cfg.bodyLayout === 'bilingual') {
      return `<div class="body-grid two-col">
        <div class="col bn"><div class="lang-tag">বাংলা সংস্করণ</div><div class="text">${bodyBn}</div></div>
        <div class="col en"><div class="lang-tag">English Version</div><div class="text">${bodyEn}</div></div>
      </div>`;
    }
    if (cfg.bodyLayout === 'bn-only') {
      return `<div class="body-grid one-col"><div class="col bn"><div class="text">${bodyBn}</div></div></div>`;
    }
    if (cfg.bodyLayout === 'ar-only') {
      return `<div class="body-grid one-col"><div class="col ar" dir="rtl"><div class="text">${bodyAr}</div></div></div>`;
    }
    return `<div class="body-grid one-col"><div class="col en"><div class="text">${bodyEn}</div></div></div>`;
  })();

  const sealBlock = cfg.showSeal && sigJustify !== 'flex-start'
    ? `<div class="seal">
        ${showEn ? `<div class="seal-en">OFFICIAL</div>` : ''}
        ${showBn ? `<div class="seal-bn">প্রাতিষ্ঠানিক সিল</div>` : ''}
        ${showAr ? `<div class="seal-bn" style="font-family:'Amiri',serif;">الختم الرسمي</div>` : ''}
      </div>` : '';

  const wishesText = isArOnly ? '~ مع أطيب التمنيات ~' : isBnOnly ? '~ শুভকামনা ~' : '~ Best Wishes ~';

  const sigPrincipalName = isArOnly
    ? (data.principalNameAr || data.principalName)
    : isEnOnly
      ? (data.principalNameEn || data.principalName)
      : data.principalName;
  const sigPrincipalNameEn = data.principalNameEn || '';
  const sigPrincipalTitleAr = data.principalTitleAr || 'المدير';

  const sigBlock = `
    <div class="footer" style="justify-content:${sigJustify === 'flex-start' ? 'flex-start' : sigJustify === 'center' ? 'center' : 'space-between'}">
      ${sealBlock}
      ${cfg.showWishes ? `<div class="wishes"${isArOnly ? ` style="font-family:'Amiri',serif;"` : ''}>${escapeHtml(wishesText)}</div>` : ''}
      <div class="sig">
        <div class="line"></div>
        <div class="name"${isArOnly ? ` style="font-family:'Amiri','Scheherazade New',serif;direction:rtl;"` : ''}>${escapeHtml(sigPrincipalName)}</div>
        ${(showBn && showEn && sigPrincipalNameEn && sigPrincipalNameEn !== sigPrincipalName) ? `<div class="name-en" style="font-family:'Cinzel',serif;font-size:11px;font-weight:600;color:${cfg.headerAccentColor};letter-spacing:1px;margin-top:2px">${escapeHtml(sigPrincipalNameEn)}</div>` : ''}
        ${showBn ? `<div class="title-bn">${escapeHtml(data.principalTitleBn)}</div>` : ''}
        ${showEn ? `<div class="title-en">${escapeHtml(data.principalTitleEn)}</div>` : ''}
        ${showAr ? `<div class="title-bn" style="font-family:'Amiri',serif;direction:rtl;">${escapeHtml(sigPrincipalTitleAr)}</div>` : ''}
      </div>
    </div>`;

  const docDir = isArOnly ? 'rtl' : 'ltr';
  const docLang = isArOnly ? 'ar' : 'bn';

  return `<!DOCTYPE html><html lang="${docLang}" dir="${docDir}"><head><meta charset="utf-8"><title>${escapeHtml(titleEn || titleBn || titleAr)} — ${escapeHtml(data.nameEn || data.nameBn)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@400;500;600;700&family=Cinzel:wght@500;700&family=Great+Vibes&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Reem+Kufi:wght@500;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4;margin:0}
  html,body{width:210mm;height:297mm;background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color:#1a1410;font-family:'Cormorant Garamond','Noto Serif Bengali',serif}
  html[dir="rtl"] body{font-family:'Amiri','Scheherazade New','Noto Serif Bengali',serif}
  .page{width:210mm;height:297mm;position:relative;overflow:hidden;background:radial-gradient(ellipse at top,${cfg.bgGradientFrom} 0%,${cfg.bgGradientTo} 100%)}
  .frame-outer{position:absolute;inset:7mm;border:4px ${cfg.borderStyle} ${cfg.borderColor};border-radius:2px;pointer-events:none}
  .frame-inner{position:absolute;inset:11mm;border:1px solid ${cfg.innerBorderColor};pointer-events:none}
  .frame-thin{position:absolute;inset:13mm;border:0.5px solid ${cfg.borderColor};opacity:.55;pointer-events:none}
  .corner{position:absolute;width:42px;height:42px}
  .corner svg{display:block;width:100%;height:100%}
  .corner.tl{top:9mm;left:9mm}
  .corner.tr{top:9mm;right:9mm;transform:rotate(90deg)}
  .corner.br{bottom:9mm;right:9mm;transform:rotate(180deg)}
  .corner.bl{bottom:9mm;left:9mm;transform:rotate(270deg)}
  .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel',serif;font-size:340px;font-weight:700;color:${cfg.borderColor};opacity:${cfg.watermarkOpacity};pointer-events:none;z-index:0;letter-spacing:0;display:flex;align-items:center;justify-content:center}
  .watermark-logo img{width:140mm;height:140mm;object-fit:contain;filter:grayscale(100%)}
  .content{position:relative;z-index:2;padding:${cfg.pagePadding}mm ${cfg.pagePadding}mm 14mm;height:100%;display:flex;flex-direction:column}
  .header{display:flex;align-items:center;gap:16px;justify-content:${headerJustify};padding-bottom:10px;border-bottom:1px solid ${cfg.innerBorderColor};margin-bottom:6px}
  .header-text{text-align:center}
  .header-text .name-bn{font-family:'Noto Serif Bengali',serif;font-size:22px;font-weight:700;color:${cfg.titleColor};letter-spacing:.5px;line-height:1.1}
  .header-text .name-en{font-family:'Cinzel',serif;font-size:13px;font-weight:600;color:${cfg.headerAccentColor};letter-spacing:3px;margin-top:3px;text-transform:uppercase}
  .header-text .addr{font-size:10.5px;color:${cfg.headerAccentColor};margin-top:3px;letter-spacing:.3px}
  .title-wrap{text-align:center;margin:14px 0 10px}
  .title-bn{font-family:'Noto Serif Bengali',serif;font-size:${Math.round(cfg.titleFontSize * 0.86)}px;font-weight:700;color:${cfg.headerAccentColor};letter-spacing:4px}
  .title-ar{font-family:'Reem Kufi','Amiri',serif;font-size:${cfg.titleFontSize}px;font-weight:700;color:${cfg.titleColor};letter-spacing:2px;direction:rtl;line-height:1.4}
  .title-divider{display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 0 4px}
  .title-divider .line{width:60px;height:1px;background:linear-gradient(90deg,transparent,${cfg.borderColor},transparent)}
  .title-divider .diamond{width:7px;height:7px;background:${cfg.borderColor};transform:rotate(45deg)}
  .title-en{font-family:'Cinzel',serif;font-size:${cfg.titleFontSize}px;font-weight:700;color:${cfg.titleColor};letter-spacing:8px;text-transform:uppercase}
  .title-sub{font-family:'Great Vibes',cursive;font-size:22px;color:${cfg.headerAccentColor};margin-top:2px;letter-spacing:1px}
  .meta-row{display:flex;justify-content:space-between;font-size:11px;color:${cfg.titleColor};padding:8px 6px;margin:6px 0 4px;border-top:1px dashed ${cfg.innerBorderColor};border-bottom:1px dashed ${cfg.innerBorderColor};letter-spacing:.4px}
  .presented{text-align:center;margin:10px 0 4px;font-family:'Noto Serif Bengali',serif;font-size:11.5px;color:${cfg.headerAccentColor};letter-spacing:2px;text-transform:uppercase}
  .presented.ar{font-family:'Amiri',serif;direction:rtl;letter-spacing:0;font-size:14px;text-transform:none}
  .recipient{text-align:center;margin:2px 0 8px}
  .recipient .name-bn{font-family:'Noto Serif Bengali',serif;font-size:26px;font-weight:700;color:${cfg.titleColor};line-height:1.2}
  .recipient .name-ar{font-family:'Amiri','Scheherazade New',serif;font-size:32px;font-weight:700;color:${cfg.titleColor};line-height:1.4;direction:rtl}
  .recipient .name-en{font-family:'Great Vibes',cursive;font-size:36px;color:${cfg.headerAccentColor};line-height:1;margin-top:2px}
  .recipient .underline{margin:6px auto 0;width:60%;height:1px;background:linear-gradient(90deg,transparent,${cfg.borderColor} 20%,${cfg.borderColor} 80%,transparent)}
  .body-grid{display:grid;gap:14px;margin:10px 0;flex:1}
  .body-grid.two-col{grid-template-columns:1fr 1fr}
  .body-grid.one-col{grid-template-columns:1fr}
  .col{padding:10px 12px;background:rgba(255,253,245,.5);border-radius:4px;border:1px solid rgba(184,134,11,.18)}
  .col .lang-tag{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${cfg.headerAccentColor};text-align:center;margin-bottom:6px;padding-bottom:4px;border-bottom:1px dotted ${cfg.innerBorderColor}}
  .col .text{font-size:${cfg.bodyFontSize}px;line-height:1.85;text-align:justify;color:#2a1d0c}
  .col.bn .text{font-family:'Noto Serif Bengali',serif;line-height:1.95}
  .col.en .text{font-family:'Cormorant Garamond',serif}
  .col.ar{direction:rtl}
  .col.ar .text{font-family:'Amiri','Scheherazade New',serif;line-height:2.1;font-size:${Math.max(cfg.bodyFontSize + 2, 14)}px;text-align:justify;direction:rtl}
  .text .hl{color:${cfg.highlightColor};font-weight:700}
  .text b{color:${cfg.titleColor};font-weight:600}
  .info{display:grid;grid-template-columns:repeat(${cfg.infoColumns},1fr);gap:4px 10px;font-size:10.5px;color:${cfg.titleColor};margin:6px 0 8px;padding:6px 8px;background:rgba(212,175,55,.06);border-radius:3px}
  .info > div{padding:2px 0;border-bottom:1px dotted rgba(212,175,55,.4)}
  .info > div b{color:${cfg.headerAccentColor};font-weight:600;display:block;font-size:9px;letter-spacing:.5px;text-transform:uppercase;margin-bottom:1px}
  .info > div span{font-family:'Noto Serif Bengali','Cormorant Garamond',serif;font-size:11px;color:#1f1408;font-weight:500}
  html[dir="rtl"] .info > div b{font-family:'Amiri',serif;letter-spacing:0;text-transform:none;font-size:10px}
  html[dir="rtl"] .info > div span{font-family:'Amiri','Scheherazade New',serif;font-size:12px;direction:rtl}
  .footer{display:flex;align-items:flex-end;margin-top:auto;padding:14px 4px 0;border-top:1px solid rgba(212,175,55,.4);gap:24px}
  .seal{width:88px;height:88px;border:2px dashed ${cfg.borderColor};border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:${cfg.headerAccentColor};text-align:center;background:rgba(212,175,55,.05)}
  .seal .seal-en{font-family:'Cinzel',serif;font-size:8px;font-weight:700;letter-spacing:1.5px}
  .seal .seal-bn{font-family:'Noto Serif Bengali',serif;font-size:9px;font-weight:600;margin-top:2px}
  .wishes{font-family:'Great Vibes',cursive;font-size:18px;color:${cfg.headerAccentColor};align-self:flex-end;padding-bottom:8px}
  .sig{text-align:center;min-width:200px}
  .sig .line{border-top:1.5px solid ${cfg.titleColor};margin:30px 14px 4px}
  .sig .name{font-family:'Noto Serif Bengali','Cormorant Garamond',serif;font-size:13px;font-weight:700;color:${cfg.titleColor}}
  .sig .title-bn{font-family:'Noto Serif Bengali',serif;font-size:10.5px;color:${cfg.headerAccentColor};margin-top:1px}
  .sig .title-en{font-family:'Cinzel',serif;font-size:9px;color:${cfg.headerAccentColor};letter-spacing:1.5px;text-transform:uppercase;margin-top:1px}
  .bottom-note{display:flex;justify-content:space-between;align-items:center;font-size:9px;color:${cfg.headerAccentColor};margin-top:8px;padding-top:6px;letter-spacing:.3px}
  .bottom-note .serial-no{font-family:'Cinzel',serif;font-weight:600;letter-spacing:2px}
  .footer-extra{text-align:center;font-size:${cfg.footerFontSize ?? 10}pt;color:${cfg.headerAccentColor};margin-top:${cfg.footerSpacingTop ?? 6}mm;margin-bottom:${cfg.footerSpacingBottom ?? 0}mm;font-style:italic;line-height:1.4;white-space:pre-wrap;padding-top:6px;border-top:1px dotted ${cfg.innerBorderColor}}
  html[dir="rtl"] .footer-extra{font-family:'Amiri',serif;font-style:normal;direction:rtl}
  @media print{body{margin:0}.page{box-shadow:none}}
</style></head>
<body>
<div class="page">
  <div class="frame-outer"></div>
  <div class="frame-inner"></div>
  <div class="frame-thin"></div>
  ${corners}
  ${watermark}
  <div class="content">
    <div class="header">
      ${headerLogo}
      ${instBlock}
    </div>
    <div class="title-wrap">
      ${showBn ? `<div class="title-bn">${escapeHtml(titleBn)}</div>` : ''}
      ${showBn && showEn ? `<div class="title-divider"><span class="line"></span><span class="diamond"></span><span class="line"></span></div>` : ''}
      ${showEn ? `<div class="title-en">${escapeHtml(titleEn)}</div>` : ''}
      ${showAr ? `<div class="title-ar">${escapeHtml(titleAr || titleBn || titleEn)}</div>` : ''}
      ${cfg.showCategorySubtitle && (data.categoryEn || data.categoryBn || data.categoryAr) ? `<div class="title-sub"${isArOnly ? ` style="font-family:'Amiri',serif;direction:rtl;font-size:18px;"` : ''}>${escapeHtml(isArOnly ? (data.categoryAr || data.categoryBn || data.categoryEn) : isBnOnly ? (data.categoryBn || data.categoryEn) : (data.categoryEn || data.categoryBn))}</div>` : ''}
    </div>
    <div class="meta-row">
      <span><b>${dual('Ref', 'রেফারেন্স', 'المرجع')}:</b> ${escapeHtml(data.serial)}</span>
      <span><b>${dual('Date', 'তারিখ', 'التاريخ')}:</b> ${isEnOnly || isArOnly ? escapeHtml(data.issueDateEn) : isBnOnly ? escapeHtml(data.issueDateBn) : `${escapeHtml(data.issueDateEn)} &middot; ${escapeHtml(data.issueDateBn)}`}</span>
    </div>
    <div class="presented${isArOnly ? ' ar' : ''}">${isArOnly ? 'يُمنح هذا التقدير بكل فخر إلى' : isEnOnly ? 'This Is Proudly Presented To' : isBnOnly ? 'এই সনদ প্রদান করা হলো' : 'This Is Proudly Presented To &middot; এই সনদ প্রদান করা হলো'}</div>
    <div class="recipient">
      ${isArOnly
        ? `<div class="name-ar">${escapeHtml(data.nameAr || data.nameBn || data.nameEn)}</div>`
        : isEnOnly
          ? `<div class="name-bn" style="font-family:'Cormorant Garamond',serif;">${escapeHtml(data.nameEn || data.nameBn)}</div>`
          : `<div class="name-bn">${escapeHtml(data.nameBn || data.nameEn)}</div>${(showEn && data.nameEn && data.nameEn !== data.nameBn) ? `<div class="name-en">${escapeHtml(data.nameEn)}</div>` : ''}`}
      <div class="underline"></div>
    </div>
    ${cfg.showInfoGrid && infoCells.length ? `<div class="info">${infoCells.join('')}</div>` : ''}
    ${bodyGrid}
    ${data.purpose ? `<div class="bottom-note"><span><b>${dual('Purpose', 'উদ্দেশ্য', 'الغرض')}:</b> ${escapeHtml(isArOnly ? (data.purposeAr || data.purpose) : data.purpose)}</span></div>` : ''}
    ${data.remarks ? `<div class="bottom-note"><span><b>${dual('Remarks', 'মন্তব্য', 'ملاحظات')}:</b> ${escapeHtml(isArOnly ? (data.remarksAr || data.remarks) : data.remarks)}</span></div>` : ''}
    ${sigBlock}
    ${cfg.footerText ? `<div class="footer-extra">${escapeHtml(cfg.footerText)}</div>` : ''}
    <div class="bottom-note">
      <span class="serial-no">${escapeHtml(data.serial)}</span>
      <span>${isArOnly ? `صدر بتاريخ ${escapeHtml(data.issueDateEn)}` : isEnOnly ? `Issued on ${escapeHtml(data.issueDateEn)}` : isBnOnly ? `প্রদান: ${escapeHtml(data.issueDateBn)}` : `Issued on ${escapeHtml(data.issueDateEn)} &middot; ${escapeHtml(data.issueDateBn)}`}</span>
    </div>
  </div>
</div>
</body></html>`;
}
