const DIGITALOCEAN_AI_URL = 'https://inference.do-ai.run/v1/chat/completions';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatCompletionOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function createDigitalOceanChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
) {
  const apiKey = process.env.DO_AI_API_KEY;
  const model = options.model ?? process.env.DO_AI_MODEL ?? 'openai-gpt-oss-120b';

  if (!apiKey) {
    throw new Error('DigitalOcean AI is not configured. Set DO_AI_API_KEY to enable AI features.');
  }

  const tokenLimit = options.maxTokens ?? 500;
  const tempVal = options.temperature ?? 0.3;

  const executeRequest = async (bodyPayload: Record<string, any>) => {
    const res = await fetch(DIGITALOCEAN_AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(bodyPayload),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });
    const payload = (await res.json().catch(() => null)) as ChatCompletionResponse | null;
    return { response: res, payload };
  };

  let { response, payload } = await executeRequest({
    model,
    messages,
    max_tokens: tokenLimit,
    temperature: tempVal,
  });

  if (!response.ok && response.status === 400) {
    const errMsg = (payload?.error?.message || '').toLowerCase();
    if (errMsg.includes('max_tokens') || errMsg.includes('unknown parameter')) {
      const retryRes = await executeRequest({
        model,
        messages,
        max_completion_tokens: tokenLimit,
      });
      if (retryRes.response.ok) {
        response = retryRes.response;
        payload = retryRes.payload;
      }
    }
  }

  if (!response.ok) {
    const errorMessage = payload?.error?.message ?? `DigitalOcean AI request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('DigitalOcean AI returned an empty response.');
  }

  return {
    content,
    model,
  };
}