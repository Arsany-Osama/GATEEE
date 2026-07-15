const PublicPageShell = ({ as: Component = 'main', className = '', children }) => (
  <Component className={`public-page-shell ${className}`.trim()}>
    {children}
  </Component>
);

export default PublicPageShell;
