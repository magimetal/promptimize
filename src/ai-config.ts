const DEFAULT_OPENAI_COMPAT_BASE_URL = "https://api.openai.com/v1";

export function resolveAiBaseUrl(): string {
  const configuredBaseUrl = process.env.PROMPTIMIZE_BASE_URL?.trim();
  const baseUrl = configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : DEFAULT_OPENAI_COMPAT_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

export function resolveAiApiKey(): string | null {
  const raw = process.env.PROMPTIMIZE_AI_KEY || process.env.OPENAI_API_KEY;
  const value = raw?.trim();
  return value && value.length > 0 ? value : null;
}

export function hasCredentialedAiConfig(): boolean {
  return Boolean(resolveAiApiKey() || process.env.PROMPTIMIZE_BASE_URL?.trim());
}

export function buildOpenAiCompatibleHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const apiKey = resolveAiApiKey();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}
