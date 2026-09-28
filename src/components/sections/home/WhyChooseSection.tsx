import { FileCheck, MapPin, ShieldCheck, Truck } from 'lucide-react';

const pillars = [
  {
    title: 'Route-specific planning',
    description: 'We plan each shipment around the real USA or Canada pickup point, the selected Mersin or UAE route, and the Afghanistan destination instead of treating it like a generic international move.',
    icon: MapPin,
  },
  {
    title: 'Customs-ready documentation',
    description: 'Vehicle files, ownership paperwork, and handoff records stay organized so your shipment does not lose time at transfer points.',
    icon: FileCheck,
  },
  {
    title: 'Protected handoffs',
    description: 'From loading and container assignment to transit release, every stage is tracked so responsibility is clear across the route.',
    icon: ShieldCheck,
  },
  {
    title: 'Operational visibility',
    description: 'Customers and staff see container progress, destination transit updates, and delivery readiness without chasing multiple teams.',
    icon: Truck,
  },
];

export default function WhyChooseSection() {
  return (
    <section className="bg-[var(--panel)] py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)]">Why JACXI</p>
          <h2 className="text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">Built around the actual route, not a template.</h2>
          <p className="mt-5 text-lg leading-relaxed text-[var(--text-secondary)]">
            The service model is designed for Afghan vehicle imports that need coordinated pickup in the USA or Canada, route choice through Mersin or UAE, and dependable final-mile planning after transit assignment.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <article key={pillar.title} className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm shadow-slate-900/5">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--panel)] text-[var(--accent-gold)]">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">{pillar.title}</h3>
                <p className="mt-4 leading-relaxed text-[var(--text-secondary)]">{pillar.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
