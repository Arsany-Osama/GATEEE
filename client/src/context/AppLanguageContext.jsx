/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AppLanguageContext = createContext(null);

const dictionaries = {
  en: {
    short: 'EN',
    name: 'English',
    dir: 'ltr',
    nav: {
      home: 'Home',
      courses: 'Courses',
      features: 'Features',
      whyGate: 'Why GATE',
      dashboard: 'Dashboard',
      profile: 'Profile',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      admin: 'Admin',
    },
    footer: {
      quickLinks: 'Quick Links',
      contact: 'Contact Us',
      help: 'Have questions? We are here to help!',
      description: 'Empowering professionals with world-class safety training, certified courses, and practical learning paths.',
    },
    common: {
      backToHome: 'Back to Home',
      loading: 'Loading...',
      search: 'Search',
      allCourses: 'All Courses',
      previous: 'Previous',
      next: 'Next',
      clear: 'Clear',
      resetFilters: 'Reset filters',
      noCoursesFound: 'No courses found',
      noCoursesMessage: 'Try a different search or category.',
      instructor: 'Instructor',
      price: 'Price',
      categories: 'Categories',
      free: 'Free',
      offer: 'Offer',
      courseCount: 'courses',
      startFree: 'Start Free',
      buyCourse: 'Buy Course',
    },
    home: {
      eyebrow: '#1 Safety Courses Platform',
      title: ['Master Professional', 'Safety Skills with', 'GATE'],
      description: 'Premium safety training, video lessons, and certified courses designed for professionals and organizations worldwide.',
      browseCourses: 'Browse Courses',
      trustedBy: 'Trusted by safety professionals and organizations',
      featuresTitle: 'Platform Features',
      featuresEyebrow: 'Powerful & Easy To Use',
      coursesEyebrow: 'Featured Courses',
      coursesTitle: 'Start Your Course Journey',
      viewAllCourses: 'View All Courses',
      freeSectionTitle: 'Start with open learning',
      paidSectionTitle: 'Premium courses and special offers',
      whyTitle: 'Your Success is Our Mission',
      whyEyebrow: 'Why Choose GATE',
      stats: {
        courses: 'Professional Courses',
        students: 'Active Students',
        lessons: 'Video Lessons',
        support: '24/7 Support',
      },
    },
    learning: {
      eyebrow: 'Public Course Catalog',
      title: 'Explore GATE Courses',
      description: 'Search the full catalog, browse by category when available, and jump straight into the right course flow with a smoother, cleaner layout.',
      searchPlaceholder: 'Search course title, instructor, or description',
      categoriesTitle: 'Course categories',
      categoriesLabel: 'Categories',
      noCategories: 'All courses are available in one clean catalog.',
      totalCourses: 'courses',
      manualActivationTitle: 'Manual activation after review',
      manualActivationText: 'Paid access is still reviewed manually after payment, while free courses stay open in the catalog.',
    },
    auth: {
      login: 'Login',
      register: 'Register',
    },
  },
  ar: {
    short: 'AR',
    name: 'العربية',
    dir: 'rtl',
    nav: {
      home: 'الرئيسية',
      courses: 'الكورسات',
      features: 'المميزات',
      whyGate: 'لماذا GATE',
      dashboard: 'لوحتي',
      profile: 'الملف الشخصي',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      logout: 'تسجيل الخروج',
      admin: 'الإدارة',
    },
    footer: {
      quickLinks: 'روابط سريعة',
      contact: 'تواصل معنا',
      help: 'هل لديك أسئلة؟ نحن هنا للمساعدة!',
      description: 'نمنح المحترفين تدريبًا عمليًا معتمدًا ودورات احترافية ومسارات تعلم واضحة.',
    },
    common: {
      backToHome: 'العودة للرئيسية',
      loading: 'جارٍ التحميل...',
      search: 'بحث',
      allCourses: 'كل الكورسات',
      previous: 'السابق',
      next: 'التالي',
      clear: 'مسح',
      resetFilters: 'إعادة التصفية',
      noCoursesFound: 'لا توجد كورسات',
      noCoursesMessage: 'جرّب بحثًا آخر أو اختر قسمًا مختلفًا.',
      instructor: 'المدرب',
      price: 'السعر',
      categories: 'الأقسام',
      free: 'مجاني',
      offer: 'عرض',
      courseCount: 'دورات',
      startFree: 'ابدأ مجانًا',
      buyCourse: 'اشترِ الكورس',
    },
    home: {
      eyebrow: 'منصة الدورات الأمنية الأولى',
      title: ['أتقن مهارات', 'الأمان المهنية مع', 'GATE'],
      description: 'تدريب احترافي ومحتوى فيديو ودورات معتمدة للمحترفين والمؤسسات في كل مكان.',
      browseCourses: 'تصفح الكورسات',
      trustedBy: 'موثوق به من قبل المتخصصين والمؤسسات',
      featuresTitle: 'مميزات المنصة',
      featuresEyebrow: 'قوية وسهلة الاستخدام',
      coursesEyebrow: 'الكورسات المميزة',
      coursesTitle: 'ابدأ رحلة تعلمك',
      viewAllCourses: 'عرض كل الكورسات',
      freeSectionTitle: 'ابدأ بالتعلم المجاني',
      paidSectionTitle: 'الكورسات المدفوعة والعروض الخاصة',
      whyTitle: 'نجاحك هو مهمتنا',
      whyEyebrow: 'لماذا تختار GATE',
      stats: {
        courses: 'دورات احترافية',
        students: 'طلاب نشطون',
        lessons: 'دروس فيديو',
        support: 'دعم 24/7',
      },
    },
    learning: {
      eyebrow: 'كتالوج الكورسات',
      title: 'استكشف كورسات GATE',
      description: 'ابحث في الكتالوج كاملًا، وتصفّح حسب الأقسام عند توفرها، وابدأ بخطوة سلسة وواجهة أنظف.',
      searchPlaceholder: 'ابحث بعنوان الكورس أو المدرب أو الوصف',
      categoriesTitle: 'أقسام الكورسات',
      categoriesLabel: 'الأقسام',
      noCategories: 'جميع الكورسات معروضة في كتالوج واحد مرتب.',
      totalCourses: 'كورس',
      manualActivationTitle: 'تفعيل يدوي بعد المراجعة',
      manualActivationText: 'الوصول المدفوع يظل تحت المراجعة بعد الدفع، بينما الكورسات المجانية مفتوحة مباشرة في الكتالوج.',
    },
    auth: {
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
    },
  },
};

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'ar';
  const saved = window.localStorage.getItem('gate-language') || window.localStorage.getItem('gate-admin-language');
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
};

export const AppLanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(getInitialLanguage);
  const dictionary = dictionaries[language] || dictionaries.ar;
  const direction = dictionary.dir;

  useEffect(() => {
    window.localStorage.setItem('gate-language', language);
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
    <AppLanguageContext.Provider value={value}>
      {children}
    </AppLanguageContext.Provider>
  );
};

export const useAppLanguage = () => {
  const context = useContext(AppLanguageContext);
  if (!context) {
    throw new Error('useAppLanguage must be used inside AppLanguageProvider');
  }
  return context;
};
