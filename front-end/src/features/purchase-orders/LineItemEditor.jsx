import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { addLineItem, updateLineItem, deleteLineItem } from '../../api/purchaseOrders.js';
import { normaliseError } from '../../api/errors.js';
import { UOM_OPTIONS, computeLineTotal, computeTotals } from './poSchema.js';
import './PurchaseOrderWizard.css';

const UOM_OPTS = UOM_OPTIONS.map((u) => ({ value: u, label: u }));

/**
 * Inline editor for line items on a DRAFT PO.
 *
 * Modes per row:
 *   - 'saved': not being edited — show values + Edit + Delete
 *   - 'editing': inline inputs + Save + Cancel
 *   - 'new':  unsaved row added by "Add line item" — Save creates, Cancel removes
 *
 * Add new row -> creates a transient row with mode='new'; on Save we POST.
 */
export default function LineItemEditor({ poId, currency, items = [], onChanged }) {
  const qc = useQueryClient();

  // Local mirror so we can hold transient (unsaved) rows + per-row edit state.
  const [rows, setRows] = useState(() => items.map(toSavedRow));

  // Re-sync when the server list changes.
  useEffect(() => { setRows(items.map(toSavedRow)); }, [items]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['po-line-items', poId] });
    qc.invalidateQueries({ queryKey: ['purchase-order', poId] });
    onChanged?.();
  };

  const addMut = useMutation({
    mutationFn: (item) => addLineItem(poId, item),
    onSuccess: () => { toast.success('Line added'); invalidate(); },
    onError: (err) => toast.error('Could not add line', { description: normaliseError(err).message })
  });
  const patchMut = useMutation({
    mutationFn: ({ lineId, patch }) => updateLineItem(poId, lineId, patch),
    onSuccess: () => { toast.success('Line updated'); invalidate(); },
    onError: (err) => toast.error('Could not update line', { description: normaliseError(err).message })
  });
  const delMut = useMutation({
    mutationFn: (lineId) => deleteLineItem(poId, lineId),
    onSuccess: () => { toast.success('Line removed'); invalidate(); },
    onError: (err) => toast.error('Could not delete line', { description: normaliseError(err).message })
  });

  const totals = useMemo(
    () => computeTotals(rows.map((r) => r.draft || r.li)),
    [rows]
  );

  const nextLineNumber = () => {
    const max = rows.reduce((m, r) => Math.max(m, Number((r.draft || r.li)?.line_number || 0)), 0);
    return max + 1;
  };

  const addNew = () => {
    setRows((rs) => [
      ...rs,
      {
        clientId: `new-${Date.now()}`,
        mode: 'new',
        li: null,
        draft: blankDraft(nextLineNumber())
      }
    ]);
  };

  const startEdit = (clientId) => {
    setRows((rs) => rs.map((r) => r.clientId === clientId ? { ...r, mode: 'editing', draft: { ...r.li } } : r));
  };
  const cancelEdit = (clientId) => {
    setRows((rs) => {
      const r = rs.find((x) => x.clientId === clientId);
      if (!r) return rs;
      if (r.mode === 'new') return rs.filter((x) => x.clientId !== clientId);
      return rs.map((x) => x.clientId === clientId ? { ...x, mode: 'saved', draft: null } : x);
    });
  };
  const updateDraft = (clientId, patch) => {
    setRows((rs) => rs.map((r) => r.clientId === clientId ? { ...r, draft: { ...r.draft, ...patch } } : r));
  };

  const saveRow = async (clientId) => {
    const r = rows.find((x) => x.clientId === clientId);
    if (!r) return;
    const d = r.draft;
    const validationError = validateDraft(d);
    if (validationError) { toast.error('Line invalid', { description: validationError }); return; }

    if (r.mode === 'new') {
      await addMut.mutateAsync(toServerPayload(d));
    } else {
      await patchMut.mutateAsync({ lineId: r.li.id, patch: toServerPayload(d) });
    }
    // Server invalidate will reset rows via effect.
  };

  const deleteRow = (r) => {
    if (r.mode === 'new') {
      setRows((rs) => rs.filter((x) => x.clientId !== r.clientId));
      return;
    }
    if (!confirm(`Delete line ${r.li.line_number} (${r.li.item_description})?`)) return;
    delMut.mutate(r.li.id);
  };

  const busy = addMut.isPending || patchMut.isPending || delMut.isPending;

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No line items yet"
        description="A DRAFT PO needs at least one line before it can be submitted."
        action={<Button onClick={addNew} startIcon={<Plus size={14} />}>Add the first line</Button>}
      />
    );
  }

  return (
    <>
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

        {rows.map((r) => {
          const editing = r.mode === 'editing' || r.mode === 'new';
          const data = editing ? r.draft : r.li;
          const lineTotal = computeLineTotal(data);

          if (!editing) {
            return (
              <div className="li-table__row" key={r.clientId}>
                <span>{data.line_number}</span>
                <span title={data.item_description} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {data.item_description}
                </span>
                <span className="mono t-body-sm">{data.sku || '—'}</span>
                <span style={{ textAlign: 'right' }}>{Number(data.quantity).toLocaleString()}</span>
                <span>{data.unit_of_measure}</span>
                <span style={{ textAlign: 'right' }}>{formatMoney(data.unit_price, currency)}</span>
                <span style={{ textAlign: 'right' }}>{Number(data.tax_rate ?? 0).toFixed(2)}</span>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(lineTotal, currency)}</span>
                <span style={{ display: 'inline-flex', gap: 2, justifyContent: 'flex-end' }}>
                  <button type="button" className="li-del" title="Edit" onClick={() => startEdit(r.clientId)} disabled={busy} style={{ color: 'var(--text-muted)' }}>
                    ✎
                  </button>
                  <button type="button" className="li-del" title="Delete" onClick={() => deleteRow(r)} disabled={busy}>
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            );
          }

          return (
            <div className="li-table__row" key={r.clientId}>
              <span style={{ color: 'var(--text-muted)' }}>{data.line_number}</span>
              <input className="li-input" placeholder="Item description"
                value={data.item_description}
                onChange={(e) => updateDraft(r.clientId, { item_description: e.target.value })}
                disabled={busy}
              />
              <input className="li-input" placeholder="(optional)"
                value={data.sku || ''}
                onChange={(e) => updateDraft(r.clientId, { sku: e.target.value })}
                disabled={busy}
              />
              <input className="li-input li-input--num" type="number" step="0.001" min={0}
                value={data.quantity}
                onChange={(e) => updateDraft(r.clientId, { quantity: Number(e.target.value) })}
                disabled={busy}
              />
              <Select
                options={UOM_OPTS}
                placeholder="UoM"
                value={data.unit_of_measure || ''}
                onChange={(e) => updateDraft(r.clientId, { unit_of_measure: e.target.value })}
                disabled={busy}
              />
              <input className="li-input li-input--num" type="number" step="0.01" min={0}
                value={data.unit_price}
                onChange={(e) => updateDraft(r.clientId, { unit_price: Number(e.target.value) })}
                disabled={busy}
              />
              <input className="li-input li-input--num" type="number" step="0.01" min={0} max={100}
                value={data.tax_rate}
                onChange={(e) => updateDraft(r.clientId, { tax_rate: Number(e.target.value) })}
                disabled={busy}
              />
              <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(lineTotal, currency)}</span>
              <span style={{ display: 'inline-flex', gap: 2, justifyContent: 'flex-end' }}>
                <button type="button" className="li-del" title="Save" onClick={() => saveRow(r.clientId)} disabled={busy} style={{ color: 'var(--primary)' }}>
                  <Save size={14} />
                </button>
                <button type="button" className="li-del" title="Cancel" onClick={() => cancelEdit(r.clientId)} disabled={busy} style={{ color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
        <Button variant="secondary" onClick={addNew} disabled={busy} startIcon={<Plus size={14} />}>
          Add line item
        </Button>
        <div className="li-totals">
          <div className="li-totals__cell">
            <span className="t-body-sm">Subtotal</span>
            <span className="t-body">{formatMoney(totals.subtotal, currency)}</span>
          </div>
          <div className="li-totals__cell">
            <span className="t-body-sm">Tax</span>
            <span className="t-body">{formatMoney(totals.tax_amount, currency)}</span>
          </div>
          <div className="li-totals__cell">
            <span className="t-body-sm">Total</span>
            <span className="t-headline">{formatMoney(totals.total_amount, currency)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- helpers ---------- */

function toSavedRow(li) {
  return { clientId: `s-${li.id}`, mode: 'saved', li, draft: null };
}

function blankDraft(line_number) {
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

function validateDraft(d) {
  if (!d.item_description || d.item_description.trim().length < 2) return 'Description is required.';
  if (!Number.isFinite(d.quantity) || d.quantity <= 0) return 'Quantity must be > 0.';
  if (!UOM_OPTIONS.includes(d.unit_of_measure)) return 'Pick a UoM.';
  if (!Number.isFinite(d.unit_price) || d.unit_price < 0) return 'Unit price must be ≥ 0.';
  if (!Number.isFinite(d.tax_rate) || d.tax_rate < 0 || d.tax_rate > 100) return 'Tax rate must be 0–100.';
  if (!Number.isFinite(d.line_number) || d.line_number < 1) return 'Line # must be ≥ 1.';
  return null;
}

function toServerPayload(d) {
  const out = {
    line_number: d.line_number,
    item_description: d.item_description.trim(),
    quantity: d.quantity,
    unit_of_measure: d.unit_of_measure,
    unit_price: d.unit_price,
    tax_rate: d.tax_rate
  };
  if (d.sku && d.sku.trim()) out.sku = d.sku.trim();
  return out;
}

function formatMoney(amount, currency) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(Number(amount));
  } catch (_) {
    return `${currency || ''} ${Number(amount).toLocaleString()}`;
  }
}
