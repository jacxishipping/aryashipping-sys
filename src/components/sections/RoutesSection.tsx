'use client';

import { MapPin, Ship, Truck, CheckCircle, ArrowRight } from 'lucide-react';

const journeySteps = [
	{
		step: 1,
		icon: MapPin,
		location: 'USA / Canada',
		title: 'Pickup & Inspection',
		description: 'We coordinate pickup from any USA or Canada location',
		duration: '1-2 days',
	},
	{
		step: 2,
		icon: Ship,
		location: 'Route Option',
		title: 'Mersin or UAE Route',
		description: 'Secure shipping through the selected Mersin or UAE corridor',
		duration: '25-30 days',
	},
	{
		step: 3,
		icon: Truck,
		location: 'Afghanistan',
		title: 'Land Transport',
		description: 'Customs support and transport planning to the destination province',
		duration: '7-10 days',
	},
	{
		step: 4,
		icon: CheckCircle,
		location: 'Afghanistan',
		title: 'Final Delivery',
		description: 'Door-to-door delivery to any Afghan city',
		duration: '2-5 days',
	},
];

export default function RoutesSection() {
	return (
		<section className="py-20 bg-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16">
					<h2 className="text-4xl font-bold text-gray-900 mb-4">
						Your Vehicle&apos;s Journey
					</h2>
					<p className="text-lg text-gray-600 max-w-3xl mb-4">
						Track your vehicle every step of the way from pickup in the USA or Canada to delivery in Afghanistan
					</p>
					<div className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span className="font-semibold">Total Estimated Time: 35-47 Days</span>
					</div>
				</div>

				{/* Journey Timeline */}
				<div className="relative">
					{/* Connection Line - Desktop */}
					<div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-blue-500 to-blue-200" 
						style={{ width: 'calc(100% - 8rem)', marginLeft: '4rem' }}
					/>

					{/* Steps Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
						{journeySteps.map((step, index) => {
							const Icon = step.icon;
							return (
								<div key={index} className="relative h-full">
									{/* Step Number Badge */}
									<div className="absolute -top-2 left-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-lg z-10">
										{step.step}
									</div>

									{/* Card */}
									<div className="group h-full bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-blue-300 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 pt-8 flex flex-col">
										{/* Icon */}
										<div className="mb-4">
											<div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white mx-auto transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-blue-500/30">
												<Icon className="w-8 h-8" strokeWidth={2} />
											</div>
										</div>

										{/* Location Tag */}
										<div className="text-center mb-3">
											<span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
												{step.location}
											</span>
										</div>

										{/* Content */}
										<div className="text-center flex-grow flex flex-col">
											<h3 className="text-lg font-bold text-gray-900 mb-2">
												{step.title}
											</h3>
											<p className="text-sm text-gray-600 mb-4 flex-grow">
												{step.description}
											</p>
											<div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 justify-center">
												<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												{step.duration}
											</div>
										</div>

										{/* Arrow - Mobile Only */}
										{index < journeySteps.length - 1 && (
											<div className="flex justify-center mt-6 lg:hidden">
												<ArrowRight className="w-6 h-6 text-blue-400" />
											</div>
										)}
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

