import axios from "axios";
import { FatalError, Global, logger } from "@/global";
import { TokenInfo } from "@/interfaces/common";
import { IConfig } from "@/interfaces/common";

export interface PriceInfo {
    price: number,
    timestamp: Date
}
export class Pricer {
    readonly config: IConfig;
    readonly tokens: TokenInfo[] = [];
    protected prices: {
        [key: string]: PriceInfo
    } = {}

    /**
     * TOKENA and TOKENB are the two token names to get price of TokenA in terms of TokenB
     */
    protected PRICE_API = `https://api.coinbase.com/v2/prices/{{PRICER_KEY}}/buy`;
    constructor(config: IConfig, tokens: TokenInfo[]) {
        this.config = config;
        this.tokens = tokens;
    }

    isReady() {
        const allPricesExist = Object.keys(this.prices).length === this.tokens.length;
        if (!allPricesExist) return false;

        let atleastOneStale = false;
        for (let token of this.tokens) {
            const priceInfo = this.prices[token.symbol];
            const isStale = this.isStale(priceInfo.timestamp, token.symbol);
            if (isStale) {
                atleastOneStale = true;
                logger.warn(`Atleast one stale: ${token.symbol}: ${JSON.stringify(this.prices[token.symbol])}`);
                break;
            }
        }
        return allPricesExist && !atleastOneStale;
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

    isStale(timestamp: Date, tokenName: string) {
        const STALE_TIME = 60000;
        return (new Date().getTime() - timestamp.getTime()) > STALE_TIME;
    }

    assertNotStale(timestamp: Date, tokenName: string) {
        Global.assert(!this.isStale(timestamp, tokenName), `Price of ${tokenName} is stale`);

    }
    async getPrice(tokenName: string) {
        Global.assert(this.prices[tokenName], `Price of ${tokenName} not found`);
       this.assertNotStale(this.prices[tokenName].timestamp, tokenName);
        return this.prices[tokenName];
    }

    protected _loadPrices(onUpdate: (tokenSymbol: string) => void = () => {}) {
        this.tokens.forEach(async (token) => {
            const MAX_RETRIES = 10;
            let retry = 0;
            while (retry < MAX_RETRIES) {
                try {
                    if (token.symbol === 'USDT') {
                        this.prices[token.symbol] = {
                            price: 1,
                            timestamp: new Date()
                        }
                        onUpdate(token.symbol);
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
                    onUpdate(token.symbol);
                    logger.verbose(`Fetched price of ${token.name} as ${price}`);
                    break;
                } catch (error: any) {
                    if (retry < MAX_RETRIES) {
                        logger.warn(`Error fetching data from ${token.name}, retry: ${retry}`);
                        logger.warn(error);
                        retry++;
                        await new Promise((resolve) => setTimeout(resolve, retry * 2000));
                    } else {
                        throw new FatalError(`Error fetching data from ${token.name}`, error);
                    }
                }
            }
        })
        console.log('checking heartbeat', this.isReady(), this.config.heartbeatUrl)
        if (this.isReady() && this.config.heartbeatUrl) {
            console.log(`sending beat`)
            axios.get(this.config.heartbeatUrl).catch(err => {
                console.error('Pricer: Heartbeat err', err);
            })
        }
    }
}