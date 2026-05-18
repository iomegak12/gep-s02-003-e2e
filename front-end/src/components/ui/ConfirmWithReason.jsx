import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import ChipGroup from './ChipGroup.jsx';

const OTHER = '__other__';

/**
 * Generic confirm dialog with an optional `reason` capture.
 *
 * Reason input has 3 modes:
 *   1. requireReason=false                  -> no reason input at all (plain confirm)
 *   2. requireReason=true, no reasonPresets -> free-text textarea (min 5 chars)
 *   3. requireReason=true, reasonPresets[]  -> chip group of presets + "Other";
 *      picking a preset uses it as the reason; picking "Other" reveals a textarea.
 */
export default function ConfirmWithReason({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Add a short reason (visible in audit)',
  reasonPresets,
  submitting = false,
  onConfirm
}) {
  const usePresets = requireReason && Array.isArray(reasonPresets) && reasonPresets.length > 0;
  const [chosen, setChosen] = useState('');
  const [other, setOther] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) { setChosen(''); setOther(''); setReason(''); setError(null); }
  }, [open]);

  const computeFinalReason = () => {
    if (!requireReason) return undefined;
    if (usePresets) {
      if (chosen === OTHER) return other.trim();
      return chosen.trim();
    }
    return reason.trim();
  };

  const submit = async () => {
    if (requireReason) {
      const final = computeFinalReason();
      if (!final) {
        setError(usePresets
          ? (chosen === OTHER ? 'Please describe the reason.' : 'Pick a reason.')
          : 'Please give a brief reason (at least 5 characters).');
        return;
      }
      if (final.length < 5) {
        setError('Please give a brief reason (at least 5 characters).');
        return;
      }
    }
    setError(null);
    await onConfirm?.(computeFinalReason());
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={title}
      width={usePresets ? 520 : 460}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant={confirmVariant} onClick={submit} loading={submitting} disabled={submitting}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && (
        <p className="t-body" style={{ marginBottom: requireReason ? 14 : 0 }}>{description}</p>
      )}

      {requireReason && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="t-body-sm" style={{ fontWeight: 500 }}>
            {reasonLabel} <span style={{ color: 'var(--error)' }}>*</span>
          </span>

          {usePresets ? (
            <>
              <ChipGroup
                ariaLabel={reasonLabel}
                options={[
                  ...reasonPresets.map((r) => ({ value: r, label: r })),
                  { value: OTHER, label: 'Other…' }
                ]}
                value={chosen}
                onChange={(v) => { setChosen(v); setError(null); }}
                disabled={submitting}
              />
              {chosen === OTHER && (
                <textarea
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder="Describe the reason"
                  rows={3}
                  autoFocus
                  disabled={submitting}
                  style={textareaStyle}
                />
              )}
            </>
          ) : (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={4}
              disabled={submitting}
              style={textareaStyle}
            />
          )}

          {error && <span className="t-body-sm" style={{ color: 'var(--error)' }}>{error}</span>}
        </div>
      )}
    </Modal>
  );
}

const textareaStyle = {
  width: '100%',
  border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface-container-low)',
  color: 'var(--text)',
  padding: '8px 10px',
  resize: 'vertical',
  font: 'inherit'
};
