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

export const normalizeStaticCourse = (course) => ({
  ...course,
  source: 'static',
  image: course.thumbnail_url || course.image || FALLBACK_IMAGE,
  arabicTitle: course.arabic_title || course.arabicTitle || '',
  instructor: course.instructor_name || course.instructor || DEFAULT_INSTRUCTOR,
  instructorSubtitle: course.instructor_subtitle || course.instructorSubtitle || DEFAULT_INSTRUCTOR_SUBTITLE,
  price: formatPrice(course.price),
  paymentPath: course.paymentPath || `/payment/course/${course.id}`,
});

export const normalizeBackendCourse = (course) => {
  return {
    id: course.id,
    source: 'backend',
    title: course.title || `Course ${course.id}`,
    arabicTitle: course.arabic_title || '',
    description: course.description || 'No description provided.',
    image: course.thumbnail_url || course.image || FALLBACK_IMAGE,
    instructor: course.instructor_name || course.instructor || DEFAULT_INSTRUCTOR,
    instructorSubtitle: course.instructor_subtitle || course.instructorSubtitle || DEFAULT_INSTRUCTOR_SUBTITLE,
    price: formatPrice(course.price),
    paymentPath: `/payment/course/${course.id}`,
    backendId: course.id,
    displayOrder: course.display_order ?? 0,
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
