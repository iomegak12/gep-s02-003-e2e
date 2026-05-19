import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Pencil, Plus } from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/data/DataTable.jsx';
import Pagination from '../../components/data/Pagination.jsx';
import Menu from '../../components/ui/Menu.jsx';
import ResetPasswordModal from './ResetPasswordModal.jsx';
import { listUsers } from '../../api/iam.js';
import './UserListPage.css';

export default function UserListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [resetTarget, setResetTarget] = useState(null);

  const query = useQuery({
    queryKey: ['users', { page, pageSize }],
    queryFn: () => listUsers({ page, page_size: pageSize }),
    staleTime: 10_000
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  const columns = useMemo(() => [
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => <span className="mono">{getValue()}</span> },
    { accessorKey: 'full_name', header: 'Name', cell: ({ getValue }) => <strong>{getValue()}</strong> },
    { accessorKey: 'roles', header: 'Roles',
      cell: ({ getValue }) => (
        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
          {(getValue() || []).map((r) => <Badge key={r} tone="primary" variant="outline">{r}</Badge>)}
        </span>
      )
    },
    { accessorKey: 'approval_limit', header: 'Approval limit',
      cell: ({ getValue }) => getValue() != null
        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(getValue()))
        : '—'
    },
    { accessorKey: 'is_active', header: 'Status',
      cell: ({ getValue }) => (
        <Badge tone={getValue() ? 'active' : 'inactive'}>{getValue() ? 'Active' : 'Inactive'}</Badge>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Menu
            label={`Actions for ${row.original.email}`}
            items={[
              { key: 'edit',  label: 'Edit', icon: <Pencil size={14} />,
                onSelect: () => navigate(`/admin/users/${row.original.id}/edit`) },
              { key: 'reset', label: 'Reset password', icon: <KeyRound size={14} />,
                onSelect: () => setResetTarget(row.original) }
            ]}
          />
        </div>
      )
    }
  ], [navigate]);

  return (
    <div>
      <header className="ulist__header">
        <div>
          <h1 className="t-headline">Users</h1>
          <p className="t-body-sm">Manage accounts, roles, and approval limits.</p>
        </div>
        <Button onClick={() => navigate('/admin/users/new')} startIcon={<Plus size={14} />}>
          Create user
        </Button>
      </header>

      <div className="ulist__panel">
        <DataTable
          data={rows}
          columns={columns}
          loading={query.isLoading}
          onRowClick={(r) => navigate(`/admin/users/${r.id}`)}
          emptyTitle="No users yet"
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        />
      </div>

      <ResetPasswordModal
        open={!!resetTarget}
        user={resetTarget}
        onClose={() => setResetTarget(null)}
      />
    </div>
  );
}
