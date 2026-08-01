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
import { useAdminLanguage } from '../../context/AdminLanguageContext';

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

const copy = {
  ar: {
    back: 'العودة إلى الكورسات',
    eyebrow: 'منشئ الكورس',
    preview: 'معاينة اللاعب',
    refresh: 'تحديث',
    loading: 'جارٍ تحميل المنهج...',
    loadError: 'تعذر تحميل المنهج.',
    courseStructure: 'بنية الكورس',
    coursePublished: 'كورس منشور',
    courseHidden: 'كورس مخفي',
    summary: {
      modules: 'الوحدات',
      lessons: 'الدروس',
      visibleLessons: 'الدروس الظاهرة',
      videoUpload: 'رفع الفيديو',
      ready: 'جاهز',
      unavailable: 'غير متاح',
    },
    module: {
      title: 'الوحدة',
      add: 'إضافة وحدة',
      edit: 'تعديل وحدة',
      name: 'عنوان الوحدة',
      order: 'الترتيب',
      save: 'إضافة وحدة',
      update: 'تحديث الوحدة',
      cancel: 'إلغاء',
      saving: 'جاري الحفظ...',
      required: 'عنوان الوحدة مطلوب.',
      saved: 'تم حفظ الوحدة.',
      saveFailed: 'تعذر حفظ الوحدة.',
      deleteConfirm: (title) => `نقل "${title}" إلى المحتوى المحذوف مع الدروس المرتبطة؟`,
      deleted: 'تم نقل الوحدة إلى المحتوى المحذوف.',
      deleteFailed: 'تعذر حذف الوحدة.',
      deleting: 'جاري الحذف...',
      empty: 'لا توجد وحدات بعد',
      emptyMessage: 'أضف وحدة قبل إنشاء الدروس.',
      lessonsEmpty: 'لا توجد دروس في هذه الوحدة',
      lessonsEmptyMessage: 'أضف درسًا من اللوحة الجانبية.',
      lessonCount: (count) => `${count} درس نشط`,
      moduleLabel: (index) => `الوحدة ${index}`,
      untitled: 'وحدة بدون عنوان',
    },
    lesson: {
      title: 'الدرس',
      add: 'إضافة درس',
      edit: 'تعديل درس',
      module: 'الوحدة',
      selectModule: 'اختر الوحدة',
      name: 'عنوان الدرس',
      description: 'وصف الدرس',
      descriptionPlaceholder: 'ملخص اختياري للدرس',
      order: 'الترتيب',
      video: 'معرّف Cloudinary / مرجع الفيديو',
      videoPlaceholder: 'معرّف Cloudinary الحالي',
      visibility: 'مرئي للطلاب',
      visibilityPending: 'سيظهر خيار إخفاء/إظهار الدرس بعد تطبيق الترحيل 008.',
      save: 'إضافة درس',
      update: 'تحديث الدرس',
      cancel: 'إلغاء',
      saving: 'جاري الحفظ...',
      required: 'الوحدة وعنوان الدرس مطلوبان.',
      saved: 'تم حفظ الدرس.',
      saveFailed: 'تعذر حفظ الدرس.',
      deleteConfirm: (title) => `نقل "${title}" إلى المحتوى المحذوف؟`,
      deleted: 'تم نقل الدرس إلى المحتوى المحذوف.',
      deleteFailed: 'تعذر حذف الدرس.',
      deleting: 'جاري الحذف...',
      reorderFailed: 'تعذر إعادة ترتيب الدروس.',
      reordered: 'تمت إعادة ترتيب الدروس.',
      uploadFailed: 'تعذر رفع الفيديو.',
      uploaded: 'تم رفع الفيديو.',
      uploadButton: 'رفع فيديو',
      uploading: 'جارٍ الرفع...',
      visible: 'ظاهر',
      hidden: 'مخفي',
      configured: 'معدّ',
      notSet: 'غير محدد',
      moduleId: 'رقم الوحدة',
      lessonId: 'رقم الدرس',
      moveUp: 'رفع للأعلى',
      moveDown: 'خفض للأسفل',
      editButton: 'تعديل',
      deleteButton: 'حذف',
      videoLabel: 'الفيديو',
    },
  },
  en: {
    back: 'Back to Courses',
    eyebrow: 'Course builder',
    preview: 'Preview player',
    refresh: 'Refresh',
    loading: 'Loading curriculum...',
    loadError: 'Could not load course curriculum.',
    courseStructure: 'Course structure',
    coursePublished: 'Published course',
    courseHidden: 'Hidden course',
    summary: {
      modules: 'Modules',
      lessons: 'Lessons',
      visibleLessons: 'Visible lessons',
      videoUpload: 'Video upload',
      ready: 'Ready',
      unavailable: 'Unavailable',
    },
    module: {
      title: 'Module',
      add: 'Add module',
      edit: 'Edit module',
      name: 'Module title',
      order: 'Order',
      save: 'Add module',
      update: 'Update module',
      cancel: 'Cancel',
      saving: 'Saving...',
      required: 'Module title is required.',
      saved: 'Module saved.',
      saveFailed: 'Could not save module.',
      deleteConfirm: (title) => `Move "${title}" and its lessons to deleted content?`,
      deleted: 'Module moved to deleted content.',
      deleteFailed: 'Could not delete module.',
      deleting: 'Deleting...',
      empty: 'No modules yet',
      emptyMessage: 'Add a module before creating lessons.',
      lessonsEmpty: 'No lessons in this module',
      lessonsEmptyMessage: 'Add a lesson from the editor panel.',
      lessonCount: (count) => `${count} active lessons`,
      moduleLabel: (index) => `Module ${index}`,
      untitled: 'Untitled module',
    },
    lesson: {
      title: 'Lesson',
      add: 'Add lesson',
      edit: 'Edit lesson',
      module: 'Module',
      selectModule: 'Select module',
      name: 'Lesson title',
      description: 'Lesson description',
      descriptionPlaceholder: 'Optional lesson summary',
      order: 'Order',
      video: 'Cloudinary public id / video reference',
      videoPlaceholder: 'Existing Cloudinary public id',
      visibility: 'Visible to students',
      visibilityPending: 'Lesson visibility will be available after migration 008 is applied.',
      save: 'Add lesson',
      update: 'Update lesson',
      cancel: 'Cancel',
      saving: 'Saving...',
      required: 'Lesson module and title are required.',
      saved: 'Lesson saved.',
      saveFailed: 'Could not save lesson.',
      deleteConfirm: (title) => `Move "${title}" to deleted content?`,
      deleted: 'Lesson moved to deleted content.',
      deleteFailed: 'Could not delete lesson.',
      deleting: 'Deleting...',
      reorderFailed: 'Could not reorder lessons.',
      reordered: 'Lessons reordered.',
      uploadFailed: 'Could not upload video.',
      uploaded: 'Video uploaded.',
      uploadButton: 'Upload video',
      uploading: 'Uploading...',
      visible: 'Visible',
      hidden: 'Hidden',
      configured: 'Configured',
      notSet: 'Not set',
      moduleId: 'Module ID',
      lessonId: 'Lesson ID',
      moveUp: 'Move up',
      moveDown: 'Move down',
      editButton: 'Edit',
      deleteButton: 'Delete',
      videoLabel: 'Video',
    },
  },
};

const CourseEditorPage = () => {
  const { id } = useParams();
  const { language } = useAdminLanguage();
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
  const text = copy[language] || copy.ar;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminCourseCurriculum(id);
      setCourse(data?.course ?? null);
      setPlaylists(Array.isArray(data?.playlists) ? data.playlists : []);
      setSupport(data?.support || {});
    } catch (err) {
      setError(getApiError(err, text.loadError));
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
        if (active) setError(getApiError(err, text.loadError));
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
    if (!moduleForm.title.trim()) return setError(text.module.required);
    setBusyAction('module-save');
    setError('');
    setMessage('');
    try {
      const payload = { title: moduleForm.title.trim(), order_index: Number(moduleForm.order_index) || 0 };
      const result = editingModuleId ? await updateModule(editingModuleId, payload) : await createModule(id, payload);
      setMessage(result?.message || text.module.saved);
      resetModuleForm();
      await load();
    } catch (err) {
      setError(getApiError(err, text.module.saveFailed));
    } finally {
      setBusyAction('');
    }
  };

  const saveLesson = async (event) => {
    event.preventDefault();
    if (!lessonForm.playlist_id || !lessonForm.title.trim()) return setError(text.lesson.required);
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
      setMessage(result?.message || text.lesson.saved);
      resetLessonForm();
      await load();
    } catch (err) {
      setError(getApiError(err, text.lesson.saveFailed));
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
    if (!window.confirm(text.module.deleteConfirm(playlist.title || (language === 'ar' ? 'هذه الوحدة' : 'this module')))) return;
    setBusyAction(`module-delete-${playlist.id}`);
    setError('');
    setMessage('');
    try {
      const result = await deleteModule(playlist.id);
      setMessage(result?.message || text.module.deleted);
      await load();
    } catch (err) {
      setError(getApiError(err, text.module.deleteFailed));
    } finally {
      setBusyAction('');
    }
  };

  const removeLesson = async (lesson) => {
    if (!window.confirm(text.lesson.deleteConfirm(lesson.title || (language === 'ar' ? 'هذا الدرس' : 'this lesson')))) return;
    setBusyAction(`lesson-delete-${lesson.id}`);
    setError('');
    setMessage('');
    try {
      const result = await deleteLesson(lesson.id);
      setMessage(result?.message || text.lesson.deleted);
      await load();
    } catch (err) {
      setError(getApiError(err, text.lesson.deleteFailed));
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
      setMessage(result?.message || text.lesson.reordered);
      await load();
    } catch (err) {
      setError(getApiError(err, text.lesson.reorderFailed));
    } finally {
      setBusyAction('');
    }
  };

  const selectUpload = async (lessonId, file) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['mp4', 'mov', 'webm'].includes(extension)) return setError(language === 'ar' ? 'يجب أن يكون الفيديو mp4 أو mov أو webm.' : 'Video must be mp4, mov, or webm.');
    setUploadingId(String(lessonId));
    setError('');
    setMessage('');
    try {
      const result = await uploadLessonVideo(lessonId, file);
      setMessage(result?.message || text.lesson.uploaded);
      await load();
    } catch (err) {
      setError(getApiError(err, text.lesson.uploadFailed));
    } finally {
      setUploadingId('');
    }
  };

  return (
    <main className="admin-page admin-course-editor-page">
      <div className="admin-page-toolbar"><PageBackLink to="/admin/courses">{text.back}</PageBackLink></div>
      <section className="page-head admin-course-editor-head">
        <div className="admin-course-editor-title">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{course?.title || text.courseStructure}</h1>
          {course?.arabic_title ? <p dir={language === 'ar' ? 'rtl' : 'ltr'}>{course.arabic_title}</p> : null}
          <p>{course?.description || (language === 'ar' ? 'نظّم الوحدات والدروس والترتيب وإتاحة الدروس وروابط الفيديو من خلال محتوى مرتبط بقاعدة البيانات.' : 'Organize modules, lessons, ordering, visibility, and video references using database-backed content.')}</p>
          <div className="admin-course-editor-actions">
            {course?.id ? <Link className="btn btn-secondary" to={`/player/${course.id}`}>{text.preview}</Link> : null}
            <Button variant="ghost" onClick={load} disabled={loading}>{text.refresh}</Button>
          </div>
        </div>
        <div className="admin-course-editor-cover">
          <img
            src={course?.thumbnail_url || fallbackImage}
            alt=""
            onError={(event) => { event.currentTarget.src = fallbackImage; }}
          />
          <Badge tone={course?.is_published ? 'green' : 'amber'}>{course?.is_published ? text.coursePublished : text.courseHidden}</Badge>
        </div>
      </section>

      <ErrorMessage message={error} />
      {message ? <div className="notice notice-success">{message}</div> : null}
      {loading ? <Loader label={text.loading} /> : null}

      {!loading ? (
        <>
          <section className="stats-grid admin-course-content-summary">
            <StatCard label={text.summary.modules} value={playlists.length} helper={language === 'ar' ? 'قوائم الدروس من قاعدة البيانات' : 'Database playlists'} />
            <StatCard label={text.summary.lessons} value={lessonCount} helper={language === 'ar' ? 'الدروس النشطة' : 'Active lessons'} tone="green" />
            <StatCard label={text.summary.visibleLessons} value={support.lesson_visibility ? publishedLessonCount : lessonCount} helper={support.lesson_visibility ? (language === 'ar' ? 'تظهر للطلاب' : 'Shown to students') : (language === 'ar' ? 'ترحيل الإتاحة قيد التطبيق' : 'Visibility migration pending')} tone="navy" />
            <StatCard label={text.summary.videoUpload} value={support.lesson_upload ? text.summary.ready : text.summary.unavailable} helper={language === 'ar' ? 'مسار رفع الدروس الحالي' : 'Existing lesson upload flow'} tone="amber" />
          </section>

          <section className="admin-course-content-layout">
            <aside className="panel admin-course-content-forms">
              <form className="admin-content-form" onSubmit={saveModule}>
                <div>
                  <p className="eyebrow">{text.module.title}</p>
                  <h2>{editingModuleId ? text.module.edit : text.module.add}</h2>
                </div>
                <Input label={text.module.name} value={moduleForm.title} onChange={(event) => setModuleForm({ ...moduleForm, title: event.target.value })} required />
                <Input label={text.module.order} type="number" value={moduleForm.order_index} onChange={(event) => setModuleForm({ ...moduleForm, order_index: event.target.value })} />
                <div className="form-actions">
                  <Button type="submit" disabled={busyAction === 'module-save'}>{busyAction === 'module-save' ? text.module.saving : editingModuleId ? text.module.update : text.module.save}</Button>
                  {editingModuleId ? <Button type="button" variant="ghost" onClick={resetModuleForm}>{text.module.cancel}</Button> : null}
                </div>
              </form>

              <form className="admin-content-form" onSubmit={saveLesson}>
                <div>
                  <p className="eyebrow">{text.lesson.title}</p>
                  <h2>{editingLessonId ? text.lesson.edit : text.lesson.add}</h2>
                </div>
                <label className="field">
                  <span>{text.lesson.module}</span>
                  <select value={lessonForm.playlist_id} onChange={(event) => setLessonForm({ ...lessonForm, playlist_id: event.target.value })} required>
                    <option value="">{text.lesson.selectModule}</option>
                    {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.title}</option>)}
                  </select>
                </label>
                <Input label={text.lesson.name} value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} required />
                {support.lesson_description ? (
                  <label className="field">
                    <span>{text.lesson.description}</span>
                    <textarea value={lessonForm.description} onChange={(event) => setLessonForm({ ...lessonForm, description: event.target.value })} placeholder={text.lesson.descriptionPlaceholder} />
                  </label>
                ) : null}
                <Input label={text.lesson.order} type="number" value={lessonForm.order_index} onChange={(event) => setLessonForm({ ...lessonForm, order_index: event.target.value })} />
                <Input label={text.lesson.video} value={lessonForm.video_url} onChange={(event) => setLessonForm({ ...lessonForm, video_url: event.target.value })} placeholder={text.lesson.videoPlaceholder} />
                {support.lesson_visibility ? (
                  <label className="field admin-checkbox-field admin-content-checkbox">
                    <span>{text.lesson.visibility}</span>
                    <input type="checkbox" checked={lessonForm.is_published} onChange={(event) => setLessonForm({ ...lessonForm, is_published: event.target.checked })} />
                  </label>
                ) : (
                  <p className="muted">{text.lesson.visibilityPending}</p>
                )}
                <div className="form-actions">
                  <Button type="submit" disabled={busyAction === 'lesson-save' || playlists.length === 0}>{busyAction === 'lesson-save' ? text.lesson.saving : editingLessonId ? text.lesson.update : text.lesson.save}</Button>
                  {editingLessonId ? <Button type="button" variant="ghost" onClick={resetLessonForm}>{text.lesson.cancel}</Button> : null}
                </div>
              </form>
            </aside>

            <section className="admin-course-curriculum">
              {playlists.length === 0 ? (
                <EmptyState title={text.module.empty} message={text.module.emptyMessage} />
              ) : playlists.map((playlist) => {
                const lessons = sortedLessons(playlist.lessons || []);
                return (
                  <article className="panel admin-module-card" key={playlist.id}>
                    <div className="admin-module-head">
                      <div>
                        <p className="eyebrow">{text.module.moduleLabel(playlist.order_index ?? 0)}</p>
                        <h2>{playlist.title || text.module.untitled}</h2>
                        <p>{text.module.lessonCount(lessons.length)}</p>
                      </div>
                      <div className="row-actions">
                        <Button variant="ghost" onClick={() => startModuleEdit(playlist)}>{text.module.edit}</Button>
                        <Button variant="danger" disabled={Boolean(busyAction)} onClick={() => removeModule(playlist)}>
                          {busyAction === `module-delete-${playlist.id}` ? text.module.deleting : (language === 'ar' ? 'حذف' : 'Delete')}
                        </Button>
                      </div>
                    </div>

                    {lessons.length === 0 ? <EmptyState title={text.module.lessonsEmpty} message={text.module.lessonsEmptyMessage} /> : (
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
                                  <Badge tone={visible ? 'green' : 'amber'}>{visible ? text.lesson.visible : text.lesson.hidden}</Badge>
                                </div>
                                <dl className="admin-lesson-meta">
                                  <div><dt>{text.lesson.videoLabel}</dt><dd>{lesson.cloudinary_public_id ? text.lesson.configured : text.lesson.notSet}</dd></div>
                                  <div><dt>{text.lesson.lessonId}</dt><dd>#{lesson.id}</dd></div>
                                  <div><dt>{text.lesson.moduleId}</dt><dd>#{playlist.id}</dd></div>
                                </dl>
                                <div className="admin-lesson-actions">
                                  <Button variant="ghost" disabled={index === 0 || Boolean(busyAction)} onClick={() => moveLesson(playlist, lesson, 'up')}>{text.lesson.moveUp}</Button>
                                  <Button variant="ghost" disabled={index === lessons.length - 1 || Boolean(busyAction)} onClick={() => moveLesson(playlist, lesson, 'down')}>{text.lesson.moveDown}</Button>
                                  <label className="btn btn-secondary file-btn">
                                    {uploadingId === String(lesson.id) ? text.lesson.uploading : text.lesson.uploadButton}
                                    <input
                                      type="file"
                                      accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                                      onChange={(event) => selectUpload(lesson.id, event.target.files?.[0])}
                                      disabled={uploadingId === String(lesson.id)}
                                    />
                                  </label>
                                  <Button variant="ghost" onClick={() => startLessonEdit(lesson, playlist.id)}>{text.lesson.editButton}</Button>
                                  <Button variant="danger" disabled={Boolean(busyAction)} onClick={() => removeLesson(lesson)}>
                                    {busyAction === `lesson-delete-${lesson.id}` ? text.lesson.deleting : text.lesson.deleteButton}
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
