import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiError } from '../api/client';
import { getCertificateDownloadUrl, getStudentDashboard, issueCertificateForCourse } from '../api/studentApi';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';

const fallbackImage = '/images/cover of course.png';

const clampPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
};

const CircularProgress = memo(({ value }) => {
  const percent = clampPercent(value);
  return (
    <div className="course-progress-ring" style={{ '--progress': `${percent}%` }} aria-label={`Course progress ${percent}%`}>
      <span>{percent}%</span>
    </div>
  );
});

const DashboardCourseCard = memo(({ course, certificateLoading = false, onIssueCertificate }) => (
  <article className="dashboard-course-card enrolled-course-card">
    <div className="dashboard-course-visual">
      <img
        src={course.thumbnail_url || fallbackImage}
        alt={`${course.title || 'Course'} cover`}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        onError={(event) => { event.currentTarget.src = fallbackImage; }}
      />
    </div>
    <div className="dashboard-course-content">
      <div className="course-card-head">
        <Badge tone={course.isCompleted ? 'green' : 'blue'}>{course.isCompleted ? 'Completed' : 'Enrolled'}</Badge>
        <span>{course.totalLessons} lessons</span>
      </div>
      <div>
        <h3>{course.title || 'Untitled course'}</h3>
        {course.arabic_title ? <p className="dashboard-course-subtitle" dir="rtl">{course.arabic_title}</p> : null}
      </div>
      <p>{course.description || 'No description provided yet.'}</p>
      <div className="dashboard-course-instructor">
        <span className="dashboard-instructor-avatar" aria-hidden="true">G</span>
        <div>
          <strong>{course.instructor_name || 'Eng. Ahmed Gamal Elghawy'}</strong>
          <span>{course.instructor_subtitle || '10+ Years Experience'}</span>
        </div>
      </div>
      <div className="dashboard-course-progress-row">
        <CircularProgress value={course.progressPercentage} />
        <div>
          <strong>{course.completedLessons} / {course.totalLessons}</strong>
          <span>Completed lessons</span>
        </div>
      </div>
      <div className="row-actions">
        <Link className="btn btn-primary" to={`/player/${course.id}`}>{course.isCompleted ? 'Review Course' : 'Continue Learning'}</Link>
        {course.certificate?.uuid ? (
          <a className="btn btn-secondary" href={getCertificateDownloadUrl(course.certificate.uuid)}>
            Download Certificate
          </a>
        ) : course.isCompleted ? (
          <button
            className="btn btn-secondary"
            disabled={certificateLoading}
            onClick={() => onIssueCertificate(course.id)}
            type="button"
          >
            {certificateLoading ? 'Generating...' : 'Generate Certificate'}
          </button>
        ) : null}
      </div>
    </div>
  </article>
));

const Dashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [certificateLoadingId, setCertificateLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [certificateError, setCertificateError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStudentDashboard();
      setCourses(Array.isArray(data) ? data : []);
      setCertificateError('');
    } catch (err) {
      setError(getApiError(err, 'Could not load your enrolled courses.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const issueCertificate = useCallback(async (courseId) => {
    setCertificateLoadingId(courseId);
    setCertificateError('');
    try {
      const data = await issueCertificateForCourse(courseId);
      const certificate = data?.certificate || data;
      if (!certificate?.uuid) {
        throw new Error('Certificate could not be generated for this course yet.');
      }
      setCourses((currentCourses) => currentCourses.map((course) => (
        Number(course.id) === Number(courseId)
          ? {
            ...course,
            certificate: {
              uuid: certificate.uuid,
              issued_at: certificate.issued_at,
              revoked_at: certificate.revoked_at,
              status: certificate.revoked_at ? 'Revoked' : 'Valid',
            },
          }
          : course
      )));
    } catch (err) {
      setCertificateError(getApiError(err, err?.message || 'Could not generate this certificate yet.'));
    } finally {
      setCertificateLoadingId(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getStudentDashboard();
        if (active) setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load your enrolled courses.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const courseSummaries = useMemo(() => (
    courses.map((course) => {
      const totalLessons = Number(course.total_lessons || 0);
      const completedLessons = Number(course.completed_lessons || 0);
      const progressPercentage = clampPercent(
        course.progress_percentage ?? (totalLessons ? (completedLessons / totalLessons) * 100 : 0)
      );

      return {
        ...course,
        id: course.id,
        totalLessons,
        completedLessons,
        progressPercentage,
        isCompleted: totalLessons > 0 && progressPercentage >= 100,
      };
    })
  ), [courses]);

  const deferredCourseSummaries = useDeferredValue(courseSummaries);

  const totals = useMemo(() => {
    const enrolled = courseSummaries.length;
    const totalLessons = courseSummaries.reduce((sum, course) => sum + course.totalLessons, 0);
    const completedLessons = courseSummaries.reduce((sum, course) => sum + course.completedLessons, 0);
    const overallProgress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const pendingItems = Math.max(totalLessons - completedLessons, 0);

    return { enrolled, totalLessons, completedLessons, overallProgress, pendingItems };
  }, [courseSummaries]);

  const continueCourse = useMemo(() => (
    deferredCourseSummaries.find((course) => course.progressPercentage < 100) || deferredCourseSummaries[0] || null
  ), [deferredCourseSummaries]);

  return (
    <main className="page dashboard-page student-dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <Badge>Courses dashboard</Badge>
          <h1>Welcome back, {user?.name || 'Student'}</h1>
          <p>Track your enrolled GATE courses, review real lesson progress, and continue learning with focus.</p>
        </div>
        <div className="dashboard-hero-actions">
          <Link className="btn btn-primary" to="/learning">Browse Courses</Link>
          <Link className="btn btn-ghost" to="/profile">View Profile</Link>
        </div>
      </section>

      {error ? (
        <section className="dashboard-state-card">
          <ErrorMessage message={error} />
          <button className="btn btn-secondary" type="button" onClick={loadDashboard}>Retry</button>
        </section>
      ) : null}
      <ErrorMessage message={certificateError} />

      {loading ? (
        <section className="dashboard-loading-grid" aria-label="Loading enrolled courses">
          <Loader label="Loading your enrolled courses..." />
          <div className="dashboard-skeleton-card" />
          <div className="dashboard-skeleton-card" />
        </section>
      ) : null}

      {!loading && !error ? (
        <section className="stats-grid learner-stats">
          <StatCard label="Enrolled Courses" value={totals.enrolled} helper="Courses opened for your account" />
          <StatCard label="Overall Progress" value={`${totals.overallProgress}%`} helper="Across real course lessons" tone="green" />
          <StatCard label="Completed Lessons" value={totals.completedLessons} helper={`${totals.totalLessons} total lessons`} tone="amber" />
          <StatCard label="Pending Lessons" value={totals.pendingItems} helper="Lessons still waiting" tone="navy" />
        </section>
      ) : null}

      {!loading && !error && courseSummaries.length === 0 ? (
        <section className="dashboard-empty-card">
          <EmptyState
            title="No enrolled courses yet"
            message="Browse available courses and start learning with GATE."
            action={<Link className="btn btn-primary" to="/learning">Browse Courses</Link>}
          />
        </section>
      ) : null}

      {!loading && !error && courseSummaries.length > 0 ? (
        <>
          <section className="continue-panel">
            <div>
              <p className="eyebrow">Continue learning</p>
              <h2>{continueCourse?.title || 'Your next course'}</h2>
              <p>
                {continueCourse?.totalLessons
                  ? `${continueCourse.completedLessons} of ${continueCourse.totalLessons} lessons completed.`
                  : 'This course has no reported lessons yet.'}
              </p>
            </div>
            <div className="continue-progress">
              <CircularProgress value={continueCourse?.progressPercentage ?? 0} />
              <Link className="btn btn-primary" to={`/player/${continueCourse?.id}`}>{continueCourse?.isCompleted ? 'Review Course' : 'Continue Learning'}</Link>
            </div>
          </section>

          <section className="section-block">
            <div className="section-title">
              <div>
                <p className="eyebrow">My courses</p>
                <h2>Enrolled Courses</h2>
              </div>
            </div>
            <div className="dashboard-course-grid">
              {deferredCourseSummaries.map((course) => (
                <DashboardCourseCard
                  certificateLoading={Number(certificateLoadingId) === Number(course.id)}
                  course={course}
                  key={course.id}
                  onIssueCertificate={issueCertificate}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
};

export default Dashboard;
