import { ContractAddr, Web3Number } from "@/dataTypes";
import {
  FAQ,
  FlowChartColors,
  getNoRiskTags,
  highlightTextWithLinks,
  IConfig,
  IInvestmentFlow,
  IProtocol,
  IStrategyMetadata,
  RiskFactor,
  RiskType,
} from "@/interfaces";
import { PricerBase } from "@/modules/pricerBase";
import { assert } from "@/utils";
import {
  Account,
  BlockIdentifier,
  Call,
  Contract,
  num,
  uint256,
} from "starknet";
import CLVaultAbi from "@/data/cl-vault.abi.json";
import EkuboPositionsAbi from "@/data/ekubo-positions.abi.json";
import EkuboMathAbi from "@/data/ekubo-math.abi.json";
import ERC4626Abi from "@/data/erc4626.abi.json";
import { Global } from "@/global";
import { AvnuWrapper, ERC20, SwapInfo } from "@/modules";
import { BaseStrategy } from "./base-strategy";
import { DualActionAmount } from "./base-strategy";
import { DualTokenInfo } from "./base-strategy";
import { log } from "winston";
import { EkuboHarvests } from "@/modules/harvests";
import { logger } from "@/utils/logger";
import { COMMON_CONTRACTS } from "./constants";

export interface EkuboPoolKey {
  token0: ContractAddr;
  token1: ContractAddr;
  fee: string;
  tick_spacing: string;
  extension: string;
}

export interface EkuboBounds {
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
export interface CLVaultStrategySettings {
  newBounds: {
    lower: number;
    upper: number;
  } | string; // if no bounds are set, can say `Managed by Re7`
  // to get true price
  lstContract?: ContractAddr;
  truePrice?: number; // useful for pools where price is known (e.g. USDC/USDT as 1)
  feeBps: number;
  rebalanceConditions: {
    minWaitHours: number; // number of hours out of range to rebalance
    direction: "any" | "uponly"; // any for pools like USDC/USDT, uponly for pools like xSTRK/STRK
    customShouldRebalance: (currentPoolPrice: number) => Promise<boolean>; // any additional logic for deciding factor to rebalance or not based on pools
  };
}

export class EkuboCLVault extends BaseStrategy<
  DualTokenInfo,
  DualActionAmount
> {
  /** Contract address of the strategy */
  readonly address: ContractAddr;
  /** Pricer instance for token price calculations */
  readonly pricer: PricerBase;
  /** Metadata containing strategy information */
  readonly metadata: IStrategyMetadata<CLVaultStrategySettings>;
  /** Contract instance for interacting with the strategy */
  readonly contract: Contract;
  readonly BASE_WEIGHT = 10000; // 10000 bps = 100%

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
  constructor(
    config: IConfig,
    pricer: PricerBase,
    metadata: IStrategyMetadata<CLVaultStrategySettings>
  ) {
    super(config);
    this.pricer = pricer;

    assert(
      metadata.depositTokens.length === 2,
      "EkuboCL only supports 2 deposit token"
    );
    this.metadata = metadata;
    this.address = metadata.address;

    this.contract = new Contract(
      CLVaultAbi,
      this.address.address,
      this.config.provider
    );
    if (this.metadata.additionalInfo.lstContract) {
      this.lstContract = new Contract(
        ERC4626Abi,
        this.metadata.additionalInfo.lstContract.address,
        this.config.provider
      );
    } else {
      this.lstContract = null;
    }

    // ekubo positions contract
    const EKUBO_POSITION =
      "0x02e0af29598b407c8716b17f6d2795eca1b471413fa03fb145a5e33722184067";
    this.ekuboPositionsContract = new Contract(
      EkuboPositionsAbi,
      EKUBO_POSITION,
      this.config.provider
    );
    const EKUBO_MATH =
      "0x04a72e9e166f6c0e9d800af4dc40f6b6fb4404b735d3f528d9250808b2481995";
    this.ekuboMathContract = new Contract(
      EkuboMathAbi,
      EKUBO_MATH,
      this.config.provider
    );

    this.avnu = new AvnuWrapper();
  }

  async matchInputAmounts(
    amountInfo: DualActionAmount
  ): Promise<DualActionAmount> {
    const bounds = await this.getCurrentBounds();
    const res = await this._getExpectedAmountsForLiquidity(
      amountInfo.token0.amount,
      amountInfo.token1.amount,
      bounds,
      false
    );
    return {
      token0: {
        tokenInfo: amountInfo.token0.tokenInfo,
        amount: res.amount0,
      },
      token1: {
        tokenInfo: amountInfo.token1.tokenInfo,
        amount: res.amount1,
      },
    };
  }

  /** Returns minimum amounts give given two amounts based on what can be added for liq */
  async getMinDepositAmounts(
    amountInfo: DualActionAmount
  ): Promise<DualActionAmount> {
    const shares = await this.tokensToShares(amountInfo);

    // get actual amounts now
    const { amount0, amount1 }: any = await this.contract.call(
      "convert_to_assets",
      [uint256.bnToUint256(shares.toWei())]
    );

    // todo use user balances to compute what is required to be swapped
    return {
      token0: {
        tokenInfo: amountInfo.token0.tokenInfo,
        amount: Web3Number.fromWei(
          amount0.toString(),
          amountInfo.token0.tokenInfo.decimals
        ),
      },
      token1: {
        tokenInfo: amountInfo.token1.tokenInfo,
        amount: Web3Number.fromWei(
          amount1.toString(),
          amountInfo.token1.tokenInfo.decimals
        ),
      },
    };
  }

  async depositCall(
    amountInfo: DualActionAmount,
    receiver: ContractAddr
  ): Promise<Call[]> {
    const updateAmountInfo = await this.getMinDepositAmounts(amountInfo);
    // Technically its not erc4626 abi, but we just need approve call
    // so, its ok to use it
    const token0Contract = new Contract(
      ERC4626Abi,
      amountInfo.token0.tokenInfo.address.address,
      this.config.provider
    );
    const token1Contract = new Contract(
      ERC4626Abi,
      amountInfo.token1.tokenInfo.address.address,
      this.config.provider
    );
    const call1 = token0Contract.populate("approve", [
      this.address.address,
      uint256.bnToUint256(updateAmountInfo.token0.amount.toWei()),
    ]);
    const call2 = token1Contract.populate("approve", [
      this.address.address,
      uint256.bnToUint256(updateAmountInfo.token1.amount.toWei()),
    ]);
    const call3 = this.contract.populate("deposit", [
      uint256.bnToUint256(updateAmountInfo.token0.amount.toWei()),
      uint256.bnToUint256(updateAmountInfo.token1.amount.toWei()),
      receiver.address,
    ]);
    const calls: Call[] = [];
    if (updateAmountInfo.token0.amount.greaterThan(0)) calls.push(call1);
    if (updateAmountInfo.token1.amount.greaterThan(0)) calls.push(call2);
    return [...calls, call3];
  }

  async tokensToShares(amountInfo: DualActionAmount) {
    const shares = await this.contract.call("convert_to_shares", [
      uint256.bnToUint256(amountInfo.token0.amount.toWei()),
      uint256.bnToUint256(amountInfo.token1.amount.toWei()),
    ]);
    return Web3Number.fromWei(shares.toString(), 18);
  }

  async withdrawCall(
    amountInfo: DualActionAmount,
    receiver: ContractAddr,
    owner: ContractAddr
  ): Promise<Call[]> {
    const shares = await this.tokensToShares(amountInfo);
    logger.verbose(
      `${EkuboCLVault.name}: withdrawCall: shares=${shares.toString()}`
    );
    return [
      this.contract.populate("withdraw", [
        uint256.bnToUint256(shares.toWei()),
        receiver.address,
      ]),
    ];
  }

  rebalanceCall(newBounds: EkuboBounds, swapParams: SwapInfo): Call[] {
    return [
      this.contract.populate("rebalance", [
        {
          lower: EkuboCLVault.tickToi129(Number(newBounds.lowerTick)),
          upper: EkuboCLVault.tickToi129(Number(newBounds.upperTick)),
        },
        swapParams,
      ]),
    ];
  }

  handleUnusedCall(swapParams: SwapInfo): Call[] {
    return [this.contract.populate("handle_unused", [swapParams])];
  }

  handleFeesCall(): Call[] {
    return [this.contract.populate("handle_fees", [])];
  }

  /**
   * Calculates assets before and now in a given token of TVL per share to observe growth
   * @returns {Promise<number>} The weighted average APY across all pools
   */
  async netAPY(
    blockIdentifier: BlockIdentifier = "pending",
    sinceBlocks = 20000
  ): Promise<number> {
    // no special provisions required to account for defi spring rewards
    // or strategy fees, bcz this returns realisitic apy based on 7day performance

    const tvlNow = await this._getTVL(blockIdentifier);
    const supplyNow = await this.totalSupply(blockIdentifier);
    const priceNow = await this.getCurrentPrice(blockIdentifier);
    let blockNow =
      typeof blockIdentifier == "number"
        ? blockIdentifier
        : (await this.config.provider.getBlockLatestAccepted()).block_number;
    const blockNowTime =
      typeof blockIdentifier == "number"
        ? (await this.config.provider.getBlockWithTxs(blockIdentifier))
            .timestamp
        : new Date().getTime() / 1000;
    const blockBefore = Math.max(
      blockNow - sinceBlocks,
      this.metadata.launchBlock
    );
    const adjustedSupplyNow = supplyNow.minus(
      await this.getHarvestRewardShares(blockBefore, blockNow)
    );
    let blockBeforeInfo = await this.config.provider.getBlockWithTxs(
      blockBefore
    );
    const tvlBefore = await this._getTVL(blockBefore);
    const supplyBefore = await this.totalSupply(blockBefore);
    const priceBefore = await this.getCurrentPrice(blockBefore);

    const tvlInToken0Now = tvlNow.amount0
      .multipliedBy(priceNow.price)
      .plus(tvlNow.amount1);
    const tvlPerShareNow = tvlInToken0Now
      .multipliedBy(1e18)
      .dividedBy(adjustedSupplyNow.toString());
    const tvlInToken0Bf = tvlBefore.amount0
      .multipliedBy(priceBefore.price)
      .plus(tvlBefore.amount1);
    const tvlPerShareBf = tvlInToken0Bf
      .multipliedBy(1e18)
      .dividedBy(supplyBefore.toString());
    const timeDiffSeconds = blockNowTime - blockBeforeInfo.timestamp;
    logger.verbose(`tvlInToken0Now: ${tvlInToken0Now.toString()}`);
    logger.verbose(`tvlInToken0Bf: ${tvlInToken0Bf.toString()}`);
    logger.verbose(`tvlPerShareNow: ${tvlPerShareNow.toString()}`);
    logger.verbose(`tvlPerShareBf: ${tvlPerShareBf.toString()}`);
    logger.verbose(`Price before: ${priceBefore.price.toString()}`);
    logger.verbose(`Price now: ${priceNow.price.toString()}`);
    logger.verbose(`Supply before: ${supplyBefore.toString()}`);
    logger.verbose(`Supply now: ${adjustedSupplyNow.toString()}`);
    logger.verbose(`Time diff in seconds: ${timeDiffSeconds}`);
    const apyForGivenBlocks =
      Number(
        tvlPerShareNow
          .minus(tvlPerShareBf)
          .multipliedBy(10000)
          .dividedBy(tvlPerShareBf)
      ) / 10000;
    return (apyForGivenBlocks * (365 * 24 * 3600)) / timeDiffSeconds;
  }

  async getHarvestRewardShares(fromBlock: number, toBlock: number) {
    const len = Number(await this.contract.call("get_total_rewards"));
    let shares = Web3Number.fromWei(0, 18);
    for (let i = len - 1; i > 0; --i) {
      let record: any = await this.contract.call("get_rewards_info", [i]);
      logger.verbose(`${EkuboCLVault.name}: getHarvestRewardShares: ${i}`);
      console.log(record);
      const block = Number(record.block_number);
      if (block < fromBlock) {
        return shares;
      } else if (block > toBlock) {
        continue;
      } else {
        shares = shares.plus(Web3Number.fromWei(record.shares.toString(), 18));
      }
      logger.verbose(
        `${
          EkuboCLVault.name
        }: getHarvestRewardShares: ${i} => ${shares.toWei()}`
      );
    }
    return shares;
  }

  async balanceOf(
    user: ContractAddr,
    blockIdentifier: BlockIdentifier = "pending"
  ): Promise<Web3Number> {
    let bal = await this.contract.call("balance_of", [user.address], {
      blockIdentifier,
    });
    return Web3Number.fromWei(bal.toString(), 18);
  }

  async getUserTVL(
    user: ContractAddr,
    blockIdentifier: BlockIdentifier = "pending"
  ): Promise<DualTokenInfo> {
    let bal = await this.balanceOf(user, blockIdentifier);
    const assets: any = await this.contract.call(
      "convert_to_assets",
      [uint256.bnToUint256(bal.toWei())],
      {
        blockIdentifier,
      }
    );
    const poolKey = await this.getPoolKey(blockIdentifier);
    this.assertValidDepositTokens(poolKey);
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const amount0 = Web3Number.fromWei(
      assets.amount0.toString(),
      token0Info.decimals
    );
    const amount1 = Web3Number.fromWei(
      assets.amount1.toString(),
      token1Info.decimals
    );
    const P0 = await this.pricer.getPrice(token0Info.symbol);
    const P1 = await this.pricer.getPrice(token1Info.symbol);
    const token0Usd = Number(amount0.toFixed(13)) * P0.price;
    const token1Usd = Number(amount1.toFixed(13)) * P1.price;

    return {
      usdValue: token0Usd + token1Usd,
      token0: {
        tokenInfo: token0Info,
        amount: amount0,
        usdValue: token0Usd,
      },
      token1: {
        tokenInfo: token1Info,
        amount: amount1,
        usdValue: token1Usd,
      },
    };
  }

  async _getTVL(blockIdentifier: BlockIdentifier = "pending") {
    const result = await this.contract.call("total_liquidity", [], {
      blockIdentifier,
    });
    const bounds = await this.getCurrentBounds(blockIdentifier);
    const { amount0, amount1 } = await this.getLiquidityToAmounts(
      Web3Number.fromWei(result.toString(), 18),
      bounds,
      blockIdentifier
    );

    return { amount0, amount1 };
  }

  async totalSupply(
    blockIdentifier: BlockIdentifier = "pending"
  ): Promise<Web3Number> {
    const res = await this.contract.call("total_supply", [], {
      blockIdentifier,
    });
    return Web3Number.fromWei(res.toString(), 18);
  }

  assertValidDepositTokens(poolKey: EkuboPoolKey) {
    // given this is called by UI, if wrong config is done, it will throw error;
    assert(
      poolKey.token0.eq(this.metadata.depositTokens[0].address),
      "Expected token0 in depositTokens[0]"
    );
    assert(
      poolKey.token1.eq(this.metadata.depositTokens[1].address),
      "Expected token1 in depositTokens[1]"
    );
  }

  async getTVL(
    blockIdentifier: BlockIdentifier = "pending"
  ): Promise<DualTokenInfo> {
    const { amount0, amount1 } = await this._getTVL(blockIdentifier);
    const poolKey = await this.getPoolKey(blockIdentifier);
    this.assertValidDepositTokens(poolKey);

    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const P0 = await this.pricer.getPrice(token0Info.symbol);
    const P1 = await this.pricer.getPrice(token1Info.symbol);
    const token0Usd = Number(amount0.toFixed(13)) * P0.price;
    const token1Usd = Number(amount1.toFixed(13)) * P1.price;
    return {
      usdValue: token0Usd + token1Usd,
      token0: {
        tokenInfo: token0Info,
        amount: amount0,
        usdValue: token0Usd,
      },
      token1: {
        tokenInfo: token1Info,
        amount: amount1,
        usdValue: token1Usd,
      },
    };
  }

  async getUncollectedFees(): Promise<DualTokenInfo> {
    const nftID = await this.getCurrentNFTID();
    const poolKey = await this.getPoolKey();
    const currentBounds = await this.getCurrentBounds();
    const result: any = await this.ekuboPositionsContract.call(
      "get_token_info",
      [
        nftID,
        {
          token0: poolKey.token0.address,
          token1: poolKey.token1.address,
          fee: poolKey.fee,
          tick_spacing: poolKey.tick_spacing,
          extension: poolKey.extension,
        },
        {
          lower: EkuboCLVault.tickToi129(Number(currentBounds.lowerTick)),
          upper: EkuboCLVault.tickToi129(Number(currentBounds.upperTick)),
        },
      ]
    );
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const P0 = await this.pricer.getPrice(token0Info.symbol);
    const P1 = await this.pricer.getPrice(token1Info.symbol);
    const token0Web3 = Web3Number.fromWei(
      result.fees0.toString(),
      token0Info.decimals
    );
    const token1Web3 = Web3Number.fromWei(
      result.fees1.toString(),
      token1Info.decimals
    );
    const token0Usd = Number(token0Web3.toFixed(13)) * P0.price;
    const token1Usd = Number(token1Web3.toFixed(13)) * P1.price;
    return {
      usdValue: token0Usd + token1Usd,
      token0: {
        tokenInfo: token0Info,
        amount: token0Web3,
        usdValue: token0Usd,
      },
      token1: {
        tokenInfo: token1Info,
        amount: token1Web3,
        usdValue: token1Usd,
      },
    };
  }

  async getCurrentNFTID(): Promise<number> {
    const result: any = await this.contract.call("get_position_key", []);
    return Number(result.salt.toString());
  }

  async truePrice() {
    if (this.metadata.additionalInfo.truePrice) {
      return this.metadata.additionalInfo.truePrice;
    } else if (this.lstContract) {
      const result: any = await this.lstContract.call("convert_to_assets", [
        uint256.bnToUint256(BigInt(1e18).toString()),
      ]);
      const truePrice =
        Number((BigInt(result.toString()) * BigInt(1e9)) / BigInt(1e18)) / 1e9;
      return truePrice;
    }

    throw new Error("No true price available");
  }

  async getCurrentPrice(blockIdentifier: BlockIdentifier = "pending") {
    const poolKey = await this.getPoolKey(blockIdentifier);
    return this._getCurrentPrice(poolKey, blockIdentifier);
  }

  async _getCurrentPrice(
    poolKey: EkuboPoolKey,
    blockIdentifier: BlockIdentifier = "pending"
  ) {
    const priceInfo: any = await this.ekuboPositionsContract.call(
      "get_pool_price",
      [
        {
          token0: poolKey.token0.address,
          token1: poolKey.token1.address,
          fee: poolKey.fee,
          tick_spacing: poolKey.tick_spacing,
          extension: poolKey.extension,
        },
      ],
      {
        blockIdentifier,
      }
    );
    const sqrtRatio = EkuboCLVault.div2Power128(
      BigInt(priceInfo.sqrt_ratio.toString())
    );
    console.log(
      `EkuboCLVault: getCurrentPrice: blockIdentifier: ${blockIdentifier}, sqrtRatio: ${sqrtRatio}, ${priceInfo.sqrt_ratio.toString()}`
    );
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const price = sqrtRatio * sqrtRatio * (10 ** token0Info.decimals) / ( 10 ** token1Info.decimals);
    const tick = priceInfo.tick;
    console.log(
      `EkuboCLVault: getCurrentPrice: blockIdentifier: ${blockIdentifier}, price: ${price}, tick: ${tick.mag}, ${tick.sign}`
    );
    return {
      price,
      tick: Number(tick.mag) * (tick.sign ? -1 : 1),
      sqrtRatio: priceInfo.sqrt_ratio.toString(),
    };
  }

  async getCurrentBounds(
    blockIdentifier: BlockIdentifier = "pending"
  ): Promise<EkuboBounds> {
    const result: any = await this.contract.call("get_position_key", [], {
      blockIdentifier,
    });
    return {
      lowerTick: EkuboCLVault.i129ToNumber(result.bounds.lower),
      upperTick: EkuboCLVault.i129ToNumber(result.bounds.upper),
    };
  }

  static div2Power128(num: BigInt): number {
    return (
      Number((BigInt(num.toString()) * BigInt(1e18)) / BigInt(2 ** 128)) / 1e18
    );
  }

  static priceToTick(price: number, isRoundDown: boolean, tickSpacing: number) {
    const value = isRoundDown
      ? Math.floor(Math.log(price) / Math.log(1.000001))
      : Math.ceil(Math.log(price) / Math.log(1.000001));
    const tick = Math.floor(value / tickSpacing) * tickSpacing;
    return this.tickToi129(tick);
  }

  async getPoolKey(
    blockIdentifier: BlockIdentifier = "pending"
  ): Promise<EkuboPoolKey> {
    if (this.poolKey) {
      return this.poolKey;
    }
    const result: any = await this.contract.call("get_settings", [], {
      blockIdentifier,
    });
    const poolKey: EkuboPoolKey = {
      token0: ContractAddr.from(result.pool_key.token0.toString()),
      token1: ContractAddr.from(result.pool_key.token1.toString()),
      fee: result.pool_key.fee.toString(),
      tick_spacing: result.pool_key.tick_spacing.toString(),
      extension: result.pool_key.extension.toString(),
    };
    this.poolKey = poolKey;
    return poolKey;
  }

  async getNewBounds(): Promise<EkuboBounds> {
    const poolKey = await this.getPoolKey();
    const currentPrice = await this._getCurrentPrice(poolKey);

    if (typeof this.metadata.additionalInfo.newBounds === "string") {
      throw new Error(`New bounds are managed known, to be set manually/externally`);
    }

    const newLower =
      currentPrice.tick +
      Number(this.metadata.additionalInfo.newBounds.lower) *
        Number(poolKey.tick_spacing);
    const newUpper =
      currentPrice.tick +
      Number(this.metadata.additionalInfo.newBounds.upper) *
        Number(poolKey.tick_spacing);

    return {
      lowerTick: BigInt(newLower),
      upperTick: BigInt(newUpper),
    };
  }

  /**
   * Computes the expected amounts to fully utilize amount in
   * to add liquidity to the pool
   * @param amount0: amount of token0
   * @param amount1: amount of token1
   * @returns {amount0, amount1}
   */
  private async _getExpectedAmountsForLiquidity(
    inputAmount0: Web3Number,
    inputAmount1: Web3Number,
    bounds: EkuboBounds,
    justUseInputAmount = true
  ) {
    assert(inputAmount0.greaterThan(0) || inputAmount1.greaterThan(0), "Amount is 0");

    // get amount ratio for 1e18 liquidity
    const sampleLiq = 1e20;
    const { amount0: sampleAmount0, amount1: sampleAmount1 } =
      await this.getLiquidityToAmounts(
        Web3Number.fromWei(sampleLiq.toString(), 18),
        bounds
      );
    logger.verbose(
      `${
        EkuboCLVault.name
      }: _getExpectedAmountsForLiquidity => sampleAmount0: ${sampleAmount0.toString()}, sampleAmount1: ${sampleAmount1.toString()}`
    );

    assert(!sampleAmount0.eq(0) || !sampleAmount1.eq(0), "Sample amount is 0");

    // notation: P = P0 / P1
    const price = await (await this.getCurrentPrice()).price;
    logger.verbose(
      `${EkuboCLVault.name}: _getExpectedAmountsForLiquidity => price: ${price}`
    );
    // Account for edge cases
    // i.e. when liquidity is out of range
    if (inputAmount1.eq(0) && inputAmount0.greaterThan(0)) {
      if (sampleAmount1.eq(0)) {
        return {
          amount0: inputAmount0,
          amount1: Web3Number.fromWei("0", inputAmount1.decimals),
          ratio: Infinity,
        };
      } else if (sampleAmount0.eq(0)) {
        // swap all to token1
        return {
          amount0: Web3Number.fromWei("0", inputAmount0.decimals),
          // to ensure decimal consistency, we start with 0
          amount1: Web3Number.fromWei("0", inputAmount1.decimals).plus(inputAmount0.toString()).multipliedBy(price),
          ratio: 0,
        };
      }
    } else if (inputAmount0.eq(0) && inputAmount1.greaterThan(0)) {
      if (sampleAmount0.eq(0)) {
        return {
          amount0: Web3Number.fromWei("0", inputAmount0.decimals),
          amount1: inputAmount1,
          ratio: 0,
        };
      } else if (sampleAmount1.eq(0)) {
        // swap all to token0
        return {
          // to ensure decimal consistency, we start with 0
          amount0: Web3Number.fromWei("0", inputAmount0.decimals).plus(inputAmount1.toString()).dividedBy(price),
          amount1: Web3Number.fromWei("0", inputAmount1.decimals),
          ratio: Infinity,
        };
      }
    }

    const ratioWeb3Number = this.getRatio(sampleAmount0, sampleAmount1);

    const ratio: number = Number(ratioWeb3Number.toFixed(18));
    logger.verbose(
      `${EkuboCLVault.name}: ${
        this.metadata.name
      } => ratio: ${ratio.toString()}`
    );

    if (justUseInputAmount)
      return this._solveExpectedAmountsEq(
        inputAmount0,
        inputAmount1,
        ratioWeb3Number,
        price
      );

    // we are at liberty to propose amounts outside the propsed amount
    // assuming amount0 and amount1 as independent values, compute other amounts
    // Also, if code came till here, it means both sample amounts are non-zero
    if (inputAmount1.eq(0) && inputAmount0.greaterThan(0)) {
      // use amount0 as base and compute amount1 using ratio
      const _amount1 = new Web3Number(inputAmount0.toString(), inputAmount1.decimals).dividedBy(ratioWeb3Number);
      return {
        amount0: inputAmount0,
        amount1: _amount1,
        ratio,
      };
    } else if (inputAmount0.eq(0) && inputAmount1.greaterThan(0)) {
      // use amount1 as base and compute amount0 using ratio
      const _amount0 = new Web3Number(inputAmount1.toString(), inputAmount0.decimals).multipliedBy(ratio);
      return {
        amount0: _amount0,
        amount1: inputAmount1,
        ratio,
      };
    } else {
      // ambiguous case
      // can lead to diverging results
      throw new Error(
        "Both amounts are non-zero, cannot compute expected amounts"
      );
    }
  }

  getRatio(token0Amt: Web3Number, token1Amount: Web3Number) {
    const ratio = token0Amt
      .multipliedBy(1e18)
      .dividedBy(token1Amount.toString())
      .dividedBy(1e18);
    logger.verbose(
      `${EkuboCLVault.name}: getRatio => token0Amt: ${token0Amt.toString()}, token1Amount: ${token1Amount.toString()}, ratio: ${ratio.toString()}`
    );
    return ratio;
  }

  private _solveExpectedAmountsEq(
    availableAmount0: Web3Number,
    availableAmount1: Web3Number,
    ratio: Web3Number,
    price: number
  ) {
    // (amount0 + x) / (amount1 - y) = ratio
    // x = y * Py / Px                                     ---- (1)
    // => (amount0 + y * Py / Px) / (amount1 - y) = ratio
    // => amount0 + y * Py / Px = ratio * (amount1 - y)
    // => amount0 + y * Py / Px = ratio * amount1 - ratio * y
    // => y * (ratio + Py/Px) = ratio * amount1 - amount0
    // => y = (ratio * amount1 - amount0) / (ratio + Py/Px)  ---- (2)
    const y = ratio
      .multipliedBy(availableAmount1)
      .minus(availableAmount0)
      .dividedBy(ratio.plus(1 / price));
    const x = y.dividedBy(price);
    logger.verbose(
      `${
        EkuboCLVault.name
      }: _solveExpectedAmountsEq => ratio: ${ratio.toString()}, x: ${x.toString()}, y: ${y.toString()}, amount0: ${availableAmount0.toString()}, amount1: ${availableAmount1.toString()}`
    );

    if (ratio.eq(0)) {
      return {
        amount0: Web3Number.fromWei("0", availableAmount0.decimals),
        amount1: availableAmount1.minus(y),
        ratio: 0,
      };
    }
    return {
      amount0: availableAmount0.plus(x),
      amount1: availableAmount1.minus(y),
      ratio: Number(ratio.toString()),
    };
  }

  async unusedBalances(_poolKey?: EkuboPoolKey) {
    const poolKey = _poolKey || (await this.getPoolKey());
    const erc20Mod = new ERC20(this.config);
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const token0Bal1 = await erc20Mod.balanceOf(
      poolKey.token0,
      this.address.address,
      token0Info.decimals
    );
    const token1Bal1 = await erc20Mod.balanceOf(
      poolKey.token1,
      this.address.address,
      token1Info.decimals
    );

    logger.verbose(
      `${
        EkuboCLVault.name
      }: getSwapInfoToHandleUnused => token0Bal1: ${token0Bal1.toString()}, token1Bal1: ${token1Bal1.toString()}`
    );
    // if both tokens are non-zero and above $1 throw error
    const token0Price = await this.pricer.getPrice(token0Info.symbol);
    const token1Price = await this.pricer.getPrice(token1Info.symbol);
    const token0PriceUsd = token0Price.price * Number(token0Bal1.toFixed(13));
    const token1PriceUsd = token1Price.price * Number(token1Bal1.toFixed(13));

    return {
      token0: {
        amount: token0Bal1,
        tokenInfo: token0Info,
        usdValue: token0PriceUsd,
      },
      token1: {
        amount: token1Bal1,
        tokenInfo: token1Info,
        usdValue: token1PriceUsd,
      },
    };
  }

  async getSwapInfoToHandleUnused(considerRebalance: boolean = true, newBounds: EkuboBounds | null = null, maxIterations = 20, priceRatioPrecision = 4): Promise<SwapInfo> {
    const poolKey = await this.getPoolKey();

    // fetch current unused balances of vault
    const unusedBalances = await this.unusedBalances(poolKey);
    const { amount: token0Bal1, usdValue: token0PriceUsd } =
      unusedBalances.token0;
    const { amount: token1Bal1, usdValue: token1PriceUsd } =
      unusedBalances.token1;

    // if (token0PriceUsd > 1 && token1PriceUsd > 1) {
    //   // the swap is designed to handle one token only.
    //   // i.e. all balance should be in one token
    //   // except small amount of dust
    //   // so we need to call handle_fees first, which will atleast use
    //   // most of one token
    //   throw new Error(
    //     "Both tokens are non-zero and above $1, call handle_fees first"
    //   );
    // }

    let token0Bal = token0Bal1;
    let token1Bal = token1Bal1;

    // if rebalancing, consider whole TVL as available
    if (considerRebalance) {
      logger.verbose(
        `${EkuboCLVault.name}: getSwapInfoToHandleUnused => considerRebalance: true`
      );
      const tvl = await this.getTVL();
      token0Bal = token0Bal.plus(tvl.token0.amount.toString());
      token1Bal = token1Bal.plus(tvl.token1.amount.toString());
    } else {
      logger.verbose(
        `${EkuboCLVault.name}: getSwapInfoToHandleUnused => considerRebalance: false`
      );
    }
    logger.verbose(
      `${
        EkuboCLVault.name
      }: getSwapInfoToHandleUnused => token0Bal: ${token0Bal.toString()}, token1Bal: ${token1Bal.toString()}`
    );

    // get expected amounts for liquidity
    let ekuboBounds: EkuboBounds;
    if (newBounds) {
      ekuboBounds = newBounds;
    } else if (considerRebalance) {
      ekuboBounds = await this.getNewBounds();
    } else {
      ekuboBounds = await this.getCurrentBounds();
    }
    logger.verbose(
      `${EkuboCLVault.name}: getSwapInfoToHandleUnused => newBounds: ${ekuboBounds.lowerTick}, ${ekuboBounds.upperTick}`
    );

    // assert bounds are valid
    this.assertValidBounds(ekuboBounds);

    return await this.getSwapInfoGivenAmounts(
      poolKey,
      token0Bal,
      token1Bal,
      ekuboBounds,
      maxIterations,
      priceRatioPrecision
    );
  }

  assertValidBounds(bounds: EkuboBounds) {
    // Ensure bounds are valid
    assert(
      bounds.lowerTick < bounds.upperTick,
      `Invalid bounds: lowerTick (${bounds.lowerTick}) must be less than upperTick (${bounds.upperTick})`
    );
    assert(Number(bounds.lowerTick) % Number(this.poolKey?.tick_spacing) === 0, `Lower tick (${bounds.lowerTick}) must be a multiple of tick spacing (${this.poolKey?.tick_spacing})`);
    assert(Number(bounds.upperTick) % Number(this.poolKey?.tick_spacing) === 0, `Upper tick (${bounds.upperTick}) must be a multiple of tick spacing (${this.poolKey?.tick_spacing})`);
  }

  // Helper to check for invalid states:
    // Throws if both tokens are decreased or both are increased, which is not expected
  assertValidAmounts(
      expectedAmounts: any,
      token0Bal: Web3Number,
      token1Bal: Web3Number
    ) {
    if (
      expectedAmounts.amount0.lessThan(token0Bal) &&
      expectedAmounts.amount1.lessThan(token1Bal)
    ) {
      throw new Error("Both tokens are decreased, something is wrong");
    }
    if (
      expectedAmounts.amount0.greaterThan(token0Bal) &&
      expectedAmounts.amount1.greaterThan(token1Bal)
    ) {
      throw new Error("Both tokens are increased, something is wrong");
    }
  }

      // Helper to determine which token to sell, which to buy, and the amounts to use
  getSwapParams(
    expectedAmounts: any,
    poolKey: EkuboPoolKey,
    token0Bal: Web3Number,
    token1Bal: Web3Number
  ) {
    // Decide which token to sell based on which expected amount is less than the balance
    const tokenToSell = expectedAmounts.amount0.lessThan(token0Bal)
      ? poolKey.token0
      : poolKey.token1;
    // The other token is the one to buy
    const tokenToBuy =
      tokenToSell == poolKey.token0 ? poolKey.token1 : poolKey.token0;
    // Calculate how much to sell
    const amountToSell =
      tokenToSell == poolKey.token0
        ? token0Bal.minus(expectedAmounts.amount0)
        : token1Bal.minus(expectedAmounts.amount1);
    if (amountToSell.eq(0)) {
      throw new Error(
        `No amount to sell for ${tokenToSell.address}`
      );
    }
    // The remaining amount of the sold token after swap
    const remainingSellAmount =
      tokenToSell == poolKey.token0
        ? expectedAmounts.amount0
        : expectedAmounts.amount1;
    return { tokenToSell, tokenToBuy, amountToSell, remainingSellAmount };
  }

  /**
   * @description Calculates swap info based on given amounts of token0 and token1
   * Use token0 and token1 balances to determine the expected amounts for new bounds
   * @param poolKey 
   * @param token0Bal 
   * @param token1Bal 
   * @param bounds // new bounds
   * @param maxIterations 
   * @returns {Promise<SwapInfo>}
   * 
   */
  async getSwapInfoGivenAmounts(
    poolKey: EkuboPoolKey,
    token0Bal: Web3Number,
    token1Bal: Web3Number,
    bounds: EkuboBounds,
    maxIterations: number = 20,
    priceRatioPrecision: number = 4
  ): Promise<SwapInfo> {
    logger.verbose(
      `${
        EkuboCLVault.name
      }: getSwapInfoGivenAmounts::pre => token0Bal: ${token0Bal.toString()}, token1Bal: ${token1Bal.toString()}`
    );

    // Compute the expected amounts of token0 and token1 for the given liquidity bounds
    let expectedAmounts = await this._getExpectedAmountsForLiquidity(
      token0Bal,
      token1Bal,
      bounds
    );
    logger.verbose(
      `${
        EkuboCLVault.name
      }: getSwapInfoToHandleUnused => expectedAmounts2: ${expectedAmounts.amount0.toString()}, ${expectedAmounts.amount1.toString()}`
    );

    let retry = 0;
    const maxRetry = maxIterations;

    // Main retry loop: attempts to find a swap that matches the expected ratio within tolerance
    while (retry < maxRetry) {
      retry++;
      logger.verbose(
        `getSwapInfoGivenAmounts::Retry attempt: ${retry}/${maxRetry}`
      );

      // Ensure the expected amounts are valid for swap logic
      this.assertValidAmounts(expectedAmounts, token0Bal, token1Bal);

      // Get swap parameters for this iteration
      const { tokenToSell, tokenToBuy, amountToSell, remainingSellAmount } =
        this.getSwapParams(expectedAmounts, poolKey, token0Bal, token1Bal);

      const tokenToBuyInfo = await Global.getTokenInfoFromAddr(tokenToBuy);
      const expectedRatio = expectedAmounts.ratio;

      logger.verbose(
        `${EkuboCLVault.name}: getSwapInfoToHandleUnused => iteration info: ${JSON.stringify({
          tokenToSell: tokenToSell.address,
          tokenToBuy: tokenToBuy.address,
          amountToSell: amountToSell.toString(),
          remainingSellAmount: remainingSellAmount.toString(),
          expectedRatio: expectedRatio
      })}`);

      // If nothing to sell, return a zero swap
      if (amountToSell.eq(0)) {
        return AvnuWrapper.buildZeroSwap(tokenToSell, this.address.address);
      }

      // Get a quote for swapping the calculated amount
      const quote = await this.avnu.getQuotes(
        tokenToSell.address,
        tokenToBuy.address,
        amountToSell.toWei(),
        this.address.address
      );

      // If all of the token is to be swapped, return the swap info directly
      if (remainingSellAmount.eq(0)) {
        const minAmountOut = Web3Number.fromWei(
          quote.buyAmount.toString(),
          tokenToBuyInfo.decimals
        ).multipliedBy(0.9999);
        return await this.avnu.getSwapInfo(
          quote,
          this.address.address,
          0,
          this.address.address,
          minAmountOut.toWei()
        );
      }

      // Raw amount out
      const amountOut = Web3Number.fromWei(
        quote.buyAmount.toString(),
        tokenToBuyInfo.decimals
      );
      logger.verbose(
        `${EkuboCLVault.name}: getSwapInfoToHandleUnused => amountOut: ${amountOut.toString()}`
      );
      // Calculate the swap price depending on which token is being sold
      // price is token1 / token0
      const swapPrice =
        tokenToSell == poolKey.token0
          ? amountOut.dividedBy(amountToSell)
          : amountToSell.dividedBy(amountOut);
      // Calculate the new ratio after the swap
      const newRatio =
        tokenToSell == poolKey.token0
          ? remainingSellAmount.dividedBy(token1Bal.plus(amountOut))
          : token0Bal.plus(amountOut).dividedBy(remainingSellAmount);

      logger.verbose(`${EkuboCLVault.name} getSwapInfoToHandleUnused => iter post calc: ${JSON.stringify({
          amountOut: amountOut.toString(),
          swapPrice: swapPrice.toString(),
          newRatio: newRatio.toString(),
        })}`
      );

      // If the new ratio is not within tolerance, adjust expected amounts and retry
      const expectedPrecision = Math.min(priceRatioPrecision); // e.g 7 for STRK, 4 for USDC
      const isWithInTolerance =
        Number(newRatio.toString()) <=
        expectedRatio * (1 + 1 / 10 ** expectedPrecision) &&
        Number(newRatio.toString()) >= expectedRatio * (1 - 1 / 10 ** expectedPrecision);
      const currentPrecision = (expectedRatio - Number(newRatio.toString())) / expectedRatio;
      logger.verbose(
        `${EkuboCLVault.name}: getSwapInfoToHandleUnused => isWithInTolerance: ${isWithInTolerance}, currentPrecision: ${currentPrecision.toString()}, expectedPrecision: ${expectedPrecision}`
      );
      if (
        !isWithInTolerance
      ) {
        const expectedAmountsNew = await this._solveExpectedAmountsEq(
          token0Bal,
          token1Bal,
          new Web3Number(Number(expectedRatio).toFixed(13), 18),
          Number(swapPrice.toString())
        );
        logger.verbose(
          `${
            EkuboCLVault.name
          }: getSwapInfoToHandleUnused => expectedAmounts: ${expectedAmountsNew.amount0.toString()}, ${expectedAmountsNew.amount1.toString()}`
        );
        if (expectedAmountsNew.amount0.eq(expectedAmounts.amount0.toString()) && expectedAmountsNew.amount1.eq(expectedAmounts.amount1.toString())) {
          // If the expected amounts did not change, we are stuck in a loop
          logger.error(
            `getSwapInfoGivenAmounts: stuck in loop, expected amounts did not change`
          );
          throw new Error("Stuck in loop, expected amounts did not change");
        }
        expectedAmounts = expectedAmountsNew;
      } else {
        // Otherwise, return the swap info with a slippage buffer
        const minAmountOut = Web3Number.fromWei(
          quote.buyAmount.toString(),
          tokenToBuyInfo.decimals
        ).multipliedBy(0.9999);
        const output = await this.avnu.getSwapInfo(
          quote,
          this.address.address,
          0,
          this.address.address,
          minAmountOut.toWei()
        );
        logger.verbose(
          `${EkuboCLVault.name}: getSwapInfoToHandleUnused => swap info found: ${JSON.stringify(output)}`
        );
        return output;
      }
    }

    // If no suitable swap found after max retries, throw error
    throw new Error("Failed to get swap info");
  }

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
  async rebalanceIter(
    swapInfo: SwapInfo,
    acc: Account,
    estimateCall: (swapInfo: SwapInfo) => Promise<Call[]>,
    isSellTokenToken0 = true,
    retry = 0,
    lowerLimit = 0n,
    upperLimit = 0n,
    MAX_RETRIES = 40
  ): Promise<Call[]> {

    logger.verbose(
      `Rebalancing ${this.metadata.name}: ` +
        `retry=${retry}, lowerLimit=${lowerLimit}, upperLimit=${upperLimit}, isSellTokenToken0=${isSellTokenToken0}`
    );

    const fromAmount = uint256.uint256ToBN(swapInfo.token_from_amount);
    logger.verbose(
      `Selling ${fromAmount.toString()} of token ${swapInfo.token_from_address}`
    );

    try {
      const calls = await estimateCall(swapInfo);
      await acc.estimateInvokeFee(calls);
      return calls;
    } catch (err: any) {
      if (retry >= MAX_RETRIES) {
        logger.error(`Rebalance failed after ${MAX_RETRIES} retries`);
        throw err;
      }

      logger.error(
        `Rebalance attempt ${retry + 1} failed, adjusting swap amount...`
      );

      const newSwapInfo = { ...swapInfo };
      const currentAmount = Web3Number.fromWei(fromAmount.toString(), 18); // 18 is ok, as its toWei eventually anyways
      logger.verbose(`Current amount: ${currentAmount.toString()}`);
      if (
        err.message.includes("invalid token0 balance") ||
        err.message.includes("invalid token0 amount")
      ) {
        if (!isSellTokenToken0) {
          logger.verbose("Reducing swap amount - excess token0");
          let nextAmount = (fromAmount + lowerLimit) / 2n;
          upperLimit = fromAmount;
          if (nextAmount <= lowerLimit) {
            logger.error("Convergence failed: nextAmount <= lowerLimit");
            throw err;
          }
          newSwapInfo.token_from_amount = uint256.bnToUint256(nextAmount);
        } else {
          logger.verbose("Increasing swap amount - deficit token0");
          let nextAmount = (fromAmount + upperLimit) / 2n;
          if (upperLimit == 0n) {
            nextAmount = fromAmount * 2n;
          }
          lowerLimit = fromAmount;
          if (upperLimit != 0n && nextAmount >= upperLimit) {
            logger.error("Convergence failed: nextAmount >= upperLimit");
            throw err;
          }
          newSwapInfo.token_from_amount = uint256.bnToUint256(nextAmount);
        }
      } else if (
        err.message.includes("invalid token1 amount") ||
        err.message.includes("invalid token1 balance")
      ) {
        if (isSellTokenToken0) {
          logger.verbose("Reducing swap amount - excess token1");
          let nextAmount = (fromAmount + lowerLimit) / 2n;
          upperLimit = fromAmount;
          if (nextAmount <= lowerLimit) {
            logger.error("Convergence failed: nextAmount <= lowerLimit");
            throw err;
          }
          newSwapInfo.token_from_amount = uint256.bnToUint256(nextAmount);
        } else {
          logger.verbose("Increasing swap amount - deficit token1");
          let nextAmount = (fromAmount + upperLimit) / 2n;
          if (upperLimit == 0n) {
            nextAmount = fromAmount * 2n;
          }
          lowerLimit = fromAmount;
          if (upperLimit != 0n && nextAmount >= upperLimit) {
            logger.error("Convergence failed: nextAmount >= upperLimit");
            throw err;
          }
          newSwapInfo.token_from_amount = uint256.bnToUint256(nextAmount);
        }
      } else {
        logger.error("Unexpected error:", err);
        throw err;
      }
      newSwapInfo.token_to_min_amount = uint256.bnToUint256("0");
      return this.rebalanceIter(
        newSwapInfo,
        acc,
        estimateCall,
        isSellTokenToken0,
        retry + 1,
        lowerLimit,
        upperLimit
      );
    }
  }

  static tickToi129(tick: number) {
    if (tick < 0) {
      return {
        mag: -tick,
        sign: 1,
      };
    } else {
      return {
        mag: tick,
        sign: 0,
      };
    }
  }

  static priceToSqrtRatio(price: number) {
    return (
      (BigInt(Math.floor(Math.sqrt(price) * 10 ** 9)) * BigInt(2 ** 128)) /
      BigInt(1e9)
    );
  }

  static i129ToNumber(i129: { mag: bigint; sign: 0 | 1 | "true" | "false" }): bigint {
    if (i129.sign == 0 || i129.sign == 1) {
      return EkuboCLVault.i129ToNumber({mag: i129.mag, sign: i129.sign == 1 ? "true" : "false"});
    }
    assert(i129.sign.toString() == 'false' || i129.sign.toString() == 'true', "Invalid sign value");
    return i129.mag * (i129.sign.toString() == "false" ? 1n : -1n);
  }

  static tickToPrice(tick: bigint) {
    return Math.pow(1.000001, Number(tick));
  }

  async getLiquidityToAmounts(
    liquidity: Web3Number,
    bounds: EkuboBounds,
    blockIdentifier: BlockIdentifier = "pending",
    _poolKey: EkuboPoolKey | null = null,
    _currentPrice: {
      price: number;
      tick: number;
      sqrtRatio: string;
    } | null = null
  ) {
    const currentPrice =
      _currentPrice || (await this.getCurrentPrice(blockIdentifier));
    const lowerPrice = EkuboCLVault.tickToPrice(bounds.lowerTick);
    const upperPrice = EkuboCLVault.tickToPrice(bounds.upperTick);
    logger.verbose(
      `${EkuboCLVault.name}: getLiquidityToAmounts => currentPrice: ${currentPrice.price}, lowerPrice: ${lowerPrice}, upperPrice: ${upperPrice}`
    );
    const result: any = await this.ekuboMathContract.call(
      "liquidity_delta_to_amount_delta",
      [
        uint256.bnToUint256(currentPrice.sqrtRatio),
        {
          mag: liquidity.toWei(),
          sign: 0,
        },
        uint256.bnToUint256(
          EkuboCLVault.priceToSqrtRatio(lowerPrice).toString()
        ),
        uint256.bnToUint256(
          EkuboCLVault.priceToSqrtRatio(upperPrice).toString()
        ),
      ] as any,
      {
        blockIdentifier,
      }
    );
    const poolKey = _poolKey || (await this.getPoolKey(blockIdentifier));
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const amount0 = Web3Number.fromWei(
      EkuboCLVault.i129ToNumber(result.amount0).toString(),
      token0Info.decimals
    );
    const amount1 = Web3Number.fromWei(
      EkuboCLVault.i129ToNumber(result.amount1).toString(),
      token1Info.decimals
    );

    return {
      amount0,
      amount1,
    };
  }

  async harvest(acc: Account, maxIterations = 20, priceRatioPrecision = 4): Promise<Call[]> {
    const ekuboHarvests = new EkuboHarvests(this.config);
    const unClaimedRewards = await ekuboHarvests.getUnHarvestedRewards(
      this.address
    );
    const poolKey = await this.getPoolKey();
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const bounds = await this.getCurrentBounds();
    logger.verbose(
      `${EkuboCLVault.name}: harvest => unClaimedRewards: ${unClaimedRewards.length}`
    );
    const calls: Call[] = [];
    for (let claim of unClaimedRewards) {
      const fee = claim.claim.amount
        .multipliedBy(this.metadata.additionalInfo.feeBps)
        .dividedBy(10000);
      const postFeeAmount = claim.claim.amount.minus(fee);

      const isToken1 = claim.token.eq(poolKey.token1);
      logger.verbose(
        `${
          EkuboCLVault.name
        }: harvest => Processing claim, isToken1: ${isToken1} amount: ${postFeeAmount.toWei()}`
      );

      // todo what if the claim token is neither token0 or token1
      const token0Amt = isToken1
        ? new Web3Number(0, token0Info.decimals)
        : postFeeAmount;
      const token1Amt = isToken1
        ? postFeeAmount
        : new Web3Number(0, token0Info.decimals);
      logger.verbose(
        `${
          EkuboCLVault.name
        }: harvest => token0Amt: ${token0Amt.toString()}, token1Amt: ${token1Amt.toString()}`
      );

      const swapInfo = await this.getSwapInfoGivenAmounts(
        poolKey,
        token0Amt,
        token1Amt,
        bounds,
        maxIterations,
        priceRatioPrecision
      );
      swapInfo.token_to_address = token0Info.address.address;
      logger.verbose(
        `${EkuboCLVault.name}: harvest => swapInfo: ${JSON.stringify(swapInfo)}`
      );

      logger.verbose(
        `${EkuboCLVault.name}: harvest => claim: ${JSON.stringify(claim)}`
      );
      const harvestEstimateCall = async (swapInfo1: SwapInfo) => {
        const swap1Amount = Web3Number.fromWei(
          uint256.uint256ToBN(swapInfo1.token_from_amount).toString(),
          18 // cause its always STRK?
        );
        logger.verbose(
          `${EkuboCLVault.name}: harvest => swap1Amount: ${swap1Amount}`
        );
        const remainingAmount = postFeeAmount.minus(swap1Amount);
        logger.verbose(
          `${EkuboCLVault.name}: harvest => remainingAmount: ${remainingAmount}`
        );
        const swapInfo2 = {
          ...swapInfo,
          token_from_amount: uint256.bnToUint256(remainingAmount.toWei()),
        };
        swapInfo2.token_to_address = token1Info.address.address;
        logger.verbose(
          `${EkuboCLVault.name}: harvest => swapInfo: ${JSON.stringify(
            swapInfo
          )}`
        );
        logger.verbose(
          `${EkuboCLVault.name}: harvest => swapInfo2: ${JSON.stringify(
            swapInfo2
          )}`
        );
        const calldata = [
          claim.rewardsContract.address,
          {
            id: claim.claim.id,
            amount: claim.claim.amount.toWei(),
            claimee: claim.claim.claimee.address,
          },
          claim.proof.map((p) => num.getDecimalString(p)),
          swapInfo,
          swapInfo2,
        ];
        logger.verbose(
          `${EkuboCLVault.name}: harvest => calldata: ${JSON.stringify(
            calldata
          )}`
        );
        return [this.contract.populate("harvest", calldata)];
      };
      const _callsFinal = await this.rebalanceIter(
        swapInfo,
        acc,
        harvestEstimateCall
      );
      logger.verbose(
        `${EkuboCLVault.name}: harvest => _callsFinal: ${JSON.stringify(
          _callsFinal
        )}`
      );
      calls.push(..._callsFinal);
    }
    return calls;
  }

  async getInvestmentFlows() {
    const netYield = await this.netAPY();
    const poolKey = await this.getPoolKey();

    const linkedFlow: IInvestmentFlow = {
      title: this.metadata.name,
      subItems: [
        {
          key: "Pool",
          value: `${(
            EkuboCLVault.div2Power128(BigInt(poolKey.fee)) * 100
          ).toFixed(2)}%, ${poolKey.tick_spacing} tick spacing`,
        },
      ],
      linkedFlows: [],
      style: { backgroundColor: FlowChartColors.Blue.valueOf() },
    };

    const baseFlow: IInvestmentFlow = {
      id: "base",
      title: "Your Deposit",
      subItems: [
        { key: `Net yield`, value: `${(netYield * 100).toFixed(2)}%` },
        {
          key: `Performance Fee`,
          value: `${(this.metadata.additionalInfo.feeBps / 100).toFixed(2)}%`,
        },
      ],
      linkedFlows: [linkedFlow],
      style: { backgroundColor: FlowChartColors.Purple.valueOf() },
    };

    const rebalanceFlow: IInvestmentFlow = {
      id: "rebalance",
      title: "Automated Rebalance",
      subItems: [
        {
          key: "Range selection",
          value: (typeof this.metadata.additionalInfo.newBounds == 'string') ? 
          this.metadata.additionalInfo.newBounds : 
          `${
            this.metadata.additionalInfo.newBounds.lower *
            Number(poolKey.tick_spacing)
          } to ${
            this.metadata.additionalInfo.newBounds.upper *
            Number(poolKey.tick_spacing)
          } ticks`,
        },
      ],
      linkedFlows: [linkedFlow],
      style: { backgroundColor: FlowChartColors.Green.valueOf() },
    };

    return [baseFlow, rebalanceFlow];
  }
}

const _description =
  "Deploys your {{POOL_NAME}} into an Ekubo liquidity pool, automatically rebalancing positions around the current price to optimize yield and reduce the need for manual adjustments. Trading fees and DeFi Spring rewards are automatically compounded back into the strategy. In return, you receive an ERC-20 token representing your share of the strategy";
const _protocol: IProtocol = {
  name: "Ekubo",
  logo: "https://app.ekubo.org/favicon.ico",
};
// need to fine tune better
const _riskFactor: RiskFactor[] = [
  { type: RiskType.SMART_CONTRACT_RISK, value: 0.5, weight: 34, reason: "Audited smart contracts" },
  { type: RiskType.IMPERMANENT_LOSS, value: 0.75, weight: 33, reason: "Low risk due to co-related assets" },
  { type: RiskType.MARKET_RISK, value: 0.75, weight: 33, reason: "Low risk due to co-related assets" },
];

const _riskFactorStable: RiskFactor[] = [
  { type: RiskType.SMART_CONTRACT_RISK, value: 0.5, weight: 25 },
];
const AUDIT_URL =
  "https://assets.troves.fi/strkfarm/audit_report_vesu_and_ekubo_strats.pdf";

const faqs: FAQ[] = [
  {
    question: "What is the Ekubo CL Vault strategy?",
    answer:
      "The Ekubo CL Vault strategy deploys your assets into an Ekubo liquidity pool, automatically rebalancing positions around the current price to optimize yield and reduce manual adjustments.",
  },
  {
    question: "How are trading fees and rewards handled?",
    answer:
      "Trading fees and DeFi Spring rewards are automatically compounded back into the strategy, increasing your overall returns.",
  },
  {
    question: "What happens during withdrawal?",
    answer:
      "During withdrawal, you may receive either or both tokens depending on market conditions and prevailing prices.",
  },
  {
    question: "Is the strategy audited?",
    answer: (
      <div>
        Yes, the strategy has been audited. You can review the audit report in
        our docs{" "}
        <a
          href="https://docs.troves.fi/p/ekubo-cl-vaults#technical-details"
          style={{ textDecoration: "underline", marginLeft: "5px" }}
        >
          Here
        </a>
        .
      </div>
    ),
  },
];

const xSTRKSTRK: IStrategyMetadata<CLVaultStrategySettings> = {
  name: "Ekubo xSTRK/STRK",
  description: <></>,
  address: ContractAddr.from(
    "0x01f083b98674bc21effee29ef443a00c7b9a500fd92cf30341a3da12c73f2324"
  ),
  launchBlock: 1209881,
  type: "Other",
  // must be same order as poolKey token0 and token1
  depositTokens: [
    Global.getDefaultTokens().find((t) => t.symbol === "xSTRK")!,
    Global.getDefaultTokens().find((t) => t.symbol === "STRK")!,
  ],
  protocols: [_protocol],
  auditUrl: AUDIT_URL,
  maxTVL: Web3Number.fromWei("0", 18),
  risk: {
    riskFactor: _riskFactor,
    netRisk:
      _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) /
      _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
    notARisks: getNoRiskTags(_riskFactor),
  },
  apyMethodology:
    "APY based on 7-day historical performance, including fees and rewards.",
  additionalInfo: {
    newBounds: {
      lower: -1,
      upper: 1,
    },
    lstContract: ContractAddr.from(
      "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a"
    ),
    feeBps: 1000,
    rebalanceConditions: {
      customShouldRebalance: async (currentPrice: number) => true,
      minWaitHours: 24,
      direction: "uponly",
    },
  },
  faqs: [
    ...faqs,
    {
      question: "Why might I see a negative APY?",
      answer:
        "A negative APY can occur when xSTRK's price drops on DEXes. This is usually temporary and tends to recover within a few days or a week.",
    },
  ],
  points: [{
    multiplier: 1, 
    logo: 'https://endur.fi/favicon.ico',
    toolTip: "This strategy holds xSTRK and STRK tokens. Earn 1x Endur points on your xSTRK portion of Liquidity. STRK portion will earn Endur's DEX Bonus points. Points can be found on endur.fi.",
  }],
  contractDetails: [],
  investmentSteps: []
};

/**
 * Represents the Vesu Rebalance Strategies.
 */
export const EkuboCLVaultStrategies: IStrategyMetadata<CLVaultStrategySettings>[] =
  [
    xSTRKSTRK,
    {
      ...xSTRKSTRK,
      name: "Ekubo USDC/USDT",
      description: <></>,
      address: ContractAddr.from(
        "0xd647ed735f0db52f2a5502b6e06ed21dc4284a43a36af4b60d3c80fbc56c91"
      ),
      launchBlock: 1385576,
      // must be same order as poolKey token0 and token1
      depositTokens: [
        Global.getDefaultTokens().find((t) => t.symbol === "USDC")!,
        Global.getDefaultTokens().find((t) => t.symbol === "USDT")!,
      ],
      additionalInfo: {
        newBounds: {
          lower: -1,
          upper: 1,
        },
        truePrice: 1,
        feeBps: 1000,
        rebalanceConditions: {
          customShouldRebalance: async (currentPrice: number) =>
            currentPrice > 0.99 && currentPrice < 1.01,
          minWaitHours: 6,
          direction: "any",
        },
      },
    },
    {
      ...xSTRKSTRK,
      name: "Ekubo STRK/USDC",
      description: <></>,
      address: ContractAddr.from(
        "0xb7bd37121041261446d8eedec618955a4490641034942da688e8cbddea7b23"
      ),
      launchBlock: 1492136,
      // must be same order as poolKey token0 and token1
      depositTokens: [
        Global.getDefaultTokens().find((t) => t.symbol === "STRK")!,
        Global.getDefaultTokens().find((t) => t.symbol === "USDC")!,
      ],
      maxTVL: Web3Number.fromWei("0", 6),
      additionalInfo: {
        newBounds: "Managed by Re7",
        feeBps: 1000,
        rebalanceConditions: {
          customShouldRebalance: async (currentPrice: number) =>
            true,
          minWaitHours: 6,
          direction: "any",
        },
      },
    },
];

// auto assign contract details to each strategy
EkuboCLVaultStrategies.forEach((s) => {
  // set contract details
  s.contractDetails = [{
    address: s.address,
    name: "Vault",
    sourceCodeUrl: "https://github.com/strkfarm/strkfarm-contracts/tree/main/src/strategies/cl_vault"
  }, 
  ...COMMON_CONTRACTS];
  // set docs link
  s.docs = "https://docs.troves.fi/p/ekubo-cl-vaults"

  // set description
  s.description = (
    <div>
      <p>{highlightTextWithLinks(
        _description.replace("{{POOL_NAME}}", s.name.split(" ")[1]),
          [{
            highlight: "Ekubo liquidity pool",
            link: "https://app.ekubo.org/positions",
          }, {
            highlight: "DeFi Spring rewards",
            link: "https://defispring.starknet.io/"
          }, {
            highlight: "ERC-20 token",
            link: "https://www.investopedia.com/news/what-erc20-and-what-does-it-mean-ethereum/"
          }]
        )}
      </p>
      <div style={{padding: '16px 16px', background: 'var(--chakra-colors-mycard_light)', marginTop: '16px', borderRadius: '16px'}}>
        <h4 style={{fontWeight: 'bold'}}>Key points to note:</h4>
        <div style={{display: "flex", flexDirection: "column", gap: "10px", color: 'var(--chakra-colors-text_secondary)'}}>
          <p style={{}}>1. During withdrawal, you may receive either or both tokens depending
          on market conditions and prevailing prices.</p>
          {s.name.includes('xSTRK/STRK') && <p style={{}}>
              2. Sometimes you might see a negative APY — this is usually not a big
              deal. It happens when xSTRK's price drops on DEXes, but things
              typically bounce back within a few days or a week.
          </p>}
        </div>
      </div>
    </div>
  );

  // add investment steps
  s.investmentSteps = [
    "Supply tokens to Ekubo's pool",
    "Monitor and Rebalance position to optimize yield",
    "Harvest and supply Defi Spring STRK rewards every week (Auto-compound)",
  ]
});