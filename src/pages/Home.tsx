import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWebsiteSettings, FALLBACK_LOGO_URL, DEFAULT_MADRASA_BUILDING_URL } from '@/hooks/useWebsiteSettings';
import { usePrincipalOfficer } from '@/hooks/usePrincipalOfficer';
import { format } from 'date-fns';
import FloatingSocialIcons from '@/components/home/FloatingSocialIcons';
import '@/styles/institutional-home.css';

interface DeptDetail {
  title: string;
  sub: string;
  duration: string;
  age: string;
  seats: string;
  head: string;
  syllabus: string[];
  outcome: string;
}

const DEPT_DETAILS: Record<string, DeptDetail> = {
  noorani: {
    title: '১. নূরানী ও কিন্ডারগার্টেন বিভাগ',
    sub: 'শিশু ও বুনিয়াদি দ্বীনি শিক্ষা কাঠামো',
    duration: '৩ বছর মেয়াদি (প্লে, নার্সারি ও ১ম শ্রেণি)',
    age: '৪ থেকে ৭ বছর বয়সী শিশু',
    seats: '৬০ জন (আবাসিক ও অনাবাসিক)',
    head: 'মাওলানা মোহাম্মদ আবুল বশর (বিভাগীয় প্রধান)',
    syllabus: [
      'বিশুদ্ধ মাখরাজ ও তাজবীদের সাথে আরবি হরফ ও কুরআন তিলাওয়াত।',
      'আমপারা হিফজ ও দৈনন্দিন মাসনুন দোয়া ও জরুরি মাসআলা শিক্ষা।',
      'বাংলা ও ইংরেজি ব্যাকরণ, রিডিং ও সুন্দর ক্যালিগ্রাফি হস্তলিপি প্রশিক্ষণ।',
      'প্রাথমিক গণিত, ড্রয়িং ও আদব-আখলাক শিষ্টাচার শিক্ষা।',
    ],
    outcome:
      'নূরানী সমাপনী পরীক্ষা শেষে কেন্দ্রীয় সনদ প্রদান করা হয় এবং শিক্ষার্থী সরাসরি নাজেরা ও হিফজ শাখায় ভর্তির পূর্ণ যোগ্যতা অর্জন করে।',
  },
  nazera: {
    title: '২. নাজেরা কুরআনুল কারীম বিভাগ',
    sub: 'হিফজুল কুরআনের পূর্বপ্রস্তুতি পর্ব',
    duration: '১ বছর মেয়াদি',
    age: 'নূরানী কোর্স সমাপ্তকারী অথবা দেখে পড়তে সক্ষম শিক্ষার্থী',
    seats: '৪০ জন (শতভাগ আবাসিক)',
    head: 'হাফেজ ক্বারী ফয়জুল ইসলাম',
    syllabus: [
      'সম্পূর্ণ ৩০ পারা কুরআন দ্রুত, নির্ভুল ও স্পষ্টভাবে দেখে পড়ার নিরবচ্ছিন্ন মাশক।',
      'তাজবীদের সূক্ষ্ম নিয়মাবলি (ইখফা, ইদগাম, কলকলা, মদ) প্রয়োগসহ তিলাওয়াত।',
      'নামাজের শেষ ১০টি সূরা ও গুরুত্বপূর্ণ মাসনুন দোয়া মুখস্থকরণ।',
      'হিফজ শুরু করার মানসিক ও শারীরিক প্রস্তুতি গঠন।',
    ],
    outcome:
      'নাজেরা সমাপ্তির পর মূল্যায়ন পরীক্ষা নিয়ে মেধার ভিত্তিতে মূল হিফজ বিভাগে উত্তীর্ণ করা হয়।',
  },
  hifz: {
    title: '৩. হিফজুল কুরআনুল কারীম বিভাগ',
    sub: 'আন্তর্জাতিক মানের হিফজ ও তাজবীদ প্রশিক্ষণ',
    duration: '২ থেকে ৩ বছর মেয়াদি (মেধা অনুযায়ী)',
    age: 'নাজেরা উত্তীর্ণ শিক্ষার্থী',
    seats: '৮০ জন (শতভাগ আবাসিক নিবিড় তত্ত্বাবধান)',
    head: 'হাফেজ মাওলানা জুবায়ের আহমদ (প্রধান হিফজ শিক্ষক)',
    syllabus: [
      'দৈনিক নতুন সবক (হিফজ), সাত সবক ও আমপারা রিভিশনের ত্রিস্তরীয় কঠোর নিয়ম।',
      'আন্তর্জাতিক ক্বারীদের তিলাওয়াত অনুকরণে সুর ও লাহজা প্রশিক্ষণ।',
      'প্রতি বৃহস্পতিবার সাপ্তাহিক ও প্রতি মাসে পূর্ণাঙ্গ পারাভিত্তিক মাসিক পরীক্ষা।',
      'তাহাজ্জুদের বিশেষ আমল ও তারাবীর নামাজ পড়ানোর নিয়মিত মহড়া।',
    ],
    outcome:
      'হিফজ সমাপনীতে কেন্দ্রীয় বেফাকুল মাদারিসের সনদ, পাগড়ি প্রদান ও আন্তর্জাতিক হিফজ প্রতিযোগিতায় অংশগ্রহণের সুযোগ।',
  },
  kitab: {
    title: '৪. কিতাব ও আরবি ভাষা বিভাগ',
    sub: 'উচ্চতর দ্বীনি এলেম ও ফিকাহ শাস্ত্র',
    duration: 'ধারাবাহিক মাদরাসা শিক্ষাক্রম',
    age: 'হিফজ সম্পন্নকারী অথবা সমমানের শিক্ষার্থী',
    seats: '৫০ জন (আবাসিক)',
    head: 'মুফতি আব্দুর রহমান কাসেমী',
    syllabus: [
      'মিযান, মুনশাইব ও ইলমুস সারফ ও নাহু (আরবি ব্যাকরণ)।',
      'সহজ আরবি কথোপকথন ও বিশুদ্ধ ক্যালিগ্রাফি লিখন শৈলী।',
      'মুকাদ্দামাতুল জাযারিয়্যাহ ও তাজবীদের গভীর তাত্ত্বিক জ্ঞান।',
      'ফিকহ ও আকাইদের বুনিয়াদি কিতাবসমূহ।',
    ],
    outcome:
      'শিক্ষার্থীকে আরবি ভাষা ও দ্বীনের মৌলিক বিদ্যায় পারদর্শী করে উচ্চতর কওমি মাদরাসায় ভর্তির উপযোগী করে তোলা।',
  },
};

const Home = () => {
  const [activeModalKey, setActiveModalKey] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { settings } = useWebsiteSettings();
  const { data: principal } = usePrincipalOfficer();

  // Fetch live notices from Supabase
  const { data: notices = [] } = useQuery({
    queryKey: ['home-notices-institutional'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, title_bn, published_at, category')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(6);
      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Dynamic institution info from settings
  const instName = settings.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা';
  const instNameEn = settings.institution_name_en || 'Al-Arabia Subhania Madrasah & Eyateem Khana';
  const logoUrl = settings.logo_url || settings.loader_logo_url || FALLBACK_LOGO_URL;
  const heroImage = settings.hero_bg_image_url || DEFAULT_MADRASA_BUILDING_URL;
  const heroTitle = settings.hero_title_bn || 'দ্বীনি শিক্ষা ও চারিত্রিক নৈতিকতার এক শীর্ষ বিদ্যাপীঠ';
  const heroSubtitle = settings.hero_subtitle_bn || 'বিশুদ্ধ কুরআন তিলাওয়াত, তাজবীদ, আন্তর্জাতিক মানের হিফজুল কুরআন প্রশিক্ষণ ও ইসলামিক শিক্ষার এক আদর্শ পরিবেশ।';
  const phone = settings.phone || '০১৭৪৯-৮৪২৪০১';
  const email = settings.email || 'info@subhania.edu.bd';
  const address = settings.address || 'খাজাঞ্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট, বাংলাদেশ';
  const regNumber = settings.registration_number || '১২৪/সিলেট';
  const estYear = settings.established_year || '২০০৮';

  // Leaders
  const adminName = settings.admin_name || 'আলহাজ্ব আব্দুছ ছোবহান';
  const adminTitle = settings.admin_title_bn || 'প্রতিষ্ঠাতা ও সভাপতি, ম্যানেজিং কমিটি';
  const adminPhoto = settings.admin_photo_url;
  const adminMessage = settings.admin_message_bn ||
    '“অত্র অঞ্চলের ভবিষ্যৎ প্রজন্মকে সহীহ সুন্নাহ ও কুরআনের শিক্ষায় আলোকিত করার লক্ষ্যে এই প্রতিষ্ঠান যাত্রা শুরু করেছিল। আল্লাহর অশেষ রহমতে ও দ্বীনদরদী মানুষের সহযোগিতায় আজ এটি একটি সুপ্রতিষ্ঠিত দ্বীনি কেন্দ্রে রূপ নিয়েছে।”';

  const principalName = principal?.principal_name || settings.principal_name || 'মাওলানা মোহাম্মদ আবুল বশর';
  const principalTitle = principal?.principal_title_bn || settings.principal_title_bn || 'মুহতামিম ও প্রিন্সিপাল';
  const principalPhoto = principal?.principal_photo_url || settings.principal_photo_url;
  const principalMessage = settings.principal_message_bn ||
    '“যোগ্য শিক্ষক মণ্ডলীর সার্বক্ষণিক তদারকি, নিয়মিত ছবক প্রদান ও আবাসিক শিক্ষার্থীদের চারিত্রিক ও আত্মিক গঠনের জন্য আমরা বদ্ধপরিকর। আমাদের লক্ষ্য প্রতিটি ছাত্রকে আদর্শ হাফেজ ও আলেম হিসেবে গড়ে তোলা।”';

  // Stats
  const statStudents = settings.stat_students || '৩৫০+';
  const statTeachers = settings.stat_teachers || '২৫ জন';
  const statYears = settings.stat_years || '১৮ বছর';

  const announcement = settings.header_style?.topbar_announcement_bn ||
    '২০২৬-২০২৭ শিক্ষাবর্ষের নূরানী, নাজেরা ও হিফজুল কুরআন শাখায় ভর্তি ফরম বিতরণ চলছে • এতিমখানার লিল্লাহ ফান্ডে অনুদান প্রদান করুন';

  const activeDept = activeModalKey ? DEPT_DETAILS[activeModalKey] : null;

  return (
    <div className="institutional-root">
      <Seo
        title={`${instName} — অফিশিয়াল প্রাতিষ্ঠানিক ওয়েবসাইট`}
        description={`${instName} এর প্রাতিষ্ঠানিক হোমপোর্টাল। সহীহ কুরআন শিক্ষা, ভর্তি, পরীক্ষার ফলাফল ও দ্বীনি দিকনির্দেশনা।`}
        path="/"
      />

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
                <i className="fas fa-phone-alt"></i> {phone}
              </a>
              <a href={`mailto:${email}`}>
                <i className="fas fa-envelope"></i> {email}
              </a>
              <span>
                <i className="fas fa-map-marker-alt"></i> বিশ্বনাথ, সিলেট
              </span>
              <Link to="/login" style={{ color: '#fef08a', fontWeight: 700 }}>
                <i className="fas fa-sign-in-alt"></i> লগইন
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRAND INSTITUTIONAL HEADER */}
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
                <i className="fas fa-user-lock"></i>
                <span>শিক্ষক / স্টাফ পোর্টাল</span>
              </Link>
              <Link to="/admission" className="btn-portal-solid">
                <i className="fas fa-file-signature"></i>
                <span>অনলাইন ভর্তি আবেদন</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 3. MULTI-LEVEL INSTITUTIONAL NAVBAR */}
      <nav className="nav-bar">
        <div className="inst-container">
          <div className="mobile-nav-toggle-row" style={{ display: 'none', padding: '10px 0', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fef08a', fontWeight: 700, fontSize: '14px' }}>মেনু ও নেভিগেশন</span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i> মেনু
            </button>
          </div>
          <ul className={`nav-list ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li className="nav-item active">
              <Link to="/">
                <i className="fas fa-home"></i> প্রচ্ছদ
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/about">
                প্রতিষ্ঠান পরিচিতি <i className="fas fa-angle-down" style={{ fontSize: '11px' }}></i>
              </Link>
              <ul className="dropdown-menu">
                <li>
                  <Link to="/about#history">মাদরাসার সংক্ষিপ্ত ইতিহাস</Link>
                </li>
                <li>
                  <Link to="/about#vision">লক্ষ্য, উদ্দেশ্য ও ভিশন</Link>
                </li>
                <li>
                  <Link to="/about#admin-message">ম্যানেজিং পরিচালনা পরিষদ</Link>
                </li>
                <li>
                  <Link to="/about#teachers">শিক্ষক ও কর্মচারী ডিরেক্টরি</Link>
                </li>
              </ul>
            </li>
            <li className="nav-item">
              <a href="#departments">
                শিক্ষা বিভাগসমূহ <i className="fas fa-angle-down" style={{ fontSize: '11px' }}></i>
              </a>
              <ul className="dropdown-menu">
                <li>
                  <a href="#departments" onClick={() => setActiveModalKey('noorani')}>
                    নূরানী কিন্ডারগার্টেন
                  </a>
                </li>
                <li>
                  <a href="#departments" onClick={() => setActiveModalKey('nazera')}>
                    নাজেরা কুরআন বিভাগ
                  </a>
                </li>
                <li>
                  <a href="#departments" onClick={() => setActiveModalKey('hifz')}>
                    হিফজুল কুরআনুল কারীম
                  </a>
                </li>
                <li>
                  <a href="#departments" onClick={() => setActiveModalKey('kitab')}>
                    কিতাব ও আরবি ভাষা
                  </a>
                </li>
              </ul>
            </li>
            <li className="nav-item">
              <Link to="/admission">
                ভর্তি ও পাঠ্যক্রম <i className="fas fa-angle-down" style={{ fontSize: '11px' }}></i>
              </Link>
              <ul className="dropdown-menu">
                <li>
                  <Link to="/admission">ভর্তি নির্দেশিকা ও নিয়মাবলী</Link>
                </li>
                <li>
                  <Link to="/fees">ফি ও খরচ বিবরণী</Link>
                </li>
                <li>
                  <Link to="/admission">অনলাইন ভর্তি আবেদন ফরম</Link>
                </li>
              </ul>
            </li>
            <li className="nav-item">
              <Link to="/notices">দাপ্তরিক নোটিশ বোর্ড</Link>
            </li>
            <li className="nav-item">
              <Link to="/results">
                পরীক্ষা ও ফলাফল <i className="fas fa-angle-down" style={{ fontSize: '11px' }}></i>
              </Link>
              <ul className="dropdown-menu">
                <li>
                  <Link to="/results">একাডেমিক ক্যালেন্ডার ও ছুটি</Link>
                </li>
                <li>
                  <Link to="/results">পরীক্ষার রুটিন ও সিটপ্ল্যান</Link>
                </li>
                <li>
                  <Link to="/results">অনলাইন ফলাফল অনুসন্ধান</Link>
                </li>
              </ul>
            </li>
            <li className="nav-item">
              <Link to="/donation">এতিমখানা লিল্লাহ ফান্ড</Link>
            </li>
            <li className="nav-item">
              <Link to="/quran">কুরআন ও লাইব্রেরি</Link>
            </li>
            <li className="nav-item">
              <Link to="/gallery">ফটো গ্যালারি</Link>
            </li>
            <li className="nav-item">
              <Link to="/contact">যোগাযোগ ও দপ্তর</Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* 4. OFFICIAL NOTICE TICKER */}
      <div className="ticker-bar">
        <div className="inst-container ticker-inner">
          <span className="ticker-label">
            <i className="fas fa-bullhorn"></i> জরুরি বিজ্ঞপ্তি:
          </span>
          <marquee behavior="scroll" direction="left" scrollamount="4" className="ticker-content">
            {announcement}
          </marquee>
        </div>
      </div>

      {/* 5. GRAND HERO ROW: CAMPUS BANNER & OFFICIAL CIRCULAR DESK */}
      <section className="hero-wrap">
        <div className="inst-container">
          <div className="hero-grid">
            {/* Left: Campus Spotlight */}
            <div className="campus-spotlight">
              <div className="spotlight-media">
                <img
                  src={heroImage}
                  alt={instName}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = 'true';
                      img.src = DEFAULT_MADRASA_BUILDING_URL;
                    }
                  }}
                />
                <div className="spotlight-caption">
                  <h2>{heroTitle}</h2>
                  <p>{heroSubtitle}</p>
                </div>
              </div>
              <div className="spotlight-strip">
                <span className="quote">“জ্ঞানার্জন প্রতিটি মুসলমানের উপর ফরজ” — আল-হাদিস</span>
                <span style={{ color: '#64748b', fontWeight: 600 }}>
                  <i className="fas fa-check-circle" style={{ color: '#059669', marginRight: '4px' }}></i>
                  নিবন্ধিত ও অভ্যন্তরীণ অডিট নিয়ন্ত্রিত
                </span>
              </div>
            </div>

            {/* Right: Official Notice Board Desk */}
            <div className="official-notice-card">
              <div className="desk-head">
                <div className="desk-title">
                  <i className="fas fa-clipboard-list" style={{ color: 'var(--primary)' }}></i>
                  <span>দাপ্তরিক নোটিশ ও সার্কুলার</span>
                </div>
                <Link to="/notices" className="desk-link">
                  সকল নোটিশ <i className="fas fa-angle-right"></i>
                </Link>
              </div>

              <table className="desk-table">
                <tbody>
                  {notices.length > 0 ? (
                    notices.map((n, idx) => (
                      <tr key={n.id}>
                        <td className="col-date">
                          {n.published_at ? format(new Date(n.published_at), 'dd/MM/yyyy') : '৩১/১০/২০২৬'}
                        </td>
                        <td className="col-notice-text">
                          <Link to="/notices">
                            {n.title_bn || n.title}
                            {idx === 0 && <span className="new-badge">নতুন</span>}
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td className="col-date">৩১/১০/২০২৬</td>
                        <td className="col-notice-text">
                          <Link to="/notices">
                            ২০২৬-২০২৭ শিক্ষাবর্ষে নূরানী ও হিফজ শাখায় নতুন ভর্তি বিজ্ঞপ্তি <span className="new-badge">নতুন</span>
                          </Link>
                        </td>
                      </tr>
                      <tr>
                        <td className="col-date">২৫/১০/২০২৬</td>
                        <td className="col-notice-text">
                          <Link to="/notices">
                            অক্টোবর ২০২৬ মাসের আবাসিক ও অনাবাসিক পরীক্ষার ফলাফল প্রকাশ
                          </Link>
                        </td>
                      </tr>
                      <tr>
                        <td className="col-date">১৮/১০/২০২৬</td>
                        <td className="col-notice-text">
                          <Link to="/notices">
                            হিফজুল কুরআন সমাপনী পাগড়ী প্রদান ও বার্ষিক মাহফিল সংক্রান্ত বিজ্ঞপ্তি
                          </Link>
                        </td>
                      </tr>
                      <tr>
                        <td className="col-date">১২/১০/২০২৬</td>
                        <td className="col-notice-text">
                          <Link to="/notices">
                            মাদরাসার এতিমখানা ও লিল্লাহ বোর্ডিংয়ের বার্ষিক অডিট রিপোর্ট অনুমোদন
                          </Link>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              <div className="desk-foot">
                <Link to="/notices" className="btn-all-notices">
                  <i className="fas fa-file-pdf" style={{ marginRight: '6px' }}></i>
                  দাপ্তরিক নোটিশ আর্কাইভ দেখুন
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. EXECUTIVE LEADERSHIP STATEMENTS */}
      <section className="inst-container">
        <div className="sec-header-wrap">
          <h3 className="sec-heading">প্রতিষ্ঠান পরিচালনা ও প্রশাসনিক দিকনির্দেশনা</h3>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>মাদরাসার লক্ষ্য ও অনুপ্রেরণা</span>
        </div>

        <div className="leadership-grid">
          {/* President */}
          <div className="leader-box">
            {adminPhoto ? (
              <img
                src={adminPhoto}
                alt={adminName}
                className="leader-portrait"
              />
            ) : (
              <div className="leader-portrait" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#064e3b', fontSize: '32px' }}>
                <i className="fas fa-user-tie"></i>
              </div>
            )}
            <div className="leader-info-content">
              <div className="leader-tag">প্রতিষ্ঠাতা ও সভাপতি</div>
              <div className="leader-name">{adminName}</div>
              <div className="leader-desig">{adminTitle}</div>
              <p className="leader-quote">{adminMessage}</p>
              <Link to="/about#admin-message" className="leader-btn-more">
                সম্পূর্ণ বাণী পড়ুন <i className="fas fa-angle-double-right"></i>
              </Link>
            </div>
          </div>

          {/* Principal */}
          <div className="leader-box">
            {principalPhoto ? (
              <img
                src={principalPhoto}
                alt={principalName}
                className="leader-portrait"
              />
            ) : (
              <div className="leader-portrait" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#064e3b', fontSize: '32px' }}>
                <i className="fas fa-user-graduate"></i>
              </div>
            )}
            <div className="leader-info-content">
              <div className="leader-tag">মুহতামিম ও প্রিন্সিপাল</div>
              <div className="leader-name">{principalName}</div>
              <div className="leader-desig">{principalTitle}</div>
              <p className="leader-quote">{principalMessage}</p>
              <Link to="/about#principal-message" className="leader-btn-more">
                সম্পূর্ণ বাণী পড়ুন <i className="fas fa-angle-double-right"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ACADEMIC DEPARTMENTS (CLICKABLE DIRECTORY) */}
      <section className="inst-container" id="departments">
        <div className="sec-header-wrap">
          <h3 className="sec-heading">একাডেমিক শিক্ষা বিভাগসমূহ (ক্লিক করে বিস্তারিত দেখুন)</h3>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>কারিকুলাম, আসন ও ভর্তি যোগ্যতা</span>
        </div>

        <div className="dept-interactive-grid">
          {/* Noorani */}
          <div className="dept-interactive-card" onClick={() => setActiveModalKey('noorani')}>
            <div>
              <span className="badge-dept" style={{ background: '#ecfdf5', color: '#047857' }}>
                শিশু ও প্রাথমিক
              </span>
              <h4>১. নূরানী বিভাগ</h4>
              <p>
                সহীহ মাখরাজ ও তাজবীদের সাথে কুরআন শিক্ষা, প্রয়োজনীয় মাসআলা, বাংলা, ইংরেজি, গণিত ও ক্যালিগ্রাফি প্রশিক্ষণ।
              </p>
            </div>
            <div className="dept-action-text">
              <span>সিলেবাস ও বিস্তারিত দেখুন</span> <i className="fas fa-arrow-right"></i>
            </div>
          </div>

          {/* Nazera */}
          <div className="dept-interactive-card" onClick={() => setActiveModalKey('nazera')}>
            <div>
              <span className="badge-dept" style={{ background: '#fef3c7', color: '#b45309' }}>
                হিফজ প্রস্তুতিমূলক
              </span>
              <h4>২. নাজেরা কুরআন বিভাগ</h4>
              <p>
                দ্রুত ও নির্ভুল দেখে পড়ার যোগ্যতা অর্জন, সুমধুর কণ্ঠে মাশক এবং আন্তর্জাতিক মানের হিফজের প্রস্তুতি পর্ব।
              </p>
            </div>
            <div className="dept-action-text">
              <span>সিলেবাস ও বিস্তারিত দেখুন</span> <i className="fas fa-arrow-right"></i>
            </div>
          </div>

          {/* Hifz */}
          <div className="dept-interactive-card" onClick={() => setActiveModalKey('hifz')}>
            <div>
              <span className="badge-dept" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                বিশেষায়িত ও আবাসিক
              </span>
              <h4>৩. হিফজুল কুরআন</h4>
              <p>
                অভিজ্ঞ হাফেজগণের নিবিড় তত্ত্বাবধানে ৩ বছরে সম্পূর্ণ কুরআন হিফজ ও সাপ্তাহিক কেন্দ্রীয় দৌর (আমোক্তা)।
              </p>
            </div>
            <div className="dept-action-text">
              <span>সিলেবাস ও বিস্তারিত দেখুন</span> <i className="fas fa-arrow-right"></i>
            </div>
          </div>

          {/* Kitab */}
          <div className="dept-interactive-card" onClick={() => setActiveModalKey('kitab')}>
            <div>
              <span className="badge-dept" style={{ background: '#faf5ff', color: '#7e22ce' }}>
                উচ্চতর শরিয়াহ
              </span>
              <h4>৪. কিতাব ও আরবি বিভাগ</h4>
              <p>
                আরবি ব্যাকরণ (নাহু-ছরফ), তরজমায়ে কুরআন, হাদিস শরিফ ও ফিকহের মৌলিক কিতাবাদি অধ্যয়নের সুশৃঙ্খল পাঠদান।
              </p>
            </div>
            <div className="dept-action-text">
              <span>সিলেবাস ও বিস্তারিত দেখুন</span> <i className="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CAMPUS INFRASTRUCTURE & FACILITIES */}
      <section className="inst-container">
        <div className="sec-header-wrap">
          <h3 className="sec-heading">ক্যাম্পাস অবকাঠামো ও পরিবেশগত সুবিধাসমূহ</h3>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>শিক্ষার্থীদের সার্বিক নিরাপত্তা ও যত্ন</span>
        </div>

        <div className="facilities-grid">
          <div className="facility-box">
            <div className="facility-icon">
              <i className="fas fa-video"></i>
            </div>
            <div className="facility-content">
              <h5>সিসিটিভি নিয়ন্ত্রিত নিরাপত্তা</h5>
              <p>সম্পূর্ণ ক্যাম্পাস ও আবাসিক হল ২৪ ঘণ্টা সিসিটিভি ক্যামেরায় সার্বক্ষণিক পর্যবেক্ষণে থাকে।</p>
            </div>
          </div>

          <div className="facility-box">
            <div className="facility-icon">
              <i className="fas fa-utensils"></i>
            </div>
            <div className="facility-content">
              <h5>স্বাস্থ্যসম্মত পুষ্টিকর খাবার</h5>
              <p>হোস্টেল শিক্ষার্থীদের জন্য পরিষ্কার-পরিচ্ছন্ন পরিবেশে মানসম্মত খাবার তালিকা অনুযায়ী পরিবেশন।</p>
            </div>
          </div>

          <div className="facility-box">
            <div className="facility-icon">
              <i className="fas fa-book-reader"></i>
            </div>
            <div className="facility-content">
              <h5>সমৃদ্ধ কিতাবখানা (লাইব্রেরি)</h5>
              <p>তাফসীর, হাদিস, ফিকহ ও সহায়ক ইসলামিক বই-পুস্তকের এক বিশাল সংগ্রহশালা।</p>
            </div>
          </div>

          <div className="facility-box">
            <div className="facility-icon">
              <i className="fas fa-mosque"></i>
            </div>
            <div className="facility-content">
              <h5>কেন্দ্রীয় জামে মসজিদ</h5>
              <p>প্রতিদিন পাঁচ ওয়াক্ত জামাতে নামাজ আদায় ও বিশেষ তাশকিল মজলিসের সুপরিসর পরিবেশ।</p>
            </div>
          </div>

          <div className="facility-box">
            <div className="facility-icon">
              <i className="fas fa-medkit"></i>
            </div>
            <div className="facility-content">
              <h5>স্বাস্থ্যসেবা ও প্রাথমিক চিকিৎসা</h5>
              <p>অসুস্থ শিক্ষার্থীদের জন্য সার্বক্ষণিক প্রাথমিক চিকিৎসা ও বিশেষজ্ঞ চিকিৎসকের পরামর্শ ব্যবস্থা।</p>
            </div>
          </div>

          <div className="facility-box">
            <div className="facility-icon">
              <i className="fas fa-award"></i>
            </div>
            <div className="facility-content">
              <h5>পাগড়ি প্রদান ও আনুষ্ঠানিক সনদ</h5>
              <p>হিফজ সমাপনীতে কেন্দ্রীয় বেফাকুল মাদারিসের সনদ ও জমকালো পাগড়ি প্রদান সম্মাননা।</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. ONLINE SERVICES & INSTITUTIONAL STATS */}
      <section className="inst-container">
        <div className="portal-hub-row">
          {/* Online Self-Service Portals */}
          <div className="portal-services-box">
            <div className="sec-header-wrap" style={{ marginTop: 0, marginBottom: '12px' }}>
              <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary-dark)' }}>
                অনলাইন প্রাতিষ্ঠানিক সেবা ও স্বয়ংক্রিয় পোর্টাল
              </h4>
            </div>
            <div className="services-btn-grid">
              <Link to="/admission" className="service-btn-item">
                <div className="s-icon">
                  <i className="fas fa-file-invoice"></i>
                </div>
                <div className="s-title">অনলাইন ভর্তি ফরম</div>
              </Link>
              <Link to="/results" className="service-btn-item">
                <div className="s-icon">
                  <i className="fas fa-poll"></i>
                </div>
                <div className="s-title">ফলাফল অনুসন্ধান</div>
              </Link>
              <Link to="/fees" className="service-btn-item">
                <div className="s-icon">
                  <i className="fas fa-credit-card"></i>
                </div>
                <div className="s-title">অনলাইন বেতন ফি</div>
              </Link>
              <Link to="/donation" className="service-btn-item">
                <div className="s-icon">
                  <i className="fas fa-hand-holding-heart"></i>
                </div>
                <div className="s-title">দান ও লিল্লাহ ফান্ড</div>
              </Link>
            </div>
          </div>

          {/* Stats Box */}
          <div className="institutional-stats-box">
            <div className="stats-title">
              <i className="fas fa-medal" style={{ color: 'var(--gold-light)' }}></i> প্রাতিষ্ঠানিক পরিসংখ্যান ও ঐতিহ্য
            </div>
            <div className="stats-grid-2x2">
              <div className="stat-single">
                <div className="num">{statStudents}</div>
                <div className="lbl">বর্তমান শিক্ষার্থী</div>
              </div>
              <div className="stat-single">
                <div className="num">{statTeachers}</div>
                <div className="lbl">অনুমোদিত শিক্ষক</div>
              </div>
              <div className="stat-single">
                <div className="num">১০০+</div>
                <div className="lbl">হিফজ সমাপনী হাফেজ</div>
              </div>
              <div className="stat-single">
                <div className="num">{statYears}</div>
                <div className="lbl">ধারাবাহিক ঐতিহ্য</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. ORPHANAGE & LILLAH SPONSORSHIP SECTION */}
      <section className="inst-container">
        <div className="lillah-wrap">
          <div className="lillah-text">
            <h3>
              <i className="fas fa-hand-holding-heart" style={{ marginRight: '6px' }}></i>
              এতিমখানা ও লিল্লাহ বোর্ডিং ফান্ডে সহযোগিতা করুন
            </h3>
            <p>
              অত্র মাদরাসার এতিমখানায় বহু পিতৃহীন ও অতিদরিদ্র শিশু সম্পূর্ণ বিনামূল্যে বাসস্থান, পুষ্টিকর খাবার ও ইলমে ওহীর শিক্ষা গ্রহণ করছে। আপনার যাকাত, ফিতরা ও সদকা দিয়ে এই মাসুম শিশুদের ভবিষ্যৎ গড়তে শরিক হোন।
            </p>
          </div>

          <div className="bank-account-card">
            <div className="bank-name">
              <i className="fas fa-university" style={{ color: 'var(--gold)', marginRight: '6px' }}></i>
              সরাসরি মাদরাসার ব্যাংক হিসাব:
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              হিসাব নাম: {instName}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#1e3a8a', fontWeight: 700 }}>
              হিসাব নং: ২০৫০ ১২৩ ৪৫৬ ৭৮৯ ০১
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
              ইসলামী ব্যাংক বাংলাদেশ লিমিটেড, বিশ্বনাথ শাখা, সিলেট।
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>
              বিকাশ / নগদ (মার্চেন্ট): {phone}
            </div>
          </div>
        </div>
      </section>

      {/* 11. GRAND INSTITUTIONAL FOOTER */}
      <footer className="site-footer">
        <div className="inst-container">
          <div className="footer-columns">
            <div className="footer-col">
              <h4>{instName}</h4>
              <p style={{ lineHeight: 1.6, marginBottom: '12px', color: '#94a3b8' }}>
                বিশুদ্ধ কুরআন শিক্ষাদান ও সমাজের সুবিধাবঞ্চিত এতিম শিশুদের দ্বীনি ও নৈতিক শিক্ষায় গড়ে তোলার একটি ঐতিহ্যবাহী শীর্ষ প্রতিষ্ঠান।
              </p>
              <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
                <i className="fas fa-phone-alt" style={{ color: 'var(--gold)', marginRight: '6px' }}></i>
                হেল্পলাইন: {phone}
              </div>
            </div>

            <div className="footer-col">
              <h4>গুরুত্বপূর্ণ লিংক</h4>
              <ul>
                <li>
                  <Link to="/admission">ভর্তি নির্দেশিকা ও তথ্য</Link>
                </li>
                <li>
                  <Link to="/results">একাডেমিক ক্যালেন্ডার ও ছুটি</Link>
                </li>
                <li>
                  <Link to="/notices">দাপ্তরিক নোটিশ ও সার্কুলার</Link>
                </li>
                <li>
                  <Link to="/about#teachers">শিক্ষক ও কর্মচারী তালিকা</Link>
                </li>
                <li>
                  <Link to="/results">পরীক্ষার ফলাফল আর্কাইভ</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>শিক্ষা বিভাগসমূহ</h4>
              <ul>
                <li>
                  <a href="#departments" onClick={() => setActiveModalKey('noorani')}>
                    নূরানী কিন্ডারগার্টেন
                  </a>
                </li>
                <li>
                  <a href="#departments" onClick={() => setActiveModalKey('nazera')}>
                    নাজেরা কুরআন বিভাগ
                  </a>
                </li>
                <li>
                  <a href="#departments" onClick={() => setActiveModalKey('hifz')}>
                    হিফজুল কুরআনুল কারীম
                  </a>
                </li>
                <li>
                  <a href="#departments" onClick={() => setActiveModalKey('kitab')}>
                    কিতাব ও আরবি ভাষা
                  </a>
                </li>
                <li>
                  <Link to="/donation">এতিমখানা লিল্লাহ বোর্ডিং</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>দাপ্তরিক ঠিকানা</h4>
              <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '10px' }}>
                {address}
              </p>
              <div style={{ color: '#94a3b8' }}>
                ইমেইল: {email}
                <br />
                ওয়েব: www.subhania.edu.bd
              </div>
            </div>
          </div>

          <div className="copyright-strip">
            © ২০২৬ {instName} • সর্বস্বত্ব সংরক্ষিত • কারিগরি সহায়তায়: এডুমেট বিডি
          </div>
        </div>
      </footer>

      {/* ============================================== */}
      {/* MODAL: DEPARTMENT DETAILS POPUP */}
      {/* ============================================== */}
      {activeDept && (
        <div className="modal-overlay" onClick={() => setActiveModalKey(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div>
                <h3>{activeDept.title}</h3>
                <p>{activeDept.sub}</p>
              </div>
              <button className="btn-close-x" onClick={() => setActiveModalKey(null)}>
                &times;
              </button>
            </div>

            <div className="modal-content-area">
              <div className="specs-grid">
                <div className="spec-card">
                  <div className="spec-label">
                    <i className="fas fa-clock" style={{ marginRight: '4px' }}></i> কোর্স মেয়াদ ও সময়কাল
                  </div>
                  <div className="spec-val">{activeDept.duration}</div>
                </div>
                <div className="spec-card">
                  <div className="spec-label">
                    <i className="fas fa-user-check" style={{ marginRight: '4px' }}></i> ভর্তি যোগ্যতা ও বয়স
                  </div>
                  <div className="spec-val">{activeDept.age}</div>
                </div>
                <div className="spec-card">
                  <div className="spec-label">
                    <i className="fas fa-chair" style={{ marginRight: '4px' }}></i> মোট আসন সংখ্যা
                  </div>
                  <div className="spec-val">{activeDept.seats}</div>
                </div>
                <div className="spec-card">
                  <div className="spec-label">
                    <i className="fas fa-user-tie" style={{ marginRight: '4px' }}></i> বিভাগীয় প্রধান / তত্ত্বাবধায়ক
                  </div>
                  <div className="spec-val">{activeDept.head}</div>
                </div>
              </div>

              <div className="syllabus-box-modal">
                <div className="syllabus-box-head">
                  <i className="fas fa-book-open" style={{ color: 'var(--primary)', marginRight: '6px' }}></i>
                  পাঠ্যক্রম ও প্রধান প্রশিক্ষণ সূচি (সিলেবাস)
                </div>
                <ul className="syllabus-box-body">
                  {activeDept.syllabus.map((item, i) => (
                    <li key={i}>
                      <i className="fas fa-check-circle" style={{ color: '#059669', marginRight: '6px' }}></i>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px 16px', fontSize: '13px', color: '#166534' }}>
                <i className="fas fa-graduation-cap" style={{ marginRight: '6px' }}></i>
                <strong>সমাপনী ফলাফল ও কেন্দ্রীয় সনদ:</strong> {activeDept.outcome}
              </div>
            </div>

            <div className="modal-bottom-bar">
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                ভর্তি তথ্য ও সহায়তায়: {phone}
              </span>
              <Link to="/admission" className="btn-apply-direct" onClick={() => setActiveModalKey(null)}>
                অনলাইন আবেদন করুন <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Floating quick connect icons */}
      <FloatingSocialIcons />
    </div>
  );
};

export default Home;
