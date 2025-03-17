import { IConfig, TokenInfo } from "@/interfaces";
import { PriceInfo } from "./pricer";

export abstract class PricerBase {
    readonly config: IConfig;
    readonly tokens: TokenInfo[];
    constructor(config: IConfig, tokens: TokenInfo[]) {
        this.config = config;
        this.tokens = tokens;
    }

    async getPrice(tokenSymbol: string): Promise<PriceInfo> {
        throw new Error('Method not implemented');
    }
}