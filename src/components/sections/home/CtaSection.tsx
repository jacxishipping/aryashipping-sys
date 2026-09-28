import Link from 'next/link';

interface CtaSectionProps {
  isAuthenticated: boolean;
}

export default function CtaSection({ isAuthenticated }: CtaSectionProps) {
  const primaryHref = isAuthenticated ? '/dashboard' : '/auth/signin';
  const primaryLabel = isAuthenticated ? 'Open dashboard' : 'Start your shipment';

  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-white to-[var(--panel)]" />
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[var(--border)] bg-[var(--background)] px-6 py-14 text-center shadow-sm shadow-slate-900/5 sm:px-10">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)]">Next step</p>
          <h2 className="text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">Ready to move your vehicle from the USA or Canada to Afghanistan?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
            Start with a quote, choose the right Mersin or UAE route, then follow the shipment through final destination transit in one workflow.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--accent-gold)] px-6 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
            >
              {primaryLabel}
            </Link>
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
            >
              Talk to the team
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
