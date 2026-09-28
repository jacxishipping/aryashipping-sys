import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  convertGeminiPcmToTwilioMulaw,
  convertTwilioMulawToGeminiPcm,
  decodeMuLawSample,
  encodeMuLawSample,
  pcm16ToMuLaw,
  resamplePcm16,
} from './audio.ts';

function pcmSamplesToBuffer(samples: number[]) {
  const buffer = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => {
    buffer.writeInt16LE(sample, index * 2);
  });
  return buffer;
}

describe('voice audio helpers', () => {
  it('mu-law silence round trips near zero', () => {
    const encoded = encodeMuLawSample(0);
    const decoded = decodeMuLawSample(encoded);

    assert.ok(Math.abs(decoded) < 8);
  });

  it('resamples pcm lengths between sample rates', () => {
    const input = pcmSamplesToBuffer([0, 1000, -1000, 500]);
    const upsampled = resamplePcm16(input, 8000, 16000);
    const downsampled = resamplePcm16(upsampled, 16000, 8000);

    assert.strictEqual(upsampled.length, 16);
    assert.strictEqual(downsampled.length, 8);
  });

  it('converts twilio mulaw to gemini pcm base64', () => {
    const mulaw = pcm16ToMuLaw(pcmSamplesToBuffer([0, 2000, -2000, 0]));
    const pcmBase64 = convertTwilioMulawToGeminiPcm(mulaw.toString('base64'));
    const pcm = Buffer.from(pcmBase64, 'base64');

    assert.ok(pcm.length > mulaw.length);
    assert.strictEqual(pcm.length % 2, 0);
  });

  it('converts gemini pcm to twilio mulaw base64', () => {
    const pcm24k = pcmSamplesToBuffer(Array.from({ length: 24 }, (_, index) => (index % 2 === 0 ? 1500 : -1500)));
    const mulawBase64 = convertGeminiPcmToTwilioMulaw(pcm24k.toString('base64'));
    const mulaw = Buffer.from(mulawBase64, 'base64');

    assert.ok(mulaw.length > 0);
    assert.strictEqual(mulaw.length, 8);
  });
});