export function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed) as Record<string, unknown>;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1].trim()) as Record<string, unknown>;
  }

  const startIndex = trimmed.indexOf('{');
  const endIndex = trimmed.lastIndexOf('}');
  if (startIndex >= 0 && endIndex > startIndex) {
    return JSON.parse(trimmed.slice(startIndex, endIndex + 1)) as Record<string, unknown>;
  }

  throw new Error('No JSON object found in model response.');
}