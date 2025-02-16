import { ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import { SwapInfo } from '../types';

export interface AmmParser {
  parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo>;

  canParse(programId: string): boolean;
}

// 用于处理交易中的账户
export interface TransactionAccounts {
  accounts: string[];
  writable: string[];
  readonly: string[];
}

// 获取完整的交易账户列表（包括地址表查找）
export function getTransactionAccounts(
  transaction: ParsedTransactionWithMeta
): TransactionAccounts {
  // 处理主账户列表
  const accounts = transaction.transaction.message.accountKeys.map((key) => {
    if (typeof key === 'string') return key;
    if (key.pubkey) return key.pubkey.toString();
    return key.toString();
  });

  // 处理已加载的地址
  const writableAddresses = transaction.meta?.loadedAddresses?.writable || [];
  const readonlyAddresses = transaction.meta?.loadedAddresses?.readonly || [];

  // 添加已加载的地址到主账户列表
  accounts.push(
    ...writableAddresses.map((addr) => (addr instanceof PublicKey ? addr.toString() : addr)),
    ...readonlyAddresses.map((addr) => (addr instanceof PublicKey ? addr.toString() : addr))
  );

  return {
    accounts,
    writable: writableAddresses.map((addr) => (addr instanceof PublicKey ? addr.toString() : addr)),
    readonly: readonlyAddresses.map((addr) => (addr instanceof PublicKey ? addr.toString() : addr)),
  };
}
