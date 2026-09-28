'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
	{
		name: 'Hamid K.',
		location: 'Fremont, CA',
		rating: 5,
		text: 'My Toyota Camry made it to Kabul in 6 weeks. They kept me updated the whole time. Only issue was a small scratch but they helped me file insurance claim.',
		vehicle: '2018 Toyota Camry',
	},
	{
		name: 'Rashid M.',
		location: 'Herat, Afghanistan',
		rating: 5,
		text: 'Used them twice now. First time for a Honda, second time for my brother\'s car. Both times everything went smooth. Price was fair.',
		vehicle: '2020 Honda Accord',
	},
	{
		name: 'Bilal S.',
		location: 'Virginia, USA',
		rating: 5,
		text: 'Was worried at first but they really know what they\'re doing. Car arrived in Kandahar exactly when they said it would. Would use again.',
		vehicle: '2019 Ford Explorer',
	},
	{
		name: 'Zahra A.',
		location: 'Mazar-i-Sharif',
		rating: 5,
		text: 'My family sent a car from California. Took about 7 weeks total. Driver was nice and brought it right to our house. Thank you Jacxi!',
		vehicle: '2017 Lexus RX',
	},
];

export default function TestimonialsSection() {
	return (
		<section className="py-24 bg-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="text-center mb-16"
				>
					<h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
						What People <span className="text-[rgb(var(--jacxi-blue))]">Say</span>
					</h2>
					<p className="text-xl text-gray-600 max-w-3xl mx-auto">
						Real reviews from customers who shipped their cars with us
					</p>
				</motion.div>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
					{testimonials.map((testimonial, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.1 }}
							className="group"
						>
							<div className="h-full p-8 rounded-2xl backdrop-blur-md bg-gradient-to-br from-white/80 to-gray-50/80 border border-gray-200/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
								{/* Quote Icon */}
								<Quote className="w-10 h-10 text-[rgb(var(--jacxi-blue))]/20 mb-4" />

								{/* Rating */}
								<div className="flex gap-1 mb-4">
									{[...Array(testimonial.rating)].map((_, i) => (
										<Star key={i} className="w-4 h-4 fill-[rgb(var(--uae-gold))] text-[rgb(var(--uae-gold))]" />
									))}
								</div>

								{/* Testimonial Text */}
								<p className="text-gray-700 leading-relaxed mb-6 line-clamp-4">
									&ldquo;{testimonial.text}&rdquo;
								</p>

								{/* Customer Info */}
								<div className="pt-4 border-t border-gray-200">
									<div className="font-semibold text-gray-900">{testimonial.name}</div>
									<div className="text-sm text-gray-600">{testimonial.location}</div>
									<div className="text-xs text-[rgb(var(--jacxi-blue))] mt-1">{testimonial.vehicle}</div>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

