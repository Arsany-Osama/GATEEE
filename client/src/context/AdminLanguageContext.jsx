/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AdminLanguageContext = createContext(null);

const dictionaries = {
  en: {
    languageName: 'English',
    short: 'EN',
    dir: 'ltr',
    brandTitle: 'GATE Admin',
    brandSubtitle: 'Premium Dashboard',
    searchPlaceholder: 'Search courses...',
    help: 'Help',
    notifications: 'Notifications',
    settings: 'Settings',
    site: 'Site',
    logout: 'Logout',
    role: 'Administrator',
    addCourse: 'Add New Course',
    unavailable: 'No API support in this build',
    nav: {
      dashboard: 'Dashboard',
      courses: 'Courses',
      categories: 'Categories',
      students: 'Students',
      instructors: 'Instructors',
      lectures: 'Lectures',
      exams: 'Exams',
      payments: 'Subscriptions / Payment Requests',
      coupons: 'Coupons',
      notifications: 'Messages / Notifications',
      reports: 'Reports',
      security: 'Security',
      settings: 'Settings',
    },
  },
  ar: {
    languageName: 'العربية',
    short: 'AR',
    dir: 'rtl',
    brandTitle: 'لوحة GATE',
    brandSubtitle: 'لوحة تحكم احترافية',
    searchPlaceholder: 'ابحث في الكورسات...',
    help: 'المساعدة',
    notifications: 'الإشعارات',
    settings: 'الإعدادات',
    site: 'الموقع',
    logout: 'تسجيل الخروج',
    role: 'مدير النظام',
    addCourse: 'إضافة كورس جديد',
    unavailable: 'لا يوجد دعم API في النسخة الحالية',
    nav: {
      dashboard: 'الرئيسية',
      courses: 'الكورسات',
      categories: 'الأقسام',
      students: 'الطلاب',
      instructors: 'المدرسين',
      lectures: 'المحاضرات',
      exams: 'الاختبارات',
      payments: 'الاشتراكات / طلبات الدفع',
      coupons: 'الكوبونات',
      notifications: 'الرسائل / الإشعارات',
      reports: 'التقارير',
      security: 'الأمان',
      settings: 'الإعدادات',
    },
  },
};

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'ar';
  const saved = window.localStorage.getItem('gate-admin-language');
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
};

export const AdminLanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(getInitialLanguage);
  const dictionary = dictionaries[language] || dictionaries.ar;
  const direction = dictionary.dir;

  useEffect(() => {
    window.localStorage.setItem('gate-admin-language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [direction, language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    direction,
    isRtl: direction === 'rtl',
    t: dictionary,
  }), [dictionary, direction, language]);

  return (
    <AdminLanguageContext.Provider value={value}>
      {children}
    </AdminLanguageContext.Provider>
  );
};

export const useAdminLanguage = () => {
  const context = useContext(AdminLanguageContext);
  if (!context) {
    throw new Error('useAdminLanguage must be used inside AdminLanguageProvider');
  }
  return context;
};
