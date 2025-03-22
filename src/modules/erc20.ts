import { ContractAddr, Web3Number } from "@/dataTypes";
import { IConfig } from "@/interfaces";
import { Contract } from "starknet";
import ERC20Abi from '@/data/erc20.abi.json';

export class ERC20 {
    readonly config: IConfig;

    constructor(config: IConfig) {
        this.config = config;
    }

    contract(addr: string | ContractAddr) {
        const _addr = typeof addr === 'string' ? addr : addr.address;
        return new Contract(ERC20Abi, _addr, this.config.provider);
    }

    async balanceOf(token: string | ContractAddr, address: string | ContractAddr, tokenDecimals: number) {
        const contract = this.contract(token);
        const balance = await contract.call('balanceOf', [address.toString()]);
        return Web3Number.fromWei(balance.toString(), tokenDecimals);
    }
}