import { Inbox } from 'lucide-react';
import './EmptyState.css';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon || <Inbox size={28} />}</div>
      <div className="t-headline">{title || 'Nothing here yet'}</div>
      {description && <p className="t-body-sm">{description}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}
