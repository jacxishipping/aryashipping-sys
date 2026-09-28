'use client';

import { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  X, 
  Smartphone, 
  Share2, 
  Sparkles, 
  Globe, 
  Mail, 
  Phone,
  ShieldCheck
} from 'lucide-react';
import { toast } from '@/components/design-system';

export interface CustomerNotificationPayload {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleDetails?: string;
  vin?: string;
  containerNumber?: string;
  portOfOrigin?: string;
  destinationPort?: string;
  trackingLink?: string;
  eta?: string;
}

interface CustomerNotificationModalProps {
  open: boolean;
  onClose: () => void;
  payload: CustomerNotificationPayload;
}

type NotificationChannel = 'whatsapp' | 'sms' | 'email';

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  tag: string;
}

export function CustomerNotificationModal({ open, onClose, payload }: CustomerNotificationModalProps) {
  const [channel, setChannel] = useState<NotificationChannel>('whatsapp');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('container_loaded');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [customPhone, setCustomPhone] = useState(payload.customerPhone || '');
  const [customEmail, setCustomEmail] = useState(payload.customerEmail || '');

  const templates: NotificationTemplate[] = [
    {
      id: 'yard_received',
      name: '1. Received at Export Yard',
      tag: 'Warehouse',
      subject: `Vehicle Received at Yard - ${payload.vehicleDetails || 'Auto'}`,
      body: `Hello ${payload.customerName || 'Valued Customer'},\n\nYour vehicle ${payload.vehicleDetails || 'Vehicle'} (VIN: ${payload.vin || 'N/A'}) has safely arrived at our export warehouse in ${payload.portOfOrigin || 'US Port'}.\n\nInspection and thermal yard tagging completed. Track your vehicle status anytime: ${payload.trackingLink || 'https://jacxishipping.com/tracking'}\n\nThank you for shipping with JACXI!`,
    },
    {
      id: 'container_loaded',
      name: '2. Loaded into Ocean Container',
      tag: 'Loading Bay',
      subject: `Container Loading Confirmation - ${payload.containerNumber || 'MSKU'}`,
      body: `Hello ${payload.customerName || 'Valued Customer'},\n\nYour vehicle ${payload.vehicleDetails || 'Vehicle'} (VIN: ${payload.vin || 'N/A'}) is now safely ramped and secured inside Container #${payload.containerNumber || 'PENDING'}.\n\nDestination: ${payload.destinationPort || 'Middle East Port'}\nEstimated Arrival: ${payload.eta || '3-4 Weeks'}\n\nTrack ocean progress here: ${payload.trackingLink || 'https://jacxishipping.com/tracking'}`,
    },
    {
      id: 'vessel_departed',
      name: '3. Vessel Sailed / In Transit',
      tag: 'Ocean Transit',
      subject: `Ocean Vessel Sailed - ${payload.containerNumber || 'Container'}`,
      body: `Dear ${payload.customerName || 'Valued Customer'},\n\nThe ocean vessel carrying Container #${payload.containerNumber || 'N/A'} has departed ${payload.portOfOrigin || 'origin port'} and is en route to ${payload.destinationPort || 'destination'}.\n\nEstimated ETA: ${payload.eta || 'On Schedule'}.\nLive voyage tracking: ${payload.trackingLink || 'https://jacxishipping.com/tracking'}`,
    },
    {
      id: 'customs_cleared',
      name: '4. Customs Cleared & Ready for Pickup',
      tag: 'Destination',
      subject: `Customs Clearance Complete - ${payload.vehicleDetails || 'Vehicle'}`,
      body: `Great news ${payload.customerName || 'Valued Customer'}!\n\nYour vehicle ${payload.vehicleDetails || 'Vehicle'} has successfully cleared port customs at ${payload.destinationPort || 'Destination Port'} and is ready for release & pickup at the yard.\n\nPlease bring your consignee ID and B/L copy for gate pass release.\n\nJACXI Shipping Operations`,
    },
  ];

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [selectedTemplateId, templates]);

  const [messageBody, setMessageBody] = useState(activeTemplate.body);

  // Update body whenever template selection changes
  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) setMessageBody(tmpl.body);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageBody);
    setCopied(true);
    toast.success('Message copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      // Simulate API call to notification engine or call agent
      await new Promise((r) => setTimeout(r, 800));
      
      if (channel === 'whatsapp') {
        const cleanPhone = (customPhone || '').replace(/[^0-9]/g, '');
        const encodedText = encodeURIComponent(messageBody);
        const waUrl = cleanPhone 
          ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
          : `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(waUrl, '_blank');
      }

      toast.success(`${channel.toUpperCase()} notification dispatched successfully!`);
      onClose();
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-4xl rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-gold)] text-white shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Customer Notification Studio
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Dispatch branded WhatsApp, SMS, and Email milestones directly to consignees
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Editor & Right Smartphone Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: Editor & Templates (7 Cols) */}
          <div className="lg:col-span-7 p-6 overflow-y-auto space-y-5 border-r border-[var(--border)]">
            {/* Channel Tabs */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Dispatch Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-500' },
                  { id: 'sms', label: 'Direct SMS', icon: Smartphone, color: 'text-blue-500' },
                  { id: 'email', label: 'Email Notice', icon: Mail, color: 'text-purple-500' },
                ].map((c) => {
                  const isSel = channel === c.id;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChannel(c.id as NotificationChannel)}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        isSel
                          ? 'bg-[var(--accent-gold)] text-white border-[var(--accent-gold)] shadow-sm'
                          : 'bg-[var(--background)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-gold)]/40'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Recipient Phone (with country code)
                </label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                />
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Milestone Template
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map((tmpl) => {
                  const isSel = selectedTemplateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl.id)}
                      className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                        isSel
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/5 shadow-sm'
                          : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {tmpl.name}
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-[var(--panel)] text-[var(--text-secondary)] border border-[var(--border)]">
                          {tmpl.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                        {tmpl.subject}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable Message Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Message Content (Live Dynamic Injection)
                </label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-[var(--accent-gold)] hover:underline font-semibold"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Text'}
                </button>
              </div>
              <textarea
                rows={6}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full p-3 text-xs font-sans rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] resize-none"
              />
            </div>
          </div>

          {/* Right Column: Live Smartphone Preview (5 Cols) */}
          <div className="lg:col-span-5 p-6 bg-[var(--background)] flex flex-col items-center justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[var(--accent-gold)]" />
              Live Device Preview
            </span>

            {/* Smartphone Mockup */}
            <div className="relative w-[280px] h-[460px] rounded-[36px] bg-[#111] p-3 shadow-2xl border-4 border-neutral-800 flex flex-col">
              {/* Dynamic Island / Notch */}
              <div className="w-20 h-4 bg-neutral-900 rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-neutral-700 mr-2" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-900" />
              </div>

              {/* Chat App Header */}
              <div className="px-3 py-2 bg-[#075E54] text-white rounded-t-xl flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-gold)] flex items-center justify-center text-[10px] font-bold text-white">
                    JX
                  </div>
                  <div>
                    <p className="text-[11px] font-bold leading-none">JACXI Logistics</p>
                    <p className="text-[9px] text-emerald-200 leading-none mt-0.5">Verified Business</p>
                  </div>
                </div>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
              </div>

              {/* Chat Canvas */}
              <div className="flex-1 bg-[#E5DDD5] dark:bg-[#0B141A] p-2.5 overflow-y-auto rounded-b-xl flex flex-col justify-end space-y-2 text-neutral-900 dark:text-neutral-100">
                {/* Simulated Outgoing Message Bubble */}
                <div className="self-end max-w-[92%] bg-[#DCF8C6] dark:bg-[#005C4B] p-2.5 rounded-2xl rounded-tr-xs shadow-sm border border-black/5 dark:border-white/5">
                  <p className="text-[11px] font-sans whitespace-pre-wrap leading-relaxed">
                    {messageBody}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[8px] text-neutral-500 dark:text-neutral-400">Just now</span>
                    <span className="text-[9px] text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border)] bg-[var(--background)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--panel)] transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Text
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={handleSend}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-[var(--accent-gold)] text-white hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Sending...' : `Dispatch ${channel.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
