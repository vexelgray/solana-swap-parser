import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

// 系统程序ID
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// 数值常量
export const MAX_U64 = new BN('18446744073709551615');
export const MAX_U128 = new BN('340282366920938463463374607431768211455');

// 重试配置
export const DEFAULT_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

// 错误码
export const ERROR_CODES = {
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  INVALID_INSTRUCTION: 'INVALID_INSTRUCTION',
  UNKNOWN_AMM: 'UNKNOWN_AMM',
  PARSE_ERROR: 'PARSE_ERROR',
} as const;
