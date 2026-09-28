import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  publishNotificationRefresh,
  subscribeToNotificationStream,
} from '@/lib/notification-stream';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const userId = session.user.id;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendEvent = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      };

      sendEvent('connected', { ok: true });

      const unsubscribe = subscribeToNotificationStream(userId, (payload) => {
        sendEvent('notification', payload);
      });

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 25000);

      const closeStream = () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // The stream may already be closed by the runtime.
        }
      };

      request.signal.addEventListener('abort', closeStream);

      publishNotificationRefresh(userId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}