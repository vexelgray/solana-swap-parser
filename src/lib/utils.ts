import { BN } from 'bn.js';
export { withRetry } from './retry';

let enableDebugLogs = false;

export function setDebugLogs(enable: boolean) {
  enableDebugLogs = enable;
}

function log(message: string) {
  if (enableDebugLogs) {
    console.log(message);
  }
}

function logError(message: string) {
  console.error(message);
}

export function toUiAmount(amount: BN | bigint, decimals: number): number {
  const divisor = new BN(10).pow(new BN(decimals));
  let amountBN: BN;

  if (typeof amount === 'bigint') {
    amountBN = new BN(amount.toString());
  } else {
    amountBN = amount;
  }

  if (!BN.isBN(amountBN)) {
    logError('Invalid amount type for conversion');
    return 0;
  }

  const quotient = amountBN.div(divisor);
  const remainder = amountBN.mod(divisor);

  return quotient.toNumber() + remainder.toNumber() / Math.pow(10, decimals);
}

export function fromUiAmount(amount: number, decimals: number): BN {
  return new BN(Math.floor(amount * Math.pow(10, decimals)));
}

export function sleep(ms: number): Promise<void> {
  log(`Sleeping for ${ms}ms`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseTokenAccount(accountInfo: any): string {
  try {
    if (accountInfo?.parsed?.info?.mint) {
      return accountInfo.parsed.info.mint;
    }
  } catch (e) {
    logError(`Error parsing token account: ${e}`);
  }
  return '';
}

export function parseU64(buffer: Buffer, offset: number = 0): BN {
  const bn = new BN(buffer.slice(offset, offset + 8), undefined, 'le');
  log(`Parsed U64: ${bn.toString()}`);
  return bn;
}

export function parseU128(buffer: Buffer, offset: number = 0): BN {
  return new BN(buffer.slice(offset, offset + 16), undefined, 'le');
}

export function parseU8(buffer: Buffer, offset: number = 0): number {
  return buffer.readUInt8(offset);
}

export function bnToBigInt(bn: BN): bigint {
  return BigInt(bn.toString());
}
