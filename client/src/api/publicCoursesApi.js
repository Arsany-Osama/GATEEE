import apiClient from './client';
import { publicCourses } from '../data/publicCourses';

const DEFAULT_INSTRUCTOR = 'Eng. Ahmed Gamal Elghawy';
const DEFAULT_INSTRUCTOR_SUBTITLE = '10+ Years Experience';
const DEFAULT_PRICE = '2000';
const FALLBACK_IMAGE = '/images/cover of course.png';
const PUBLIC_COURSES_CACHE_TTL_MS = 60_000;

let publicCoursesCache = null;
let publicCoursesCacheAt = 0;
let publicCoursesRequest = null;

const formatPrice = (price) => {
  const value = Number(price);
  if (!Number.isFinite(value)) return DEFAULT_PRICE;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const normalizePricingType = (pricingType) => {
  const value = String(pricingType || '').toLowerCase().trim();
  if (value === 'free' || value === 'discounted' || value === 'paid') return value;
  return 'paid';
};

const buildPricingDetails = (course) => {
  const pricingType = normalizePricingType(course.pricing_type);
  const originalPriceValue = Number(course.price);
  const discountPriceValue = course.discount_price === null || course.discount_price === undefined || course.discount_price === ''
    ? null
    : Number(course.discount_price);
  const originalPrice = Number.isFinite(originalPriceValue) ? originalPriceValue : 0;
  const discountPrice = Number.isFinite(discountPriceValue) ? discountPriceValue : null;
  const hasExplicitPricingType = Boolean(course.pricing_type);
  const isFree = pricingType === 'free' || (!hasExplicitPricingType && originalPrice <= 0);
  const hasDiscount = pricingType === 'discounted' && discountPrice !== null && discountPrice >= 0 && discountPrice < originalPrice;
  const displayPriceValue = isFree ? 0 : (hasDiscount ? discountPrice : originalPrice);

  return {
    pricingType,
    isFree,
    hasDiscount,
    originalPrice,
    discountPrice,
    displayPriceValue,
    originalPriceLabel: isFree ? 'Free' : formatPrice(originalPrice),
    discountPriceLabel: discountPrice === null ? '' : formatPrice(discountPrice),
    displayPriceLabel: isFree ? 'Free' : formatPrice(displayPriceValue),
  };
};

export const normalizeStaticCourse = (course) => ({
  ...course,
  source: 'static',
  image: course.thumbnail_url || course.image || FALLBACK_IMAGE,
  arabicTitle: course.arabic_title || course.arabicTitle || '',
  instructor: course.instructor_name || course.instructor || DEFAULT_INSTRUCTOR,
  instructorSubtitle: course.instructor_subtitle || course.instructorSubtitle || DEFAULT_INSTRUCTOR_SUBTITLE,
  ...(() => {
    const pricing = buildPricingDetails(course);
    return {
      ...pricing,
      price: pricing.displayPriceLabel,
    };
  })(),
  paymentPath: course.paymentPath || `/payment/course/${course.id}`,
  ctaLabel: course.ctaLabel || 'Buy Course',
  ctaPath: course.ctaPath || course.paymentPath || `/payment/course/${course.id}`,
});

export const normalizeBackendCourse = (course) => {
  const pricing = buildPricingDetails(course);
  return {
    id: course.id,
    source: 'backend',
    title: course.title || `Course ${course.id}`,
    arabicTitle: course.arabic_title || '',
    description: course.description || 'No description provided.',
    image: course.thumbnail_url || course.image || FALLBACK_IMAGE,
    instructor: course.instructor_name || course.instructor || DEFAULT_INSTRUCTOR,
    instructorSubtitle: course.instructor_subtitle || course.instructorSubtitle || DEFAULT_INSTRUCTOR_SUBTITLE,
    ...pricing,
    price: pricing.displayPriceLabel,
    paymentPath: pricing.isFree ? '/learning' : `/payment/course/${course.id}`,
    ctaLabel: pricing.isFree ? 'Start Free' : pricing.hasDiscount ? 'Buy Discounted' : 'Buy Course',
    ctaPath: pricing.isFree ? '/learning' : `/payment/course/${course.id}`,
    backendId: course.id,
    displayOrder: course.display_order ?? 0,
    pricingType: pricing.pricingType,
    isFree: pricing.isFree,
    hasDiscount: pricing.hasDiscount,
    originalPrice: pricing.originalPriceLabel,
    discountPrice: pricing.discountPriceLabel,
    displayPrice: pricing.displayPriceLabel,
  };
};

export const clearPublicCoursesCache = () => {
  publicCoursesCache = null;
  publicCoursesCacheAt = 0;
};

export const getPublicBackendCourses = async ({ forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && publicCoursesCache && (now - publicCoursesCacheAt) < PUBLIC_COURSES_CACHE_TTL_MS) {
    return publicCoursesCache;
  }

  if (publicCoursesRequest) {
    return publicCoursesRequest;
  }

  publicCoursesRequest = apiClient.get('/courses')
    .then((res) => (Array.isArray(res.data) ? res.data.map(normalizeBackendCourse) : []))
    .then((courses) => {
      publicCoursesCache = courses;
      publicCoursesCacheAt = Date.now();
      return courses;
    })
    .finally(() => {
      publicCoursesRequest = null;
    });

  return publicCoursesRequest;
};

export const getPaginatedPublicCourses = async ({
  page = 1,
  limit = 6,
  pricingType = 'all',
  search = '',
  categoryId = '',
} = {}) => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (pricingType && pricingType !== 'all') params.set('pricing_type', pricingType);
  if (search.trim()) params.set('q', search.trim());
  if (categoryId) params.set('category_id', String(categoryId));

  const res = await apiClient.get(`/courses?${params.toString()}`);
  const data = Array.isArray(res.data?.data) ? res.data.data.map(normalizeBackendCourse) : [];
  return {
    data,
    meta: {
      page: Number(res.data?.meta?.page || page),
      limit: Number(res.data?.meta?.limit || limit),
      total: Number(res.data?.meta?.total || data.length),
      totalPages: Number(res.data?.meta?.totalPages || 0),
      hasNextPage: Boolean(res.data?.meta?.hasNextPage),
      hasPrevPage: Boolean(res.data?.meta?.hasPrevPage),
    },
  };
};

export const getPublicCourseCategories = async () => {
  const res = await apiClient.get('/courses/categories');
  return Array.isArray(res.data) ? res.data : [];
};

export const getMergedPublicCourses = async () => {
  const staticCourses = publicCourses.map(normalizeStaticCourse);
  const backendCourses = await getPublicBackendCourses();
  return backendCourses.length ? backendCourses : staticCourses;
};

export const getPublicCourseByPaymentId = async (courseId) => {
  const staticCourse = publicCourses.find((course) => String(course.id) === String(courseId));
  try {
    const backendCourses = await getPublicBackendCourses();
    const backendCourse = backendCourses.find((course) => String(course.backendId) === String(courseId));
    if (backendCourse) return backendCourse;
  } catch {
    if (staticCourse) return normalizeStaticCourse(staticCourse);
    throw new Error('Backend courses are unavailable.');
  }

  return staticCourse ? normalizeStaticCourse(staticCourse) : null;
};
