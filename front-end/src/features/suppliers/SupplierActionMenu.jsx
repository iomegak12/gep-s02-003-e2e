import { CheckCircle2, Eye, PauseCircle, PlayCircle, Ban, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Menu from '../../components/ui/Menu.jsx';
import ConfirmWithReason from '../../components/ui/ConfirmWithReason.jsx';
import { adminActionsFor, ACTION_META } from './supplierActions.js';
import { useSupplierAction } from './useSupplierAction.js';

const ICON = {
  approve:    <CheckCircle2 size={14} />,
  deactivate: <PauseCircle size={14} />,
  reactivate: <PlayCircle  size={14} />,
  blacklist:  <Ban         size={14} />,
  delete:     <Trash2      size={14} />
};

/**
 * Kebab menu for a single supplier row (admin only). Renders inline alongside
 * the confirm-with-reason modal. Use `includeView` to add a "View details"
 * item, useful on rows where the whole row isn't clickable.
 */
export default function SupplierActionMenu({ supplier, includeView = false, onAfter }) {
  const navigate = useNavigate();
  const action = useSupplierAction({ onSuccess: onAfter });
  const available = adminActionsFor(supplier.status);

  const items = [];
  if (includeView) {
    items.push({
      key: 'view',
      label: 'View details',
      icon: <Eye size={14} />,
      onSelect: () => navigate(`/suppliers/${supplier.id}`)
    });
  }
  for (const a of available) {
    const meta = ACTION_META[a];
    items.push({
      key: a,
      label: meta.label,
      icon: ICON[a],
      danger: meta.danger,
      onSelect: () => action.open(a, supplier)
    });
  }

  return (
    <>
      <Menu items={items} label={`Actions for ${supplier.display_name}`} />
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
    </>
  );
}
