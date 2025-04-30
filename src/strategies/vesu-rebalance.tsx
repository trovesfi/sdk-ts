import { ContractAddr, Web3Number } from "@/dataTypes";
import {
  FlowChartColors,
  getNoRiskTags,
  IConfig,
  IInvestmentFlow,
  IProtocol,
  IStrategyMetadata,
  RiskFactor,
  RiskType
} from "@/interfaces";
import { AvnuWrapper, Pricer, SwapInfo } from "@/modules";
import { Account, CairoCustomEnum, Contract, num, uint256 } from "starknet";
import VesuRebalanceAbi from "@/data/vesu-rebalance.abi.json";
import { Global, logger } from "@/global";
import { assert } from "@/utils";
import axios from "axios";
import { PricerBase } from "@/modules/pricerBase";
import {
  BaseStrategy,
  SingleActionAmount,
  SingleTokenInfo
} from "./base-strategy";
import { getAPIUsingHeadlessBrowser } from "@/node/headless";
import { VesuHarvests } from "@/modules/harvests";
import VesuPoolIDs from "@/data/vesu_pools.json";

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

export interface VesuRebalanceSettings {
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
export class VesuRebalance extends BaseStrategy<
  SingleTokenInfo,
  SingleActionAmount
> {
  /** Contract address of the strategy */
  readonly address: ContractAddr;
  /** Pricer instance for token price calculations */
  readonly pricer: PricerBase;
  /** Metadata containing strategy information */
  readonly metadata: IStrategyMetadata<VesuRebalanceSettings>;
  /** Contract instance for interacting with the strategy */
  readonly contract: Contract;
  readonly BASE_WEIGHT = 10000; // 10000 bps = 100%

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
    metadata: IStrategyMetadata<VesuRebalanceSettings>
  ) {
    super(config);
    this.pricer = pricer;

    assert(
      metadata.depositTokens.length === 1,
      "VesuRebalance only supports 1 deposit token"
    );
    this.metadata = metadata;
    this.address = metadata.address;

    this.contract = new Contract(
      VesuRebalanceAbi,
      this.address.address,
      this.config.provider
    );
  }

  /**
   * Creates a deposit call to the strategy contract.
   * @param assets - Amount of assets to deposit
   * @param receiver - Address that will receive the strategy tokens
   * @returns Populated contract call for deposit
   */
  async depositCall(amountInfo: SingleActionAmount, receiver: ContractAddr) {
    // Technically its not erc4626 abi, but we just need approve call
    // so, its ok to use it
    assert(
      amountInfo.tokenInfo.address.eq(this.asset().address),
      "Deposit token mismatch"
    );
    const assetContract = new Contract(
      VesuRebalanceAbi,
      this.asset().address.address,
      this.config.provider
    );
    const call1 = assetContract.populate("approve", [
      this.address.address,
      uint256.bnToUint256(amountInfo.amount.toWei())
    ]);
    const call2 = this.contract.populate("deposit", [
      uint256.bnToUint256(amountInfo.amount.toWei()),
      receiver.address
    ]);
    return [call1, call2];
  }

  /**
   * Creates a withdrawal call to the strategy contract.
   * @param assets - Amount of assets to withdraw
   * @param receiver - Address that will receive the withdrawn assets
   * @param owner - Address that owns the strategy tokens
   * @returns Populated contract call for withdrawal
   */
  async withdrawCall(
    amountInfo: SingleActionAmount,
    receiver: ContractAddr,
    owner: ContractAddr
  ) {
    return [
      this.contract.populate("withdraw", [
        uint256.bnToUint256(amountInfo.amount.toWei()),
        receiver.address,
        owner.address
      ])
    ];
  }

  /**
   * Returns the underlying asset token of the strategy.
   * @returns The deposit token supported by this strategy
   */
  asset() {
    return this.metadata.depositTokens[0];
  }

  /**
   * Returns the number of decimals used by the strategy token.
   * @returns Number of decimals (same as the underlying token)
   */
  decimals() {
    return this.metadata.depositTokens[0].decimals; // same as underlying token
  }

  /**
   * Calculates the Total Value Locked (TVL) for a specific user.
   * @param user - Address of the user
   * @returns Object containing the amount in token units and USD value
   */
  async getUserTVL(user: ContractAddr) {
    const shares = await this.contract.balanceOf(user.address);
    const assets = await this.contract.convert_to_assets(
      uint256.bnToUint256(shares)
    );
    const amount = Web3Number.fromWei(
      assets.toString(),
      this.metadata.depositTokens[0].decimals
    );
    let price = await this.pricer.getPrice(
      this.metadata.depositTokens[0].symbol
    );
    const usdValue = Number(amount.toFixed(6)) * price.price;
    return {
      tokenInfo: this.asset(),
      amount,
      usdValue
    };
  }

  /**
   * Calculates the total TVL of the strategy.
   * @returns Object containing the total amount in token units and USD value
   */
  async getTVL() {
    const assets = await this.contract.total_assets();
    const amount = Web3Number.fromWei(
      assets.toString(),
      this.metadata.depositTokens[0].decimals
    );
    let price = await this.pricer.getPrice(
      this.metadata.depositTokens[0].symbol
    );
    const usdValue = Number(amount.toFixed(6)) * price.price;
    return {
      tokenInfo: this.asset(),
      amount,
      usdValue
    };
  }

  static async getAllPossibleVerifiedPools(asset: ContractAddr) {
    const data = await getAPIUsingHeadlessBrowser("https://api.vesu.xyz/pools");
    const verifiedPools = data.data.filter((d: any) => d.isVerified);
    const pools = verifiedPools
      .map((p: any) => {
        const hasMyAsset = p.assets.find((a: any) => asset.eqString(a.address));
        if (hasMyAsset) {
          return {
            pool_id: ContractAddr.from(p.id),
            max_weight: 10000,
            v_token: ContractAddr.from(hasMyAsset.vToken.address),
            name: p.name
          };
        }
        return null;
      })
      .filter((p: PoolProps | null) => p !== null);
    return pools;
  }

  async getPoolInfo(
    p: PoolProps,
    pools: any[],
    vesuPositions: any[],
    totalAssets: Web3Number,
    isErrorPositionsAPI: boolean,
    isErrorPoolsAPI: boolean
  ) {
    const vesuPosition = vesuPositions.find(
      (d: any) =>
        d.pool.id.toString() ===
        num.getDecimalString(p.pool_id.address.toString())
    );
    const _pool = pools.find((d: any) => {
      logger.verbose(
        `pool check: ${
          d.id == num.getDecimalString(p.pool_id.address.toString())
        }, id: ${d.id}, pool_id: ${num.getDecimalString(
          p.pool_id.address.toString()
        )}`
      );
      return d.id == num.getDecimalString(p.pool_id.address.toString());
    });
    logger.verbose(`pool: ${JSON.stringify(_pool)}`);
    logger.verbose(typeof _pool);
    logger.verbose(`name: ${_pool?.name}`);
    const name = _pool?.name;
    logger.verbose(
      `name2: ${name}, ${!name ? true : false}, ${name?.length}, ${typeof name}`
    );
    const assetInfo = _pool?.assets.find((d: any) =>
      this.asset().address.eqString(d.address)
    );
    if (!name) {
      logger.verbose(`Pool not found`);
      throw new Error(`Pool name ${p.pool_id.address.toString()} not found`);
    }
    if (!assetInfo) {
      throw new Error(
        `Asset ${this.asset().address.toString()} not found in pool ${p.pool_id.address.toString()}`
      );
    }
    let vTokenContract = new Contract(
      VesuRebalanceAbi,
      p.v_token.address,
      this.config.provider
    );
    const bal = await vTokenContract.balanceOf(this.address.address);
    const assets = await vTokenContract.convert_to_assets(
      uint256.bnToUint256(bal.toString())
    );
    logger.verbose(`Collateral: ${JSON.stringify(vesuPosition?.collateral)}`);
    logger.verbose(`supplyApy: ${JSON.stringify(assetInfo?.stats.supplyApy)}`);
    logger.verbose(
      `defiSpringSupplyApr: ${JSON.stringify(
        assetInfo?.stats.defiSpringSupplyApr
      )}`
    );
    logger.verbose(
      `currentUtilization: ${JSON.stringify(
        assetInfo?.stats.currentUtilization
      )}`
    );
    logger.verbose(
      `maxUtilization: ${JSON.stringify(assetInfo?.config.maxUtilization)}`
    );
    const item = {
      pool_id: p.pool_id,
      pool_name: _pool?.name,
      max_weight: p.max_weight,
      current_weight:
        isErrorPositionsAPI || !vesuPosition
          ? 0
          : Number(
              Web3Number.fromWei(vesuPosition.collateral.value, this.decimals())
                .dividedBy(totalAssets.toString())
                .toFixed(6)
            ),
      v_token: p.v_token,
      amount: Web3Number.fromWei(assets.toString(), this.decimals()),
      usdValue:
        isErrorPositionsAPI || !vesuPosition
          ? Web3Number.fromWei("0", this.decimals())
          : Web3Number.fromWei(
              vesuPosition.collateral.usdPrice.value,
              vesuPosition.collateral.usdPrice.decimals
            ),
      APY:
        isErrorPoolsAPI || !assetInfo
          ? {
              baseApy: 0,
              defiSpringApy: 0,
              netApy: 0
            }
          : {
              baseApy: Number(
                Web3Number.fromWei(
                  assetInfo.stats.supplyApy.value,
                  assetInfo.stats.supplyApy.decimals
                ).toFixed(6)
              ),
              defiSpringApy: assetInfo.stats.defiSpringSupplyApr
                ? Number(
                    Web3Number.fromWei(
                      assetInfo.stats.defiSpringSupplyApr.value,
                      assetInfo.stats.defiSpringSupplyApr.decimals
                    ).toFixed(6)
                  )
                : 0,
              netApy: 0
            },
      currentUtilization:
        isErrorPoolsAPI || !assetInfo
          ? 0
          : Number(
              Web3Number.fromWei(
                assetInfo.stats.currentUtilization.value,
                assetInfo.stats.currentUtilization.decimals
              ).toFixed(6)
            ),
      maxUtilization:
        isErrorPoolsAPI || !assetInfo
          ? 0
          : Number(
              Web3Number.fromWei(
                assetInfo.config.maxUtilization.value,
                assetInfo.config.maxUtilization.decimals
              ).toFixed(6)
            )
    };
    item.APY.netApy = item.APY.baseApy + item.APY.defiSpringApy;
    return item;
  }

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
  async getPools() {
    const allowedPools: PoolProps[] = (
      await this.contract.get_allowed_pools()
    ).map((p: any) => ({
      pool_id: ContractAddr.from(p.pool_id),
      max_weight: Number(p.max_weight) / this.BASE_WEIGHT,
      v_token: ContractAddr.from(p.v_token)
    }));

    /*
            Vesu Positions API Response Schema (/positions?walletAddress=):
            {
              "data": [{
                "pool": {
                  "id": string,    // Pool identifier
                  "name": string   // Pool name
                },
                "collateral": {
                  "value": string,           // Amount of collateral in wei
                  "usdPrice": {
                    "value": string,         // USD value in wei
                    "decimals": number       // Decimals for USD value
                  }
                }
              }]
            }

            Vesu Pools API Response Schema (/pools):
            {
              "data": [{
                "id": string,
                "assets": [{
                    "stats": {
                        "supplyApy": {
                            "value": string,
                            "decimals": number
                        },
                        "defiSpringSupplyApr": {
                            "value": string,
                            "decimals": number
                        },
                        "currentUtilization": {
                            "value": string,
                            "decimals": number
                        }
                    },
                    "config": {
                        "maxUtilization": {
                            "value": string,
                            "decimals": number
                        }
                    }
                }],
              }]
            }
        */
    let isErrorPositionsAPI = false;
    let vesuPositions: any[] = [];
    try {
      const data = await getAPIUsingHeadlessBrowser(
        `https://api.vesu.xyz/positions?walletAddress=${this.address.address}`
      );
      vesuPositions = data.data;
    } catch (e) {
      console.error(
        `${VesuRebalance.name}: Error fetching positions for ${this.address.address}`,
        e
      );
      isErrorPositionsAPI = true;
    }

    let { pools, isErrorPoolsAPI } = await this.getVesuPools();

    const totalAssets = (await this.getTVL()).amount;

    const info = allowedPools.map((p) =>
      this.getPoolInfo(
        p,
        pools,
        vesuPositions,
        totalAssets,
        isErrorPositionsAPI,
        isErrorPoolsAPI
      )
    );
    const data = await Promise.all(info);
    return {
      data,
      isErrorPositionsAPI,
      isErrorPoolsAPI,
      isError: isErrorPositionsAPI || isErrorPoolsAPI
    };
  }

  async getVesuPools(
    retry = 0
  ): Promise<{ pools: any[]; isErrorPoolsAPI: boolean }> {
    let isErrorPoolsAPI = false;
    let pools: any[] = [];
    try {
      const data = await getAPIUsingHeadlessBrowser(
        "https://api.vesu.xyz/pools"
      );
      pools = data.data;

      // Vesu API is unstable sometimes, some Pools may be missing sometimes
      for (const pool of VesuPoolIDs.data) {
        const found = pools.find((d: any) => d.id === pool.id);
        if (!found) {
          logger.verbose(`VesuRebalance: pools: ${JSON.stringify(pools)}`);
          logger.verbose(
            `VesuRebalance: Pool ${pool.id} not found in Vesu API, using hardcoded data`
          );
          throw new Error("pool not found [sanity check]");
        }
      }
    } catch (e) {
      logger.error(
        `${VesuRebalance.name}: Error fetching pools for ${this.address.address}, retry ${retry}`,
        e
      );
      isErrorPoolsAPI = true;
      if (retry < 10) {
        await new Promise((resolve) => setTimeout(resolve, 5000 * (retry + 1)));
        return await this.getVesuPools(retry + 1);
      }
    }

    return { pools, isErrorPoolsAPI };
  }

  /**
   * Calculates the weighted average APY across all pools based on USD value.
   * @returns {Promise<number>} The weighted average APY across all pools
   */
  async netAPY(): Promise<number> {
    const { data: pools } = await this.getPools();
    return this.netAPYGivenPools(pools);
  }

  /**
   * Calculates the weighted average APY across all pools based on USD value.
   * @returns {Promise<number>} The weighted average APY across all pools
   */
  async netAPYGivenPools(pools: PoolInfoFull[]): Promise<number> {
    const weightedApyNumerator = pools.reduce((acc: number, curr) => {
      const weight = curr.current_weight;
      return acc + curr.APY.netApy * Number(curr.amount.toString());
    }, 0);
    const totalAssets = (await this.getTVL()).amount;
    const weightedApy = weightedApyNumerator / Number(totalAssets.toString());
    return weightedApy * (1 - this.metadata.additionalInfo.feeBps / 10000);
  }

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
  async getRebalancedPositions(_pools?: PoolInfoFull[]) {
    logger.verbose(`VesuRebalance: getRebalancedPositions`);
    if (!_pools) {
      const { data: _pools2 } = await this.getPools();
      _pools = _pools2;
    }
    const feeDeductions = await this.getFee(_pools);
    logger.verbose(
      `VesuRebalance: feeDeductions: ${JSON.stringify(feeDeductions)}`
    );

    // remove fee from pools
    const pools = _pools.map((p) => {
      const fee =
        feeDeductions.find((f) => p.v_token.eq(f.vToken))?.fee ||
        Web3Number.fromWei("0", this.decimals());
      logger.verbose(
        `FeeAdjustment: ${
          p.pool_id
        } => ${fee.toString()}, amt: ${p.amount.toString()}`
      );
      return {
        ...p,
        amount: p.amount.minus(fee)
      };
    });
    let totalAssets = (await this.getTVL()).amount;
    if (totalAssets.eq(0))
      return {
        changes: [],
        finalPools: []
      };
    // deduct fee from total assets
    feeDeductions.forEach((f) => {
      totalAssets = totalAssets.minus(f.fee);
    });

    // assert sum of pools.amount <= totalAssets
    const sumPools = pools.reduce(
      (acc, curr) => acc.plus(curr.amount.toString()),
      Web3Number.fromWei("0", this.decimals())
    );
    logger.verbose(`Sum of pools: ${sumPools.toString()}`);
    logger.verbose(`Total assets: ${totalAssets.toString()}`);
    assert(
      sumPools.lte(totalAssets.multipliedBy(1.00001).toString()),
      "Sum of pools.amount must be less than or equal to totalAssets"
    );

    // Sort pools by APY and calculate target amounts
    const sortedPools = [...pools].sort((a, b) => b.APY.netApy - a.APY.netApy);
    const targetAmounts: Record<string, Web3Number> = {};
    let remainingAssets = totalAssets;
    logger.verbose(`Remaining assets: ${remainingAssets.toString()}`);

    // First pass: Allocate to high APY pools up to their max weight
    let isAnyPoolOverMaxWeight = false;
    for (const pool of sortedPools) {
      const maxAmount = totalAssets.multipliedBy(pool.max_weight * 0.98); // some tolerance
      const targetAmount = remainingAssets.gte(maxAmount)
        ? maxAmount
        : remainingAssets;
      logger.verbose(`Target amount: ${targetAmount.toString()}`);
      logger.verbose(`Remaining assets: ${remainingAssets.toString()}`);
      logger.verbose(`Max amount: ${maxAmount.toString()}`);
      logger.verbose(`pool.max_weight: ${pool.max_weight}`);
      targetAmounts[pool.pool_id.address.toString()] = targetAmount;
      remainingAssets = remainingAssets.minus(targetAmount.toString());
      if (pool.current_weight > pool.max_weight) {
        isAnyPoolOverMaxWeight = true;
      }
    }

    assert(remainingAssets.lt(0.00001), "Remaining assets must be 0");

    // Calculate required changes
    const changes: Change[] = sortedPools.map((pool) => {
      const target =
        targetAmounts[pool.pool_id.address.toString()] ||
        Web3Number.fromWei("0", this.decimals());
      const change = Web3Number.fromWei(
        target.minus(pool.amount.toString()).toWei(),
        this.decimals()
      );
      return {
        pool_id: pool.pool_id,
        changeAmt: change,
        finalAmt: target,
        isDeposit: change.gt(0)
      };
    });

    logger.verbose(`Changes: ${JSON.stringify(changes)}`);
    // Validate changes
    const sumChanges = changes.reduce(
      (sum, c) => sum.plus(c.changeAmt.toString()),
      Web3Number.fromWei("0", this.decimals())
    );
    const sumFinal = changes.reduce(
      (sum, c) => sum.plus(c.finalAmt.toString()),
      Web3Number.fromWei("0", this.decimals())
    );
    const hasChanges = changes.some((c) => !c.changeAmt.eq(0));

    logger.verbose(`Sum of changes: ${sumChanges.toString()}`);
    if (!sumChanges.eq(0)) throw new Error("Sum of changes must be zero");
    logger.verbose(`Sum of final: ${sumFinal.toString()}`);
    logger.verbose(`Total assets: ${totalAssets.toString()}`);
    if (!sumFinal.eq(totalAssets.toString()))
      throw new Error("Sum of final amounts must equal total assets");
    if (!hasChanges) throw new Error("No changes required");

    const finalPools: PoolInfoFull[] = pools.map((p) => {
      const target =
        targetAmounts[p.pool_id.address.toString()] ||
        Web3Number.fromWei("0", this.decimals());
      return {
        ...p,
        amount: target,
        usdValue: Web3Number.fromWei("0", this.decimals())
      };
    });
    return {
      changes,
      finalPools,
      isAnyPoolOverMaxWeight
    };
  }

  /**
   * Creates a rebalance Call object for the strategy contract
   * @param pools - Array of pool information including IDs, weights, amounts, APYs and utilization
   * @returns Populated contract call for rebalance
   */
  async getRebalanceCall(
    pools: Awaited<ReturnType<typeof this.getRebalancedPositions>>["changes"],
    isOverWeightAdjustment: boolean // here, yield increase doesnt matter
  ) {
    const actions: any[] = [];
    // sort to put withdrawals first
    pools.sort((a, b) => (b.isDeposit ? -1 : 1));
    pools.forEach((p) => {
      if (p.changeAmt.eq(0)) return null;
      actions.push({
        pool_id: p.pool_id.address,
        feature: new CairoCustomEnum(
          p.isDeposit ? { DEPOSIT: {} } : { WITHDRAW: {} }
        ),
        token: this.asset().address.address,
        amount: uint256.bnToUint256(
          p.changeAmt.multipliedBy(p.isDeposit ? 1 : -1).toWei()
        )
      });
    });
    if (actions.length === 0) return null;
    if (isOverWeightAdjustment) {
      return this.contract.populate("rebalance_weights", [actions]);
    }
    return this.contract.populate("rebalance", [actions]);
  }

  async getInvestmentFlows(pools: PoolInfoFull[]) {
    const netYield = await this.netAPYGivenPools(pools);

    const baseFlow: IInvestmentFlow = {
      title: "Your Deposit",
      subItems: [
        { key: `Net yield`, value: `${(netYield * 100).toFixed(2)}%` },
        {
          key: `Performance Fee`,
          value: `${(this.metadata.additionalInfo.feeBps / 100).toFixed(2)}%`
        }
      ],
      linkedFlows: [],
      style: { backgroundColor: FlowChartColors.Purple.valueOf() }
    };

    let _pools = [...pools];
    _pools = _pools.sort(
      (a, b) => Number(b.amount.toString()) - Number(a.amount.toString())
    );
    _pools.forEach((p) => {
      const flow: IInvestmentFlow = {
        title: `Pool name: ${p.pool_name}`,
        subItems: [
          { key: `APY`, value: `${(p.APY.netApy * 100).toFixed(2)}%` },
          {
            key: "Weight",
            value: `${(p.current_weight * 100).toFixed(2)} / ${(
              p.max_weight * 100
            ).toFixed(2)}%`
          }
        ],
        linkedFlows: [],
        style: p.amount.greaterThan(0)
          ? { backgroundColor: FlowChartColors.Blue.valueOf() }
          : { color: "gray" }
      };
      baseFlow.linkedFlows.push(flow);
    });
    return [baseFlow];
  }

  async harvest(acc: Account) {
    const vesuHarvest = new VesuHarvests(this.config);
    const harvests = await vesuHarvest.getUnHarvestedRewards(this.address);
    const harvest = harvests[0];
    const avnu = new AvnuWrapper();
    let swapInfo: SwapInfo = {
      token_from_address: harvest.token.address,
      token_from_amount: uint256.bnToUint256(harvest.actualReward.toWei()),
      token_to_address: this.asset().address.address,
      token_to_amount: uint256.bnToUint256(0),
      token_to_min_amount: uint256.bnToUint256(0),
      beneficiary: this.address.address,
      integrator_fee_amount_bps: 0,
      integrator_fee_recipient: this.address.address,
      routes: []
    };
    if (!this.asset().address.eqString(harvest.token.address)) {
      const quote = await avnu.getQuotes(
        harvest.token.address,
        this.asset().address.address,
        harvest.actualReward.toWei(),
        this.address.address
      );
      swapInfo = await avnu.getSwapInfo(
        quote,
        this.address.address,
        0,
        this.address.address
      );
    }

    return [
      this.contract.populate("harvest", [
        harvest.rewardsContract.address,
        {
          id: harvest.claim.id,
          amount: harvest.claim.amount.toWei(),
          claimee: harvest.claim.claimee.address
        },
        harvest.proof,
        swapInfo
      ])
    ];
  }

  /**
   * Calculates the fees deducted in different vTokens based on the current and previous state.
   * @param previousTotalSupply - The total supply of the strategy token before the transaction
   * @returns {Promise<Array<{ vToken: ContractAddr, fee: Web3Number }>>} Array of fees deducted in different vTokens
   */
  async getFee(
    allowedPools: Array<PoolInfoFull>
  ): Promise<Array<{ vToken: ContractAddr; fee: Web3Number }>> {
    const assets = Web3Number.fromWei(
      (await this.contract.total_assets()).toString(),
      this.asset().decimals
    );
    const totalSupply = Web3Number.fromWei(
      (await this.contract.total_supply()).toString(),
      this.asset().decimals
    );
    const prevIndex = Web3Number.fromWei(
      (await this.contract.get_previous_index()).toString(),
      18
    );
    const currIndex = new Web3Number(1, 18)
      .multipliedBy(assets)
      .dividedBy(totalSupply);

    logger.verbose(`Previous index: ${prevIndex.toString()}`);
    logger.verbose(`Assets: ${assets.toString()}`);
    logger.verbose(`Total supply: ${totalSupply.toString()}`);
    logger.verbose(`Current index: ${currIndex.toNumber()}`);

    if (currIndex.lt(prevIndex)) {
      logger.verbose(
        `getFee::Current index is less than previous index, no fees to be deducted`
      );
      return [];
    }

    const indexDiff = currIndex.minus(prevIndex);
    logger.verbose(`Index diff: ${indexDiff.toString()}`);
    const numerator = totalSupply
      .multipliedBy(indexDiff)
      .multipliedBy(this.metadata.additionalInfo.feeBps);
    const denominator = 10000;
    let fee = numerator.dividedBy(denominator);
    logger.verbose(`Fee: ${fee.toString()}`);

    if (fee.lte(0)) {
      return [];
    }

    const fees: Array<{ vToken: ContractAddr; fee: Web3Number }> = [];
    let remainingFee = fee.plus(
      Web3Number.fromWei("100", this.asset().decimals)
    );

    for (const pool of allowedPools) {
      const vToken = pool.v_token;
      const balance = pool.amount;

      if (remainingFee.lte(balance)) {
        fees.push({ vToken, fee: remainingFee });
        break;
      } else {
        fees.push({ vToken, fee: Web3Number.fromWei(balance.toString(), 18) });
        remainingFee = remainingFee.minus(
          Web3Number.fromWei(balance.toString(), 18)
        );
      }
    }

    logger.verbose(`Fees: ${JSON.stringify(fees)}`);

    return fees;
  }
}

const _description =
  "Automatically diversify {{TOKEN}} holdings into different Vesu pools while reducing risk and maximizing yield. Defi spring STRK Rewards are auto-compounded as well.";
const _protocol: IProtocol = {
  name: "Vesu",
  logo: "https://static-assets-8zct.onrender.com/integrations/vesu/logo.png"
};
// need to fine tune better
const _riskFactor: RiskFactor[] = [
  { type: RiskType.SMART_CONTRACT_RISK, value: 0.5, weight: 25 },
  { type: RiskType.COUNTERPARTY_RISK, value: 1, weight: 50 },
  { type: RiskType.ORACLE_RISK, value: 0.5, weight: 25 }
];
const AUDIT_URL =
  "https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf";
/**
 * Represents the Vesu Rebalance Strategies.
 */
export const VesuRebalanceStrategies: IStrategyMetadata<VesuRebalanceSettings>[] =
  [
    {
      name: "Vesu Fusion STRK",
      description: _description.replace("{{TOKEN}}", "STRK"),
      address: ContractAddr.from(
        "0x7fb5bcb8525954a60fde4e8fb8220477696ce7117ef264775a1770e23571929"
      ),
      type: "ERC4626",
      depositTokens: [
        Global.getDefaultTokens().find((t) => t.symbol === "STRK")!
      ],
      protocols: [_protocol],
      auditUrl: AUDIT_URL,
      maxTVL: Web3Number.fromWei("0", 18),
      risk: {
        riskFactor: _riskFactor,
        netRisk:
          _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) /
          _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
        notARisks: getNoRiskTags(_riskFactor)
      },
      additionalInfo: {
        feeBps: 1000
      },
      faqs: [
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        }
      ]
    },
    {
      name: "Vesu Fusion ETH",
      description: _description.replace("{{TOKEN}}", "ETH"),
      address: ContractAddr.from(
        "0x5eaf5ee75231cecf79921ff8ded4b5ffe96be718bcb3daf206690ad1a9ad0ca"
      ),
      type: "ERC4626",
      auditUrl: AUDIT_URL,
      depositTokens: [
        Global.getDefaultTokens().find((t) => t.symbol === "ETH")!
      ],
      protocols: [_protocol],
      maxTVL: Web3Number.fromWei("0", 18),
      risk: {
        riskFactor: _riskFactor,
        netRisk:
          _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) /
          _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
        notARisks: getNoRiskTags(_riskFactor)
      },
      additionalInfo: {
        feeBps: 1000
      },
      faqs: [
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        }
      ]
    },
    {
      name: "Vesu Fusion USDC",
      description: _description.replace("{{TOKEN}}", "USDC"),
      address: ContractAddr.from(
        "0xa858c97e9454f407d1bd7c57472fc8d8d8449a777c822b41d18e387816f29c"
      ),
      type: "ERC4626",
      auditUrl: AUDIT_URL,
      depositTokens: [
        Global.getDefaultTokens().find((t) => t.symbol === "USDC")!
      ],
      protocols: [_protocol],
      maxTVL: Web3Number.fromWei("0", 6),
      risk: {
        riskFactor: _riskFactor,
        netRisk:
          _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) /
          _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
        notARisks: getNoRiskTags(_riskFactor)
      },
      additionalInfo: {
        feeBps: 1000
      },
      faqs: [
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        }
      ]
    },
    {
      name: "Vesu Fusion USDT",
      description: _description.replace("{{TOKEN}}", "USDT"),
      address: ContractAddr.from(
        "0x115e94e722cfc4c77a2f15c4aefb0928c1c0029e5a57570df24c650cb7cec2c"
      ),
      type: "ERC4626",
      depositTokens: [
        Global.getDefaultTokens().find((t) => t.symbol === "USDT")!
      ],
      auditUrl: AUDIT_URL,
      protocols: [_protocol],
      maxTVL: Web3Number.fromWei("0", 6),
      risk: {
        riskFactor: _riskFactor,
        netRisk:
          _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) /
          _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
        notARisks: getNoRiskTags(_riskFactor)
      },
      additionalInfo: {
        feeBps: 1000
      },
      faqs: [
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        },
        {
          question: "Question asked basis zkLend",
          answer:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Utenim ad minim veniam, quis nostrud exercitation ullamco laborisnisi ut aliquip ex ea commodo consequat."
        }
      ]
      // }, {
      //     name: 'Vesu Fusion WBTC',
      //     description: _description.replace('{{TOKEN}}', 'WBTC'),
      //     address: ContractAddr.from('0x778007f8136a5b827325d21613803e796bda4d676fbe1e34aeab0b2a2ec027f'),
      //     type: 'ERC4626',
      //     depositTokens: [Global.getDefaultTokens().find(t => t.symbol === 'WBTC')!],
      // auditUrl: AUDIT_URL,
      //     protocols: [_protocol],
      //     maxTVL: Web3Number.fromWei('0', 8),
      //     risk: {
      //         riskFactor: _riskFactor,
      //         netRisk: _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) / _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
      //     },
      //     additionalInfo: {
      //         feeBps: 1000,
      //     },
    }
  ];
