import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Select from '../ui/Select.jsx';
import './Pagination.css';

const PAGE_SIZES = [10, 20, 50, 100];

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / (pageSize || 1)));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total ?? 0);

  const go = (n) => onPageChange?.(Math.min(Math.max(1, n), totalPages));

  return (
    <div className="pagination">
      <div className="pagination__summary t-body-sm">
        {total === 0 ? '0 of 0' : `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`}
      </div>
      <div className="pagination__controls">
        <button className="pagination__btn" onClick={() => go(1)} disabled={page <= 1} aria-label="First page">
          <ChevronsLeft size={14} />
        </button>
        <button className="pagination__btn" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft size={14} />
        </button>
        <span className="t-body-sm">Page {page} of {totalPages}</span>
        <button className="pagination__btn" onClick={() => go(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <ChevronRight size={14} />
        </button>
        <button className="pagination__btn" onClick={() => go(totalPages)} disabled={page >= totalPages} aria-label="Last page">
          <ChevronsRight size={14} />
        </button>
      </div>
      <div className="pagination__size">
        <span className="t-body-sm">Rows</span>
        <Select
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
        />
      </div>
    </div>
  );
}
