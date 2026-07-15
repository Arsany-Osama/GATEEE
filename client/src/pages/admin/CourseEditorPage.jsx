import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  getAdminCourseCurriculum,
  reorderLessons,
  updateLesson,
  updateModule,
  uploadLessonVideo,
} from '../../api/adminCourseContentApi';
import { getApiError } from '../../api/client';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Input from '../../components/Input';
import Loader from '../../components/Loader';
import PageBackLink from '../../components/PageBackLink';
import StatCard from '../../components/StatCard';

const blankModuleForm = { title: '', order_index: '' };
const blankLessonForm = {
  playlist_id: '',
  title: '',
  description: '',
  order_index: '',
  video_url: '',
  is_published: true,
};
const fallbackImage = '/images/cover of course.png';

const sortedLessons = (lessons = []) => [...lessons].sort((a, b) => {
  const orderDiff = Number(a.order_index || 0) - Number(b.order_index || 0);
  return orderDiff || Number(a.id || 0) - Number(b.id || 0);
});

const CourseEditorPage = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [support, setSupport] = useState({});
  const [moduleForm, setModuleForm] = useState(blankModuleForm);
  const [lessonForm, setLessonForm] = useState(blankLessonForm);
  const [editingModuleId, setEditingModuleId] = useState('');
  const [editingLessonId, setEditingLessonId] = useState('');
  const [uploadingId, setUploadingId] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminCourseCurriculum(id);
      setCourse(data?.course ?? null);
      setPlaylists(Array.isArray(data?.playlists) ? data.playlists : []);
      setSupport(data?.support || {});
    } catch (err) {
      setError(getApiError(err, 'Could not load course curriculum.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAdminCourseCurriculum(id);
        if (!active) return;
        setCourse(data?.course ?? null);
        setPlaylists(Array.isArray(data?.playlists) ? data.playlists : []);
        setSupport(data?.support || {});
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load course curriculum.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInitial();
    return () => {
      active = false;
    };
  }, [id]);

  const lessonCount = useMemo(() => playlists.reduce((sum, playlist) => sum + (playlist.lessons?.length || 0), 0), [playlists]);
  const publishedLessonCount = useMemo(() => playlists.reduce((sum, playlist) => {
    return sum + (playlist.lessons || []).filter((lesson) => lesson.is_published !== false && lesson.is_published !== 0).length;
  }, 0), [playlists]);

  const resetModuleForm = () => {
    setModuleForm(blankModuleForm);
    setEditingModuleId('');
  };

  const resetLessonForm = () => {
    setLessonForm(blankLessonForm);
    setEditingLessonId('');
  };

  const saveModule = async (event) => {
    event.preventDefault();
    if (!moduleForm.title.trim()) return setError('Module title is required.');
    setBusyAction('module-save');
    setError('');
    setMessage('');
    try {
      const payload = { title: moduleForm.title.trim(), order_index: Number(moduleForm.order_index) || 0 };
      const result = editingModuleId ? await updateModule(editingModuleId, payload) : await createModule(id, payload);
      setMessage(result?.message || 'Module saved.');
      resetModuleForm();
      await load();
    } catch (err) {
      setError(getApiError(err, 'Could not save module.'));
    } finally {
      setBusyAction('');
    }
  };

  const saveLesson = async (event) => {
    event.preventDefault();
    if (!lessonForm.playlist_id || !lessonForm.title.trim()) return setError('Lesson module and title are required.');
    setBusyAction('lesson-save');
    setError('');
    setMessage('');
    try {
      const payload = {
        playlist_id: Number(lessonForm.playlist_id),
        title: lessonForm.title.trim(),
        order_index: Number(lessonForm.order_index) || 0,
        video_url: lessonForm.video_url.trim(),
      };
      if (support.lesson_description) payload.description = lessonForm.description.trim();
      if (support.lesson_visibility) payload.is_published = Boolean(lessonForm.is_published);
      const result = editingLessonId ? await updateLesson(editingLessonId, payload) : await createLesson(payload);
      setMessage(result?.message || 'Lesson saved.');
      resetLessonForm();
      await load();
    } catch (err) {
      setError(getApiError(err, 'Could not save lesson.'));
    } finally {
      setBusyAction('');
    }
  };

  const startModuleEdit = (playlist) => {
    setEditingModuleId(playlist.id);
    setModuleForm({ title: playlist.title || '', order_index: playlist.order_index ?? '' });
    setMessage('');
  };

  const startLessonEdit = (lesson, playlistId) => {
    setEditingLessonId(lesson.id);
    setLessonForm({
      playlist_id: String(playlistId),
      title: lesson.title || '',
      description: lesson.description || '',
      order_index: lesson.order_index ?? '',
      video_url: lesson.cloudinary_public_id || '',
      is_published: lesson.is_published === undefined ? true : Boolean(lesson.is_published),
    });
    setMessage('');
  };

  const removeModule = async (playlist) => {
    if (!window.confirm(`Move "${playlist.title || 'this module'}" and its lessons to deleted content?`)) return;
    setBusyAction(`module-delete-${playlist.id}`);
    setError('');
    setMessage('');
    try {
      const result = await deleteModule(playlist.id);
      setMessage(result?.message || 'Module moved to deleted content.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'Could not delete module.'));
    } finally {
      setBusyAction('');
    }
  };

  const removeLesson = async (lesson) => {
    if (!window.confirm(`Move "${lesson.title || 'this lesson'}" to deleted content?`)) return;
    setBusyAction(`lesson-delete-${lesson.id}`);
    setError('');
    setMessage('');
    try {
      const result = await deleteLesson(lesson.id);
      setMessage(result?.message || 'Lesson moved to deleted content.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'Could not delete lesson.'));
    } finally {
      setBusyAction('');
    }
  };

  const moveLesson = async (playlist, lesson, direction) => {
    const lessons = sortedLessons(playlist.lessons || []);
    const index = lessons.findIndex((item) => Number(item.id) === Number(lesson.id));
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= lessons.length) return;
    const nextLessons = [...lessons];
    [nextLessons[index], nextLessons[swapIndex]] = [nextLessons[swapIndex], nextLessons[index]];
    setBusyAction(`lesson-move-${lesson.id}`);
    setError('');
    setMessage('');
    try {
      const result = await reorderLessons(nextLessons.map((item, orderIndex) => ({ id: item.id, order_index: orderIndex + 1 })));
      setMessage(result?.message || 'Lessons reordered.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'Could not reorder lessons.'));
    } finally {
      setBusyAction('');
    }
  };

  const selectUpload = async (lessonId, file) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['mp4', 'mov', 'webm'].includes(extension)) return setError('Video must be mp4, mov, or webm.');
    setUploadingId(String(lessonId));
    setError('');
    setMessage('');
    try {
      const result = await uploadLessonVideo(lessonId, file);
      setMessage(result?.message || 'Video uploaded.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'Could not upload video.'));
    } finally {
      setUploadingId('');
    }
  };

  return (
    <main className="admin-page admin-course-editor-page">
      <div className="admin-page-toolbar"><PageBackLink to="/admin/courses">Back to Courses</PageBackLink></div>
      <section className="page-head admin-course-editor-head">
        <div className="admin-course-editor-title">
          <p className="eyebrow">Course builder</p>
          <h1>{course?.title || 'Course structure'}</h1>
          {course?.arabic_title ? <p dir="rtl">{course.arabic_title}</p> : null}
          <p>{course?.description || 'Organize modules, lessons, ordering, visibility, and video references using database-backed content.'}</p>
          <div className="admin-course-editor-actions">
            {course?.id ? <Link className="btn btn-secondary" to={`/player/${course.id}`}>Preview Player</Link> : null}
            <Button variant="ghost" onClick={load} disabled={loading}>Refresh</Button>
          </div>
        </div>
        <div className="admin-course-editor-cover">
          <img
            src={course?.thumbnail_url || fallbackImage}
            alt=""
            onError={(event) => { event.currentTarget.src = fallbackImage; }}
          />
          <Badge tone={course?.is_published ? 'green' : 'amber'}>{course?.is_published ? 'Published course' : 'Hidden course'}</Badge>
        </div>
      </section>

      <ErrorMessage message={error} />
      {message ? <div className="notice notice-success">{message}</div> : null}
      {loading ? <Loader label="Loading curriculum..." /> : null}

      {!loading ? (
        <>
          <section className="stats-grid admin-course-content-summary">
            <StatCard label="Modules" value={playlists.length} helper="Database playlists" />
            <StatCard label="Lessons" value={lessonCount} helper="Active lessons" tone="green" />
            <StatCard label="Visible Lessons" value={support.lesson_visibility ? publishedLessonCount : lessonCount} helper={support.lesson_visibility ? 'Shown to students' : 'Visibility migration pending'} tone="navy" />
            <StatCard label="Video Upload" value={support.lesson_upload ? 'Ready' : 'Unavailable'} helper="Existing lesson upload flow" tone="amber" />
          </section>

          <section className="admin-course-content-layout">
            <aside className="panel admin-course-content-forms">
              <form className="admin-content-form" onSubmit={saveModule}>
                <div>
                  <p className="eyebrow">Module</p>
                  <h2>{editingModuleId ? 'Edit Module' : 'Add Module'}</h2>
                </div>
                <Input label="Module title" value={moduleForm.title} onChange={(event) => setModuleForm({ ...moduleForm, title: event.target.value })} required />
                <Input label="Order" type="number" value={moduleForm.order_index} onChange={(event) => setModuleForm({ ...moduleForm, order_index: event.target.value })} />
                <div className="form-actions">
                  <Button type="submit" disabled={busyAction === 'module-save'}>{busyAction === 'module-save' ? 'Saving...' : editingModuleId ? 'Update Module' : 'Add Module'}</Button>
                  {editingModuleId ? <Button type="button" variant="ghost" onClick={resetModuleForm}>Cancel</Button> : null}
                </div>
              </form>

              <form className="admin-content-form" onSubmit={saveLesson}>
                <div>
                  <p className="eyebrow">Lesson</p>
                  <h2>{editingLessonId ? 'Edit Lesson' : 'Add Lesson'}</h2>
                </div>
                <label className="field">
                  <span>Module</span>
                  <select value={lessonForm.playlist_id} onChange={(event) => setLessonForm({ ...lessonForm, playlist_id: event.target.value })} required>
                    <option value="">Select module</option>
                    {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.title}</option>)}
                  </select>
                </label>
                <Input label="Lesson title" value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} required />
                {support.lesson_description ? (
                  <label className="field">
                    <span>Lesson description</span>
                    <textarea value={lessonForm.description} onChange={(event) => setLessonForm({ ...lessonForm, description: event.target.value })} placeholder="Optional lesson summary" />
                  </label>
                ) : null}
                <Input label="Order" type="number" value={lessonForm.order_index} onChange={(event) => setLessonForm({ ...lessonForm, order_index: event.target.value })} />
                <Input label="Cloudinary public id / video reference" value={lessonForm.video_url} onChange={(event) => setLessonForm({ ...lessonForm, video_url: event.target.value })} placeholder="Existing Cloudinary public id" />
                {support.lesson_visibility ? (
                  <label className="field admin-checkbox-field admin-content-checkbox">
                    <span>Visible to students</span>
                    <input type="checkbox" checked={lessonForm.is_published} onChange={(event) => setLessonForm({ ...lessonForm, is_published: event.target.checked })} />
                  </label>
                ) : (
                  <p className="muted">Lesson visibility will be available after migration 008 is applied.</p>
                )}
                <div className="form-actions">
                  <Button type="submit" disabled={busyAction === 'lesson-save' || playlists.length === 0}>{busyAction === 'lesson-save' ? 'Saving...' : editingLessonId ? 'Update Lesson' : 'Add Lesson'}</Button>
                  {editingLessonId ? <Button type="button" variant="ghost" onClick={resetLessonForm}>Cancel</Button> : null}
                </div>
              </form>
            </aside>

            <section className="admin-course-curriculum">
              {playlists.length === 0 ? (
                <EmptyState title="No modules yet" message="Add a module before creating lessons." />
              ) : playlists.map((playlist) => {
                const lessons = sortedLessons(playlist.lessons || []);
                return (
                  <article className="panel admin-module-card" key={playlist.id}>
                    <div className="admin-module-head">
                      <div>
                        <p className="eyebrow">Module {playlist.order_index ?? 0}</p>
                        <h2>{playlist.title || 'Untitled module'}</h2>
                        <p>{lessons.length} active lessons</p>
                      </div>
                      <div className="row-actions">
                        <Button variant="ghost" onClick={() => startModuleEdit(playlist)}>Edit</Button>
                        <Button variant="danger" disabled={Boolean(busyAction)} onClick={() => removeModule(playlist)}>
                          {busyAction === `module-delete-${playlist.id}` ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>

                    {lessons.length === 0 ? <EmptyState title="No lessons in this module" message="Add a lesson from the editor panel." /> : (
                      <div className="admin-lesson-list">
                        {lessons.map((lesson, index) => {
                          const visible = lesson.is_published === undefined || lesson.is_published === true || lesson.is_published === 1;
                          return (
                            <article className="admin-lesson-card" key={lesson.id}>
                              <div className="admin-lesson-index">{lesson.order_index || index + 1}</div>
                              <div className="admin-lesson-body">
                                <div className="admin-lesson-title-row">
                                  <div>
                                    <h3>{lesson.title || 'Untitled lesson'}</h3>
                                    {lesson.description ? <p>{lesson.description}</p> : null}
                                  </div>
                                  <Badge tone={visible ? 'green' : 'amber'}>{visible ? 'Visible' : 'Hidden'}</Badge>
                                </div>
                                <dl className="admin-lesson-meta">
                                  <div><dt>Video</dt><dd>{lesson.cloudinary_public_id ? 'Configured' : 'Not set'}</dd></div>
                                  <div><dt>Lesson ID</dt><dd>#{lesson.id}</dd></div>
                                  <div><dt>Module</dt><dd>#{playlist.id}</dd></div>
                                </dl>
                                <div className="admin-lesson-actions">
                                  <Button variant="ghost" disabled={index === 0 || Boolean(busyAction)} onClick={() => moveLesson(playlist, lesson, 'up')}>Move Up</Button>
                                  <Button variant="ghost" disabled={index === lessons.length - 1 || Boolean(busyAction)} onClick={() => moveLesson(playlist, lesson, 'down')}>Move Down</Button>
                                  <label className="btn btn-secondary file-btn">
                                    {uploadingId === String(lesson.id) ? 'Uploading...' : 'Upload Video'}
                                    <input
                                      type="file"
                                      accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                                      onChange={(event) => selectUpload(lesson.id, event.target.files?.[0])}
                                      disabled={uploadingId === String(lesson.id)}
                                    />
                                  </label>
                                  <Button variant="ghost" onClick={() => startLessonEdit(lesson, playlist.id)}>Edit</Button>
                                  <Button variant="danger" disabled={Boolean(busyAction)} onClick={() => removeLesson(lesson)}>
                                    {busyAction === `lesson-delete-${lesson.id}` ? 'Deleting...' : 'Delete'}
                                  </Button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          </section>
        </>
      ) : null}
    </main>
  );
};

export default CourseEditorPage;
