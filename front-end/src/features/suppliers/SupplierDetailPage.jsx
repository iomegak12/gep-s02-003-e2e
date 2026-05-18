import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, CheckCircle2, PauseCircle, PlayCircle, Ban, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { ROLES } from '../../utils/roles.js';
import Badge from '../../components/ui/Badge.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmWithReason from '../../components/ui/ConfirmWithReason.jsx';
import { getSupplier, getSupplierScorecard } from '../../api/suppliers.js';
import { normaliseError } from '../../api/errors.js';
import { SUPPLIER_STATUS_TONE, SUPPLIER_STATUS_LABEL } from '../../constants/statuses.js';
import { adminActionsFor, ACTION_META } from './supplierActions.js';
import { useSupplierAction } from './useSupplierAction.js';
import './SupplierDetailPage.css';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canEdit = hasRole(ROLES.BUYER) || hasRole(ROLES.ADMIN);
  const isAdmin = hasRole(ROLES.ADMIN);

  const action = useSupplierAction({
    onSuccess: ({ action: a }) => { if (a === 'delete') navigate('/suppliers'); }
  });

  const supplierQ = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id),
    enabled: !!id
  });
  const scorecardQ = useQuery({
    queryKey: ['supplier-scorecard', id],
    queryFn: () => getSupplierScorecard(id),
    enabled: !!id,
    retry: false
  });

  if (supplierQ.isLoading) return <SupplierDetailSkeleton />;

  if (supplierQ.isError) {
    const e = normaliseError(supplierQ.error);
    return (
      <EmptyState
        title={e.code === 'SUPPLIER_NOT_FOUND' ? 'Supplier not found' : 'Could not load supplier'}
        description={e.message}
        action={<Button onClick={() => navigate('/suppliers')} startIcon={<ArrowLeft size={14} />}>Back to suppliers</Button>}
      />
    );
  }

  const s = supplierQ.data;

  return (
    <div>
      <div className="sup-detail__crumb">
        <Link to="/suppliers" className="sup-detail__back">
          <ArrowLeft size={14} /> Suppliers
        </Link>
      </div>

      <header className="sup-detail__header">
        <div>
          <h1 className="t-headline">{s.display_name}</h1>
          <div className="mono t-body-sm">{s.supplier_code}</div>
        </div>
        <div className="sup-detail__header-meta">
          <Badge tone={SUPPLIER_STATUS_TONE[s.status] || 'neutral'}>
            {SUPPLIER_STATUS_LABEL[s.status] || s.status}
          </Badge>
          <span className="t-body-sm">
            Created {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
          </span>
          {canEdit && (
            <Button
              variant="secondary"
              startIcon={<Pencil size={14} />}
              onClick={() => navigate(`/suppliers/${id}/edit`)}
            >
              Edit
            </Button>
          )}
        </div>
      </header>

      {isAdmin && <AdminActionBar supplier={s} onOpen={action.open} />}

      {action.action && (
        <ConfirmWithReason
          open
          onClose={action.close}
          title={action.meta.title}
          description={action.meta.description}
          confirmLabel={action.meta.label}
          confirmVariant={action.meta.confirmVariant}
          requireReason={action.meta.requireReason}
          reasonPresets={action.meta.reasonPresets}
          submitting={action.submitting}
          onConfirm={action.confirm}
        />
      )}

      <Tabs
        items={[
          { key: 'overview',  label: 'Overview',  content: <Overview s={s} /> },
          { key: 'scorecard', label: 'Scorecard', content: <Scorecard q={scorecardQ} /> }
        ]}
      />
    </div>
  );
}

/* ---------- Overview ---------- */

function Overview({ s }) {
  return (
    <div className="sup-grid">
      <Section title="Identity">
        <Field label="Legal name" value={s.legal_name} />
        <Field label="Display name" value={s.display_name} />
        <Field label="Category" value={String(s.category || '—').replace(/_/g, ' ')} />
        <Field label="Sub-category" value={s.sub_category || '—'} />
        <Field label="Tax ID" value={s.tax_id} mono />
        <Field label="Tags" value={(s.tags || []).join(', ') || '—'} />
      </Section>

      <Section title="Contact">
        <Field label="Primary contact" value={s.contact?.primary_name} />
        <Field label="Email" value={s.contact?.email} />
        <Field label="Phone" value={s.contact?.phone} />
      </Section>

      <Section title="Address">
        <Field label="Street" value={s.address?.street} />
        <Field label="City" value={s.address?.city} />
        <Field label="State" value={s.address?.state} />
        <Field label="Country" value={s.address?.country} />
        <Field label="Postal code" value={s.address?.postal_code} />
      </Section>

      <Section title="Commercial">
        <Field label="Payment terms" value={s.payment_terms} />
        <Field label="Currency" value={s.currency} />
        <Field label="Country" value={s.country} />
        <Field label="Region" value={s.region} />
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="sup-section">
      <h2 className="t-caps sup-section__title">{title}</h2>
      <dl className="sup-section__list">{children}</dl>
    </section>
  );
}

function Field({ label, value, mono }) {
  return (
    <div className="sup-field">
      <dt className="t-body-sm">{label}</dt>
      <dd className={mono ? 'mono' : undefined}>{value || '—'}</dd>
    </div>
  );
}

/* ---------- Scorecard ---------- */

function Scorecard({ q }) {
  if (q.isLoading) {
    return <Skeleton width="100%" height={120} />;
  }
  if (q.isError) {
    const e = normaliseError(q.error);
    return <EmptyState title="Scorecard unavailable" description={e.message} />;
  }
  const sc = q.data || {};
  return (
    <div className="sup-grid">
      <KpiTile label="Rating" value={sc.rating != null ? Number(sc.rating).toFixed(1) : '—'} suffix="/ 5" />
      <KpiTile label="On-time delivery"
        value={sc.on_time_delivery_rate != null ? `${Number(sc.on_time_delivery_rate).toFixed(1)}` : '—'}
        suffix="%" />
      <KpiTile label="Total orders" value={(sc.total_orders_count ?? 0).toLocaleString()} />
      <KpiTile label="Total spend (INR)"
        value={sc.total_spend_inr != null
          ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(sc.total_spend_inr)
          : '—'}
        prefix="₹"
      />
    </div>
  );
}

function KpiTile({ label, value, prefix, suffix }) {
  return (
    <div className="sup-kpi">
      <div className="t-body-sm">{label}</div>
      <div className="t-display sup-kpi__value">
        {prefix && <span className="sup-kpi__affix">{prefix}</span>}
        {value}
        {suffix && <span className="sup-kpi__affix"> {suffix}</span>}
      </div>
    </div>
  );
}

/* ---------- Admin action bar ---------- */

const ICON = {
  approve:    <CheckCircle2 size={14} />,
  deactivate: <PauseCircle size={14} />,
  reactivate: <PlayCircle  size={14} />,
  blacklist:  <Ban         size={14} />,
  delete:     <Trash2      size={14} />
};

function AdminActionBar({ supplier, onOpen }) {
  const actions = adminActionsFor(supplier.status);
  if (actions.length === 0) return null;
  return (
    <div className="sup-actionbar">
      <span className="t-body-sm">Admin actions:</span>
      {actions.map((a) => {
        const meta = ACTION_META[a];
        return (
          <Button
            key={a}
            variant={meta.danger ? 'secondary' : 'primary'}
            startIcon={ICON[a]}
            onClick={() => onOpen(a, supplier)}
          >
            {meta.label}
          </Button>
        );
      })}
    </div>
  );
}

/* ---------- Skeleton ---------- */

function SupplierDetailSkeleton() {
  return (
    <div>
      <Skeleton width={120} height={12} />
      <div style={{ marginTop: 12 }}>
        <Skeleton width={240} height={20} />
        <div style={{ marginTop: 6 }}><Skeleton width={120} height={12} /></div>
      </div>
      <div style={{ marginTop: 24 }}>
        <Skeleton width="100%" height={180} />
      </div>
    </div>
  );
}
