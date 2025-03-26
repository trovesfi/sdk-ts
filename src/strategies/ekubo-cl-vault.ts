import { ContractAddr, Web3Number } from "@/dataTypes";
import { getNoRiskTags, IConfig, IProtocol, IStrategyMetadata, RiskFactor, RiskType } from "@/interfaces";
import { PricerBase } from "@/modules/pricerBase";
import { assert } from "@/utils";
import { Call, Contract, uint256 } from "starknet";
import CLVaultAbi from '@/data/cl-vault.abi.json';
import EkuboPositionsAbi from '@/data/ekubo-positions.abi.json';
import EkuboMathAbi from '@/data/ekubo-math.abi.json';
import ERC4626Abi from '@/data/erc4626.abi.json';
import { Global, logger } from "@/global";
import { AvnuWrapper, ERC20, SwapInfo } from "@/modules";
import { BaseStrategy } from "./base-strategy";
import { DualActionAmount } from "./base-strategy";
import { DualTokenInfo } from "./base-strategy";
import { log } from "winston";

export interface EkuboPoolKey {
    token0: ContractAddr,
    token1: ContractAddr,
    fee: string,
    tick_spacing: string,
    extension: string
}

export interface EkuboBounds {
    lowerTick: bigint,
    upperTick: bigint
}

/**
 * Settings for the CLVaultStrategy
 * 
 * @property newBounds - The new bounds for the strategy
 * @property newBounds.lower - relative to the current tick
 * @property newBounds.upper - relative to the current tick
 */
export interface CLVaultStrategySettings {
    newBounds: {
        lower: number,
        upper: number
    },
    // to get true price
    lstContract: ContractAddr
}

export class EkuboCLVault extends BaseStrategy<DualTokenInfo, DualActionAmount> {
    /** Contract address of the strategy */
    readonly address: ContractAddr;
    /** Pricer instance for token price calculations */
    readonly pricer: PricerBase;
    /** Metadata containing strategy information */
    readonly metadata: IStrategyMetadata<CLVaultStrategySettings>
    /** Contract instance for interacting with the strategy */
    readonly contract: Contract;
    readonly BASE_WEIGHT = 10000; // 10000 bps = 100%

    readonly ekuboPositionsContract: Contract;
    readonly ekuboMathContract: Contract;
    readonly lstContract: Contract;
    poolKey: EkuboPoolKey | undefined;
    readonly avnu: AvnuWrapper;

    /**
     * Creates a new VesuRebalance strategy instance.
     * @param config - Configuration object containing provider and other settings
     * @param pricer - Pricer instance for token price calculations
     * @param metadata - Strategy metadata including deposit tokens and address
     * @throws {Error} If more than one deposit token is specified
     */
    constructor(config: IConfig, pricer: PricerBase, metadata: IStrategyMetadata<CLVaultStrategySettings>) {
        super(config);
        this.pricer = pricer;
        
        assert(metadata.depositTokens.length === 2, 'EkuboCL only supports 2 deposit token');
        this.metadata = metadata;
        this.address = metadata.address;
        
        this.contract = new Contract(CLVaultAbi, this.address.address, this.config.provider);
        this.lstContract = new Contract(ERC4626Abi, this.metadata.additionalInfo.lstContract.address, this.config.provider);

        // ekubo positions contract
        const EKUBO_POSITION = '0x02e0af29598b407c8716b17f6d2795eca1b471413fa03fb145a5e33722184067'
        this.ekuboPositionsContract = new Contract(EkuboPositionsAbi, EKUBO_POSITION, this.config.provider);
        const EKUBO_MATH = '0x04a72e9e166f6c0e9d800af4dc40f6b6fb4404b735d3f528d9250808b2481995';
        this.ekuboMathContract = new Contract(EkuboMathAbi, EKUBO_MATH, this.config.provider);

        this.avnu = new AvnuWrapper();
    }

    depositCall(amountInfo: DualActionAmount, receiver: ContractAddr): Call[] {
        return []
    }

    withdrawCall(amountInfo: DualActionAmount, receiver: ContractAddr, owner: ContractAddr): Call[] {
        return []
    }

    rebalanceCall(newBounds: EkuboBounds, swapParams: SwapInfo): Call[] {
        return [this.contract.populate('rebalance', [
            {
                lower: EkuboCLVault.tickToi129(Number(newBounds.lowerTick)),
                upper: EkuboCLVault.tickToi129(Number(newBounds.upperTick))
            },
            swapParams
        ])]
    }

    handleUnusedCall(swapParams: SwapInfo): Call[] {
        return [this.contract.populate('handle_unused', [
            swapParams
        ])]
    }

    handleFeesCall(): Call[] {
        return [this.contract.populate('handle_fees', [])]
    }

    async getUserTVL(user: ContractAddr): Promise<DualTokenInfo> {
        throw new Error('Not implemented');
    }

    async getTVL(): Promise<DualTokenInfo> {
        const result = await this.contract.call('total_liquidity', []); 
        const bounds = await this.getCurrentBounds();
        const {amount0, amount1} = await this.getLiquidityToAmounts(Web3Number.fromWei(result.toString(), 18), bounds);
        const poolKey = await this.getPoolKey();
        const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
        const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
        const P0 = await this.pricer.getPrice(token0Info.symbol);
        const P1 = await this.pricer.getPrice(token1Info.symbol);
        const token0Usd = Number(amount0.toFixed(13)) * P0.price;
        const token1Usd = Number(amount1.toFixed(13)) * P1.price;
        return {
            netUsdValue: token0Usd + token1Usd,
            token0: {
                tokenInfo: token0Info,
                amount: amount0,
                usdValue: token0Usd
            },
            token1: {
                tokenInfo: token1Info,
                amount: amount1,
                usdValue: token1Usd
            }
        }
    }
    
    async getUncollectedFees(): Promise<DualTokenInfo> {
        const nftID = await this.getCurrentNFTID();
        const poolKey = await this.getPoolKey();
        const currentBounds = await this.getCurrentBounds();
        const result: any = await this.ekuboPositionsContract.call('get_token_info', [
            nftID,
            {
                token0: poolKey.token0.address,
                token1: poolKey.token1.address,
                fee: poolKey.fee,
                tick_spacing: poolKey.tick_spacing,
                extension: poolKey.extension
            },
            {
                lower: EkuboCLVault.tickToi129(Number(currentBounds.lowerTick)),
                upper: EkuboCLVault.tickToi129(Number(currentBounds.upperTick))
            }
        ]);
        const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
        const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
        const P0 = await this.pricer.getPrice(token0Info.symbol);
        const P1 = await this.pricer.getPrice(token1Info.symbol);
        const token0Web3 = Web3Number.fromWei(result.fees0.toString(), token0Info.decimals);
        const token1Web3 = Web3Number.fromWei(result.fees1.toString(), token1Info.decimals);
        const token0Usd = Number(token0Web3.toFixed(13)) * P0.price;
        const token1Usd = Number(token1Web3.toFixed(13)) * P1.price;
        return {
            netUsdValue: token0Usd + token1Usd,
            token0: {
                tokenInfo: token0Info,
                amount: token0Web3,
                usdValue: token0Usd
            },
            token1: {
                tokenInfo: token1Info,
                amount: token1Web3,
                usdValue: token1Usd
            }
        }
    }

    async getCurrentNFTID(): Promise<number> {
        const result: any = await this.contract.call('get_position_key', []);
        return Number(result.salt.toString());
    }

    async truePrice() {
        const result: any = await this.lstContract.call('convert_to_assets', [uint256.bnToUint256(BigInt(1e18).toString())]);
        const truePrice = Number(BigInt(result.toString()) * BigInt(1e9)/ BigInt(1e18)) / 1e9;
        return truePrice;
    }

    async getCurrentPrice() {
        const poolKey = await this.getPoolKey();
        return this._getCurrentPrice(poolKey);
    }

    private async _getCurrentPrice(poolKey: EkuboPoolKey) {
        const priceInfo: any = await this.ekuboPositionsContract.call('get_pool_price', [
            {
                token0: poolKey.token0.address,
                token1: poolKey.token1.address,
                fee: poolKey.fee,
                tick_spacing: poolKey.tick_spacing,
                extension: poolKey.extension
            }
        ])
        const sqrtRatio = EkuboCLVault.div2Power128(BigInt(priceInfo.sqrt_ratio.toString()));
        const price = sqrtRatio * sqrtRatio;
        const tick = EkuboCLVault.priceToTick(price, true, Number(poolKey.tick_spacing));
        return {
            price,
            tick: tick.mag * (tick.sign == 0 ? 1 : -1)
        }
    }

    async getCurrentBounds(): Promise<EkuboBounds> {
        const result: any = await this.contract.call('get_position_key', []);
        return {
          lowerTick: EkuboCLVault.i129ToNumber(result.bounds.lower),
          upperTick: EkuboCLVault.i129ToNumber(result.bounds.upper)
        }
    }

    static div2Power128(num: BigInt): number {
        return (Number(((BigInt(num.toString()) * 1000000n) / BigInt(2 ** 128))) / 1000000)
    }

    static priceToTick(price: number, isRoundDown: boolean, tickSpacing: number) {
        const value = isRoundDown ? Math.floor(Math.log(price) / Math.log(1.000001)) : Math.ceil(Math.log(price) / Math.log(1.000001));
        const tick = Math.floor(value / tickSpacing) * tickSpacing;
        return this.tickToi129(tick);
    }

    async getPoolKey(): Promise<EkuboPoolKey> {
        if (this.poolKey) {
            return this.poolKey;
        }
        const result: any = await this.contract.call('get_settings', []);
        const poolKey: EkuboPoolKey = {
          token0: ContractAddr.from(result.pool_key.token0.toString()),
          token1: ContractAddr.from(result.pool_key.token1.toString()),
          fee: result.pool_key.fee.toString(),
          tick_spacing: result.pool_key.tick_spacing.toString(),
          extension: result.pool_key.extension.toString()
        };
        const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
        const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
        assert(token0Info.decimals == token1Info.decimals, 'Tested only for equal decimals');
        this.poolKey = poolKey;
        return poolKey;
    }

    async getNewBounds(): Promise<EkuboBounds> {
        const poolKey = await this.getPoolKey();
        const currentPrice = await this._getCurrentPrice(poolKey);

        const newLower = currentPrice.tick + (Number(this.metadata.additionalInfo.newBounds.lower) * Number(poolKey.tick_spacing));
        const newUpper = currentPrice.tick + (Number(this.metadata.additionalInfo.newBounds.upper) * Number(poolKey.tick_spacing));

        return {
            lowerTick: BigInt(newLower),
            upperTick: BigInt(newUpper)
        }
    }

    /**
     * Computes the expected amounts to fully utilize amount in
     * to add liquidity to the pool
     * @param amount0: amount of token0
     * @param amount1: amount of token1
     * @returns {amount0, amount1}
     */
    private async _getExpectedAmountsForLiquidity(
        amount0: Web3Number,
        amount1: Web3Number,
        bounds: EkuboBounds
    ) {
        assert(amount0.greaterThan(0) || amount1.greaterThan(0), 'Amount is 0');

        // token is token0 or token1
        const poolKey = await this.getPoolKey();

        // get amount ratio for 1e18 liquidity
        const sampleLiq = 1e18;
        const {amount0: sampleAmount0, amount1: sampleAmount1} = await this.getLiquidityToAmounts(Web3Number.fromWei(sampleLiq.toString(), 18), bounds);
        logger.verbose(`${EkuboCLVault.name}: _getExpectedAmountsForLiquidity => sampleAmount0: ${sampleAmount0.toString()}, sampleAmount1: ${sampleAmount1.toString()}`);

        assert(!sampleAmount0.eq(0) && !sampleAmount1.eq(0), 'Sample amount is 0');

        // notation: P = P0 / P1
        const price = await (await this.getCurrentPrice()).price;
        logger.verbose(`${EkuboCLVault.name}: _getExpectedAmountsForLiquidity => price: ${price}`);
        // Account for edge cases
        // i.e. when liquidity is out of range
        if (amount1.eq(0) && amount0.greaterThan(0)) {
            if (sampleAmount1.eq(0)) {
                return {
                    amount0: amount0,
                    amount1: Web3Number.fromWei('0', 18),
                    ratio: Infinity
                }
            } else if (sampleAmount0.eq(0)) {
                // swap all to token1
                return {
                    amount0: Web3Number.fromWei('0', 18),
                    amount1: amount0.multipliedBy(price),
                    ratio: 0
                }
            }
        } else if (amount0.eq(0) && amount1.greaterThan(0)) {
            if (sampleAmount0.eq(0)) {
                return {
                    amount0: Web3Number.fromWei('0', 18),
                    amount1: amount1,
                    ratio: 0
                }
            } else if (sampleAmount1.eq(0)) {
                // swap all to token0
                return {
                    amount0: amount1.dividedBy(price),
                    amount1: Web3Number.fromWei('0', 18),
                    ratio: Infinity
                }
            }
        }

        const ratio = (sampleAmount0.multipliedBy(1e18).dividedBy(sampleAmount1.toString())).dividedBy(1e18);
        logger.verbose(`${EkuboCLVault.name}: ${this.metadata.name} => ratio: ${ratio.toString()}`);
        
        return this._solveExpectedAmountsEq(amount0, amount1, ratio, price);
    }

    private _solveExpectedAmountsEq(availableAmount0: Web3Number, availableAmount1: Web3Number, ratio: Web3Number, price: number) {
        // (amount0 + x) / (amount1 - y) = ratio
        // x = y * Py / Px                                     ---- (1)
        // => (amount0 + y * Py / Px) / (amount1 - y) = ratio
        // => amount0 + y * Py / Px = ratio * (amount1 - y)
        // => amount0 + y * Py / Px = ratio * amount1 - ratio * y
        // => y * (ratio + Py/Px) = ratio * amount1 - amount0
        // => y = (ratio * amount1 - amount0) / (ratio + Py/Px)  ---- (2)
        const y = ((ratio.multipliedBy(availableAmount1)).minus(availableAmount0)).dividedBy(ratio.plus(1 / price));
        const x = y.dividedBy(price);
        return {
            amount0: availableAmount0.plus(x),
            amount1: availableAmount1.minus(y),
            ratio: Number(ratio.toString())
        }
    }

    async getSwapInfoToHandleUnused(considerRebalance: boolean = true) {
        const poolKey = await this.getPoolKey();
        
        // fetch current unused balances of vault
        const erc20Mod = new ERC20(this.config);
        const token0Bal1 = await erc20Mod.balanceOf(poolKey.token0, this.address.address, 18);
        const token1Bal1 = await erc20Mod.balanceOf(poolKey.token1, this.address.address, 18);

        // if both tokens are non-zero and above $1 throw error
        const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
        const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);   
        const token0Price = await this.pricer.getPrice(token0Info.symbol);
        const token1Price = await this.pricer.getPrice(token1Info.symbol);
        const token0PriceUsd = token0Price.price * Number(token0Bal1.toFixed(13));
        const token1PriceUsd = token1Price.price * Number(token1Bal1.toFixed(13));
        if (token0PriceUsd > 1 && token1PriceUsd > 1) {
            // the swap is designed to handle one token only. 
            // i.e. all balance should be in one token
            // except small amount of dust
            // so we need to call handle_fees first, which will atleast use
            // most of one token
            throw new Error('Both tokens are non-zero and above $1, call handle_fees first');
        }


        let token0Bal = token0Bal1;
        let token1Bal = token1Bal1;

        // if rebalancing, consider whole TVL as available
        if (considerRebalance) {
            const tvl = await this.getTVL();
            token0Bal = token0Bal.plus(tvl.token0.amount.toString());
            token1Bal = token1Bal.plus(tvl.token1.amount.toString());
        } else {
            logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => considerRebalance: false`);
        }
        logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => token0Bal: ${token0Bal.toString()}, token1Bal: ${token1Bal.toString()}`);
        
        // get expected amounts for liquidity
        const newBounds = await this.getNewBounds();
        logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => newBounds: ${newBounds.lowerTick}, ${newBounds.upperTick}`);
        let expectedAmounts = await this._getExpectedAmountsForLiquidity(token0Bal, token1Bal, newBounds);
        logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => expectedAmounts: ${expectedAmounts.amount0.toString()}, ${expectedAmounts.amount1.toString()}`);

        // get swap info
        // fetch avnu routes to ensure expected amounts
        let retry = 0;
        const maxRetry = 10;
        while (retry < maxRetry) {
            retry++;
            // assert one token is increased and other is decreased
            if (expectedAmounts.amount0.lessThan(token0Bal) && expectedAmounts.amount1.lessThan(token1Bal)) {
                throw new Error('Both tokens are decreased, something is wrong');
            }
            if (expectedAmounts.amount0.greaterThan(token0Bal) && expectedAmounts.amount1.greaterThan(token1Bal)) {
                throw new Error('Both tokens are increased, something is wrong');
            }

            const tokenToSell = expectedAmounts.amount0.lessThan(token0Bal) ? poolKey.token0 : poolKey.token1;
            const tokenToBuy = tokenToSell == poolKey.token0 ? poolKey.token1 : poolKey.token0;
            let amountToSell = tokenToSell == poolKey.token0 ? token0Bal.minus(expectedAmounts.amount0) : token1Bal.minus(expectedAmounts.amount1);
            const remainingSellAmount = tokenToSell == poolKey.token0 ? expectedAmounts.amount0 : expectedAmounts.amount1;
            const tokenToBuyInfo = await Global.getTokenInfoFromAddr(tokenToBuy);
            const expectedRatio = expectedAmounts.ratio;
            
            logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => tokenToSell: ${tokenToSell.address}, tokenToBuy: ${tokenToBuy.address}, amountToSell: ${amountToSell.toWei()}`);
            logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => remainingSellAmount: ${remainingSellAmount.toString()}`);
            logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => expectedRatio: ${expectedRatio}`);

            const quote = await this.avnu.getQuotes(tokenToSell.address, tokenToBuy.address, amountToSell.toWei(), this.address.address);
            if (remainingSellAmount.eq(0)) {
                const minAmountOut = Web3Number.fromWei(quote.buyAmount.toString(), tokenToBuyInfo.decimals).multipliedBy(0.9999);
                return await this.avnu.getSwapInfo(quote, this.address.address, 0, this.address.address, minAmountOut.toWei());
            }

            const amountOut = Web3Number.fromWei(quote.buyAmount.toString(), tokenToBuyInfo.decimals);
            const swapPrice = tokenToSell == poolKey.token0 ? amountOut.dividedBy(amountToSell) : amountToSell.dividedBy(amountOut);
            const newRatio = tokenToSell == poolKey.token0 ? remainingSellAmount.dividedBy(token1Bal.plus(amountOut)) : token0Bal.plus(amountOut).dividedBy(remainingSellAmount);
            logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => amountOut: ${amountOut.toString()}`);
            logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => swapPrice: ${swapPrice.toString()}`);
            logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => newRatio: ${newRatio.toString()}`);
            if (Number(newRatio.toString()) > expectedRatio * 1.0000001 || Number(newRatio.toString()) < expectedRatio * 0.9999999) {
                expectedAmounts = await this._solveExpectedAmountsEq(token0Bal, token1Bal, new Web3Number(Number(expectedRatio).toFixed(13), 18), Number(swapPrice.toString()));
                logger.verbose(`${EkuboCLVault.name}: getSwapInfoToHandleUnused => expectedAmounts: ${expectedAmounts.amount0.toString()}, ${expectedAmounts.amount1.toString()}`);
            } else {
                const minAmountOut = Web3Number.fromWei(quote.buyAmount.toString(), tokenToBuyInfo.decimals).multipliedBy(0.9999);
                return await this.avnu.getSwapInfo(quote, this.address.address, 0, this.address.address, minAmountOut.toWei());
            }

            retry++;
        }

        throw new Error('Failed to get swap info');
    }

    static tickToi129(tick: number) {
        if (tick < 0) {
            return {
                mag: -tick,
                sign: 1
            };
        } else {
            return {
                mag: tick,
                sign: 0
            };
        }
    }

    static priceToSqrtRatio(price: number) {
        return BigInt(Math.floor(Math.sqrt(price) * 10**9)) * BigInt(2 ** 128) / BigInt(1e9);
    }

    static i129ToNumber(i129: { mag: bigint, sign: number }) {
        return i129.mag * (i129.sign.toString() == "false" ? 1n : -1n);
    }

    static tickToPrice(tick: bigint) {
        return Math.pow(1.000001, Number(tick));
    }

    async getLiquidityToAmounts(liquidity: Web3Number, bounds: EkuboBounds) {
        const currentPrice = await this.getCurrentPrice();
        const lowerPrice = await EkuboCLVault.tickToPrice(bounds.lowerTick);
        const upperPrice = await EkuboCLVault.tickToPrice(bounds.upperTick);
        logger.verbose(`${EkuboCLVault.name}: getLiquidityToAmounts => currentPrice: ${currentPrice.price}, lowerPrice: ${lowerPrice}, upperPrice: ${upperPrice}`);
        const result: any = await this.ekuboMathContract.call('liquidity_delta_to_amount_delta', [
            uint256.bnToUint256(EkuboCLVault.priceToSqrtRatio(currentPrice.price).toString()),
            {
                mag: liquidity.toWei(),
                sign: 0
            },
            uint256.bnToUint256(EkuboCLVault.priceToSqrtRatio(lowerPrice).toString()),
            uint256.bnToUint256(EkuboCLVault.priceToSqrtRatio(upperPrice).toString())
        ] as any);
        const poolKey = await this.getPoolKey();
        const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
        const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
        const amount0 = Web3Number.fromWei(EkuboCLVault.i129ToNumber(result.amount0).toString(), token0Info.decimals);
        const amount1 = Web3Number.fromWei(EkuboCLVault.i129ToNumber(result.amount1).toString(), token1Info.decimals);

        return {
            amount0, amount1
        }
    }
}


const _description = 'Automatically rebalances liquidity near current price to maximize yield while reducing the necessity to manually rebalance positions frequently. Fees earn and Defi spring rewards are automatically re-invested.'
const _protocol: IProtocol = {name: 'Ekubo', logo: 'https://app.ekubo.org/favicon.ico'}
// need to fine tune better
const _riskFactor: RiskFactor[] = [
    {type: RiskType.SMART_CONTRACT_RISK, value: 0.5, weight: 25},
    {type: RiskType.IMPERMANENT_LOSS, value: 1, weight: 75}
]
/**
 * Represents the Vesu Rebalance Strategies.
 */
export const EkuboCLVaultStrategies: IStrategyMetadata<CLVaultStrategySettings>[] = [{
    name: 'Ekubo xSTRK/STRK',
    description: _description,
    address: ContractAddr.from('0x01f083b98674bc21effee29ef443a00c7b9a500fd92cf30341a3da12c73f2324'),
    type: 'Other',
    depositTokens: [Global.getDefaultTokens().find(t => t.symbol === 'STRK')!, Global.getDefaultTokens().find(t => t.symbol === 'xSTRK')!],
    protocols: [_protocol],
    maxTVL: Web3Number.fromWei('0', 18),
    risk: {
        riskFactor: _riskFactor,
        netRisk: _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) /  _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
        notARisks: getNoRiskTags(_riskFactor)
    },
    additionalInfo: {
        newBounds: {
            lower: -1,
            upper: 1
        },
        lstContract: ContractAddr.from('0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a')
    }
}]