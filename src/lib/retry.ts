import { sleep } from './utils';

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const defaultOptions: RetryOptions = {
  maxAttempts: 5,
  initialDelay: 500,
  maxDelay: 10000,
  backoffFactor: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const finalOptions = { ...defaultOptions, ...options };
  let lastError: Error | undefined;
  let delay = finalOptions.initialDelay;

  for (let attempt = 1; attempt <= finalOptions.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === finalOptions.maxAttempts) {
        break;
      }

      if (error instanceof Error && error.message.includes('429')) {
        console.warn(`Rate limited. Retrying after ${delay}ms delay...`);
      }

      await sleep(delay);
      delay = Math.min(delay * finalOptions.backoffFactor, finalOptions.maxDelay);
    }
  }

  throw lastError;
}
