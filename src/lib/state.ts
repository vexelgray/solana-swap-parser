import { Connection, PublicKey } from '@solana/web3.js';
import { TokenInfo } from './types';
import { getMint } from '@solana/spl-token';

export class SwapState {
  private static tokenInfoMap: Map<string, TokenInfo> = new Map();
  private static decimalsMap: Map<string, number> = new Map();
  private static connection: Connection;

  static setConnection(connection: Connection) {
    this.connection = connection;
  }

  static async getTokenInfo(mint: string) {
    try {
      console.log('Getting token info for:', mint);
      const mintPubkey = new PublicKey(mint);
      const mintInfo = await getMint(this.connection, mintPubkey);

      return {
        address: mint,
        decimals: mintInfo.decimals,
      };
    } catch (error) {
      console.error(`Error getting token info for ${mint}:`, error);
      // 如果获取失败，返回默认值
      return {
        address: mint,
        decimals: 9, // 大多数代币使用 9 位小数
      };
    }
  }
}
