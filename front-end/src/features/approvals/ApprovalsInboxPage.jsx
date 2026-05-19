import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Eye } from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import DataTable from '../../components/data/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { listPurchaseOrders, poPendingApprovals } from '../../api/purchaseOrders.js';
import { usePoAction } from '../purchase-orders/usePoAction.js';
import PoActionDialog from '../purchase-orders/PoActionDialog.jsx';
import './ApprovalsInboxPage.css';

export default function ApprovalsInboxPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const approvalLimit = typeof user?.approval_limit === 'number' ? user.approval_limit : null;

  const action = usePoAction();

  // KPI from the dedicated aggregation: { count, total_value, generated_at }
  // Server already filters to status=SUBMITTED + total_amount <= approver's limit.
  const kpiQ = useQuery({
    queryKey: ['po-pending-approvals'],
    queryFn: () => poPendingApprovals(),
    staleTime: 15_000
  });

  // The actual queue: list endpoint does NOT filter by approval_limit, so we
  // pull a wide window of SUBMITTED POs and client-filter by limit.
  const listQ = useQuery({
    queryKey: ['purchase-orders', 'submitted-window'],
    queryFn: () => listPurchaseOrders({
      status: 'SUBMITTED', page: 1, page_size: 100, sort: 'submitted_at'
    }),
    staleTime: 10_000
  });

  const queue = useMemo(() => {
    const all = listQ.data?.data || [];
    if (approvalLimit == null) return all;
    return all.filter((p) => Number(p.total_amount || 0) <= approvalLimit);
  }, [listQ.data, approvalLimit]);

  const overLimit = useMemo(() => {
    if (approvalLimit == null) return [];
    const all = listQ.data?.data || [];
    return all.filter((p) => Number(p.total_amount || 0) > approvalLimit);
  }, [listQ.data, approvalLimit]);

  const columns = useMemo(() => [
    { accessorKey: 'po_number', header: 'PO #', cell: ({ getValue }) => <span className="mono">{getValue()}</span> },
    { accessorKey: 'supplier_snapshot', header: 'Supplier',
      cell: ({ getValue }) => <strong>{getValue()?.display_name || '—'}</strong>
    },
    { accessorKey: 'total_amount', header: 'Total',
      cell: ({ row }) => formatMoney(row.original.total_amount, row.original.currency)
    },
    { accessorKey: 'expected_delivery_date', header: 'Expected',
      cell: ({ getValue }) => (getValue() ? new Date(getValue()).toLocaleDateString() : '—')
    },
    { id: 'age', header: 'Age',
      cell: ({ row }) => <AgeCell submittedAt={row.original.submitted_at || row.original.created_at} />
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button variant="ghost"     startIcon={<Eye          size={14} />} onClick={() => navigate(`/purchase-orders/${row.original.id}`)}>View</Button>
          <Button variant="primary"   startIcon={<CheckCircle2 size={14} />} onClick={() => action.open('approve', row.original)}>Approve</Button>
          <Button variant="secondary" startIcon={<XCircle      size={14} />} onClick={() => action.open('reject',  row.original)}>Reject</Button>
        </div>
      )
    }
  ], [navigate, action]);

  return (
    <div>
      <header className="apr__header">
        <div>
          <h1 className="t-headline">Approvals inbox</h1>
          <p className="t-body-sm">
            Submitted POs awaiting your approval{approvalLimit != null && (
              <> · your limit: <strong>{formatMoney(approvalLimit, 'INR')}</strong></>
            )}.
          </p>
        </div>
      </header>

      <div className="apr__kpis">
        <KpiTile
          label="Pending count"
          value={kpiQ.isLoading ? '…' : (kpiQ.data?.count ?? 0).toLocaleString()}
        />
        <KpiTile
          label="Pending total value"
          value={kpiQ.isLoading ? '…' : formatMoney(kpiQ.data?.total_value ?? 0, 'INR')}
        />
        {approvalLimit != null && (
          <KpiTile
            label="Above your limit"
            value={overLimit.length.toLocaleString()}
            hint="Will be routed to a higher-limit approver"
          />
        )}
      </div>

      <div className="apr__panel">
        <DataTable
          data={queue}
          columns={columns}
          loading={listQ.isLoading}
          onRowClick={(r) => navigate(`/purchase-orders/${r.id}`)}
          emptyTitle="Inbox zero"
          emptyDescription="No POs currently waiting on your approval."
        />
      </div>

      {overLimit.length > 0 && !listQ.isLoading && (
        <p className="t-body-sm" style={{ marginTop: 12, color: 'var(--text-muted)' }}>
          {overLimit.length.toLocaleString()} additional SUBMITTED PO{overLimit.length === 1 ? '' : 's'} exceed your
          approval limit of {formatMoney(approvalLimit, 'INR')}. They'll show up here for an approver with a higher limit.
        </p>
      )}

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

function KpiTile({ label, value, hint }) {
  return (
    <div className="apr__kpi">
      <div className="t-body-sm">{label}</div>
      <div className="t-display">{value}</div>
      {hint && <div className="t-body-sm" style={{ color: 'var(--text-muted)' }}>{hint}</div>}
    </div>
  );
}

function AgeCell({ submittedAt }) {
  if (!submittedAt) return <span>—</span>;
  const days = Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000));
  const tone = days >= 7 ? 'error' : days >= 3 ? 'pending' : 'neutral';
  return <Badge tone={tone}>{days === 0 ? 'Today' : `${days}d`}</Badge>;
}

function formatMoney(amount, currency) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0
    }).format(Number(amount));
  } catch (_) {
    return `${currency || ''} ${Number(amount).toLocaleString()}`;
  }
}
