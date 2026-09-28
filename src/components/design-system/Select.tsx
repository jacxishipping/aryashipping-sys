"use client";

import {
  Select as MuiSelect,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Box,
  Typography,
  InputAdornment,
} from '@mui/material';
import { ReactNode } from 'react';
import { ExpandMore } from '@mui/icons-material';
import { useTheme } from '@/hooks/useTheme';

/**
 * Select Component
 * 
 * Dropdown select with consistent styling matching FormField.
 */

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectProps {
  id?: string;
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

export default function Select({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  helperText,
  error = false,
  required = false,
  disabled = false,
  leftIcon,
  fullWidth = true,
  size = 'medium',
}: SelectProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const handleChange = (event: SelectChangeEvent<string | number>) => {
    onChange(event.target.value);
  };

  return (
    <Box className="ds-select">
      {/* Label */}
      <Typography
        component="label"
        htmlFor={id}
        sx={{
          display: 'block',
          fontSize: isCompact ? '0.775rem' : '0.875rem',
          fontWeight: 500,
          color: error ? 'var(--error)' : 'var(--text-primary)',
          mb: isCompact ? 0.35 : 1,
        }}
      >
        {label}
        {required && (
          <Typography
            component="span"
            sx={{ color: 'var(--error)', ml: 0.5 }}
          >
            *
          </Typography>
        )}
      </Typography>

      {/* Select */}
      <FormControl fullWidth={fullWidth} error={error} disabled={disabled} size={size === 'medium' && isCompact ? 'small' : size}>
        <MuiSelect
          id={id}
          value={value}
          onChange={handleChange}
          displayEmpty={!!placeholder}
          startAdornment={
            leftIcon ? (
              <InputAdornment position="start">
                <Box sx={{ display: 'flex', color: 'var(--text-secondary)' }}>
                  {leftIcon}
                </Box>
              </InputAdornment>
            ) : undefined
          }
          IconComponent={ExpandMore}
          sx={{
            bgcolor: 'var(--background)',
            borderRadius: 2,
            color: 'var(--text-primary)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: error ? 'var(--error)' : 'rgba(var(--border-rgb), 0.9)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: error ? 'var(--error)' : 'var(--border)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: error ? 'var(--error)' : 'var(--accent-gold)',
              borderWidth: 2,
            },
            '& .MuiSelect-select': {
              color: value ? 'var(--text-primary)' : 'var(--text-secondary)',
            },
            '& .MuiSvgIcon-root': {
              color: 'var(--text-secondary)',
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: 'var(--panel)',
                borderRadius: 2,
                border: '1px solid var(--border)',
                boxShadow: '0 12px 28px rgba(var(--text-primary-rgb), 0.12), 0 4px 8px rgba(var(--text-primary-rgb), 0.08)',
                mt: 0.5,
                '& .MuiList-root': {
                  py: 1,
                },
              },
            },
          }}
        >
          {placeholder && (
            <MenuItem value="" disabled>
              <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {placeholder}
              </Typography>
            </MenuItem>
          )}
          {options.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              sx={{
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                py: 1.25,
                px: 2,
                mx: 0.5,
                borderRadius: 1.5,
                '&:hover': {
                  bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(var(--accent-gold-rgb), 0.15)',
                  '&:hover': {
                    bgcolor: 'rgba(var(--accent-gold-rgb), 0.2)',
                  },
                },
              }}
            >
              {option.icon && (
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5 }}>
                  {option.icon}
                </Box>
              )}
              {option.label}
            </MenuItem>
          ))}
        </MuiSelect>
      </FormControl>

      {/* Helper Text */}
      {helperText && (
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: error ? 'var(--error)' : 'var(--text-secondary)',
            mt: 0.5,
          }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
