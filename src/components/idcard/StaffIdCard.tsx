import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getStaffDisplayNames } from '@/lib/nameFormatter';

interface StaffIdCardProps {
  staff: {
    name_bn?: string;
    name_en?: string;
    staff_id?: string;
    photo_url?: string;
    designation?: string;
    designation_en?: string;
    designation_bn?: string;
    department?: string;
    staff_category?: string;
    phone?: string;
    blood_group?: string;
    nid?: string;
    address?: string;
    father_name?: string;
    joining_date?: string;
  };
  institution?: {
    name?: string;
    name_en?: string;
    logo_url?: string;
    address?: string;
    phone?: string;
  };
  validUntil?: string;
  validUntilBn?: string;
  principalName?: string;
  principalNameEn?: string;
  principalSignatureUrl?: string;
  lang?: 'bn' | 'en';
}

// Unicode Bangla — Kalpurush mimics the classic SutonnyMJ look while
// remaining Unicode-compatible (no garbled glyphs).
const BN = "'Kalpurush', 'SolaimanLipi', 'Noto Sans Bengali', 'Hind Siliguri', sans-serif";
const EN = "'Inter', sans-serif";

/**
 * Build a designation-aware card title.
 * Examples:
 *   শিক্ষক → "শিক্ষক পরিচয় পত্র"
 *   অফিস সহকারী → "অফিস সহকারী পরিচয় পত্র"
 *   fallback → "কর্মী পরিচয় পত্র"
 */
const buildCardTitle = (staff: StaffIdCardProps['staff'], lang: 'bn' | 'en'): string => {
  const designation = lang === 'bn'
    ? (staff.designation_bn || staff.designation || '')
    : (staff.designation_en || staff.designation || '');

  if (designation && designation.trim()) {
    return lang === 'bn' ? `${designation} পরিচয় পত্র` : `${designation} ID Card`;
  }

  // Fallback by category
  const cat = (staff.staff_category || '').toLowerCase();
  if (lang === 'bn') {
    if (cat.includes('teacher') || cat.includes('শিক্ষক')) return 'শিক্ষক পরিচয় পত্র';
    if (cat.includes('admin')) return 'প্রশাসনিক পরিচয় পত্র';
    if (cat.includes('support')) return 'সহায়ক কর্মী পরিচয় পত্র';
    return 'কর্মী পরিচয় পত্র';
  }
  return 'STAFF ID CARD';
};

const StaffIdCard = forwardRef<HTMLDivElement, StaffIdCardProps>(
  ({ staff, institution, validUntil = 'December 2026', validUntilBn = '', principalName = '', principalNameEn = '', principalSignatureUrl, lang = 'bn' }, ref) => {

    const verifyUrl = `https://subhaniabd.com/verify/staff/${staff.staff_id || ''}`;
    const f = lang === 'bn' ? BN : EN;
    const cardTitle = buildCardTitle(staff, lang);
    const designationDisplay = lang === 'bn'
      ? (staff.designation_bn || staff.designation || '')
      : (staff.designation_en || staff.designation || '');

    return (
      <div
        ref={ref}
        className="id-card-container"
        style={{
          width: '2.125in',
          maxWidth: '100%',
          minHeight: '3.375in',
          height: 'auto',
          background: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          fontFamily: BN,
          fontSize: '7px',
          color: '#0f172a',
          position: 'relative',
          boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
          border: '1px solid #d1d5db',
          display: 'flex',
          flexDirection: 'column',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact' as any,
        }}
      >
        {/* ═══ HEADER — Solid Emerald, prominent branding ═══ */}
        <div
          style={{
            background: 'linear-gradient(180deg, #064e3b 0%, #047857 100%)',
            padding: '8px 8px 9px',
            textAlign: 'center',
            flexShrink: 0,
            borderBottom: '2px solid #d4af37',
            position: 'relative',
          }}
        >
          {institution?.logo_url && (
            <img
              src={institution.logo_url}
              alt=""
              style={{
                position: 'absolute',
                top: '6px',
                left: '7px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid rgba(212,175,55,0.7)',
              }}
            />
          )}

          <div style={{
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '11px',
            fontFamily: BN,
            lineHeight: 1.2,
            letterSpacing: '0.2px',
            padding: '0 22px',
          }}>
            {institution?.name || 'আল আরাবিয়া সোবহানিয়া হাফিজিয়া মাদ্রাসা'}
          </div>
          {institution?.name_en && (
            <div style={{
              color: '#ffffff',
              fontFamily: EN,
              fontWeight: 700,
              fontSize: '6.5px',
              marginTop: '2px',
              letterSpacing: '0.7px',
              opacity: 0.95,
            }}>
              {institution.name_en}
            </div>
          )}
          {institution?.address && (
            <div style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '5.5px',
              marginTop: '2px',
              fontFamily: BN,
            }}>
              {institution.address}
            </div>
          )}

          {/* Designation-specific card title pill */}
          <div
            style={{
              background: '#d4af37',
              color: '#0f172a',
              fontSize: '6.5px',
              fontWeight: 800,
              padding: '2px 10px',
              borderRadius: '10px',
              marginTop: '4px',
              display: 'inline-block',
              letterSpacing: lang === 'en' ? '0.8px' : '0.3px',
              textTransform: lang === 'en' ? 'uppercase' : 'none',
              fontFamily: lang === 'bn' ? BN : EN,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            {cardTitle}
          </div>
        </div>

        {/* ═══ BODY — Pure white ═══ */}
        <div style={{
          flex: '1 1 auto',
          padding: '6px 11px 8px',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          minHeight: 0,
        }}>
          {/* ── Circular photo with thin gold ring ── */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              padding: '2px',
              background: '#d4af37',
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#ffffff',
                padding: '1.5px',
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {staff.photo_url ? (
                    <img src={staff.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: '22px', color: '#064e3b', fontWeight: 700, opacity: 0.35 }}>
                      {staff.name_bn?.[0] || staff.name_en?.[0] || '?'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Name in bold dark green ── */}
          {(() => {
            const displayNames = getStaffDisplayNames(staff.name_bn, staff.name_en, lang === 'bn');
            return (
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <div style={{
                  fontWeight: 800,
                  fontSize: '12px',
                  color: '#064e3b',
                  fontFamily: BN,
                  lineHeight: 1.25,
                }}>
                  {displayNames.primary || '—'}
                </div>
                {displayNames.secondary && (
                  <div style={{ fontSize: '7px', color: '#475569', fontFamily: EN, marginTop: '1px', fontWeight: 600 }}>
                    {displayNames.secondary}
                  </div>
                )}
                <div style={{
                  width: '40px',
                  height: '1.5px',
                  background: '#d4af37',
                  margin: '3px auto 0',
                  borderRadius: '1px',
                }} />
              </div>
            );
          })()}

          {/* ── Info rows ── */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {designationDisplay && <Row label={lang === 'bn' ? 'পদবী' : 'Designation'} value={designationDisplay} />}
            {staff.father_name && <Row label={lang === 'bn' ? 'পিতা' : 'Father'} value={staff.father_name} />}
            {staff.department && <Row label={lang === 'bn' ? 'বিভাগ' : 'Department'} value={staff.department} />}
            <Row label={lang === 'bn' ? 'আইডি নং' : 'ID No'} value={staff.staff_id || '—'} highlight />
            {staff.phone && <Row label={lang === 'bn' ? 'মোবাইল' : 'Mobile'} value={staff.phone} />}
            {staff.blood_group && <Row label={lang === 'bn' ? 'রক্ত' : 'Blood'} value={staff.blood_group} blood />}
          </div>
        </div>

        {/* ═══ FOOTER — Solid Emerald ═══ */}
        <div
          style={{
            background: 'linear-gradient(0deg, #064e3b 0%, #047857 100%)',
            borderTop: '2px solid #d4af37',
            padding: '5px 8px 5px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '4px',
            flexShrink: 0,
            marginTop: 'auto',
          }}
        >
          {/* Signature */}
          <div className="signature-container" style={{ textAlign: 'center', flex: '0 0 auto', maxWidth: '54px' }}>
            {principalSignatureUrl && (
              <img
                src={principalSignatureUrl}
                alt="Signature"
                style={{ height: '13px', maxWidth: '48px', objectFit: 'contain', marginBottom: '1px', filter: 'brightness(2.5) contrast(0.8)' }}
              />
            )}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.9)', width: '48px', marginBottom: '2px' }} />
            <div style={{ fontSize: '5.5px', color: '#ffffff', fontFamily: f, fontWeight: 600, lineHeight: 1.15 }}>
              {(lang === 'bn' ? principalName : principalNameEn) || principalName || (lang === 'bn' ? 'প্রিন্সিপাল' : 'Principal')}
            </div>
          </div>

          {/* Validity */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '5px', color: 'rgba(255,255,255,0.85)', fontFamily: f, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              {lang === 'bn' ? 'মেয়াদ' : 'Valid Until'}
            </div>
            <div style={{ fontSize: '7.5px', fontWeight: 800, color: '#fde047', fontFamily: f, marginTop: '1px' }}>
              {lang === 'bn' && validUntilBn ? validUntilBn : validUntil}
            </div>
          </div>

          {/* QR */}
          <div className="qr-code-container" style={{
            flex: '0 0 auto',
            background: '#ffffff',
            borderRadius: '4px',
            padding: '2.5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
            border: '0.5px solid rgba(212,175,55,0.5)',
          }}>
            <QRCodeSVG
              value={verifyUrl}
              size={28}
              level="M"
              bgColor="#ffffff"
              fgColor="#064e3b"
            />
          </div>
        </div>
      </div>
    );
  }
);

StaffIdCard.displayName = 'StaffIdCard';

/* ── Row: label : value ── */
const Row = ({ label, value, highlight, blood }: {
  label: string; value: string; highlight?: boolean; blood?: boolean;
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'baseline',
    gap: '5px',
    fontSize: '8.5px',
    lineHeight: 1.55,
    borderBottom: '1px dotted #e5e7eb',
    paddingBottom: '1px',
  }}>
    <span style={{
      color: '#334155',
      fontWeight: 700,
      fontFamily: BN,
      width: '48px',
      flexShrink: 0,
    }}>
      {label}
    </span>
    <span style={{ color: '#334155', fontWeight: 700 }}>:</span>
    <span style={{
      color: blood ? '#dc2626' : highlight ? '#064e3b' : '#0f172a',
      fontWeight: highlight ? 800 : 700,
      fontFamily: BN,
      flex: 1,
    }}>
      {value}
    </span>
  </div>
);

export default StaffIdCard;
