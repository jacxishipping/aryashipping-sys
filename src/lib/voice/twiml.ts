function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function attrsToString(attributes: Record<string, string | number | undefined>) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => ` ${key}="${escapeXml(String(value))}"`)
    .join('');
}

export type GatherOptions = {
  action: string;
  input?: 'dtmf' | 'speech' | 'speech dtmf';
  method?: 'GET' | 'POST';
  numDigits?: number;
  timeout?: number;
  finishOnKey?: string;
  speechTimeout?: 'auto' | number;
};

export function say(text: string, voice = 'alice') {
  return `<Say voice="${escapeXml(voice)}">${escapeXml(text)}</Say>`;
}

export function gather(options: GatherOptions, body: string) {
  return `<Gather${attrsToString(options)}>${body}</Gather>`;
}

export function redirect(url: string, method: 'GET' | 'POST' = 'POST') {
  return `<Redirect method="${escapeXml(method)}">${escapeXml(url)}</Redirect>`;
}

export function connectStream(url: string, parameters: Array<{ name: string; value: string }> = []) {
  const body = parameters
    .map(
      ({ name, value }) =>
        `<Parameter name="${escapeXml(name)}" value="${escapeXml(value)}"/>`,
    )
    .join('');

  return `<Connect><Stream url="${escapeXml(url)}">${body}</Stream></Connect>`;
}

export function hangup() {
  return '<Hangup/>';
}

export function buildTwiml(body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

export function twimlResponse(body: string, init?: ResponseInit) {
  return new Response(buildTwiml(body), {
    ...init,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      ...(init?.headers || {}),
    },
  });
}