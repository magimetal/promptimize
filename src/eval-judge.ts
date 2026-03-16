import { analyzeMarkdownMetrics, computeClarityScore, computeRetentionScore } from "./eval-metrics";
import { buildOpenAiCompatibleHeaders, hasCredentialedAiConfig, resolveAiBaseUrl } from "./ai-config";
import { runWithTimeoutAndRetry } from "./ai-request";
import type { RubricJudge, RubricJudgeInput, RubricScore } from "./types";

interface JudgeCallResult {
  overall: number;
  clarity: number;
  structure: number;
  actionability: number;
  preservation: number;
  rationale: string;
}

type JudgeCall = (input: RubricJudgeInput) => Promise<JudgeCallResult>;

class LocalRubricJudge implements RubricJudge {
  public readonly name = "local-rubric-judge";

  public isAvailable(): boolean {
    return true;
  }

  public async score(input: RubricJudgeInput): Promise<RubricScore> {
    const metrics = analyzeMarkdownMetrics(input.candidateBody);
    const retention = computeRetentionScore(input.originalBody, input.candidateBody);
    const clarity = clampScore(computeClarityScore(metrics.avgSentenceLength));
    const structure = clampScore(
      Math.min(metrics.headingCount, 4) * 15 +
        Math.min(metrics.listItemCount, 8) * 6 +
        Math.min(metrics.codeFenceCount, 3) * 10 +
        Math.min(metrics.linkCount, 4) * 5 +
        20,
    );

    const actionabilityFloors: Record<RubricJudgeInput["classification"], number> = {
      discipline: 45,
      guidance: 35,
      collaborative: 40,
      reference: 70,
    };

    const imperativeCeiling = input.classification === "reference" ? 3 : 10;
    const imperativeWeight = input.classification === "reference" ? 4 : 6.5;
    const actionability = clampScore(
      actionabilityFloors[input.classification] + Math.min(metrics.imperativeCount, imperativeCeiling) * imperativeWeight,
    );

    const overall = clampScore(clarity * 0.25 + structure * 0.25 + actionability * 0.2 + retention * 0.3);
    return {
      provider: this.name,
      overall,
      clarity,
      structure,
      actionability,
      preservation: retention,
      rationale: `Local heuristic: clarity ${clarity}, structure ${structure}, actionability ${actionability}, preservation ${retention}.`,
    };
  }
}

class CredentialedRubricJudge implements RubricJudge {
  public readonly name = "credentialed-rubric-judge";

  public constructor(private readonly judgeCall: JudgeCall) {}

  public isAvailable(): boolean {
    return hasCredentialedAiConfig();
  }

  public async score(input: RubricJudgeInput): Promise<RubricScore> {
    const scored = await this.judgeCall(input);
    return {
      provider: this.name,
      overall: clampScore(scored.overall),
      clarity: clampScore(scored.clarity),
      structure: clampScore(scored.structure),
      actionability: clampScore(scored.actionability),
      preservation: clampScore(scored.preservation),
      rationale: scored.rationale,
    };
  }
}

class RubricJudgeChain implements RubricJudge {
  public readonly name = "rubric-judge-chain";

  public constructor(private readonly judges: RubricJudge[]) {}

  public isAvailable(): boolean {
    return this.judges.some((judge) => judge.isAvailable());
  }

  public async score(input: RubricJudgeInput): Promise<RubricScore> {
    for (const judge of this.judges) {
      if (!judge.isAvailable()) {
        continue;
      }

      try {
        return await judge.score(input);
      } catch {
        continue;
      }
    }

    const fallback = new LocalRubricJudge();
    return fallback.score(input);
  }
}

export function buildRubricJudge(aiEnabled: boolean, judgeCall?: JudgeCall): RubricJudge {
  const local = new LocalRubricJudge();
  if (!aiEnabled) {
    return local;
  }

  const credentialed = new CredentialedRubricJudge(judgeCall ?? createOpenAiJudgeCall());
  return new RubricJudgeChain([credentialed, local]);
}

export function createOpenAiJudgeCall(fetchImpl: typeof fetch = fetch): JudgeCall {
  return async (input) => {
    return runWithTimeoutAndRetry("OpenAI judge call", async (signal) => {
      const response = await fetchImpl(`${resolveAiBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: buildOpenAiCompatibleHeaders(),
        signal,
        body: JSON.stringify({
          model: process.env.PROMPTIMIZE_EVAL_MODEL || "gpt-4.1-mini",
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "You are a strict documentation evaluator. Score the candidate markdown against quality dimensions for AI execution quality. Return JSON only.",
            },
            {
              role: "user",
              content: [
                `classification: ${input.classification}`,
                "score each field 0-100:",
                "- clarity: concise, unambiguous wording",
                "- structure: scannable headings/lists",
                "- actionability: explicit directives where appropriate for class",
                "- preservation: candidate keeps critical constraints and technical details from original",
                "- overall: balanced quality score",
                "Include short rationale with concrete observations.",
                'Return JSON: {"overall":number,"clarity":number,"structure":number,"actionability":number,"preservation":number,"rationale":string}',
                "Original markdown:",
                input.originalBody,
                "Candidate markdown:",
                input.candidateBody,
              ].join("\n\n"),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI judge call failed: ${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI judge call returned empty response");
      }

      const parsed = parseJsonObject(content);
      if (!parsed) {
        throw new Error("OpenAI judge returned non-JSON content");
      }

      return {
        overall: toNumber(parsed.overall),
        clarity: toNumber(parsed.clarity),
        structure: toNumber(parsed.structure),
        actionability: toNumber(parsed.actionability),
        preservation: toNumber(parsed.preservation),
        rationale: typeof parsed.rationale === "string" ? parsed.rationale : "No rationale provided.",
      };
    });
  };
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  const direct = tryParse(trimmed);
  if (direct) {
    return direct;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (!fenced || !fenced[1]) {
    return null;
  }

  return tryParse(fenced[1]);
}

function tryParse(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function clampScore(value: number): number {
  return Number(Math.max(0, Math.min(100, value)).toFixed(2));
}
