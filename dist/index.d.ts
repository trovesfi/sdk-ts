import BigNumber from 'bignumber.js';
import * as starknet from 'starknet';
import { RpcProvider, BlockIdentifier, Contract, Account } from 'starknet';
import * as util from 'util';
import TelegramBot from 'node-telegram-bot-api';

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

declare enum RiskType {
    MARKET_RISK = "Market Risk",
    IMPERMANENT_LOSS = "Impermanent Loss Risk",
    LIQUIDATION_RISK = "Liquidation Risk",
    LOW_LIQUIDITY_RISK = "Low Liquidity Risk",
    SMART_CONTRACT_RISK = "Smart Contract Risk",
    ORACLE_RISK = "Oracle Risk",
    TECHNICAL_RISK = "Technical Risk",
    COUNTERPARTY_RISK = "Counterparty Risk"
}
interface RiskFactor {
    type: RiskType;
    value: number;
    weight: number;
}
interface TokenInfo {
    name: string;
    symbol: string;
    address: string;
    decimals: number;
    logo: string;
    coingeckId?: string;
}
declare enum Network {
    mainnet = "mainnet",
    sepolia = "sepolia",
    devnet = "devnet"
}
interface IConfig {
    provider: RpcProvider;
    network: Network;
    stage: 'production' | 'staging';
    heartbeatUrl?: string;
}
interface IProtocol {
    name: string;
    logo: string;
}
declare enum FlowChartColors {
    Green = "purple",
    Blue = "#35484f",
    Purple = "#6e53dc"
}
/**
 * @property risk.riskFactor.factor - The risk factors that are considered for the strategy.
 * @property risk.riskFactor.factor - The value of the risk factor from 0 to 10, 0 being the lowest and 10 being the highest.
 */
interface IStrategyMetadata {
    name: string;
    description: string;
    address: ContractAddr;
    type: 'ERC4626' | 'ERC721' | 'Other';
    depositTokens: TokenInfo[];
    protocols: IProtocol[];
    auditUrl?: string;
    maxTVL: Web3Number;
    risk: {
        riskFactor: RiskFactor[];
        netRisk: number;
    };
}
interface IInvestmentFlow {
    title: string;
    subItems: {
        key: string;
        value: string;
    }[];
    linkedFlows: IInvestmentFlow[];
    style?: any;
}
declare function getMainnetConfig(rpcUrl?: string, blockIdentifier?: BlockIdentifier): IConfig;
declare const getRiskExplaination: (riskType: RiskType) => "The risk of the market moving against the position." | "The temporary loss of value experienced by liquidity providers in AMMs when asset prices diverge compared to simply holding them." | "The risk of losing funds due to the position being liquidated." | "The risk of low liquidity in the pool, which can lead to high slippages or reduced in-abilities to quickly exit the position." | "The risk of the oracle being manipulated or incorrect." | "The risk of the smart contract being vulnerable to attacks." | "The risk of technical issues e.g. backend failure." | "The risk of the counterparty defaulting e.g. bad debt on lending platforms.";
declare const getRiskColor: (risk: RiskFactor) => "green" | "yellow" | "red";
declare const getNoRiskTags: (risks: RiskFactor[]) => string[];

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

declare abstract class PricerBase {
    readonly config: IConfig;
    readonly tokens: TokenInfo[];
    constructor(config: IConfig, tokens: TokenInfo[]);
    getPrice(tokenSymbol: string): Promise<PriceInfo>;
}

interface PriceInfo {
    price: number;
    timestamp: Date;
}
declare class Pricer extends PricerBase {
    protected prices: {
        [key: string]: PriceInfo;
    };
    private methodToUse;
    /**
     * TOKENA and TOKENB are the two token names to get price of TokenA in terms of TokenB
     */
    protected PRICE_API: string;
    protected EKUBO_API: string;
    constructor(config: IConfig, tokens: TokenInfo[]);
    isReady(): boolean;
    waitTillReady(): Promise<void>;
    start(): void;
    isStale(timestamp: Date, tokenName: string): boolean;
    assertNotStale(timestamp: Date, tokenName: string): void;
    getPrice(tokenSymbol: string): Promise<PriceInfo>;
    protected _loadPrices(onUpdate?: (tokenSymbol: string) => void): void;
    _getPrice(token: TokenInfo, defaultMethod?: string): Promise<number>;
    _getPriceCoinbase(token: TokenInfo): Promise<number>;
    _getPriceCoinMarketCap(token: TokenInfo): Promise<number>;
    _getPriceEkubo(token: TokenInfo, amountIn?: Web3Number, retry?: number): Promise<number>;
}

declare class Pragma {
    contractAddr: string;
    readonly contract: Contract;
    constructor(provider: RpcProvider);
    getPrice(tokenAddr: string): Promise<number>;
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

declare class PricerFromApi extends PricerBase {
    constructor(config: IConfig, tokens: TokenInfo[]);
    getPrice(tokenSymbol: string): Promise<PriceInfo>;
    getPriceFromMyAPI(tokenSymbol: string): Promise<{
        price: number;
        timestamp: Date;
    }>;
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
    static getDefaultTokens(): TokenInfo[];
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

interface Change {
    pool_id: ContractAddr;
    changeAmt: Web3Number;
    finalAmt: Web3Number;
    isDeposit: boolean;
}
interface PoolInfoFull {
    pool_id: ContractAddr;
    pool_name: string | undefined;
    max_weight: number;
    current_weight: number;
    v_token: ContractAddr;
    amount: Web3Number;
    usdValue: Web3Number;
    APY: {
        baseApy: number;
        defiSpringApy: number;
        netApy: number;
    };
    currentUtilization: number;
    maxUtilization: number;
}
/**
 * Represents a VesuRebalance strategy.
 * This class implements an automated rebalancing strategy for Vesu pools,
 * managing deposits and withdrawals while optimizing yield through STRK rewards.
 */
declare class VesuRebalance {
    /** Configuration object for the strategy */
    readonly config: IConfig;
    /** Contract address of the strategy */
    readonly address: ContractAddr;
    /** Pricer instance for token price calculations */
    readonly pricer: PricerBase;
    /** Metadata containing strategy information */
    readonly metadata: IStrategyMetadata;
    /** Contract instance for interacting with the strategy */
    readonly contract: Contract;
    readonly BASE_WEIGHT = 10000;
    /**
     * Creates a new VesuRebalance strategy instance.
     * @param config - Configuration object containing provider and other settings
     * @param pricer - Pricer instance for token price calculations
     * @param metadata - Strategy metadata including deposit tokens and address
     * @throws {Error} If more than one deposit token is specified
     */
    constructor(config: IConfig, pricer: PricerBase, metadata: IStrategyMetadata);
    /**
     * Creates a deposit call to the strategy contract.
     * @param assets - Amount of assets to deposit
     * @param receiver - Address that will receive the strategy tokens
     * @returns Populated contract call for deposit
     */
    depositCall(assets: Web3Number, receiver: ContractAddr): starknet.Call[];
    /**
     * Creates a withdrawal call to the strategy contract.
     * @param assets - Amount of assets to withdraw
     * @param receiver - Address that will receive the withdrawn assets
     * @param owner - Address that owns the strategy tokens
     * @returns Populated contract call for withdrawal
     */
    withdrawCall(assets: Web3Number, receiver: ContractAddr, owner: ContractAddr): starknet.Call[];
    /**
     * Returns the underlying asset token of the strategy.
     * @returns The deposit token supported by this strategy
     */
    asset(): TokenInfo;
    /**
     * Returns the number of decimals used by the strategy token.
     * @returns Number of decimals (same as the underlying token)
     */
    decimals(): number;
    /**
     * Calculates the Total Value Locked (TVL) for a specific user.
     * @param user - Address of the user
     * @returns Object containing the amount in token units and USD value
     */
    getUserTVL(user: ContractAddr): Promise<{
        amount: Web3Number;
        usdValue: number;
    }>;
    /**
     * Calculates the total TVL of the strategy.
     * @returns Object containing the total amount in token units and USD value
     */
    getTVL(): Promise<{
        amount: Web3Number;
        usdValue: number;
    }>;
    /**
     * Retrieves the list of allowed pools and their detailed information from multiple sources:
     * 1. Contract's allowed pools
     * 2. Vesu positions API for current positions
     * 3. Vesu pools API for APY and utilization data
     *
     * @returns {Promise<{
     *   data: Array<PoolInfoFull>,
     *   isErrorPositionsAPI: boolean
     * }>} Object containing:
     *   - data: Array of pool information including IDs, weights, amounts, APYs and utilization
     *   - isErrorPositionsAPI: Boolean indicating if there was an error fetching position data
     */
    getPools(): Promise<{
        data: {
            pool_id: ContractAddr;
            pool_name: any;
            max_weight: number;
            current_weight: number;
            v_token: ContractAddr;
            amount: Web3Number;
            usdValue: Web3Number;
            APY: {
                baseApy: number;
                defiSpringApy: number;
                netApy: number;
            };
            currentUtilization: number;
            maxUtilization: number;
        }[];
        isErrorPositionsAPI: boolean;
        isErrorPoolsAPI: boolean;
        isError: boolean;
    }>;
    /**
     * Calculates the weighted average APY across all pools based on USD value.
     * @returns {Promise<number>} The weighted average APY across all pools
     */
    netAPY(): Promise<number>;
    /**
     * Calculates the weighted average APY across all pools based on USD value.
     * @returns {Promise<number>} The weighted average APY across all pools
     */
    netAPYGivenPools(pools: PoolInfoFull[]): number;
    /**
     * Calculates optimal position changes to maximize APY while respecting max weights.
     * The algorithm:
     * 1. Sorts pools by APY (highest first)
     * 2. Calculates target amounts based on max weights
     * 3. For each pool that needs more funds:
     *    - Takes funds from lowest APY pools that are over their target
     * 4. Validates that total assets remain constant
     *
     * @returns {Promise<{
     *   changes: Change[],
     *   finalPools: PoolInfoFull[],
     *   isAnyPoolOverMaxWeight: boolean
     * }>} Object containing:
     *   - changes: Array of position changes
     *   - finalPools: Array of pool information after rebalance
     * @throws Error if rebalance is not possible while maintaining constraints
     */
    getRebalancedPositions(): Promise<{
        changes: never[];
        finalPools: never[];
        isAnyPoolOverMaxWeight?: undefined;
    } | {
        changes: Change[];
        finalPools: PoolInfoFull[];
        isAnyPoolOverMaxWeight: boolean;
    }>;
    /**
     * Creates a rebalance Call object for the strategy contract
     * @param pools - Array of pool information including IDs, weights, amounts, APYs and utilization
     * @returns Populated contract call for rebalance
     */
    getRebalanceCall(pools: Awaited<ReturnType<typeof this.getRebalancedPositions>>['changes'], isOverWeightAdjustment: boolean): Promise<starknet.Call | null>;
    getInvestmentFlows(pools: PoolInfoFull[]): Promise<IInvestmentFlow[]>;
}
/**
 * Represents the Vesu Rebalance Strategies.
 */
declare const VesuRebalanceStrategies: IStrategyMetadata[];

declare class TelegramNotif {
    private subscribers;
    readonly bot: TelegramBot;
    constructor(token: string, shouldPoll: boolean);
    activateChatBot(): void;
    sendMessage(msg: string): void;
}

type RequiredFields<T> = {
    [K in keyof T]-?: T[K];
};
type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
declare function assert(condition: boolean, message: string): void;

declare class PricerRedis extends Pricer {
    private redisClient;
    constructor(config: IConfig, tokens: TokenInfo[]);
    /** Reads prices from Pricer._loadPrices and uses a callback to set prices in redis */
    startWithRedis(redisUrl: string): Promise<void>;
    close(): Promise<void>;
    initRedis(redisUrl: string): Promise<void>;
    /** sets current local price in redis */
    private _setRedisPrices;
    /** Returns price from redis */
    getPrice(tokenSymbol: string): Promise<PriceInfo>;
}

/**
 * @description Config to manage storage of files on disk
 * @param SECRET_FILE_FOLDER - Folder to store secret files (default: ~/.starknet-store)
 * @param NETWORK - Network to use
 */
interface StoreConfig {
    SECRET_FILE_FOLDER?: string;
    NETWORK: Network;
    ACCOUNTS_FILE_NAME?: string;
    PASSWORD: string;
}
/**
 * @description Info of a particular account
 */
interface AccountInfo {
    address: string;
    pk: string;
}
/**
 * @description map of accounts of a network
 */
interface NetworkAccounts {
    [accountKey: string]: AccountInfo;
}
/**
 * @description map of all accounts of all networks
 */
interface AllAccountsStore {
    [networkKey: string]: NetworkAccounts;
}
/**
 * @description StoreConfig with optional fields marked required
 */
type RequiredStoreConfig = Required<StoreConfig>;
/**
 * @description Get the default store config
 * @param network
 * @returns StoreConfig
 */
declare function getDefaultStoreConfig(network: Network): RequiredStoreConfig;
/**
 * @description Store class to manage accounts
 */
declare class Store {
    readonly config: IConfig;
    readonly storeConfig: RequiredStoreConfig;
    private encryptor;
    constructor(config: IConfig, storeConfig: StoreConfig);
    static logPassword(password: string): void;
    getAccount(accountKey: string, txVersion?: "0x2" | "0x3"): Account;
    addAccount(accountKey: string, address: string, pk: string): void;
    private getAccountFilePath;
    private getAllAccounts;
    /**
     * @description Load all accounts of the network
     * @returns NetworkAccounts
     */
    loadAccounts(): NetworkAccounts;
    /**
     * @description List all accountKeys of the network
     * @returns string[]
     */
    listAccounts(): string[];
    static ensureFolder(folder: string): void;
}

declare class PasswordJsonCryptoUtil {
    private readonly algorithm;
    private readonly keyLength;
    private readonly saltLength;
    private readonly ivLength;
    private readonly tagLength;
    private readonly pbkdf2Iterations;
    private deriveKey;
    encrypt(data: any, password: string): string;
    decrypt(encryptedData: string, password: string): any;
}

export { type AccountInfo, type AllAccountsStore, AutoCompounderSTRK, ContractAddr, FatalError, FlowChartColors, Global, type IConfig, type IInvestmentFlow, ILending, type ILendingMetadata, type ILendingPosition, type IProtocol, type IStrategyMetadata, Initializable, type LendingToken, MarginType, Network, PasswordJsonCryptoUtil, Pragma, type PriceInfo, Pricer, PricerFromApi, PricerRedis, type RequiredFields, type RequiredKeys, type RequiredStoreConfig, type RiskFactor, RiskType, Store, type StoreConfig, TelegramNotif, type TokenInfo, VesuRebalance, VesuRebalanceStrategies, Web3Number, ZkLend, assert, getDefaultStoreConfig, getMainnetConfig, getNoRiskTags, getRiskColor, getRiskExplaination, logger };
