import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';
import { Menu, X, Phone, Mail, MapPin, GraduationCap } from 'lucide-react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useMenuSettings } from '@/hooks/useMenuSettings';

const PublicLayout = ({ children }: { children: ReactNode }) => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { settings } = useWebsiteSettings();
  const { menuConfig } = useMenuSettings();

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

  const logoSizeMap = { small: 'w-8 h-8', medium: 'w-12 h-12', large: 'w-16 h-16' };
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      {(hs?.topbar_visible !== false) && (
        <div
          className="islamic-pattern"
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
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {settings.phone}</span>
                    <span className="hidden sm:flex items-center gap-1"><Mail className="w-3 h-3" /> {settings.email}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
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
        className={`${hs?.header_sticky !== false ? 'sticky top-0 z-50' : ''} ${hs?.header_border !== false ? 'border-b' : ''}`}
        style={{
          backgroundColor: hs?.header_bg_color || undefined,
          color: hs?.header_text_color || undefined,
          boxShadow: hs?.header_shadow !== false ? 'var(--shadow-soft)' : 'none',
        }}
      >
        <div className={`${!hs?.header_bg_color ? 'bg-card' : ''}`}>
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className={`${logoSize} rounded-full object-cover`} />
              ) : (
                <div className={`${logoSize} rounded-full bg-primary flex items-center justify-center`}>
                  <GraduationCap className="w-7 h-7 text-primary-foreground" />
                </div>
              )}
              <div>
                {(hs?.show_institution_name !== false) && (
                  <h1 className="text-lg sm:text-xl font-display font-bold leading-tight" style={{ color: hs?.header_text_color || undefined }}>
                    {settings.institution_name}
                  </h1>
                )}
                {(hs?.show_institution_name_en !== false) && (
                  <p className="text-xs text-muted-foreground">{settings.institution_name_en}</p>
                )}
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
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

            {/* Mobile toggle */}
            <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
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
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer
        className="islamic-pattern"
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
  );
};

export default PublicLayout;
