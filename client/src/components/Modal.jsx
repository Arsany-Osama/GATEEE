import Button from './Button';

const Modal = ({ title, children, onClose }) => (
  <div className="modal-backdrop" role="presentation">
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head">
        <h2>{title}</h2>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
      {children}
    </div>
  </div>
);

export default Modal;
