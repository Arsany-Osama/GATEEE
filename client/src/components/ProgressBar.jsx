const ProgressBar = ({ value = 0 }) => {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress-wrap" aria-label={`Progress ${safeValue}%`}>
      <div className="progress-track">
        <span style={{ width: `${safeValue}%` }} />
      </div>
      <strong>{Math.round(safeValue)}%</strong>
    </div>
  );
};

export default ProgressBar;
