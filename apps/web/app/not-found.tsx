export default function NotFound() {
  return (
    <div className="pf-loading-screen">
      <div className="pf-panel w-full max-w-[520px] p-6 text-left">
        <div className="pf-eyebrow">404 / Not found</div>
        <h1 className="mt-2 text-[22px] font-bold tracking-tight text-slate-900">That workspace page does not exist.</h1>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">The requested destination may have moved or may no longer be available.</p>
        <a className="pf-btn pf-btn-primary mt-5 inline-flex" href="/dashboard">Go to dashboard</a>
      </div>
    </div>
  );
}
