import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWebsiteSettings, FALLBACK_LOGO_URL, DEFAULT_MADRASA_BUILDING_URL } from '@/hooks/useWebsiteSettings';
import { usePrincipalOfficer } from '@/hooks/usePrincipalOfficer';
import { format } from 'date-fns';
import FloatingSocialIcons from '@/components/home/FloatingSocialIcons';
import InstitutionalHeader from '@/components/institutional/InstitutionalHeader';
import InstitutionalFooter from '@/components/institutional/InstitutionalFooter';
import {
  Phone,
  Mail,
  MapPin,
  LogIn,
  FileSignature,
  UserCheck,
  Home as HomeIcon,
  ChevronDown,
  Megaphone,
  CheckCircle2,
  ClipboardList,
  ChevronRight,
  FileText,
  Clock,
  User,
  BookOpen,
  GraduationCap,
  ArrowRight,
  Video,
  Utensils,
  Library,
  Landmark,
  Stethoscope,
  Award,
  BarChart3,
  CreditCard,
  HeartHandshake,
  Medal,
  Users,
  Calendar,
  X,
  Menu,
} from 'lucide-react';
import '@/styles/institutional-home.css';

interface DeptDetail {
  title: string;
  sub: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  desc: string;
  duration: string;
  age: string;
  seats: string;
  head: string;
  classes?: any[];
  syllabus: string[];
  outcome: string;
}

const DEPT_METADATA_MAP: Record<string, Omit<DeptDetail, 'title'>> = {
  noorani: {
    badge: 'শিশু ও প্রাথমিক বুনিয়াদী',
    badgeBg: '#ecfdf5',
    badgeColor: '#047857',
    sub: 'শিশু ও বুনিয়াদি দ্বীনি শিক্ষা কাঠামো',
    desc: 'সহীহ মাখরাজ ও তাজবীদের সাথে কুরআন শিক্ষা, প্রয়োজনীয় মাসআলা, বাংলা, ইংরেজি, গণিত ও ক্যালিগ্রাফি প্রশিক্ষণ।',
    duration: '৩ বছর মেয়াদি (নূরানি ১ম, ২য় ও ৩য় শ্রেণি)',
    age: '৪ থেকে ৮ বছর বয়সী শিশু',
    seats: '৬০ জন (আবাসিক ও অনাবাসিক)',
    head: 'মাওলানা মোহাম্মদ আবুল বশর (বিভাগীয় প্রধান)',
    syllabus: [
      'বিশুদ্ধ মাখরাজ ও তাজবীদের সাথে আরবি হরফ ও কুরআন তিলাওয়াত।',
      'আমপারা হিফজ ও দৈনন্দিন মাসনুন দোয়া ও জরুরি মাসআলা শিক্ষা।',
      'বাংলা ও ইংরেজি ব্যাকরণ, রিডিং ও সুন্দর ক্যালিগ্রাফি হস্তলিপি প্রশিক্ষণ।',
      'প্রাথমিক গণিত, ড্রয়িং ও আদব-আখলাক শিষ্টাচার শিক্ষা।',
    ],
    outcome:
      'নূরানী সমাপনী পরীক্ষা শেষে কেন্দ্রীয় সনদ প্রদান করা হয় এবং শিক্ষার্থী সরাসরি হিফজ বা ইবতেদায়ী শাখায় ভর্তির পূর্ণ যোগ্যতা অর্জন করে।',
  },
  ebthedayee: {
    badge: 'প্রাথমিক দ্বীনি স্তর',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    sub: 'প্রাথমিক দ্বীনি ও সাধারণ কারিকুলাম',
    desc: 'সহীহ কুরআন ও দ্বীনি শিক্ষার পাশাপাশি সাধারণ প্রাথমিক বিষয়াবলি এবং আরবি ব্যাকরণের বুনিয়াদি পাঠদান।',
    duration: '২ বছর মেয়াদি (৪র্থ ও ৫ম শ্রেণি)',
    age: '৮ থেকে ১১ বছর',
    seats: '৫০ জন (আবাসিক ও অনাবাসিক)',
    head: 'মাওলানা আব্দুর রহমান (বিভাগীয় তত্ত্বাবধায়ক)',
    syllabus: [
      'কুরআনুল কারীম তিলাওয়াত ও অর্থসহ সহজ হাদিস মুখস্থকরণ।',
      'প্রাথমিক ফিকহ, আকাইদ ও ইসলামের মৌলিক বুনিয়াদি শিক্ষা।',
      'বাংলা, ইংরেজি, গণিত ও সাধারণ বিজ্ঞান পাঠ্যক্রম।',
      'সুন্দর হস্তলিপি ও ইসলামী আচরণবিধি অনুশীলন।',
    ],
    outcome:
      'ইবতেদায়ী ৫ম সমাপনীতে কেন্দ্রীয় পরীক্ষায় অংশগ্রহণ এবং মুতাওয়াসসিতাহ স্তরে পদার্পণের স্বীকৃতি।',
  },
  mutawassitah: {
    badge: 'উচ্চতর আরবি ও শরিয়াহ',
    badgeBg: '#faf5ff',
    badgeColor: '#7e22ce',
    sub: 'আরবি ব্যাকরণ ও শরিয়াহর বুনিয়াদি শিক্ষা',
    desc: 'আরবি ব্যাকরণ (নাহু-ছরফ), তরজমায়ে কুরআন, হাদিস শরিফ ও ফিকহের প্রামাণ্য কিতাবাদি অধ্যয়নের সুশৃঙ্খল পাঠদান।',
    duration: '২-৩ বছর মেয়াদি (সরফ ও নাহমেবির বর্ষ)',
    age: 'ইবতেদায়ী বা হিফজ সম্পন্নকারী',
    seats: '৪৫ জন (আবাসিক)',
    head: 'মুফতি জুবায়ের আহমদ (প্রধান শিক্ষক, কিতাব)',
    syllabus: [
      'ইলমুস সরফ (মিযান, মুনশাইব) ও আরবি শব্দরূপ রূপান্তর।',
      'ইলমুন নাহু (নাহবেমীর) ও আরবি বাক্যগঠন বিশ্লেষণ।',
      'ফিকহ শাস্ত্রের মূলনীতি ও প্রাথমিক মসলা-মাসায়েল।',
      'আরবি কথোপকথন ও শুদ্ধ উচ্চারণ প্রশিক্ষণ।',
    ],
    outcome:
      'শিক্ষার্থীকে আরবি ভাষা ও দ্বীনের মৌলিক বিদ্যায় দক্ষ করে উচ্চতর কওমি মাদরাসায় ভর্তির উপযোগী করে তোলা।',
  },
  hifz: {
    badge: 'বিশেষায়িত হিফজ ও নাজেরা',
    badgeBg: '#eff6ff',
    badgeColor: '#1d4ed8',
    sub: 'আন্তর্জাতিক মানের তাহফিজুল কুরআনুল কারীম',
    desc: 'নাজেরা থেকে শুরু করে সম্পূর্ণ ৩০ পারা কুরআন হিফজ, তাজবীদ, সুমধুর কণ্ঠে মাশক এবং সাপ্তাহিক কেন্দ্রীয় দৌর (আমোক্তা)।',
    duration: '২ থেকে ৩ বছর মেয়াদি (মেধা অনুযায়ী)',
    age: 'নাজেরা উত্তীর্ণ শিক্ষার্থী',
    seats: '৭০ জন (শতভাগ আবাসিক নিবিড় তত্ত্বাবধান)',
    head: 'হাফেজ ক্বারী ফয়জুল ইসলাম (প্রধান হিফজ শিক্ষক)',
    syllabus: [
      'হিফজ নাজেরা ও দেখে পড়ার নিখুঁত দ্রুততা অর্জন।',
      'দৈনিক নতুন সবক (হিফজ), সাত সবক ও আমপারা রিভিশনের কঠোর অনুশাসন।',
      'আন্তর্জাতিক ক্বারীদের তিলাওয়াত অনুকরণে সুর ও তাজবীদ মাশক।',
      'পারাভিত্তিক সাপ্তাহিক ও মাসিক কেন্দ্রীয় দৌর (৫ পারা, ১০ পারা, ২০ পারা)।',
    ],
    outcome:
      'হিফজ সমাপনীতে কেন্দ্রীয় বেফাকুল মাদারিসের সনদ, পাগড়ি প্রদান ও আন্তর্জাতিক হিফজ প্রতিযোগিতায় অংশগ্রহণের সুযোগ।',
  },
};

const toBnNum = (n: number) => n.toString().replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);

const Home = () => {
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

  // Fetch live divisions with classes directly from database
  const { data: dbDivisions = [] } = useQuery({
    queryKey: ['public-divisions-home-with-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*, classes(*)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [selectedDept, setSelectedDept] = useState<DeptDetail | null>(null);

  const getDivisionDetail = (div: any, index: number): DeptDetail => {
    const name = (div.name_bn || div.name || '').toLowerCase();
    let meta = DEPT_METADATA_MAP.noorani;
    if (name.includes('নূরানি') || name.includes('nuarani')) {
      meta = DEPT_METADATA_MAP.noorani;
    } else if (name.includes('ইবতেদায়ী') || name.includes('ইবতেদায়ী') || name.includes('ebthedayee')) {
      meta = DEPT_METADATA_MAP.ebthedayee;
    } else if (name.includes('মুতাওয়াসসিতাহ') || name.includes('মুতাওয়াসসিতাহ') || name.includes('mutawassitah')) {
      meta = DEPT_METADATA_MAP.mutawassitah;
    } else if (name.includes('হিফজ') || name.includes('hifz')) {
      meta = DEPT_METADATA_MAP.hifz;
    }

    const activeClasses = (div.classes || [])
      .filter((c: any) => c.is_active !== false)
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

    return {
      title: `${toBnNum(index + 1)}. ${div.name_bn || div.name}`,
      classes: activeClasses,
      ...meta,
    };
  };

  const handleDeptSelectById = (deptId: string) => {
    if (!dbDivisions.length) return;
    const found = dbDivisions.find(
      (d: any) =>
        d.id === deptId ||
        d.name_bn?.includes(deptId) ||
        d.name?.toLowerCase().includes(deptId.toLowerCase())
    );
    if (found) {
      const idx = dbDivisions.indexOf(found);
      setSelectedDept(getDivisionDetail(found, idx));
      const el = document.getElementById('departments');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Dynamic institution info directly from database settings
  const instName = settings?.institution_name || 'আল আরাবিয়া ছোবহানিয়া হাফিজিয়া মাদরাসা';
  const instNameEn = settings?.institution_name_en || 'Al-Arabia Subhania Hafizia Madrasah';
  const logoUrl = settings?.logo_url || settings?.loader_logo_url || FALLBACK_LOGO_URL;
  const heroImage = settings?.hero_bg_image_url || DEFAULT_MADRASA_BUILDING_URL;
  const heroTitle = settings?.hero_title_bn || 'ইসলামিক শিক্ষার আলোকবর্তিকা';
  const heroSubtitle = settings?.hero_subtitle_bn || 'কুরআন ও সুন্নাহর আলোকে আদর্শ মানুষ গড়ার প্রত্যয়ে প্রতিষ্ঠিত';
  const phone = settings?.phone || '01749842401';
  const email = settings?.email || 'info@subhania.edu.bd';
  const address = settings?.address || 'খাজাঞ্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট';
  const regNumber = settings?.registration_number || '১২৪/সিলেট';
  const estYear = settings?.established_year || '২০০৮';

  // Leader / Founder / Principal info directly from database settings
  const principalName = principal?.principal_name || settings?.principal_name || 'আলহাজ্ব আব্দুছ ছোবহান';
  const principalTitle = principal?.principal_title_bn || settings?.principal_title_bn || 'প্রতিষ্ঠাতা ও প্রিন্সিপাল';
  const principalPhoto = principal?.principal_photo_url || settings?.principal_photo_url;
  const principalMessage = settings?.principal_message_bn ||
    'আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ। আমাদের মাদরাসায় আপনাকে স্বাগতম।';

  const adminName = settings?.admin_name ? settings.admin_name.trim() : '';
  const adminTitle = settings?.admin_title_bn || 'এডমিন';
  const adminPhoto = settings?.admin_photo_url;
  const adminMessage = settings?.admin_message_bn || '';

  // Whether there are two distinct leaders or only one (Founder & Principal)
  const hasDistinctAdmin = Boolean(adminName && adminName !== principalName);

  // Stats from database
  const statStudents = settings?.stat_students || '১৬০+';
  const statTeachers = settings?.stat_teachers || '১৪+';
  const statYears = settings?.stat_years || '৫+';

  const announcement =
    settings?.header_style?.topbar_announcement_bn ||
    '২০২৬-২০২৭ শিক্ষাবর্ষের নূরানী, নাজেরা ও হিফজুল কুরআন শাখায় ভর্তি ফরম বিতরণ চলছে • এতিমখানার লিল্লাহ ফান্ডে অনুদান প্রদান করুন';

  return (
    <div className="institutional-root">
      <Seo
        title={`${instName} — অফিশিয়াল প্রাতিষ্ঠানিক ওয়েবসাইট`}
        description={`${instName} এর প্রাতিষ্ঠানিক হোমপোর্টাল। সহীহ কুরআন শিক্ষা, ভর্তি, পরীক্ষার ফলাফল ও দ্বীনি দিকনির্দেশনা।`}
        path="/"
      />

      {/* 1. TOP & GRAND INSTITUTIONAL HEADER & NAVBAR */}
      <InstitutionalHeader onDepartmentSelect={(key) => handleDeptSelectById(key)} />

      {/* 4. OFFICIAL NOTICE TICKER */}
      <div className="ticker-bar">
        <div className="inst-container ticker-inner">
          <span className="ticker-label">
            <Megaphone className="w-3.5 h-3.5 inline mr-1" /> জরুরি বিজ্ঞপ্তি:
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
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  নিবন্ধিত ও অভ্যন্তরীণ অডিট নিয়ন্ত্রিত
                </span>
              </div>
            </div>

            {/* Right: Official Notice Board Desk */}
            <div className="official-notice-card">
              <div className="desk-head">
                <div className="desk-title">
                  <ClipboardList className="w-4 h-4 inline mr-1 text-emerald-800" />
                  <span>দাপ্তরিক নোটিশ ও সার্কুলার</span>
                </div>
                <Link to="/notices" className="desk-link">
                  সকল নোটিশ <ChevronRight className="w-3.5 h-3.5 inline ml-0.5" />
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
                  <FileText className="w-3.5 h-3.5 inline mr-1.5" />
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

        {hasDistinctAdmin ? (
          <div className="leadership-grid">
            {/* President / Admin */}
            <div className="leader-box">
              {adminPhoto ? (
                <img src={adminPhoto} alt={adminName} className="leader-portrait" />
              ) : (
                <div
                  className="leader-portrait"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f1f5f9',
                    color: '#064e3b',
                  }}
                >
                  <UserCheck className="w-10 h-10 text-emerald-800" />
                </div>
              )}
              <div className="leader-info-content">
                <div className="leader-tag">{adminTitle}</div>
                <div className="leader-name">{adminName}</div>
                <p className="leader-quote">{adminMessage}</p>
                <Link to="/about#admin-message" className="leader-btn-more">
                  সম্পূর্ণ বাণী পড়ুন <ArrowRight className="w-3 h-3 inline ml-1" />
                </Link>
              </div>
            </div>

            {/* Principal */}
            <div className="leader-box">
              {principalPhoto ? (
                <img src={principalPhoto} alt={principalName} className="leader-portrait" />
              ) : (
                <div
                  className="leader-portrait"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f1f5f9',
                    color: '#064e3b',
                  }}
                >
                  <GraduationCap className="w-10 h-10 text-emerald-800" />
                </div>
              )}
              <div className="leader-info-content">
                <div className="leader-tag">{principalTitle}</div>
                <div className="leader-name">{principalName}</div>
                <p className="leader-quote">{principalMessage}</p>
                <Link to="/about#principal-message" className="leader-btn-more">
                  সম্পূর্ণ বাণী পড়ুন <ArrowRight className="w-3 h-3 inline ml-1" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Single Grand Leadership Card for Founder & Principal */
          <div className="leader-box" style={{ maxWidth: '820px', margin: '0 auto' }}>
            {principalPhoto ? (
              <img
                src={principalPhoto}
                alt={principalName}
                className="leader-portrait"
                style={{ width: '130px', height: '150px' }}
              />
            ) : (
              <div
                className="leader-portrait"
                style={{
                  width: '130px',
                  height: '150px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f0fdf4',
                  border: '2px solid #bbf7d0',
                  color: '#064e3b',
                }}
              >
                <GraduationCap className="w-14 h-14 text-emerald-800" />
              </div>
            )}
            <div className="leader-info-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="leader-tag" style={{ fontSize: '13px' }}>
                {principalTitle}
              </div>
              <div className="leader-name" style={{ fontSize: '22px', margin: '3px 0 6px 0' }}>
                {principalName}
              </div>
              <div className="leader-desig" style={{ fontSize: '13px', color: '#64748b' }}>
                {instName}
              </div>
              <p className="leader-quote" style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155' }}>
                {principalMessage}
              </p>
              <div style={{ marginTop: '10px' }}>
                <Link to="/about#principal-message" className="leader-btn-more" style={{ fontSize: '13.5px' }}>
                  সম্পূর্ণ বাণী ও পরিচিতি পড়ুন <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 7. ACADEMIC DEPARTMENTS (CLICKABLE DIRECTORY) */}
      <section className="inst-container" id="departments">
        <div className="sec-header-wrap">
          <h3 className="sec-heading">একাডেমিক শিক্ষা বিভাগসমূহ (ক্লিক করে বিস্তারিত দেখুন)</h3>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>কারিকুলাম, আসন ও ভর্তি যোগ্যতা</span>
        </div>

        <div className="dept-interactive-grid">
          {(dbDivisions.length > 0
            ? dbDivisions
            : [
                { id: 'nuarani', name_bn: 'নূরানি বিভাগ' },
                { id: 'ebthedayee', name_bn: 'ইবতেদায়ী বিভাগ' },
                { id: 'mutawassitah', name_bn: 'মুতাওয়াসসিতাহ বিভাগ' },
                { id: 'hifz', name_bn: 'হিফজ বিভাগ' },
              ]
          ).map((div: any, idx: number) => {
            const detail = getDivisionDetail(div, idx);
            return (
              <div
                key={div.id || idx}
                className="dept-interactive-card"
                onClick={() => setSelectedDept(detail)}
              >
                <div>
                  <span
                    className="badge-dept"
                    style={{ background: detail.badgeBg, color: detail.badgeColor }}
                  >
                    {detail.badge}
                  </span>
                  <h4>{detail.title}</h4>
                  <p>{detail.desc}</p>
                </div>
                <div className="dept-action-text">
                  <span>সিলেবাস ও বিস্তারিত দেখুন</span> <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
                </div>
              </div>
            );
          })}
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
              <Video className="w-5 h-5 text-emerald-800" />
            </div>
            <div className="facility-content">
              <h5>সিসিটিভি নিয়ন্ত্রিত নিরাপত্তা</h5>
              <p>সম্পূর্ণ ক্যাম্পাস ও আবাসিক হল ২৪ ঘণ্টা সিসিটিভি ক্যামেরায় সার্বক্ষণিক পর্যবেক্ষণে থাকে।</p>
            </div>
          </div>

          <div className="facility-box">
            <div className="facility-icon">
              <Utensils className="w-5 h-5 text-emerald-800" />
            </div>
            <div className="facility-content">
              <h5>স্বাস্থ্যসম্মত পুষ্টিকর খাবার</h5>
              <p>হোস্টেল শিক্ষার্থীদের জন্য পরিষ্কার-পরিচ্ছন্ন পরিবেশে মানসম্মত খাবার তালিকা অনুযায়ী পরিবেশন।</p>
            </div>
          </div>

          <div className="facility-box">
            <div className="facility-icon">
              <Library className="w-5 h-5 text-emerald-800" />
            </div>
            <div className="facility-content">
              <h5>সমৃদ্ধ কিতাবখানা (লাইব্রেরি)</h5>
              <p>তাফসীর, হাদিস, ফিকহ ও সহায়ক ইসলামিক বই-পুস্তকের এক বিশাল সংগ্রহশালা।</p>
            </div>
          </div>

          <div className="facility-box">
            <div className="facility-icon">
              <Landmark className="w-5 h-5 text-emerald-800" />
            </div>
            <div className="facility-content">
              <h5>কেন্দ্রীয় জামে মসজিদ</h5>
              <p>প্রতিদিন পাঁচ ওয়াক্ত জামাতে নামাজ আদায় ও বিশেষ তাশকিল মজলিসের সুপরিসর পরিবেশ।</p>
            </div>
          </div>

          <div className="facility-box">
            <div className="facility-icon">
              <Stethoscope className="w-5 h-5 text-emerald-800" />
            </div>
            <div className="facility-content">
              <h5>স্বাস্থ্যসেবা ও প্রাথমিক চিকিৎসা</h5>
              <p>অসুস্থ শিক্ষার্থীদের জন্য সার্বক্ষণিক প্রাথমিক চিকিৎসা ও বিশেষজ্ঞ চিকিৎসকের পরামর্শ ব্যবস্থা।</p>
            </div>
          </div>

          <div className="facility-box">
            <div className="facility-icon">
              <Award className="w-5 h-5 text-emerald-800" />
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
                  <FileSignature className="w-6 h-6 mx-auto text-emerald-800" />
                </div>
                <div className="s-title">অনলাইন ভর্তি ফরম</div>
              </Link>
              <Link to="/results" className="service-btn-item">
                <div className="s-icon">
                  <BarChart3 className="w-6 h-6 mx-auto text-emerald-800" />
                </div>
                <div className="s-title">ফলাফল অনুসন্ধান</div>
              </Link>
              <Link to="/fees" className="service-btn-item">
                <div className="s-icon">
                  <CreditCard className="w-6 h-6 mx-auto text-emerald-800" />
                </div>
                <div className="s-title">অনলাইন বেতন ফি</div>
              </Link>
              <Link to="/donation" className="service-btn-item">
                <div className="s-icon">
                  <HeartHandshake className="w-6 h-6 mx-auto text-emerald-800" />
                </div>
                <div className="s-title">দান ও লিল্লাহ ফান্ড</div>
              </Link>
            </div>
          </div>

          {/* Stats Box */}
          <div className="institutional-stats-box">
            <div className="stats-title">
              <Medal className="w-4 h-4 inline mr-1 text-amber-300" /> প্রাতিষ্ঠানিক পরিসংখ্যান ও ঐতিহ্য
            </div>
            <div className="stats-grid-2x2">
              <div className="stat-single">
                <div className="num">{statStudents}</div>
                <div className="lbl">
                  <Users className="w-3 h-3 inline mr-1" /> বর্তমান শিক্ষার্থী
                </div>
              </div>
              <div className="stat-single">
                <div className="num">{statTeachers}</div>
                <div className="lbl">
                  <GraduationCap className="w-3 h-3 inline mr-1" /> অনুমোদিত শিক্ষক
                </div>
              </div>
              <div className="stat-single">
                <div className="num">১০০+</div>
                <div className="lbl">
                  <Award className="w-3 h-3 inline mr-1" /> হিফজ সমাপনী হাফেজ
                </div>
              </div>
              <div className="stat-single">
                <div className="num">{statYears}</div>
                <div className="lbl">
                  <Calendar className="w-3 h-3 inline mr-1" /> ধারাবাহিক ঐতিহ্য
                </div>
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
              <HeartHandshake className="w-5 h-5 inline mr-1.5 text-amber-800" />
              এতিমখানা ও লিল্লাহ বোর্ডিং ফান্ডে সহযোগিতা করুন
            </h3>
            <p>
              অত্র মাদরাসার এতিমখানায় বহু পিতৃহীন ও অতিদরিদ্র শিশু সম্পূর্ণ বিনামূল্যে বাসস্থান, পুষ্টিকর খাবার ও ইলমে ওহীর শিক্ষা গ্রহণ করছে। আপনার যাকাত, ফিতরা ও সদকা দিয়ে এই মাসুম শিশুদের ভবিষ্যৎ গড়তে শরিক হোন।
            </p>
          </div>

          <div className="bank-account-card">
            <div className="bank-name">
              <Landmark className="w-4 h-4 inline mr-1.5 text-amber-600" />
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
      <InstitutionalFooter onDepartmentSelect={(key) => handleDeptSelectById(key)} />

      {/* ============================================== */}
      {/* MODAL: DEPARTMENT DETAILS POPUP */}
      {/* ============================================== */}
      {selectedDept && (
        <div className="modal-overlay" onClick={() => setSelectedDept(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div>
                <h3>{selectedDept.title}</h3>
                <p>{selectedDept.sub}</p>
              </div>
              <button className="btn-close-x" onClick={() => setSelectedDept(null)}>
                &times;
              </button>
            </div>

            <div className="modal-content-area">
              {/* Classes list if available */}
              {selectedDept.classes && selectedDept.classes.length > 0 && (
                <div
                  style={{
                    marginBottom: '14px',
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                  }}
                >
                  <strong style={{ color: '#064e3b' }}>অন্তর্ভুক্ত শ্রেণি / জামাত: </strong>
                  <span style={{ color: '#334155' }}>
                    {selectedDept.classes.map((c: any) => c.name_bn || c.name).join(' • ')}
                  </span>
                </div>
              )}

              <div className="specs-grid">
                <div className="spec-card">
                  <div className="spec-label">
                    <Clock className="w-3.5 h-3.5 inline mr-1 text-amber-600" /> কোর্স মেয়াদ ও সময়কাল
                  </div>
                  <div className="spec-val">{selectedDept.duration}</div>
                </div>
                <div className="spec-card">
                  <div className="spec-label">
                    <UserCheck className="w-3.5 h-3.5 inline mr-1 text-amber-600" /> ভর্তি যোগ্যতা ও বয়স
                  </div>
                  <div className="spec-val">{selectedDept.age}</div>
                </div>
                <div className="spec-card">
                  <div className="spec-label">
                    <Users className="w-3.5 h-3.5 inline mr-1 text-amber-600" /> মোট আসন সংখ্যা
                  </div>
                  <div className="spec-val">{selectedDept.seats}</div>
                </div>
                <div className="spec-card">
                  <div className="spec-label">
                    <User className="w-3.5 h-3.5 inline mr-1 text-amber-600" /> বিভাগীয় প্রধান / তত্ত্বাবধায়ক
                  </div>
                  <div className="spec-val">{selectedDept.head}</div>
                </div>
              </div>

              <div className="syllabus-box-modal">
                <div className="syllabus-box-head">
                  <BookOpen className="w-4 h-4 inline mr-1.5 text-emerald-800" />
                  পাঠ্যক্রম ও প্রধান প্রশিক্ষণ সূচি (সিলেবাস)
                </div>
                <ul className="syllabus-box-body">
                  {selectedDept.syllabus.map((item, i) => (
                    <li key={i}>
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: '#166534',
                }}
              >
                <GraduationCap className="w-4 h-4 inline mr-1.5" />
                <strong>সমাপনী ফলাফল ও কেন্দ্রীয় সনদ:</strong> {selectedDept.outcome}
              </div>
            </div>

            <div className="modal-bottom-bar">
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                ভর্তি তথ্য ও সহায়তায়: {phone}
              </span>
              <Link to="/admission" className="btn-apply-direct" onClick={() => setSelectedDept(null)}>
                অনলাইন আবেদন করুন <ArrowRight className="w-3.5 h-3.5 inline ml-1.5" />
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
