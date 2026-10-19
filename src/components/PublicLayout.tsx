import { ReactNode, useState, useMemo, useEffect } from 'react';
import BackButton from './BackButton';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';
import BijoyToggle from './BijoyToggle';
import { Menu, X, Phone, Mail, MapPin, GraduationCap } from 'lucide-react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useMenuSettings } from '@/hooks/useMenuSettings';
import type { BackgroundStyle } from '@/hooks/useWebsiteSettings';

const PublicLayout = ({ children }: { children: ReactNode }) => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { settings } = useWebsiteSettings();
  const { menuConfig } = useMenuSettings();

  const bgStyle = settings.background_style;
  const hasCustomBg = bgStyle && bgStyle.type && (bgStyle.type !== 'image' || bgStyle.image_url || bgStyle.image_url_dark);

  useEffect(() => {
    if (hasCustomBg) {
      document.body.classList.add('custom-public-bg');
    } else {
      document.body.classList.remove('custom-public-bg');
    }
    return () => {
      document.body.classList.remove('custom-public-bg');
    };
  }, [hasCustomBg]);

  const hs = settings.header_style;
  const ns = settings.nav_style;
  const fs = settings.footer_style;

  const navItems = menuConfig.public
    .filter(item => item.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(item => ({
      path: item.path,
      label: language === 'bn' ? item.label_bn : item.label_en,
    }));

  const logoSizeMap = { small: 'w-12 h-12', medium: 'w-16 h-16', large: 'w-20 h-20 lg:w-24 lg:h-24' };
  const logoSize = logoSizeMap[hs?.logo_size || 'medium'];

  const navFontSize = ns?.nav_font_size === 'small' ? 'text-xs' : ns?.nav_font_size === 'large' ? 'text-base' : 'text-sm';

  const getNavItemStyle = (isActive: boolean) => {
    const base: React.CSSProperties = {};
    if (isActive) {
      if (ns?.nav_active_bg) base.backgroundColor = ns.nav_active_bg;
      if (ns?.nav_active_text) base.color = ns.nav_active_text;
    } else {
      if (ns?.nav_text_color) base.color = ns.nav_text_color;
    }
    return base;
  };

  const getNavItemClass = (isActive: boolean) => {
    const styleType = ns?.nav_style || 'pills';
    const baseClass = `px-3 py-2 ${navFontSize} font-medium transition-colors`;

    if (styleType === 'underline') {
      return `${baseClass} border-b-2 ${isActive ? 'border-primary' : 'border-transparent hover:border-primary/50'}`;
    }
    if (styleType === 'rounded') {
      return `${baseClass} rounded-full`;
    }
    if (styleType === 'flat') {
      return baseClass;
    }
    // pills (default)
    return `${baseClass} rounded-lg`;
  };

  const getNavDefaultClass = (isActive: boolean) => {
    if (ns?.nav_active_bg || ns?.nav_text_color) return ''; // custom colors applied via style
    return isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-foreground/70 hover:text-foreground hover:bg-secondary';
  };

  const announcement = language === 'bn' ? hs?.topbar_announcement_bn : hs?.topbar_announcement_en;

  const copyrightText = (language === 'bn' ? fs?.copyright_text_bn : fs?.copyright_text_en) || '';
  const renderedCopyright = copyrightText
    .replace('{year}', String(new Date().getFullYear()))
    .replace('{name}', settings.institution_name);

  const backgroundCss = useMemo(() => {
    if (!hasCustomBg) return '';

    const buildRule = (style: BackgroundStyle, isDark: boolean) => {
      const overlay = Math.max(0, Math.min(100, style.overlay_opacity || 0));
      const overlayColor = isDark ? `rgba(0,0,0,${overlay / 100})` : `rgba(255,255,255,${overlay / 100})`;

      let bg = '';
      if (style.type === 'color') {
        const c = isDark ? (style.color_dark || style.color) : style.color;
        bg = `background: ${c || 'transparent'} !important;`;
      } else if (style.type === 'gradient') {
        const g = isDark ? (style.gradient_dark || style.gradient) : style.gradient;
        bg = `background: ${g || 'transparent'} !important;`;
      } else if (style.type === 'image') {
        const img = isDark ? (style.image_url_dark || style.image_url) : style.image_url;
        if (img) {
          bg = `background-image: url(${img}) !important; background-position: ${style.position || 'center'} !important; background-size: ${style.size || 'cover'} !important; background-repeat: ${style.repeat || 'no-repeat'} !important; background-attachment: ${style.fixed ? 'fixed' : 'scroll'} !important;`;
        }
      }

      return `${bg} --custom-bg-overlay: ${overlayColor};`;
    };

    const lightRule = buildRule(bgStyle, false);
    const darkRule = buildRule(bgStyle, true);

    return `
      body.custom-public-bg::before {
        ${lightRule}
        background-size: cover !important;
        filter: none !important;
      }
      body.custom-public-bg::after {
        background: var(--custom-bg-overlay) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      .dark body.custom-public-bg::before {
        ${darkRule}
        background-size: cover !important;
        filter: none !important;
      }
      .dark body.custom-public-bg::after {
        background: var(--custom-bg-overlay) !important;
      }
    `;
  }, [bgStyle, hasCustomBg]);

  return (
    <>
      {hasCustomBg && (
        <>
          <style>{`body.custom-public-bg::before, body.custom-public-bg::after { content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none; }`}</style>
          <style>{backgroundCss}</style>
        </>
      )}
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      {(hs?.topbar_visible !== false) && (
        <div
          className="islamic-pattern print:hidden no-print"
          style={{
            backgroundColor: hs?.topbar_bg_color || undefined,
            color: hs?.topbar_text_color || undefined,
          }}
        >
          <div className={`${!hs?.topbar_bg_color ? 'bg-primary text-primary-foreground' : ''}`}>
            <div className="container mx-auto px-4 py-2 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-4">
                {announcement ? (
                  <span className="truncate max-w-[200px] sm:max-w-none">{announcement}</span>
                ) : (
                  <>
                    <a href={`tel:${settings.phone}`} className="flex items-center gap-1 hover:underline"><Phone className="w-3 h-3" /> {settings.phone}</a>
                    <a href={`mailto:${settings.email}`} className="hidden sm:flex items-center gap-1 hover:underline"><Mail className="w-3 h-3" /> {settings.email}</a>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <BijoyToggle />
                <LanguageToggle />
                <Link to="/login" className="btn-gold-gradient !px-4 !py-1.5 !text-xs rounded-full">
                  {t('login')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className={`print:hidden no-print ${hs?.header_sticky !== false ? 'sticky top-0 z-50' : ''} ${hs?.header_border !== false ? 'border-b' : ''}`}
        style={{
          backgroundColor: hs?.header_bg_color || undefined,
          color: hs?.header_text_color || undefined,
          boxShadow: hs?.header_shadow !== false ? 'var(--shadow-soft)' : 'none',
        }}
      >
        <div className={`${!hs?.header_bg_color ? 'bg-card/95 backdrop-blur-md' : ''}`}>
          <div className="container mx-auto px-4 py-3">
            <div className="relative flex items-center justify-center gap-2">
              <Link to="/" className="flex items-center gap-3 min-w-0 max-w-full">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt={`${settings.institution_name} logo`} className={`${logoSize} shrink-0 ${settings.logo_shape === 'circle' ? 'rounded-full' : settings.logo_shape === 'rounded' ? 'rounded-xl' : 'rounded-none'} object-cover`} />
                ) : (
                  <div className={`${logoSize} shrink-0 ${settings.logo_shape === 'circle' ? 'rounded-full' : settings.logo_shape === 'rounded' ? 'rounded-xl' : 'rounded-none'} bg-primary flex items-center justify-center`}>
                    <GraduationCap className="w-7 h-7 text-primary-foreground" />
                  </div>
                )}
                <div className="min-w-0 overflow-hidden text-center">
                  {(hs?.show_institution_name !== false) && (
                    <div
                      className="text-xl sm:text-2xl lg:text-3xl font-display font-bold leading-tight line-clamp-2 block max-w-full text-center"
                      title={settings.institution_name}
                      style={{ color: hs?.header_text_color || undefined, overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                    >
                      {settings.institution_name}
                    </div>
                  )}
                  {(hs?.show_institution_name_en !== false) && (
                    <p
                      className="text-xs sm:text-sm lg:text-base text-muted-foreground line-clamp-2 block max-w-full text-center"
                      title={settings.institution_name_en}
                      style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                    >
                      {settings.institution_name_en}
                    </p>
                  )}
                </div>
              </Link>

              {/* Mobile toggle */}
              <button
                className="lg:hidden absolute right-0 p-2"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center justify-center flex-wrap gap-1 mt-3">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${getNavItemClass(isActive)} ${getNavDefaultClass(isActive)}`}
                    style={getNavItemStyle(isActive)}
                    onMouseEnter={(e) => {
                      if (!isActive && ns?.nav_hover_bg) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = ns.nav_hover_bg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>


          {/* Mobile Nav */}
          {mobileOpen && (
            <nav className="lg:hidden border-t px-4 py-3 space-y-1" style={{ backgroundColor: hs?.header_bg_color || undefined }}>
              <div className={`${!hs?.header_bg_color ? 'bg-card' : ''}`}>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-4 py-2.5 ${getNavItemClass(isActive)} ${getNavDefaultClass(isActive)}`}
                      style={getNavItemStyle(isActive)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="container mx-auto px-4"><BackButton position="top" /></div>
        {children}
        <div className="container mx-auto px-4"><BackButton position="bottom" /></div>
      </main>

      {/* Footer */}
      <footer
        className="islamic-pattern print:hidden no-print"
        style={{
          backgroundColor: fs?.footer_bg_color || undefined,
          color: fs?.footer_text_color || undefined,
        }}
      >
        <div className={`${!fs?.footer_bg_color ? 'bg-primary text-primary-foreground' : ''}`}>
          <div className="container mx-auto px-4 py-10">
            <div className={`grid grid-cols-1 md:grid-cols-${fs?.footer_columns || 3} gap-8`}>
              {/* Column 1: Institution info */}
              <div>
                <h3 className="font-display text-lg font-bold mb-3">{settings.institution_name}</h3>
                <p className="text-sm opacity-80 leading-relaxed">
                  {language === 'bn' ? settings.footer_description_bn : settings.footer_description_en}
                </p>
              </div>

              {/* Column 2: Contact */}
              {(fs?.show_contact_info !== false) && (
                <div>
                  <h4 className="font-semibold mb-3">{t('contact')}</h4>
                  <div className="space-y-2 text-sm opacity-80">
                    <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {settings.address}</p>
                    <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {settings.phone}</p>
                    <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {settings.email}</p>
                  </div>
                  {/* Social Links */}
                  {(fs?.show_social_links !== false) && settings.social_links?.filter(l => l.url).length > 0 && (
                    <div className="flex items-center gap-3 mt-4">
                      {settings.social_links.filter(l => l.url).map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm opacity-80 hover:opacity-100 underline">
                          {link.platform}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Column 3: Quick Links */}
              {(fs?.show_quick_links !== false) && (
                <div>
                  <h4 className="font-semibold mb-3">{language === 'bn' ? 'দ্রুত লিংক' : 'Quick Links'}</h4>
                  <div className="space-y-1.5 text-sm opacity-80">
                    {(settings.footer_links || []).map((link, i) => (
                      <Link key={i} to={link.url} className="block hover:opacity-100">
                        {language === 'bn' ? link.label_bn : link.label_en}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-current/20 text-center text-xs opacity-60">
              {renderedCopyright || `© ${new Date().getFullYear()} ${settings.institution_name}। ${language === 'bn' ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}`}
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default PublicLayout;
