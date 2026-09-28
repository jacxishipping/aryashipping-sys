'use client';

import { ArrowRight, TruckIcon } from 'lucide-react';
import { Fade, Slide, Grow, Box, Button } from '@mui/material';

export default function HeroSection() {
	const show = true;

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

			<div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 md:py-28 w-full">
				<div className="max-w-2xl">
					{/* Headline */}
					<Slide in={show} direction="up" timeout={600}>
						<Box>
							<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gray-900 mb-6">
								Reliable Vehicle Shipping<br />
								From USA & Canada to Afghanistan
							</h1>
						</Box>
					</Slide>

					{/* Subheadline */}
					<Fade in={show} timeout={800} style={{ transitionDelay: '200ms' }}>
						<Box>
							<p className="text-lg sm:text-xl text-gray-700 mb-8 leading-relaxed">
								Fast, secure logistics through the Mersin route<br />
								or the UAE route for cars, SUVs, and heavy vehicles.
							</p>
						</Box>
					</Fade>

					{/* CTA Buttons */}
					<Fade in={show} timeout={800} style={{ transitionDelay: '400ms' }}>
						<Box className="flex flex-col sm:flex-row gap-4">
							<Grow in={show} timeout={600} style={{ transitionDelay: '600ms' }}>
								<Button
									onClick={() => window.location.href = '/auth/signin'}
									variant="contained"
									sx={{
										bgcolor: 'var(--accent-gold)',
										'&:hover': {
											bgcolor: 'var(--accent-gold)',
											transform: 'scale(1.05)',
										},
										px: 4,
										py: 1.75,
										borderRadius: 1.5,
										fontSize: '1rem',
										fontWeight: 600,
										textTransform: 'none',
										boxShadow: '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1)',
										transition: 'all 0.3s',
										'&:active': {
											transform: 'scale(0.95)',
										},
									}}
									endIcon={<ArrowRight className="w-5 h-5" />}
								>
									Calculate Shipping
								</Button>
							</Grow>
							<Grow in={show} timeout={600} style={{ transitionDelay: '700ms' }}>
								<Button
									onClick={() => window.location.href = '/tracking'}
									variant="outlined"
									sx={{
										borderColor: 'var(--border)',
										borderWidth: 2,
										color: 'var(--text-primary)',
										'&:hover': {
											borderColor: 'var(--text-secondary)',
											bgcolor: 'var(--background)',
											transform: 'scale(1.05)',
										},
										px: 4,
										py: 1.75,
										borderRadius: 1.5,
										fontSize: '1rem',
										fontWeight: 600,
										textTransform: 'none',
										boxShadow: '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1)',
										transition: 'all 0.3s',
										'&:active': {
											transform: 'scale(0.95)',
										},
									}}
									startIcon={<TruckIcon className="w-5 h-5" />}
								>
									Track Shipment
								</Button>
							</Grow>
						</Box>
					</Fade>
				</div>
			</div>
		</section>
	);
}
