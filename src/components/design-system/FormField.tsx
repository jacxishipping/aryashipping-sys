"use client";

import { TextField, TextFieldProps, Typography, Box, InputAdornment } from '@mui/material';
import { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface FormFieldProps extends Omit<TextFieldProps, 'variant' | 'error' | 'helperText'> {
	label: string;
	helperText?: ReactNode;
	error?: boolean | string;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
}

export default function FormField({
	label,
	helperText,
	error,
	leftIcon,
	rightIcon,
	...textFieldProps
}: FormFieldProps) {
	const { density } = useTheme();
	const isCompact = density === 'compact';
	const hasError = typeof error === 'string' ? Boolean(error) : Boolean(error);
	const displayedHelperText = (typeof error === 'string' && error) ? error : helperText;
	const helperTextId = textFieldProps.id ? `${textFieldProps.id}-helper-text` : undefined;

	return (
		<Box className="ds-form-field">
			<Typography
				component="label"
				htmlFor={textFieldProps.id}
				sx={{
					display: 'block',
					fontSize: isCompact ? '0.775rem' : '0.875rem',
					fontWeight: 500,
					color: 'var(--text-primary)',
					mb: isCompact ? 0.35 : 1,
				}}
			>
				{label}
				{textFieldProps.required && (
					<Typography
						component="span"
						sx={{ color: 'var(--error)', ml: 0.5 }}
					>
						*
					</Typography>
				)}
			</Typography>
			<TextField
				size={textFieldProps.size || (isCompact ? 'small' : 'medium')}
				error={hasError}
				{...textFieldProps}
				aria-describedby={[
					displayedHelperText ? helperTextId : undefined,
					textFieldProps['aria-describedby']
				].filter(Boolean).join(' ') || undefined}
				fullWidth
				InputProps={{
					...textFieldProps.InputProps,
					startAdornment: leftIcon ? (
						<InputAdornment position="start">
							{leftIcon}
						</InputAdornment>
					) : textFieldProps.InputProps?.startAdornment,
					endAdornment: rightIcon ? (
						<InputAdornment position="end">
							{rightIcon}
						</InputAdornment>
					) : textFieldProps.InputProps?.endAdornment,
				}}
				sx={{
					'& .MuiOutlinedInput-root': {
						bgcolor: 'var(--background)',
						borderRadius: 2,
						color: 'var(--text-primary)',
						'& fieldset': {
							borderColor: 'rgba(var(--border-rgb), 0.9)',
						},
						'&:hover fieldset': {
							borderColor: 'var(--border)',
						},
						'&.Mui-focused fieldset': {
							borderColor: 'var(--accent-gold)',
							borderWidth: 2,
						},
						'& input, & textarea': {
							color: 'var(--text-primary)',
							'&::placeholder': {
								color: 'var(--text-secondary)',
								opacity: 1,
							},
							'&:-webkit-autofill': {
								WebkitBoxShadow: '0 0 0 100px var(--background) inset',
								WebkitTextFillColor: 'var(--text-primary)',
							},
						},
						'& .MuiInputAdornment-root': {
							color: 'var(--text-secondary)',
						},
					},
					...textFieldProps.sx,
				}}
			/>
			{displayedHelperText && (
				<Typography
					id={helperTextId}
					sx={{
						fontSize: '0.75rem',
						color: hasError ? 'var(--error)' : 'var(--text-secondary)',
						mt: 0.5,
					}}
				>
					{displayedHelperText}
				</Typography>
			)}
		</Box>
	);
}
