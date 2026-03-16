const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_MAX_RETRIES = 2;

interface RetryPolicy {
  timeoutMs: number;
  maxRetries: number;
}

function resolveRetryPolicy(): RetryPolicy {
  return {
    timeoutMs: resolvePositiveInt(process.env.PROMPTIMIZE_AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    maxRetries: resolveNonNegativeInt(process.env.PROMPTIMIZE_AI_RETRIES, DEFAULT_MAX_RETRIES),
  };
}

export async function runWithTimeoutAndRetry<T>(
  operationName: string,
  operation: (signal: AbortSignal) => Promise<T>,
  policy = resolveRetryPolicy(),
): Promise<T> {
  const attempts = policy.maxRetries + 1;
  let lastError: unknown;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await runWithTimeout(operation, policy.timeoutMs);
    } catch (error) {
      lastError = error;
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${operationName} failed after ${attempts} attempt(s): ${reason}`);
}

async function runWithTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function resolvePositiveInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function resolveNonNegativeInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}
