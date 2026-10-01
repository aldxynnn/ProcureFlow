'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { EmptyNotice, ErrorNotice } from './notice';
import { FileTextIcon, ArrowUpRightIcon } from './icons';
import { formatDateTime } from '../lib/format';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.txt';

export function AttachmentPanel({ entityType, entityId, canUpload = true }: { entityType: string; entityId: string; canUpload?: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['attachments', entityType, entityId], queryFn: () => api.attachments(entityType, entityId) });
  const upload = useMutation({ mutationFn: (file: File) => api.uploadAttachment(entityType, entityId, file), onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] }) });
  const rows = query.data ?? [];

  return <section className="pf-panel overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
      <div><div className="pf-card-title">Documents</div><div className="pf-card-subtitle">Attach supporting records without copying file contents into the database.</div></div>
      {canUpload ? <label className="pf-btn pf-btn-primary cursor-pointer"><FileTextIcon size={14}/>{upload.isPending ? 'Uploading…' : 'Add document'}<input className="sr-only" type="file" accept={ACCEPT} disabled={upload.isPending} onChange={e => { const file = e.target.files?.[0]; e.currentTarget.value = ''; if (file) upload.mutate(file); }} /></label> : null}
    </div>
    {upload.error ? <div className="p-4"><ErrorNotice message={upload.error.message}/></div> : null}
    {query.isLoading ? <div className="p-5 text-[11px] text-slate-500">Loading documents…</div> : query.error ? <div className="p-4"><ErrorNotice message={query.error.message}/></div> : !rows.length ? <div className="p-4"><EmptyNotice>No supporting documents attached.</EmptyNotice></div> : <div className="divide-y divide-slate-100">{rows.map((a: any) => <div key={a.id} className="flex items-center gap-3 p-4"><span className="pf-kpi-icon"><FileTextIcon size={14}/></span><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold text-slate-800">{a.originalName}</div><div className="mt-1 text-[9px] text-slate-400">{a.contentType} · {Math.max(1, Math.round(Number(a.sizeBytes) / 1024))} KB · {formatDateTime(a.createdAt)}</div></div><button type="button" className="pf-btn" onClick={() => api.downloadAttachment(a.id)}>Open <ArrowUpRightIcon size={13}/></button></div>)}</div>}
  </section>;
}
