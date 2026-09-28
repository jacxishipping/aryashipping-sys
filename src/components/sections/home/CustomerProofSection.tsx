const proofPoints = [
  {
    label: 'Primary destination support',
    value: 'Herat and nationwide Afghan delivery planning',
  },
  {
    label: 'Core transfer model',
    value: 'USA / Canada pickup to Mersin or UAE route to Afghanistan',
  },
  {
    label: 'Customer expectation',
    value: 'Clear updates at container, transit, and release stages',
  },
];

export default function CustomerProofSection() {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--panel)] py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)]">Customer confidence</p>
          <h2 className="text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">A route customers can understand before they book.</h2>
          <p className="mt-6 text-lg leading-relaxed text-[var(--text-secondary)]">
            The homepage now speaks plainly about the real journey: pickup anywhere in the USA or Canada, one selected route through Mersin or UAE, and destination delivery planning inside Afghanistan.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {proofPoints.map((point) => (
            <article key={point.label} className="rounded-3xl border border-[var(--border)] bg-white p-8 text-left shadow-sm shadow-slate-900/5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">{point.label}</p>
              <p className="mt-4 text-xl font-bold leading-snug text-[var(--text-primary)]">{point.value}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
