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
import { useAdminLanguage } from '../../context/AdminLanguageContext';

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
  { arLabel: 'غلاف كورس OSHA', enLabel: 'OSHA course cover', value: '/images/osha-course-cover.png' },
  { arLabel: 'غلاف كورس IOSH', enLabel: 'IOSH course cover', value: '/images/iosh-course-cover.png' },
  { arLabel: 'غلاف عام للسلامة', enLabel: 'General safety cover', value: '/images/cover of course.png' },
  { arLabel: 'خلفية السلامة الصناعية', enLabel: 'Industrial safety background', value: '/images/safety-industrial-bg.png' },
];

const copy = {
  ar: {
    back: 'العودة للوحة التحكم',
    eyebrow: 'إدارة المحتوى',
    title: 'الكورسات',
    description: 'إدارة الكورسات الحالية، حالة النشر، الصورة، السعر، وبيانات العرض باستخدام نفس APIs الموجودة.',
    addCourse: 'إضافة كورس',
    searchLabel: 'بحث عن كورس',
    searchPlaceholder: 'اسم الكورس أو المدرس',
    categoryFilter: 'فلترة بالقسم',
    statusFilter: 'فلترة بالحالة',
    allCategories: 'كل الأقسام',
    allStatuses: 'كل الحالات',
    published: 'منشور',
    draft: 'غير منشور',
    noMatchTitle: 'لا توجد كورسات مطابقة',
    noMatchMessage: 'جرّب تغيير البحث أو الفلاتر.',
    columns: {
      course: 'الكورس',
      category: 'القسم',
      instructor: 'المدرس',
      price: 'السعر',
      status: 'الحالة',
      createdAt: 'تاريخ الإنشاء',
      actions: 'الإجراءات',
    },
    deletedTitle: 'الكورسات المحذوفة',
    deletedEmpty: 'لا توجد كورسات محذوفة.',
    show: 'عرض',
    edit: 'تعديل',
    disable: 'تعطيل',
    enable: 'تفعيل',
    delete: 'حذف',
    restoring: 'جاري...',
      loading: 'جاري تحميل الكورسات...',
    form: {
      newCourse: 'كورس جديد',
      editCourse: 'تعديل كورس',
      addCourse: 'إضافة كورس',
      cancel: 'إلغاء',
      currentImage: 'الصورة الحالية محفوظة كرابط `thumbnail_url`. لا يوجد API حالي لرفع صورة كورس كملف، لذلك سيظل الرابط القديم كما هو إذا لم تغيّره.',
      title: 'اسم الكورس',
      arabicTitle: 'العنوان العربي / الوصف المختصر',
      description: 'وصف الكورس',
      imageUrl: 'رابط صورة الكورس',
      imageUrlPlaceholder: '/images/osha-course-cover.png أو https://...',
      chooseImage: 'اختيار صورة موجودة',
      chooseImageOption: 'اختر صورة',
      pricingType: 'نوع التسعير',
      free: 'مجاني',
      paid: 'مدفوع',
      discounted: 'مدفوع مع خصم',
      originalPrice: 'السعر الأصلي',
      freeNote: 'الكورس المجاني لا يحتاج إلى سعر.',
      discountPrice: 'سعر الخصم',
      uploadImage: 'رفع صورة الكورس',
      uploadingImage: 'جارٍ رفع الصورة...',
      category: 'القسم',
      noCategory: 'لا يوجد قسم',
      instructorRecord: 'سجل المدرس',
      manualInstructor: 'استخدام حقول المدرس اليدوية',
      supportedFieldsTitle: 'حقول الكورس المدعومة حاليًا',
      supportedFieldsText: 'الصورة كرابط، الاسم، العنوان العربي، الوصف، نوع التسعير، السعر الأصلي، سعر الخصم، المدرس، وصف المدرس، وحالة النشر.',
      supportedFieldsNote: 'القسم، المستوى، المدة، ورفع صورة كملف غير موجودة في API الكورسات الحالي، لذلك لا يتم إرسال حقول غير مدعومة.',
      teacher: 'المدرس',
      teacherSubtitle: 'وصف المدرس / المستوى',
      courseStatus: 'حالة الكورس',
      save: 'حفظ التعديلات',
      saving: 'جاري الحفظ...',
    },
    confirm: {
      title: 'حذف الكورس نهائيًا',
      message: 'سيتم حذف الكورس والمحتوى المرتبط به نهائيًا. لا يمكن التراجع عن هذا الإجراء.',
      confirm: 'حذف نهائي',
      deleting: 'جاري الحذف...',
    },
    messages: {
      saved: 'تم حفظ تعديلات الكورس بنجاح.',
      created: 'تم إنشاء الكورس بنجاح.',
      deleted: 'تم نقل الكورس إلى المحذوفات.',
      permanentlyDeleted: 'تم حذف الكورس نهائيًا.',
      restored: 'تم استرجاع الكورس.',
      disabled: 'تم تعطيل الكورس.',
      enabled: 'تم تفعيل الكورس.',
      orderSaved: 'تم حفظ ترتيب الكورسات بنجاح.',
      imageUploaded: 'تم رفع صورة الكورس. احفظ الكورس للاحتفاظ بها.',
    },
    errors: {
      load: 'تعذر تحميل الكورسات.',
      save: 'تعذر حفظ الكورس.',
      status: 'تعذر تحديث حالة الكورس.',
      delete: 'تعذر حذف الكورس.',
      restore: 'تعذر استرجاع الكورس.',
      permanent: 'تعذر حذف الكورس نهائيًا.',
      titleRequired: 'اسم الكورس مطلوب.',
      paidPrice: 'سعر الكورس المدفوع يجب أن يكون رقمًا موجبًا.',
      discountPrice: 'سعر الخصم يجب أن يكون رقمًا موجبًا.',
      discountLower: 'سعر الخصم يجب أن يكون أقل من السعر الأصلي.',
      invalidImage: 'يجب أن تكون صورة الكورس JPG أو PNG أو WEBP أو GIF.',
      imageSize: 'يجب ألا يتجاوز حجم صورة الكورس 5 ميجابايت.',
      upload: 'تعذر رفع صورة الكورس.',
      uploadError: 'تعذر رفع صورة الكورس.',
    },
  },
  en: {
    back: 'Back to Dashboard',
    eyebrow: 'Content management',
    title: 'Courses',
    description: 'Manage active courses, publishing state, images, pricing, and display metadata with the same APIs already in use.',
    addCourse: 'Add Course',
    searchLabel: 'Search courses',
    searchPlaceholder: 'Course name or instructor',
    categoryFilter: 'Filter by category',
    statusFilter: 'Filter by status',
    allCategories: 'All categories',
    allStatuses: 'All statuses',
    published: 'Published',
    draft: 'Draft',
    noMatchTitle: 'No matching courses',
    noMatchMessage: 'Try changing the search or filters.',
    columns: {
      course: 'Course',
      category: 'Category',
      instructor: 'Instructor',
      price: 'Price',
      status: 'Status',
      createdAt: 'Created at',
      actions: 'Actions',
    },
    deletedTitle: 'Deleted courses',
    deletedEmpty: 'No deleted courses.',
    show: 'Open',
    edit: 'Edit',
    disable: 'Disable',
    enable: 'Enable',
    delete: 'Delete',
    restoring: 'Working...',
    loading: 'Loading courses...',
    form: {
      newCourse: 'New course',
      editCourse: 'Edit course',
      addCourse: 'Add course',
      cancel: 'Cancel',
      currentImage: 'The current image is stored as `thumbnail_url`. There is no file upload API for course images yet, so the existing link stays in place unless you change it.',
      title: 'Course name',
      arabicTitle: 'Arabic title / short description',
      description: 'Course description',
      imageUrl: 'Course image URL',
      imageUrlPlaceholder: '/images/osha-course-cover.png or https://...',
      chooseImage: 'Choose an existing image',
      chooseImageOption: 'Choose image',
      pricingType: 'Pricing type',
      free: 'Free',
      paid: 'Paid',
      discounted: 'Paid with discount',
      originalPrice: 'Original price',
      freeNote: 'Free courses do not need a price.',
      discountPrice: 'Discount price',
      uploadImage: 'Upload course image',
      uploadingImage: 'Uploading image...',
      category: 'Category',
      noCategory: 'No category',
      instructorRecord: 'Instructor record',
      manualInstructor: 'Use manual instructor fields',
      supportedFieldsTitle: 'Supported course fields',
      supportedFieldsText: 'Image URL, name, Arabic title, description, pricing type, original price, discount price, instructor, instructor subtitle, and publishing state.',
      supportedFieldsNote: 'Category, level, duration, and file uploads are not exposed by the current course API, so unsupported fields are not sent.',
      teacher: 'Instructor',
      teacherSubtitle: 'Instructor subtitle / level',
      courseStatus: 'Course status',
      save: 'Save changes',
      saving: 'Saving...',
    },
    confirm: {
      title: 'Delete course permanently',
      message: 'This will permanently delete the course and all related content. This action cannot be undone.',
      confirm: 'Delete permanently',
      deleting: 'Deleting...',
    },
    messages: {
      saved: 'Course changes saved successfully.',
      created: 'Course created successfully.',
      deleted: 'Course moved to deleted items.',
      permanentlyDeleted: 'Course deleted permanently.',
      restored: 'Course restored.',
      disabled: 'Course disabled.',
      enabled: 'Course enabled.',
      orderSaved: 'Course order saved successfully.',
      imageUploaded: 'Course image uploaded. Save the course to keep it.',
    },
    errors: {
      load: 'Could not load courses.',
      save: 'Could not save the course.',
      status: 'Could not update course status.',
      delete: 'Could not delete the course.',
      restore: 'Could not restore the course.',
      permanent: 'Could not delete the course permanently.',
      titleRequired: 'Course name is required.',
      paidPrice: 'Paid course price must be a positive number.',
      discountPrice: 'Discount price must be a positive number.',
      discountLower: 'Discount price must be lower than the original price.',
      invalidImage: 'Course image must be JPG, PNG, WEBP, or GIF.',
      imageSize: 'Course image must be 5 MB or smaller.',
      upload: 'Could not upload course image.',
      uploadError: 'Could not upload course image.',
    },
  },
};

const formatDate = (value) => {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'غير متاح' : date.toLocaleDateString('ar-EG');
};

const isPublished = (course) => !(course?.is_published === false || course?.is_published === 0 || course?.is_published === '0');
const getCourseStatus = (course) => (isPublished(course) ? 'published' : 'draft');
const getCourseTitle = (course, language = 'ar') => course?.title || course?.arabic_title || (language === 'ar' ? 'كورس بدون اسم' : 'Untitled course');
const getCourseCategory = (course, language = 'ar') => course?.category || course?.category_name || course?.section || course?.section_name || (language === 'ar' ? 'غير مصنف' : 'Uncategorized');
const getPricingType = (course) => {
  const pricingType = String(course?.pricing_type || '').toLowerCase().trim();
  const price = Number(course?.price || 0);
  const discountPrice = Number(course?.discount_price);
  if (pricingType === 'free') return 'free';
  if (pricingType === 'discounted') return 'discounted';
  if (pricingType === 'paid' && Number.isFinite(discountPrice) && discountPrice > 0 && discountPrice < price) return 'discounted';
  if (pricingType === 'paid') return 'paid';
  if (price <= 0) return 'free';
  return 'paid';
};
const isFreeCourse = (course) => getPricingType(course) === 'free' || Number(course?.price || 0) <= 0;
const hasCourseDiscount = (course) => getPricingType(course) === 'discounted' && Number(course?.discount_price) > 0;
const sortCoursesByOrder = (items) => [...items].sort((left, right) => {
  const leftOrder = Number(left?.display_order ?? 0);
  const rightOrder = Number(right?.display_order ?? 0);
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return Number(left?.id ?? 0) - Number(right?.id ?? 0);
});
const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
};

const resolvePricingType = (form) => {
  const requestedType = String(form?.pricing_type || '').toLowerCase().trim();
  const price = Number(form?.price || 0);
  const discountPrice = Number(form?.discount_price);
  const hasValidDiscount = requestedType !== 'free'
    && Number.isFinite(price)
    && price > 0
    && Number.isFinite(discountPrice)
    && discountPrice > 0
    && discountPrice < price;

  if (requestedType === 'free') return 'free';
  if (hasValidDiscount || requestedType === 'discounted') return 'discounted';
  return 'paid';
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
  discount_price: resolvePricingType(form) === 'discounted' ? Number(form.discount_price) : null,
  pricing_type: resolvePricingType(form),
  is_published: Boolean(form.is_published),
  display_order: Number(form.display_order) || 0,
});

const CoursesPage = () => {
  const { language } = useAdminLanguage();
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
  const [draggedCourseId, setDraggedCourseId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const text = copy[language] || copy.ar;

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
      setCourses(sortCoursesByOrder(Array.isArray(activeCourses) ? activeCourses.filter((course) => !course?.deleted_at) : []));
      setDeleted(Array.isArray(deletedCourses) ? deletedCourses : []);
      setCategories(Array.isArray(categoryRows) ? categoryRows : []);
      setInstructors(Array.isArray(instructorRows) ? instructorRows : []);
    } catch (err) {
      setError(getApiError(err, text.errors.load));
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
        setCourses(sortCoursesByOrder(Array.isArray(activeCourses) ? activeCourses.filter((course) => !course?.deleted_at) : []));
        setDeleted(Array.isArray(deletedCourses) ? deletedCourses : []);
        setCategories(Array.isArray(categoryRows) ? categoryRows : []);
        setInstructors(Array.isArray(instructorRows) ? instructorRows : []);
      } catch (err) {
        if (active) setError(getApiError(err, text.errors.load));
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

  const orderedCourses = useMemo(() => sortCoursesByOrder(courses), [courses]);

  const categoryFilters = useMemo(() => {
    const values = orderedCourses.map((course) => getCourseCategory(course, language)).filter(Boolean);
    return [...new Set(values)];
  }, [language, orderedCourses]);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orderedCourses.filter((course) => {
      const status = getCourseStatus(course);
      const category = getCourseCategory(course, language);
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
  }, [categoryFilter, language, orderedCourses, search, statusFilter]);

  const persistCourseOrder = async (nextCourses) => {
    setError('');
    setMessage('');
    try {
      await Promise.all(nextCourses.map((course, index) => updateCourse(course.id, {
        ...buildPayload(toForm(course)),
        display_order: index,
      })));
      setCourses(nextCourses.map((course, index) => ({ ...course, display_order: index })));
      setMessage(text.messages.orderSaved);
    } catch (err) {
      setError(getApiError(err, text.errors.save));
      await load();
    } finally {
      setDraggedCourseId('');
    }
  };

  const moveCourse = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const sourceIndex = orderedCourses.findIndex((course) => String(course.id) === String(sourceId));
    const targetIndex = orderedCourses.findIndex((course) => String(course.id) === String(targetId));
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextCourses = [...orderedCourses];
    const [movedCourse] = nextCourses.splice(sourceIndex, 1);
    nextCourses.splice(targetIndex, 0, movedCourse);
    await persistCourseOrder(nextCourses);
  };

  const handleDragStart = (courseId) => {
    setDraggedCourseId(String(courseId));
  };

  const handleDrop = async (courseId) => {
    if (!draggedCourseId) return;
    await moveCourse(draggedCourseId, courseId);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError(text.errors.invalidImage);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(text.errors.imageSize);
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
      setMessage(text.messages.imageUploaded);
    } catch (err) {
      setError(getApiError(err, text.errors.upload));
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreatePanel = () => {
    setPanelMode('create');
    setEditingCourse(null);
    const nextDisplayOrder = (courses.reduce((maxOrder, course) => Math.max(maxOrder, Number(course.display_order || 0)), 0)) + 1;
    setForm({ ...blankCourse, display_order: String(nextDisplayOrder) });
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
      setError(text.errors.titleRequired);
      return;
    }
    const price = Number(form.price);
    const pricingType = resolvePricingType(form);
    if (pricingType !== 'free' && (!Number.isFinite(price) || price <= 0)) {
      setError(text.errors.paidPrice);
      return;
    }
    if (pricingType === 'discounted') {
      const discountPrice = Number(form.discount_price);
      if (!Number.isFinite(discountPrice) || discountPrice <= 0) {
        setError(text.errors.discountPrice);
        return;
      }
      if (discountPrice >= price) {
        setError(text.errors.discountLower);
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
        setMessage(text.messages.saved);
      } else {
        await createCourse(payload);
        setMessage(text.messages.created);
      }
      await load();
      closePanel();
    } catch (err) {
      setError(getApiError(err, text.errors.save));
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
      setMessage(isPublished(course) ? text.messages.disabled : text.messages.enabled);
      await load();
    } catch (err) {
      setError(getApiError(err, text.errors.status));
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
      setMessage(text.messages.deleted);
      await load();
    } catch (err) {
      setError(getApiError(err, text.errors.delete));
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
      setMessage(text.messages.restored);
      await load();
    } catch (err) {
      setError(getApiError(err, text.errors.restore));
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
      setMessage(text.messages.permanentlyDeleted);
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(getApiError(err, text.errors.permanent));
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="admin-page admin-courses-page">
      <div className="admin-page-toolbar"><PageBackLink to="/admin">{text.back}</PageBackLink></div>

      <section className="page-head admin-courses-head">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p>{text.description}</p>
        </div>
        <Button onClick={openCreatePanel}>{text.addCourse}</Button>
      </section>

      <ErrorMessage message={error} />
      {message ? <div className="notice notice-success">{message}</div> : null}

      <section className="panel admin-course-filters" aria-label="فلاتر الكورسات">
        <Input
          label={text.searchLabel}
          type="search"
          value={search}
          onChange={(event) => setSearchState({ source: searchParamValue, value: event.target.value })}
          placeholder={text.searchPlaceholder}
        />
        <label className="field">
          <span>{text.categoryFilter}</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">{text.allCategories}</option>
            {categoryFilters.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{text.statusFilter}</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{text.allStatuses}</option>
            <option value="published">{text.published}</option>
            <option value="draft">{text.draft}</option>
          </select>
        </label>
      </section>

      {loading ? <Loader label={text.loading} /> : null}
      {!loading && filteredCourses.length === 0 ? <EmptyState title={text.noMatchTitle} message={text.noMatchMessage} /> : null}

      {!loading && filteredCourses.length > 0 ? (
        <section className="table-card admin-courses-table-card">
          <table className="admin-courses-table">
            <thead>
              <tr>
                <th>{text.columns.course}</th>
                <th>{text.columns.category}</th>
                <th>{text.columns.instructor}</th>
                <th>{text.columns.price}</th>
                <th>{text.columns.status}</th>
                <th>{text.columns.createdAt}</th>
                <th>{text.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course) => {
                const published = isPublished(course);
                return (
                  <tr
                    key={course.id}
                    draggable
                    className={draggedCourseId === String(course.id) ? 'is-dragging' : ''}
                    onDragStart={() => handleDragStart(course.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(course.id)}
                    onDragEnd={() => setDraggedCourseId('')}
                  >
                    <td>
                      <div className="admin-course-cell">
                        <span className="admin-course-drag-handle" aria-hidden="true">⋮⋮</span>
                        <img
                          src={course.thumbnail_url || fallbackImage}
                          alt=""
                          onError={(event) => { event.currentTarget.src = fallbackImage; }}
                        />
                        <div>
                          <strong>{getCourseTitle(course, language)}</strong>
                          {course.arabic_title ? <span>{course.arabic_title}</span> : null}
                        </div>
                      </div>
                    </td>
                    <td>{getCourseCategory(course, language)}</td>
                    <td>{course.instructor_name || (language === 'ar' ? 'غير محدد' : 'Unspecified')}</td>
                    <td>
                      {isFreeCourse(course) ? (
                        <span className="admin-course-price-pill is-free">{text.form.free}</span>
                      ) : hasCourseDiscount(course) ? (
                        <span className="admin-course-price-stack">
                          <del>{formatPrice(course.price)}</del>
                          <strong>{formatPrice(course.discount_price)}</strong>
                        </span>
                      ) : (
                        <strong>{formatPrice(course.price)}</strong>
                      )}
                    </td>
                    <td><Badge tone={published ? 'green' : 'amber'}>{published ? text.published : text.draft}</Badge></td>
                    <td>{formatDate(course.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        <Link className="btn btn-secondary btn-sm" to={`/admin/courses/${course.id}/edit`}>{text.show}</Link>
                        <Button size="sm" variant="ghost" onClick={() => openEditPanel(course)}>{text.edit}</Button>
                        <Button size="sm" variant={published ? 'ghost' : 'secondary'} disabled={busyId === `status-${course.id}`} onClick={() => toggleCourseStatus(course)}>
                          {busyId === `status-${course.id}` ? text.restoring : published ? text.disable : text.enable}
                        </Button>
                        <Button size="sm" variant="danger" disabled={busyId === `delete-${course.id}`} onClick={() => softDelete(course.id)}>
                          {busyId === `delete-${course.id}` ? text.restoring : text.delete}
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
        <h2>{text.deletedTitle}</h2>
        {deleted.length === 0 ? <p className="muted">{text.deletedEmpty}</p> : (
          <table>
            <thead><tr><th>{text.columns.course}</th><th>{language === 'ar' ? 'تاريخ الحذف' : 'Deleted at'}</th><th>{text.columns.actions}</th></tr></thead>
            <tbody>
              {deleted.map((course) => (
                <tr key={course.id}>
                  <td>{getCourseTitle(course, language)}</td>
                  <td>{formatDate(course.deleted_at)}</td>
                  <td className="table-actions">
                    <Button size="sm" variant="ghost" disabled={busyId === `restore-${course.id}`} onClick={() => restore(course.id)}>
                      {busyId === `restore-${course.id}` ? text.restoring : (language === 'ar' ? 'استرجاع' : 'Restore')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setConfirmId(course.id)}>{language === 'ar' ? 'حذف نهائي' : 'Delete permanently'}</Button>
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
                <p className="eyebrow">{panelMode === 'edit' ? `${language === 'ar' ? 'كورس رقم' : 'Course ID'} #${editingCourse?.id}` : text.form.newCourse}</p>
                <h2 id="course-sheet-title">{panelMode === 'edit' ? text.form.editCourse : text.form.addCourse}</h2>
              </div>
              <Button variant="ghost" onClick={closePanel} disabled={saving}>{text.form.cancel}</Button>
            </div>

            <form className="admin-course-sheet-form" onSubmit={saveCourse}>
              <div className="admin-course-current-image">
                <img
                  src={form.thumbnail_url || fallbackImage}
                  alt={language === 'ar' ? 'صورة الكورس الحالية' : 'Current course image'}
                  onError={(event) => { event.currentTarget.src = fallbackImage; }}
                />
                <p>{text.form.currentImage}</p>
              </div>

              <Input label={text.form.title} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              <Input label={text.form.arabicTitle} value={form.arabic_title} onChange={(event) => setForm({ ...form, arabic_title: event.target.value })} />
              <label className="field admin-field-wide">
                <span>{text.form.description}</span>
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="4" />
              </label>
              <Input label={text.form.imageUrl} value={form.thumbnail_url} onChange={(event) => setForm({ ...form, thumbnail_url: event.target.value })} placeholder={text.form.imageUrlPlaceholder} />
              <label className="field">
                <span>{text.form.chooseImage}</span>
                <select value="" onChange={(event) => event.target.value && setForm({ ...form, thumbnail_url: event.target.value })}>
                  <option value="">{text.form.chooseImageOption}</option>
                  {imageChoices.map((choice) => <option key={choice.value} value={choice.value}>{language === 'ar' ? choice.arLabel : choice.enLabel}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{text.form.pricingType}</span>
                <select
                  value={form.pricing_type}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    pricing_type: event.target.value,
                    price: event.target.value === 'free' ? '0' : current.price || '2000',
                    discount_price: event.target.value === 'discounted' ? current.discount_price : '',
                  }))}
                >
                  <option value="free">{text.form.free}</option>
                  <option value="paid">{text.form.paid}</option>
                  <option value="discounted">{text.form.discounted}</option>
                </select>
              </label>
              {form.pricing_type !== 'free' ? (
                <Input
                  label={text.form.originalPrice}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                />
              ) : (
                <div className="admin-course-free-note">{text.form.freeNote}</div>
              )}
              {form.pricing_type === 'discounted' ? (
                <Input
                  label={text.form.discountPrice}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_price}
                  onChange={(event) => setForm({ ...form, discount_price: event.target.value })}
                />
              ) : null}
              <label className="btn btn-secondary file-btn admin-upload-button">
                {uploadingImage ? text.form.uploadingImage : text.form.uploadImage}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => handleImageUpload(event.target.files?.[0])}
                  disabled={uploadingImage}
                />
              </label>
              <label className="field">
                <span>{text.form.category}</span>
                <select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}>
                  <option value="">{text.form.noCategory}</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{language === 'ar' ? (category.arabic_name || category.name) : category.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{text.form.instructorRecord}</span>
                <select value={form.instructor_id} onChange={(event) => {
                  const selected = instructors.find((item) => String(item.id) === event.target.value);
                  setForm({
                    ...form,
                    instructor_id: event.target.value,
                    instructor_name: selected?.name || form.instructor_name,
                    instructor_subtitle: selected?.subtitle || form.instructor_subtitle,
                  });
                }}>
                  <option value="">{text.form.manualInstructor}</option>
                  {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{language === 'ar' ? (instructor.arabic_name || instructor.name) : instructor.name}</option>)}
                </select>
              </label>
              <div className="admin-field-wide admin-api-note">
                <strong>{text.form.supportedFieldsTitle}</strong>
                <p>{text.form.supportedFieldsText}</p>
                <p>{text.form.supportedFieldsNote}</p>
              </div>
              <Input label={text.form.teacher} value={form.instructor_name} onChange={(event) => setForm({ ...form, instructor_name: event.target.value })} />
              <Input label={text.form.teacherSubtitle} value={form.instructor_subtitle} onChange={(event) => setForm({ ...form, instructor_subtitle: event.target.value })} />
              <label className="field admin-checkbox-field">
                <span>{text.form.courseStatus}</span>
                <select value={form.is_published ? 'published' : 'draft'} onChange={(event) => setForm({ ...form, is_published: event.target.value === 'published' })}>
                  <option value="published">{text.published}</option>
                  <option value="draft">{text.draft}</option>
                </select>
              </label>

              <div className="admin-sheet-actions">
                <Button type="submit" disabled={saving}>{saving ? text.form.saving : text.form.save}</Button>
                <Button variant="ghost" onClick={closePanel} disabled={saving}>{text.form.cancel}</Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmId)}
        title={text.confirm.title}
        message={text.confirm.message}
        danger
        confirmLabel={busyId === `permanent-${confirmId}` ? text.confirm.deleting : text.confirm.confirm}
        onCancel={() => setConfirmId(null)}
        onConfirm={permanentDelete}
      />
    </main>
  );
};

export default CoursesPage;
