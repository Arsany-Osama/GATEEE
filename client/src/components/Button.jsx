const Button = ({ children, variant = 'primary', size = 'md', className = '', type = 'button', ...props }) => (
  <button type={type} className={`btn btn-${variant} btn-${size} ${className}`.trim()} {...props}>
    {children}
  </button>
);

export default Button;
