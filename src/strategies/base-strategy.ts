import { ContractAddr, Web3Number } from "@/dataTypes";
import { IConfig, TokenInfo } from "@/interfaces";
import { Call } from "starknet";

export interface SingleActionAmount {
    tokenInfo: TokenInfo,
    amount: Web3Number
}

export interface SingleTokenInfo extends SingleActionAmount {
    usdValue: number
};

export interface DualActionAmount {
    token0: SingleActionAmount,
    token1: SingleActionAmount
}
export interface DualTokenInfo {
    netUsdValue: number,
    token0: SingleTokenInfo,
    token1: SingleTokenInfo
}

export class BaseStrategy<TVLInfo, ActionInfo> {
    readonly config: IConfig;

    constructor(config: IConfig) {
        this.config = config;
    }

    async getUserTVL(user: ContractAddr): Promise<TVLInfo> {
        throw new Error("Not implemented");
    }

    async getTVL(): Promise<TVLInfo> {
        throw new Error("Not implemented");
    }   

    depositCall(amountInfo: ActionInfo, receiver: ContractAddr): Call[] {
        throw new Error("Not implemented");
    }

    withdrawCall(amountInfo: ActionInfo, receiver: ContractAddr, owner: ContractAddr): Call[] {
        throw new Error("Not implemented");
    }
    
}