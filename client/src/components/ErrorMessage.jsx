const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return <div className="notice notice-error">{message}</div>;
};

export default ErrorMessage;
