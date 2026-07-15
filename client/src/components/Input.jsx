const Input = ({ label, error, className = '', ...props }) => (
  <label className={`field ${className}`.trim()}>
    {label ? <span>{label}</span> : null}
    <input {...props} />
    {error ? <small className="field-error">{error}</small> : null}
  </label>
);

export default Input;
