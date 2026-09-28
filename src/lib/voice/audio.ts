const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

function clampPcm16(sample: number) {
  return Math.max(-32768, Math.min(32767, Math.trunc(sample)));
}

export function decodeMuLawSample(muLawByte: number) {
  const value = (~muLawByte) & 0xff;
  const sign = value & 0x80;
  const exponent = (value >> 4) & 0x07;
  const mantissa = value & 0x0f;
  const sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  return clampPcm16(sign ? MULAW_BIAS - sample : sample - MULAW_BIAS);
}

export function encodeMuLawSample(sample: number) {
  let pcm = clampPcm16(sample);
  const sign = pcm < 0 ? 0x80 : 0;

  if (sign) {
    pcm = -pcm;
  }

  pcm = Math.min(pcm, MULAW_CLIP) + MULAW_BIAS;

  let exponent = 7;
  for (let mask = 0x4000; (pcm & mask) === 0 && exponent > 0; mask >>= 1) {
    exponent -= 1;
  }

  const mantissa = (pcm >> (exponent + 3)) & 0x0f;
  return (~(sign | (exponent << 4) | mantissa)) & 0xff;
}

export function muLawToPcm16(input: Buffer) {
  const output = Buffer.allocUnsafe(input.length * 2);

  for (let index = 0; index < input.length; index += 1) {
    output.writeInt16LE(decodeMuLawSample(input[index]), index * 2);
  }

  return output;
}

export function pcm16ToMuLaw(input: Buffer) {
  const sampleCount = Math.floor(input.length / 2);
  const output = Buffer.allocUnsafe(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    output[index] = encodeMuLawSample(input.readInt16LE(index * 2));
  }

  return output;
}

export function resamplePcm16(input: Buffer, inputRate: number, outputRate: number) {
  if (inputRate <= 0 || outputRate <= 0) {
    throw new Error('Audio sample rates must be positive.');
  }

  if (input.length === 0 || inputRate === outputRate) {
    return Buffer.from(input);
  }

  const inputSamples = new Int16Array(input.buffer, input.byteOffset, Math.floor(input.length / 2));
  if (inputSamples.length <= 1) {
    return Buffer.from(input);
  }

  const outputSamples = Math.max(1, Math.round((inputSamples.length * outputRate) / inputRate));
  const output = Buffer.allocUnsafe(outputSamples * 2);
  const step = (inputSamples.length - 1) / Math.max(1, outputSamples - 1);

  for (let index = 0; index < outputSamples; index += 1) {
    const position = index * step;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(inputSamples.length - 1, leftIndex + 1);
    const ratio = position - leftIndex;
    const sample = inputSamples[leftIndex] + (inputSamples[rightIndex] - inputSamples[leftIndex]) * ratio;
    output.writeInt16LE(clampPcm16(sample), index * 2);
  }

  return output;
}

export function convertTwilioMulawToGeminiPcm(inputBase64: string) {
  const muLaw = Buffer.from(inputBase64, 'base64');
  const pcm8k = muLawToPcm16(muLaw);
  const pcm16k = resamplePcm16(pcm8k, 8000, 16000);
  return pcm16k.toString('base64');
}

export function convertGeminiPcmToTwilioMulaw(inputBase64: string, inputRate = 24000) {
  const pcm24k = Buffer.from(inputBase64, 'base64');
  const pcm8k = resamplePcm16(pcm24k, inputRate, 8000);
  const muLaw = pcm16ToMuLaw(pcm8k);
  return muLaw.toString('base64');
}