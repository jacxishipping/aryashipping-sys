'use client';

import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Send, Headphones, UserRound } from 'lucide-react';
import { Button, FormField, toast } from '@/components/design-system';

type NotificationComposerProps = {
  recipientUserId?: string;
  recipientName?: string;
  mode: 'customer-to-support' | 'internal-to-customer';
};

export default function NotificationComposer({
  recipientUserId,
  recipientName,
  mode,
}: NotificationComposerProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const isCustomerToSupport = mode === 'customer-to-support';
  const title = isCustomerToSupport ? 'Contact Support' : `Notify ${recipientName ?? 'Customer'}`;
  const description = isCustomerToSupport
    ? 'Send a message to the internal team. They will receive it instantly in their notification center.'
    : 'Send a direct in-app notification to this customer. It appears immediately in their notification center.';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedMessage = message.trim();
    const trimmedSubject = subject.trim();

    if (!trimmedMessage) {
      toast.error('Please enter a message');
      return;
    }

    if (!isCustomerToSupport && !recipientUserId) {
      toast.error('A customer recipient is required for this notification');
      return;
    }

    setSending(true);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientUserId,
          title: trimmedSubject || undefined,
          message: trimmedMessage,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send notification');
      }

      setSubject('');
      setMessage('');
      toast.success(isCustomerToSupport ? 'Support notified successfully' : 'Customer notified successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send notification';
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(var(--accent-gold-rgb), 0.12)',
              color: 'var(--accent-gold)',
            }}
          >
            {isCustomerToSupport ? <Headphones className="w-5 h-5" /> : <UserRound className="w-5 h-5" />}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>{title}</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{description}</Typography>
          </Box>
        </Box>

        <FormField
          label="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={isCustomerToSupport ? 'What do you need help with?' : `Message for ${recipientName ?? 'customer'}`}
        />

        <FormField
          label="Message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={isCustomerToSupport ? 'Describe what you need from the team...' : 'Write the update you want the customer to receive...'}
          multiline
          minRows={4}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={<Send className="w-4 h-4" />}
            loading={sending}
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}