import { SwapInfo } from '../types';

export interface AmmParser {
  parse(signature: string): Promise<SwapInfo | null>;
  canParse(programId: string): boolean;
}
