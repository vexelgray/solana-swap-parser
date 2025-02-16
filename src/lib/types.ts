import { PublicKey } from '@solana/web3.js';

// Token信息接口
export interface TokenInfo {
  address: string;
  decimals: number;
  chainId?: number;
  name?: string;
  symbol?: string;
  logoURI?: string;
}

// 核心接口定义，完全匹配示例数据格式
export interface SwapInfo {
  Signers: string[]; // 例如: ["4k8WHszi2uBzTiypTKUYH1hzYkUBCARPPn6ZjPNMhDoc"]
  Signatures: string[]; // 例如: ["2XYu86VrUXiwNNj8WvngcXGytrCsSrpay69Rt3XBz9YZvCQcZJLjvDfh9UWETFtFW47vi4xG2CkiarRJwSe6VekE"]
  AMMs: string[]; // 例如: ["Moonshot"]
  Timestamp: string; // 例如: "0001-01-01T00:00:00Z"
  TokenInMint: string; // 例如: "CQn88snXCipTxn6DBbwgSA7d9v1sXPmyxzCNNiVNXzFy"
  TokenInAmount: string; // 使用字符串来处理大数
  TokenInDecimals: number; // 例如: 9
  TokenOutMint: string; // 例如: "So11111111111111111111111111111111111111112"
  TokenOutAmount: string; // 使用字符串来处理大数
  TokenOutDecimals: number; // 例如: 9
}

// 解析结果接口
export interface ParseResult {
  success: boolean;
  data?: SwapInfo;
  error?: string;
}

// 内部使用的指令数据接口
export interface InstructionData {
  programId: PublicKey;
  accounts: PublicKey[];
  data: Buffer;
}

// 内部使用的AMM类型
export const AmmType = {
  RAYDIUM: 'RAYDIUM',
  ORCA: 'ORCA',
  JUPITER: 'JUPITER',
  METEORA: 'METEORA',
  PUMPFUN: 'PUMPFUN',
  MOONSHOT: 'MOONSHOT',
  RAYDIUM_CL: 'RAYDIUM_CL',
} as const;

// 从常量对象中提取值的类型
export type AmmTypeValue = (typeof AmmType)[keyof typeof AmmType];

// 程序ID映射
export const PROGRAM_IDS = {
  RAYDIUM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  ORCA: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  JUPITER: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  METEORA: 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K',
  PUMPFUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  MOONSHOT: 'MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG',
  RAYDIUM_CL: '9rpQHSyFVM1dkkHFQ2TtTzPEW7DVmEyPmN8wVniqJtuC',
} as const;

// 添加程序 ID 映射
export const PROGRAM_MAPPINGS: Record<string, string> = {
  // Raydium
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': AmmType.RAYDIUM,
  routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS: AmmType.RAYDIUM,
  CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C: AmmType.RAYDIUM,

  // Orca
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: AmmType.ORCA,
  '8i97DHS9KPnG311fSY9yin4cyk9ZzkBjLXobyEFvtfKY': AmmType.ORCA,
  '4ngnN8dA9sAf1sbz3m6qwquxbHkyzgXVpeTYcxKPtZuf': AmmType.ORCA,

  // Jupiter
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: AmmType.JUPITER,

  // Meteora
  M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K: AmmType.METEORA,
  HzwtjANeVzJPpnXTYt9MYMjVmkhTMfUyS8pJWqSRWLNr: AmmType.METEORA,

  // Pumpfun
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': AmmType.PUMPFUN,

  // Moonshot
  MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG: AmmType.MOONSHOT,
};

// 主要导出函数类型
export type ParseSwapTransaction = (signature: string) => Promise<ParseResult>;

// Raydium 指令类型
export enum RaydiumInstructionType {
  Initialize = 0,
  Swap = 1, // 看起来 swap 指令代码应该是 1 而不是 9
  DepositAll = 2,
  WithdrawAll = 3,
  // ... 其他指令
}
