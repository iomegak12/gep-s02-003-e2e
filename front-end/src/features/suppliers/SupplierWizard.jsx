import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import ChipGroup from '../../components/ui/ChipGroup.jsx';
import Field from '../../components/forms/Field.jsx';
import { supplierCreateSchema, emptySupplier, pruneEmpty } from './supplierSchema.js';
import { SUPPLIER_CATEGORY_LIST, PAYMENT_TERMS } from '../../constants/statuses.js';
import { INDIA_STATE_NAMES, citiesForState, pinForCity } from '../../constants/indiaAddress.js';
import { subcategoriesFor } from '../../constants/subcategories.js';
import './SupplierWizard.css';

const CATEGORY_OPTIONS = SUPPLIER_CATEGORY_LIST.map((c) => ({ value: c, label: c.replace(/_/g, ' ') }));
const PAYMENT_OPTIONS  = PAYMENT_TERMS.map((p) => ({ value: p, label: p.replace(/_/g, ' ') }));
const STATE_OPTIONS    = INDIA_STATE_NAMES.map((s) => ({ value: s, label: s }));

const STEPS = [
  {
    key: 'identity',
    label: 'Identity',
    fields: ['supplier_code', 'legal_name', 'display_name', 'category', 'sub_category', 'tax_id', 'tags']
  },
  {
    key: 'contact',
    label: 'Contact',
    fields: ['contact.primary_name', 'contact.email', 'contact.phone']
  },
  {
    key: 'address',
    label: 'Address',
    fields: [
      'address.street', 'address.city', 'address.state',
      'address.country', 'address.postal_code'
    ]
  },
  {
    key: 'commercial',
    label: 'Commercial',
    fields: ['country', 'region', 'payment_terms', 'currency']
  }
];

const INITIAL = (() => {
  // India is the only supported country in this wizard.
  const base = emptySupplier();
  base.country = 'IN';
  base.region = 'APAC';
  base.currency = 'INR';
  base.address.country = 'IN';
  return base;
})();

export default function SupplierWizard({
  submitting = false,
  topError = null,
  onSubmit,
  onCancel
}) {
  const {
    register, handleSubmit, control, trigger, watch, setValue,
    formState: { errors, touchedFields }
  } = useForm({
    resolver: zodResolver(supplierCreateSchema),
    defaultValues: INITIAL,
    mode: 'onBlur'
  });

  const [stepIdx, setStepIdx] = useState(0);
  const [completed, setCompleted] = useState(() => STEPS.map(() => false));

  const submit = handleSubmit((values) => onSubmit(pruneEmpty(values)));

  const validateStep = async (idx) => {
    const ok = await trigger(STEPS[idx].fields, { shouldFocus: true });
    setCompleted((prev) => {
      const next = [...prev];
      next[idx] = ok;
      return next;
    });
    return ok;
  };

  const goNext = async () => {
    const ok = await validateStep(stepIdx);
    if (ok && stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
  };
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));
  const jumpTo = async (idx) => {
    // Allow jumping to any earlier step freely, or to the next step if current is valid.
    if (idx <= stepIdx) { setStepIdx(idx); return; }
    const ok = await validateStep(stepIdx);
    if (ok) setStepIdx(Math.min(idx, stepIdx + 1));
  };

  const isLast = stepIdx === STEPS.length - 1;

  return (
    <form className="wiz" onSubmit={submit} noValidate>
      <Stepper steps={STEPS} current={stepIdx} completed={completed} onJump={jumpTo} />

      {topError && (
        <div className="wiz__banner" role="alert">
          <div>{topError.message}</div>
          {topError.correlationId && (
            <div className="t-body-sm mono" style={{ marginTop: 4 }}>ref: {topError.correlationId}</div>
          )}
        </div>
      )}

      <div className="wiz__step">
        {stepIdx === 0 && (
          <IdentityStep
            register={register}
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
            disabled={submitting}
          />
        )}
        {stepIdx === 1 && (
          <ContactStep register={register} errors={errors} disabled={submitting} />
        )}
        {stepIdx === 2 && (
          <AddressStep
            control={control}
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            disabled={submitting}
            touched={touchedFields}
          />
        )}
        {stepIdx === 3 && (
          <CommercialStep
            register={register}
            control={control}
            errors={errors}
            disabled={submitting}
          />
        )}
      </div>

      <footer className="wiz__actions">
        <div>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>
        </div>
        <div className="wiz__actions-right">
          {stepIdx > 0 && (
            <Button type="button" variant="secondary" onClick={goBack} disabled={submitting} startIcon={<ArrowLeft size={14} />}>
              Back
            </Button>
          )}
          {!isLast ? (
            <Button type="button" onClick={goNext} disabled={submitting} endIcon={<ArrowRight size={14} />}>
              Next
            </Button>
          ) : (
            <Button type="submit" loading={submitting} disabled={submitting}>
              Create supplier
            </Button>
          )}
        </div>
      </footer>
    </form>
  );
}

/* ---------- Stepped header ---------- */

function Stepper({ steps, current, completed, onJump }) {
  return (
    <ol className="wiz-stepper" aria-label="Wizard steps">
      {steps.map((s, i) => {
        const isCurrent = i === current;
        const isDone = completed[i];
        const reachable = i <= current || completed.slice(0, i).every(Boolean);
        return (
          <li key={s.key} className={[
            'wiz-step',
            isCurrent ? 'is-current' : '',
            isDone    ? 'is-done'    : ''
          ].filter(Boolean).join(' ')}>
            <button
              type="button"
              className="wiz-step__btn"
              onClick={() => reachable && onJump(i)}
              disabled={!reachable}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="wiz-step__index">
                {isDone ? <Check size={14} strokeWidth={3} /> : (i + 1)}
              </span>
              <span className="wiz-step__label">{s.label}</span>
            </button>
            {i < steps.length - 1 && <span className="wiz-step__sep" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Step 1: Identity ---------- */

function IdentityStep({ register, control, errors, watch, setValue, disabled }) {
  const category = watch('category');
  const subOptions = useMemo(() => subcategoriesFor(category), [category]);
  const [customSub, setCustomSub] = useState('');

  return (
    <div className="wiz-grid">
      <Field label="Supplier code" required error={errors.supplier_code?.message}>
        <Input {...register('supplier_code')} placeholder="SUP-IN-00123" disabled={disabled} invalid={!!errors.supplier_code} />
      </Field>
      <Field label="Legal name" required error={errors.legal_name?.message}>
        <Input {...register('legal_name')} disabled={disabled} invalid={!!errors.legal_name} />
      </Field>
      <Field label="Display name" required error={errors.display_name?.message}>
        <Input {...register('display_name')} disabled={disabled} invalid={!!errors.display_name} />
      </Field>
      <Field label="Tax ID" error={errors.tax_id?.message}>
        <Input {...register('tax_id')} disabled={disabled} />
      </Field>

      <div className="wiz-span">
        <Field label="Category" required error={errors.category?.message}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <ChipGroup
                ariaLabel="Category"
                options={CATEGORY_OPTIONS}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  // Reset sub_category when category changes so stale chips don't stay selected.
                  setValue('sub_category', '', { shouldValidate: false });
                }}
                disabled={disabled}
              />
            )}
          />
        </Field>
      </div>

      <div className="wiz-span">
        <Field
          label={category ? `Sub-category for ${category.replace(/_/g, ' ')}` : 'Sub-category'}
          hint="Pick one of the common sub-categories or type your own"
          error={errors.sub_category?.message}
        >
          <Controller
            name="sub_category"
            control={control}
            render={({ field }) => (
              <>
                {subOptions.length > 0 && (
                  <ChipGroup
                    ariaLabel="Sub-category"
                    options={subOptions.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={disabled || !category}
                  />
                )}
                <div className="wiz-inline">
                  <Input
                    value={customSub}
                    onChange={(e) => setCustomSub(e.target.value)}
                    placeholder={category ? 'Or type a custom sub-category' : 'Pick a category first'}
                    disabled={disabled || !category}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={disabled || !customSub.trim()}
                    onClick={() => {
                      field.onChange(customSub.trim());
                      setCustomSub('');
                    }}
                  >
                    Use
                  </Button>
                </div>
                {field.value && !subOptions.includes(field.value) && (
                  <span className="t-body-sm" style={{ marginTop: 4 }}>
                    Selected: <strong>{field.value}</strong>
                  </span>
                )}
              </>
            )}
          />
        </Field>
      </div>

      <div className="wiz-span">
        <Field label="Tags" hint="Comma-separated; press Enter to add">
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <TagInput value={field.value || []} onChange={field.onChange} disabled={disabled} />
            )}
          />
        </Field>
      </div>
    </div>
  );
}

/* ---------- Step 2: Contact ---------- */

function ContactStep({ register, errors, disabled }) {
  return (
    <div className="wiz-grid">
      <Field label="Primary contact" required error={errors.contact?.primary_name?.message}>
        <Input {...register('contact.primary_name')} disabled={disabled} invalid={!!errors.contact?.primary_name} />
      </Field>
      <Field label="Email" required error={errors.contact?.email?.message}>
        <Input type="email" {...register('contact.email')} disabled={disabled} invalid={!!errors.contact?.email} />
      </Field>
      <Field label="Phone" required error={errors.contact?.phone?.message}>
        <Input type="tel" {...register('contact.phone')} disabled={disabled} invalid={!!errors.contact?.phone} />
      </Field>
    </div>
  );
}

/* ---------- Step 3: Address (India only) ---------- */

function AddressStep({ control, register, errors, watch, setValue, disabled }) {
  const state = watch('address.state');
  const city  = watch('address.city');
  const cities = useMemo(() => citiesForState(state), [state]);

  // When city changes, auto-fill pin with the curated default (user can still
  // override after).
  useEffect(() => {
    if (!state || !city) return;
    const pin = pinForCity(state, city);
    if (pin) setValue('address.postal_code', pin, { shouldValidate: true });
  }, [state, city, setValue]);

  // Pin both the address country and the top-level country to IN.
  useEffect(() => {
    setValue('address.country', 'IN', { shouldValidate: true });
    setValue('country',          'IN', { shouldValidate: true });
  }, [setValue]);

  return (
    <div className="wiz-grid">
      <div className="wiz-span">
        <Field label="Country" required>
          <ChipGroup ariaLabel="Country" options={[{ value: 'IN', label: 'India (IN)' }]} value="IN" onChange={() => {}} disabled />
          <span className="t-body-sm">This wizard currently supports India only.</span>
        </Field>
      </div>

      <div className="wiz-span">
        <Field label="State" required error={errors.address?.state?.message}>
          <Controller
            name="address.state"
            control={control}
            render={({ field }) => (
              <ChipGroup
                ariaLabel="State"
                options={STATE_OPTIONS}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  // Clear city + pin when state changes.
                  setValue('address.city', '', { shouldValidate: false });
                  setValue('address.postal_code', '', { shouldValidate: false });
                }}
                disabled={disabled}
                maxHeight={180}
              />
            )}
          />
        </Field>
      </div>

      <div className="wiz-span">
        <Field
          label={state ? `City in ${state}` : 'City'}
          required
          error={errors.address?.city?.message}
          hint={!state ? 'Select a state first' : undefined}
        >
          <Controller
            name="address.city"
            control={control}
            render={({ field }) => (
              <ChipGroup
                ariaLabel="City"
                options={cities.map((c) => ({ value: c.name, label: c.name }))}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled || !state}
                maxHeight={140}
              />
            )}
          />
        </Field>
      </div>

      <Field label="Street" required error={errors.address?.street?.message}>
        <Input {...register('address.street')} disabled={disabled} invalid={!!errors.address?.street} />
      </Field>

      <Field label="Postal code" required error={errors.address?.postal_code?.message}
        hint={city ? 'Pre-filled from city — edit if needed' : undefined}>
        <Input {...register('address.postal_code')} disabled={disabled} invalid={!!errors.address?.postal_code} />
      </Field>
    </div>
  );
}

/* ---------- Step 4: Commercial ---------- */

function CommercialStep({ register, control, errors, disabled }) {
  return (
    <div className="wiz-grid">
      <div className="wiz-span">
        <Field label="Payment terms" required error={errors.payment_terms?.message}>
          <Controller
            name="payment_terms"
            control={control}
            render={({ field }) => (
              <ChipGroup
                ariaLabel="Payment terms"
                options={PAYMENT_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
        </Field>
      </div>
      <Field label="Currency" required error={errors.currency?.message}>
        <Input {...register('currency')} placeholder="INR" maxLength={3} disabled={disabled} invalid={!!errors.currency} />
      </Field>
      <Field label="Region" error={errors.region?.message}>
        <Input {...register('region')} placeholder="APAC" disabled={disabled} />
      </Field>
      <Field label="Country (ISO)" required error={errors.country?.message}>
        <Input {...register('country')} value="IN" readOnly disabled />
      </Field>
    </div>
  );
}

/* ---------- Tag input (reused) ---------- */

function TagInput({ value, onChange, disabled }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const next = draft.trim();
    if (!next || value.includes(next)) { setDraft(''); return; }
    onChange([...value, next]);
    setDraft('');
  };
  return (
    <div className="wiz-tags">
      <div className="wiz-tags__chips">
        {value.map((t) => (
          <span key={t} className="chip chip--active">{t}</span>
        ))}
      </div>
      <div className="wiz-inline">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
            if (e.key === 'Backspace' && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder="Type a tag and press Enter"
          disabled={disabled}
        />
        <Button type="button" variant="secondary" disabled={disabled || !draft.trim()} onClick={add}>Add</Button>
      </div>
    </div>
  );
}
