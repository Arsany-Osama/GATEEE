import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiAssetUrl, getApiError } from '../api/client';
import { createPaymentRequest, getMyPaymentRequestForCourse } from '../api/paymentRequestsApi';
import { getPublicCourseByPaymentId } from '../api/publicCoursesApi';
import { getPublicSettings } from '../api/settingsApi';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import PageBackLink from '../components/PageBackLink';
import PublicFooter from '../components/public/PublicFooter';
import PublicNavbar from '../components/public/PublicNavbar';
import PublicPageShell from '../components/public/PublicPageShell';
import { useAuth } from '../context/AuthContext';
import { contactInfo } from '../data/contact';

const priceAmount = (price) => String(price || '2000').split(' ')[0];
const fallbackImage = '/images/cover of course.png';
const acceptedReceiptTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxReceiptSize = 5 * 1024 * 1024;
const fallbackPaymentSettings = {
  whatsapp_number: contactInfo.whatsappNumber,
  whatsapp_display: contactInfo.phoneDisplay,
  instapay_number: contactInfo.instapayDisplay,
  instapay_name: 'GATE',
  payment_instructions_title: 'Complete Manual Course Payment',
  payment_instructions_body: 'Transfer the course amount using InstaPay, then send the payment screenshot to the instructor so your course access can be reviewed and activated manually.',
  payment_success_note: 'Course access is not activated automatically. The instructor/admin will review the payment screenshot and manually open the course for your account.',
  payment_receipt_help_text: 'JPG, PNG, or WebP up to 5MB.',
};
const initialPaymentForm = {
  payer_name: '',
  payer_phone: '',
  payment_method: 'InstaPay',
  transfer_reference: '',
  transfer_date: '',
  submitted_amount: '',
  contact_number: '',
  note: '',
};

const PaymentInstructions = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [copied, setCopied] = useState('');
  const [course, setCourse] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [courseError, setCourseError] = useState('');
  const [requestStatus, setRequestStatus] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [fileError, setFileError] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestError, setRequestError] = useState('');
  const [publicSettings, setPublicSettings] = useState(fallbackPaymentSettings);
  const receiptPreviewRef = useRef('');

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const settings = await getPublicSettings();
        if (active) setPublicSettings({ ...fallbackPaymentSettings, ...(settings || {}) });
      } catch {
        if (active) setPublicSettings(fallbackPaymentSettings);
      }
    };
    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadCourse = async () => {
      setLoadingCourse(true);
      setCourseError('');
      try {
        const next = await getPublicCourseByPaymentId(courseId);
        if (active) setCourse(next);
      } catch (err) {
        if (active) {
          setCourse(null);
          setCourseError(getApiError(err, 'Could not load this course.'));
        }
      } finally {
        if (active) setLoadingCourse(false);
      }
    };
    loadCourse();
    return () => {
      active = false;
    };
  }, [courseId]);

  useEffect(() => {
    let active = true;
    const loadRequestStatus = async () => {
      if (!user || !course?.backendId) {
        setRequestStatus(null);
        return;
      }

      setLoadingRequest(true);
      setRequestError('');
      try {
        const status = await getMyPaymentRequestForCourse(course.backendId);
        if (active) setRequestStatus(status);
      } catch (err) {
        if (active) setRequestError(getApiError(err, 'Could not load your payment request status.'));
      } finally {
        if (active) setLoadingRequest(false);
      }
    };
    loadRequestStatus();
    return () => {
      active = false;
    };
  }, [course?.backendId, user]);

  useEffect(() => {
    return () => {
      if (receiptPreviewRef.current) URL.revokeObjectURL(receiptPreviewRef.current);
    };
  }, []);

  const whatsappUrl = useMemo(() => {
    const text = course ? `Hello, I want to buy ${course.title} on GATE.` : 'Hello, I want to buy a course on GATE.';
    const number = String(publicSettings.whatsapp_number || contactInfo.whatsappNumber).replace(/[^\d]/g, '');
    return `https://wa.me/${number || contactInfo.whatsappNumber}?text=${encodeURIComponent(text)}`;
  }, [course, publicSettings.whatsapp_number]);

  const contactDisplay = publicSettings.whatsapp_display || publicSettings.whatsapp_number || contactInfo.phoneDisplay;
  const instapayDisplay = publicSettings.instapay_number || contactInfo.instapayDisplay;
  const instapayName = publicSettings.instapay_name || 'GATE';
  const paymentSteps = [
    `Transfer the course amount using InstaPay to ${instapayDisplay}.`,
    'Take a screenshot of the payment confirmation.',
    `Send the screenshot to admin on WhatsApp at ${contactDisplay}.`,
    'Your request will be reviewed.',
    'After approval, the course will be manually activated for your account.',
  ];

  const copyValue = async (label, value) => {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('');
    }
  };

  const submitPaymentRequest = async (event) => {
    event.preventDefault();
    if (!course?.backendId) return;
    if (!paymentForm.payer_name.trim()) {
      setRequestError('Payer name is required.');
      return;
    }
    if (!paymentForm.payer_phone.trim()) {
      setRequestError('Phone or WhatsApp number is required.');
      return;
    }
    if (!paymentForm.payment_method.trim()) {
      setRequestError('Payment method is required.');
      return;
    }
    if (!receiptFile && !requestStatus?.request?.receipt_url) {
      setRequestError('Receipt screenshot is required.');
      return;
    }

    setSubmittingRequest(true);
    setRequestMessage('');
    setRequestError('');
    try {
      const body = new FormData();
      Object.entries(paymentForm).forEach(([key, value]) => {
        body.append(key, value);
      });
      if (receiptFile) body.append('receipt', receiptFile);

      const result = await createPaymentRequest(course.backendId, body);
      setRequestMessage(result?.message || 'Your payment request has been submitted and is waiting for admin review.');
      setRequestStatus({ status: result?.status || 'pending', request: result?.request || null });
      setReceiptFile(null);
      if (receiptPreviewRef.current) URL.revokeObjectURL(receiptPreviewRef.current);
      receiptPreviewRef.current = '';
      setReceiptPreview('');
      setFileError('');
    } catch (err) {
      setRequestError(getApiError(err, 'Could not submit payment request.'));
      if (err?.response?.data?.status === 'already_enrolled') {
        setRequestStatus({ status: 'already_enrolled', request: null });
      }
    } finally {
      setSubmittingRequest(false);
    }
  };

  const selectReceipt = (event) => {
    const file = event.target.files?.[0] || null;
    setFileError('');
    setReceiptFile(null);
    if (receiptPreviewRef.current) URL.revokeObjectURL(receiptPreviewRef.current);
    receiptPreviewRef.current = '';
    setReceiptPreview('');

    if (!file) return;
    if (!acceptedReceiptTypes.includes(file.type)) {
      setFileError('Receipt must be a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > maxReceiptSize) {
      setFileError('Receipt image must be 5MB or smaller.');
      event.target.value = '';
      return;
    }

    setReceiptFile(file);
    const nextPreview = URL.createObjectURL(file);
    receiptPreviewRef.current = nextPreview;
    setReceiptPreview(nextPreview);
  };

  const requestIsComplete = Boolean(
    requestStatus?.request?.payer_name
    && requestStatus?.request?.payer_phone
    && requestStatus?.request?.payment_method
    && requestStatus?.request?.receipt_url
  );

  const statusText = (() => {
    if (!requestStatus?.status || requestStatus.status === 'none') return '';
    if (requestStatus.status === 'pending' && !requestIsComplete) return 'Your payment request is pending. Add the missing payment details and receipt so admin can review it.';
    if (requestStatus.status === 'pending') return 'Your payment request is pending admin review.';
    if (requestStatus.status === 'approved' || requestStatus.status === 'already_enrolled') {
      return 'This course is already available in your dashboard.';
    }
    if (requestStatus.status === 'rejected') return 'Your previous payment request was rejected. You can submit a new request.';
    return '';
  })();

  const canSubmitRequest = Boolean(
    user
    && course?.backendId
    && (requestStatus?.status !== 'pending' || !requestIsComplete)
    && requestStatus?.status !== 'approved'
    && requestStatus?.status !== 'already_enrolled'
  );

  if (loadingCourse) {
    return (
      <PublicPageShell className="payment-page">
        <PublicNavbar className="learning-nav" sectionBase="/" user={user} showDashboardNav />
        <Loader fullScreen label="Loading course payment details..." />
      </PublicPageShell>
    );
  }

  if (!course) {
    return (
      <PublicPageShell className="payment-page">
        <PublicNavbar className="learning-nav" sectionBase="/" user={user} showDashboardNav />
        <ErrorMessage message={courseError} />
        <EmptyState
          title="Course not found"
          message="This public course preview is not available."
          action={<Link className="btn btn-primary" to="/learning">Back to Courses</Link>}
        />
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell className="payment-page">
      <PublicNavbar className="learning-nav" sectionBase="/" user={user} showDashboardNav />

      <div className="page-toolbar">
        <PageBackLink to="/learning">Back to Courses</PageBackLink>
      </div>

      <section className="payment-hero">
        <p className="home-eyebrow">Manual course activation</p>
        <h1>{publicSettings.payment_instructions_title}</h1>
        <p>{publicSettings.payment_instructions_body}</p>
      </section>

      <section className="payment-layout">
        <article className="payment-course-card">
          <div className="payment-course-image-wrap">
            <img src={course.image} alt={`${course.title} cover`} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
          </div>
          <div className="payment-course-body">
            <h2>{course.title}</h2>
            {course.arabicTitle ? <p className="payment-course-subtitle" dir="rtl">{course.arabicTitle}</p> : null}
            <p>{course.description}</p>
            <div className="preview-instructor payment-course-instructor">
              <span className="preview-avatar" aria-hidden="true">G</span>
              <div>
                <strong>{course.instructor}</strong>
                <span>{course.instructorSubtitle}</span>
              </div>
            </div>
            <div className="preview-course-footer payment-course-price">
              <div>
                <span>Course price</span>
                <strong className="course-price" dir="ltr">
                  <span>{priceAmount(course.price)}</span>
                </strong>
              </div>
            </div>
          </div>
        </article>

        <article className="payment-details-card">
          <div>
            <p className="eyebrow">Payment details</p>
            <h2>Transfer with InstaPay</h2>
          </div>

          <div className="payment-number-row">
            <span>Contact number</span>
            <strong>{contactDisplay}</strong>
            <Button variant="ghost" onClick={() => copyValue('contact', contactDisplay)}>
              {copied === 'contact' ? 'Copied' : 'Copy contact number'}
            </Button>
          </div>

          <div className="payment-number-row">
            <span>InstaPay number</span>
            <strong>{instapayDisplay}</strong>
            <Button variant="ghost" onClick={() => copyValue('instapay', instapayDisplay)}>
              {copied === 'instapay' ? 'Copied' : 'Copy InstaPay number'}
            </Button>
          </div>

          <div className="payment-number-row">
            <span>InstaPay account</span>
            <strong>{instapayName}</strong>
            <Button variant="ghost" onClick={() => copyValue('instapay-name', instapayName)}>
              {copied === 'instapay-name' ? 'Copied' : 'Copy account name'}
            </Button>
          </div>

          <div className="payment-actions">
            <a className="btn btn-primary" href={whatsappUrl} target="_blank" rel="noreferrer">Contact on WhatsApp</a>
            <Link className="btn btn-ghost" to="/learning">Back to Courses</Link>
            {user ? <Link className="btn btn-secondary" to="/dashboard">Go to Dashboard</Link> : null}
          </div>
        </article>
      </section>

      <section className="payment-request-card">
        <div>
          <p className="eyebrow">Access request</p>
          <h2>Submit Payment Request</h2>
          <p>Submit your manual payment details and receipt screenshot for admin review. Course access opens only after approval.</p>
        </div>

        <ErrorMessage message={requestError} />
        <ErrorMessage message={fileError} />
        {requestMessage ? <div className="notice notice-success">{requestMessage}</div> : null}
        {loadingRequest ? <Loader label="Checking request status..." /> : null}
        {statusText ? <div className="payment-request-status">{statusText}</div> : null}

        {!user ? (
          <div className="login-reminder payment-request-login">
            <p>Please login to submit a payment request.</p>
            <div className="payment-reminder-actions">
              <Link className="btn btn-primary" to="/login">Login</Link>
              <Link className="btn btn-ghost" to="/register">Register</Link>
            </div>
          </div>
        ) : null}

        {user && !course.backendId ? (
          <div className="payment-request-status">This course must be available from the backend before requests can be submitted.</div>
        ) : null}

        {canSubmitRequest ? (
          <form className="payment-request-form" onSubmit={submitPaymentRequest}>
            <div className="payment-request-grid">
              <label className="field">
                <span>Full name / payer name</span>
                <input
                  value={paymentForm.payer_name}
                  onChange={(event) => setPaymentForm({ ...paymentForm, payer_name: event.target.value })}
                  placeholder="Name used for the transfer"
                  required
                />
              </label>
              <label className="field">
                <span>Phone / WhatsApp number</span>
                <input
                  value={paymentForm.payer_phone}
                  onChange={(event) => setPaymentForm({ ...paymentForm, payer_phone: event.target.value, contact_number: event.target.value })}
                  placeholder="Your reachable phone number"
                  required
                />
              </label>
              <label className="field">
                <span>Payment method</span>
                <select
                  value={paymentForm.payment_method}
                  onChange={(event) => setPaymentForm({ ...paymentForm, payment_method: event.target.value })}
                  required
                >
                  <option value="InstaPay">InstaPay</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Vodafone Cash">Vodafone Cash</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className="field">
                <span>Transfer/reference number</span>
                <input
                  value={paymentForm.transfer_reference}
                  onChange={(event) => setPaymentForm({ ...paymentForm, transfer_reference: event.target.value })}
                  placeholder="Optional transaction reference"
                />
              </label>
              <label className="field">
                <span>Transfer date</span>
                <input
                  type="date"
                  value={paymentForm.transfer_date}
                  onChange={(event) => setPaymentForm({ ...paymentForm, transfer_date: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Amount transferred</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.submitted_amount}
                  onChange={(event) => setPaymentForm({ ...paymentForm, submitted_amount: event.target.value })}
                  placeholder={priceAmount(course.price)}
                />
              </label>
            </div>

            <label className="field">
              <span>Notes</span>
              <textarea
                value={paymentForm.note}
                onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })}
                placeholder="Optional transfer note, timing, or any detail admin should know"
              />
            </label>

            <label className="field payment-receipt-field">
              <span>Receipt screenshot</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectReceipt} />
              <small>{receiptFile ? receiptFile.name : requestStatus?.request?.receipt_original_name || publicSettings.payment_receipt_help_text}</small>
            </label>

            {receiptPreview ? (
              <div className="payment-receipt-preview">
                <img src={receiptPreview} alt="Selected receipt preview" />
              </div>
            ) : requestStatus?.request?.receipt_url ? (
              <div className="payment-receipt-preview">
                <img src={apiAssetUrl(requestStatus.request.receipt_url)} alt="Uploaded receipt preview" />
              </div>
            ) : null}

            <Button type="submit" disabled={submittingRequest || loadingRequest}>
              {submittingRequest ? 'Submitting...' : requestStatus?.status === 'pending' ? 'Update Pending Request' : 'Submit Payment Request'}
            </Button>
          </form>
        ) : null}
      </section>

      <section className="payment-steps">
        {paymentSteps.map((step, index) => (
          <article key={step}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </article>
        ))}
      </section>

      <section className="payment-notice">
        <strong>Important notice</strong>
        <p>
          {publicSettings.payment_success_note}
        </p>
      </section>

      {!user ? (
        <section className="login-reminder">
          <p>Please log in or register before purchasing so the instructor can activate the course for your account.</p>
          <div className="payment-reminder-actions">
            <Link className="btn btn-primary" to="/login">Login</Link>
            <Link className="btn btn-ghost" to="/register">Register</Link>
          </div>
        </section>
      ) : null}

      <PublicFooter className="payment-footer" sectionBase="/" />
    </PublicPageShell>
  );
};

export default PaymentInstructions;
