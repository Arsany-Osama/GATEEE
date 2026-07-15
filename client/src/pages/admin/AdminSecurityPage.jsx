import { useCallback, useEffect, useState } from 'react';
import { getApiError } from '../../api/client';
import { getAdminCertificates, getAdminSecurityData, revokeCertificate } from '../../api/adminApi';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import Loader from '../../components/Loader';

const formatDate = (value) => {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not reported' : date.toLocaleString();
};

const AdminSecurityPage = () => {
  const [security, setSecurity] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ({ reset = true } = {}) => {
    if (reset) {
      setLoading(true);
      setError('');
    }
    try {
      const [securityData, certificateRows] = await Promise.all([
        getAdminSecurityData(),
        getAdminCertificates(),
      ]);
      setSecurity(securityData || null);
      setCertificates(Array.isArray(certificateRows) ? certificateRows : []);
    } catch (err) {
      setError(getApiError(err, 'Could not load security insights.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.queueMicrotask(() => load({ reset: false }));
  }, [load]);

  const revoke = async (uuid) => {
    try {
      await revokeCertificate(uuid);
      await load();
    } catch (err) {
      setError(getApiError(err, 'Could not revoke this certificate.'));
    }
  };

  const summary = security?.summary || {};
  const suspiciousUsers = Array.isArray(security?.suspicious_users) ? security.suspicious_users : [];
  const recentLogs = Array.isArray(security?.recent_logs) ? security.recent_logs : [];

  return (
    <main className="admin-page admin-security-page">
      <section className="page-head">
        <div>
          <p className="eyebrow">Security and integrity</p>
          <h1>Security Review</h1>
          <p>Track suspicious viewing activity, active device usage, and certificate revocations.</p>
        </div>
        <Button variant="ghost" onClick={() => load()} disabled={loading}>Refresh</Button>
      </section>

      <ErrorMessage message={error} />
      {loading ? <Loader label="Loading security data..." /> : null}

      {!loading ? (
        <>
          <section className="stats-grid security-stats-grid">
            <article className="card security-stat-card"><span>Active sessions (24h)</span><strong>{summary.active_sessions_24h || 0}</strong></article>
            <article className="card security-stat-card"><span>Suspicious users</span><strong>{summary.suspicious_users || 0}</strong></article>
            <article className="card security-stat-card"><span>Recent access logs</span><strong>{summary.video_logs_returned || 0}</strong></article>
          </section>

          <section className="card-grid security-review-grid">
            <article className="admin-card admin-list-card">
              <p className="eyebrow">Suspicious users</p>
              {suspiciousUsers.map((user) => (
                <div className="admin-mini-row" key={user.user_id}>
                  <span aria-hidden="true">!</span>
                  <div>
                    <h3>{user.name} - {user.email}</h3>
                    <p>{user.flags.join(', ')}</p>
                    <p>{user.active_devices} devices, {user.ip_count_24h} IPs, {user.country_count_24h} countries</p>
                  </div>
                </div>
              ))}
              {suspiciousUsers.length === 0 ? <p className="muted">No suspicious users were flagged in the last 24 hours.</p> : null}
            </article>

            <article className="admin-card admin-list-card">
              <p className="eyebrow">Recent video access</p>
              {recentLogs.slice(0, 8).map((log) => (
                <div className="admin-mini-row" key={log.id}>
                  <span aria-hidden="true">Play</span>
                  <div>
                    <h3>{log.user_name} - {log.course_title}</h3>
                    <p>{log.lesson_title}</p>
                    <p>{log.ip_address} {log.country_code ? `(${log.country_code})` : ''} - {formatDate(log.timestamp)}</p>
                  </div>
                </div>
              ))}
              {recentLogs.length === 0 ? <p className="muted">No recent video access logs yet.</p> : null}
            </article>
          </section>

          <section className="section-block">
            <div className="section-title">
              <div>
                <p className="eyebrow">Certificates</p>
                <h2>Certificate Management</h2>
              </div>
            </div>
            <div className="table-wrap security-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Issued</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((certificate) => (
                    <tr key={certificate.uuid}>
                      <td><strong>{certificate.student_name}</strong><br />{certificate.student_email}</td>
                      <td>{certificate.course_name}</td>
                      <td><Badge tone={certificate.status === 'Revoked' ? 'red' : 'green'}>{certificate.status}</Badge></td>
                      <td>{formatDate(certificate.issued_at)}</td>
                      <td>
                        {certificate.status === 'Revoked' ? 'Revoked' : (
                          <Button variant="ghost" onClick={() => revoke(certificate.uuid)}>Revoke</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {certificates.length === 0 ? (
                    <tr>
                      <td colSpan="5">No certificates have been issued yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
};

export default AdminSecurityPage;
