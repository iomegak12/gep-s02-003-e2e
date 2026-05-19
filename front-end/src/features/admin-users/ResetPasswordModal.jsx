import { useEffect, useState } from 'react';
import { Eye, EyeOff, Shuffle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { resetUserPassword } from '../../api/iam.js';
import { normaliseError } from '../../api/errors.js';

const MIN_LEN = 8;

export default function ResetPasswordModal({ open, user, onClose, onAfter }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) { setPassword(''); setShow(false); setError(null); }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => resetUserPassword(user.id, password),
    onSuccess: () => {
      toast.success('Password reset', {
        description: 'Share the new password with the user securely.'
      });
      onAfter?.();
      onClose?.();
    },
    onError: (err) => {
      const e = normaliseError(err);
      setError(e.message || 'Could not reset password.');
    }
  });

  const generate = () => {
    // 12-char password with mixed classes — copied to the field.
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    const out = Array.from({ length: 12 }, () =>
      charset[Math.floor(Math.random() * charset.length)]
    ).join('');
    setPassword(out);
    setShow(true);
    setError(null);
  };

  const submit = () => {
    if (password.length < MIN_LEN) {
      setError(`At least ${MIN_LEN} characters.`); return;
    }
    setError(null);
    mutation.mutate();
  };

  if (!open || !user) return null;

  return (
    <Modal
      open
      onClose={mutation.isPending ? undefined : onClose}
      title="Reset password"
      width={460}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={submit} loading={mutation.isPending} disabled={mutation.isPending}>
            Reset password
          </Button>
        </>
      }
    >
      <p className="t-body">
        Set a new password for <strong>{user.full_name || user.email}</strong>.
        They will be able to sign in with it immediately.
      </p>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        <span className="t-body-sm" style={{ fontWeight: 500 }}>
          New password <span style={{ color: 'var(--error)' }}>*</span>
        </span>
        <Input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={mutation.isPending}
          invalid={!!error}
          endIcon={
            <button type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              style={{ display: 'inline-flex' }}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span className="t-body-sm">Minimum {MIN_LEN} characters.</span>
          <Button type="button" variant="ghost" startIcon={<Shuffle size={14} />} onClick={generate} disabled={mutation.isPending}>
            Generate
          </Button>
        </div>
        {error && <span className="t-body-sm" style={{ color: 'var(--error)' }}>{error}</span>}
      </label>
    </Modal>
  );
}
