import type { IncomingMessage } from 'http';

import WebSocket, { type RawData } from 'ws';

import {
  buildVoiceAssistantContext,
  getGeminiLiveRuntimeConfig,
  getVoiceUserById,
  isVoiceTokenValid,
} from './call-agent';
import { convertGeminiPcmToTwilioMulaw, convertTwilioMulawToGeminiPcm } from './audio';

type TwilioStartMessage = {
  event: 'start';
  streamSid: string;
  start: {
    streamSid: string;
    callSid: string;
    customParameters?: Record<string, string>;
  };
};

type TwilioMediaMessage = {
  event: 'media';
  streamSid: string;
  media: {
    track: 'inbound' | 'outbound';
    payload: string;
  };
};

type TwilioDtmfMessage = {
  event: 'dtmf';
  streamSid: string;
  dtmf: {
    digit: string;
  };
};

type TwilioMessage =
  | { event: 'connected' }
  | TwilioStartMessage
  | TwilioMediaMessage
  | TwilioDtmfMessage
  | { event: 'mark'; streamSid: string }
  | { event: 'stop'; streamSid: string };

function rawDataToString(data: RawData) {
  if (typeof data === 'string') {
    return data;
  }

  if (Buffer.isBuffer(data)) {
    return data.toString('utf8');
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf8');
  }

  return Buffer.from(data).toString('utf8');
}

function sendJson(socket: WebSocket, payload: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function closeSocket(socket: WebSocket | null | undefined, code = 1000, reason?: string) {
  if (!socket) {
    return;
  }

  if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
    socket.close(code, reason);
  }
}

function parseSampleRate(mimeType?: string) {
  const match = mimeType?.match(/rate=(\d+)/i);
  return match ? Number(match[1]) : 24000;
}

function buildGeminiLiveUrl(apiKey: string) {
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;
}

function buildUnauthorizedCloseReason(request: IncomingMessage) {
  const host = request.headers.host || 'localhost';
  const url = new URL(request.url || '/', `http://${host}`);
  return isVoiceTokenValid(url.searchParams.get('token')) ? null : 'Unauthorized voice live stream.';
}

export async function handleVoiceLiveSocket(twilioSocket: WebSocket, request: IncomingMessage) {
  const unauthorizedReason = buildUnauthorizedCloseReason(request);
  if (unauthorizedReason) {
    closeSocket(twilioSocket, 1008, unauthorizedReason);
    return;
  }

  const { apiKey: geminiApiKey, model: geminiModel } = await getGeminiLiveRuntimeConfig();
  if (!geminiApiKey) {
    closeSocket(twilioSocket, 1011, 'Gemini Live API key is not configured.');
    return;
  }
  let geminiSocket: WebSocket | null = null;
  let geminiReady = false;
  let streamSid = '';
  let markCounter = 0;
  let sessionClosed = false;
  const pendingAudio: string[] = [];

  const closeSession = (reason?: string) => {
    if (sessionClosed) {
      return;
    }

    sessionClosed = true;
    closeSocket(geminiSocket, 1000, reason);
    closeSocket(twilioSocket, 1000, reason);
  };

  const flushPendingAudio = () => {
    if (!geminiReady || !geminiSocket) {
      return;
    }

    while (pendingAudio.length > 0) {
      const chunk = pendingAudio.shift();
      if (!chunk) {
        continue;
      }

      sendJson(geminiSocket, {
        realtimeInput: {
          audio: {
            data: chunk,
            mimeType: 'audio/pcm;rate=16000',
          },
        },
      });
    }
  };

  const connectGemini = async (userId: string) => {
    const user = await getVoiceUserById(userId);
    if (!user) {
      closeSession('Voice user not found.');
      return;
    }

    const context = await buildVoiceAssistantContext(user);
    geminiSocket = new WebSocket(buildGeminiLiveUrl(geminiApiKey));

    geminiSocket.on('open', () => {
      sendJson(geminiSocket!, {
        setup: {
          model: `models/${geminiModel}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
          systemInstruction: {
            parts: [{ text: context.systemPrompt }],
          },
          realtimeInputConfig: {
            activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
            automaticActivityDetection: {
              startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
              endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
              silenceDurationMs: 1100,
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });
    });

    geminiSocket.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawDataToString(rawMessage)) as Record<string, unknown>;

        if ('setupComplete' in message) {
          geminiReady = true;
          flushPendingAudio();
          return;
        }

        if ('goAway' in message) {
          closeSession('Gemini live session ended.');
          return;
        }

        if (!('serverContent' in message) || !message.serverContent || typeof message.serverContent !== 'object') {
          return;
        }

        const serverContent = message.serverContent as Record<string, unknown>;
        if (serverContent.interrupted === true && streamSid) {
          sendJson(twilioSocket, {
            event: 'clear',
            streamSid,
          });
        }

        const modelTurn =
          'modelTurn' in serverContent && serverContent.modelTurn && typeof serverContent.modelTurn === 'object'
            ? (serverContent.modelTurn as Record<string, unknown>)
            : null;
        const parts = modelTurn && 'parts' in modelTurn && Array.isArray(modelTurn.parts) ? modelTurn.parts : [];

        for (const part of parts) {
          if (!part || typeof part !== 'object' || !('inlineData' in part) || !part.inlineData || typeof part.inlineData !== 'object') {
            continue;
          }

          const inlineData = part.inlineData as Record<string, unknown>;
          const data = typeof inlineData.data === 'string' ? inlineData.data : '';
          const mimeType = typeof inlineData.mimeType === 'string' ? inlineData.mimeType : '';

          if (!data || !mimeType.startsWith('audio/pcm') || !streamSid) {
            continue;
          }

          const payload = convertGeminiPcmToTwilioMulaw(data, parseSampleRate(mimeType));
          sendJson(twilioSocket, {
            event: 'media',
            streamSid,
            media: {
              payload,
            },
          });

          markCounter += 1;
          sendJson(twilioSocket, {
            event: 'mark',
            streamSid,
            mark: {
              name: `gemini-${markCounter}`,
            },
          });
        }
      } catch (error) {
        console.error('Failed to process Gemini live message:', error);
      }
    });

    geminiSocket.on('error', (error) => {
      console.error('Gemini live websocket error:', error);
      closeSession('Gemini live websocket error.');
    });

    geminiSocket.on('close', () => {
      if (!sessionClosed) {
        closeSession('Gemini live websocket closed.');
      }
    });
  };

  twilioSocket.on('message', async (rawMessage) => {
    try {
      const message = JSON.parse(rawDataToString(rawMessage)) as TwilioMessage;

      if (message.event === 'start') {
        streamSid = message.streamSid || message.start.streamSid;
        const userId = message.start.customParameters?.userId || '';

        if (!userId) {
          closeSession('Voice live stream started without a user ID.');
          return;
        }

        await connectGemini(userId);
        return;
      }

      if (message.event === 'media' && message.media.track === 'inbound') {
        const chunk = convertTwilioMulawToGeminiPcm(message.media.payload);

        if (!geminiReady || !geminiSocket) {
          if (pendingAudio.length < 24) {
            pendingAudio.push(chunk);
          }
          return;
        }

        sendJson(geminiSocket, {
          realtimeInput: {
            audio: {
              data: chunk,
              mimeType: 'audio/pcm;rate=16000',
            },
          },
        });
        return;
      }

      if (message.event === 'dtmf' && message.dtmf.digit === '9') {
        if (streamSid) {
          sendJson(twilioSocket, {
            event: 'clear',
            streamSid,
          });
        }
        closeSession('Caller ended live assistant mode.');
        return;
      }

      if (message.event === 'stop') {
        closeSession('Twilio stream stopped.');
      }
    } catch (error) {
      console.error('Failed to process Twilio media stream message:', error);
      closeSession('Malformed Twilio media stream message.');
    }
  });

  twilioSocket.on('close', () => {
    closeSession('Twilio websocket closed.');
  });

  twilioSocket.on('error', (error) => {
    console.error('Twilio live websocket error:', error);
    closeSession('Twilio websocket error.');
  });
}