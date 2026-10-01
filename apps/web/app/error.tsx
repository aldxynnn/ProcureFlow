'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="pf-loading-screen">
      <div className="pf-panel w-full max-w-[520px] p-6 text-left">
        <div className="pf-eyebrow">Workspace error</div>
        <h1 className="mt-2 text-[22px] font-bold tracking-tight text-slate-900">This workspace view could not be loaded.</h1>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">The application recovered the error boundary. Retry the current view or return to the workspace.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="pf-btn pf-btn-primary" onClick={() => reset()}>Retry</button>
          <a className="pf-btn" href="/dashboard">Back to workspace</a>
        </div>
      </div>
    </div>
  );
}
