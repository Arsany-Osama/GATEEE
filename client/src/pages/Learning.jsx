import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiError } from '../api/client';
import { enrollInFreeCourse, getPaginatedPublicCourses, getPublicCourseCategories } from '../api/publicCoursesApi';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import PublicFooter from '../components/public/PublicFooter';
import PublicNavbar from '../components/public/PublicNavbar';
import PublicPageShell from '../components/public/PublicPageShell';
import PageBackLink from '../components/PageBackLink';
import { useAuth } from '../context/AuthContext';
import { useAppLanguage } from '../context/AppLanguageContext';

const fallbackImage = '/images/cover of course.png';
const homeLogo = '/images/home-logo.png';
const PAGE_SIZE = 9;

const renderCoursePrice = (course, t) => {
  if (course?.isFree) {
    return (
      <strong className="course-price course-price-free" dir="ltr">
        <span>{t.common.free}</span>
      </strong>
    );
  }

  if (course?.hasDiscount) {
    return (
      <div className="course-price course-price-discounted" dir="ltr">
        <del>{course.originalPrice}</del>
        <strong><span>{course.displayPrice}</span></strong>
      </div>
    );
  }

  return (
    <strong className="course-price" dir="ltr">
      <span>{course?.displayPrice || course?.price || 'Contact us'}</span>
    </strong>
  );
};

const getLocalizedCourseTitle = (course, language) => {
  const englishTitle = String(course?.title || 'GATE Course').trim();
  const arabicTitle = String(course?.arabic_title || course?.arabicTitle || '').trim();
  if (language === 'ar' && arabicTitle) return { main: arabicTitle, sub: englishTitle };
  return { main: englishTitle, sub: arabicTitle };
};

const LearningCourseCard = memo(({ course, onAction, t, language }) => (
  <article className="learning-course-card">
    <div className="learning-course-media">
      <img
        className="learning-course-image"
        src={course.image}
        alt={`${course.title} cover`}
        loading="lazy"
        decoding="async"
        onError={(event) => { event.currentTarget.src = fallbackImage; }}
      />
      <div className="learning-course-overlay">
        <span className="learning-course-category">
          {course.categoryName || 'All Courses'}
        </span>
        {course.isFree ? <span className="learning-course-badge is-free">Free</span> : null}
        {course.hasDiscount ? <span className="learning-course-badge is-discount">Offer</span> : null}
      </div>
    </div>

    <div className="learning-course-body">
      <div>
        {(() => {
          const localized = getLocalizedCourseTitle(course, language);
          return (
            <>
              <h2>{localized.main}</h2>
              {localized.sub ? <p className="learning-course-subtitle" dir={language === 'ar' ? 'ltr' : 'rtl'}>{localized.sub}</p> : null}
            </>
          );
        })()}
      </div>

      <p className="learning-course-description">{course.description}</p>

      <div className="learning-course-meta">
        <div>
          <span>{t.common.instructor}</span>
          <strong>{course.instructor}</strong>
          <small>{course.instructorSubtitle}</small>
        </div>
        <div>
          <span>{t.common.price}</span>
          {renderCoursePrice(course, t)}
        </div>
      </div>

      <div className="learning-course-footer">
        <Button className="btn btn-primary" onClick={() => onAction(course)}>
          {course.ctaLabel || (course.isFree ? t.common.startFree : t.common.buyCourse)}
        </Button>
      </div>
    </div>
  </article>
));

const Learning = () => {
  const { user, logout } = useAuth();
  const { language, direction, t } = useAppLanguage();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false });
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const next = await getPublicCourseCategories();
        if (active) setCategories(Array.isArray(next) ? next : []);
      } catch {
        if (active) setCategories([]);
      } finally {
        if (active) setLoadingCategories(false);
      }
    };
    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadCourses = async () => {
      setLoadingCourses(true);
      setError('');
      try {
        const result = await getPaginatedPublicCourses({
          page,
          limit: PAGE_SIZE,
          search: deferredSearch,
          categoryId: selectedCategory,
        });

        if (!active) return;

        setCourses(Array.isArray(result.data) ? result.data : []);
        setMeta(result.meta || { page, limit: PAGE_SIZE, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false });

        if (result.meta?.totalPages && page > result.meta.totalPages) {
          setPage(result.meta.totalPages);
        }
      } catch (err) {
        if (active) {
          setCourses([]);
          setMeta({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false });
          setError(getApiError(err, 'Could not load the course catalog.'));
        }
      } finally {
        if (active) setLoadingCourses(false);
      }
    };

    loadCourses();
    return () => {
      active = false;
    };
  }, [deferredSearch, page, selectedCategory]);

  const hasCategories = categories.length > 0;
  const categorySummary = useMemo(() => {
    if (!categories.length) return t.learning.noCategories;
    return `${categories.length} ${t.common.categories}`;
  }, [categories.length, t.common.categories, t.learning.noCategories]);

  const updateSearch = (value) => {
    setPage(1);
    setSearch(value);
  };

  const updateCategory = (value) => {
    setPage(1);
    setSelectedCategory(value);
  };

  const openCourse = async (course) => {
    if (course.isFree) {
      if (!user) {
        navigate(`/login?next=${encodeURIComponent(`/player/${course.id}`)}`);
        return;
      }

      try {
        await enrollInFreeCourse(course.id);
        navigate(`/player/${course.id}`);
        return;
      } catch (error) {
        setError(getApiError(error, 'Could not open the course.'));
      }
    }

    navigate(course.ctaPath || course.paymentPath || `/payment/course/${course.backendId}`);
  };

  return (
    <PublicPageShell className="learning-page" dir={direction}>
      <PublicNavbar className="learning-nav" activePage="learning" sectionBase="/" user={user} onLogout={logout} showDashboardNav />

      <div className="page-toolbar">
        <PageBackLink to="/">{t.common.backToHome}</PageBackLink>
      </div>

      <section className="learning-hero learning-hero-compact">
        <div className="learning-hero-copy">
          <p className="home-eyebrow">{t.learning.eyebrow}</p>
          <h1>{t.learning.title}</h1>
          <p>
            {t.learning.description}
          </p>

          <div className="learning-search-bar" role="search" aria-label="Search courses">
            <input
              type="search"
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder={t.learning.searchPlaceholder}
            />
            {search ? (
              <Button variant="ghost" size="sm" onClick={() => updateSearch('')}>
                {t.common.clear}
              </Button>
            ) : null}
          </div>

          <div className="learning-hero-note">
            <span>{`${meta.total} ${t.common.courseCount}`}</span>
            <span>{categorySummary}</span>
          </div>
        </div>

        <div className="learning-hero-visual" aria-label="GATE course preview">
          <span className="learning-orbit orbit-a" aria-hidden="true" />
          <span className="learning-orbit orbit-b" aria-hidden="true" />
          <div className="learning-mini-shield" aria-hidden="true">
            <img className="learning-mini-logo" src={homeLogo} alt="" aria-hidden="true" />
          </div>
          <div className="learning-preview-stack">
            <article>
              <span>{t.common.search}</span>
              <strong>Fast</strong>
            </article>
            <article>
              <span>{t.common.categories}</span>
              <strong>{hasCategories ? categories.length : 'None'}</strong>
            </article>
            <article>
              <span>{t.common.next}</span>
              <strong>{meta.totalPages || 1} pages</strong>
            </article>
          </div>
        </div>
      </section>

      {hasCategories ? (
        <section className="learning-filter-panel learning-category-panel" aria-label={t.learning.categoriesTitle}>
          <span className="learning-filter-label">{t.common.categories}</span>
          <div className="learning-category-chips">
            <button
              type="button"
              className={selectedCategory === '' ? 'is-active' : ''}
              onClick={() => updateCategory('')}
            >
              {t.common.allCourses}
            </button>
            {categories.map((category) => (
              <button
                type="button"
                className={String(category.id) === String(selectedCategory) ? 'is-active' : ''}
                key={category.id}
                onClick={() => updateCategory(category.id)}
              >
                {language === 'ar' ? (category.arabic_name || category.name) : (category.name || category.arabic_name)}
                <span>{category.course_count || 0}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <ErrorMessage message={error} />
      {loadingCategories || loadingCourses ? <Loader label="Loading courses..." /> : null}

      {!loadingCourses && courses.length === 0 ? (
        <EmptyState
          title={t.common.noCoursesFound}
          message={t.common.noCoursesMessage}
          action={<Button variant="ghost" onClick={() => { updateSearch(''); updateCategory(''); }}>{t.common.resetFilters}</Button>}
        />
      ) : null}

      {courses.length > 0 ? (
        <section className="learning-catalog-grid" aria-label="GATE public course catalog">
          {courses.map((course) => (
            <LearningCourseCard
              course={course}
              onAction={openCourse}
              language={language}
              t={t}
              key={`${course.source || 'course'}-${course.id}`}
            />
          ))}
        </section>
      ) : null}

      {meta.totalPages > 1 ? (
        <section className="learning-pagination" aria-label="Course pagination">
          <Button variant="ghost" disabled={!meta.hasPrevPage} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            {t.common.previous}
          </Button>
          <span>
            {`Page ${meta.page} of ${meta.totalPages}`}
          </span>
          <Button variant="ghost" disabled={!meta.hasNextPage} onClick={() => setPage((current) => current + 1)}>
            {t.common.next}
          </Button>
        </section>
      ) : null}

      <section className="learning-manual-notice">
        <strong>{t.learning.manualActivationTitle}</strong>
        <p>
          {t.learning.manualActivationText}
        </p>
      </section>

      <PublicFooter className="learning-footer" sectionBase="/" />
    </PublicPageShell>
  );
};

export default Learning;
