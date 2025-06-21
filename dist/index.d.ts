import BigNumber from 'bignumber.js';
import * as starknet from 'starknet';
import { RpcProvider, BlockIdentifier, Contract, Uint256, Call, Account } from 'starknet';
import React, { ReactNode } from 'react';
import { Quote } from '@avnu/avnu-sdk';
import TelegramBot from 'node-telegram-bot-api';

declare class _Web3Number<T extends _Web3Number<T>> extends BigNumber {
    decimals: number;
    constructor(value: string | number, decimals: number);
    toWei(): string;
    multipliedBy(value: string | number | T): T;
    dividedBy(value: string | number | T): T;
    plus(value: string | number | T): T;
    minus(n: number | string | T, base?: number): T;
    protected construct(value: string | number, decimals: number): T;
    toString(): string;
    toJSON(): string;
    valueOf(): string;
    private maxToFixedDecimals;
    private getStandardString;
}

declare class Web3Number extends _Web3Number<Web3Number> {
    static fromWei(weiNumber: string | number, decimals: number): Web3Number;
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
    toString(): string;
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
    address: ContractAddr;
    decimals: number;
    logo: string;
    coingeckId?: string;
    displayDecimals: number;
}
declare enum Network {
    mainnet = "mainnet",
    sepolia = "sepolia",
    devnet = "devnet"
}
interface IConfig {
    provider: RpcProvider;
    network: Network;
    stage: "production" | "staging";
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
interface FAQ {
    question: string | React.ReactNode;
    answer: string | React.ReactNode;
}
/**
 * @property risk.riskFactor.factor - The risk factors that are considered for the strategy.
 * @property risk.riskFactor.factor - The value of the risk factor from 0 to 10, 0 being the lowest and 10 being the highest.
 */
interface IStrategyMetadata<T> {
    name: string;
    description: string | React.ReactNode;
    address: ContractAddr;
    launchBlock: number;
    type: "ERC4626" | "ERC721" | "Other";
    depositTokens: TokenInfo[];
    protocols: IProtocol[];
    auditUrl?: string;
    maxTVL: Web3Number;
    risk: {
        riskFactor: RiskFactor[];
        netRisk: number;
        notARisks: RiskType[];
    };
    apyMethodology?: string;
    additionalInfo: T;
    contractDetails: {
        address: ContractAddr;
        name: string;
        sourceCodeUrl?: string;
    }[];
    faqs: FAQ[];
    points?: {
        multiplier: number;
        logo: string;
        toolTip?: string;
    }[];
    docs?: string;
}
interface IInvestmentFlow {
    id?: string;
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
declare const getNoRiskTags: (risks: RiskFactor[]) => RiskType[];
interface HighlightLink {
    highlight: string;
    link: string;
}
declare function highlightTextWithLinks(put: string, highlights: HighlightLink[]): ReactNode;

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

declare class ERC20 {
    readonly config: IConfig;
    constructor(config: IConfig);
    contract(addr: string | ContractAddr): Contract;
    balanceOf(token: string | ContractAddr, address: string | ContractAddr, tokenDecimals: number): Promise<Web3Number>;
    allowance(token: string | ContractAddr, owner: string | ContractAddr, spender: string | ContractAddr, tokenDecimals: number): Promise<Web3Number>;
}

interface Route {
    token_from: string;
    token_to: string;
    exchange_address: string;
    percent: number;
    additional_swap_params: string[];
}
interface SwapInfo {
    token_from_address: string;
    token_from_amount: Uint256;
    token_to_address: string;
    token_to_amount: Uint256;
    token_to_min_amount: Uint256;
    beneficiary: string;
    integrator_fee_amount_bps: number;
    integrator_fee_recipient: string;
    routes: Route[];
}
declare class AvnuWrapper {
    getQuotes(fromToken: string, toToken: string, amountWei: string, taker: string, retry?: number, excludeSources?: string[]): Promise<Quote>;
    getSwapInfo(quote: Pick<Quote, 'quoteId' | 'buyTokenAddress' | 'buyAmount' | 'sellTokenAddress' | 'sellAmount'>, taker: string, integratorFeeBps: number, integratorFeeRecipient: string, minAmount?: string): Promise<SwapInfo>;
    static buildZeroSwap(tokenToSell: ContractAddr, address: string): SwapInfo;
}

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
    static getTokenInfoFromAddr(addr: ContractAddr): Promise<TokenInfo>;
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

interface SingleActionAmount {
    tokenInfo: TokenInfo;
    amount: Web3Number;
}
interface SingleTokenInfo extends SingleActionAmount {
    usdValue: number;
}
interface DualActionAmount {
    token0: SingleActionAmount;
    token1: SingleActionAmount;
}
interface DualTokenInfo {
    usdValue: number;
    token0: SingleTokenInfo;
    token1: SingleTokenInfo;
}
declare class BaseStrategy<TVLInfo, ActionInfo> {
    readonly config: IConfig;
    constructor(config: IConfig);
    getUserTVL(user: ContractAddr): Promise<TVLInfo>;
    getTVL(): Promise<TVLInfo>;
    depositCall(amountInfo: ActionInfo, receiver: ContractAddr): Promise<Call[]>;
    withdrawCall(amountInfo: ActionInfo, receiver: ContractAddr, owner: ContractAddr): Promise<Call[]>;
}

interface PoolProps {
    pool_id: ContractAddr;
    max_weight: number;
    v_token: ContractAddr;
}
interface Change {
    pool_id: ContractAddr;
    changeAmt: Web3Number;
    finalAmt: Web3Number;
    isDeposit: boolean;
}
interface VesuRebalanceSettings {
    feeBps: number;
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
declare class VesuRebalance extends BaseStrategy<SingleTokenInfo, SingleActionAmount> {
    /** Contract address of the strategy */
    readonly address: ContractAddr;
    /** Pricer instance for token price calculations */
    readonly pricer: PricerBase;
    /** Metadata containing strategy information */
    readonly metadata: IStrategyMetadata<VesuRebalanceSettings>;
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
    constructor(config: IConfig, pricer: PricerBase, metadata: IStrategyMetadata<VesuRebalanceSettings>);
    /**
     * Creates a deposit call to the strategy contract.
     * @param assets - Amount of assets to deposit
     * @param receiver - Address that will receive the strategy tokens
     * @returns Populated contract call for deposit
     */
    depositCall(amountInfo: SingleActionAmount, receiver: ContractAddr): Promise<starknet.Call[]>;
    /**
     * Creates a withdrawal call to the strategy contract.
     * @param assets - Amount of assets to withdraw
     * @param receiver - Address that will receive the withdrawn assets
     * @param owner - Address that owns the strategy tokens
     * @returns Populated contract call for withdrawal
     */
    withdrawCall(amountInfo: SingleActionAmount, receiver: ContractAddr, owner: ContractAddr): Promise<starknet.Call[]>;
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
        tokenInfo: TokenInfo;
        amount: Web3Number;
        usdValue: number;
    }>;
    /**
     * Calculates the total TVL of the strategy.
     * @returns Object containing the total amount in token units and USD value
     */
    getTVL(): Promise<{
        tokenInfo: TokenInfo;
        amount: Web3Number;
        usdValue: number;
    }>;
    static getAllPossibleVerifiedPools(asset: ContractAddr): Promise<any>;
    getPoolInfo(p: PoolProps, pools: any[], vesuPositions: any[], totalAssets: Web3Number, isErrorPositionsAPI: boolean, isErrorPoolsAPI: boolean): Promise<{
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
    getVesuPools(retry?: number): Promise<{
        pools: any[];
        isErrorPoolsAPI: boolean;
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
    netAPYGivenPools(pools: PoolInfoFull[]): Promise<number>;
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
    getRebalancedPositions(_pools?: PoolInfoFull[]): Promise<{
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
    getRebalanceCall(pools: Awaited<ReturnType<typeof this.getRebalancedPositions>>["changes"], isOverWeightAdjustment: boolean): Promise<starknet.Call | null>;
    getInvestmentFlows(pools: PoolInfoFull[]): Promise<IInvestmentFlow[]>;
    harvest(acc: Account): Promise<starknet.Call[]>;
    /**
     * Calculates the fees deducted in different vTokens based on the current and previous state.
     * @param previousTotalSupply - The total supply of the strategy token before the transaction
     * @returns {Promise<Array<{ vToken: ContractAddr, fee: Web3Number }>>} Array of fees deducted in different vTokens
     */
    getFee(allowedPools: Array<PoolInfoFull>): Promise<Array<{
        vToken: ContractAddr;
        fee: Web3Number;
    }>>;
}
/**
 * Represents the Vesu Rebalance Strategies.
 */
declare const VesuRebalanceStrategies: IStrategyMetadata<VesuRebalanceSettings>[];

interface EkuboPoolKey {
    token0: ContractAddr;
    token1: ContractAddr;
    fee: string;
    tick_spacing: string;
    extension: string;
}
interface EkuboBounds {
    lowerTick: bigint;
    upperTick: bigint;
}
/**
 * Settings for the CLVaultStrategy
 *
 * @property newBounds - The new bounds for the strategy
 * @property newBounds.lower - relative to the current tick
 * @property newBounds.upper - relative to the current tick
 */
interface CLVaultStrategySettings {
    newBounds: {
        lower: number;
        upper: number;
    } | string;
    lstContract?: ContractAddr;
    truePrice?: number;
    feeBps: number;
    rebalanceConditions: {
        minWaitHours: number;
        direction: "any" | "uponly";
        customShouldRebalance: (currentPoolPrice: number) => Promise<boolean>;
    };
}
declare class EkuboCLVault extends BaseStrategy<DualTokenInfo, DualActionAmount> {
    /** Contract address of the strategy */
    readonly address: ContractAddr;
    /** Pricer instance for token price calculations */
    readonly pricer: PricerBase;
    /** Metadata containing strategy information */
    readonly metadata: IStrategyMetadata<CLVaultStrategySettings>;
    /** Contract instance for interacting with the strategy */
    readonly contract: Contract;
    readonly BASE_WEIGHT = 10000;
    readonly ekuboPositionsContract: Contract;
    readonly ekuboMathContract: Contract;
    readonly lstContract: Contract | null;
    poolKey: EkuboPoolKey | undefined;
    readonly avnu: AvnuWrapper;
    /**
     * Creates a new VesuRebalance strategy instance.
     * @param config - Configuration object containing provider and other settings
     * @param pricer - Pricer instance for token price calculations
     * @param metadata - Strategy metadata including deposit tokens and address
     * @throws {Error} If more than one deposit token is specified
     */
    constructor(config: IConfig, pricer: PricerBase, metadata: IStrategyMetadata<CLVaultStrategySettings>);
    matchInputAmounts(amountInfo: DualActionAmount): Promise<DualActionAmount>;
    /** Returns minimum amounts give given two amounts based on what can be added for liq */
    getMinDepositAmounts(amountInfo: DualActionAmount): Promise<DualActionAmount>;
    depositCall(amountInfo: DualActionAmount, receiver: ContractAddr): Promise<Call[]>;
    tokensToShares(amountInfo: DualActionAmount): Promise<Web3Number>;
    withdrawCall(amountInfo: DualActionAmount, receiver: ContractAddr, owner: ContractAddr): Promise<Call[]>;
    rebalanceCall(newBounds: EkuboBounds, swapParams: SwapInfo): Call[];
    handleUnusedCall(swapParams: SwapInfo): Call[];
    handleFeesCall(): Call[];
    /**
     * Calculates assets before and now in a given token of TVL per share to observe growth
     * @returns {Promise<number>} The weighted average APY across all pools
     */
    netAPY(blockIdentifier?: BlockIdentifier, sinceBlocks?: number): Promise<number>;
    getHarvestRewardShares(fromBlock: number, toBlock: number): Promise<Web3Number>;
    balanceOf(user: ContractAddr, blockIdentifier?: BlockIdentifier): Promise<Web3Number>;
    getUserTVL(user: ContractAddr, blockIdentifier?: BlockIdentifier): Promise<DualTokenInfo>;
    _getTVL(blockIdentifier?: BlockIdentifier): Promise<{
        amount0: Web3Number;
        amount1: Web3Number;
    }>;
    totalSupply(blockIdentifier?: BlockIdentifier): Promise<Web3Number>;
    assertValidDepositTokens(poolKey: EkuboPoolKey): void;
    getTVL(blockIdentifier?: BlockIdentifier): Promise<DualTokenInfo>;
    getUncollectedFees(): Promise<DualTokenInfo>;
    getCurrentNFTID(): Promise<number>;
    truePrice(): Promise<number>;
    getCurrentPrice(blockIdentifier?: BlockIdentifier): Promise<{
        price: number;
        tick: number;
        sqrtRatio: any;
    }>;
    private _getCurrentPrice;
    getCurrentBounds(blockIdentifier?: BlockIdentifier): Promise<EkuboBounds>;
    static div2Power128(num: BigInt): number;
    static priceToTick(price: number, isRoundDown: boolean, tickSpacing: number): {
        mag: number;
        sign: number;
    };
    getPoolKey(blockIdentifier?: BlockIdentifier): Promise<EkuboPoolKey>;
    getNewBounds(): Promise<EkuboBounds>;
    /**
     * Computes the expected amounts to fully utilize amount in
     * to add liquidity to the pool
     * @param amount0: amount of token0
     * @param amount1: amount of token1
     * @returns {amount0, amount1}
     */
    private _getExpectedAmountsForLiquidity;
    private _solveExpectedAmountsEq;
    unusedBalances(_poolKey?: EkuboPoolKey): Promise<{
        token0: {
            amount: Web3Number;
            tokenInfo: TokenInfo;
            usdValue: number;
        };
        token1: {
            amount: Web3Number;
            tokenInfo: TokenInfo;
            usdValue: number;
        };
    }>;
    getSwapInfoToHandleUnused(considerRebalance?: boolean, newBounds?: EkuboBounds | null): Promise<SwapInfo>;
    getSwapInfoGivenAmounts(poolKey: EkuboPoolKey, token0Bal: Web3Number, token1Bal: Web3Number, bounds: EkuboBounds): Promise<SwapInfo>;
    /**
     * Attempts to rebalance the vault by iteratively adjusting swap amounts if initial attempt fails.
     * Uses binary search approach to find optimal swap amount.
     *
     * @param newBounds - The new tick bounds to rebalance to
     * @param swapInfo - Initial swap parameters for rebalancing
     * @param acc - Account to estimate gas fees with
     * @param retry - Current retry attempt number (default 0)
     * @param adjustmentFactor - Percentage to adjust swap amount by (default 1)
     * @param isToken0Deficit - Whether token0 balance needs increasing (default true)
     * @returns Array of contract calls needed for rebalancing
     * @throws Error if max retries reached without successful rebalance
     */
    rebalanceIter(swapInfo: SwapInfo, acc: Account, estimateCall: (swapInfo: SwapInfo) => Promise<Call[]>, isSellTokenToken0?: boolean, retry?: number, lowerLimit?: bigint, upperLimit?: bigint): Promise<Call[]>;
    static tickToi129(tick: number): {
        mag: number;
        sign: number;
    };
    static priceToSqrtRatio(price: number): bigint;
    static i129ToNumber(i129: {
        mag: bigint;
        sign: 0 | 1 | "true" | "false";
    }): bigint;
    static tickToPrice(tick: bigint): number;
    getLiquidityToAmounts(liquidity: Web3Number, bounds: EkuboBounds, blockIdentifier?: BlockIdentifier, _poolKey?: EkuboPoolKey | null, _currentPrice?: {
        price: number;
        tick: number;
        sqrtRatio: string;
    } | null): Promise<{
        amount0: Web3Number;
        amount1: Web3Number;
    }>;
    harvest(acc: Account): Promise<Call[]>;
    getInvestmentFlows(): Promise<IInvestmentFlow[]>;
}
/**
 * Represents the Vesu Rebalance Strategies.
 */
declare const EkuboCLVaultStrategies: IStrategyMetadata<CLVaultStrategySettings>[];

declare class TelegramNotif {
    private subscribers;
    readonly bot: TelegramBot;
    constructor(token: string, shouldPoll: boolean);
    activateChatBot(): void;
    sendMessage(msg: string): void;
}

interface LeveledLogMethod {
    (message: string, ...meta: any[]): void;
    (message: any): void;
}
interface MyLogger {
    error: LeveledLogMethod;
    warn: LeveledLogMethod;
    info: LeveledLogMethod;
    verbose: LeveledLogMethod;
    debug: LeveledLogMethod;
}
declare const logger: MyLogger;

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

declare function getAPIUsingHeadlessBrowser(url: string): Promise<any>;

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

export { type AccountInfo, type AllAccountsStore, AutoCompounderSTRK, AvnuWrapper, BaseStrategy, type CLVaultStrategySettings, ContractAddr, type DualActionAmount, type DualTokenInfo, ERC20, type EkuboBounds, EkuboCLVault, EkuboCLVaultStrategies, type EkuboPoolKey, type FAQ, FatalError, FlowChartColors, Global, type IConfig, type IInvestmentFlow, ILending, type ILendingMetadata, type ILendingPosition, type IProtocol, type IStrategyMetadata, Initializable, type LendingToken, MarginType, Network, PasswordJsonCryptoUtil, Pragma, type PriceInfo, Pricer, PricerFromApi, PricerRedis, type RequiredFields, type RequiredKeys, type RequiredStoreConfig, type RiskFactor, RiskType, type Route, type SingleActionAmount, type SingleTokenInfo, Store, type StoreConfig, type SwapInfo, TelegramNotif, type TokenInfo, VesuRebalance, type VesuRebalanceSettings, VesuRebalanceStrategies, Web3Number, ZkLend, assert, getAPIUsingHeadlessBrowser, getDefaultStoreConfig, getMainnetConfig, getNoRiskTags, getRiskColor, getRiskExplaination, highlightTextWithLinks, logger };
