'use client';

import { FileText, Anchor, Ship, Truck, CheckCircle2 } from 'lucide-react';

const steps = [
	{
		icon: FileText,
		title: 'Book',
		description: 'Get a quote for USA or Canada to Afghanistan through Mersin or UAE',
	},
	{
		icon: Truck,
		title: 'USA / Canada Pickup',
		description: 'Vehicle collected and prepared for export from the origin lane',
	},
	{
		icon: Ship,
		title: 'Mersin or UAE Route',
		description: 'Shipment moves through one selected route option, not both',
	},
	{
		icon: Anchor,
		title: 'To Afghanistan',
		description: 'Customs and destination transport are coordinated into Afghanistan',
	},
	{
		icon: CheckCircle2,
		title: 'Final Delivery',
		description: 'Distribution to Herat or any Afghan province',
	},
];

export default function ProcessSection() {
	return (
		<section className="py-24 bg-[var(--background)]">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-16 animate-fade-in-up">
					<h2 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
						The <span className="text-[var(--accent-gold)]">Journey</span>
					</h2>
					<p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto">
						From the USA or Canada through either Mersin or UAE to Afghanistan - here is what happens after you book
					</p>
				</div>

				<div className="relative">
					{/* Timeline Line */}
					<div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-[rgba(var(--accent-gold-rgb),0.2)] via-[var(--accent-gold)] to-[rgba(var(--accent-gold-rgb),0.2)]" />

					{/* Steps */}
					<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
						{steps.map((step, index) => {
							const Icon = step.icon;
							return (
								<div
									key={index}
									className="relative p-6 bg-[var(--panel)] rounded-2xl border border-[var(--border)] shadow-md hover:shadow-2xl hover:border-[var(--accent-gold)] hover:-translate-y-2 transition-all duration-300"
								>
									<div className="flex flex-col items-center text-center group">
										{/* Icon Circle */}
										<div className="relative mb-6">
											<div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--panel)] to-[var(--background)] border-2 border-[var(--accent-gold)] flex items-center justify-center text-[var(--accent-gold)] shadow-xl group-hover:scale-110 transition-all duration-300 relative z-10">
												<Icon className="w-10 h-10" />
											</div>
											{/* Step Number */}
											<div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[var(--accent-gold)] text-[var(--text-primary)] text-sm font-bold flex items-center justify-center shadow-lg z-20">
												{index + 1}
											</div>
											{/* Glow Effect */}
											<div className="absolute inset-0 bg-[rgba(var(--accent-gold-rgb),0.2)] rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
										</div>

										{/* Content */}
										<div>
											<h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
												{step.title}
											</h3>
											<p className="text-sm text-[var(--text-secondary)]">
												{step.description}
											</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}
