'use client';

import { useState } from 'react';
import { Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  } from '@mui/material';
import { Key, Eye, EyeOff, Copy, Sparkles, Check } from 'lucide-react';
import { Alert, Button, Modal, toast } from '@/components/design-system';

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Key style={{ fontSize: 22, color: 'var(--accent-gold)' }} />
          <span>Reset Customer Password</span>
        </Box>
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
      <Box
        component="form"
        id={formId}
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
      >
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--panel)', border: '1px solid var(--border)' }}>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 0.5 }}>
            Target Customer Account
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {userName || 'Customer'}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            {userEmail}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
              New Password *
            </Typography>
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
          </Box>

          <TextField
            fullWidth
            size="small"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password (min. 6 chars)"
            disabled={submitting}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {password && (
                    <IconButton
                      size="small"
                      onClick={handleCopy}
                      title="Copy password"
                      sx={{ mr: 0.5 }}
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {password && (
          <Alert severity="info">
            Remember to copy or share this password with the customer securely. They will use this password alongside their email ({userEmail}) to log in.
          </Alert>
        )}
      </Box>
    </Modal>
  );
}
