"use client";

import { Button, ButtonProps } from '@mui/material';
import { ReactNode } from 'react';

interface ActionButtonProps extends Omit<ButtonProps, 'variant'> {
	variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
	icon?: ReactNode;
	iconPosition?: 'start' | 'end';
}

export default function ActionButton({
	variant = 'primary',
	icon,
	iconPosition = 'start',
	children,
	...buttonProps
}: ActionButtonProps) {
	const getVariantStyles = () => {
		switch (variant) {
			case 'primary':
				return {
					bgcolor: 'var(--accent-gold)',
					color: 'var(--background)',
					'&:hover': {
						bgcolor: 'var(--accent-gold)',
						opacity: 0.9,
					},
					'&:disabled': {
						bgcolor: 'rgba(var(--accent-gold-rgb), 0.5)',
						color: 'rgba(var(--background-rgb), 0.85)',
					},
				};
			case 'secondary':
				return {
					bgcolor: 'var(--panel)',
					color: 'var(--text-primary)',
					border: '1px solid var(--border)',
					'&:hover': {
						bgcolor: 'var(--background)',
						borderColor: 'var(--accent-gold)',
					},
				};
			case 'outline':
				return {
					bgcolor: 'transparent',
					color: 'var(--text-primary)',
					border: '1px solid var(--border)',
					'&:hover': {
						bgcolor: 'rgba(var(--border-rgb), 0.2)',
						borderColor: 'var(--accent-gold)',
					},
				};
			case 'ghost':
				return {
					bgcolor: 'transparent',
					color: 'var(--text-secondary)',
					'&:hover': {
						bgcolor: 'rgba(var(--border-rgb), 0.2)',
						color: 'var(--text-primary)',
					},
				};
		}
	};

	return (
		<Button
			{...buttonProps}
			variant="contained"
			{...(icon && iconPosition === 'start' ? { startIcon: icon } : {})}
			{...(icon && iconPosition === 'end' ? { endIcon: icon } : {})}
			sx={{
				textTransform: 'none',
				fontWeight: 600,
				borderRadius: 2,
				px: 2.5,
				py: 1,
				fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.85rem' },
				...getVariantStyles(),
				...buttonProps.sx,
			}}
		>
			{children}
		</Button>
	);
}
