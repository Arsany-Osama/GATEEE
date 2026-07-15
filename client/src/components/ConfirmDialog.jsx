import Button from './Button';
import Modal from './Modal';

const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, danger = false }) => {
  if (!open) return null;

  return (
    <Modal title={title} onClose={onCancel}>
      <p className="muted">{message}</p>
      <div className="form-actions">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
