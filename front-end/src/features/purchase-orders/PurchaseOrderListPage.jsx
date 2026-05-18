import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { ROLES } from '../../utils/roles.js';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/data/DataTable.jsx';
import DataCardGrid from '../../components/data/DataCardGrid.jsx';
import DataKanban from '../../components/data/DataKanban.jsx';
import Pagination from '../../components/data/Pagination.jsx';
import ViewSwitcher from '../../components/data/ViewSwitcher.jsx';
import { listPurchaseOrders } from '../../api/purchaseOrders.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { PO_STATUS, PO_STATUS_TONE } from '../../constants/statuses.js';
import './PurchaseOrderListPage.css';

const STATUS_ORDER = ['DRAFT', 'SUBMITTED', 'APPROVED', 'FULFILLED', 'CLOSED', 'REJECTED', 'CANCELLED'];
const STATUS_LABEL = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved',
  REJECTED: 'Rejected', FULFILLED: 'Fulfilled', CLOSED: 'Closed', CANCELLED: 'Cancelled'
};
const STATUS_OPTIONS = STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }));

const VIEW_KEY = 'gep.po.view';

export default function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canCreate = hasRole(ROLES.BUYER) || hasRole(ROLES.ADMIN);

  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'kanban');
  const updateView = (v) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch (_) { /* */ } };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);

  const params = useMemo(() => ({
    page,
    page_size: pageSize,
    status: status || undefined,
    q: debouncedQ.trim() || undefined,
    sort: '-created_at'
  }), [page, pageSize, status, debouncedQ]);

  // For Kanban we want all statuses visible — disable status filter and pull a wider window.
  const kanbanParams = useMemo(() => ({
    page: 1,
    page_size: 100,
    q: debouncedQ.trim() || undefined,
    sort: '-created_at'
  }), [debouncedQ]);

  const isKanban = view === 'kanban';
  const query = useQuery({
    queryKey: ['purchase-orders', isKanban ? 'kanban' : 'paged', isKanban ? kanbanParams : params],
    queryFn: () => listPurchaseOrders(isKanban ? kanbanParams : params),
    placeholderData: keepPreviousData,
    staleTime: 10_000
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  const clearFilters = () => { setStatus(''); setQ(''); setPage(1); };
  const hasFilters = status || q;

  return (
    <div>
      <header className="po-list__header">
        <div>
          <h1 className="t-headline">Purchase orders</h1>
          <p className="t-body-sm">Track POs across their lifecycle.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ViewSwitcher value={view} onChange={updateView} />
          {canCreate && (
            <Button onClick={() => navigate('/purchase-orders/new')} startIcon={<Plus size={14} />}>
              Create PO
            </Button>
          )}
        </div>
      </header>

      <div className="po-list__filters">
        <Input
          placeholder="Search by PO number, notes, line items…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          startIcon={<Search size={14} />}
          endIcon={q ? (
            <button type="button" onClick={() => { setQ(''); setPage(1); }} aria-label="Clear search" style={{ display: 'inline-flex' }}>
              <X size={14} />
            </button>
          ) : null}
          style={{ minWidth: 260 }}
        />
        {!isKanban && (
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            placeholder="All statuses"
            options={STATUS_OPTIONS}
          />
        )}
        {hasFilters && <Button variant="ghost" onClick={clearFilters}>Clear</Button>}
        {isKanban && (
          <span className="t-body-sm" style={{ marginLeft: 'auto' }}>
            Showing the latest 100 POs across all statuses.
          </span>
        )}
      </div>

      <div className="po-list__panel">
        {view === 'table' && (
          <>
            <DataTable
              data={rows}
              columns={tableColumns}
              loading={query.isLoading}
              onRowClick={(r) => navigate(`/purchase-orders/${r.id}`)}
              emptyTitle="No POs match these filters"
            />
            <Pagination
              page={page} pageSize={pageSize} total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            />
          </>
        )}

        {view === 'card' && (
          <>
            <DataCardGrid
              data={rows}
              loading={query.isLoading}
              onCardClick={(r) => navigate(`/purchase-orders/${r.id}`)}
              renderCard={(p) => <PoCard p={p} />}
              emptyTitle="No POs match these filters"
            />
            <div style={{ marginTop: 12, border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)' }}>
              <Pagination
                page={page} pageSize={pageSize} total={total}
                onPageChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
              />
            </div>
          </>
        )}

        {view === 'kanban' && (
          <DataKanban
            columns={STATUS_ORDER.map((s) => ({ key: s, label: STATUS_LABEL[s], tone: PO_STATUS_TONE[s] }))}
            data={rows}
            groupBy={(p) => p.status}
            loading={query.isLoading}
            onCardClick={(r) => navigate(`/purchase-orders/${r.id}`)}
            renderCard={(p) => <PoKanbanCard p={p} />}
            emptyTitle="No POs match these filters"
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Table columns ---------- */

const tableColumns = [
  { accessorKey: 'po_number', header: 'PO #', cell: ({ getValue }) => <span className="mono">{getValue()}</span> },
  { accessorKey: 'supplier_snapshot', header: 'Supplier',
    cell: ({ getValue }) => <strong>{getValue()?.display_name || '—'}</strong>
  },
  { accessorKey: 'total_amount', header: 'Total',
    cell: ({ row }) => formatMoney(row.original.total_amount, row.original.currency)
  },
  { accessorKey: 'status', header: 'Status',
    cell: ({ getValue }) => {
      const v = getValue();
      return <Badge tone={PO_STATUS_TONE[v] || 'neutral'}>{STATUS_LABEL[v] || v}</Badge>;
    }
  },
  { accessorKey: 'expected_delivery_date', header: 'Expected',
    cell: ({ getValue }) => (getValue() ? new Date(getValue()).toLocaleDateString() : '—')
  },
  { accessorKey: 'created_at', header: 'Created',
    cell: ({ getValue }) => (getValue() ? new Date(getValue()).toLocaleDateString() : '—')
  }
];

function PoCard({ p }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div className="mono t-body-sm">{p.po_number}</div>
          <div className="t-body" style={{ fontWeight: 600 }}>{p.supplier_snapshot?.display_name || '—'}</div>
        </div>
        <Badge tone={PO_STATUS_TONE[p.status] || 'neutral'}>{STATUS_LABEL[p.status] || p.status}</Badge>
      </div>
      <div className="t-display" style={{ marginTop: 8 }}>
        {formatMoney(p.total_amount, p.currency)}
      </div>
      <div className="t-body-sm" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span>Exp. {p.expected_delivery_date ? new Date(p.expected_delivery_date).toLocaleDateString() : '—'}</span>
        <span>{p.payment_terms || '—'}</span>
      </div>
    </>
  );
}

function PoKanbanCard({ p }) {
  return (
    <>
      <div className="mono t-body-sm">{p.po_number}</div>
      <div className="t-body" style={{ fontWeight: 600 }}>{p.supplier_snapshot?.display_name || '—'}</div>
      <div className="t-body" style={{ fontWeight: 600, marginTop: 6 }}>
        {formatMoney(p.total_amount, p.currency)}
      </div>
      {p.expected_delivery_date && (
        <div className="t-body-sm" style={{ marginTop: 4 }}>
          Exp. {new Date(p.expected_delivery_date).toLocaleDateString()}
        </div>
      )}
    </>
  );
}

function formatMoney(amount, currency) {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0
    }).format(Number(amount));
  } catch (_) {
    return `${currency || ''} ${Number(amount).toLocaleString()}`;
  }
}
