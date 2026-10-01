export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <div className={`pf-table-wrap ${className}`}><table className="pf-table">{children}</table></div>; }
export function Th({ children, className='' }: { children?: React.ReactNode; className?: string }) { return <th className={className}>{children}</th>; }
export function Td({ children, className='' }: { children?: React.ReactNode; className?: string }) { return <td className={className}>{children}</td>; }
