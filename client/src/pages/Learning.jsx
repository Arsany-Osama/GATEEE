import { memo, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiError } from '../api/client';
import { getPaginatedPublicCourses, getPublicCourseCategories } from '../api/publicCoursesApi';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import PublicFooter from '../components/public/PublicFooter';
import PublicNavbar from '../components/public/PublicNavbar';
import PublicPageShell from '../components/public/PublicPageShell';
import PageBackLink from '../components/PageBackLink';
import { useAuth } from '../context/AuthContext';

const fallbackImage = '/images/cover of course.png';
const PAGE_SIZE = 9;

const renderCoursePrice = (course) => {
  if (course?.isFree) {
    return (
      <strong className="course-price course-price-free" dir="ltr">
        <span>Free</span>
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

const LearningCourseCard = memo(({ course }) => (
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
        <h2>{course.title}</h2>
        {course.arabicTitle ? <p className="learning-course-subtitle" dir="rtl">{course.arabicTitle}</p> : null}
      </div>

      <p className="learning-course-description">{course.description}</p>

      <div className="learning-course-meta">
        <div>
          <span>Instructor</span>
          <strong>{course.instructor}</strong>
          <small>{course.instructorSubtitle}</small>
        </div>
        <div>
          <span>Price</span>
          {renderCoursePrice(course)}
        </div>
      </div>

      <div className="learning-course-footer">
        <Link className="btn btn-primary" to={course.ctaPath || course.paymentPath || `/payment/course/${course.backendId}`}>
          {course.ctaLabel || (course.isFree ? 'Start Free' : 'Buy Course')}
        </Link>
      </div>
    </div>
  </article>
));

const Learning = () => {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false });
  const [search, setSearch] = useState('');
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
          search,
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
  }, [page, search, selectedCategory]);

  const hasCategories = categories.length > 0;
  const categorySummary = useMemo(() => {
    if (!categories.length) return 'All courses are available in one clean catalog.';
    return `${categories.length} categories available.`;
  }, [categories.length]);

  const updateSearch = (value) => {
    setPage(1);
    setSearch(value);
  };

  const updateCategory = (value) => {
    setPage(1);
    setSelectedCategory(value);
  };

  return (
    <PublicPageShell className="learning-page">
      <PublicNavbar className="learning-nav" activePage="learning" sectionBase="/" user={user} onLogout={logout} showDashboardNav />

      <div className="page-toolbar">
        <PageBackLink to="/">Back to Home</PageBackLink>
      </div>

      <section className="learning-hero learning-hero-compact">
        <div className="learning-hero-copy">
          <p className="home-eyebrow">Public Course Catalog</p>
          <h1>Explore GATE Courses</h1>
          <p>
            Search the full catalog, browse by category when available, and jump straight into the right course flow
            with a smoother, cleaner layout.
          </p>

          <div className="learning-search-bar" role="search" aria-label="Search courses">
            <input
              type="search"
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search course title, instructor, or description"
            />
            {search ? (
              <Button variant="ghost" size="sm" onClick={() => updateSearch('')}>
                Clear
              </Button>
            ) : null}
          </div>

          <div className="learning-hero-note">
            <span>{meta.total} courses</span>
            <span>{categorySummary}</span>
          </div>
        </div>

        <div className="learning-hero-visual" aria-label="GATE course preview">
          <span className="learning-orbit orbit-a" aria-hidden="true" />
          <span className="learning-orbit orbit-b" aria-hidden="true" />
          <div className="learning-mini-shield" aria-hidden="true">G</div>
          <div className="learning-preview-stack">
            <article>
              <span>Search</span>
              <strong>Fast</strong>
            </article>
            <article>
              <span>Categories</span>
              <strong>{hasCategories ? categories.length : 'None'}</strong>
            </article>
            <article>
              <span>Pagination</span>
              <strong>{meta.totalPages || 1} pages</strong>
            </article>
          </div>
        </div>
      </section>

      {hasCategories ? (
        <section className="learning-filter-panel learning-category-panel" aria-label="Course categories">
          <span className="learning-filter-label">Categories</span>
          <div className="learning-category-chips">
            <button
              type="button"
              className={selectedCategory === '' ? 'is-active' : ''}
              onClick={() => updateCategory('')}
            >
              All Courses
            </button>
            {categories.map((category) => (
              <button
                type="button"
                className={String(category.id) === String(selectedCategory) ? 'is-active' : ''}
                key={category.id}
                onClick={() => updateCategory(category.id)}
              >
                {category.arabic_name || category.name}
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
          title="No courses found"
          message="Try a different search or category."
          action={<Button variant="ghost" onClick={() => { updateSearch(''); updateCategory(''); }}>Reset filters</Button>}
        />
      ) : null}

      {courses.length > 0 ? (
        <section className="learning-catalog-grid" aria-label="GATE public course catalog">
          {courses.map((course) => (
            <LearningCourseCard
              course={course}
              key={`${course.source || 'course'}-${course.id}`}
            />
          ))}
        </section>
      ) : null}

      {meta.totalPages > 1 ? (
        <section className="learning-pagination" aria-label="Course pagination">
          <Button variant="ghost" disabled={!meta.hasPrevPage} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </Button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button variant="ghost" disabled={!meta.hasNextPage} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </section>
      ) : null}

      <section className="learning-manual-notice">
        <strong>Manual activation after review</strong>
        <p>
          Paid access is still reviewed manually after payment, while free courses stay open in the catalog.
        </p>
      </section>

      <PublicFooter className="learning-footer" sectionBase="/" />
    </PublicPageShell>
  );
};

export default Learning;
