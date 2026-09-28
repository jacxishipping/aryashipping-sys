'use client';

import { Car, Container, FileCheck, Search } from 'lucide-react';
import { Fade, Zoom, Box } from '@mui/material';

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
	const show = true;

	return (
		<section id="services" className="py-20 bg-gradient-to-b from-gray-50 to-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16">
					<h2 className="text-4xl font-bold text-gray-900">
						Services
					</h2>
				</div>

				{/* Services Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{services.map((service, index) => {
						const Icon = service.icon;
						return (
							<Zoom
								key={index}
								in={show}
								timeout={500}
								style={{ transitionDelay: `${index * 100}ms` }}
							>
								<Box
									className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-blue-300 flex flex-col items-center text-center cursor-pointer"
									sx={{
										'&:hover': {
											transform: 'translateY(-8px) scale(1.02)',
										},
									}}
								>
									{/* Icon Container */}
									<Zoom in={show} timeout={600} style={{ transitionDelay: `${index * 100 + 200}ms` }}>
										<Box className="mb-4">
											<div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-blue-500/30">
												<Icon className="w-10 h-10" strokeWidth={1.5} />
											</div>
										</Box>
									</Zoom>

									{/* Title */}
									<Fade in={show} timeout={600} style={{ transitionDelay: `${index * 100 + 300}ms` }}>
										<h3 className="text-sm font-semibold text-gray-900 whitespace-nowrap group-hover:text-blue-600 transition-colors">
											{service.title}
										</h3>
									</Fade>
								</Box>
							</Zoom>
						);
					})}
				</div>
			</div>
		</section>
	);
}
