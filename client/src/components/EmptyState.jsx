const EmptyState = ({ title, message, action }) => (
  <div className="empty-state">
    <h3>{title}</h3>
    {message ? <p>{message}</p> : null}
    {action ? <div className="empty-action">{action}</div> : null}
  </div>
);

export default EmptyState;
