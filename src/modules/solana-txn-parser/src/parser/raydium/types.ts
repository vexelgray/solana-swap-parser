import { BaseParsedAction, BaseParsedTransaction } from '../../core/base';

export interface RaydiumAction extends BaseParsedAction {}

export interface RaydiumCLMMAction extends RaydiumAction {}

export interface RaydiumCPMMAction extends RaydiumAction {}

export interface RaydiumAMMAction extends RaydiumAction {}

export interface RaydiumTransaction extends BaseParsedTransaction<RaydiumAction> {
    platform: 'raydium';
    actions: RaydiumAction[];
}
