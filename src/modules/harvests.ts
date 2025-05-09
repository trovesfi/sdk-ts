import { ContractAddr, Web3Number } from "@/dataTypes";
import { logger } from "@/utils/logger";
import { IConfig } from "@/interfaces";
import { assert } from "@/utils";
import { Contract, num } from "starknet";

export interface HarvestInfo {
    rewardsContract: ContractAddr,
    token: ContractAddr,
    startDate: Date,
    endDate: Date,
    claim: {
        id: number,
        amount: Web3Number,
        claimee: ContractAddr
    },
    actualReward: Web3Number,
    proof: string[]
}

export class Harvests {   
    constructor(protected readonly config: IConfig) {}

    getHarvests(addr: ContractAddr): Promise<HarvestInfo[]> {
        throw new Error("Not implemented");
    }

    async getUnHarvestedRewards(addr: ContractAddr) {
        const rewards = await this.getHarvests(addr);
        if (rewards.length == 0) return [];

        const unClaimed: HarvestInfo[] = [];

        const cls = await this.config.provider.getClassAt(rewards[0].rewardsContract.address);
        for (let reward of rewards) {
            const contract = new Contract(cls.abi, reward.rewardsContract.address, this.config.provider);
            const isClaimed = await contract.call('is_claimed', [reward.claim.id]);
            logger.verbose(`${Harvests.name}: isClaimed: ${isClaimed}`);
            if (isClaimed)
                return unClaimed;
            unClaimed.unshift(reward); // to ensure older harvest is first
        }
        return unClaimed;
    }
}

const STRK = '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

export class EkuboHarvests extends Harvests {
    async getHarvests(addr: ContractAddr) {
        const EKUBO_API = `https://starknet-mainnet-api.ekubo.org/airdrops/${addr.address}?token=${STRK}`
        const resultEkubo = await fetch(EKUBO_API);
        const items = (await resultEkubo.json());

        const rewards: HarvestInfo[] = [];
        for (let i=0; i<items.length; ++i) {
            const info = items[i];
            assert(info.token == STRK, 'expected strk token only')
            rewards.push({
                rewardsContract: ContractAddr.from(info.contract_address),
                token: ContractAddr.from(STRK),
                startDate: new Date(info.start_date),
                endDate: new Date(info.end_date),
                claim: {
                    id: info.claim.id,
                    amount: Web3Number.fromWei(info.claim.amount, 18),
                    claimee: ContractAddr.from(info.claim.claimee)
                },
                actualReward: Web3Number.fromWei(info.claim.amount, 18),
                proof: info.proof
            });
        }
        return rewards.sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
    }
}

export class VesuHarvests extends Harvests {
    async getHarvests(addr: ContractAddr): Promise<HarvestInfo[]> {
        const result = await fetch(`https://api.vesu.xyz/users/${addr.address}/strk-rewards/calldata`);
        const data = await result.json();
        const rewardsContract = ContractAddr.from('0x0387f3eb1d98632fbe3440a9f1385Aec9d87b6172491d3Dd81f1c35A7c61048F');
    
        // get already claimed amount
        const cls = await this.config.provider.getClassAt(rewardsContract.address);
        const contract = new Contract(cls.abi, rewardsContract.address, this.config.provider);
        const _claimed_amount: any = await contract.call('amount_already_claimed', [addr.address]);
        const claimed_amount = Web3Number.fromWei(_claimed_amount.toString(), 18);
        logger.verbose(`${VesuHarvests.name}: claimed_amount: ${claimed_amount.toString()}`);
        
        // get the actual reward
        const actualReward = Web3Number.fromWei(data.data.amount, 18).minus(claimed_amount);
        logger.verbose(`${VesuHarvests.name}: actualReward: ${actualReward.toString()}`);
        return [{
            rewardsContract,
            token: ContractAddr.from(STRK),
            startDate: new Date(0),
            endDate: new Date(0),
            claim: {
                id: 0,
                amount: Web3Number.fromWei(num.getDecimalString(data.data.amount), 18),
                claimee: addr
            },
            actualReward,
            proof: data.data.proof
        }]
    }

    async getUnHarvestedRewards(addr: ContractAddr) {
        return await this.getHarvests(addr);
    }
}