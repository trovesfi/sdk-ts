import { ContractAddr, Web3Number } from "@/dataTypes";
import { logger } from "@/global";
import { IConfig } from "@/interfaces";
import { assert } from "@/utils";
import { Contract } from "starknet";

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
    proof: string[]
}

export class Harvests {   
    constructor(private readonly config: IConfig) {

    }

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

export class EkuboHarvests extends Harvests {
    async getHarvests(addr: ContractAddr) {
        const STRK = '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
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
                proof: info.proof
            });
        }
        return rewards.sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
    }
}