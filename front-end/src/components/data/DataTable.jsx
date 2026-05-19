import { useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import Skeleton from '../ui/Skeleton.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import './DataTable.css';

const ROW_HEIGHT = 32;

/**
 * Headless TanStack Table + react-virtual wrapper.
 * Props:
 *   data: array of row objects
 *   columns: TanStack column defs (accessorKey, header, cell)
 *   loading: bool
 *   onRowClick: (row) => void
 *   sorting / onSortingChange: client-side sort state (server sort can be wired later)
 *   maxHeight: px; defaults to 560
 */
export default function DataTable({
  data = [],
  columns,
  loading = false,
  onRowClick,
  sorting,
  onSortingChange,
  maxHeight = 560,
  emptyTitle = 'No results',
  emptyDescription
}) {
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const scrollRef = useRef(null);
  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10
  });

  if (!loading && rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="dt" ref={scrollRef} style={{ maxHeight }}>
      <table className="dt__table" role="grid">
        <thead className="dt__thead">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const canSort = h.column.getCanSort();
                const sorted = h.column.getIsSorted();
                return (
                  <th
                    key={h.id}
                    style={{ width: h.getSize?.() || undefined, cursor: canSort ? 'pointer' : 'default' }}
                    onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                  >
                    <span className="dt__th-inner">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {canSort && (
                        sorted === 'asc' ? <ArrowUp size={12} /> :
                        sorted === 'desc' ? <ArrowDown size={12} /> :
                        <ChevronsUpDown size={12} />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="dt__tbody" style={{ height: virtualizer.getTotalSize() }}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={`sk-${i}`} className="dt__row" style={{ position: 'absolute', top: i * ROW_HEIGHT, height: ROW_HEIGHT, width: '100%' }}>
                  {columns.map((c, j) => <td key={j}><Skeleton width="60%" height={10} /></td>)}
                </tr>
              ))
            : virtualizer.getVirtualItems().map((vi) => {
                const row = rows[vi.index];
                return (
                  <tr
                    key={row.id}
                    className="dt__row"
                    style={{
                      position: 'absolute',
                      transform: `translateY(${vi.start}px)`,
                      height: ROW_HEIGHT,
                      width: '100%'
                    }}
                    role={onRowClick ? 'button' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={() => onRowClick?.(row.original)}
                    onKeyDown={(e) => {
                      if (!onRowClick) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row.original);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
