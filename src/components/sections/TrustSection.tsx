'use client';

import { motion } from 'framer-motion';
import { Award, Shield, Building2, FileCheck } from 'lucide-react';

const badges = [
	{
		icon: Award,
		title: 'ISO Certified',
		description: 'International quality standards',
	},
	{
		icon: Shield,
		title: 'Full Insurance',
		description: 'Comprehensive coverage',
	},
	{
		icon: Building2,
		title: 'Bonded Warehouse',
		description: 'Secure storage facilities',
	},
	{
		icon: FileCheck,
		title: 'Compliance',
		description: 'All regulations met',
	},
];

export default function TrustSection() {
	return (
		<section className="py-16 bg-white border-y border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
					{badges.map((badge, index) => {
						const Icon = badge.icon;
						return (
							<motion.div
								key={index}
								initial={{ opacity: 0, scale: 0.9 }}
								whileInView={{ opacity: 1, scale: 1 }}
								viewport={{ once: true }}
								transition={{ delay: index * 0.1 }}
								className="flex flex-col items-center text-center group"
							>
								<div className="w-16 h-16 rounded-full bg-gradient-to-br from-[rgb(var(--jacxi-blue))]/10 to-[rgb(var(--uae-gold))]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
									<Icon className="w-8 h-8 text-[rgb(var(--jacxi-blue))]" />
								</div>
								<h3 className="font-bold text-gray-900 mb-1">{badge.title}</h3>
								<p className="text-sm text-gray-600">{badge.description}</p>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

