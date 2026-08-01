import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiError } from '../api/client';
import { enrollInFreeCourse, getPaginatedPublicCourses, getPublicPlatformSummary } from '../api/publicCoursesApi';
import Button from '../components/Button';
import Loader from '../components/Loader';
import PublicFooter from '../components/public/PublicFooter';
import PublicNavbar from '../components/public/PublicNavbar';
import { useAuth } from '../context/AuthContext';
import { useAppLanguage } from '../context/AppLanguageContext';

const features = [
  { title: 'Structured Courses', text: 'Well organized modules designed by industry experts.', icon: 'book', tone: 'blue' },
  { title: 'Video Lessons', text: 'High quality video content with engaging explanations.', icon: 'play', tone: 'purple' },
  { title: 'Progress Tracking', text: 'Track your progress and achievements in real-time.', icon: 'chart', tone: 'cyan' },
  { title: 'Quizzes & Assessments', text: 'Test your knowledge with quizzes and assessments.', icon: 'check', tone: 'orange' },
  { title: 'Manual Course Activation', text: 'Get courses activated manually with dedicated support.', icon: 'key', tone: 'green' },
  { title: 'Admin Management', text: 'Powerful tools to manage courses, users and content.', icon: 'admin', tone: 'indigo' },
  { title: 'Purchase Request Review', text: 'Review and approve student purchase requests easily.', icon: 'doc', tone: 'pink' },
  { title: 'Student Progress Monitoring', text: 'Monitor student progress and performance efficiently.', icon: 'student', tone: 'teal' },
];

const benefits = [
  { title: 'Industry Focused', text: 'Courses designed for real world safety challenges.', icon: 'shield' },
  { title: 'Certified Courses', text: 'Get certified and advance your professional career.', icon: 'award' },
  { title: 'Flexible Courses', text: 'Train at your own pace, anytime, anywhere.', icon: 'bolt' },
  { title: 'Expert Support', text: '24/7 manual activation and dedicated support.', icon: 'chat' },
  { title: 'Global Community', text: 'Join thousands of safety professionals worldwide.', icon: 'globe' },
];

const floatingBadges = [
  { title: 'Safety Training', text: 'Industry Focused', icon: 'helmet', className: 'badge-safety' },
  { title: 'Video Lessons', text: 'Engaging Content', icon: 'play', className: 'badge-video' },
  { title: 'Certified Training Path', text: 'Get Certified', icon: 'cert', className: 'badge-cert' },
  { title: 'Manual Activation Support', text: '24/7 Assistance', icon: 'support', className: 'badge-activation' },
];

const courseTitle = (course) => String(course?.title || 'GATE Course').trim();
const courseArabicTitle = (course) => String(course?.arabic_title || course?.arabicTitle || '').trim();
const getLocalizedCourseTitle = (course, language) => {
  const englishTitle = courseTitle(course);
  const arabicTitle = courseArabicTitle(course);
  if (language === 'ar' && arabicTitle) return { main: arabicTitle, sub: englishTitle };
  return { main: englishTitle, sub: arabicTitle };
};
const FREE_COURSE_LIMIT = 2;
const FEATURED_COURSE_LIMIT = 4;

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

const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { language, direction, t } = useAppLanguage();
  const [freeCourses, setFreeCourses] = useState([]);
  const [paidCourses, setPaidCourses] = useState([]);
  const [freeMeta, setFreeMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [paidMeta, setPaidMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [freePage, setFreePage] = useState(1);
  const [paidPage, setPaidPage] = useState(1);
  const [platformSummary, setPlatformSummary] = useState({});
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState('');

  useEffect(() => {
    let active = true;

    const loadCourses = async () => {
      setLoadingCourses(true);
      setCourseError('');

      const [freeResult, paidResult] = await Promise.allSettled([
        getPaginatedPublicCourses({ page: freePage, limit: FREE_COURSE_LIMIT, pricingType: 'free' }),
        getPaginatedPublicCourses({ page: paidPage, limit: FEATURED_COURSE_LIMIT, pricingType: 'paid' }),
      ]);

      if (!active) return;

      if (freeResult.status === 'fulfilled') {
        setFreeCourses(Array.isArray(freeResult.value.data) ? freeResult.value.data : []);
        setFreeMeta(freeResult.value.meta || { page: freePage, totalPages: 0, total: 0 });
      } else {
        setFreeCourses([]);
      }

      if (paidResult.status === 'fulfilled') {
        setPaidCourses(Array.isArray(paidResult.value.data) ? paidResult.value.data : []);
        setPaidMeta(paidResult.value.meta || { page: paidPage, totalPages: 0, total: 0 });
      } else {
        setPaidCourses([]);
      }

      if (freeResult.status === 'rejected' && paidResult.status === 'rejected') {
        setCourseError(getApiError(freeResult.reason || paidResult.reason, 'Could not load the latest courses.'));
      } else if (freeResult.status === 'rejected' || paidResult.status === 'rejected') {
        setCourseError(getApiError(freeResult.reason || paidResult.reason, 'Could not load part of the course catalog.'));
      }

      setLoadingCourses(false);
    };

    loadCourses();
    return () => {
      active = false;
    };
  }, [freePage, paidPage]);

  useEffect(() => {
    let active = true;
    const loadSummary = async () => {
      try {
        const summary = await getPublicPlatformSummary();
        if (active) setPlatformSummary(summary || {});
      } catch {
        if (active) setPlatformSummary({});
      }
    };

    loadSummary();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const publishedCourses = Number(platformSummary.published_courses ?? platformSummary.total_courses ?? freeCourses.length + paidCourses.length);
    const totalStudents = Number(platformSummary.total_students ?? 0);
    const totalLessons = Number(platformSummary.total_lessons ?? 0);
    return [
      { label: t.home.stats.courses, value: `${publishedCourses}+`, note: 'Live catalog', icon: 'cap' },
      { label: t.home.stats.students, value: `${totalStudents}+`, note: 'Growing audience', icon: 'users' },
      { label: t.home.stats.lessons, value: `${totalLessons}+`, note: 'Expert video content', icon: 'play' },
      { label: t.home.stats.support, value: '24/7', note: 'Manual activation support', icon: 'support' },
    ];
  }, [freeCourses.length, paidCourses.length, platformSummary.published_courses, platformSummary.total_courses, platformSummary.total_lessons, platformSummary.total_students, t.home.stats.courses, t.home.stats.lessons, t.home.stats.students, t.home.stats.support]);

  const openFreeCourse = async (course) => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/player/${course.id}`)}`);
      return;
    }

    try {
      await enrollInFreeCourse(course.id);
      navigate(`/player/${course.id}`);
    } catch (error) {
      setCourseError(getApiError(error, 'Could not open the course.'));
    }
  };

  return (
    <main className="home-page safety-home" dir={direction}>
      <span className="safety-bg safety-bg-helmet" aria-hidden="true" />
      <span className="safety-bg safety-bg-vest" aria-hidden="true" />
      <span className="safety-bg safety-bg-crane" aria-hidden="true" />
      <span className="safety-bg safety-bg-cones" aria-hidden="true" />

      <PublicNavbar activePage="home" user={user} onLogout={logout} />

      <section className="home-hero">
        <img
          className="hero-safety-bg"
          src="/images/safety-industrial-bg.png"
          alt=""
          aria-hidden="true"
        />
        <div className="home-copy">
          <p className="home-eyebrow">{t.home.eyebrow}</p>
          <h1>
            {t.home.title[0]}
            <span>{t.home.title[1]}</span>
            <strong>{t.home.title[2]}</strong>
          </h1>
          <p>
            {t.home.description}
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg" to="/learning">
              {t.home.browseCourses}
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>
          <div className="home-rating-row" aria-label="Trusted by safety professionals and organizations">
            <div className="home-avatars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div>
              <p>{t.home.trustedBy}</p>
            </div>
          </div>
        </div>

        <div className="home-shield-stage" aria-label="GATE safety courses hologram">
          <span className="stage-hud hud-helmet" aria-hidden="true" />
          <span className="stage-hud hud-warning" aria-hidden="true" />
          <span className="stage-particle particle-1" aria-hidden="true" />
          <span className="stage-particle particle-2" aria-hidden="true" />
          <span className="stage-particle particle-3" aria-hidden="true" />
          <span className="stage-particle particle-4" aria-hidden="true" />
          <span className="stage-beam beam-1" aria-hidden="true" />
          <span className="stage-beam beam-2" aria-hidden="true" />
          <span className="orbit orbit-1" aria-hidden="true" />
          <span className="orbit orbit-2" aria-hidden="true" />
          <span className="orbit orbit-3" aria-hidden="true" />
          <div className="home-shield">
            <span className="shield-glass" aria-hidden="true" />
            <span className="shield-letter">G</span>
          </div>
          <div className="holo-platform" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {floatingBadges.map((badge) => (
            <article className={`floating-badge ${badge.className}`} key={badge.title}>
              <span className={`badge-icon icon-${badge.icon}`} aria-hidden="true" />
              <div>
                <h2>{badge.title}</h2>
                <p>{badge.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-stats" aria-label="GATE courses platform statistics">
        {stats.map((stat) => (
          <article className="home-stat-card" key={stat.label}>
            {stat.icon === 'cap' ? (
              <span className="home-gate-mark home-stat-gate-mark" aria-hidden="true">G</span>
            ) : (
              <span className={`home-card-icon icon-${stat.icon}`} aria-hidden="true" />
            )}
            <div>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
              <span>{stat.note}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="home-section home-features-section" id="features">
        <div className="home-section-head">
          <p>{t.home.featuresEyebrow}</p>
          <h2>{t.home.featuresTitle}</h2>
        </div>
        <div className="home-features" aria-label="GATE platform features">
          {features.map((feature) => (
            <article className="home-feature-card" key={feature.title}>
              <span className={`home-card-icon icon-${feature.icon} icon-${feature.tone}`} aria-hidden="true" />
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
              <span className="card-arrow" aria-hidden="true">-&gt;</span>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-courses-section" id="courses">
              <div className="home-section-head with-action">
            <div>
              <p>{t.home.coursesEyebrow}</p>
              <h2>{t.home.coursesTitle}</h2>
            </div>
            <Link className="btn btn-ghost" to="/learning">
              {t.home.viewAllCourses}
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>
        {courseError ? <div className="home-course-error">{courseError}</div> : null}
        {loadingCourses ? <Loader label="Loading courses..." /> : null}

        <div className="home-course-section-group">
          <div className="home-course-section-head">
            <div>
              <p>{t.common.free}</p>
              <h3>{t.home.freeSectionTitle}</h3>
            </div>
            {freeMeta.totalPages > 1 ? (
              <div className="home-section-pager" aria-label="Free course pagination">
                <Button variant="ghost" size="sm" disabled={freeMeta.page <= 1} onClick={() => setFreePage((current) => Math.max(1, current - 1))}>
                  {t.common.previous}
                </Button>
                <span>{`Page ${freeMeta.page} of ${freeMeta.totalPages}`}</span>
                <Button variant="ghost" size="sm" disabled={freeMeta.page >= freeMeta.totalPages} onClick={() => setFreePage((current) => current + 1)}>
                  {t.common.next}
                </Button>
              </div>
            ) : null}
          </div>
          <div className="home-course-grid" aria-busy={loadingCourses}>
            {freeCourses.map((course) => (
              <article className="home-course-card" key={`free-${course.id}`}>
                <div className="course-visual">
                  <img className="course-image-bg" src={course.image} alt="" aria-hidden="true" />
                  <img className="course-thumb" src={course.image} alt="" aria-hidden="true" />
                </div>
                <div className="course-body">
                  <span className="home-course-pill is-free">{t.common.free}</span>
                  {(() => {
                    const localized = getLocalizedCourseTitle(course, language);
                    return (
                      <>
                        <h3>{localized.main}</h3>
                        {localized.sub ? <p className="home-course-subtitle" dir={language === 'ar' ? 'ltr' : 'rtl'}>{localized.sub}</p> : null}
                      </>
                    );
                  })()}
                  <p className="home-course-description">{course.description}</p>
                  <div className="course-instructor">
                    <span className="instructor-avatar home-gate-mark course-logo-mark" aria-hidden="true">G</span>
                    <div>
                      <strong>{course.instructor}</strong>
                      <span>{course.instructorSubtitle}</span>
                    </div>
                  </div>
                  <div className="course-foot">
                    {renderCoursePrice(course, t)}
                    <Button className="btn btn-secondary" onClick={() => openFreeCourse(course)}>
                      {course.ctaLabel || t.common.startFree}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="home-course-section-group">
          <div className="home-course-section-head">
            <div>
              <p>{t.home.paidSectionTitle}</p>
              <h3>{t.home.paidSectionTitle}</h3>
            </div>
            {paidMeta.totalPages > 1 ? (
              <div className="home-section-pager" aria-label="Paid course pagination">
                <Button variant="ghost" size="sm" disabled={paidMeta.page <= 1} onClick={() => setPaidPage((current) => Math.max(1, current - 1))}>
                  {t.common.previous}
                </Button>
                <span>{`Page ${paidMeta.page} of ${paidMeta.totalPages}`}</span>
                <Button variant="ghost" size="sm" disabled={paidMeta.page >= paidMeta.totalPages} onClick={() => setPaidPage((current) => current + 1)}>
                  {t.common.next}
                </Button>
              </div>
            ) : null}
          </div>
          <div className="home-course-grid" aria-busy={loadingCourses}>
            {paidCourses.map((course) => (
              <article className="home-course-card" key={`paid-${course.id}`}>
                <div className="course-visual">
                  <img className="course-image-bg" src={course.image} alt="" aria-hidden="true" />
                  <img className="course-thumb" src={course.image} alt="" aria-hidden="true" />
                </div>
                <div className="course-body">
                  {course.hasDiscount ? <span className="home-course-pill is-discounted">{t.common.offer}</span> : null}
                  {(() => {
                    const localized = getLocalizedCourseTitle(course, language);
                    return (
                      <>
                        <h3>{localized.main}</h3>
                        {localized.sub ? <p className="home-course-subtitle" dir={language === 'ar' ? 'ltr' : 'rtl'}>{localized.sub}</p> : null}
                      </>
                    );
                  })()}
                  <p className="home-course-description">{course.description}</p>
                  <div className="course-instructor">
                    <span className="instructor-avatar home-gate-mark course-logo-mark" aria-hidden="true">G</span>
                    <div>
                      <strong>{course.instructor}</strong>
                      <span>{course.instructorSubtitle}</span>
                    </div>
                  </div>
                  <div className="course-foot">
                    {renderCoursePrice(course, t)}
                    <Link className="btn btn-primary" to={course.ctaPath || course.paymentPath}>
                      {course.ctaLabel || t.common.buyCourse}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section why-gate" id="why-gate">
        <div className="home-section-head">
          <p>{t.home.whyEyebrow}</p>
          <h2>{t.home.whyTitle}</h2>
        </div>
        <div className="why-grid">
          {benefits.map((benefit) => (
            <article className="why-card" key={benefit.title}>
              <span className={`home-card-icon icon-${benefit.icon}`} aria-hidden="true" />
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
};

export default Home;
