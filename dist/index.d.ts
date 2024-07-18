import { RpcProvider, Contract, Account } from 'starknet';
import BigNumber from 'bignumber.js';
import * as util from 'util';
import TelegramBot from 'node-telegram-bot-api';

interface TokenInfo {
    name: string;
    symbol: string;
    address: string;
    decimals: number;
    pricerKey?: string;
}
interface IConfig {
    provider: RpcProvider;
}
declare function getMainnetConfig(rpcUrl?: string): {
    provider: RpcProvider;
};

declare class Pricer {
    readonly config: IConfig;
    readonly tokens: TokenInfo[];
    private prices;
    /**
     * TOKENA and TOKENB are the two token names to get price of TokenA in terms of TokenB
     */
    private PRICE_API;
    constructor(config: IConfig, tokens: TokenInfo[]);
    isReady(): boolean;
    waitTillReady(): Promise<void>;
    start(): void;
    getPrice(tokenName: string): {
        price: number;
        timestamp: Date;
    };
    private _loadPrices;
}

/**
 * A simple wrapper around a contract address that is universally comparable
 * - Helps avoid padding issues
 */
declare class ContractAddr {
    readonly address: string;
    constructor(address: string);
    static from(address: string): ContractAddr;
    eq(other: ContractAddr): boolean;
    eqString(other: string): boolean;
    static standardise(address: string | bigint): string;
    static eqString(a: string, b: string): boolean;
}

declare class Web3Number extends BigNumber {
    decimals: number;
    constructor(value: string | number, decimals: number);
    static fromWei(weiNumber: string | number, decimals: number): Web3Number;
    toWei(): string;
    multipliedBy(value: string | number): Web3Number;
    dividedBy(value: string | number): Web3Number;
    plus(value: string | number): Web3Number;
    minus(n: number | string, base?: number): Web3Number;
    toString(base?: number | undefined): string;
}

interface ILendingMetadata {
    name: string;
    logo: string;
}
declare enum MarginType {
    SHARED = "shared",
    NONE = "none"
}
interface ILendingPosition {
    tokenName: string;
    tokenSymbol: string;
    marginType: MarginType;
    debtAmount: Web3Number;
    debtUSD: Web3Number;
    supplyAmount: Web3Number;
    supplyUSD: Web3Number;
}
interface LendingToken extends TokenInfo {
    borrowFactor: Web3Number;
    collareralFactor: Web3Number;
}
declare abstract class ILending {
    readonly config: IConfig;
    readonly metadata: ILendingMetadata;
    readonly tokens: LendingToken[];
    protected initialised: boolean;
    constructor(config: IConfig, metadata: ILendingMetadata);
    /** Async function to init the class */
    abstract init(): Promise<void>;
    /** Wait for initialisation */
    waitForInitilisation(): Promise<void>;
    /**
     *
     * @param lending_tokens Array of tokens to consider for compute collateral value
     * @param debt_tokens Array of tokens to consider to compute debt values
     * @param user
     */
    abstract get_health_factor_tokenwise(lending_tokens: TokenInfo[], debt_tokens: TokenInfo[], user: ContractAddr): Promise<number>;
    abstract get_health_factor(user: ContractAddr): Promise<number>;
    abstract getPositionsSummary(user: ContractAddr): Promise<{
        collateralUSD: number;
        debtUSD: number;
    }>;
}

declare abstract class Initializable {
    protected initialized: boolean;
    constructor();
    abstract init(): Promise<void>;
    waitForInitilisation(): Promise<void>;
}

declare class ZkLend extends ILending implements ILending {
    readonly pricer: Pricer;
    static readonly POOLS_URL = "https://app.zklend.com/api/pools";
    private POSITION_URL;
    constructor(config: IConfig, pricer: Pricer);
    init(): Promise<void>;
    /**
     * @description Get the health factor of the user for given lending and debt tokens
     * @param lending_tokens
     * @param debt_tokens
     * @param user
     * @returns hf (e.g. returns 1.5 for 150% health factor)
     */
    get_health_factor_tokenwise(lending_tokens: TokenInfo[], debt_tokens: TokenInfo[], user: ContractAddr): Promise<number>;
    /**
     * @description Get the health factor of the user
     * - Considers all tokens for collateral and debt
     */
    get_health_factor(user: ContractAddr): Promise<number>;
    getPositionsSummary(user: ContractAddr): Promise<{
        collateralUSD: number;
        debtUSD: number;
    }>;
    /**
     * @description Get the token-wise collateral and debt positions of the user
     * @param user Contract address of the user
     * @returns Promise<ILendingPosition[]>
     */
    getPositions(user: ContractAddr): Promise<ILendingPosition[]>;
}

declare const logger: {
    verbose(message: string): void;
    assert(condition?: boolean, ...data: any[]): void;
    assert(value: any, message?: string, ...optionalParams: any[]): void;
    clear(): void;
    clear(): void;
    count(label?: string): void;
    count(label?: string): void;
    countReset(label?: string): void;
    countReset(label?: string): void;
    debug(...data: any[]): void;
    debug(message?: any, ...optionalParams: any[]): void;
    dir(item?: any, options?: any): void;
    dir(obj: any, options?: util.InspectOptions): void;
    dirxml(...data: any[]): void;
    dirxml(...data: any[]): void;
    error(...data: any[]): void;
    error(message?: any, ...optionalParams: any[]): void;
    group(...data: any[]): void;
    group(...label: any[]): void;
    groupCollapsed(...data: any[]): void;
    groupCollapsed(...label: any[]): void;
    groupEnd(): void;
    groupEnd(): void;
    info(...data: any[]): void;
    info(message?: any, ...optionalParams: any[]): void;
    log(...data: any[]): void;
    log(message?: any, ...optionalParams: any[]): void;
    table(tabularData?: any, properties?: string[]): void;
    table(tabularData: any, properties?: readonly string[]): void;
    time(label?: string): void;
    time(label?: string): void;
    timeEnd(label?: string): void;
    timeEnd(label?: string): void;
    timeLog(label?: string, ...data: any[]): void;
    timeLog(label?: string, ...data: any[]): void;
    timeStamp(label?: string): void;
    timeStamp(label?: string): void;
    trace(...data: any[]): void;
    trace(message?: any, ...optionalParams: any[]): void;
    warn(...data: any[]): void;
    warn(message?: any, ...optionalParams: any[]): void;
    Console: console.ConsoleConstructor;
    profile(label?: string): void;
    profileEnd(label?: string): void;
};
declare class FatalError extends Error {
    constructor(message: string, err?: Error);
}
/** Contains globally useful functions.
 * - fatalError: Things to do when a fatal error occurs
 */
declare class Global {
    static fatalError(message: string, err?: Error): void;
    static httpError(url: string, err: Error, message?: string): void;
    static getTokens(): Promise<TokenInfo[]>;
    static assert(condition: any, message: string): void;
}

declare class AutoCompounderSTRK {
    readonly config: IConfig;
    readonly addr: ContractAddr;
    readonly pricer: Pricer;
    private initialized;
    contract: Contract | null;
    readonly metadata: {
        decimals: number;
        underlying: {
            address: ContractAddr;
            name: string;
            symbol: string;
        };
        name: string;
    };
    constructor(config: IConfig, pricer: Pricer);
    init(): Promise<void>;
    waitForInitilisation(): Promise<void>;
    /** Returns shares of user */
    balanceOf(user: ContractAddr): Promise<Web3Number>;
    /** Returns underlying assets of user */
    balanceOfUnderlying(user: ContractAddr): Promise<Web3Number>;
    /** Returns usd value of assets */
    usdBalanceOfUnderlying(user: ContractAddr): Promise<{
        usd: Web3Number;
        assets: Web3Number;
    }>;
}

declare class TelegramNotif {
    private subscribers;
    readonly bot: TelegramBot;
    constructor(token: string, shouldPoll: boolean);
    activateChatBot(): void;
    sendMessage(msg: string): void;
}

interface StoreConfig {
    SECRET_FILE_FOLDER: string;
    NETWORK: string;
}
declare class Store {
    readonly config: IConfig;
    readonly storeConfig: StoreConfig;
    constructor(config: IConfig, storeConfig: StoreConfig);
    getAccount(): Account;
}

export { AutoCompounderSTRK, ContractAddr, FatalError, Global, type IConfig, ILending, type ILendingMetadata, type ILendingPosition, Initializable, type LendingToken, MarginType, Pricer, Store, type StoreConfig, TelegramNotif, type TokenInfo, Web3Number, ZkLend, getMainnetConfig, logger };
