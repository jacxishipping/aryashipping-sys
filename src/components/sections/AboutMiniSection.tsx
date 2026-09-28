import { CheckCircle2, Globe2, ShieldCheck, Truck } from 'lucide-react';

const highlights = [
  'Licensed and bonded coordination',
  'Dedicated vehicle logistics support',
  'All Afghan provinces covered',
  'Free route consultation',
];

const trustCards = [
  {
    icon: ShieldCheck,
    title: 'High-trust handling',
    description: 'Vehicle inspections, secure loading, and milestone communication are built into the workflow.',
  },
  {
    icon: Globe2,
    title: 'Corridor expertise',
    description: 'USA and Canada pickup coordination with Mersin or UAE route planning into Afghanistan.',
  },
  {
    icon: Truck,
    title: 'Final-mile network',
    description: 'Delivery support from Herat to major cities and province destinations across Afghanistan.',
  },
];

export default function AboutMiniSection() {
	return (
		<section id="about" className="relative overflow-hidden bg-[var(--background)] py-20 sm:py-24 scroll-mt-20">
			<div id="about-us" className="absolute -top-20" aria-hidden="true" />
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
					<div>
						<p className="landing-reveal text-sm font-bold uppercase text-[var(--accent-gold)]">Our story</p>
						<h2 className="landing-reveal mt-4 max-w-xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
							A specialist car shipping partner for Afghan importers.
						</h2>
						<p className="landing-reveal mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
							JACXI Shipping has been building vehicle logistics from the USA and Canada to Afghanistan for over a decade. We combine customs support, tracking, and careful route coordination so families and businesses can move vehicles with confidence.
						</p>
						<p className="landing-reveal mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
							We understand the unique needs of Afghan expatriates and businesses importing vehicles, and we design the process to be direct, transparent, and reliable.
						</p>

						<div className="landing-reveal mt-7 grid gap-2 sm:grid-cols-2">
							{highlights.map((item) => (
								<div key={item} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
									<CheckCircle2 className="h-4 w-4 text-[var(--accent-gold)]" />
									<span className="text-sm font-bold text-[var(--text-primary)]">{item}</span>
								</div>
							))}
						</div>
					</div>

					<div className="grid gap-3">
						<div className="landing-reveal grid gap-3">
							{trustCards.map((card) => {
								const Icon = card.icon;
								return (
									<div key={card.title} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
										<div className="flex gap-4">
											<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
												<Icon className="h-5 w-5" />
											</div>
											<div>
												<h3 className="text-lg font-black text-[var(--text-primary)]">{card.title}</h3>
												<p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{card.description}</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
