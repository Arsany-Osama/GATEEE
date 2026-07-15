import { useEffect, useMemo, useState } from 'react';
import {
  approvePaymentRequest,
  getAdminPaymentRequests,
  rejectPaymentRequest,
} from '../../api/paymentRequestsApi';
import { apiAssetUrl, getApiError } from '../../api/client';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Loader from '../../components/Loader';
import PageBackLink from '../../components/PageBackLink';
import StatCard from '../../components/StatCard';

const fallbackImage = '/images/cover of course.png';
const formatDate = (value) => {
  if (!value) return 'Not reviewed';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not reviewed' : date.toLocaleString();
};

const formatAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Not set';
  return Number.isInteger(amount) ? `${amount} EGP` : `${amount.toFixed(2)} EGP`;
};

const fileSize = (value) => {
  const size = Number(value);
  if (!Number.isFinite(size)) return '';
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
};

const statusTone = (status) => {
  if (status === 'approved') return 'green';
  if (status === 'rejected') return 'amber';
  return 'blue';
};

const PaymentRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminPaymentRequests();
      setRequests(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (err) {
      setError(getApiError(err, 'Could not load payment requests.'));
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
        const data = await getAdminPaymentRequests();
        if (active) setRequests(Array.isArray(data) ? data.filter(Boolean) : []);
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load payment requests.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInitial();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    return requests.reduce(
      (acc, request) => {
        acc.total += 1;
        acc[request.status] = (acc[request.status] || 0) + 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 }
    );
  }, [requests]);

  const approve = async (id) => {
    setBusyId(`approve-${id}`);
    setMessage('');
    setError('');
    try {
      await approvePaymentRequest(id);
      setMessage('Payment request approved and course access opened.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'Could not approve payment request.'));
    } finally {
      setBusyId('');
    }
  };

  const reject = async (id) => {
    setBusyId(`reject-${id}`);
    setMessage('');
    setError('');
    try {
      await rejectPaymentRequest(id, notes[id] || '');
      setMessage('Payment request rejected.');
      setNotes((current) => ({ ...current, [id]: '' }));
      await load();
    } catch (err) {
      setError(getApiError(err, 'Could not reject payment request.'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="admin-page admin-payment-requests-page">
      <div className="admin-page-toolbar"><PageBackLink to="/admin">Back to Admin Dashboard</PageBackLink></div>
      <section className="page-head">
        <div>
          <p className="eyebrow">Commercial review</p>
          <h1>Payment Requests</h1>
          <p>Review manual payment requests and open course access only after approval.</p>
        </div>
      </section>

      <ErrorMessage message={error} />
      {message ? <div className="notice notice-success">{message}</div> : null}
      {loading ? <Loader label="Loading payment requests..." /> : null}

      {!loading ? (
        <>
          <section className="stats-grid admin-payment-summary">
            <StatCard label="Total Requests" value={summary.total} helper="All manual requests" />
            <StatCard label="Pending" value={summary.pending} helper="Awaiting review" tone="amber" />
            <StatCard label="Approved" value={summary.approved} helper="Opened courses" tone="green" />
            <StatCard label="Rejected" value={summary.rejected} helper="Declined requests" tone="navy" />
          </section>

          {requests.length === 0 ? (
            <EmptyState title="No payment requests yet" message="Student requests will appear here after they submit from the payment page." />
          ) : (
            <section className="admin-payment-request-list">
              {requests.map((request) => {
                const isPending = request.status === 'pending';
                return (
                  <article className="panel admin-payment-request-card" key={request.id}>
                    <div className="admin-payment-course">
                      <img
                        src={request.course_thumbnail_url || fallbackImage}
                        alt={`${request.course_title || 'Course'} cover`}
                        onError={(event) => { event.currentTarget.src = fallbackImage; }}
                      />
                      <div>
                        <Badge tone={statusTone(request.status)}>{request.status || 'pending'}</Badge>
                        <h2>{request.course_title || `Course ${request.course_id}`}</h2>
                        <p>{request.user_name || 'Student'} - {request.user_email || 'No email'}</p>
                      </div>
                    </div>

                    <dl className="admin-payment-meta">
                      <div><dt>Request ID</dt><dd>#{request.id}</dd></div>
                      <div><dt>Official amount</dt><dd>{formatAmount(request.amount)}</dd></div>
                      <div><dt>Submitted amount</dt><dd>{formatAmount(request.submitted_amount)}</dd></div>
                      <div><dt>Payment method</dt><dd>{request.payment_method || 'Not provided'}</dd></div>
                      <div><dt>Payer name</dt><dd>{request.payer_name || 'Not provided'}</dd></div>
                      <div><dt>Payer phone</dt><dd>{request.payer_phone || request.contact_number || 'Not provided'}</dd></div>
                      <div><dt>Transfer reference</dt><dd>{request.transfer_reference || 'Not provided'}</dd></div>
                      <div><dt>Transfer date</dt><dd>{request.transfer_date || 'Not provided'}</dd></div>
                      <div><dt>Submitted</dt><dd>{formatDate(request.created_at)}</dd></div>
                      <div><dt>Reviewed</dt><dd>{formatDate(request.reviewed_at)}</dd></div>
                    </dl>

                    <div className="admin-receipt-review">
                      {request.receipt_url ? (
                        <>
                          <a href={apiAssetUrl(request.receipt_url)} target="_blank" rel="noreferrer" className="admin-receipt-thumb">
                            <img src={apiAssetUrl(request.receipt_url)} alt={`Receipt for request ${request.id}`} />
                          </a>
                          <div>
                            <strong>Receipt screenshot</strong>
                            <p>{request.receipt_original_name || 'Uploaded receipt'} {request.receipt_size ? `· ${fileSize(request.receipt_size)}` : ''}</p>
                            <a className="btn btn-secondary" href={apiAssetUrl(request.receipt_url)} target="_blank" rel="noreferrer">View Receipt</a>
                          </div>
                        </>
                      ) : (
                        <div className="admin-no-receipt">No receipt uploaded</div>
                      )}
                    </div>

                    <div className="admin-payment-notes">
                      <div>
                        <strong>Student note</strong>
                        <p>{request.note || 'No note provided.'}</p>
                      </div>
                      <div>
                        <strong>Admin note</strong>
                        <p>{request?.admin_note || 'No admin note.'}</p>
                      </div>
                    </div>

                    {isPending ? (
                      <div className="admin-payment-actions">
                        <label className="field">
                          <span>Rejection note</span>
                          <textarea
                            value={notes[request.id] || ''}
                            onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                            placeholder="Optional note for this review"
                          />
                        </label>
                        <div className="table-actions">
                          <Button disabled={Boolean(busyId)} onClick={() => approve(request.id)}>
                            {busyId === `approve-${request.id}` ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button variant="ghost" disabled={Boolean(busyId)} onClick={() => reject(request.id)}>
                            {busyId === `reject-${request.id}` ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          )}
        </>
      ) : null}
    </main>
  );
};

export default PaymentRequestsPage;
