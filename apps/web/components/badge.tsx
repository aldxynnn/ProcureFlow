const label = (value: string) => value.replaceAll('_', ' ');
export function StatusBadge({ value }: { value: string }) {
  const danger = value.includes('REJECT') || value === 'CANCELLED' || value === 'DISCREPANCY';
  const success = value === 'APPROVED' || value === 'VERIFIED' || value === 'FULLY_RECEIVED' || value === 'CLOSED' || value === 'SELECTED';
  const progress = value === 'PENDING_APPROVAL' || value === 'SUBMITTED' || value === 'OPEN' || value === 'ISSUED' || value === 'PARTIALLY_RECEIVED' || value === 'DRAFT';
  const tone = danger ? 'danger' : success ? 'success' : progress ? 'progress' : 'neutral';
  return <span className={`pf-badge pf-badge-${tone}`}><span className="pf-badge-dot" />{label(value)}</span>;
}
