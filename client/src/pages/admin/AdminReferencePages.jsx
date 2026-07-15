import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createCategory,
  createCoupon,
  createInstructor,
  deleteCategory,
  deleteCoupon,
  deleteInstructor,
  getAdminCategories,
  getAdminCoupons,
  getAdminCourses,
  getAdminInstructors,
  updateCategory,
  updateCoupon,
  updateInstructor,
} from '../../api/adminApi';
import { getAdminUsers } from '../../api/adminUsersApi';
import { getApiError } from '../../api/client';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Input from '../../components/Input';
import Loader from '../../components/Loader';
import StatCard from '../../components/StatCard';
import { useAdminLanguage } from '../../context/AdminLanguageContext';

const fallbackImage = '/images/cover of course.png';

const blankCategory = { name: '', arabic_name: '', description: '', display_order: '0', is_active: true };
const blankInstructor = { name: '', arabic_name: '', subtitle: '', bio: '', avatar_url: '', email: '', is_active: true };
const blankCoupon = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: '',
  max_uses: '',
  starts_at: '',
  expires_at: '',
  is_active: true,
};

const asBool = (value) => value === true || value === 1 || value === '1';
const getCourseTitle = (course) => course?.title || course?.arabic_title || `Course ${course?.id || ''}`;
const getInstructor = (course) => course?.linked_instructor_name || course?.instructor_name || course?.instructor || 'Unassigned';

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const useCrud = ({ loader, blank, toForm = (item) => item, toPayload = (form) => form, createItem, updateItem, deleteItem, messages }) => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loader();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getApiError(err, messages.load));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loader()
      .then((data) => {
        if (active) setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setError(getApiError(err, messages.load));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loader, messages.load]);

  const reset = () => {
    setForm(blank);
    setEditing(null);
  };

  const startEdit = (item) => {
    setEditing(item);
    setForm(toForm(item));
    setError('');
    setMessage('');
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editing?.id) await updateItem(editing.id, toPayload(form));
      else await createItem(toPayload(form));
      setMessage(editing?.id ? messages.updated : messages.created);
      reset();
      await load();
    } catch (err) {
      setError(getApiError(err, messages.save));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(messages.confirm(item))) return;
    setBusyId(String(item.id));
    setError('');
    setMessage('');
    try {
      await deleteItem(item.id);
      setMessage(messages.deleted);
      await load();
    } catch (err) {
      setError(getApiError(err, messages.delete));
    } finally {
      setBusyId('');
    }
  };

  return { items, form, setForm, editing, loading, saving, busyId, error, message, load, reset, startEdit, save, remove };
};

export const AdminCategoriesPage = () => {
  const { language } = useAdminLanguage();
  const crud = useCrud({
    loader: getAdminCategories,
    blank: blankCategory,
    toForm: (item) => ({
      name: item.name || '',
      arabic_name: item.arabic_name || '',
      description: item.description || '',
      display_order: item.display_order ?? '0',
      is_active: asBool(item.is_active),
    }),
    toPayload: (form) => ({
      ...form,
      name: form.name.trim(),
      arabic_name: form.arabic_name.trim(),
      description: form.description.trim(),
      display_order: Number(form.display_order) || 0,
      is_active: Boolean(form.is_active),
    }),
    createItem: createCategory,
    updateItem: updateCategory,
    deleteItem: deleteCategory,
    messages: {
      load: 'Could not load categories.',
      save: 'Could not save category.',
      delete: 'Could not delete category.',
      created: 'Category created.',
      updated: 'Category updated.',
      deleted: 'Category deleted.',
      confirm: (item) => `Delete "${item.name}"? Courses must be moved first.`,
    },
  });

  const text = language === 'ar'
    ? { eyebrow: 'Taxonomy', title: 'Categories', subtitle: 'Manage real course categories from the backend API.', add: 'Add Category', edit: 'Edit Category' }
    : { eyebrow: 'Taxonomy', title: 'Categories', subtitle: 'Manage real course categories from the backend API.', add: 'Add Category', edit: 'Edit Category' };

  return (
    <main className="admin-page admin-reference-page">
      <section className="page-head">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <Badge tone="green">CRUD ready</Badge>
      </section>
      <ErrorMessage message={crud.error} />
      {crud.message ? <div className="notice notice-success">{crud.message}</div> : null}
      <section className="stats-grid">
        <StatCard label="Categories" value={crud.items.length} helper="Backend records" />
        <StatCard label="Linked Courses" value={crud.items.reduce((sum, item) => sum + Number(item.course_count || 0), 0)} helper="Active courses" tone="navy" />
      </section>
      <section className="admin-reference-layout">
        <form className="panel admin-content-form" onSubmit={crud.save}>
          <div>
            <p className="eyebrow">{crud.editing ? `ID #${crud.editing.id}` : 'New record'}</p>
            <h2>{crud.editing ? text.edit : text.add}</h2>
          </div>
          <Input label="Name" value={crud.form.name} onChange={(event) => crud.setForm({ ...crud.form, name: event.target.value })} required />
          <Input label="Arabic name" value={crud.form.arabic_name} onChange={(event) => crud.setForm({ ...crud.form, arabic_name: event.target.value })} />
          <label className="field">
            <span>Description</span>
            <textarea value={crud.form.description} onChange={(event) => crud.setForm({ ...crud.form, description: event.target.value })} />
          </label>
          <Input label="Display order" type="number" value={crud.form.display_order} onChange={(event) => crud.setForm({ ...crud.form, display_order: event.target.value })} />
          <label className="field admin-checkbox-field">
            <span>Active</span>
            <input type="checkbox" checked={crud.form.is_active} onChange={(event) => crud.setForm({ ...crud.form, is_active: event.target.checked })} />
          </label>
          <div className="form-actions">
            <Button type="submit" disabled={crud.saving}>{crud.saving ? 'Saving...' : 'Save'}</Button>
            {crud.editing ? <Button variant="ghost" onClick={crud.reset}>Cancel</Button> : null}
          </div>
        </form>
        <section className="table-card">
          {crud.loading ? <Loader label="Loading categories..." /> : null}
          {!crud.loading && crud.items.length === 0 ? <EmptyState title="No categories" message="Create the first category to classify courses." /> : null}
          {!crud.loading && crud.items.length > 0 ? (
            <table>
              <thead><tr><th>Name</th><th>Courses</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{crud.items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong>{item.arabic_name ? <span className="muted block">{item.arabic_name}</span> : null}</td>
                  <td>{item.course_count || 0}</td>
                  <td><Badge tone={asBool(item.is_active) ? 'green' : 'amber'}>{asBool(item.is_active) ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="table-actions"><Button size="sm" variant="ghost" onClick={() => crud.startEdit(item)}>Edit</Button><Button size="sm" variant="danger" disabled={crud.busyId === String(item.id)} onClick={() => crud.remove(item)}>{crud.busyId === String(item.id) ? 'Deleting...' : 'Delete'}</Button></td>
                </tr>
              ))}</tbody>
            </table>
          ) : null}
        </section>
      </section>
    </main>
  );
};

export const AdminInstructorsPage = () => {
  const crud = useCrud({
    loader: getAdminInstructors,
    blank: blankInstructor,
    toForm: (item) => ({
      name: item.name || '',
      arabic_name: item.arabic_name || '',
      subtitle: item.subtitle || '',
      bio: item.bio || '',
      avatar_url: item.avatar_url || '',
      email: item.email || '',
      is_active: asBool(item.is_active),
    }),
    toPayload: (form) => ({ ...form, name: form.name.trim(), is_active: Boolean(form.is_active) }),
    createItem: createInstructor,
    updateItem: updateInstructor,
    deleteItem: deleteInstructor,
    messages: {
      load: 'Could not load instructors.',
      save: 'Could not save instructor.',
      delete: 'Could not delete instructor.',
      created: 'Instructor created.',
      updated: 'Instructor updated.',
      deleted: 'Instructor deleted.',
      confirm: (item) => `Delete "${item.name}"? Courses must be moved first.`,
    },
  });

  return (
    <main className="admin-page admin-reference-page">
      <section className="page-head"><div><p className="eyebrow">Teaching team</p><h1>Instructors</h1><p>Create instructors and link them to courses from the course editor.</p></div><Badge tone="green">CRUD ready</Badge></section>
      <ErrorMessage message={crud.error} />
      {crud.message ? <div className="notice notice-success">{crud.message}</div> : null}
      <section className="admin-reference-layout">
        <form className="panel admin-content-form" onSubmit={crud.save}>
          <div><p className="eyebrow">{crud.editing ? `ID #${crud.editing.id}` : 'New record'}</p><h2>{crud.editing ? 'Edit Instructor' : 'Add Instructor'}</h2></div>
          <Input label="Name" value={crud.form.name} onChange={(event) => crud.setForm({ ...crud.form, name: event.target.value })} required />
          <Input label="Arabic name" value={crud.form.arabic_name} onChange={(event) => crud.setForm({ ...crud.form, arabic_name: event.target.value })} />
          <Input label="Subtitle" value={crud.form.subtitle} onChange={(event) => crud.setForm({ ...crud.form, subtitle: event.target.value })} />
          <Input label="Email" type="email" value={crud.form.email} onChange={(event) => crud.setForm({ ...crud.form, email: event.target.value })} />
          <Input label="Avatar URL" value={crud.form.avatar_url} onChange={(event) => crud.setForm({ ...crud.form, avatar_url: event.target.value })} />
          <label className="field"><span>Bio</span><textarea value={crud.form.bio} onChange={(event) => crud.setForm({ ...crud.form, bio: event.target.value })} /></label>
          <label className="field admin-checkbox-field"><span>Active</span><input type="checkbox" checked={crud.form.is_active} onChange={(event) => crud.setForm({ ...crud.form, is_active: event.target.checked })} /></label>
          <div className="form-actions"><Button type="submit" disabled={crud.saving}>{crud.saving ? 'Saving...' : 'Save'}</Button>{crud.editing ? <Button variant="ghost" onClick={crud.reset}>Cancel</Button> : null}</div>
        </form>
        <section className="table-card">
          {crud.loading ? <Loader label="Loading instructors..." /> : null}
          {!crud.loading && crud.items.length === 0 ? <EmptyState title="No instructors" message="Create the first instructor." /> : null}
          {!crud.loading && crud.items.length > 0 ? (
            <table><thead><tr><th>Instructor</th><th>Courses</th><th>Status</th><th>Actions</th></tr></thead><tbody>{crud.items.map((item) => (
              <tr key={item.id}><td><strong>{item.name}</strong><span className="muted block">{item.subtitle || item.email || 'No subtitle'}</span></td><td>{item.course_count || 0}</td><td><Badge tone={asBool(item.is_active) ? 'green' : 'amber'}>{asBool(item.is_active) ? 'Active' : 'Inactive'}</Badge></td><td className="table-actions"><Button size="sm" variant="ghost" onClick={() => crud.startEdit(item)}>Edit</Button><Button size="sm" variant="danger" disabled={crud.busyId === String(item.id)} onClick={() => crud.remove(item)}>{crud.busyId === String(item.id) ? 'Deleting...' : 'Delete'}</Button></td></tr>
            ))}</tbody></table>
          ) : null}
        </section>
      </section>
    </main>
  );
};

export const AdminLecturesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAdminCourses()
      .then((data) => {
        if (active) setCourses(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setError(getApiError(err, 'Could not load courses.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="admin-page admin-reference-page">
      <section className="page-head"><div><p className="eyebrow">Course content</p><h1>Lectures</h1><p>Lectures are managed through each course builder.</p></div></section>
      <ErrorMessage message={error} />
      {loading ? <Loader label="Loading courses..." /> : null}
      {!loading ? (
        <section className="table-card">
          {courses.length === 0 ? <EmptyState title="No courses available" message="Create a course first, then manage its lectures." /> : (
            <table><thead><tr><th>Course</th><th>Instructor</th><th>Action</th></tr></thead><tbody>{courses.map((course) => (
              <tr key={course.id}><td><div className="admin-course-cell"><img src={course.thumbnail_url || fallbackImage} alt="" onError={(event) => { event.currentTarget.src = fallbackImage; }} /><strong>{getCourseTitle(course)}</strong></div></td><td>{getInstructor(course)}</td><td><Link className="btn btn-secondary btn-sm" to={`/admin/courses/${course.id}/edit`}>Manage lectures</Link></td></tr>
            ))}</tbody></table>
          )}
        </section>
      ) : null}
    </main>
  );
};

export const AdminCouponsPage = () => {
  const crud = useCrud({
    loader: getAdminCoupons,
    blank: blankCoupon,
    toForm: (item) => ({
      code: item.code || '',
      description: item.description || '',
      discount_type: item.discount_type || 'percent',
      discount_value: item.discount_value ?? '',
      max_uses: item.max_uses ?? '',
      starts_at: toDateInput(item.starts_at),
      expires_at: toDateInput(item.expires_at),
      is_active: asBool(item.is_active),
    }),
    toPayload: (form) => ({
      ...form,
      code: form.code.trim(),
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      is_active: Boolean(form.is_active),
    }),
    createItem: createCoupon,
    updateItem: updateCoupon,
    deleteItem: deleteCoupon,
    messages: {
      load: 'Could not load coupons.',
      save: 'Could not save coupon.',
      delete: 'Could not delete coupon.',
      created: 'Coupon created.',
      updated: 'Coupon updated.',
      deleted: 'Coupon deleted.',
      confirm: (item) => `Delete coupon "${item.code}"?`,
    },
  });

  const activeCount = useMemo(() => crud.items.filter((item) => asBool(item.is_active)).length, [crud.items]);

  return (
    <main className="admin-page admin-reference-page">
      <section className="page-head"><div><p className="eyebrow">Commercial tools</p><h1>Coupons</h1><p>Create, edit, deactivate, and delete real backend coupons.</p></div><Badge tone="green">CRUD ready</Badge></section>
      <ErrorMessage message={crud.error} />
      {crud.message ? <div className="notice notice-success">{crud.message}</div> : null}
      <section className="stats-grid"><StatCard label="Coupons" value={crud.items.length} helper="Total records" /><StatCard label="Active" value={activeCount} helper="Available now" tone="green" /></section>
      <section className="admin-reference-layout">
        <form className="panel admin-content-form" onSubmit={crud.save}>
          <div><p className="eyebrow">{crud.editing ? `ID #${crud.editing.id}` : 'New coupon'}</p><h2>{crud.editing ? 'Edit Coupon' : 'Add Coupon'}</h2></div>
          <Input label="Code" value={crud.form.code} onChange={(event) => crud.setForm({ ...crud.form, code: event.target.value })} required />
          <Input label="Description" value={crud.form.description} onChange={(event) => crud.setForm({ ...crud.form, description: event.target.value })} />
          <label className="field"><span>Discount type</span><select value={crud.form.discount_type} onChange={(event) => crud.setForm({ ...crud.form, discount_type: event.target.value })}><option value="percent">Percent</option><option value="fixed">Fixed amount</option></select></label>
          <Input label="Discount value" type="number" min="0" step="0.01" value={crud.form.discount_value} onChange={(event) => crud.setForm({ ...crud.form, discount_value: event.target.value })} required />
          <Input label="Max uses" type="number" min="1" value={crud.form.max_uses} onChange={(event) => crud.setForm({ ...crud.form, max_uses: event.target.value })} />
          <Input label="Starts at" type="date" value={crud.form.starts_at} onChange={(event) => crud.setForm({ ...crud.form, starts_at: event.target.value })} />
          <Input label="Expires at" type="date" value={crud.form.expires_at} onChange={(event) => crud.setForm({ ...crud.form, expires_at: event.target.value })} />
          <label className="field admin-checkbox-field"><span>Active</span><input type="checkbox" checked={crud.form.is_active} onChange={(event) => crud.setForm({ ...crud.form, is_active: event.target.checked })} /></label>
          <div className="form-actions"><Button type="submit" disabled={crud.saving}>{crud.saving ? 'Saving...' : 'Save'}</Button>{crud.editing ? <Button variant="ghost" onClick={crud.reset}>Cancel</Button> : null}</div>
        </form>
        <section className="table-card">
          {crud.loading ? <Loader label="Loading coupons..." /> : null}
          {!crud.loading && crud.items.length === 0 ? <EmptyState title="No coupons" message="Create a coupon when discounts are in scope." /> : null}
          {!crud.loading && crud.items.length > 0 ? (
            <table><thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Status</th><th>Actions</th></tr></thead><tbody>{crud.items.map((item) => (
              <tr key={item.id}><td><strong>{item.code}</strong><span className="muted block">{item.description || 'No description'}</span></td><td>{item.discount_type === 'percent' ? `${item.discount_value}%` : item.discount_value}</td><td>{item.used_count || 0}{item.max_uses ? ` / ${item.max_uses}` : ''}</td><td><Badge tone={asBool(item.is_active) ? 'green' : 'amber'}>{asBool(item.is_active) ? 'Active' : 'Inactive'}</Badge></td><td className="table-actions"><Button size="sm" variant="ghost" onClick={() => crud.startEdit(item)}>Edit</Button><Button size="sm" variant="danger" disabled={crud.busyId === String(item.id)} onClick={() => crud.remove(item)}>{crud.busyId === String(item.id) ? 'Deleting...' : 'Delete'}</Button></td></tr>
            ))}</tbody></table>
          ) : null}
        </section>
      </section>
    </main>
  );
};

export const AdminUsersByRolePage = ({ role }) => {
  const { language } = useAdminLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAdminUsers()
      .then((data) => {
        if (active) setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setError(getApiError(err, 'Could not load users.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rows = users.filter((user) => String(user.role || '').toLowerCase() === role);
  const title = role === 'instructor' || role === 'teacher' ? 'Instructors' : role;

  return (
    <main className="admin-page admin-reference-page">
      <section className="page-head"><div><p className="eyebrow">Accounts</p><h1>{title}</h1><p>Real accounts from the current users API.</p></div></section>
      <ErrorMessage message={error} />
      {loading ? <Loader label="Loading users..." /> : null}
      {!loading ? (
        <section className="table-card">
          {rows.length === 0 ? <EmptyState title="No accounts found" message="There are no accounts with this role in current data." /> : (
            <table><thead><tr><th>ID</th><th>{language === 'ar' ? 'Name' : 'Name'}</th><th>Email</th><th>Role</th></tr></thead><tbody>{rows.map((user) => <tr key={user.id}><td>#{user.id}</td><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td></tr>)}</tbody></table>
          )}
        </section>
      ) : null}
    </main>
  );
};
