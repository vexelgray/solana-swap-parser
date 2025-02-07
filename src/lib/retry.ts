import { sleep } from './utils';

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  enableDebugLogs?: boolean;
}

const defaultOptions: RetryOptions = {
  maxAttempts: 5,
  initialDelay: 500,
  maxDelay: 10000,
  backoffFactor: 2,
  enableDebugLogs: false,
};

function log(message: string, enableDebugLogs: boolean | undefined = false) {
  if (enableDebugLogs) {
    console.log(message);
  }
}

function logError(message: string) {
  console.error(message);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const finalOptions = { ...defaultOptions, ...options };
  let lastError: Error | undefined;
  let delay = finalOptions.initialDelay;

  for (let attempt = 1; attempt <= finalOptions.maxAttempts; attempt++) {
    try {
      log(`Attempt ${attempt}/${finalOptions.maxAttempts}`, finalOptions.enableDebugLogs);
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === finalOptions.maxAttempts) {
        break;
      }

      if (error instanceof Error && error.message.includes('429')) {
        logError(`Rate limited on attempt ${attempt}. Retrying after ${delay}ms delay...`);
      }

      log(
        `Retry attempt ${attempt} failed, waiting ${delay}ms before next attempt`,
        finalOptions.enableDebugLogs
      );
      await sleep(delay);
      delay = Math.min(delay * finalOptions.backoffFactor, finalOptions.maxDelay);
    }
  }

  throw lastError;
}
