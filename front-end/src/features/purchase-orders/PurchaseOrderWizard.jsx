import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Search, Plus, Trash2 } from 'lucide-react';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ChipGroup from '../../components/ui/ChipGroup.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Field from '../../components/forms/Field.jsx';
import { searchSuppliers, listSuppliers } from '../../api/suppliers.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { INDIA_STATE_NAMES, citiesForState, pinForCity } from '../../constants/indiaAddress.js';
import { PAYMENT_TERMS, SUPPLIER_STATUS } from '../../constants/statuses.js';
import {
  poCreateSchema, emptyPoDraft, toCreatePayload, computeLineTotal, computeTotals, UOM_OPTIONS
} from './poSchema.js';
import '../suppliers/SupplierWizard.css';
import './PurchaseOrderWizard.css';

const PAYMENT_OPTIONS = PAYMENT_TERMS.map((p) => ({ value: p, label: p.replace(/_/g, ' ') }));
const STATE_OPTIONS   = INDIA_STATE_NAMES.map((s) => ({ value: s, label: s }));
const UOM_CHIPS       = UOM_OPTIONS.map((u) => ({ value: u, label: u }));

const STEPS = [
  { key: 'supplier',   label: 'Supplier',           fields: ['supplier_id'] },
  { key: 'items',      label: 'Line items',         fields: ['line_items'] },
  { key: 'delivery',   label: 'Delivery & terms',
    fields: ['currency', 'expected_delivery_date', 'payment_terms',
             'delivery_address.street', 'delivery_address.city', 'delivery_address.state',
             'delivery_address.country', 'delivery_address.postal_code', 'notes'] },
  { key: 'review',     label: 'Review',             fields: [] }
];

export default function PurchaseOrderWizard({ submitting = false, topError, onSubmit, onCancel }) {
  const form = useForm({
    resolver: zodResolver(poCreateSchema),
    defaultValues: emptyPoDraft(),
    mode: 'onBlur'
  });
  const { register, control, handleSubmit, trigger, watch, setValue, formState: { errors } } = form;

  const [stepIdx, setStepIdx]     = useState(0);
  const [completed, setCompleted] = useState(() => STEPS.map(() => false));

  const validateStep = async (idx) => {
    const ok = await trigger(STEPS[idx].fields, { shouldFocus: true });
    setCompleted((prev) => { const n = [...prev]; n[idx] = ok; return n; });
    return ok;
  };

  const goNext = async () => { if (await validateStep(stepIdx) && stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1); };
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));
  const jumpTo = async (idx) => {
    if (idx <= stepIdx) { setStepIdx(idx); return; }
    if (await validateStep(stepIdx)) setStepIdx(Math.min(idx, stepIdx + 1));
  };

  const submit = handleSubmit((values) => onSubmit(toCreatePayload(values)));
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
          <SupplierStep watch={watch} setValue={setValue} errors={errors} disabled={submitting} />
        )}
        {stepIdx === 1 && (
          <LineItemsStep control={control} register={register} errors={errors} disabled={submitting} />
        )}
        {stepIdx === 2 && (
          <DeliveryStep
            register={register} control={control} errors={errors} watch={watch} setValue={setValue} disabled={submitting}
          />
        )}
        {stepIdx === 3 && (
          <ReviewStep control={control} />
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
              Create PO
            </Button>
          )}
        </div>
      </footer>
    </form>
  );
}

/* ---------- Stepper (same look as SupplierWizard) ---------- */
function Stepper({ steps, current, completed, onJump }) {
  return (
    <ol className="wiz-stepper" aria-label="Wizard steps">
      {steps.map((s, i) => {
        const isCurrent = i === current;
        const isDone = completed[i];
        const reachable = i <= current || completed.slice(0, i).every(Boolean);
        return (
          <li key={s.key} className={`wiz-step${isCurrent ? ' is-current' : ''}${isDone ? ' is-done' : ''}`}>
            <button type="button" className="wiz-step__btn"
              onClick={() => reachable && onJump(i)} disabled={!reachable}
              aria-current={isCurrent ? 'step' : undefined}>
              <span className="wiz-step__index">{isDone ? <Check size={14} strokeWidth={3} /> : (i + 1)}</span>
              <span className="wiz-step__label">{s.label}</span>
            </button>
            {i < steps.length - 1 && <span className="wiz-step__sep" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

/* =========================================================== */
/* Step 1 — Supplier picker                                    */
/* =========================================================== */

function SupplierStep({ watch, setValue, errors, disabled }) {
  const chosenId = watch('supplier_id');
  const chosenSnapshot = watch('supplier_snapshot');

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 250);

  // If no search query, show recent active suppliers.
  const searchQ = useQuery({
    queryKey: ['suppliers-search-po', dq],
    queryFn: () => dq.trim()
      ? searchSuppliers(dq, 20)
      : listSuppliers({ status: SUPPLIER_STATUS.ACTIVE, page: 1, page_size: 12, sort: '-rating' })
  });
  const results = (searchQ.data?.data || []).map((s) => s);

  const choose = (s) => {
    if (s.status !== SUPPLIER_STATUS.ACTIVE) return;
    setValue('supplier_id', s.id, { shouldValidate: true });
    setValue('supplier_snapshot', { display_name: s.display_name, supplier_code: s.supplier_code, category: s.category });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Find supplier" required error={errors.supplier_id?.message}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or code"
          startIcon={<Search size={14} />}
          disabled={disabled}
        />
      </Field>

      {chosenId && chosenSnapshot && (
        <div className="po-wiz__chosen">
          <div>
            <div className="mono t-body-sm">{chosenSnapshot.supplier_code}</div>
            <div className="t-body" style={{ fontWeight: 600 }}>{chosenSnapshot.display_name}</div>
            <div className="t-body-sm">{String(chosenSnapshot.category || '').replace(/_/g, ' ')}</div>
          </div>
          <Badge tone="active">Selected</Badge>
        </div>
      )}

      <div className="po-wiz__sup-grid">
        {searchQ.isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="po-wiz__sup-card"><Skeleton width="60%" height={12} /></div>
        ))}
        {!searchQ.isLoading && results.length === 0 && (
          <span className="t-body-sm">No matches.</span>
        )}
        {results.map((s) => {
          const active = s.status === SUPPLIER_STATUS.ACTIVE;
          const isChosen = s.id === chosenId;
          return (
            <button
              type="button"
              key={s.id}
              className={`po-wiz__sup-card${isChosen ? ' is-chosen' : ''}${!active ? ' is-disabled' : ''}`}
              onClick={() => choose(s)}
              disabled={disabled || !active}
              title={active ? 'Select this supplier' : 'Not active — cannot receive new POs'}
            >
              <div className="mono t-body-sm">{s.supplier_code}</div>
              <div className="t-body" style={{ fontWeight: 600 }}>{s.display_name}</div>
              <div className="t-body-sm">{String(s.category || '').replace(/_/g, ' ')}</div>
              {!active && (
                <Badge tone={s.status === 'BLACKLISTED' ? 'error' : 'inactive'}>
                  {s.status}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================== */
/* Step 2 — Line items                                         */
/* =========================================================== */

function LineItemsStep({ control, register, errors, disabled }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'line_items' });
  // useWatch subscribes this component to the array AND to deep changes within
  // each row, so totals re-compute on every keystroke (the plain `watch()` we
  // had before only fires on validation / blur).
  const items = useWatch({ control, name: 'line_items' }) || [];
  const currency = useWatch({ control, name: 'currency' }) || 'INR';
  const totals = computeTotals(items);

  // Auto-add an empty row so the user has something to fill on first visit.
  // Use a ref so React 18 StrictMode's double-invoke of effects doesn't seed
  // two rows (which would later collide on the unique (po_id, line_number)
  // constraint at the back-end).
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && fields.length === 0) {
      append(blankLineItem(1));
      seededRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addRow = () => append(blankLineItem(items.length + 1));

  const rowErrors = errors.line_items;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {typeof rowErrors?.message === 'string' && (
        <div className="t-body-sm" style={{ color: 'var(--error)' }}>{rowErrors.message}</div>
      )}

      <div className="li-table">
        <div className="li-table__head">
          <span>#</span>
          <span>Description</span>
          <span>SKU</span>
          <span style={{ textAlign: 'right' }}>Qty</span>
          <span>UoM</span>
          <span style={{ textAlign: 'right' }}>Unit price</span>
          <span style={{ textAlign: 'right' }}>Tax %</span>
          <span style={{ textAlign: 'right' }}>Line total</span>
          <span />
        </div>

        {fields.map((f, idx) => {
          const li = items[idx] || {};
          const lineTotal = computeLineTotal(li);
          const e = rowErrors?.[idx] || {};
          return (
            <div className="li-table__row" key={f.id}>
              {/* line_number is auto-assigned on submit; show position only */}
              <span style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>
              <div>
                <input
                  className="li-input"
                  {...register(`line_items.${idx}.item_description`)}
                  placeholder="Item description"
                  disabled={disabled}
                  aria-invalid={!!e.item_description}
                />
                {e.item_description && <span className="li-error">{e.item_description.message}</span>}
              </div>
              <input
                className="li-input"
                {...register(`line_items.${idx}.sku`)}
                placeholder="(optional)"
                disabled={disabled}
              />
              <div>
                <input
                  className="li-input li-input--num"
                  type="number"
                  step="0.001"
                  min={0}
                  {...register(`line_items.${idx}.quantity`, { valueAsNumber: true })}
                  disabled={disabled}
                  aria-invalid={!!e.quantity}
                />
                {e.quantity && <span className="li-error">{e.quantity.message}</span>}
              </div>
              <div>
                <Controller
                  control={control}
                  name={`line_items.${idx}.unit_of_measure`}
                  render={({ field }) => (
                    <Select
                      placeholder="UoM"
                      options={UOM_CHIPS}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      disabled={disabled}
                    />
                  )}
                />
                {e.unit_of_measure && <span className="li-error">{e.unit_of_measure.message}</span>}
              </div>
              <input
                className="li-input li-input--num"
                type="number"
                step="0.01"
                min={0}
                {...register(`line_items.${idx}.unit_price`, { valueAsNumber: true })}
                disabled={disabled}
              />
              <input
                className="li-input li-input--num"
                type="number"
                step="0.01"
                min={0}
                max={100}
                {...register(`line_items.${idx}.tax_rate`, { valueAsNumber: true })}
                disabled={disabled}
              />
              <span className="li-total">{formatMoney(lineTotal, currency)}</span>
              <button type="button" className="li-del" aria-label="Remove line"
                onClick={() => remove(idx)} disabled={disabled || fields.length === 1}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Button type="button" variant="secondary" onClick={addRow} startIcon={<Plus size={14} />} disabled={disabled}>
          Add line item
        </Button>
        <Totals totals={totals} currency={currency} />
      </div>
    </div>
  );
}

function Totals({ totals, currency }) {
  return (
    <div className="li-totals">
      <Total label="Subtotal" value={formatMoney(totals.subtotal,    currency)} />
      <Total label="Tax"      value={formatMoney(totals.tax_amount,  currency)} />
      <Total label="Total"    value={formatMoney(totals.total_amount, currency)} strong />
    </div>
  );
}
function Total({ label, value, strong }) {
  return (
    <div className="li-totals__cell">
      <span className="t-body-sm">{label}</span>
      <span className={strong ? 't-headline' : 't-body'}>{value}</span>
    </div>
  );
}

function blankLineItem(line_number) {
  return {
    line_number,
    item_description: '',
    sku: '',
    quantity: 1,
    unit_of_measure: 'EA',
    unit_price: 0,
    tax_rate: 18
  };
}

/* =========================================================== */
/* Step 3 — Delivery & terms (India-only address, chip pickers) */
/* =========================================================== */

function DeliveryStep({ register, control, errors, watch, setValue, disabled }) {
  const state = watch('delivery_address.state');
  const city  = watch('delivery_address.city');
  const cities = useMemo(() => citiesForState(state), [state]);

  // Auto-fill pin when city changes.
  useEffect(() => {
    if (!state || !city) return;
    const pin = pinForCity(state, city);
    if (pin) setValue('delivery_address.postal_code', pin, { shouldValidate: true });
  }, [state, city, setValue]);

  // Pin country to IN.
  useEffect(() => { setValue('delivery_address.country', 'IN', { shouldValidate: true }); }, [setValue]);

  return (
    <div className="wiz-grid">
      <Field label="Currency" required error={errors.currency?.message}>
        <Input {...register('currency')} placeholder="INR" maxLength={3} disabled={disabled} invalid={!!errors.currency} />
      </Field>

      <Field label="Expected delivery date" required error={errors.expected_delivery_date?.message}>
        <Input type="date" {...register('expected_delivery_date')} disabled={disabled}
          invalid={!!errors.expected_delivery_date} min={new Date().toISOString().slice(0, 10)} />
      </Field>

      <div className="wiz-span">
        <Field label="Payment terms" required error={errors.payment_terms?.message}>
          <Controller
            control={control}
            name="payment_terms"
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

      <div className="wiz-span">
        <Field label="Ship to — country" required>
          <ChipGroup options={[{ value: 'IN', label: 'India (IN)' }]} value="IN" onChange={() => {}} disabled />
          <span className="t-body-sm">India only (other countries coming later).</span>
        </Field>
      </div>

      <div className="wiz-span">
        <Field label="State" required error={errors.delivery_address?.state?.message}>
          <Controller
            control={control}
            name="delivery_address.state"
            render={({ field }) => (
              <ChipGroup
                ariaLabel="State"
                options={STATE_OPTIONS}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  setValue('delivery_address.city', '', { shouldValidate: false });
                  setValue('delivery_address.postal_code', '', { shouldValidate: false });
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
          error={errors.delivery_address?.city?.message}
          hint={!state ? 'Select a state first' : undefined}
        >
          <Controller
            control={control}
            name="delivery_address.city"
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

      <Field label="Street" required error={errors.delivery_address?.street?.message}>
        <Input {...register('delivery_address.street')} disabled={disabled} invalid={!!errors.delivery_address?.street} />
      </Field>

      <Field label="Postal code" required error={errors.delivery_address?.postal_code?.message}
        hint={city ? 'Pre-filled from city — edit if needed' : undefined}>
        <Input {...register('delivery_address.postal_code')} disabled={disabled}
          invalid={!!errors.delivery_address?.postal_code} />
      </Field>

      <div className="wiz-span">
        <Field label="Notes" hint="Internal notes shown on the PO">
          <textarea
            {...register('notes')}
            rows={3}
            disabled={disabled}
            placeholder="Optional notes"
            style={{
              width: '100%',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface-container-low)',
              color: 'var(--text)',
              padding: '8px 10px',
              resize: 'vertical',
              font: 'inherit'
            }}
          />
        </Field>
      </div>
    </div>
  );
}

/* =========================================================== */
/* Step 4 — Review                                              */
/* =========================================================== */

function ReviewStep({ control }) {
  const all = useWatch({ control }) || {};
  const totals = computeTotals(all.line_items || []);
  const supplier = all.supplier_snapshot;

  return (
    <div className="po-review">
      <section className="po-review__panel">
        <h3 className="t-caps">Supplier</h3>
        {supplier ? (
          <>
            <div className="mono t-body-sm">{supplier.supplier_code}</div>
            <div className="t-body" style={{ fontWeight: 600 }}>{supplier.display_name}</div>
            <div className="t-body-sm">{String(supplier.category || '').replace(/_/g, ' ')}</div>
          </>
        ) : <span className="t-body-sm">—</span>}
      </section>

      <section className="po-review__panel">
        <h3 className="t-caps">Delivery & terms</h3>
        <ReviewRow label="Payment terms" value={all.payment_terms} />
        <ReviewRow label="Currency" value={all.currency} />
        <ReviewRow label="Expected delivery" value={all.expected_delivery_date} />
        <ReviewRow
          label="Ship to"
          value={all.delivery_address
            ? `${all.delivery_address.street}, ${all.delivery_address.city}, ${all.delivery_address.state} ${all.delivery_address.postal_code}, ${all.delivery_address.country}`
            : '—'}
        />
        {all.notes && <ReviewRow label="Notes" value={all.notes} />}
      </section>

      <section className="po-review__panel po-review__items">
        <h3 className="t-caps">Line items ({(all.line_items || []).length})</h3>
        <div className="li-table" style={{ marginTop: 8 }}>
          <div className="li-table__head li-table__head--review">
            <span>#</span><span>Description</span>
            <span style={{ textAlign: 'right' }}>Qty</span><span>UoM</span>
            <span style={{ textAlign: 'right' }}>Unit price</span>
            <span style={{ textAlign: 'right' }}>Tax %</span>
            <span style={{ textAlign: 'right' }}>Line total</span>
          </div>
          {(all.line_items || []).map((li, i) => (
            <div className="li-table__row li-table__row--review" key={i}>
              <span>{li.line_number}</span>
              <span>{li.item_description}</span>
              <span style={{ textAlign: 'right' }}>{Number(li.quantity || 0).toLocaleString()}</span>
              <span>{li.unit_of_measure}</span>
              <span style={{ textAlign: 'right' }}>{formatMoney(li.unit_price, all.currency)}</span>
              <span style={{ textAlign: 'right' }}>{Number(li.tax_rate || 0).toFixed(2)}</span>
              <span style={{ textAlign: 'right', fontWeight: 600 }}>
                {formatMoney(computeLineTotal(li), all.currency)}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Totals totals={totals} currency={all.currency} />
        </div>
      </section>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="po-review__row">
      <span className="t-body-sm">{label}</span>
      <span className="t-body">{value || '—'}</span>
    </div>
  );
}

function formatMoney(amount, currency) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(Number(amount));
  } catch (_) {
    return `${currency || ''} ${Number(amount).toLocaleString()}`;
  }
}
