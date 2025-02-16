import { Connection, PublicKey } from '@solana/web3.js';
import { TokenInfo } from './types';
import { getMint } from '@solana/spl-token';

export class SwapState {
  private static tokenInfoMap: Map<string, TokenInfo> = new Map();
  private static connection: Connection;
  private static enableDebugLogs: boolean = false;

  // 预设的代币小数位映射
  private static readonly KNOWN_DECIMALS: Record<string, number> = {
    So11111111111111111111111111111111111111112: 9, // SOL
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 6, // USDC
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 6, // USDT
    DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 5, // BONK
    // 可以添加更多常用代币
  };

  static setConnection(connection: Connection) {
    this.connection = connection;
  }

  static setDebugLogs(enable: boolean) {
    this.enableDebugLogs = enable;
  }

  private static log(message: string) {
    if (this.enableDebugLogs) {
      console.log(message);
    }
  }

  private static logError(message: string) {
    if (this.enableDebugLogs) {
      console.error(message);
    }
  }

  static async getTokenInfo(mint: string, transactionDecimals?: number) {
    try {
      this.log(`Getting token info for: ${mint}`);

      // 1. 如果提供了交易数据中的小数位，优先使用
      if (typeof transactionDecimals === 'number') {
        return {
          address: mint,
          decimals: transactionDecimals,
        };
      }

      // 2. 检查预设的小数位映射
      if (mint in this.KNOWN_DECIMALS) {
        return {
          address: mint,
          decimals: this.KNOWN_DECIMALS[mint],
        };
      }

      // 3. 检查缓存
      const cached = this.tokenInfoMap.get(mint);
      if (cached) {
        return cached;
      }

      // 4. 如果没有 connection，使用默认值
      if (!this.connection) {
        this.logError('Connection not set. Please call SwapState.setConnection() first');
        return {
          address: mint,
          decimals: 9,
        };
      }

      // 5. 从链上获取信息
      const mintPubkey = new PublicKey(mint);
      const mintInfo = await getMint(this.connection, mintPubkey);

      const tokenInfo = {
        address: mint,
        decimals: mintInfo.decimals,
      };

      // 缓存结果
      this.tokenInfoMap.set(mint, tokenInfo);
      return tokenInfo;
    } catch (error) {
      this.logError(`Error getting token info for ${mint}: ${error}`);
      // 如果获取失败，返回默认值
      return {
        address: mint,
        decimals: 9, // 大多数代币使用 9 位小数
      };
    }
  }
}
