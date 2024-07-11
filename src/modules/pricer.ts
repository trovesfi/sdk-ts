import axios from "axios";
import { FatalError, Global, logger } from "@/global";
import { TokenInfo } from "@/interfaces/common";
import { IConfig } from "@/index";

export class Pricer {
    readonly config: IConfig;
    readonly tokens: TokenInfo[] = [];
    private prices: {
        [key: string]: {
            price: number,
            timestamp: Date
        }
    } = {}

    /**
     * TOKENA and TOKENB are the two token names to get price of TokenA in terms of TokenB
     */
    private PRICE_API = `https://api.coinbase.com/v2/prices/{{PRICER_KEY}}/buy`;

    constructor(config: IConfig, tokens: TokenInfo[]) {
        this.config = config;
        this.tokens = tokens;
        this.start();
    }

    isReady() {
        return Object.keys(this.prices).length === this.tokens.length;
    }

    waitTillReady() {
        return new Promise<void>((resolve, reject) => {
            const interval = setInterval(() => {
                logger.verbose(`Waiting for pricer to initialise`);
                if (this.isReady()) {
                    logger.verbose(`Pricer initialised`);
                    clearInterval(interval);
                    resolve();
                }
            }, 1000);
        });
    }

    start() {
        this._loadPrices();
        setInterval(() => {
            this._loadPrices();
        }, 30000);
    }

    getPrice(tokenName: string) {
        const STALE_TIME = 60000;
        Global.assert(this.prices[tokenName], `Price of ${tokenName} not found`);
        const isStale = (new Date().getTime() - this.prices[tokenName].timestamp.getTime()) > STALE_TIME;
        Global.assert(!isStale, `Price of ${tokenName} is stale`);
        return this.prices[tokenName];
    }

    private _loadPrices() {
        this.tokens.forEach(async (token) => {
            try {
                if (token.symbol === 'USDT') {
                    this.prices[token.symbol] = {
                        price: 1,
                        timestamp: new Date()
                    }
                    return;
                }
                if (!token.pricerKey) {
                    throw new FatalError(`Pricer key not found for ${token.name}`);
                }
                const url = this.PRICE_API.replace("{{PRICER_KEY}}", token.pricerKey);
                const result = await axios.get(url);
                const data: any = result.data;
                const price = Number(data.data.amount);
                this.prices[token.symbol] = {
                    price,
                    timestamp: new Date()
                }
                logger.verbose(`Fetched price of ${token.name} as ${price}`);
            } catch (error: any) {
                // return Global.fatalError(`Error fetching data from ${token.name}`, error);
                throw new FatalError(`Error fetching data from ${token.name}`, error);
            }
        })
    }
}