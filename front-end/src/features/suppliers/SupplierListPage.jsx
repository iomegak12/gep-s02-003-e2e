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
import { listSuppliers } from '../../api/suppliers.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import SupplierActionMenu from './SupplierActionMenu.jsx';
import {
  SUPPLIER_STATUS, SUPPLIER_STATUS_TONE, SUPPLIER_STATUS_LABEL,
  SUPPLIER_STATUS_ORDER, SUPPLIER_CATEGORY_LIST
} from '../../constants/statuses.js';
import './SupplierListPage.css';

const STATUS_OPTIONS = [
  ...Object.values(SUPPLIER_STATUS).map((s) => ({ value: s, label: SUPPLIER_STATUS_LABEL[s] }))
];
const CATEGORY_OPTIONS = SUPPLIER_CATEGORY_LIST.map((c) => ({ value: c, label: c.replace(/_/g, ' ') }));

const VIEW_KEY = 'gep.suppliers.view';

export default function SupplierListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canCreate = hasRole(ROLES.BUYER) || hasRole(ROLES.ADMIN);
  const isAdmin   = hasRole(ROLES.ADMIN);

  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'table');
  const updateView = (v) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch (_) { /* */ } };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);

  // Reset to page 1 whenever filters change.
  const onFilterChange = (setter) => (e) => {
    setter(typeof e === 'string' ? e : e.target.value);
    setPage(1);
  };

  const params = useMemo(() => ({
    page, page_size: pageSize,
    status: status || undefined,
    category: category || undefined,
    country: country || undefined,
    q: debouncedQ.trim() || undefined
  }), [page, pageSize, status, category, country, debouncedQ]);

  // In Kanban we want to pull a larger window so all statuses have visible rows.
  const kanbanParams = useMemo(() => ({ ...params, page: 1, page_size: 100 }), [params]);

  const isKanban = view === 'kanban';
  const query = useQuery({
    queryKey: ['suppliers', isKanban ? 'kanban' : 'paged', isKanban ? kanbanParams : params],
    queryFn: () => listSuppliers(isKanban ? kanbanParams : params),
    placeholderData: keepPreviousData,
    staleTime: 10_000
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  const columns = useMemo(() => {
    const base = [...tableColumns];
    if (isAdmin) {
      base.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SupplierActionMenu supplier={row.original} />
          </div>
        )
      });
    }
    return base;
  }, [isAdmin]);

  const clearFilters = () => {
    setStatus(''); setCategory(''); setCountry(''); setQ(''); setPage(1);
  };
  const hasFilters = status || category || country || q;

  return (
    <div>
      <header className="sup-list__header">
        <div>
          <h1 className="t-headline">Suppliers</h1>
          <p className="t-body-sm">Browse and filter the supplier directory.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ViewSwitcher value={view} onChange={updateView} />
          {canCreate && (
            <Button onClick={() => navigate('/suppliers/new')} startIcon={<Plus size={14} />}>
              Create supplier
            </Button>
          )}
        </div>
      </header>

      <div className="sup-list__filters">
        <Input
          placeholder="Search suppliers…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          startIcon={<Search size={14} />}
          endIcon={q ? (
            <button type="button" onClick={() => { setQ(''); setPage(1); }} aria-label="Clear search" style={{ display: 'inline-flex' }}>
              <X size={14} />
            </button>
          ) : null}
          style={{ minWidth: 220 }}
        />
        <Select value={status} onChange={onFilterChange(setStatus)} placeholder="All statuses" options={STATUS_OPTIONS} />
        <Select value={category} onChange={onFilterChange(setCategory)} placeholder="All categories" options={CATEGORY_OPTIONS} />
        <Input
          placeholder="Country (ISO, e.g. IN)"
          value={country}
          onChange={(e) => { setCountry(e.target.value.toUpperCase().slice(0, 2)); setPage(1); }}
          style={{ width: 160 }}
        />
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>Clear</Button>
        )}
      </div>

      <div className="sup-list__panel">
        {view === 'table' && (
          <>
            <DataTable
              data={rows}
              columns={columns}
              loading={query.isLoading}
              onRowClick={(r) => navigate(`/suppliers/${r.id}`)}
              emptyTitle="No suppliers match these filters"
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
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
              onCardClick={(r) => navigate(`/suppliers/${r.id}`)}
              renderCard={(s) => <SupplierCard s={s} isAdmin={isAdmin} />}
              emptyTitle="No suppliers match these filters"
            />
            <div style={{ marginTop: 12, border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)' }}>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
              />
            </div>
          </>
        )}

        {view === 'kanban' && (
          <DataKanban
            columns={SUPPLIER_STATUS_ORDER.map((s) => ({ key: s, label: SUPPLIER_STATUS_LABEL[s], tone: SUPPLIER_STATUS_TONE[s] }))}
            data={rows}
            groupBy={(s) => s.status}
            loading={query.isLoading}
            onCardClick={(r) => navigate(`/suppliers/${r.id}`)}
            renderCard={(s) => <SupplierKanbanCard s={s} />}
            emptyTitle="No suppliers match these filters"
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Cells & cards ---------- */

const tableColumns = [
  { accessorKey: 'supplier_code', header: 'Code', cell: ({ getValue }) => <span className="mono">{getValue()}</span> },
  { accessorKey: 'display_name',  header: 'Name',  cell: ({ getValue }) => <strong>{getValue()}</strong> },
  { accessorKey: 'category',      header: 'Category', cell: ({ getValue }) => <span>{String(getValue() || '').replace(/_/g, ' ')}</span> },
  { accessorKey: 'country',       header: 'Country' },
  { accessorKey: 'status',        header: 'Status',
    cell: ({ getValue }) => {
      const v = getValue();
      return <Badge tone={SUPPLIER_STATUS_TONE[v] || 'neutral'}>{SUPPLIER_STATUS_LABEL[v] || v}</Badge>;
    }
  },
  { accessorKey: 'rating', header: 'Rating',
    cell: ({ getValue }) => {
      const r = getValue();
      return r ? Number(r).toFixed(1) : '—';
    }
  },
  { accessorKey: 'created_at', header: 'Created',
    cell: ({ getValue }) => {
      const v = getValue();
      return v ? new Date(v).toLocaleDateString() : '—';
    }
  }
];

function SupplierCard({ s, isAdmin }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div className="t-body" style={{ fontWeight: 600 }}>{s.display_name}</div>
          <div className="mono t-body-sm">{s.supplier_code}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Badge tone={SUPPLIER_STATUS_TONE[s.status] || 'neutral'}>
            {SUPPLIER_STATUS_LABEL[s.status] || s.status}
          </Badge>
          {isAdmin && <SupplierActionMenu supplier={s} />}
        </div>
      </div>
      <div className="t-body-sm" style={{ marginTop: 4 }}>
        {String(s.category || '').replace(/_/g, ' ')} · {s.country || '—'}
      </div>
      <div className="t-body-sm" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span>{s.payment_terms || '—'} · {s.currency || '—'}</span>
        <span>★ {s.rating ? Number(s.rating).toFixed(1) : '—'}</span>
      </div>
    </>
  );
}

function SupplierKanbanCard({ s }) {
  return (
    <>
      <div className="t-body" style={{ fontWeight: 600 }}>{s.display_name}</div>
      <div className="mono t-body-sm">{s.supplier_code}</div>
      <div className="t-body-sm" style={{ marginTop: 6 }}>
        {String(s.category || '').replace(/_/g, ' ')} · {s.country || '—'}
      </div>
    </>
  );
}
