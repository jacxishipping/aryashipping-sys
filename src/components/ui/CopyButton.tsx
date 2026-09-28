'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Tooltip } from '@mui/material';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function CopyButton({ value, label, className = '', size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!value || value === '-') return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const padding = size === 'sm' ? 'p-1' : 'p-1.5';

  return (
    <Tooltip title={copied ? 'Copied!' : `Copy ${label || 'to clipboard'}`} arrow placement="top">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${label || value}`}
        className={`inline-flex items-center justify-center rounded-md border border-transparent text-[var(--text-secondary)] transition-all hover:border-[var(--border)] hover:bg-[var(--background)] hover:text-[var(--accent-gold)] active:scale-95 ${padding} ${className}`}
      >
        {copied ? (
          <Check className={`${iconSize} text-emerald-500 animate-in zoom-in-50 duration-150`} />
        ) : (
          <Copy className={`${iconSize} opacity-65 hover:opacity-100 transition-opacity`} />
        )}
      </button>
    </Tooltip>
  );
}

export default CopyButton;
