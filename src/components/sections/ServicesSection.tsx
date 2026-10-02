'use client';

import { Car, Container, FileCheck, Search } from 'lucide-react';

const services = [
	{
		icon: Car,
		title: 'Car Shipping',
	},
	{
		icon: Container,
		title: 'Container Loading',
	},
	{
		icon: FileCheck,
		title: 'Customs Clearance',
	},
	{
		icon: Search,
		title: 'Live Tracking',
	},
];

export default function ServicesSection() {
	return (
		<section id="services" className="py-20 bg-[var(--background)]">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16">
					<h2 className="text-4xl font-bold text-[var(--text-primary)]">
						Services
					</h2>
				</div>

				{/* Services Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{services.map((service, index) => {
						const Icon = service.icon;
						return (
							<div
								key={index}
								className="group bg-[var(--panel)] rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 border border-[var(--border)] hover:border-[var(--accent-gold)] flex flex-col items-center text-center cursor-pointer hover:-translate-y-2 hover:scale-[1.02]"
							>
								{/* Icon Container */}
								<div className="mb-4">
									<div className="w-20 h-20 rounded-full bg-[rgba(var(--accent-gold-rgb),0.1)] border border-[rgba(var(--accent-gold-rgb),0.2)] flex items-center justify-center text-[var(--accent-gold)] group-hover:bg-[var(--accent-gold)] group-hover:text-[var(--text-primary)] transition-all duration-300 shadow-sm group-hover:shadow-lg">
										<Icon className="w-10 h-10" strokeWidth={1.5} />
									</div>
								</div>

								{/* Title */}
								<div>
									<h3 className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap group-hover:text-[var(--accent-gold)] transition-colors">
										{service.title}
									</h3>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
