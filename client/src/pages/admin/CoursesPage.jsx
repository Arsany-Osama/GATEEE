import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  createCourse,
  deleteCourse,
  getAdminCategories,
  getAdminCourses,
  getAdminInstructors,
  getDeletedCourses,
  permanentlyDeleteCourse,
  restoreCourse,
  updateCourse,
  uploadCourseImage,
} from '../../api/adminApi';
import { getApiError } from '../../api/client';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Input from '../../components/Input';
import Loader from '../../components/Loader';
import PageBackLink from '../../components/PageBackLink';

const fallbackImage = '/images/cover of course.png';

const blankCourse = {
  title: '',
  arabic_title: '',
  description: '',
  thumbnail_url: '',
  thumbnail_public_id: '',
  category_id: '',
  instructor_id: '',
  instructor_name: 'Eng. Ahmed Gamal Elghawy',
  instructor_subtitle: '10+ Years Experience',
  price: '2000',
  discount_price: '',
  pricing_type: 'paid',
  is_published: true,
  display_order: '0',
};

const imageChoices = [
  { label: 'OSHA course cover', value: '/images/osha-course-cover.png' },
  { label: 'IOSH course cover', value: '/images/iosh-course-cover.png' },
  { label: 'General safety cover', value: '/images/cover of course.png' },
  { label: 'Industrial safety background', value: '/images/safety-industrial-bg.png' },
];

const formatDate = (value) => {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'غير متاح' : date.toLocaleDateString('ar-EG');
};

const isPublished = (course) => !(course?.is_published === false || course?.is_published === 0 || course?.is_published === '0');
const getCourseStatus = (course) => (isPublished(course) ? 'published' : 'draft');
const getCourseTitle = (course) => course?.title || course?.arabic_title || 'كورس بدون اسم';
const getCourseCategory = (course) => course?.category || course?.category_name || course?.section || course?.section_name || 'غير مصنف';
const getPricingType = (course) => course?.pricing_type || 'paid';
const isFreeCourse = (course) => getPricingType(course) === 'free' || Number(course?.price || 0) <= 0;
const hasCourseDiscount = (course) => getPricingType(course) === 'discounted' && course?.discount_price !== null && course?.discount_price !== undefined && String(course.discount_price) !== '';
const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
};

const toForm = (course = {}) => ({
  title: course.title || '',
  arabic_title: course.arabic_title || '',
  description: course.description || '',
  thumbnail_url: course.thumbnail_url || '',
  thumbnail_public_id: course.thumbnail_public_id || '',
  category_id: course.category_id || '',
  instructor_id: course.instructor_id || '',
  instructor_name: course.instructor_name || 'Eng. Ahmed Gamal Elghawy',
  instructor_subtitle: course.instructor_subtitle || '10+ Years Experience',
  price: course.price ?? '2000',
  discount_price: course.discount_price ?? '',
  pricing_type: getPricingType(course),
  is_published: course.is_published === undefined ? true : isPublished(course),
  display_order: course.display_order ?? '0',
});

const buildPayload = (form) => ({
  title: form.title.trim(),
  arabic_title: form.arabic_title.trim(),
  description: form.description.trim(),
  thumbnail_url: form.thumbnail_url.trim(),
  thumbnail_public_id: form.thumbnail_public_id || '',
  category_id: form.category_id ? Number(form.category_id) : null,
  instructor_id: form.instructor_id ? Number(form.instructor_id) : null,
  instructor_name: form.instructor_name.trim(),
  instructor_subtitle: form.instructor_subtitle.trim(),
  price: Number(form.price),
  discount_price: form.pricing_type === 'discounted' ? Number(form.discount_price) : null,
  pricing_type: form.pricing_type,
  is_published: Boolean(form.is_published),
  display_order: Number(form.display_order) || 0,
});

const CoursesPage = () => {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [categories, setCategories] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [form, setForm] = useState(blankCourse);
  const [panelMode, setPanelMode] = useState('');
  const [editingCourse, setEditingCourse] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const searchParamValue = searchParams.get('search') || '';
  const [searchState, setSearchState] = useState({ source: searchParamValue, value: searchParamValue });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [activeCourses, deletedCourses, categoryRows, instructorRows] = await Promise.all([
        getAdminCourses(),
        getDeletedCourses().catch(() => []),
        getAdminCategories().catch(() => []),
        getAdminInstructors().catch(() => []),
      ]);
      setCourses(Array.isArray(activeCourses) ? activeCourses.filter((course) => !course?.deleted_at) : []);
      setDeleted(Array.isArray(deletedCourses) ? deletedCourses : []);
      setCategories(Array.isArray(categoryRows) ? categoryRows : []);
      setInstructors(Array.isArray(instructorRows) ? instructorRows : []);
    } catch (err) {
      setError(getApiError(err, 'تعذر تحميل الكورسات.'));
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
        const [activeCourses, deletedCourses, categoryRows, instructorRows] = await Promise.all([
          getAdminCourses(),
          getDeletedCourses().catch(() => []),
          getAdminCategories().catch(() => []),
          getAdminInstructors().catch(() => []),
        ]);
        if (!active) return;
        setCourses(Array.isArray(activeCourses) ? activeCourses.filter((course) => !course?.deleted_at) : []);
        setDeleted(Array.isArray(deletedCourses) ? deletedCourses : []);
        setCategories(Array.isArray(categoryRows) ? categoryRows : []);
        setInstructors(Array.isArray(instructorRows) ? instructorRows : []);
      } catch (err) {
        if (active) setError(getApiError(err, 'تعذر تحميل الكورسات.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInitial();
    return () => {
      active = false;
    };
  }, []);

  const search = searchState.source === searchParamValue ? searchState.value : searchParamValue;

  const categoryFilters = useMemo(() => {
    const values = courses.map(getCourseCategory).filter(Boolean);
    return [...new Set(values)];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return courses.filter((course) => {
      const status = getCourseStatus(course);
      const category = getCourseCategory(course);
      const searchable = [
        course.title,
        course.arabic_title,
        course.description,
        course.instructor_name,
        course.instructor_subtitle,
        category,
      ].filter(Boolean).join(' ').toLowerCase();

      return (!term || searchable.includes(term))
        && (categoryFilter === 'all' || category === categoryFilter)
        && (statusFilter === 'all' || status === statusFilter);
    });
  }, [categoryFilter, courses, search, statusFilter]);

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Course image must be JPG, PNG, WEBP, or GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Course image must be 5 MB or smaller.');
      return;
    }
    setUploadingImage(true);
    setError('');
    try {
      const uploaded = await uploadCourseImage(file);
      setForm((current) => ({
        ...current,
        thumbnail_url: uploaded.url || '',
        thumbnail_public_id: uploaded.public_id || '',
      }));
      setMessage('Course image uploaded. Save the course to keep it.');
    } catch (err) {
      setError(getApiError(err, 'Could not upload course image.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreatePanel = () => {
    setPanelMode('create');
    setEditingCourse(null);
    setForm(blankCourse);
    setError('');
    setMessage('');
  };

  const openEditPanel = (course) => {
    setPanelMode('edit');
    setEditingCourse(course);
    setForm(toForm(course));
    setError('');
    setMessage('');
  };

  const closePanel = () => {
    setPanelMode('');
    setEditingCourse(null);
    setForm(blankCourse);
  };

  const saveCourse = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('اسم الكورس مطلوب.');
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setError('سعر الكورس يجب أن يكون رقمًا صحيحًا أو عشريًا غير سالب.');
      return;
    }
    if (form.pricing_type === 'discounted') {
      const discountPrice = Number(form.discount_price);
      if (!Number.isFinite(discountPrice) || discountPrice <= 0) {
        setError('سعر الخصم يجب أن يكون رقمًا موجبًا.');
        return;
      }
      if (discountPrice >= price) {
        setError('سعر الخصم يجب أن يكون أقل من السعر الأصلي.');
        return;
      }
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = buildPayload(form);
      if (panelMode === 'edit' && editingCourse?.id) {
        await updateCourse(editingCourse.id, payload);
        setMessage('تم حفظ تعديلات الكورس بنجاح.');
      } else {
        await createCourse(payload);
        setMessage('تم إنشاء الكورس بنجاح.');
      }
      await load();
      closePanel();
    } catch (err) {
      setError(getApiError(err, 'تعذر حفظ الكورس.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleCourseStatus = async (course) => {
    setBusyId(`status-${course.id}`);
    setError('');
    setMessage('');
    try {
      await updateCourse(course.id, {
        ...buildPayload(toForm(course)),
        is_published: !isPublished(course),
      });
      setMessage(isPublished(course) ? 'تم تعطيل الكورس.' : 'تم تفعيل الكورس.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'تعذر تحديث حالة الكورس.'));
    } finally {
      setBusyId('');
    }
  };

  const softDelete = async (id) => {
    setBusyId(`delete-${id}`);
    setError('');
    setMessage('');
    try {
      await deleteCourse(id);
      setMessage('تم نقل الكورس إلى المحذوفات.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'تعذر حذف الكورس.'));
    } finally {
      setBusyId('');
    }
  };

  const restore = async (id) => {
    setBusyId(`restore-${id}`);
    setError('');
    setMessage('');
    try {
      await restoreCourse(id);
      setMessage('تم استرجاع الكورس.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'تعذر استرجاع الكورس.'));
    } finally {
      setBusyId('');
    }
  };

  const permanentDelete = async () => {
    setBusyId(`permanent-${confirmId}`);
    setError('');
    setMessage('');
    try {
      await permanentlyDeleteCourse(confirmId);
      setMessage('تم حذف الكورس نهائيًا.');
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(getApiError(err, 'تعذر حذف الكورس نهائيًا.'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="admin-page admin-courses-page">
      <div className="admin-page-toolbar"><PageBackLink to="/admin">العودة للوحة التحكم</PageBackLink></div>

      <section className="page-head admin-courses-head">
        <div>
          <p className="eyebrow">إدارة المحتوى</p>
          <h1>الكورسات</h1>
          <p>إدارة الكورسات الحالية، حالة النشر، الصورة، السعر، وبيانات العرض باستخدام نفس APIs الموجودة.</p>
        </div>
        <Button onClick={openCreatePanel}>إضافة كورس</Button>
      </section>

      <ErrorMessage message={error} />
      {message ? <div className="notice notice-success">{message}</div> : null}

      <section className="panel admin-course-filters" aria-label="فلاتر الكورسات">
        <Input
          label="بحث عن كورس"
          type="search"
          value={search}
          onChange={(event) => setSearchState({ source: searchParamValue, value: event.target.value })}
          placeholder="اسم الكورس أو المدرس"
        />
        <label className="field">
          <span>فلترة بالقسم</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">كل الأقسام</option>
            {categoryFilters.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="field">
          <span>فلترة بالحالة</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">كل الحالات</option>
            <option value="published">منشور</option>
            <option value="draft">غير منشور</option>
          </select>
        </label>
      </section>

      {loading ? <Loader label="جاري تحميل الكورسات..." /> : null}
      {!loading && filteredCourses.length === 0 ? <EmptyState title="لا توجد كورسات مطابقة" message="جرّب تغيير البحث أو الفلاتر." /> : null}

      {!loading && filteredCourses.length > 0 ? (
        <section className="table-card admin-courses-table-card">
          <table className="admin-courses-table">
            <thead>
              <tr>
                <th>الكورس</th>
                <th>القسم</th>
                <th>المدرس</th>
                <th>السعر</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course) => {
                const published = isPublished(course);
                return (
                  <tr key={course.id}>
                    <td>
                      <div className="admin-course-cell">
                        <img
                          src={course.thumbnail_url || fallbackImage}
                          alt=""
                          onError={(event) => { event.currentTarget.src = fallbackImage; }}
                        />
                        <div>
                          <strong>{getCourseTitle(course)}</strong>
                          {course.arabic_title ? <span>{course.arabic_title}</span> : null}
                        </div>
                      </div>
                    </td>
                    <td>{getCourseCategory(course)}</td>
                    <td>{course.instructor_name || 'غير محدد'}</td>
                    <td>
                      {isFreeCourse(course) ? (
                        <span className="admin-course-price-pill is-free">مجاني</span>
                      ) : hasCourseDiscount(course) ? (
                        <span className="admin-course-price-stack">
                          <del>{formatPrice(course.price)}</del>
                          <strong>{formatPrice(course.discount_price)}</strong>
                        </span>
                      ) : (
                        <strong>{formatPrice(course.price)}</strong>
                      )}
                    </td>
                    <td><Badge tone={published ? 'green' : 'amber'}>{published ? 'منشور' : 'غير منشور'}</Badge></td>
                    <td>{formatDate(course.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        <Link className="btn btn-secondary btn-sm" to={`/admin/courses/${course.id}/edit`}>عرض</Link>
                        <Button size="sm" variant="ghost" onClick={() => openEditPanel(course)}>تعديل</Button>
                        <Button size="sm" variant={published ? 'ghost' : 'secondary'} disabled={busyId === `status-${course.id}`} onClick={() => toggleCourseStatus(course)}>
                          {busyId === `status-${course.id}` ? 'جاري...' : published ? 'تعطيل' : 'تفعيل'}
                        </Button>
                        <Button size="sm" variant="danger" disabled={busyId === `delete-${course.id}`} onClick={() => softDelete(course.id)}>
                          {busyId === `delete-${course.id}` ? 'جاري...' : 'حذف'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="table-card admin-deleted-courses">
        <h2>الكورسات المحذوفة</h2>
        {deleted.length === 0 ? <p className="muted">لا توجد كورسات محذوفة.</p> : (
          <table>
            <thead><tr><th>الكورس</th><th>تاريخ الحذف</th><th>الإجراءات</th></tr></thead>
            <tbody>
              {deleted.map((course) => (
                <tr key={course.id}>
                  <td>{getCourseTitle(course)}</td>
                  <td>{formatDate(course.deleted_at)}</td>
                  <td className="table-actions">
                    <Button size="sm" variant="ghost" disabled={busyId === `restore-${course.id}`} onClick={() => restore(course.id)}>
                      {busyId === `restore-${course.id}` ? 'جاري...' : 'استرجاع'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setConfirmId(course.id)}>حذف نهائي</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {panelMode ? (
        <div className="admin-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closePanel(); }}>
          <aside className="admin-course-sheet" role="dialog" aria-modal="true" aria-labelledby="course-sheet-title">
            <div className="admin-sheet-head">
              <div>
                <p className="eyebrow">{panelMode === 'edit' ? `Course ID #${editingCourse?.id}` : 'كورس جديد'}</p>
                <h2 id="course-sheet-title">{panelMode === 'edit' ? 'تعديل كورس' : 'إضافة كورس'}</h2>
              </div>
              <Button variant="ghost" onClick={closePanel} disabled={saving}>إلغاء</Button>
            </div>

            <form className="admin-course-sheet-form" onSubmit={saveCourse}>
              <div className="admin-course-current-image">
                <img
                  src={form.thumbnail_url || fallbackImage}
                  alt="صورة الكورس الحالية"
                  onError={(event) => { event.currentTarget.src = fallbackImage; }}
                />
                <p>الصورة الحالية محفوظة كرابط `thumbnail_url`. لا يوجد API حالي لرفع صورة كورس كملف، لذلك سيظل الرابط القديم كما هو إذا لم تغيّره.</p>
              </div>

              <Input label="اسم الكورس" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              <Input label="العنوان العربي / الوصف المختصر" value={form.arabic_title} onChange={(event) => setForm({ ...form, arabic_title: event.target.value })} />
              <label className="field admin-field-wide">
                <span>وصف الكورس</span>
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="4" />
              </label>
              <Input label="رابط صورة الكورس" value={form.thumbnail_url} onChange={(event) => setForm({ ...form, thumbnail_url: event.target.value })} placeholder="/images/osha-course-cover.png أو https://..." />
              <label className="field">
                <span>اختيار صورة موجودة</span>
                <select value="" onChange={(event) => event.target.value && setForm({ ...form, thumbnail_url: event.target.value })}>
                  <option value="">اختر صورة</option>
                  {imageChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>نوع التسعير</span>
                <select
                  value={form.pricing_type}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    pricing_type: event.target.value,
                    price: event.target.value === 'free' ? '0' : current.price || '2000',
                    discount_price: event.target.value === 'discounted' ? current.discount_price : '',
                  }))}
                >
                  <option value="free">مجاني</option>
                  <option value="paid">مدفوع</option>
                  <option value="discounted">مدفوع مع خصم</option>
                </select>
              </label>
              <Input
                label="السعر الأصلي"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                disabled={form.pricing_type === 'free'}
              />
              {form.pricing_type === 'discounted' ? (
                <Input
                  label="سعر الخصم"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_price}
                  onChange={(event) => setForm({ ...form, discount_price: event.target.value })}
                />
              ) : null}
              <label className="btn btn-secondary file-btn admin-upload-button">
                {uploadingImage ? 'Uploading image...' : 'Upload course image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => handleImageUpload(event.target.files?.[0])}
                  disabled={uploadingImage}
                />
              </label>
              <label className="field">
                <span>Category</span>
                <select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}>
                  <option value="">No category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Instructor record</span>
                <select value={form.instructor_id} onChange={(event) => {
                  const selected = instructors.find((item) => String(item.id) === event.target.value);
                  setForm({
                    ...form,
                    instructor_id: event.target.value,
                    instructor_name: selected?.name || form.instructor_name,
                    instructor_subtitle: selected?.subtitle || form.instructor_subtitle,
                  });
                }}>
                  <option value="">Use manual instructor fields</option>
                  {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
                </select>
              </label>
              <div className="admin-field-wide admin-api-note">
                <strong>حقول الكورس المدعومة حاليا</strong>
                <p>الصورة كرابط، الاسم، العنوان العربي، الوصف، نوع التسعير، السعر الأصلي، سعر الخصم، المدرس، وصف المدرس، ترتيب العرض، وحالة النشر.</p>
                <p>القسم، المستوى، المدة، ورفع صورة كملف غير موجودة في API الكورسات الحالي، لذلك لا يتم إرسال حقول غير مدعومة.</p>
              </div>
              <Input label="المدرس" value={form.instructor_name} onChange={(event) => setForm({ ...form, instructor_name: event.target.value })} />
              <Input label="وصف المدرس / المستوى" value={form.instructor_subtitle} onChange={(event) => setForm({ ...form, instructor_subtitle: event.target.value })} />
              <Input label="ترتيب العرض" type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} />
              <label className="field admin-checkbox-field">
                <span>حالة الكورس</span>
                <select value={form.is_published ? 'published' : 'draft'} onChange={(event) => setForm({ ...form, is_published: event.target.value === 'published' })}>
                  <option value="published">منشور</option>
                  <option value="draft">غير منشور</option>
                </select>
              </label>

              <div className="admin-sheet-actions">
                <Button type="submit" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</Button>
                <Button variant="ghost" onClick={closePanel} disabled={saving}>إلغاء</Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="حذف الكورس نهائيًا"
        message="سيتم حذف الكورس والمحتوى المرتبط به نهائيًا. لا يمكن التراجع عن هذا الإجراء."
        danger
        confirmLabel={busyId === `permanent-${confirmId}` ? 'جاري الحذف...' : 'حذف نهائي'}
        onCancel={() => setConfirmId(null)}
        onConfirm={permanentDelete}
      />
    </main>
  );
};

export default CoursesPage;
