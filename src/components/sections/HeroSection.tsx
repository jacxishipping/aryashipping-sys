'use client';

import { ArrowRight, Truck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/design-system';

export default function HeroSection() {
	return (
		<section className="relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden">
			{/* Background Image */}
			<div className="absolute inset-0">
				<div 
					className="w-full h-full bg-cover bg-center bg-no-repeat"
					style={{
						backgroundImage: `linear-gradient(to right, rgba(var(--panel-rgb), 0.95) 0%, rgba(var(--panel-rgb), 0.85) 40%, rgba(var(--panel-rgb), 0.3) 70%, transparent 100%), url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2070&auto=format&fit=crop')`,
					}}
				/>
			</div>

			<div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 md:py-28 w-full animate-fade-in-up">
				<div className="max-w-2xl">
					{/* Headline */}
					<div>
						<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-[var(--text-primary)] mb-6 tracking-tight">
							Reliable Vehicle Shipping<br />
							From USA & Canada to Afghanistan
						</h1>
					</div>

					{/* Subheadline */}
					<div>
						<p className="text-lg sm:text-xl text-[var(--text-secondary)] mb-8 leading-relaxed">
							Fast, secure logistics through the Mersin route<br />
							or the UAE route for cars, SUVs, and heavy vehicles.
						</p>
					</div>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-4">
						<Button
							href="/auth/signin"
							variant="primary"
							size="lg"
							icon={<ArrowRight className="w-5 h-5" />}
							iconPosition="end"
							className="shadow-lg hover:scale-105 transition-transform"
						>
							Calculate Shipping
						</Button>

						<Button
							href="/tracking"
							variant="outline"
							size="lg"
							icon={<Truck className="w-5 h-5" />}
							iconPosition="start"
							className="shadow-md hover:scale-105 transition-transform"
						>
							Track Shipment
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
