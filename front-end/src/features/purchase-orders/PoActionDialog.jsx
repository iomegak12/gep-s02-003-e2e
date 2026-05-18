import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import ConfirmWithReason from '../../components/ui/ConfirmWithReason.jsx';

/**
 * Picks the right confirm dialog for a PO action.
 *   - kind 'plain'  -> simple confirm
 *   - kind 'reason' -> ConfirmWithReason (with curated presets if available)
 *   - kind 'date'   -> date picker confirm (used by `fulfill`)
 */
export default function PoActionDialog({ action, meta, po, submitting, onConfirm, onClose }) {
  if (!action || !meta) return null;

  if (meta.kind === 'plain') {
    return (
      <Modal
        open
        onClose={submitting ? undefined : onClose}
        title={meta.title}
        width={460}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button variant={meta.variant || 'primary'} onClick={() => onConfirm()} loading={submitting} disabled={submitting}>
              {meta.label}
            </Button>
          </>
        }
      >
        <p className="t-body">{meta.description}</p>
        {po?.po_number && (
          <p className="t-body-sm mono" style={{ marginTop: 8 }}>{po.po_number}</p>
        )}
      </Modal>
    );
  }

  if (meta.kind === 'reason') {
    return (
      <ConfirmWithReason
        open
        onClose={onClose}
        title={meta.title}
        description={meta.description}
        confirmLabel={meta.label}
        confirmVariant={meta.variant === 'danger' ? 'danger' : 'primary'}
        requireReason
        reasonPresets={meta.reasonPresets}
        submitting={submitting}
        onConfirm={(reason) => onConfirm({ reason })}
      />
    );
  }

  if (meta.kind === 'date') {
    return (
      <DateConfirm
        title={meta.title}
        description={meta.description}
        confirmLabel={meta.label}
        submitting={submitting}
        po={po}
        onClose={onClose}
        onConfirm={(date) => onConfirm({ actual_delivery_date: date })}
      />
    );
  }

  return null;
}

function DateConfirm({ title, description, confirmLabel, po, submitting, onClose, onConfirm }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [error, setError] = useState(null);

  useEffect(() => { setDate(today); setError(null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const submit = () => {
    if (!date) { setError('Pick a delivery date.'); return; }
    setError(null);
    onConfirm(date);
  };

  return (
    <Modal
      open
      onClose={submitting ? undefined : onClose}
      title={title}
      width={420}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} loading={submitting} disabled={submitting}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="t-body" style={{ marginBottom: 12 }}>{description}</p>
      {po?.po_number && (
        <p className="t-body-sm mono" style={{ marginBottom: 12 }}>{po.po_number}</p>
      )}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="t-body-sm" style={{ fontWeight: 500 }}>
          Actual delivery date <span style={{ color: 'var(--error)' }}>*</span>
        </span>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={today}
          disabled={submitting}
        />
        {error && <span className="t-body-sm" style={{ color: 'var(--error)' }}>{error}</span>}
      </label>
    </Modal>
  );
}
