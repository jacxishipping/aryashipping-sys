import { getEffectiveAiProviderSettings, isAiProviderConfigured } from '@/lib/ai/provider-settings';

type ChatMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: ChatMessageContent;
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
    text?: string;
  }>;
  output?: any;
  response?: string;
  text?: string;
  content?: string;
  error?: {
    message?: string;
  } | string;
  message?: string;
  detail?: string;
};

function extractAiErrorMessage(payload: any, fallbackStatus?: number): string {
  if (!payload) return fallbackStatus ? `AI provider request failed with status ${fallbackStatus}` : 'Unknown AI provider error';
  if (typeof payload === 'string') return payload;
  if (typeof payload.error === 'string') return payload.error;
  if (typeof payload.error?.message === 'string') return payload.error.message;
  if (typeof payload.message === 'string') return payload.message;
  if (typeof payload.detail === 'string') return payload.detail;
  if (Array.isArray(payload.errors) && payload.errors.length > 0) return String(payload.errors[0]);
  return fallbackStatus ? `AI provider request failed with status ${fallbackStatus}` : 'Unknown AI provider error';
}

function scanForText(obj: any, depth = 0): string | null {
  if (!obj || depth > 5) return null;
  if (typeof obj === 'string') {
    const t = obj.trim();
    if (t.length > 0 && !t.startsWith('{') && !t.startsWith('http://') && !t.startsWith('https://')) return t;
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const res = scanForText(item, depth + 1);
      if (res) return res;
    }
  } else if (typeof obj === 'object') {
    const priorityKeys = ['text', 'content', 'delta', 'value', 'output', 'message', 'data', 'response'];
    for (const k of priorityKeys) {
      if (k in obj) {
        const res = scanForText(obj[k], depth + 1);
        if (res) return res;
      }
    }
    for (const k of Object.keys(obj)) {
      if (!['id', 'model', 'created', 'usage', 'finish_reason', 'object', 'role', 'status', 'type', 'index', 'timestamp'].includes(k)) {
        const res = scanForText(obj[k], depth + 1);
        if (res) return res;
      }
    }
  }
  return null;
}

function extractAiResponseContent(payload: any): string | null {
  if (!payload) return null;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      const nested = extractAiResponseContent(parsed);
      if (nested) return nested;
    } catch {
      return trimmed;
    }
  }

  // 1. Standard OpenAI choices format
  if (payload.choices && Array.isArray(payload.choices) && payload.choices.length > 0) {
    const choice = payload.choices[0];
    if (typeof choice.message?.content === 'string' && choice.message.content.trim()) {
      return choice.message.content.trim();
    }
    if (Array.isArray(choice.message?.content)) {
      const texts = choice.message.content
        .map((part: any) => (typeof part === 'string' ? part : part?.text || part?.content || ''))
        .filter(Boolean);
      if (texts.length > 0) return texts.join('\n').trim();
    }
    if (typeof choice.text === 'string' && choice.text.trim()) {
      return choice.text.trim();
    }
    if (typeof choice.delta?.content === 'string' && choice.delta.content.trim()) {
      return choice.delta.content.trim();
    }
  }

  // 2. Meta Responses API output format
  if (payload.output) {
    if (typeof payload.output === 'string' && payload.output.trim()) {
      return payload.output.trim();
    }
    if (typeof payload.output.content === 'string' && payload.output.content.trim()) {
      return payload.output.content.trim();
    }
    if (typeof payload.output.text === 'string' && payload.output.text.trim()) {
      return payload.output.text.trim();
    }
    if (Array.isArray(payload.output)) {
      const gathered: string[] = [];
      for (const item of payload.output) {
        if (typeof item === 'string' && item.trim()) {
          gathered.push(item.trim());
        } else if (item && typeof item === 'object') {
          if (typeof item.text === 'string' && item.text.trim()) {
            gathered.push(item.text.trim());
          } else if (typeof item.content === 'string' && item.content.trim()) {
            gathered.push(item.content.trim());
          } else if (Array.isArray(item.content)) {
            for (const part of item.content) {
              if (typeof part === 'string' && part.trim()) gathered.push(part.trim());
              else if (typeof part?.text === 'string' && part.text.trim()) gathered.push(part.text.trim());
              else if (typeof part?.content === 'string' && part.content.trim()) gathered.push(part.content.trim());
            }
          }
        }
      }
      if (gathered.length > 0) return gathered.join('\n').trim();
    }
  }

  // 3. Nested response object
  if (payload.response) {
    if (typeof payload.response === 'string' && payload.response.trim()) {
      return payload.response.trim();
    }
    if (typeof payload.response === 'object') {
      const nested = extractAiResponseContent(payload.response);
      if (nested) return nested;
    }
  }

  // 4. Gemini / Vertex candidates format
  if (payload.candidates && Array.isArray(payload.candidates) && payload.candidates.length > 0) {
    const parts = payload.candidates[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const text = parts.map((p: any) => p?.text || '').filter(Boolean).join('\n').trim();
      if (text) return text;
    }
  }

  // 5. Direct fields
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  if (typeof payload.text === 'string' && payload.text.trim()) return payload.text.trim();
  if (typeof payload.content === 'string' && payload.content.trim()) return payload.content.trim();
  if (typeof payload.result === 'string' && payload.result.trim()) return payload.result.trim();
  if (typeof payload.message?.content === 'string' && payload.message.content.trim()) return payload.message.content.trim();

  // 6. Deep scan fallback
  return scanForText(payload);
}

async function parseAiResponse(response: Response): Promise<any> {
  const rawText = await response.text().catch(() => '');
  if (!rawText || !rawText.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    if (rawText.includes('data:')) {
      const lines = rawText.split('\n');
      let combinedContent = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            const delta =
              (typeof data.delta === 'string' ? data.delta : '') ||
              data.delta?.text ||
              data.delta?.content ||
              data.choices?.[0]?.delta?.content ||
              data.choices?.[0]?.message?.content ||
              data.choices?.[0]?.text ||
              data.output_text ||
              (typeof data.text === 'string' ? data.text : '') ||
              (typeof data.content === 'string' ? data.content : '') ||
              extractAiResponseContent(data) ||
              '';
            if (delta && typeof delta === 'string') {
              combinedContent += delta;
            }
          } catch {
            // continue parsing next line
          }
        }
      }
      if (combinedContent.trim()) {
        return { choices: [{ message: { content: combinedContent.trim() } }] };
      }
    }
    return { text: rawText };
  }
}

export async function isTokenRouterConfigured() {
  return isAiProviderConfigured(await getEffectiveAiProviderSettings());
}

export async function createTokenRouterChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
) {
  const settings = await getEffectiveAiProviderSettings();
  const apiKey = settings.apiKey.trim();
  const model = options.model ?? settings.model;
  const endpoint = settings.chatCompletionsUrl;
  const provider = settings.provider.trim().toLowerCase();

  if (!isAiProviderConfigured(settings)) {
    throw new Error('TokenRouter AI is not configured. Save an enabled API key and endpoint in Settings > AI.');
  }

  // Standard authorization header
  const authHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenRouter metadata
  if (provider.includes('openrouter') || endpoint.includes('openrouter.ai')) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (appUrl) {
      authHeaders['HTTP-Referer'] = appUrl;
    }
    authHeaders['X-Title'] = 'Jacxi Shipping';
  }

  const rawTokenLimit = options.maxTokens ?? settings.maxTokens;
  const tempVal = options.temperature ?? settings.temperature;
  const isReasoningModel = /^(o[134]|gpt-4\.5-preview)/i.test(model);
  const isMetaOrResponsesEndpoint =
    endpoint.includes('/responses') ||
    provider.includes('meta') ||
    model.toLowerCase().includes('muse-') ||
    model.toLowerCase().includes('spark-');

  // For Meta/Muse or reasoning endpoints, ensure sufficient tokens so reasoning tokens do not exhaust the budget
  const tokenLimit = isMetaOrResponsesEndpoint
    ? Math.max(rawTokenLimit || 4096, 4096)
    : rawTokenLimit;

  // Helper to execute request with specific body
  const executeRequest = async (bodyPayload: Record<string, any>) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream, text/plain, */*',
        ...authHeaders,
      },
      body: JSON.stringify(bodyPayload),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });

    const payload = await parseAiResponse(response);
    return { response, payload };
  };

  // 1. Initial payload build
  let bodyPayload: Record<string, any>;

  if (isMetaOrResponsesEndpoint) {
    // Meta / Responses API format (e.g. curl https://api.meta.ai/v1/responses)
    // ONLY uses `input`, never `messages`
    bodyPayload = {
      model,
      input: messages,
      stream: false,
      temperature: tempVal,
      max_output_tokens: tokenLimit,
      top_p: 1,
      reasoning: {
        effort: 'medium',
      },
    };
  } else if (isReasoningModel) {
    bodyPayload = {
      model,
      messages,
      max_completion_tokens: tokenLimit,
    };
  } else {
    bodyPayload = {
      model,
      messages,
      max_tokens: tokenLimit,
      temperature: tempVal,
    };
  }

  let { response, payload } = await executeRequest(bodyPayload);

  // 2. If 400 or 422 Bad Request due to parameter incompatibilities, retry adaptively
  if (!response.ok && (response.status === 400 || response.status === 422)) {
    const rawError = extractAiErrorMessage(payload, response.status);
    const errMsg = rawError.toLowerCase();
    
    // Case A: Upstream rejected 'messages' parameter (expects 'input')
    if (errMsg.includes('messages')) {
      const inputOnlyPayload: Record<string, any> = {
        model,
        input: messages,
        max_output_tokens: tokenLimit,
        temperature: tempVal,
        top_p: 1,
        stream: false,
      };
      const retryRes = await executeRequest(inputOnlyPayload);
      if (retryRes.response.ok) {
        response = retryRes.response;
        payload = retryRes.payload;
      } else {
        const bareInputRetry = await executeRequest({ model, input: messages });
        if (bareInputRetry.response.ok) {
          response = bareInputRetry.response;
          payload = bareInputRetry.payload;
        }
      }
    }
    // Case B: Upstream rejected 'input' parameter (expects 'messages')
    else if (errMsg.includes('input')) {
      const messagesOnlyPayload: Record<string, any> = {
        model,
        messages,
        max_tokens: tokenLimit,
        temperature: tempVal,
      };
      const retryRes = await executeRequest(messagesOnlyPayload);
      if (retryRes.response.ok) {
        response = retryRes.response;
        payload = retryRes.payload;
      } else {
        const bareMsgRetry = await executeRequest({ model, messages });
        if (bareMsgRetry.response.ok) {
          response = bareMsgRetry.response;
          payload = bareMsgRetry.payload;
        }
      }
    }
    // Case C: Upstream rejected token limit or extra fields
    else if (
      errMsg.includes('max_tokens') ||
      errMsg.includes('max_output_tokens') ||
      errMsg.includes('max_completion_tokens') ||
      errMsg.includes('unknown parameter') ||
      errMsg.includes('unrecognized') ||
      errMsg.includes('unsupported parameter') ||
      errMsg.includes('extra fields')
    ) {
      const isInput = isMetaOrResponsesEndpoint || ('input' in bodyPayload);
      const msgField = isInput ? { input: messages } : { messages };

      // Try max_output_tokens
      let retry = await executeRequest({
        model,
        ...msgField,
        max_output_tokens: tokenLimit,
        temperature: tempVal,
      });

      if (retry.response.ok) {
        response = retry.response;
        payload = retry.payload;
      } else {
        // Try max_completion_tokens
        retry = await executeRequest({
          model,
          ...msgField,
          max_completion_tokens: tokenLimit,
        });

        if (retry.response.ok) {
          response = retry.response;
          payload = retry.payload;
        } else {
          // Try max_tokens
          retry = await executeRequest({
            model,
            ...msgField,
            max_tokens: tokenLimit,
            temperature: tempVal,
          });

          if (retry.response.ok) {
            response = retry.response;
            payload = retry.payload;
          } else {
            // Try temperature only
            retry = await executeRequest({
              model,
              ...msgField,
              temperature: tempVal,
            });

            if (retry.response.ok) {
              response = retry.response;
              payload = retry.payload;
            } else {
              // Bare payload
              retry = await executeRequest({
                model,
                ...msgField,
              });
              if (retry.response.ok) {
                response = retry.response;
                payload = retry.payload;
              }
            }
          }
        }
      }
    } else if (errMsg.includes('temperature')) {
      const isInput = isMetaOrResponsesEndpoint || ('input' in bodyPayload);
      const msgField = isInput ? { input: messages } : { messages };
      const fallbackPayload: Record<string, any> = {
        model,
        ...msgField,
      };
      const retryRes = await executeRequest(fallbackPayload);
      if (retryRes.response.ok) {
        response = retryRes.response;
        payload = retryRes.payload;
      }
    }
  }

  if (!response.ok) {
    const errorMessage = extractAiErrorMessage(payload, response.status);
    if (/missing\s+authentication\s+header/i.test(errorMessage)) {
      throw new Error(
        `AI provider rejected authentication headers for ${settings.provider || 'configured provider'}. Re-save a valid API key in Settings > AI and confirm the endpoint ${endpoint} matches that key.`,
      );
    }
    throw new Error(errorMessage);
  }

  let content = extractAiResponseContent(payload);

  // 3. If response was OK (HTTP 200) but content extraction yielded empty (e.g. Meta stream-only or token exhaustion)
  if (!content) {
    // Attempt A: Try with stream: true (SSE stream parsing)
    const streamPayload = { ...bodyPayload, stream: true };
    const streamRes = await executeRequest(streamPayload);
    if (streamRes.response.ok) {
      const streamContent = extractAiResponseContent(streamRes.payload);
      if (streamContent) {
        content = streamContent;
      }
    }

    // Attempt B: Try with max_output_tokens: 32000 (if reasoning tokens consumed all output)
    if (!content) {
      const highTokenPayload = {
        ...bodyPayload,
        max_output_tokens: 32000,
        stream: true,
      };
      const highRes = await executeRequest(highTokenPayload);
      if (highRes.response.ok) {
        const highContent = extractAiResponseContent(highRes.payload);
        if (highContent) {
          content = highContent;
        }
      }
    }
  }

  if (!content) {
    if (payload?.choices?.[0]?.finish_reason === 'length' || payload?.finish_reason === 'length') {
      throw new Error('AI model exhausted token limit before producing text. Please increase maxTokens in Settings > AI.');
    }
    const rawPreview = typeof payload === 'object' ? JSON.stringify(payload) : String(payload || '');
    throw new Error(`TokenRouter AI returned an empty response. Payload preview: ${rawPreview.slice(0, 200)}`);
  }

  return {
    content,
    model,
  };
}
