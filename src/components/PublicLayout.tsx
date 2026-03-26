import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';
import { Menu, X, Phone, Mail, MapPin, GraduationCap } from 'lucide-react';

const PublicLayout = ({ children }: { children: ReactNode }) => {
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: '/', label: t('home') },
    { path: '/about', label: t('about') },
    { path: '/gallery', label: t('gallery') },
    { path: '/admission', label: t('admission') },
    { path: '/result', label: t('result') },
    { path: '/student-info', label: t('studentInfo') },
    { path: '/notices', label: t('notice') },
    { path: '/contact', label: t('contact') },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground islamic-pattern">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> +880 1XXX-XXXXXX</span>
            <span className="hidden sm:flex items-center gap-1"><Mail className="w-3 h-3" /> info@madrasa.edu.bd</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/login" className="btn-gold-gradient !px-4 !py-1.5 !text-xs rounded-full">
              {t('login')}
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50" style={{ boxShadow: 'var(--shadow-soft)' }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-display font-bold text-foreground leading-tight">
                নূরুল ইসলাম মাদরাসা
              </h1>
              <p className="text-xs text-muted-foreground">Nurul Islam Madrasa</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/70 hover:text-foreground hover:bg-secondary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile toggle */}
          <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="lg:hidden border-t bg-card px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/70 hover:bg-secondary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground islamic-pattern">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-display text-lg font-bold mb-3">নূরুল ইসলাম মাদরাসা</h3>
              <p className="text-sm opacity-80 leading-relaxed">
                ইসলামিক শিক্ষা ও আধুনিক জ্ঞানের সমন্বয়ে একটি আদর্শ শিক্ষা প্রতিষ্ঠান।
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t('contact')}</h4>
              <div className="space-y-2 text-sm opacity-80">
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> ঢাকা, বাংলাদেশ</p>
                <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> +880 1XXX-XXXXXX</p>
                <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@madrasa.edu.bd</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">দ্রুত লিংক</h4>
              <div className="space-y-1.5 text-sm opacity-80">
                <Link to="/about" className="block hover:opacity-100">{t('about')}</Link>
                <Link to="/admission" className="block hover:opacity-100">{t('admission')}</Link>
                <Link to="/result" className="block hover:opacity-100">{t('result')}</Link>
                <Link to="/notices" className="block hover:opacity-100">{t('notice')}</Link>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-primary-foreground/20 text-center text-xs opacity-60">
            © {new Date().getFullYear()} নূরুল ইসলাম মাদরাসা। সর্বস্বত্ব সংরক্ষিত।
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
