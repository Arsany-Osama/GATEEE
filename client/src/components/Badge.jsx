import { memo } from 'react';

const Badge = memo(({ children, tone = 'blue', className = '' }) => (
  <span className={`badge badge-${tone} ${className}`.trim()}>{children}</span>
));

export default Badge;
