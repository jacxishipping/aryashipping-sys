'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { User, Mail, Lock, Phone, Home, Building2, Globe, Shield, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

import { PageHeader, Button, Select, toast, FormPageSkeleton } from '@/components/design-system';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';

const steps = ['Basic Info', 'Contact Details', 'Security'];

export default function CreateUserPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { status } = useSession();
	const accountType = searchParams.get('accountType') === 'user' ? 'user' : 'customer';
	const defaultRole = accountType === 'user' ? 'admin' : 'user';
	const successRedirect = accountType === 'user' ? '/dashboard/users' : '/dashboard/customers';
	const [activeStep, setActiveStep] = useState(0);
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
		role: defaultRole,
		phone: '',
		address: '',
		city: '',
		country: '',
	});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	if (status === 'loading') {
		return <FormPageSkeleton />;
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleNext = () => {
		if (activeStep === 0) {
			if (!formData.name.trim()) {
				toast.error('Name is required');
				return;
			}
			if (!formData.email.trim()) {
				toast.error('Email is required');
				return;
			}
		} else if (activeStep === 2) {
			if (!formData.password) {
				toast.error('Password is required');
				return;
			}
			if (formData.password.length < 6) {
				toast.error('Password must be at least 6 characters');
				return;
			}
			if (formData.password !== formData.confirmPassword) {
				toast.error('Passwords do not match');
				return;
			}
			handleSubmit();
			return;
		}
		setActiveStep((prev) => prev + 1);
	};

	const handleBack = () => {
		setActiveStep((prev) => prev - 1);
	};

	const handleSubmit = async () => {
		setIsLoading(true);
		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			});

			const data = await res.json();

			if (res.ok) {
				if (typeof window !== 'undefined') {
					window.dispatchEvent(new CustomEvent('jacxi-users-updated', { detail: { action: 'created', user: data.user } }));

					if (typeof BroadcastChannel !== 'undefined') {
						try {
							const bc = new BroadcastChannel('jacxi-users');
							bc.postMessage({ action: 'created', user: data.user });
							bc.close();
						} catch {}
					}
				}

				toast.success('User created successfully');
				setTimeout(() => router.push(successRedirect), 800);
			} else {
				const msg = data?.message || 'Registration failed';
				toast.error(msg);
				setIsLoading(false);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'An error occurred. Please try again.';
			toast.error(message);
			setIsLoading(false);
		}
	};

	return (
		<DashboardSurface>
			<PageHeader
				showBreadcrumbs
				title={accountType === 'user' ? 'Create Internal User' : 'Create Customer'}
				description={accountType === 'user' ? 'Create a new internal admin or team account' : 'Create a new customer account'}
				actions={
					<Link href={successRedirect}>
						<Button variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
							Back
						</Button>
					</Link>
				}
			/>

			<div className="max-w-3xl">
				<DashboardPanel>
					{/* Custom Stepper */}
					<div className="w-full mb-8">
						<div className="flex items-center justify-between relative max-w-xl mx-auto px-4">
							{steps.map((label, idx) => {
								const isCompleted = activeStep > idx;
								const isActive = activeStep === idx;
								return (
									<div key={label} className="flex flex-col items-center relative z-10">
										<div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
											isActive 
												? 'bg-[var(--accent-gold)] text-black shadow-md ring-2 ring-[var(--accent-gold)] ring-offset-2 ring-offset-[var(--background)]' 
												: isCompleted 
												? 'bg-[var(--accent-gold)] text-black' 
												: 'bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]'
										}`}>
											{idx + 1}
										</div>
										<span className={`text-xs mt-1.5 font-medium ${isActive ? 'text-[var(--accent-gold)] font-bold' : isCompleted ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
											{label}
										</span>
									</div>
								);
							})}
						</div>
					</div>

					{/* Form Content */}
					<div className="min-h-[280px]">
						{activeStep === 0 && (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* Name */}
								<div className="sm:col-span-2">
									<label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
										Full Name <span className="text-[var(--error)]">*</span>
									</label>
									<div className="relative flex items-center">
										<User className="w-4 h-4 absolute left-3 text-[var(--text-secondary)]" />
										<input
											id="name"
											name="name"
											type="text"
											value={formData.name}
											onChange={handleChange}
											required
											placeholder="Enter full name"
											className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
										/>
									</div>
								</div>

								{/* Email */}
								<div className="sm:col-span-2">
									<label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
										Email <span className="text-[var(--error)]">*</span>
									</label>
									<div className="relative flex items-center">
										<Mail className="w-4 h-4 absolute left-3 text-[var(--text-secondary)]" />
										<input
											id="email"
											name="email"
											type="email"
											value={formData.email}
											onChange={handleChange}
											required
											placeholder="Enter email address"
											className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
										/>
									</div>
								</div>

								{/* Role */}
								<div className="sm:col-span-2">
									{accountType === 'customer' ? (
										<div>
											<label htmlFor="role" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Role</label>
											<div className="relative flex items-center">
												<Shield className="w-4 h-4 absolute left-3 text-[var(--text-secondary)]" />
												<input
													id="role"
													name="role"
													value="Customer"
													disabled
													className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] opacity-80 cursor-not-allowed"
												/>
											</div>
										</div>
									) : (
										<Select
											id="role"
											label="Role"
											value={formData.role}
											onChange={(value) => setFormData({ ...formData, role: String(value) })}
											required
											leftIcon={<Shield className="w-4 h-4" />}
											options={[
												{ value: 'admin', label: 'Admin' },
												{ value: 'manager', label: 'Manager' },
												{ value: 'finance', label: 'Finance' },
												{ value: 'operations', label: 'Operations' },
												{ value: 'customer_service', label: 'Customer Service' },
											]}
										/>
									)}
								</div>
							</div>
						)}

						{activeStep === 1 && (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* Phone */}
								<div className="sm:col-span-2">
									<label htmlFor="phone" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Phone</label>
									<div className="relative flex items-center">
										<Phone className="w-4 h-4 absolute left-3 text-[var(--text-secondary)]" />
										<input
											id="phone"
											name="phone"
											type="tel"
											value={formData.phone}
											onChange={handleChange}
											placeholder="Enter phone number"
											className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
										/>
									</div>
								</div>

								{/* Address */}
								<div className="sm:col-span-2">
									<label htmlFor="address" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Address</label>
									<div className="relative flex items-center">
										<Home className="w-4 h-4 absolute left-3 text-[var(--text-secondary)]" />
										<input
											id="address"
											name="address"
											type="text"
											value={formData.address}
											onChange={handleChange}
											placeholder="Enter address"
											className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
										/>
									</div>
								</div>

								{/* City */}
								<div>
									<label htmlFor="city" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">City</label>
									<div className="relative flex items-center">
										<Building2 className="w-4 h-4 absolute left-3 text-[var(--text-secondary)]" />
										<input
											id="city"
											name="city"
											type="text"
											value={formData.city}
											onChange={handleChange}
											placeholder="Enter city"
											className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
										/>
									</div>
								</div>

								{/* Country */}
								<div>
									<label htmlFor="country" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Country</label>
									<div className="relative flex items-center">
										<Globe className="w-4 h-4 absolute left-3 text-[var(--text-secondary)]" />
										<input
											id="country"
											name="country"
											type="text"
											value={formData.country}
											onChange={handleChange}
											placeholder="Enter country"
											className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
										/>
									</div>
								</div>
							</div>
						)}

						{activeStep === 2 && (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* Password */}
								<div className="sm:col-span-2">
									<label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
										Password <span className="text-[var(--error)]">*</span>
									</label>
									<div className="relative flex items-center">
										<Lock className="w-4 h-4 absolute left-3 text-[var(--text-secondary)]" />
										<input
											id="password"
											name="password"
											type={showPassword ? 'text' : 'password'}
											value={formData.password}
											onChange={handleChange}
											required
											placeholder="Enter password (min. 6 characters)"
											className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 text-[var(--accent-gold)] hover:opacity-80 p-1"
										>
											{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
										</button>
									</div>
								</div>

								{/* Confirm Password */}
								<div className="sm:col-span-2">
									<label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
										Confirm Password <span className="text-[var(--error)]">*</span>
									</label>
									<div className="relative flex items-center">
										<Lock className="w-4 h-4 absolute left-3 text-[var(--text-secondary)]" />
										<input
											id="confirmPassword"
											name="confirmPassword"
											type={showConfirmPassword ? 'text' : 'password'}
											value={formData.confirmPassword}
											onChange={handleChange}
											required
											placeholder="Confirm password"
											className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
										/>
										<button
											type="button"
											onClick={() => setShowConfirmPassword(!showConfirmPassword)}
											className="absolute right-3 text-[var(--accent-gold)] hover:opacity-80 p-1"
										>
											{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
										</button>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="flex items-center justify-between pt-6 border-t border-[var(--border)] mt-6">
						<Button
							variant="outline"
							disabled={activeStep === 0}
							onClick={handleBack}
						>
							Back
						</Button>
						
						<div className="flex items-center gap-2">
							{activeStep === 0 && (
								<Button
									variant="ghost"
									onClick={() => router.push(successRedirect)}
								>
									Cancel
								</Button>
							)}
							<Button
								onClick={handleNext}
								variant="primary"
								loading={isLoading}
							>
								{activeStep === steps.length - 1 ? (isLoading ? 'Creating...' : 'Create Account') : 'Next'}
							</Button>
						</div>
					</div>
				</DashboardPanel>
			</div>
		</DashboardSurface>
	);
}
