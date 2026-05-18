import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import ChipGroup from '../../components/ui/ChipGroup.jsx';
import Field from '../../components/forms/Field.jsx';
import {
  supplierCreateSchema, supplierUpdateSchema, emptySupplier, supplierToFormValues, pruneEmpty
} from './supplierSchema.js';
import { SUPPLIER_CATEGORY_LIST, PAYMENT_TERMS } from '../../constants/statuses.js';
import { subcategoriesFor } from '../../constants/subcategories.js';
import './SupplierForm.css';

const CATEGORY_OPTIONS = SUPPLIER_CATEGORY_LIST.map((c) => ({ value: c, label: c.replace(/_/g, ' ') }));
const PAYMENT_OPTIONS  = PAYMENT_TERMS.map((p) => ({ value: p, label: p.replace(/_/g, ' ') }));

export default function SupplierForm({
  mode = 'create',           // 'create' | 'edit'
  initialValues,             // for edit: existing supplier
  submitting = false,
  topError = null,           // { message, correlationId } from API
  onSubmit,                  // (cleanedPayload) => Promise<void>
  onCancel
}) {
  const isEdit = mode === 'edit';
  const schema = isEdit ? supplierUpdateSchema : supplierCreateSchema;
  const defaults = isEdit ? supplierToFormValues(initialValues || {}) : emptySupplier();

  const {
    register, handleSubmit, control, watch, setValue, formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onBlur'
  });

  const category = watch('category');
  const subOptions = useMemo(() => subcategoriesFor(category), [category]);
  const [customSub, setCustomSub] = useState('');

  const submit = handleSubmit((values) => {
    // Drop empty optionals; on edit, also strip supplier_code (immutable).
    const cleaned = pruneEmpty(values);
    if (isEdit) delete cleaned.supplier_code;
    return onSubmit(cleaned);
  });

  return (
    <form className="sup-form" onSubmit={submit} noValidate>
      {topError && (
        <div className="sup-form__banner" role="alert">
          <div>{topError.message}</div>
          {topError.correlationId && (
            <div className="t-body-sm mono" style={{ marginTop: 4 }}>ref: {topError.correlationId}</div>
          )}
        </div>
      )}

      <Section title="Identity">
        <Field label="Supplier code" required error={errors.supplier_code?.message}>
          <Input
            {...register('supplier_code')}
            placeholder="SUP-IN-00123"
            disabled={isEdit || submitting}
            invalid={!!errors.supplier_code}
          />
        </Field>
        <Field label="Legal name" required error={errors.legal_name?.message}>
          <Input {...register('legal_name')} disabled={submitting} invalid={!!errors.legal_name} />
        </Field>
        <Field label="Display name" required error={errors.display_name?.message}>
          <Input {...register('display_name')} disabled={submitting} invalid={!!errors.display_name} />
        </Field>
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
                  setValue('sub_category', '', { shouldValidate: false });
                }}
                disabled={submitting}
              />
            )}
          />
        </Field>
        <Field
          label={category ? `Sub-category for ${category.replace(/_/g, ' ')}` : 'Sub-category'}
          hint="Pick one or type a custom value"
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
                    disabled={submitting || !category}
                  />
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    value={customSub}
                    onChange={(e) => setCustomSub(e.target.value)}
                    placeholder={category ? 'Or type a custom sub-category' : 'Pick a category first'}
                    disabled={submitting || !category}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={submitting || !customSub.trim()}
                    onClick={() => { field.onChange(customSub.trim()); setCustomSub(''); }}
                  >
                    Use
                  </Button>
                </div>
                {field.value && !subOptions.includes(field.value) && (
                  <span className="t-body-sm">Selected: <strong>{field.value}</strong></span>
                )}
              </>
            )}
          />
        </Field>
        <Field label="Tax ID" error={errors.tax_id?.message}>
          <Input {...register('tax_id')} disabled={submitting} />
        </Field>
        <Field label="Tags" hint="Comma-separated, e.g. preferred, msme">
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <TagInput value={field.value || []} onChange={field.onChange} disabled={submitting} />
            )}
          />
        </Field>
      </Section>

      <Section title="Contact">
        <Field label="Primary contact" required error={errors.contact?.primary_name?.message}>
          <Input {...register('contact.primary_name')} disabled={submitting} invalid={!!errors.contact?.primary_name} />
        </Field>
        <Field label="Email" required error={errors.contact?.email?.message}>
          <Input type="email" {...register('contact.email')} disabled={submitting} invalid={!!errors.contact?.email} />
        </Field>
        <Field label="Phone" required error={errors.contact?.phone?.message}>
          <Input type="tel" {...register('contact.phone')} disabled={submitting} invalid={!!errors.contact?.phone} />
        </Field>
      </Section>

      <Section title="Address">
        <Field label="Street" required error={errors.address?.street?.message}>
          <Input {...register('address.street')} disabled={submitting} invalid={!!errors.address?.street} />
        </Field>
        <Field label="City" required error={errors.address?.city?.message}>
          <Input {...register('address.city')} disabled={submitting} invalid={!!errors.address?.city} />
        </Field>
        <Field label="State" required error={errors.address?.state?.message}>
          <Input {...register('address.state')} disabled={submitting} invalid={!!errors.address?.state} />
        </Field>
        <Field label="Country (ISO)" required error={errors.address?.country?.message}>
          <Input {...register('address.country')} disabled={submitting} placeholder="IN" maxLength={2} invalid={!!errors.address?.country} />
        </Field>
        <Field label="Postal code" required error={errors.address?.postal_code?.message}>
          <Input {...register('address.postal_code')} disabled={submitting} invalid={!!errors.address?.postal_code} />
        </Field>
      </Section>

      <Section title="Commercial">
        <Field label="Country (ISO)" required error={errors.country?.message}>
          <Input {...register('country')} disabled={submitting} placeholder="IN" maxLength={2} invalid={!!errors.country} />
        </Field>
        <Field label="Region" error={errors.region?.message}>
          <Input {...register('region')} disabled={submitting} placeholder="APAC" />
        </Field>
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
                disabled={submitting}
              />
            )}
          />
        </Field>
        <Field label="Currency" required error={errors.currency?.message}>
          <Input {...register('currency')} disabled={submitting} placeholder="INR" maxLength={3} invalid={!!errors.currency} />
        </Field>
      </Section>

      <footer className="sup-form__actions">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button type="submit" loading={submitting} disabled={submitting}>
          {isEdit ? 'Save changes' : 'Create supplier'}
        </Button>
      </footer>
    </form>
  );
}

function Section({ title, children }) {
  return (
    <section className="sup-form__section">
      <h2 className="t-caps sup-form__section-title">{title}</h2>
      <div className="sup-form__grid">{children}</div>
    </section>
  );
}

function TagInput({ value, onChange, disabled }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const next = draft.trim();
    if (!next || value.includes(next)) { setDraft(''); return; }
    onChange([...value, next]);
    setDraft('');
  };
  return (
    <div className="tag-input">
      <div className="tag-input__chips">
        {value.map((t) => (
          <span key={t} className="tag-input__chip">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} disabled={disabled} aria-label={`Remove ${t}`}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder="Type a tag and press Enter"
        disabled={disabled}
      />
    </div>
  );
}
