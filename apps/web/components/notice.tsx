import { XIcon } from './icons';
export function ErrorNotice({ message }: { message: string }) { return <div className="pf-notice pf-notice-error"><div><strong>Action couldn’t be completed</strong><p>{message}</p></div><XIcon size={16} className="shrink-0 text-red-400" /></div>; }
export function EmptyNotice({ children }: { children: React.ReactNode }) { return <div className="pf-empty"><div className="pf-empty-icon">—</div><strong>Nothing to show yet</strong><p>{children}</p></div>; }
