import { ContractAddr, Web3Number } from "@/dataTypes";
import { IConfig, IInvestmentFlow, IProtocol, IStrategyMetadata, RiskFactor, RiskType } from "@/interfaces";
import { Pricer } from "@/modules";
import { CairoCustomEnum, Contract, num, uint256 } from "starknet";
import VesuRebalanceAbi from '@/data/vesu-rebalance.abi.json';
import { Global } from "@/global";
import { assert } from "@/utils";
import axios from "axios";
import { PricerBase } from "@/modules/pricerBase";

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
export class VesuRebalance {
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
    readonly BASE_WEIGHT = 10000; // 10000 bps = 100%

    /**
     * Creates a new VesuRebalance strategy instance.
     * @param config - Configuration object containing provider and other settings
     * @param pricer - Pricer instance for token price calculations
     * @param metadata - Strategy metadata including deposit tokens and address
     * @throws {Error} If more than one deposit token is specified
     */
    constructor(config: IConfig, pricer: PricerBase, metadata: IStrategyMetadata) {
        this.config = config;
        this.pricer = pricer;
        
        assert(metadata.depositTokens.length === 1, 'VesuRebalance only supports 1 deposit token');
        this.metadata = metadata;
        this.address = metadata.address;
        
        this.contract = new Contract(VesuRebalanceAbi, this.address.address, this.config.provider);
    }

    /**
     * Creates a deposit call to the strategy contract.
     * @param assets - Amount of assets to deposit
     * @param receiver - Address that will receive the strategy tokens
     * @returns Populated contract call for deposit
     */
    depositCall(assets: Web3Number, receiver: ContractAddr) {
        // Technically its not erc4626 abi, but we just need approve call
        // so, its ok to use it
        const assetContract = new Contract(VesuRebalanceAbi, this.metadata.depositTokens[0].address, this.config.provider);
        const call1 = assetContract.populate('approve', [this.address.address, uint256.bnToUint256(assets.toWei())]);
        const call2 = this.contract.populate('deposit', [uint256.bnToUint256(assets.toWei()), receiver.address]);
        return [call1, call2];
    }

    /**
     * Creates a withdrawal call to the strategy contract.
     * @param assets - Amount of assets to withdraw
     * @param receiver - Address that will receive the withdrawn assets
     * @param owner - Address that owns the strategy tokens
     * @returns Populated contract call for withdrawal
     */
    withdrawCall(assets: Web3Number, receiver: ContractAddr, owner: ContractAddr) {
        return [this.contract.populate('withdraw', [uint256.bnToUint256(assets.toWei()), receiver.address, owner.address])];
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
        const assets = await this.contract.convert_to_assets(uint256.bnToUint256(shares));
        const amount = Web3Number.fromWei(assets.toString(), this.metadata.depositTokens[0].decimals);
        let price = await this.pricer.getPrice(this.metadata.depositTokens[0].symbol);
        const usdValue = Number(amount.toFixed(6)) * price.price;
        return {
            amount,
            usdValue
        }
    }

    /**
     * Calculates the total TVL of the strategy.
     * @returns Object containing the total amount in token units and USD value
     */
    async getTVL() {
        const assets = await this.contract.total_assets();
        const amount = Web3Number.fromWei(assets.toString(), this.metadata.depositTokens[0].decimals);
        let price = await this.pricer.getPrice(this.metadata.depositTokens[0].symbol);
        const usdValue = Number(amount.toFixed(6)) * price.price;
        return {
            amount,
            usdValue
        }
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
        const allowedPools: PoolProps[] = (await this.contract.get_allowed_pools()).map((p: any) => ({
            pool_id: ContractAddr.from(p.pool_id),
            max_weight: Number(p.max_weight) / this.BASE_WEIGHT,
            v_token: ContractAddr.from(p.v_token),
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
            const res = await axios.get(`https://api.vesu.xyz/positions?walletAddress=${this.address.address}`)
            const data = await res.data;
            vesuPositions = data.data;
        } catch (e) {
            console.error(`${VesuRebalance.name}: Error fetching pools for ${this.address.address}`, e);
            isErrorPositionsAPI = true;
        }
        

        let isErrorPoolsAPI = false;
        let pools: any[] = [];
        try {
            const res = await axios.get(`https://api.vesu.xyz/pools`);
            const data = await res.data;
            pools = data.data;
        } catch (e) {
            console.error(`${VesuRebalance.name}: Error fetching pools for ${this.address.address}`, e);
            isErrorPoolsAPI = true;
        }

        const totalAssets = (await this.getTVL()).amount;

        const info = allowedPools.map(async (p) => {
            const vesuPosition = vesuPositions.find((d: any) => d.pool.id.toString() === num.getDecimalString(p.pool_id.address.toString()));
            const pool = pools.find((d: any) => d.id == num.getDecimalString(p.pool_id.address));
            const assetInfo = pool?.assets.find((d: any) => ContractAddr.from(this.asset().address).eqString(d.address));
            let vTokenContract = new Contract(VesuRebalanceAbi, p.v_token.address, this.config.provider);
            const bal = await vTokenContract.balanceOf(this.address.address);
            const assets = await vTokenContract.convert_to_assets(uint256.bnToUint256(bal.toString()));
            const item = {
                pool_id: p.pool_id,
                pool_name: vesuPosition?.pool.name,
                max_weight: p.max_weight,
                current_weight: isErrorPositionsAPI || !vesuPosition ? 0 : Number(Web3Number.fromWei(vesuPosition.collateral.value, this.decimals()).dividedBy(totalAssets.toString()).toFixed(6)),
                v_token: p.v_token,
                amount: Web3Number.fromWei(assets.toString(), this.decimals()),
                usdValue: isErrorPositionsAPI || !vesuPosition ? Web3Number.fromWei("0", this.decimals()) : Web3Number.fromWei(vesuPosition.collateral.usdPrice.value, vesuPosition.collateral.usdPrice.decimals),
                APY: isErrorPoolsAPI || !assetInfo ? {
                    baseApy: 0,
                    defiSpringApy: 0,
                    netApy: 0,
                } : {
                    baseApy: Number(Web3Number.fromWei(assetInfo.stats.supplyApy.value, assetInfo.stats.supplyApy.decimals).toFixed(6)),
                    defiSpringApy: Number(Web3Number.fromWei(assetInfo.stats.defiSpringSupplyApr.value, assetInfo.stats.defiSpringSupplyApr.decimals).toFixed(6)),
                    netApy: 0,
                },
                currentUtilization: isErrorPoolsAPI || !assetInfo ? 0 : Number(Web3Number.fromWei(assetInfo.stats.currentUtilization.value, assetInfo.stats.currentUtilization.decimals).toFixed(6)),
                maxUtilization: isErrorPoolsAPI || !assetInfo ? 0 : Number(Web3Number.fromWei(assetInfo.config.maxUtilization.value, assetInfo.config.maxUtilization.decimals).toFixed(6)),
            }
            item.APY.netApy = item.APY.baseApy + item.APY.defiSpringApy;
            return item;
        });
        const data = await Promise.all(info);
        return {
            data,
            isErrorPositionsAPI,
            isErrorPoolsAPI,
            isError: isErrorPositionsAPI || isErrorPoolsAPI,
        }
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
    netAPYGivenPools(pools: PoolInfoFull[]): number {
        const weightedApy = pools.reduce((acc: number, curr) => {
            const weight = curr.current_weight;
            return acc + (curr.APY.netApy * weight);
        }, 0);
        
        return weightedApy;
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
    async getRebalancedPositions() {
        const { data: pools } = await this.getPools();
        const totalAssets = (await this.getTVL()).amount;
        if (totalAssets.eq(0)) return {
            changes: [],
            finalPools: [],
        }

        // assert sum of pools.amount <= totalAssets
        const sumPools = pools.reduce((acc, curr) => acc.plus(curr.amount.toString()), Web3Number.fromWei("0", this.decimals()));
        assert(sumPools.lte(totalAssets), 'Sum of pools.amount must be less than or equal to totalAssets'); 
        
        // Sort pools by APY and calculate target amounts
        const sortedPools = [...pools].sort((a, b) => b.APY.netApy - a.APY.netApy);
        const targetAmounts: Record<string, Web3Number> = {};
        let remainingAssets = totalAssets;

        // First pass: Allocate to high APY pools up to their max weight
        let isAnyPoolOverMaxWeight = false;
        for (const pool of sortedPools) {
            const maxAmount = totalAssets.multipliedBy(pool.max_weight * 0.9); // 10% tolerance
            const targetAmount = remainingAssets.gte(maxAmount) ? maxAmount : remainingAssets;
            targetAmounts[pool.pool_id.address.toString()] = targetAmount;
            remainingAssets = remainingAssets.minus(targetAmount.toString());
            if (pool.current_weight > pool.max_weight) {
                isAnyPoolOverMaxWeight = true;
            }
        }

        assert(remainingAssets.lt(0.00001), 'Remaining assets must be 0');

        // Calculate required changes
        const changes: Change[] = sortedPools.map(pool => {
            const target = targetAmounts[pool.pool_id.address.toString()] || Web3Number.fromWei("0", this.decimals());
            const change = Web3Number.fromWei(target.minus(pool.amount.toString()).toWei(), this.decimals());
            return {
                pool_id: pool.pool_id,
                changeAmt: change,
                finalAmt: target,
                isDeposit: change.gt(0)
            };
        });

        // Validate changes
        const sumChanges = changes.reduce((sum, c) => sum.plus(c.changeAmt.toString()), Web3Number.fromWei("0", this.decimals()));
        const sumFinal = changes.reduce((sum, c) => sum.plus(c.finalAmt.toString()), Web3Number.fromWei("0", this.decimals()));
        const hasChanges = changes.some(c => !c.changeAmt.eq(0));

        if (!sumChanges.eq(0)) throw new Error('Sum of changes must be zero');
        if (!sumFinal.eq(totalAssets)) throw new Error('Sum of final amounts must equal total assets');
        if (!hasChanges) throw new Error('No changes required');

        const finalPools: PoolInfoFull[] = pools.map((p) => {
            const target = targetAmounts[p.pool_id.address.toString()] || Web3Number.fromWei("0", this.decimals()); 
            return {
                ...p,
                amount: target,
                usdValue: Web3Number.fromWei("0", this.decimals()),
            }
        });
        return {
            changes,
            finalPools,
            isAnyPoolOverMaxWeight,
        }
    }

    /**
     * Creates a rebalance Call object for the strategy contract
     * @param pools - Array of pool information including IDs, weights, amounts, APYs and utilization
     * @returns Populated contract call for rebalance
     */
    async getRebalanceCall(
        pools: Awaited<ReturnType<typeof this.getRebalancedPositions>>['changes'],
        isOverWeightAdjustment: boolean // here, yield increase doesnt matter
    ) {
        const actions: any[] = [];
        // sort to put withdrawals first
        pools.sort((a, b) => b.isDeposit ? -1 : 1);
        console.log('pools', pools);
        pools.forEach((p) => {
            if (p.changeAmt.eq(0)) return null;
            actions.push({
                pool_id: p.pool_id.address,
                feature: new CairoCustomEnum(p.isDeposit ? {DEPOSIT: {}} : {WITHDRAW: {}}),
                token: this.asset().address,
                amount: uint256.bnToUint256(p.changeAmt.multipliedBy(p.isDeposit ? 1 : -1).toWei()),
            });
        });
        if (actions.length === 0) return null;
        if (isOverWeightAdjustment) {
            return this.contract.populate('rebalance_weights', [actions]);
        }
        return this.contract.populate('rebalance', [actions]);
    }

    async getInvestmentFlows(pools: PoolInfoFull[]) {
        const netYield = this.netAPYGivenPools(pools);
       
        const baseFlow: IInvestmentFlow = {
            title: "Deposit $1000",
            subItems: [`Net yield: ${(netYield * 100).toFixed(2)}%`],
            linkedFlows: [],
        };

        pools.forEach((p) => {
            if (p.amount.eq(0)) return;
            const flow: IInvestmentFlow = {
                title: `${p.pool_name} - $${(p.current_weight * 1000).toFixed(2)}`,
                subItems: [
                    `APY: ${(p.APY.netApy * 100).toFixed(2)}%`,
                    `Weight: ${(p.current_weight * 100).toFixed(2)}% / ${(p.max_weight * 100).toFixed(2)}%`,
                ],
                linkedFlows: [],
            };
            baseFlow.linkedFlows.push(flow);
        });

        return [baseFlow];
    }
}

const _description = 'Automatically diversify {{TOKEN}} holdings into different Vesu pools while reducing risk and maximizing yield. Defi spring STRK Rewards are auto-compounded as well.'
const _protocol: IProtocol = {name: 'Vesu', logo: 'https://static-assets-8zct.onrender.com/integrations/vesu/logo.png'}
// need to fine tune better
const _riskFactor: RiskFactor[] = [
    {type: RiskType.SMART_CONTRACT_RISK, value: 0.5, weight: 25},
    {type: RiskType.TECHNICAL_RISK, value: 0.5, weight: 25},
    {type: RiskType.COUNTERPARTY_RISK, value: 1, weight: 50},
]
/**
 * Represents the Vesu Rebalance Strategies.
 */
export const VesuRebalanceStrategies: IStrategyMetadata[] = [{
    name: 'Vesu STRK',
    description: _description.replace('{{TOKEN}}', 'STRK'),
    address: ContractAddr.from('0xeeb729d554ae486387147b13a9c8871bc7991d454e8b5ff570d4bf94de71e1'),
    type: 'ERC4626',
    depositTokens: [Global.getDefaultTokens().find(t => t.symbol === 'STRK')!],
    protocols: [_protocol],
    maxTVL: Web3Number.fromWei('0', 18),
    risk: {
        riskFactor: _riskFactor,
        netRisk: _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) / 100,
    }
}]