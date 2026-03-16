import type { EnhancementProvider, OptimizeRequest } from "./types";

export class LocalEnhancementProvider implements EnhancementProvider {
  public readonly name = "local-rule-agent";

  public isAvailable(): boolean {
    return true;
  }

  public async enhance(input: OptimizeRequest): Promise<string> {
    return input.body;
  }
}

export type LlmCall = (input: OptimizeRequest) => Promise<string>;

export class CredentialedEnhancementProvider implements EnhancementProvider {
  public readonly name = "credentialed-agent";

  public constructor(private readonly llmCall: LlmCall) {}

  public isAvailable(): boolean {
    return Boolean(process.env.PROMPTIMIZE_AI_KEY || process.env.OPENAI_API_KEY);
  }

  public async enhance(input: OptimizeRequest): Promise<string> {
    return this.llmCall(input);
  }
}

export class ProviderChain implements EnhancementProvider {
  public readonly name = "provider-chain";

  public constructor(private readonly providers: EnhancementProvider[]) {}

  public isAvailable(): boolean {
    return this.providers.some((provider) => provider.isAvailable());
  }

  public async enhance(input: OptimizeRequest): Promise<string> {
    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        continue;
      }

      return provider.enhance(input);
    }

    return input.body;
  }
}

export function buildProviderChain(aiEnabled: boolean, llmCall?: LlmCall): EnhancementProvider {
  const local = new LocalEnhancementProvider();
  if (!aiEnabled || !llmCall) {
    return local;
  }

  return new ProviderChain([new CredentialedEnhancementProvider(llmCall), local]);
}
