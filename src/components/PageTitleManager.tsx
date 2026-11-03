import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useLanguage } from '@/contexts/LanguageContext';
import { DEFAULT_MENU_PATHS } from '@/lib/menuPathList';

const PUBLIC_PAGE_TITLES: Record<string, { bn: string; en: string }> = {
  '/': { bn: 'হোম', en: 'Home' },
  '/about': { bn: 'পরিচিতি ও সম্পর্কে', en: 'About Us' },
  '/history': { bn: 'ইতিহাস ও পটভূমি', en: 'History' },
  '/about/history': { bn: 'ইতিহাস ও পটভূমি', en: 'History' },
  '/vision': { bn: 'লক্ষ্য ও উদ্দেশ্য', en: 'Vision & Mission' },
  '/about/vision': { bn: 'লক্ষ্য ও উদ্দেশ্য', en: 'Vision & Mission' },
  '/admission': { bn: 'ভর্তি নির্দেশিকা ও আবেদন', en: 'Admission' },
  '/result': { bn: 'ফলাফল অনুসন্ধান', en: 'Results' },
  '/notices': { bn: 'নোটিশ বোর্ড', en: 'Notices' },
  '/login': { bn: 'লগইন প্যানেল', en: 'Login' },
  '/parent': { bn: 'অভিভাবক পোর্টাল', en: 'Parent Portal' },
  '/student-portal': { bn: 'শিক্ষার্থী পোর্টাল', en: 'Student Portal' },
  '/quran': { bn: 'কুরআনুল কারীম', en: 'Holy Quran' },
  '/zakat-fitra': { bn: 'যাকাত ও ফিতরা ক্যালকুলেটর', en: 'Zakat & Fitra' },
  '/complaints': { bn: 'অভিযোগ ও পরামর্শ', en: 'Complaints' },
  '/complaints/track': { bn: 'অভিযোগ ট্র্যাকিং', en: 'Track Complaint' },
  '/attendance-checkin': { bn: 'হাজিরা চেক-ইন', en: 'Attendance Check-in' },
  '/staff-checkin': { bn: 'স্টাফ চেক-ইন', en: 'Staff Check-in' },
  '/waiting-approval': { bn: 'অনুমোদনের অপেক্ষায়', en: 'Waiting for Approval' },
};

export const PageTitleManager = () => {
  const location = useLocation();
  const { settings } = useWebsiteSettings();
  const { language } = useLanguage();

  useEffect(() => {
    const instName =
      (language === 'bn'
        ? settings.institution_name
        : settings.institution_name_en || settings.institution_name) ||
      'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা';

    const path = location.pathname;

    // 1. Check exact public page titles
    if (PUBLIC_PAGE_TITLES[path]) {
      const p = PUBLIC_PAGE_TITLES[path];
      const title = language === 'bn' ? p.bn : p.en;
      document.title = `${title} | ${instName}`;
      return;
    }

    // 2. Normalise admin / user path
    const normalizedPath = path.startsWith('/user/')
      ? `/admin/${path.slice('/user/'.length)}`
      : path === '/user'
      ? '/admin'
      : path;

    // Check menu paths
    const matched = DEFAULT_MENU_PATHS.find((item) => item.path === normalizedPath);
    if (matched) {
      const label = language === 'bn' ? matched.label_bn : matched.label_en;
      document.title = `${label} | ${instName}`;
      return;
    }

    // Subpath match (e.g. /admin/students/profile/...)
    const parentMatch = DEFAULT_MENU_PATHS.find(
      (item) => item.path !== '/admin' && normalizedPath.startsWith(item.path + '/')
    );
    if (parentMatch) {
      const label = language === 'bn' ? parentMatch.label_bn : parentMatch.label_en;
      document.title = `${label} | ${instName}`;
      return;
    }

    if (normalizedPath === '/admin' || normalizedPath === '/admin/') {
      document.title = `${language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'} | ${instName}`;
      return;
    }

    // Default fallback
    document.title = instName;
  }, [location.pathname, location.search, settings.institution_name, settings.institution_name_en, language]);

  return null;
};

export default PageTitleManager;
