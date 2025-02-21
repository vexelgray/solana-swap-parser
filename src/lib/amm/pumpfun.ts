import { TokenBalance } from '@solana/web3.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser } from './base';
import { PROGRAM_IDS, SwapInfo } from '../types'
import { NATIVE_MINT } from '@solana/spl-token';
import { PumpFunParser } from 'sol-parser/src';
import { TradeInfo } from 'sol-parser/src/parser/pumpfun/types';

const parser = new PumpFunParser();

export class PumpfunParser implements AmmParser {
  canParse(programId: string): boolean {
    return programId === PROGRAM_IDS.PUMPFUN;
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo>  {

    const pumpTxn = parser.parse(transaction);
    const trade = pumpTxn.actions[0].info as TradeInfo

    if (pumpTxn.actions.length === 0) {
      throw new Error('Fail to decode pumpfun transaction')
    }

    return {
      Signers: [trade.trader.toBase58()],
      Signatures: transaction.transaction.signatures,
      AMMs: [pumpTxn.platform],
      Timestamp: new Date(transaction.blockTime! * 1000).toISOString(),
      Action: trade.isBuy ? "buy" : "sell",
      TokenInMint: trade.isBuy ? trade.tokenMint.toBase58() : NATIVE_MINT.toBase58(),
      TokenInAmount: trade.isBuy ? trade.tokenAmount.toString() : trade.solAmount.toString(),
      TokenInDecimals: trade.isBuy ? 6 : 9,
      TokenOutMint: trade.isBuy ? NATIVE_MINT.toBase58() : trade.tokenMint.toBase58(),
      TokenOutAmount: trade.isBuy ? trade.solAmount.toString(): trade.tokenAmount.toString(),
      TokenOutDecimals: trade.isBuy ? 9 : 6,
      TransactionData: {
        meta: transaction.meta,
        slot: transaction.slot,
        transaction: transaction,
        version: transaction.version || 0,
        preTokenBalances: transaction.meta?.preTokenBalances as TokenBalance[],
        postTokenBalances: transaction.meta?.postTokenBalances as TokenBalance[],
        preBalances: transaction.meta?.preBalances,
        postBalances: transaction.meta?.postBalances
      }
    };
  }
}
