import { runWithTimeoutAndRetry } from "./ai-request";
import type { EnhancementProvider, EnhancementResult, OptimizeRequest } from "./types";
import { buildOpenAiCompatibleHeaders, hasCredentialedAiConfig, resolveAiBaseUrl } from "./ai-config";

export class LocalEnhancementProvider implements EnhancementProvider {
  public readonly name = "local-rule-agent";

  public isAvailable(): boolean {
    return true;
  }

  public async enhance(input: OptimizeRequest): Promise<EnhancementResult> {
    return {
      body: input.body,
      attempted: [this.name],
      selected: this.name,
      fallbackUsed: false,
    };
  }
}

export type LlmCall = (input: OptimizeRequest) => Promise<string>;

export class CredentialedEnhancementProvider implements EnhancementProvider {
  public readonly name = "credentialed-agent";

  public constructor(private readonly llmCall: LlmCall) {}

  public isAvailable(): boolean {
    return hasCredentialedAiConfig();
  }

  public async enhance(input: OptimizeRequest): Promise<EnhancementResult> {
    return {
      body: await this.llmCall(input),
      attempted: [this.name],
      selected: this.name,
      fallbackUsed: false,
    };
  }
}

export class ProviderChain implements EnhancementProvider {
  public readonly name = "provider-chain";

  public constructor(private readonly providers: EnhancementProvider[]) {}

  public isAvailable(): boolean {
    return this.providers.some((provider) => provider.isAvailable());
  }

  public async enhance(input: OptimizeRequest): Promise<EnhancementResult> {
    const attempted: string[] = [];
    let fallbackFrom: string | undefined;

    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        continue;
      }

      attempted.push(provider.name);

      try {
        const result = await provider.enhance(input);
        if (fallbackFrom && result.selected !== fallbackFrom) {
          return {
            ...result,
            attempted,
            fallbackUsed: true,
            fallbackFrom,
            fallbackReason: "error",
          };
        }

        return {
          ...result,
          attempted,
        };
      } catch {
        fallbackFrom = provider.name;
        continue;
      }
    }

    return {
      body: input.body,
      attempted,
      selected: "local-rule-agent",
      fallbackUsed: Boolean(fallbackFrom),
      ...(fallbackFrom
        ? {
            fallbackFrom,
            fallbackReason: "error" as const,
          }
        : {}),
    };
  }
}

export function buildProviderChain(aiEnabled: boolean, llmCall?: LlmCall): EnhancementProvider {
  const local = new LocalEnhancementProvider();
  if (!aiEnabled) {
    return local;
  }

  const credentialedCall = llmCall ?? createOpenAiOptimizeCall();

  return new ProviderChain([new CredentialedEnhancementProvider(credentialedCall), local]);
}

interface OptimizeLlmResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export function createOpenAiOptimizeCall(fetchImpl: typeof fetch = fetch): LlmCall {
  return async (input) => {
    return runWithTimeoutAndRetry("OpenAI-compatible optimize call", async (signal) => {
      const response = await fetchImpl(`${resolveAiBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: buildOpenAiCompatibleHeaders(),
        signal,
        body: JSON.stringify({
          model: process.env.PROMPTIMIZE_MODEL || "gpt-4.1-mini",
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "You optimize Markdown instruction documents for AI execution quality and token efficiency. Return only the optimized markdown body with no explanation.",
            },
            {
              role: "user",
              content: [
                `classification: ${input.classification}`,
                "Optimize this markdown body while preserving critical technical details, examples, and constraints.",
                "Return markdown only.",
                "Source markdown:",
                input.body,
              ].join("\n\n"),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI-compatible optimize call failed: ${response.status}`);
      }

      const payload = (await response.json()) as OptimizeLlmResponse;
      const content = payload.choices?.[0]?.message?.content;
      const optimized = typeof content === "string" ? content.trim() : "";
      if (!optimized) {
        throw new Error("OpenAI-compatible optimize call returned empty response");
      }

      return optimized;
    });
  };
}
