import { memo } from 'react';

const StatCard = memo(({ label, value, helper, tone = 'blue' }) => (
  <article className={`stat-card stat-${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {helper ? <p>{helper}</p> : null}
  </article>
));

export default StatCard;
