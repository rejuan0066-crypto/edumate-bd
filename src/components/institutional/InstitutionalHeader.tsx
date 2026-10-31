import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Phone,
  Mail,
  MapPin,
  LogIn,
  FileSignature,
  UserCheck,
  Home as HomeIcon,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useWebsiteSettings, FALLBACK_LOGO_URL } from '@/hooks/useWebsiteSettings';

interface InstitutionalHeaderProps {
  onDepartmentSelect?: (deptKey: string) => void;
}

export const InstitutionalHeader = ({ onDepartmentSelect }: InstitutionalHeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { settings } = useWebsiteSettings();

  const instName = settings.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা';
  const logoUrl = settings.logo_url || FALLBACK_LOGO_URL;
  const phone = settings.phone || '01749842401';
  const email = settings.email || 'info@subhania.edu.bd';
  const address = settings.address || 'খাজাঞ্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট, বাংলাদেশ';
  const estYear = settings.est_year || '২০১৮';
  const regNumber = settings.reg_number || '১২৪/সিলেট';

  const { data: divisions = [] } = useQuery({
    queryKey: ['public-divisions-header'],
    queryFn: async () => {
      const { data } = await supabase
        .from('divisions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleDeptClick = (key: string) => {
    setMobileMenuOpen(false);
    if (onDepartmentSelect) {
      onDepartmentSelect(key);
    }
  };

  return (
    <>
      {/* 1. TOP OFFICIAL DIRECTORY BAR */}
      <div className="top-bar">
        <div className="inst-container">
          <div className="top-bar-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
              <span className="reg-tag">বেফাক রেজি নং: {regNumber} • স্থাপিত: {estYear} খ্রি.</span>
            </div>
            <div className="top-right">
              <a href={`tel:${phone}`}>
                <Phone className="w-3 h-3 inline mr-1" /> {phone}
              </a>
              <a href={`mailto:${email}`}>
                <Mail className="w-3 h-3 inline mr-1" /> {email}
              </a>
              <span>
                <MapPin className="w-3 h-3 inline mr-1" /> বিশ্বনাথ, সিলেট
              </span>
              <Link to="/login" style={{ color: '#fef08a', fontWeight: 700 }}>
                <LogIn className="w-3.5 h-3.5 inline mr-1" /> লগইন
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRAND INSTITUTIONAL BRAND HEADER */}
      <header className="site-header">
        <div className="inst-container">
          <div className="header-inner">
            <Link to="/" className="brand-section">
              <div className="brand-crest">
                <img
                  src={logoUrl}
                  alt={instName}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = 'true';
                      img.src = '/loader-logo.png';
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div className="brand-names">
                <h1>{instName}</h1>
                <div className="arabic-title">المدرسة العربية السبحانية ودار الأيتام</div>
                <div className="sub-tag">{address}</div>
              </div>
            </Link>

            <div className="header-cta-group">
              <Link to="/login" className="btn-portal-outline">
                <UserCheck className="w-4 h-4 inline mr-1.5" />
                <span>শিক্ষক / স্টাফ পোর্টাল</span>
              </Link>
              <Link to="/admission" className="btn-portal-solid">
                <FileSignature className="w-4 h-4 inline mr-1.5" />
                <span>অনলাইন ভর্তি আবেদন</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 3. MULTI-LEVEL INSTITUTIONAL NAVBAR */}
      <nav className="nav-bar">
        <div className="inst-container">
          <div
            className="mobile-nav-toggle-row"
            style={{ display: 'none', padding: '10px 0', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ color: '#fef08a', fontWeight: 700, fontSize: '14px' }}>মেনু ও নেভিগেশন</span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>মেনু</span>
            </button>
          </div>
          <ul className={`nav-list ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li className={`nav-item ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <HomeIcon className="w-3.5 h-3.5 inline mr-1" /> প্রচ্ছদ
              </Link>
            </li>
            <li className={`nav-item ${isActive('/about') ? 'active' : ''}`}>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)}>
                প্রতিষ্ঠান পরিচিতি <ChevronDown className="w-3 h-3 inline ml-1" />
              </Link>
              <ul className="dropdown-menu">
                <li>
                  <Link to="/about#history" onClick={() => setMobileMenuOpen(false)}>
                    মাদরাসার সংক্ষিপ্ত ইতিহাস
                  </Link>
                </li>
                <li>
                  <Link to="/about#vision" onClick={() => setMobileMenuOpen(false)}>
                    লক্ষ্য, উদ্দেশ্য ও ভিশন
                  </Link>
                </li>
                <li>
                  <Link to="/about#principal-message" onClick={() => setMobileMenuOpen(false)}>
                    পরিচালনা পরিষদ ও অধ্যক্ষের বাণী
                  </Link>
                </li>
                <li>
                  <Link to="/about#features" onClick={() => setMobileMenuOpen(false)}>
                    একাডেমিক বৈশিষ্ট্য ও সুবিধা
                  </Link>
                </li>
              </ul>
            </li>
            <li className="nav-item">
              <a href="/#departments">
                শিক্ষা বিভাগসমূহ <ChevronDown className="w-3 h-3 inline ml-1" />
              </a>
              <ul className="dropdown-menu">
                {divisions.length > 0 ? (
                  divisions.map((div) => (
                    <li key={div.id}>
                      <a href="/#departments" onClick={() => handleDeptClick(div.id)}>
                        {div.name_bn || div.name}
                      </a>
                    </li>
                  ))
                ) : (
                  <>
                    <li>
                      <a href="/#departments" onClick={() => handleDeptClick('nuarani')}>
                        নূরানি বিভাগ
                      </a>
                    </li>
                    <li>
                      <a href="/#departments" onClick={() => handleDeptClick('ebthedayee')}>
                        ইবতেদায়ী বিভাগ
                      </a>
                    </li>
                    <li>
                      <a href="/#departments" onClick={() => handleDeptClick('mutawassitah')}>
                        মুতাওয়াসসিতাহ বিভাগ
                      </a>
                    </li>
                    <li>
                      <a href="/#departments" onClick={() => handleDeptClick('hifz')}>
                        হিফজ বিভাগ
                      </a>
                    </li>
                  </>
                )}
              </ul>
            </li>
            <li className={`nav-item ${isActive('/admission') || isActive('/fee-payment') || isActive('/fees') ? 'active' : ''}`}>
              <Link to="/admission" onClick={() => setMobileMenuOpen(false)}>
                ভর্তি ও পাঠ্যক্রম <ChevronDown className="w-3 h-3 inline ml-1" />
              </Link>
              <ul className="dropdown-menu">
                <li>
                  <Link to="/admission" onClick={() => setMobileMenuOpen(false)}>
                    ভর্তি নির্দেশিকা ও নিয়মাবলী
                  </Link>
                </li>
                <li>
                  <Link to="/fee-payment" onClick={() => setMobileMenuOpen(false)}>
                    ফি ও খরচ বিবরণী
                  </Link>
                </li>
                <li>
                  <Link to="/admission" onClick={() => setMobileMenuOpen(false)}>
                    অনলাইন ভর্তি আবেদন ফরম
                  </Link>
                </li>
              </ul>
            </li>
            <li className={`nav-item ${isActive('/notices') ? 'active' : ''}`}>
              <Link to="/notices" onClick={() => setMobileMenuOpen(false)}>
                দাপ্তরিক নোটিশ বোর্ড
              </Link>
            </li>
            <li className={`nav-item ${isActive('/result') || isActive('/results') ? 'active' : ''}`}>
              <Link to="/result" onClick={() => setMobileMenuOpen(false)}>
                পরীক্ষা ও ফলাফল <ChevronDown className="w-3 h-3 inline ml-1" />
              </Link>
              <ul className="dropdown-menu">
                <li>
                  <Link to="/result" onClick={() => setMobileMenuOpen(false)}>
                    অনলাইন ফলাফল অনুসন্ধান
                  </Link>
                </li>
                <li>
                  <Link to="/notices" onClick={() => setMobileMenuOpen(false)}>
                    পরীক্ষার রুটিন ও সিটপ্ল্যান
                  </Link>
                </li>
                <li>
                  <a href="/#prayer-calendar" onClick={() => setMobileMenuOpen(false)}>
                    নামাজের সময়সূচী ও ক্যালেন্ডার
                  </a>
                </li>
                <li>
                  <Link to="/notices" onClick={() => setMobileMenuOpen(false)}>
                    একাডেমিক ক্যালেন্ডার ও ছুটি
                  </Link>
                </li>
              </ul>
            </li>
            <li className={`nav-item ${isActive('/donation') ? 'active' : ''}`}>
              <Link to="/donation" onClick={() => setMobileMenuOpen(false)}>
                এতিমখানা লিল্লাহ ফান্ড
              </Link>
            </li>
            <li className={`nav-item ${isActive('/quran') ? 'active' : ''}`}>
              <Link to="/quran" onClick={() => setMobileMenuOpen(false)}>
                কুরআন ও লাইব্রেরি
              </Link>
            </li>
            <li className={`nav-item ${isActive('/gallery') ? 'active' : ''}`}>
              <Link to="/gallery" onClick={() => setMobileMenuOpen(false)}>
                ফটো গ্যালারি
              </Link>
            </li>
            <li className={`nav-item ${isActive('/contact') ? 'active' : ''}`}>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)}>
                যোগাযোগ ও দপ্তর
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
};

export default InstitutionalHeader;
