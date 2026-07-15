import PublicPageShell from '../components/public/PublicPageShell';
import PageBackLink from '../components/PageBackLink';

const AuthLayout = ({ children, title, subtitle }) => (
  <PublicPageShell className="auth-page">
    <div className="auth-back-toolbar">
      <PageBackLink to="/">Back to Home</PageBackLink>
    </div>
    <section className="auth-panel">
      <div className="auth-copy">
        <a className="auth-brand" href="/" aria-label="GATE home">
          <span className="auth-brand-mark" aria-hidden="true">G</span>
          <span className="auth-brand-name">GATE</span>
        </a>
        <p className="auth-eyebrow">Safety training workspace</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </section>
  </PublicPageShell>
);

export default AuthLayout;
