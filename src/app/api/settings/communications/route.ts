import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import {
  getStoredCommunicationSettings,
  isEmailConfigured,
  isSmsConfigured,
  maskCommunicationSecret,
  saveStoredCommunicationSettings,
  sendConfiguredEmail,
  sendConfiguredSms,
  type CommunicationProviderSettingsValues,
} from '@/lib/communication-settings';

export const dynamic = 'force-dynamic';

const communicationSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  emailProvider: z.string().trim().min(1).max(80).optional(),
  emailApiKey: z.string().optional(),
  emailFromAddress: z.string().trim().email().optional(),
  emailReplyToAddress: z.string().trim().email().optional().or(z.literal('')),
  smsEnabled: z.boolean().optional(),
  smsProvider: z.string().trim().min(1).max(80).optional(),
  smsAccountSid: z.string().trim().optional(),
  smsAuthToken: z.string().optional(),
  smsFromNumber: z.string().trim().optional(),
  smsMessagingServiceSid: z.string().trim().optional(),
});

const testSchema = z.object({
  channel: z.enum(['email', 'sms']),
  to: z.string().trim().min(1),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') return null;
  return session;
}

function toClientSettings(settings: CommunicationProviderSettingsValues) {
  return {
    ...settings,
    emailApiKey: '',
    smsAuthToken: '',
    emailApiKeyConfigured: Boolean(settings.emailApiKey),
    smsAuthTokenConfigured: Boolean(settings.smsAuthToken),
    emailApiKeyMasked: maskCommunicationSecret(settings.emailApiKey),
    smsAuthTokenMasked: maskCommunicationSecret(settings.smsAuthToken),
    emailConfigured: isEmailConfigured(settings),
    smsConfigured: isSmsConfigured(settings),
  };
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ settings: toClientSettings(await getStoredCommunicationSettings()) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load communication settings.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const payload = communicationSettingsSchema.parse(await request.json());
    const partial = { ...payload } satisfies Partial<CommunicationProviderSettingsValues>;
    if (payload.emailApiKey === '') delete partial.emailApiKey;
    if (payload.smsAuthToken === '') delete partial.smsAuthToken;

    const settings = await saveStoredCommunicationSettings(partial);
    await createAuditLog(
      'SETTINGS',
      'communications',
      'UPDATE',
      session.user.id as string,
      {
        summary: `Updated communication settings fields: ${Object.keys(payload).join(', ')}`,
        updatedFields: Object.keys(payload).filter((key) => !['emailApiKey', 'smsAuthToken'].includes(key)),
        emailSecretUpdated: Object.prototype.hasOwnProperty.call(payload, 'emailApiKey') && Boolean(payload.emailApiKey),
        smsSecretUpdated: Object.prototype.hasOwnProperty.call(payload, 'smsAuthToken') && Boolean(payload.smsAuthToken),
      },
      request,
    );

    return NextResponse.json({ settings: toClientSettings(settings) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid communication settings.', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to save communication settings.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const payload = testSchema.parse(await request.json());
    const startedAt = Date.now();
    const result = payload.channel === 'email'
      ? await sendConfiguredEmail({
          to: payload.to,
          subject: 'Jacxi communication test',
          html: '<p>Your Jacxi email provider settings are working.</p>',
          text: 'Your Jacxi email provider settings are working.',
        })
      : await sendConfiguredSms({
          to: payload.to,
          body: 'Jacxi SMS provider settings are working.',
        });

    if (!result.success) {
      return NextResponse.json({ message: String(result.error || 'Communication test failed.') }, { status: 400 });
    }

    return NextResponse.json({ ok: true, channel: payload.channel, latencyMs: Date.now() - startedAt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid communication test request.', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Communication test failed.' },
      { status: 500 },
    );
  }
}
