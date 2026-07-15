const Loader = ({ label = 'Loading...', fullScreen = false }) => (
  <div className={fullScreen ? 'loader loader-full' : 'loader'}>
    <span className="spinner" />
    <span>{label}</span>
  </div>
);

export default Loader;
