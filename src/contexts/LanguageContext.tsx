import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'bn' | 'en';

interface Translations {
  [key: string]: { bn: string; en: string };
}

const translations: Translations = {
  home: { bn: 'হোম', en: 'Home' },
  about: { bn: 'আমাদের সম্পর্কে', en: 'About' },
  gallery: { bn: 'গ্যালারি', en: 'Gallery' },
  admission: { bn: 'ভর্তি', en: 'Admission' },
  result: { bn: 'ফলাফল', en: 'Result' },
  notice: { bn: 'নোটিশ বোর্ড', en: 'Notice Board' },
  contact: { bn: 'যোগাযোগ', en: 'Contact' },
  studentInfo: { bn: 'ছাত্র তথ্য', en: 'Student Info' },
  login: { bn: 'লগইন', en: 'Login' },
  dashboard: { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  students: { bn: 'ছাত্র ব্যবস্থাপনা', en: 'Students' },
  staff: { bn: 'কর্মী ব্যবস্থাপনা', en: 'Staff' },
  teachers: { bn: 'শিক্ষক', en: 'Teachers' },
  division: { bn: 'বিভাগ ও শ্রেণী', en: 'Division & Class' },
  subjects: { bn: 'বিষয়সমূহ', en: 'Subjects' },
  results: { bn: 'ফলাফল', en: 'Results' },
  notices: { bn: 'নোটিশ', en: 'Notices' },
  fees: { bn: 'ফি ব্যবস্থাপনা', en: 'Fees' },
  settings: { bn: 'সেটিংস', en: 'Settings' },
  websiteControl: { bn: 'ওয়েবসাইট নিয়ন্ত্রণ', en: 'Website Control' },
  welcome: { bn: 'স্বাগতম', en: 'Welcome' },
  totalStudents: { bn: 'মোট ছাত্র', en: 'Total Students' },
  totalTeachers: { bn: 'মোট শিক্ষক', en: 'Total Teachers' },
  totalStaff: { bn: 'মোট কর্মী', en: 'Total Staff' },
  activeStudents: { bn: 'সক্রিয় ছাত্র', en: 'Active Students' },
  principalMessage: { bn: 'অধ্যক্ষের বাণী', en: "Principal's Message" },
  latestNotice: { bn: 'সর্বশেষ নোটিশ', en: 'Latest Notices' },
  onlineAdmission: { bn: 'অনলাইন ভর্তি', en: 'Online Admission' },
  search: { bn: 'খুঁজুন', en: 'Search' },
  viewAll: { bn: 'সব দেখুন', en: 'View All' },
  readMore: { bn: 'আরও পড়ুন', en: 'Read More' },
  applyNow: { bn: 'এখনই আবেদন করুন', en: 'Apply Now' },
  username: { bn: 'ইউজারনেম', en: 'Username' },
  password: { bn: 'পাসওয়ার্ড', en: 'Password' },
  forgotPassword: { bn: 'পাসওয়ার্ড ভুলে গেছেন?', en: 'Forgot Password?' },
  signIn: { bn: 'সাইন ইন', en: 'Sign In' },
  addNew: { bn: 'নতুন যোগ করুন', en: 'Add New' },
  export: { bn: 'এক্সপোর্ট', en: 'Export' },
  print: { bn: 'প্রিন্ট', en: 'Print' },
  save: { bn: 'সংরক্ষণ', en: 'Save' },
  cancel: { bn: 'বাতিল', en: 'Cancel' },
  delete: { bn: 'মুছুন', en: 'Delete' },
  edit: { bn: 'সম্পাদনা', en: 'Edit' },
  view: { bn: 'দেখুন', en: 'View' },
  active: { bn: 'সক্রিয়', en: 'Active' },
  inactive: { bn: 'নিষ্ক্রিয়', en: 'Inactive' },
  donation: { bn: 'দান', en: 'Donation' },
  feePayment: { bn: 'ফি পরিশোধ', en: 'Fee Payment' },
  madrasaName: { bn: 'মাদরাসার নাম', en: 'Madrasa Name' },
  address: { bn: 'ঠিকানা', en: 'Address' },
  phone: { bn: 'ফোন', en: 'Phone' },
  email: { bn: 'ইমেইল', en: 'Email' },
  orphan: { bn: 'এতিম', en: 'Orphan' },
  poor: { bn: 'গরীব', en: 'Poor' },
  resident: { bn: 'আবাসিক', en: 'Resident' },
  nonResident: { bn: 'অনাবাসিক', en: 'Non-Resident' },
  newStudent: { bn: 'নতুন ছাত্র', en: 'New Student' },
  oldStudent: { bn: 'পুরাতন ছাত্র', en: 'Old Student' },
  paid: { bn: 'পরিশোধিত', en: 'Paid' },
  unpaid: { bn: 'অপরিশোধিত', en: 'Unpaid' },
  monthly: { bn: 'মাসিক', en: 'Monthly' },
  examFee: { bn: 'পরীক্ষা ফি', en: 'Exam Fee' },
  admissionFee: { bn: 'ভর্তি ফি', en: 'Admission Fee' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('bn');

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
