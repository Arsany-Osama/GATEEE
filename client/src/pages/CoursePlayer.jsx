import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getApiError } from '../api/client';
import { completeLesson, getCourseProgress, reportLessonWatch } from '../api/progressApi';
import { getCertificateDownloadUrl, getCourseCurriculum, getLessonVideo, getMyCertificates } from '../api/studentApi';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import LessonSidebar from '../components/LessonSidebar';
import Loader from '../components/Loader';
import PageBackLink from '../components/PageBackLink';
import ProgressBar from '../components/ProgressBar';
import VideoPlayer from '../components/VideoPlayer';
import { useAuth } from '../context/AuthContext';

const CoursePlayer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [progress, setProgress] = useState({ progress_percentage: 0, completed_lessons: [] });
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [videoError, setVideoError] = useState('');
  const [certificate, setCertificate] = useState(null);
  const watchSyncRef = useRef({ lessonId: null, watchedSeconds: 0 });

  const flatLessons = useMemo(() => playlists.flatMap((playlist) => playlist.lessons || []), [playlists]);

  const refreshProgress = async () => {
    const data = await getCourseProgress(courseId);
    setProgress({
      progress_percentage: data?.progress_percentage ?? 0,
      completed_lessons: Array.isArray(data?.completed_lessons) ? data.completed_lessons : [],
    });
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      watchSyncRef.current = { lessonId: null, watchedSeconds: 0 };
      try {
        const [curriculum, progressData, certificates] = await Promise.all([
          getCourseCurriculum(courseId),
          getCourseProgress(courseId),
          getMyCertificates().catch(() => []),
        ]);
        if (!active) return;
        const nextPlaylists = Array.isArray(curriculum?.playlists) ? curriculum.playlists : [];
        const courseCertificate = Array.isArray(certificates)
          ? certificates.find((row) => Number(row.course_id) === Number(courseId) && !row.revoked_at)
          : null;
        setCourse(curriculum?.course ?? null);
        setPlaylists(nextPlaylists);
        setCertificate(courseCertificate || null);
        setProgress({
          progress_percentage: progressData?.progress_percentage ?? 0,
          completed_lessons: Array.isArray(progressData?.completed_lessons) ? progressData.completed_lessons : [],
        });
        setSelectedLesson(nextPlaylists.flatMap((playlist) => playlist.lessons || [])[0] ?? null);
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load this course.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [courseId]);

  useEffect(() => {
    let active = true;
    const loadVideo = async () => {
      setVideoUrl('');
      setVideoError('');
      if (!selectedLesson?.id) return;
      setVideoLoading(true);
      try {
        const data = await getLessonVideo(selectedLesson.id);
        if (active) setVideoUrl(data?.video_url || '');
      } catch (err) {
        if (active) setVideoError(getApiError(err, 'Could not load this lesson video.'));
      } finally {
        if (active) setVideoLoading(false);
      }
    };
    loadVideo();
    return () => {
      active = false;
    };
  }, [selectedLesson]);

  const syncWatchProgress = async ({ watched_seconds, duration_seconds }) => {
    if (!selectedLesson?.id) return;
    if (watchSyncRef.current.lessonId !== selectedLesson.id) {
      watchSyncRef.current = { lessonId: selectedLesson.id, watchedSeconds: 0 };
    }
    if (watched_seconds <= watchSyncRef.current.watchedSeconds) return;
    watchSyncRef.current.watchedSeconds = watched_seconds;
    try {
      await reportLessonWatch(selectedLesson.id, { watched_seconds, duration_seconds });
    } catch (err) {
      console.error('Watch progress sync failed:', err);
    }
  };

  const markComplete = async () => {
    if (!selectedLesson?.id) return;
    setCompleting(true);
    setVideoError('');
    try {
      const data = await completeLesson(selectedLesson.id);
      if (data?.certificate?.uuid) setCertificate(data.certificate);
      await refreshProgress();
    } catch (err) {
      setVideoError(getApiError(err, 'Could not mark this lesson complete.'));
    } finally {
      setCompleting(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  };

  if (loading) return <Loader fullScreen label="Loading course..." />;

  return (
    <main className="player-page">
      <div className="student-page-toolbar">
        <PageBackLink to="/dashboard">Back to Dashboard</PageBackLink>
      </div>
      <section className="player-head">
        <div>
          <div className="player-head-actions">
            <Button variant="ghost" onClick={goBack}>← Back</Button>
            <Link to="/dashboard" className="text-link">Dashboard</Link>
          </div>
          <h1>{course?.title || 'Course Player'}</h1>
          <p>{course?.description || `${flatLessons.length} lessons available`}</p>
        </div>
        <ProgressBar value={progress.progress_percentage} />
      </section>

      <ErrorMessage message={error} />
      {!error ? (
        <section className="player-layout">
          <LessonSidebar
            playlists={playlists}
            selectedLessonId={selectedLesson?.id}
            completedLessons={progress.completed_lessons}
            onSelectLesson={setSelectedLesson}
          />
          <article className="player-main">
            {!selectedLesson ? (
              <EmptyState title="No lesson selected" message="Choose a lesson from the curriculum to start the course." />
            ) : (
              <>
                <div className="lesson-title-row">
                  <div>
                    <p className="eyebrow">Lesson</p>
                    <h2>{selectedLesson.title || 'Untitled lesson'}</h2>
                  </div>
                  <div className="row-actions">
                    <Link className="btn btn-secondary" to={`/quiz/${selectedLesson.id}`}>Quiz</Link>
                    {certificate?.uuid ? (
                      <a className="btn btn-secondary" href={getCertificateDownloadUrl(certificate.uuid)}>
                        Download Certificate
                      </a>
                    ) : null}
                    <Button onClick={markComplete} disabled={completing}>
                      {completing ? 'Saving...' : 'Mark as Complete'}
                    </Button>
                  </div>
                </div>
                <ErrorMessage message={videoError} />
                {videoLoading ? <Loader label="Preparing video..." /> : (
                  <VideoPlayer
                    key={selectedLesson?.id || videoUrl}
                    src={videoUrl}
                    currentUser={user}
                    lessonTitle={selectedLesson.title}
                    onWatchProgress={syncWatchProgress}
                  />
                )}
              </>
            )}
          </article>
        </section>
      ) : null}
    </main>
  );
};

export default CoursePlayer;
