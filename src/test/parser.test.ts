import { Connection } from '@solana/web3.js';
import { TransactionParser } from '../lib/parser';
import { SwapState } from '../lib/state';
import { AmmType } from '../lib/types';
import { sleep } from '../lib/utils';

// 测试日志控制
const TEST_DEBUG = process.env.TEST_DEBUG === 'true';
const testLog = (message: string) => {
  if (TEST_DEBUG) {
    console.log(message);
  }
};

// 结果日志
const logSwapResult = (amm: string, data: any) => {
  console.log(`\n${amm} Swap Result:`);
  console.log(JSON.stringify(data, null, 2));
};

// Raydium swap 交易签名
const RAYDIUM_TEST_SIGNATURE =
  '4UCMpMpzoxDEf1xeT2dzRF8HJQpDYEpwqp5Y5pEiiWSgKKNo28nZ52WssBMG6SUZHwoWT5q4GvrVvwwNNQPfj1Ty';

// Orca swap 交易签名
const ORCA_TEST_SIGNATURE =
  '3CPVxgpHNmCGC8XnjouJYPJU8aMYoQAqDPg5ZcUDD4ZFpNE6B7RDwrosJEh5BWzxuQL3zJKmv3QmZuavCaAz4uFg'; // 需要填入一个 Orca swap 交易签名

// Jupiter swap 交易签名
const JUPITER_TEST_SIGNATURE =
  '43SjKmrivRCim9n6m86hgySQnzzs7h9GVEWm5mUfBaeHMFmNp9sYDDxXJfnZNiprmAWpxQbwamvf2vU3ByvEbSnR'; // 需要填入一个 Jupiter swap 交易签名

// Meteora swap 交易签名
const METEORA_TEST_SIGNATURE =
  '5WaGBypcFA5v21UDWdPXNcqshDpNUfQ4RzhsPhDZ4KmnefBxf19orMzMdLLgWux5js69JPFESZzRKCHg6P8AB2H'; // 需要填入一个 Meteora swap 交易签名

// Pumpfun swap 交易签名
const PUMPFUN_TEST_SIGNATURE =
  '2bz3AJVqx1LBZE1qcrqnqf8uFfwkeToufV1ZteZKXYmJEA4A89VAt5o7hJA8KgyKDGcHZLfNBpJgtT6a3UGCZn4r'; // 需要填入一个 Pumpfun swap 交易签名

// Moonshot swap 交易签名
const MOONSHOT_TEST_SIGNATURE =
  '2tgbNtb3d67hGN3NhCSPdc1CWcAxj9a4KyJX7E8PVxkxHm3m2ots5ZNS3ehBcD43WZ92q6nXT9SLj4iHL6NoNxhr'; // 需要填入一个 Moonshot swap 交易签名

describe('DEX Swap Parser', () => {
  let connection: Connection;
  let parser: TransactionParser;

  beforeAll(async () => {
    const rpcUrl = 'https://api.mainnet-beta.solana.com';
    connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000,
    });
    parser = new TransactionParser(connection, false);
    SwapState.setConnection(connection);
    SwapState.setDebugLogs(false);
  }, 120000);

  // 添加一个辅助函数来等待
  const waitBetweenTests = async () => {
    await sleep(5000); // 每个测试之间等待 5 秒
  };

  describe('Raydium Swap Parsing', () => {
    test('Should parse RAYDIUM swap', async () => {
      await waitBetweenTests();
      const result = await parser.parseTransaction(RAYDIUM_TEST_SIGNATURE);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      logSwapResult('RAYDIUM', data);

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.RAYDIUM);
    });
  });

  describe('Orca Swap Parsing', () => {
    test('Should parse ORCA swap', async () => {
      await waitBetweenTests();
      const result = await parser.parseTransaction(ORCA_TEST_SIGNATURE);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      logSwapResult('ORCA', data);

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.ORCA);
    });
  });

  describe('Jupiter Swap Parsing', () => {
    test('Should parse JUPITER swap', async () => {
      await waitBetweenTests();
      const result = await parser.parseTransaction(JUPITER_TEST_SIGNATURE);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      logSwapResult('JUPITER', data);

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.JUPITER);
    });
  });

  describe('Meteora Swap Parsing', () => {
    test('Should parse METEORA swap', async () => {
      await waitBetweenTests();
      const result = await parser.parseTransaction(METEORA_TEST_SIGNATURE);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      logSwapResult('METEORA', data);

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.METEORA);
    });
  });

  describe('Pumpfun Swap Parsing', () => {
    test('Should parse PUMPFUN swap', async () => {
      await waitBetweenTests();
      const result = await parser.parseTransaction(PUMPFUN_TEST_SIGNATURE);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      logSwapResult('PUMPFUN', data);

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.PUMPFUN);
    });
  });

  describe('Moonshot Swap Parsing', () => {
    test('Should parse MOONSHOT swap', async () => {
      await waitBetweenTests();
      const result = await parser.parseTransaction(MOONSHOT_TEST_SIGNATURE);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      logSwapResult('MOONSHOT', data);

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.MOONSHOT);
    });
  });

  // 错误处理测试
  describe('Error Handling', () => {
    test('Should handle invalid signature', async () => {
      await waitBetweenTests();
      const result = await parser.parseTransaction('invalid');
      expect(result.success).toBe(false);
      expect(result.error).toBe('无效的交易签名格式');
    });
  });

  afterAll(async () => {
    await sleep(1000);
  });
});
