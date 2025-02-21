import {
    ParsedTransaction,
    ParsedTransactionMeta,
    ParsedTransactionWithMeta,
} from '@solana/web3.js';
import { BaseParser } from '../../core/base';
import { RaydiumTransaction } from './types';

export class RaydiumCLMMParser implements BaseParser<RaydiumTransaction> {
    parse(transaction: ParsedTransactionWithMeta): RaydiumTransaction | null {
        return null;
    }
    parseMultiple(transactions: ParsedTransactionWithMeta[]): RaydiumTransaction[] | null {
        return null;
    }
}

export class RaydiumCPMMParser implements BaseParser<RaydiumTransaction> {
    parse(transaction: ParsedTransactionWithMeta): RaydiumTransaction | null {
        return null;
    }
    parseMultiple(transactions: ParsedTransactionWithMeta[]): RaydiumTransaction[] | null {
        return null;
    }
}
