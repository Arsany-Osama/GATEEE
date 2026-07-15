import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getApiError } from '../api/client';
import Badge from '../components/Badge';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import PageBackLink from '../components/PageBackLink';
import { verifyCertificate } from '../api/studentApi';

const formatDate = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
};

const CertificateVerification = () => {
  const { uuid } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError('');
    });
    verifyCertificate(uuid)
      .then((data) => {
        if (active) setCertificate(data);
      })
      .catch((err) => {
        if (active) {
          setCertificate(null);
          setError(getApiError(err, 'This certificate could not be verified.'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uuid]);

  return (
    <main className="page narrow-page certificate-page">
      <div className="student-page-toolbar">
        <PageBackLink to="/">Back to Home</PageBackLink>
      </div>
      <section className="page-head certificate-head">
        <div>
          <p className="eyebrow">Certificate verification</p>
          <h1>Certificate Status</h1>
          <p>Validate the authenticity and current status of a GATE completion certificate.</p>
        </div>
      </section>
      <ErrorMessage message={error} />
      {loading ? <Loader label="Verifying certificate..." /> : null}
      {!loading && certificate ? (
        <section className={`certificate-card ${certificate.status === 'Revoked' ? 'is-revoked' : 'is-valid'}`}>
          <div className="certificate-card-top">
            <span className="certificate-seal" aria-hidden="true">G</span>
            <div>
              <p className="eyebrow">GATE verified credential</p>
              <h2>Certificate of Completion</h2>
            </div>
            <Badge tone={certificate.status === 'Revoked' ? 'red' : 'green'}>{certificate.status}</Badge>
          </div>
          <div className="certificate-card-body">
            <p>This certificate was issued to</p>
            <strong>{certificate.student_name}</strong>
            <span>for successfully completing</span>
            <h3>{certificate.course_name}</h3>
          </div>
          <dl className="certificate-meta">
            <div>
              <dt>Issued</dt>
              <dd>{formatDate(certificate.issued_at)}</dd>
            </div>
            <div>
              <dt>Certificate ID</dt>
              <dd>{certificate.uuid}</dd>
            </div>
            {certificate.revoked_at ? (
              <div>
                <dt>Revoked</dt>
                <dd>{formatDate(certificate.revoked_at)}</dd>
              </div>
            ) : null}
          </dl>
          <p className="certificate-note">
            Authenticity is checked against the signed certificate record and revocation status.
          </p>
        </section>
      ) : null}
    </main>
  );
};

export default CertificateVerification;
