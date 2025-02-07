# Solana Swap 解析器

一个专门用于解析 Solana DEX swap 交易结果的 TypeScript 库。该解析器可以从各种 Solana DEX 交易中提取详细的 swap 信息，专注于实际的交易结果和代币转账数据。

## 主要特点

- **专注于 Swap 结果**: 专门用于提取实际的 swap 结果和代币转账数据
- **自动 DEX 检测**: 无需指定 DEX 类型 - 自动从交易中识别 DEX
- **多 DEX 支持**: 以统一格式解析所有主要 Solana DEX 的 swap 结果
- **全面的数据**: 提取详细的 swap 信息，包括：
  - 精确的输入/输出代币数量
  - 代币小数位数和地址
  - 价格影响和滑点
  - 交易时间戳和签名者
- **错误处理**: 强大的错误处理机制和详细的错误信息
- **频率限制保护**: 内置 RPC 频率限制保护和自动重试机制
- **可配置日志**: 全面的调试日志系统，支持精细控制

## 支持的 DEX

解析器可以自动检测和处理以下 DEX 的 swap 交易：
- Raydium (AMM v3 & 集中流动性)
- Orca
- Jupiter
- Meteora
- Pumpfun
- Moonshot

## 安装

```bash
npm install solana-swap-parser
# 或
yarn add solana-swap-parser
```

## 使用方法

### 基本用法

```typescript
import { Connection } from '@solana/web3.js';
import { TransactionParser } from 'solana-swap-parser';
import { SwapState } from 'solana-swap-parser';
import { setDebugLogs } from 'solana-swap-parser';

// 初始化连接
const connection = new Connection('https://api.mainnet-beta.solana.com');

// 生产模式（无调试日志）
const parser = new TransactionParser(connection);

// 开发模式（启用调试日志）
const debugParser = new TransactionParser(connection, true); // enableDebugLogs 参数控制调试日志

// 解析 swap 交易
const result = await parser.parseTransaction('交易签名');

if (result.success) {
  console.log('Swap 结果:', result.data);
  // {
  //   Signers: string[],      // 交易签名者
  //   Signatures: string[],   // 交易签名
  //   AMMs: string[],        // 使用的 DEX 名称
  //   Timestamp: string,     // 交易时间戳
  //   TokenInMint: string,   // 输入代币铸币地址
  //   TokenInAmount: string, // 输入数量
  //   TokenInDecimals: number,
  //   TokenOutMint: string,  // 输出代币铸币地址
  //   TokenOutAmount: string,// 输出数量
  //   TokenOutDecimals: number
  // }
} else {
  console.error('错误:', result.error);
}
```

### 日志控制

该库为不同组件提供精细的调试日志控制：

```typescript
// 1. 解析器日志
const parser = new TransactionParser(connection, true); // 启用解析器日志

// 2. 代币状态日志
SwapState.setDebugLogs(true);  // 启用代币状态日志

// 3. 工具函数日志
setDebugLogs(true);  // 启用工具函数日志

// 4. 重试机制日志
const result = await withRetry(
  () => someOperation(),
  { 
    enableDebugLogs: true,
    maxAttempts: 3 
  }
);
```

#### 日志类别

启用调试日志时，您将看到以下信息：

- 交易处理
  - 交易签名验证
  - 指令解析
  - AMM 检测
  - Swap 数据提取

- 代币操作
  - 代币账户查询
  - 代币铸币信息获取
  - 余额计算

- 重试机制
  - 尝试次数
  - 延迟时间
  - 频率限制处理

- 工具操作
  - 数字解析
  - 金额转换
  - 休眠时间

### 生产环境使用

对于生产环境，建议禁用所有调试日志：

```typescript
const parser = new TransactionParser(connection, false);
SwapState.setDebugLogs(false);
setDebugLogs(false);
```

### 错误代码

解析器可能返回以下错误代码：

- `TRANSACTION_NOT_FOUND`: 交易签名无效或交易已过期
- `INVALID_SIGNATURE`: 无效的交易签名格式
- `UNKNOWN_AMM`: 不支持的 DEX 协议
- `PARSE_ERROR`: 解析交易数据失败
- `RATE_LIMIT`: 超出 RPC 频率限制
- `INVALID_TOKEN_ACCOUNT`: 无法获取代币账户信息

## 为什么选择 Solana Swap Parser?

- **专注目标**: 专门设计用于解析 swap 结果，提供最相关的交易分析信息
- **简化集成**: 易于与交易机器人、分析工具或监控系统集成
- **可靠结果**: 经过数千笔真实 swap 交易的测试验证
- **性能优化**: 最小化 RPC 调用和高效的解析算法
- **持续维护**: 定期更新以支持新的 DEX 版本和功能

## 开发

```bash
# 安装依赖
yarn install

# 运行测试
yarn test

# 运行 linter
yarn lint

# 修复 lint 问题
yarn lint:fix

# 格式化代码
yarn format

# 类型检查
yarn check-types
```

## 贡献

欢迎提交 Pull Request 来改进这个项目！

## 致谢

本项目的实现参考了 [solanaswap-go](https://github.com/franco-bianco/solanaswap-go) 项目的代码，感谢他们的优秀工作！

## 支持项目

如果这个项目节省了您的时间，可以给我买一杯咖啡：

SOL 钱包地址：`DnqW4j7ZVtfqR1D3ZmNfHFatoLjYCpici1pzFaJmkmBd`

## 许可证

MIT 许可证 - 详见 LICENSE 文件 