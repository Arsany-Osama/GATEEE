const Card = ({ children, className = '' }) => (
  <section className={`card ${className}`.trim()}>{children}</section>
);

export default Card;
