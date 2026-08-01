import { useEffect, useMemo, useState } from 'react';
import { getApiError } from '../../api/client';
import { getAdminSettings, updateAdminSettings } from '../../api/settingsApi';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import Loader from '../../components/Loader';
import PageBackLink from '../../components/PageBackLink';

const settingSections = [
  {
    title: 'Payment Settings',
    eyebrow: 'Manual payment',
    description: 'Control the values students see while submitting manual payment requests.',
    keys: ['vodafone_cash_number', 'instapay_number', 'instapay_name', 'payment_instructions_title', 'payment_instructions_body', 'payment_receipt_help_text'],
  },
  {
    title: 'Contact Settings',
    eyebrow: 'Public contact',
    description: 'Keep support contact details consistent across payment and footer areas.',
    keys: ['whatsapp_number', 'whatsapp_display', 'contact_email', 'footer_location'],
  },
  {
    title: 'Social Settings',
    eyebrow: 'Public channels',
    description: 'Manage social profile links shown in the public footer.',
    keys: ['facebook_url', 'instagram_url'],
  },
  {
    title: 'Notifications',
    eyebrow: 'Admin email',
    description: 'Choose where manual payment request notifications should be sent.',
    keys: ['admin_notification_email'],
  },
  {
    title: 'Branding',
    eyebrow: 'Platform basics',
    description: 'Keep the platform identity editable without changing code.',
    keys: ['platform_name'],
  },
];

const fieldType = (setting) => {
  if (setting?.type === 'textarea') return 'textarea';
  if (setting?.type === 'email') return 'email';
  if (setting?.type === 'url') return 'url';
  return 'text';
};

const AdminSettingsPage = () => {
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminSettings();
      setSettings(data || {});
      setForm(Object.fromEntries(Object.entries(data || {}).map(([key, setting]) => [key, setting?.value || ''])));
    } catch (err) {
      setError(getApiError(err, 'Could not load platform settings.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAdminSettings();
        if (!active) return;
        setSettings(data || {});
        setForm(Object.fromEntries(Object.entries(data || {}).map(([key, setting]) => [key, setting?.value || ''])));
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load platform settings.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const hasChanges = useMemo(() => {
    return Object.entries(settings).some(([key, setting]) => (form[key] || '') !== (setting?.value || ''));
  }, [form, settings]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  const resetChanges = () => {
    setForm(Object.fromEntries(Object.entries(settings).map(([key, setting]) => [key, setting?.value || ''])));
    setMessage('');
    setError('');
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updated = await updateAdminSettings(form);
      setSettings(updated || {});
      setForm(Object.fromEntries(Object.entries(updated || {}).map(([key, setting]) => [key, setting?.value || ''])));
      setMessage('Platform settings saved.');
    } catch (err) {
      setError(getApiError(err, 'Could not save platform settings.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-page admin-settings-page">
      <div className="admin-page-toolbar"><PageBackLink to="/admin">Back to Admin Dashboard</PageBackLink></div>
      <section className="page-head admin-settings-head">
        <div>
          <p className="eyebrow">Platform control</p>
          <h1>Settings</h1>
          <p>Manage payment, contact, social, notification, and brand settings from one database-backed admin surface.</p>
        </div>
        <div className="admin-settings-status">
          <span>Database backed</span>
          <strong>{Object.keys(settings).length || 0} keys</strong>
        </div>
      </section>

      <ErrorMessage message={error} />
      {message ? <div className="notice notice-success">{message}</div> : null}
      {loading ? <Loader label="Loading platform settings..." /> : null}

      {!loading ? (
        <form className="admin-settings-form" onSubmit={saveSettings}>
          {settingSections.map((section) => (
            <section className="panel admin-settings-card" key={section.title}>
              <div className="admin-settings-card-head">
                <div>
                  <p className="eyebrow">{section.eyebrow}</p>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </div>
              </div>

              <div className="admin-settings-grid">
                {section.keys.map((key) => {
                  const setting = settings[key];
                  if (!setting) return null;
                  const type = fieldType(setting);
                  return (
                    <label className={`field admin-setting-field ${type === 'textarea' ? 'admin-setting-field-wide' : ''}`} key={key}>
                      <span>{setting.label}</span>
                      {type === 'textarea' ? (
                        <textarea
                          value={form[key] || ''}
                          onChange={(event) => updateField(key, event.target.value)}
                          placeholder={setting.description}
                        />
                      ) : (
                        <input
                          type={type}
                          value={form[key] || ''}
                          onChange={(event) => updateField(key, event.target.value)}
                          placeholder={setting.description}
                        />
                      )}
                      <small>{setting.description}</small>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="admin-settings-actions">
            <Button type="submit" disabled={saving || !hasChanges}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button type="button" variant="ghost" disabled={saving || !hasChanges} onClick={resetChanges}>
              Cancel Changes
            </Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={loadSettings}>
              Reload
            </Button>
          </div>
        </form>
      ) : null}
    </main>
  );
};

export default AdminSettingsPage;
