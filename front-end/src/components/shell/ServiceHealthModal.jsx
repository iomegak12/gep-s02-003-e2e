import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import { useServiceHealth } from '../../hooks/useServiceHealth.js';
import { SERVICE_LABEL } from '../../constants/statuses.js';
import { formatRelativeTime } from '../../utils/date.js';
import './ServiceHealthModal.css';

const TONE_BY_STATUS = { ok: 'ok', slow: 'slow', down: 'down' };

export default function ServiceHealthModal({ open, onClose }) {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useServiceHealth();

  const refresh = () => qc.invalidateQueries({ queryKey: ['service-health'] });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Service health"
      width={460}
      footer={
        <>
          <Button variant="ghost" onClick={refresh} startIcon={<RefreshCw size={14} />} disabled={isFetching}>
            {isFetching ? 'Checking…' : 'Refresh'}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <ul className="health-list">
        {(['iam', 'sup', 'po']).map((key) => {
          const row = data?.find((r) => r.key === key);
          return (
            <li key={key} className="health-row">
              <div className="health-row__main">
                <span
                  className="health-dot"
                  data-status={row?.status || 'loading'}
                  aria-hidden="true"
                />
                <div className="health-row__text">
                  <div className="t-body" style={{ fontWeight: 600 }}>{SERVICE_LABEL[key]}</div>
                  <div className="t-body-sm">
                    {isLoading && !row
                      ? <Skeleton width={140} height={11} />
                      : (row?.status === 'down'
                          ? (row?.error || 'Unreachable')
                          : `${row?.latencyMs ?? '—'} ms · checked ${formatRelativeTime(row?.checkedAt)}`)}
                  </div>
                </div>
              </div>
              <Badge tone={TONE_BY_STATUS[row?.status] || 'neutral'}>
                {row?.status || '...'}
              </Badge>
            </li>
          );
        })}
      </ul>
      <p className="t-body-sm" style={{ marginTop: 12 }}>
        Probed every 30s through the nginx reverse proxy.
      </p>
    </Modal>
  );
}
