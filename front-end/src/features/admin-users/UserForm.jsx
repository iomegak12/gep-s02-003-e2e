import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import ChipGroup from '../../components/ui/ChipGroup.jsx';
import Field from '../../components/forms/Field.jsx';
import { ROLES } from '../../utils/roles.js';
import {
  userCreateSchema, userUpdateSchema, emptyUserDraft, toCreatePayload, toUpdatePayload
} from './userSchema.js';
import './UserForm.css';

const ROLE_OPTIONS = [
  { value: ROLES.BUYER,    label: 'Buyer' },
  { value: ROLES.APPROVER, label: 'Approver' },
  { value: ROLES.ADMIN,    label: 'Admin' }
];

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

export default function UserForm({
  mode = 'create',
  initialValues,
  submitting = false,
  topError = null,
  onSubmit,
  onCancel
}) {
  const isEdit = mode === 'edit';
  const schema  = isEdit ? userUpdateSchema : userCreateSchema;
  const defaults = isEdit
    ? {
        email: initialValues?.email || '',
        full_name: initialValues?.full_name || '',
        roles: initialValues?.roles || [],
        approval_limit: initialValues?.approval_limit ?? null,
        is_active: initialValues?.is_active ?? true,
        password: '' // unused in edit
      }
    : emptyUserDraft();

  const {
    register, handleSubmit, control, watch, setValue, formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onBlur'
  });

  const [showPassword, setShowPassword] = useState(false);
  const roles = watch('roles') || [];
  const needsLimit = roles.includes(ROLES.APPROVER);

  const submit = handleSubmit((values) => {
    const payload = isEdit ? toUpdatePayload(values) : toCreatePayload(values);
    return onSubmit(payload);
  });

  // Toggle a single role in/out of the array.
  const toggleRole = (current, role) => current.includes(role)
    ? current.filter((r) => r !== role)
    : [...current, role];

  return (
    <form className="user-form" onSubmit={submit} noValidate>
      {topError && (
        <div className="user-form__banner" role="alert">
          <div>{topError.message}</div>
          {topError.correlationId && (
            <div className="t-body-sm mono" style={{ marginTop: 4 }}>ref: {topError.correlationId}</div>
          )}
        </div>
      )}

      <section className="user-form__section">
        <h2 className="t-caps user-form__section-title">Identity</h2>
        <div className="user-form__grid">
          <Field label="Email" required error={errors.email?.message}>
            <Input
              type="email"
              {...register('email')}
              placeholder="name@company.com"
              disabled={isEdit || submitting}
              invalid={!!errors.email}
            />
          </Field>
          <Field label="Full name" required error={errors.full_name?.message}>
            <Input {...register('full_name')} disabled={isEdit || submitting} invalid={!!errors.full_name} />
          </Field>
          {!isEdit && (
            <Field label="Initial password" required error={errors.password?.message}
              hint="At least 8 characters. Share securely with the user.">
              <Input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                disabled={submitting}
                invalid={!!errors.password}
                endIcon={
                  <button type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{ display: 'inline-flex' }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
            </Field>
          )}
        </div>
      </section>

      <section className="user-form__section">
        <h2 className="t-caps user-form__section-title">Roles & access</h2>
        <div className="user-form__grid">
          <div className="user-form__span">
            <Field label="Roles" required error={errors.roles?.message}
              hint="Pick one or more — Admin includes everything.">
              <Controller
                name="roles"
                control={control}
                render={({ field }) => (
                  <div className="user-form__role-chips">
                    {ROLE_OPTIONS.map((o) => {
                      const active = (field.value || []).includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role="switch"
                          aria-checked={active}
                          className={`chip${active ? ' chip--active' : ''}`}
                          onClick={() => {
                            const next = toggleRole(field.value || [], o.value);
                            field.onChange(next);
                            // Clear approval_limit when APPROVER is removed.
                            if (o.value === ROLES.APPROVER && active) {
                              setValue('approval_limit', null, { shouldValidate: true });
                            }
                          }}
                          disabled={submitting}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </Field>
          </div>

          {needsLimit && (
            <Field label="Approval limit (INR)" required error={errors.approval_limit?.message}
              hint="Maximum PO total this approver can sign off.">
              <Controller
                name="approval_limit"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    inputMode="decimal"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === '' ? null : Number(v));
                    }}
                    disabled={submitting}
                    invalid={!!errors.approval_limit}
                  />
                )}
              />
            </Field>
          )}

          {isEdit && (
            <Field label="Account status">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <ChipGroup
                    ariaLabel="Account status"
                    options={STATUS_OPTIONS}
                    value={field.value ? 'active' : 'inactive'}
                    onChange={(v) => field.onChange(v === 'active')}
                    disabled={submitting}
                  />
                )}
              />
            </Field>
          )}
        </div>
      </section>

      <footer className="user-form__actions">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button type="submit" loading={submitting} disabled={submitting}>
          {isEdit ? 'Save changes' : 'Create user'}
        </Button>
      </footer>
    </form>
  );
}
