import { memo, startTransition, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiError } from '../api/client';
import { getMergedPublicCourses, normalizeStaticCourse } from '../api/publicCoursesApi';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import PublicFooter from '../components/public/PublicFooter';
import PublicNavbar from '../components/public/PublicNavbar';
import PublicPageShell from '../components/public/PublicPageShell';
import PageBackLink from '../components/PageBackLink';
import { useAuth } from '../context/AuthContext';
import { publicCourses } from '../data/publicCourses';

const categories = ['All Courses', 'Safety', 'HSE', 'Fire Safety', 'First Aid', 'Professional Training'];
const INITIAL_VISIBLE_COURSES = 6;
const PRIORITY_COURSE_IMAGES = INITIAL_VISIBLE_COURSES;

const fallbackImage = '/images/cover of course.png';

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
      <span>{course?.displayPrice || course?.price || '2000'}</span>
    </strong>
  );
};

const PublicCourseCard = memo(({ course, priority = false, deferred = false }) => (
  <article className={`preview-course-card${deferred ? ' is-deferred' : ''}`}>
    <div className="preview-image-wrap">
      <img
        className="preview-image-main"
        src={course.image}
        alt={`${course.title} cover`}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'low'}
        width="960"
        height="540"
        onError={(event) => { event.currentTarget.src = fallbackImage; }}
      />
    </div>
      <div className="preview-course-body">
        <h2>{course.title}</h2>
        {course.arabicTitle ? <p className="preview-course-subtitle" dir="rtl">{course.arabicTitle}</p> : null}
        <p>{course.description}</p>
        <div className="preview-instructor">
        <span className="preview-avatar" aria-hidden="true">G</span>
        <div>
          <strong>{course.instructor}</strong>
          <span>{course.instructorSubtitle}</span>
        </div>
      </div>
      <div className="preview-course-footer">
        <div>
          <span>Course price</span>
          {renderCoursePrice(course)}
        </div>
        <Link className="btn btn-primary" to={course.ctaPath || course.paymentPath}>{course.ctaLabel || 'Buy Course'}</Link>
      </div>
    </div>
  </article>
));

const Learning = () => {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState(() => publicCourses.map(normalizeStaticCourse));
  const [visibleCourseCount, setVisibleCourseCount] = useState(INITIAL_VISIBLE_COURSES);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState('');
  const firstCourseImage = courses[0]?.image;

  useEffect(() => {
    let active = true;
    const loadCourses = async () => {
      setLoadingCourses(true);
      setCourseError('');
      try {
        const next = await getMergedPublicCourses();
        if (active) {
          startTransition(() => {
            setCourses(next);
            setVisibleCourseCount(INITIAL_VISIBLE_COURSES);
          });
        }
      } catch (err) {
        if (active) {
          startTransition(() => {
            setCourses(publicCourses.map(normalizeStaticCourse));
            setVisibleCourseCount(INITIAL_VISIBLE_COURSES);
          });
          setCourseError(getApiError(err, 'Could not load backend courses. Showing the default public courses.'));
        }
      } finally {
        if (active) setLoadingCourses(false);
      }
    };
    loadCourses();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (courses.length <= INITIAL_VISIBLE_COURSES || visibleCourseCount >= courses.length) return undefined;
    const revealAll = () => {
      startTransition(() => setVisibleCourseCount(courses.length));
    };
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(revealAll, { timeout: 1200 })
      : window.setTimeout(revealAll, 250);

    return () => {
      if (window.cancelIdleCallback && typeof idleId === 'number') window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, [courses.length, visibleCourseCount]);

  const visibleCourses = useMemo(() => courses.slice(0, visibleCourseCount), [courses, visibleCourseCount]);

  return (
    <PublicPageShell className="learning-page">
      {firstCourseImage ? <link rel="preload" as="image" href={firstCourseImage} fetchPriority="high" /> : null}
      <PublicNavbar className="learning-nav" activePage="learning" sectionBase="/" user={user} onLogout={logout} showDashboardNav />

      <div className="page-toolbar">
        <PageBackLink to="/">Back to Home</PageBackLink>
      </div>

      <section className="learning-hero">
        <div className="learning-hero-copy">
          <p className="home-eyebrow">Public Course Catalog</p>
          <h1>Explore GATE Courses</h1>
          <p>
            Browse safety and industrial training programs built with video lessons, progress tracking, quizzes,
            and manual activation after payment review.
          </p>
          <div className="learning-pill-row" aria-label="Course catalog highlights">
            <span>Safety Training</span>
            <span>Video Lessons</span>
            <span>Manual Activation</span>
          </div>
        </div>

        <div className="learning-hero-visual" aria-label="GATE course preview">
          <span className="learning-orbit orbit-a" aria-hidden="true" />
          <span className="learning-orbit orbit-b" aria-hidden="true" />
          <div className="learning-mini-shield" aria-hidden="true">G</div>
          <div className="learning-preview-stack">
            <article>
              <span>Video Lessons</span>
              <strong>32+</strong>
            </article>
            <article>
              <span>Manual Activation</span>
              <strong>Admin Review</strong>
            </article>
            <article>
              <span>Progress Tracking</span>
              <strong>Dashboard Ready</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="learning-filter-panel" aria-label="Course category highlights">
        <span className="learning-filter-label">Category highlights</span>
        <div>
          {categories.map((category, index) => (
            <span className={index === 0 ? 'is-active' : ''} key={category}>
              {category}
            </span>
          ))}
        </div>
      </section>

      <ErrorMessage message={courseError} />
      {loadingCourses ? <Loader label="Loading backend courses..." /> : null}

      <section className="preview-course-grid learning-course-grid" aria-label="GATE public course previews">
        {visibleCourses.map((course, index) => (
          <PublicCourseCard
            course={course}
            deferred={index >= INITIAL_VISIBLE_COURSES}
            key={`${course.source || 'course'}-${course.id}`}
            priority={index < PRIORITY_COURSE_IMAGES}
          />
        ))}
      </section>

      <section className="learning-manual-notice">
        <strong>Manual activation after review</strong>
        <p>
          Course access is activated after your payment screenshot is reviewed by the instructor/admin. Once approved,
          the course will appear inside your Dashboard for the correct account.
        </p>
      </section>

      <PublicFooter className="learning-footer" sectionBase="/" />
    </PublicPageShell>
  );
};

export default Learning;
