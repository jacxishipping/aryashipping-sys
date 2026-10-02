"use client";

import Button, { ButtonProps } from './Button';
import { ReactNode } from 'react';

/**
 * ActionButton (Legacy)
 * 
 * Kept for backwards compatibility. Delegates directly to design system Button.
 */
export interface ActionButtonProps extends ButtonProps {
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
}

export default function ActionButton(props: ActionButtonProps) {
  return <Button {...props} />;
}
