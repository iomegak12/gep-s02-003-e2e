import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Ban, Eye } from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/data/DataTable.jsx';
import Pagination from '../../components/data/Pagination.jsx';
import ConfirmWithReason from '../../components/ui/ConfirmWithReason.jsx';
import { listSuppliers } from '../../api/suppliers.js';
import { SUPPLIER_STATUS, SUPPLIER_STATUS_LABEL, SUPPLIER_STATUS_TONE } from '../../constants/statuses.js';
import { useSupplierAction } from './useSupplierAction.js';
import { ACTION_META } from './supplierActions.js';

export default function AdminSupplierPendingPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const action = useSupplierAction();

  const query = useQuery({
    queryKey: ['suppliers-pending', { page, pageSize }],
    queryFn: () => listSuppliers({
      page, page_size: pageSize, status: SUPPLIER_STATUS.PENDING_APPROVAL, sort: 'created_at'
    }),
    staleTime: 10_000
  });
  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  const columns = useMemo(() => [
    { accessorKey: 'supplier_code', header: 'Code', cell: ({ getValue }) => <span className="mono">{getValue()}</span> },
    { accessorKey: 'display_name', header: 'Name', cell: ({ getValue }) => <strong>{getValue()}</strong> },
    { accessorKey: 'category', header: 'Category', cell: ({ getValue }) => String(getValue() || '').replace(/_/g, ' ') },
    { accessorKey: 'country',  header: 'Country' },
    { accessorKey: 'created_at', header: 'Submitted',
      cell: ({ getValue }) => (getValue() ? new Date(getValue()).toLocaleDateString() : '—') },
    { accessorKey: 'status', header: 'Status',
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge tone={SUPPLIER_STATUS_TONE[v] || 'neutral'}>{SUPPLIER_STATUS_LABEL[v] || v}</Badge>;
      }
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button variant="ghost" startIcon={<Eye size={14} />} onClick={() => navigate(`/suppliers/${row.original.id}`)}>View</Button>
          <Button variant="primary"   startIcon={<CheckCircle2 size={14} />} onClick={() => action.open('approve',   row.original)}>Approve</Button>
          <Button variant="secondary" startIcon={<Ban         size={14} />} onClick={() => action.open('blacklist', row.original)}>Blacklist</Button>
        </div>
      )
    }
  ], [navigate, action]);

  return (
    <div>
      <header style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <h1 className="t-headline">Supplier approvals</h1>
          <p className="t-body-sm">
            New suppliers awaiting review. Approve to activate, or blacklist with a reason.
          </p>
        </div>
        <Badge tone="pending">{total} pending</Badge>
      </header>

      <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <DataTable
          data={rows}
          columns={columns}
          loading={query.isLoading}
          onRowClick={(r) => navigate(`/suppliers/${r.id}`)}
          emptyTitle="No suppliers waiting for approval"
          emptyDescription="New supplier submissions show up here."
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        />
      </div>

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
    </div>
  );
}
