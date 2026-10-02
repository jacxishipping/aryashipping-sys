'use client';

import { useState } from 'react';
import { Key, Eye, EyeOff, Copy, Sparkles, Check } from 'lucide-react';
import { Alert, Button, FormField, Modal, toast } from '@/components/design-system';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string | null;
  userEmail: string;
  onSuccess?: () => void;
}

function generateSecurePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

export default function ResetPasswordModal({
  open,
  onClose,
  userId,
  userName,
  userEmail,
  onSuccess,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const newPwd = generateSecurePassword();
    setPassword(newPwd);
    setShowPassword(true);
    setCopied(false);
    toast.info('Secure password generated');
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setPassword('');
    setShowPassword(false);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      toast.error('Please enter or generate a password');
      return;
    }

    if (trimmedPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmedPassword }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      toast.success(data.message || 'Password updated successfully');
      handleClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'reset-password-form';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="sm"
      title={
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-[var(--accent-gold)]" />
          <span>Reset Customer Password</span>
        </div>
      }
      description={`Assign a new login password for ${userName || userEmail}`}
      showCloseButton={!submitting}
      disableBackdropClick={submitting}
      actions={
        <>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={submitting || !password.trim()}>
            {submitting ? 'Saving...' : 'Update Password'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 pt-1"
      >
        <div className="p-3 rounded-lg bg-[var(--panel)] border border-[var(--border)]">
          <div className="text-xs text-[var(--text-secondary)] mb-1">
            Target Customer Account
          </div>
          <div className="font-semibold text-sm text-[var(--text-primary)]">
            {userName || 'Customer'}
          </div>
          <div className="text-xs text-[var(--text-secondary)] font-mono">
            {userEmail}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              New Password *
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={handleGenerate}
              disabled={submitting}
            >
              Generate Strong
            </Button>
          </div>

          <FormField
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password (min. 6 chars)"
            disabled={submitting}
            required
            endAdornment={
              <div className="flex items-center gap-1">
                {password && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy password"
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            }
          />
        </div>

        {password && (
          <Alert severity="info">
            Remember to copy or share this password with the customer securely. They will use this password alongside their email ({userEmail}) to log in.
          </Alert>
        )}
      </form>
    </Modal>
  );
}
