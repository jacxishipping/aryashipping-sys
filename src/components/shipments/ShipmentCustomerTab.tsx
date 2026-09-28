'use client';

import { useState } from 'react';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, FormField, toast } from '@/components/design-system';
import type { Shipment } from '@/components/shipments/shipment-detail-types';

type ShipmentCustomerTabProps = {
  user: Shipment['user'];
  shipmentId: string;
};

const draftIntents = [
  { value: 'status-update', label: 'Status Update' },
  { value: 'delay-update', label: 'Delay Update' },
  { value: 'document-request', label: 'Document Request' },
  { value: 'payment-reminder', label: 'Payment Reminder' },
  { value: 'pickup-coordination', label: 'Pickup Coordination' },
] as const;

export default function ShipmentCustomerTab({ user, shipmentId }: ShipmentCustomerTabProps) {
  const [intent, setIntent] = useState<(typeof draftIntents)[number]['value']>('status-update');
  const [extraInstructions, setExtraInstructions] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const generateDraft = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/ai/shipment-update-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId,
          intent,
          extraInstructions: extraInstructions.trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate shipment update');
      }

      setSubject(payload.subject || 'Shipment update');
      setMessage(payload.message || '');
      toast.success(payload.source === 'digitalocean-ai' ? 'AI draft generated' : 'Fallback draft generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate shipment update');
    } finally {
      setGenerating(false);
    }
  };

  const sendNotification = async () => {
    const trimmedMessage = message.trim();
    const trimmedSubject = subject.trim();

    if (!trimmedMessage) {
      toast.error('Please enter a message before sending');
      return;
    }

    if (!user.id) {
      toast.error('Customer recipient is missing');
      return;
    }

    try {
      setSending(true);
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId: user.id,
          title: trimmedSubject || undefined,
          message: trimmedMessage,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send notification');
      }

      toast.success('Customer notified successfully');
      setExtraInstructions('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send customer update');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardPanel title="Customer Information" description="Review contact details, draft an AI update, and send it directly to the customer.">
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Name</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{user.name || 'N/A'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Email</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{user.email}</p>
        </div>
        {user.phone && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Phone</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{user.phone}</p>
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {draftIntents.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setIntent(option.value)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  intent === option.value
                    ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--text-primary)]'
                    : 'border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(var(--border-rgb),0.18)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <FormField
              label="Draft Instructions"
              value={extraInstructions}
              onChange={(event) => setExtraInstructions(event.target.value)}
              placeholder="Optional: mention delay details, missing documents, payment urgency, or the tone you want."
              multiline
              minRows={2}
            />

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={generateDraft} loading={generating}>
                {generating ? 'Generating...' : 'Generate AI Draft'}
              </Button>
            </div>

            <FormField
              label="Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Customer-facing subject line"
            />

            <FormField
              label="Message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write the update you want the customer to receive..."
              multiline
              minRows={6}
            />

            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={sendNotification} loading={sending}>
                {sending ? 'Sending...' : 'Send Customer Update'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}