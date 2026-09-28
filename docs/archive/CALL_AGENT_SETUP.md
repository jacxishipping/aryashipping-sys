# Call Agent Setup

This project includes an inbound phone call agent at `/api/voice` and a live audio bridge at `/api/voice/live`.

## What It Does

- Asks the caller for an 8-character access code.
- Verifies the code against `User.loginCode`.
- Offers menu options for:
  - shipment tracking
  - finance summary
  - recent shipments
  - live Gemini voice conversation

## Required Environment Variables

Add these to your deployment environment:

```env
VOICE_WEBHOOK_TOKEN="your-shared-webhook-token"
```

Save Gemini API keys and model settings from Dashboard > Settings > Call Agent.

`GEMINI_LIVE_API_KEY` remains optional on that page. If you leave it blank, the live bridge falls back to the saved `GEMINI_API_KEY`.

## Hosting Requirement

Live mode requires a long-running Node host that supports WebSocket upgrades.

- Supported: Docker, VM, bare-metal Node hosting, Kubernetes, Fly.io, Render background services, similar platforms.
- Not supported for live mode: Vercel serverless routing.

The included `server.ts` entrypoint runs both the Next.js app and the live voice WebSocket bridge on the same port.

## Telephony Provider Setup

The route is Twilio-compatible and expects an inbound voice webhook.

Configure your phone number to send `POST` requests to:

```text
https://your-domain/api/voice?token=your-shared-webhook-token
```

## Access Code Guidance

The existing system stores access codes in `User.loginCode` and supports letters and numbers.

- Numeric 8-character codes are best for keypad entry.
- Alphanumeric codes can still be used when the caller speaks the code.
- If you want keypad-only access, assign numeric custom codes to users.

## Menu Flow

1. Access code prompt
2. Main menu
3. Option 1: track a shipment by container or tracking number
4. Option 2: hear finance summary
5. Option 3: hear recent shipments
6. Option 4: start a live Gemini conversation over bidirectional audio streaming
7. Option 9: end call

## Gemini Assistant Behavior

The phone assistant is account-aware. It uses the caller's finance summary and recent shipment context when it answers questions.

Current implementation details:

- Twilio sends 8 kHz mu-law audio to the app over Media Streams.
- The app converts that audio and forwards it to Gemini Live over WebSockets.
- Gemini audio responses are converted back to Twilio media messages and played into the call.
- Pressing `9` during live mode ends the live assistant session.

This is a real live media-stream bridge. The route at `/api/voice` handles the IVR and hands option 4 off to `/api/voice/live` for the streaming session.