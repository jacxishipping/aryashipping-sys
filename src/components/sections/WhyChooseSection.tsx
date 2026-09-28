'use client';

import { Shield, Receipt, Plane, MapPin } from 'lucide-react';

const features = [
	{
		icon: Shield,
		title: 'Guaranteed Delivery',
	},
	{
		icon: Receipt,
		title: 'Transparent Pricing',
	},
	{
		icon: Plane,
		title: 'USA / Canada Expertise',
	},
	{
		icon: MapPin,
		title: 'Live Tracking',
	},
];

export default function WhyChooseSection() {
	return (
		<section className="py-20 bg-gray-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16">
					<h2 className="text-4xl font-bold text-gray-900">
						Why Choose Us
					</h2>
				</div>

				{/* Features Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{features.map((feature, index) => {
						const Icon = feature.icon;
						return (
							<div 
								key={index} 
								className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-blue-300 hover:-translate-y-1 flex items-center gap-4"
							>
								{/* Icon Container */}
								<div className="flex-shrink-0">
									<div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-blue-500/30">
										<Icon className="w-7 h-7" strokeWidth={2} />
									</div>
								</div>

								{/* Title */}
								<h3 className="text-sm font-semibold text-gray-900">
									{feature.title}
								</h3>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

