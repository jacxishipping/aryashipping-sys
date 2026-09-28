import { NextRequest } from 'next/server';

import {
  buildVoiceLiveStreamUrl,
  buildVoiceStepUrl,
  findVoiceUserByAccessCode,
  generateVoiceAssistantReply,
  getAuthorizedTrackingSpeech,
  getRecentVoiceShipments,
  getVoiceFinanceSummary,
  getVoiceUserById,
  isGeminiLiveConfigured,
  isVoiceWebhookAuthorized,
} from '@/lib/voice/call-agent';
import { normalizeVoiceDigits } from '@/lib/voice/speech';
import { connectStream, gather, hangup, redirect, say, twimlResponse } from '@/lib/voice/twiml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type VoicePayload = {
  digits: string;
  speechResult: string;
};

function getMainMenuPrompt(name?: string | null) {
  const greeting = name ? `Welcome ${name}. ` : '';

  return `${greeting}Press 1 for shipment tracking. Press 2 for your finance summary. Press 3 for recent shipments. Press 4 for a live Gemini conversation. Press 9 to end the call.`;
}

async function readVoicePayload(request: NextRequest): Promise<VoicePayload> {
  const formValues = new Map<string, string>();

  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          formValues.set(key, value);
        }
      }
    } catch {
      // Ignore malformed or empty form bodies.
    }
  }

  return {
    digits: formValues.get('Digits') || request.nextUrl.searchParams.get('Digits') || '',
    speechResult:
      formValues.get('SpeechResult') || request.nextUrl.searchParams.get('SpeechResult') || '',
  };
}

function renderCodePrompt(request: NextRequest, message?: string) {
  const verifyUrl = buildVoiceStepUrl(request, 'verify');
  const introUrl = buildVoiceStepUrl(request, 'intro');
  const prompt =
    message ||
    'Welcome to Jacxi Shipping. Please enter or say your 8 digit access code now. If your code contains letters, use the matching phone keypad number for each letter.';

  return twimlResponse(
    gather(
      {
        action: verifyUrl,
        input: 'speech dtmf',
        method: 'POST',
        numDigits: 8,
        timeout: 8,
        speechTimeout: 'auto',
      },
      say(prompt),
    ) + redirect(introUrl),
  );
}

function renderMainMenu(request: NextRequest, userId: string, name?: string | null, preamble?: string) {
  const menuUrl = buildVoiceStepUrl(request, 'menu', { userId });
  const prompt = preamble ? `${preamble} ${getMainMenuPrompt(name)}` : getMainMenuPrompt(name);

  return twimlResponse(
    gather(
      {
        action: menuUrl,
        input: 'dtmf',
        method: 'POST',
        numDigits: 1,
        timeout: 8,
      },
      say(prompt),
    ) + redirect(menuUrl),
  );
}

function renderTrackingPrompt(request: NextRequest, userId: string, message?: string) {
  const trackingUrl = buildVoiceStepUrl(request, 'tracking', { userId });
  const prompt =
    message ||
    'Please say or enter the container number or tracking number for the shipment you want. If you use the keypad, press pound when you are done.';

  return twimlResponse(
    gather(
      {
        action: trackingUrl,
        input: 'speech dtmf',
        method: 'POST',
        timeout: 8,
        finishOnKey: '#',
        speechTimeout: 'auto',
      },
      say(prompt),
    ) + redirect(buildVoiceStepUrl(request, 'menu', { userId })),
  );
}

function renderAssistantLoop(request: NextRequest, userId: string, message?: string) {
  const assistantUrl = buildVoiceStepUrl(request, 'assistant', { userId });
  const prompt =
    message ||
    'You are now connected to the Gemini assistant. Ask a question about your shipments or finance status, or press 9 to go back to the main menu.';

  return twimlResponse(
    gather(
      {
        action: assistantUrl,
        input: 'speech dtmf',
        method: 'POST',
        timeout: 8,
        numDigits: 1,
        speechTimeout: 'auto',
      },
      say(prompt),
    ) + redirect(buildVoiceStepUrl(request, 'menu', { userId })),
  );
}

function renderAssistantStream(request: NextRequest, userId: string) {
  const streamUrl = buildVoiceLiveStreamUrl(request);

  return twimlResponse(
    say(
      'Connecting you to the live Gemini assistant now. Speak naturally after the tone. Press 9 at any time to end the live session.',
    ) +
      connectStream(streamUrl, [{ name: 'userId', value: userId }]) +
      say('The live assistant session has ended. Goodbye.') +
      hangup(),
  );
}

async function handleIntro(request: NextRequest) {
  return renderCodePrompt(request);
}

async function handleVerify(request: NextRequest) {
  const payload = await readVoicePayload(request);
  const accessCode = normalizeVoiceDigits(payload.digits || payload.speechResult);

  if (accessCode.length !== 8) {
    return renderCodePrompt(
      request,
      'That code was not valid. Please enter or say your 8 digit access code again. If your code contains letters, use the matching phone keypad number for each letter.',
    );
  }

  const user = await findVoiceUserByAccessCode(accessCode);
  if (!user) {
    return renderCodePrompt(
      request,
      'We could not find an account with that access code. Please try again.',
    );
  }

  return renderMainMenu(request, user.id, user.name, 'Your access code has been verified.');
}

async function requireVoiceUser(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId') || '';
  if (!userId) {
    return null;
  }

  return getVoiceUserById(userId);
}

async function handleMenu(request: NextRequest) {
  const user = await requireVoiceUser(request);
  if (!user) {
    return renderCodePrompt(request, 'Your session expired. Please enter your access code again.');
  }

  const payload = await readVoicePayload(request);
  const selection = normalizeVoiceDigits(payload.digits).slice(0, 1);

  if (!selection) {
    return renderMainMenu(request, user.id, user.name);
  }

  if (selection === '1') {
    return renderTrackingPrompt(request, user.id);
  }

  if (selection === '2') {
    const finance = await getVoiceFinanceSummary(user.id);
    return renderMainMenu(request, user.id, user.name, finance.speech);
  }

  if (selection === '3') {
    const shipments = await getRecentVoiceShipments(user.id);
    return renderMainMenu(request, user.id, user.name, shipments.speech);
  }

  if (selection === '4') {
    if (await isGeminiLiveConfigured()) {
      return renderAssistantStream(request, user.id);
    }

    return renderAssistantLoop(request, user.id, 'The live assistant is not configured, so I will use the standard Gemini question mode instead.');
  }

  if (selection === '9') {
    return twimlResponse(say('Thank you for calling Jacxi Shipping. Goodbye.') + hangup());
  }

  return renderMainMenu(request, user.id, user.name, 'That was not a valid menu option.');
}

async function handleTracking(request: NextRequest) {
  const user = await requireVoiceUser(request);
  if (!user) {
    return renderCodePrompt(request, 'Your session expired. Please enter your access code again.');
  }

  const payload = await readVoicePayload(request);
  const requestedNumber = payload.speechResult || payload.digits;

  if (!requestedNumber.trim()) {
    return renderTrackingPrompt(request, user.id, 'Please say or enter the shipment tracking number now.');
  }

  const trackingSpeech = await getAuthorizedTrackingSpeech(user.id, requestedNumber);
  if (!trackingSpeech) {
    return renderMainMenu(
      request,
      user.id,
      user.name,
      'We could not find that tracking number on your account.',
    );
  }

  return renderMainMenu(request, user.id, user.name, trackingSpeech);
}

async function handleAssistant(request: NextRequest) {
  const user = await requireVoiceUser(request);
  if (!user) {
    return renderCodePrompt(request, 'Your session expired. Please enter your access code again.');
  }

  const payload = await readVoicePayload(request);
  const selection = normalizeVoiceDigits(payload.digits).slice(0, 1);

  if (selection === '9') {
    return renderMainMenu(request, user.id, user.name, 'Returning to the main menu.');
  }

  const question = (payload.speechResult || payload.digits).trim();
  if (!question) {
    return renderAssistantLoop(
      request,
      user.id,
      'Please ask a question about your shipment or finance status, or press 9 for the main menu.',
    );
  }

  try {
    const reply = await generateVoiceAssistantReply(user, question);
    if (!reply) {
      return renderMainMenu(
        request,
        user.id,
        user.name,
        'The Gemini assistant is not configured yet. You can still use tracking and finance options.',
      );
    }

    return renderAssistantLoop(request, user.id, reply);
  } catch (error) {
    console.error('Voice assistant error:', error);
    return renderAssistantLoop(
      request,
      user.id,
      'The Gemini assistant is temporarily unavailable. Please try another question or press 9 for the main menu.',
    );
  }
}

async function handleVoiceRequest(request: NextRequest) {
  if (!isVoiceWebhookAuthorized(request)) {
    return twimlResponse(say('Unauthorized request.') + hangup(), { status: 401 });
  }

  const step = request.nextUrl.searchParams.get('step') || 'intro';

  if (step === 'verify') {
    return handleVerify(request);
  }

  if (step === 'menu') {
    return handleMenu(request);
  }

  if (step === 'tracking') {
    return handleTracking(request);
  }

  if (step === 'assistant') {
    return handleAssistant(request);
  }

  return handleIntro(request);
}

export async function GET(request: NextRequest) {
  return handleVoiceRequest(request);
}

export async function POST(request: NextRequest) {
  return handleVoiceRequest(request);
}