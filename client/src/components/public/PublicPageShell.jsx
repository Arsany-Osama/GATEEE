const PublicPageShell = ({ as: Component = 'main', className = '', children, ...props }) => (
  <Component className={`public-page-shell ${className}`.trim()} {...props}>
    {children}
  </Component>
);

export default PublicPageShell;
