export class SwapParseError extends Error {
  code: keyof typeof ErrorCodes;

  constructor(message: string, code: keyof typeof ErrorCodes) {
    super(message);
    this.code = code;
    this.name = 'SwapParseError';
  }
}

export const ErrorCodes = {
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  INVALID_INSTRUCTION: 'INVALID_INSTRUCTION',
  UNKNOWN_AMM: 'UNKNOWN_AMM',
  PARSE_ERROR: 'PARSE_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INVALID_TOKEN_ACCOUNT: 'INVALID_TOKEN_ACCOUNT',
} as const;

export const ErrorMessages = {
  [ErrorCodes.TRANSACTION_NOT_FOUND]: '交易未找到，可能是签名无效或交易已过期',
  [ErrorCodes.INVALID_INSTRUCTION]: '无效的交易指令',
  [ErrorCodes.UNKNOWN_AMM]: '未知的 AMM 类型',
  [ErrorCodes.PARSE_ERROR]: '解析交易数据时出错',
  [ErrorCodes.RATE_LIMIT]: '请求频率超限',
  [ErrorCodes.INVALID_SIGNATURE]: '无效的交易签名格式',
  [ErrorCodes.INVALID_TOKEN_ACCOUNT]: '无法获取代币账户信息',
} as const;
