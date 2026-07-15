import { Link } from 'react-router-dom';

const PageBackLink = ({ to, children, className = '' }) => (
  <Link className={`page-back-link ${className}`.trim()} to={to}>
    <span className="page-back-icon" aria-hidden="true">←</span>
    {children}
  </Link>
);

export default PageBackLink;

