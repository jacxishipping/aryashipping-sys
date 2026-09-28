import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildFinanceSpeech,
  buildShipmentListSpeech,
  buildTrackingSpeech,
  clipVoiceReply,
  normalizeVoiceDigits,
} from './speech.ts';
import { buildTwiml, connectStream, gather, redirect, say } from './twiml.ts';

describe('voice speech helpers', () => {
  it('normalizes digits and letters for access codes', () => {
    assert.strictEqual(normalizeVoiceDigits('ab cd-1234#'), 'ABCD1234');
  });

  it('builds finance speech with balances and counts', () => {
    const speech = buildFinanceSpeech({
      currentBalance: 2400,
      totalDue: 2400,
      totalPaid: 600,
      pendingShipments: 2,
      completedShipments: 5,
    });

    assert.match(speech, /outstanding balance is \$2,400/i);
    assert.match(speech, /pending shipments and 5 completed shipments/i);
  });

  it('builds tracking speech from the latest event', () => {
    const speech = buildTrackingSpeech({
      requestedNumber: 'TRK123',
      containerNumber: 'TRK123',
      shipmentStatus: 'IN_TRANSIT',
      currentLocation: 'Kingston',
      estimatedArrival: '2026-05-20T00:00:00.000Z',
      events: [
        {
          status: 'AT_PORT',
          location: 'Kingston',
        },
      ],
    });

    assert.match(speech, /current status is in transit/i);
    assert.match(speech, /latest event: at port in Kingston/i);
  });

  it('builds shipment summaries for up to three shipments', () => {
    const speech = buildShipmentListSpeech([
      {
        reference: 'SHP-1',
        vehicleLabel: '2017 Toyota Corolla',
        status: 'ON_HAND',
        paymentStatus: 'PENDING',
      },
    ]);

    assert.match(speech, /reference SHP-1/i);
    assert.match(speech, /payment is pending/i);
  });

  it('clips long assistant replies cleanly', () => {
    const reply = clipVoiceReply('One. Two. Three. Four. Five.', 12);
    assert.strictEqual(reply, 'One. Two.');
  });
});

describe('voice twiml helpers', () => {
  it('escapes text and attributes in twiml', () => {
    const xml = buildTwiml(
      gather(
        {
          action: 'https://example.com/voice?token=a&b=c',
          input: 'speech dtmf',
          method: 'POST',
        },
        say('Say "tracking" & enter code')
      ) + redirect('https://example.com/voice/menu')
    );

    assert.match(xml, /token=a&amp;b=c/);
    assert.match(xml, /Say &quot;tracking&quot; &amp; enter code/);
    assert.match(xml, /<Redirect method="POST">https:\/\/example.com\/voice\/menu<\/Redirect>/);
  });

  it('renders a twilio connect stream with custom parameters', () => {
    const xml = buildTwiml(
      connectStream('wss://example.com/api/voice/live?token=a&b=c', [
        { name: 'userId', value: 'user-123' },
      ])
    );

    assert.match(xml, /<Connect><Stream url="wss:\/\/example.com\/api\/voice\/live\?token=a&amp;b=c">/);
    assert.match(xml, /<Parameter name="userId" value="user-123"\/>/);
  });
});