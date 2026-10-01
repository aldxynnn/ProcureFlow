import { ArrowUpRightIcon } from './icons';
export function PageHeader({ eyebrow, title, description, action, meta }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode; meta?: React.ReactNode }) {
  return <div className="pf-page-header">
    <div className="min-w-0"><div className="pf-eyebrow">{eyebrow ?? 'ProcureFlow'} <span className="pf-eyebrow-mark">/</span></div><div className="flex flex-wrap items-end gap-x-4 gap-y-2"><h1 className="pf-page-title">{title}</h1>{meta}</div>{description ? <p className="pf-page-description">{description}</p> : null}</div>
    {action ? <div className="shrink-0">{action}</div> : <ArrowUpRightIcon size={17} className="hidden text-slate-300 sm:block" />}
  </div>;
}
