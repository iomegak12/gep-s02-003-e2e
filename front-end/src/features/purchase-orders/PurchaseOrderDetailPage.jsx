import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, XCircle, Truck, Ban, RotateCcw, Lock } from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { ROLES } from '../../utils/roles.js';
import LineItemEditor from './LineItemEditor.jsx';
import { getPurchaseOrder, getPoLineItems } from '../../api/purchaseOrders.js';
import { normaliseError } from '../../api/errors.js';
import { PO_STATUS_TONE } from '../../constants/statuses.js';
import { poActionsFor, PO_ACTION_META } from './poActions.js';
import { usePoAction } from './usePoAction.js';
import PoActionDialog from './PoActionDialog.jsx';
import './PurchaseOrderDetailPage.css';

const STATUS_LABEL = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved',
  REJECTED: 'Rejected', FULFILLED: 'Fulfilled', CLOSED: 'Closed', CANCELLED: 'Cancelled'
};

const ICON = {
  submit:  <Send size={14} />,
  approve: <CheckCircle2 size={14} />,
  reject:  <XCircle size={14} />,
  fulfill: <Truck size={14} />,
  cancel:  <Ban size={14} />,
  revise:  <RotateCcw size={14} />,
  close:   <Lock size={14} />
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { roles, hasRole } = useAuth();
  const canEditLines = hasRole(ROLES.BUYER) || hasRole(ROLES.ADMIN);

  const action = usePoAction();

  const poQ = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => getPurchaseOrder(id),
    enabled: !!id
  });
  const itemsQ = useQuery({
    queryKey: ['po-line-items', id],
    queryFn: () => getPoLineItems(id),
    enabled: !!id
  });

  if (poQ.isLoading) return <PoDetailSkeleton />;
  if (poQ.isError) {
    const e = normaliseError(poQ.error);
    return (
      <EmptyState
        title={e.code === 'PURCHASE_ORDER_NOT_FOUND' ? 'Purchase order not found' : 'Could not load PO'}
        description={e.message}
        action={<Button onClick={() => navigate('/purchase-orders')} startIcon={<ArrowLeft size={14} />}>Back to purchase orders</Button>}
      />
    );
  }

  const p = poQ.data;
  const items = itemsQ.data || [];
  const acts = poActionsFor(p.status, roles);

  return (
    <div>
      <div className="po-detail__crumb">
        <Link to="/purchase-orders" className="po-detail__back">
          <ArrowLeft size={14} /> Purchase orders
        </Link>
      </div>

      <header className="po-detail__header">
        <div>
          <div className="mono t-body-sm">{p.po_number}</div>
          <h1 className="t-headline">{p.supplier_snapshot?.display_name || '—'}</h1>
        </div>
        <div className="po-detail__header-meta">
          <Badge tone={PO_STATUS_TONE[p.status] || 'neutral'}>{STATUS_LABEL[p.status] || p.status}</Badge>
          {p.requires_approval && p.status === 'DRAFT' && (
            <Badge tone="pending" variant="outline">Needs approval</Badge>
          )}
        </div>
      </header>

      {/* KPI tiles */}
      <div className="po-detail__kpis">
        <Kpi label="Total" value={formatMoney(p.total_amount, p.currency)} />
        <Kpi label="Subtotal" value={formatMoney(p.subtotal, p.currency)} subtle />
        <Kpi label="Tax" value={formatMoney(p.tax_amount, p.currency)} subtle />
        <Kpi label="Expected delivery"
          value={p.expected_delivery_date ? new Date(p.expected_delivery_date).toLocaleDateString() : '—'}
          subtle
        />
      </div>

      {/* Action bar */}
      {acts.length > 0 && (
        <div className="po-detail__actionbar">
          <span className="t-body-sm">Actions:</span>
          {acts.map((a) => {
            const meta = PO_ACTION_META[a];
            return (
              <Button
                key={a}
                variant={meta.variant}
                startIcon={ICON[a]}
                onClick={() => action.open(a, p)}
              >
                {meta.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Body grid */}
      <div className="po-detail__grid">
        <section className="po-detail__panel">
          <header className="po-detail__panel-head">
            <h2 className="t-caps">Line items</h2>
            <span className="t-body-sm">{items.length} line{items.length === 1 ? '' : 's'}</span>
          </header>
          {itemsQ.isLoading ? (
            <Skeleton width="100%" height={140} />
          ) : p.status === 'DRAFT' && canEditLines ? (
            <LineItemEditor poId={p.id} currency={p.currency} items={items} />
          ) : items.length === 0 ? (
            <EmptyState title="No line items" description="This PO has no lines yet." />
          ) : (
            <div className="po-items">
              <div className="po-items__head">
                <span>#</span>
                <span>Description</span>
                <span style={{ textAlign: 'right' }}>Qty</span>
                <span>UoM</span>
                <span style={{ textAlign: 'right' }}>Unit price</span>
                <span style={{ textAlign: 'right' }}>Tax %</span>
                <span style={{ textAlign: 'right' }}>Line total</span>
              </div>
              {items.map((li) => (
                <div key={li.id} className="po-items__row">
                  <span>{li.line_number}</span>
                  <span title={li.item_description} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {li.item_description}
                  </span>
                  <span style={{ textAlign: 'right' }}>{Number(li.quantity).toLocaleString()}</span>
                  <span>{li.unit_of_measure}</span>
                  <span style={{ textAlign: 'right' }}>{formatMoney(li.unit_price, p.currency)}</span>
                  <span style={{ textAlign: 'right' }}>{Number(li.tax_rate ?? 0).toFixed(2)}</span>
                  <span style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatMoney(li.line_total ?? (li.quantity * li.unit_price), p.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="po-detail__panel">
          <header className="po-detail__panel-head">
            <h2 className="t-caps">Delivery & terms</h2>
          </header>
          <dl className="po-meta">
            <Meta label="Payment terms" value={p.payment_terms} />
            <Meta label="Currency" value={p.currency} />
            <Meta label="Created" value={fmtDate(p.created_at)} />
            <Meta label="Submitted" value={fmtDate(p.submitted_at)} />
            <Meta label="Approved" value={fmtDate(p.approved_at)} />
            <Meta label="Fulfilled" value={fmtDate(p.fulfilled_at)} />
            <Meta label="Closed" value={fmtDate(p.closed_at)} />
            <Meta label="Actual delivery" value={fmtDate(p.actual_delivery_date)} />
          </dl>

          <header className="po-detail__panel-head" style={{ marginTop: 16 }}>
            <h2 className="t-caps">Ship to</h2>
          </header>
          {p.delivery_address ? (
            <address className="po-address t-body">
              {p.delivery_address.street}<br />
              {p.delivery_address.city}, {p.delivery_address.state} {p.delivery_address.postal_code}<br />
              {p.delivery_address.country}
            </address>
          ) : (
            <p className="t-body-sm">—</p>
          )}

          {p.notes && (
            <>
              <header className="po-detail__panel-head" style={{ marginTop: 16 }}>
                <h2 className="t-caps">Notes</h2>
              </header>
              <p className="t-body" style={{ whiteSpace: 'pre-wrap' }}>{p.notes}</p>
            </>
          )}

          {p.rejection_reason && (
            <>
              <header className="po-detail__panel-head" style={{ marginTop: 16 }}>
                <h2 className="t-caps">Rejection reason</h2>
              </header>
              <p className="t-body" style={{ color: 'var(--error)' }}>{p.rejection_reason}</p>
            </>
          )}
        </section>
      </div>

      <PoActionDialog
        action={action.action}
        meta={action.meta}
        po={action.po}
        submitting={action.submitting}
        onConfirm={action.confirm}
        onClose={action.close}
      />
    </div>
  );
}

/* ---------- bits ---------- */

function Kpi({ label, value, subtle }) {
  return (
    <div className={`po-kpi${subtle ? ' po-kpi--subtle' : ''}`}>
      <div className="t-body-sm">{label}</div>
      <div className={subtle ? 't-headline' : 't-display'}>{value}</div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="po-meta__row">
      <dt className="t-body-sm">{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}

function fmtDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

function formatMoney(amount, currency) {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0
    }).format(Number(amount));
  } catch (_) {
    return `${currency || ''} ${Number(amount).toLocaleString()}`;
  }
}

function PoDetailSkeleton() {
  return (
    <div>
      <Skeleton width={120} height={12} />
      <div style={{ marginTop: 12 }}>
        <Skeleton width={240} height={20} />
        <div style={{ marginTop: 6 }}><Skeleton width={120} height={12} /></div>
      </div>
      <div style={{ marginTop: 24 }}><Skeleton width="100%" height={200} /></div>
    </div>
  );
}
