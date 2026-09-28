'use client';

import { motion } from 'framer-motion';

const brands = [
	{ name: 'Toyota', icon: '🚗' },
	{ name: 'Lexus', icon: '🚙' },
	{ name: 'BMW', icon: '🏎️' },
	{ name: 'Mercedes', icon: '🚘' },
	{ name: 'Dodge', icon: '🚐' },
	{ name: 'Range Rover', icon: '🚙' },
	{ name: 'Ford', icon: '🚚' },
	{ name: 'Chevrolet', icon: '🚗' },
];

export default function BrandsSection() {
	return (
		<section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 border-y border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="text-center mb-12"
				>
					<h3 className="text-2xl font-bold text-gray-900 mb-2">
						We Ship All Vehicle Brands
					</h3>
					<p className="text-gray-600">
						Trusted by thousands of customers worldwide
					</p>
				</motion.div>

				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
					{brands.map((brand, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, scale: 0.9 }}
							whileInView={{ opacity: 1, scale: 1 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.05 }}
							className="group"
						>
							<div className="aspect-square rounded-xl backdrop-blur-md bg-white/80 border border-gray-200/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col items-center justify-center p-4">
								<div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">
									{brand.icon}
								</div>
								<div className="text-xs font-semibold text-gray-700 text-center">
									{brand.name}
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

