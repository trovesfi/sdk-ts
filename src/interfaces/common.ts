import { ContractAddr } from "@/dataTypes"
import { BlockIdentifier, RpcProvider } from "starknet"

export interface TokenInfo {
    name: string,
    symbol: string,
    address: string,
    decimals: number,
    coingeckId?: string,
}

export enum Network {
    mainnet = "mainnet",
    sepolia = "sepolia",
    devnet = "devnet"
}

export interface IConfig {
    provider: RpcProvider,
    network: Network,
    stage: 'production' | 'staging',
    heartbeatUrl?: string
}

export interface IProtocol {
    name: string,
    logo: string,
}

export interface IStrategyMetadata {
    name: string,
    description: string,
    address: ContractAddr,
    type: 'ERC4626' | 'ERC721' | 'Other',
    depositTokens: TokenInfo[],
    protocols: IProtocol[]
}

export function getMainnetConfig(rpcUrl = "https://starknet-mainnet.public.blastapi.io", blockIdentifier: BlockIdentifier = 'pending'): IConfig {
    return {
        provider: new RpcProvider({
            nodeUrl: rpcUrl,
            blockIdentifier: blockIdentifier
        }),
        stage: "production",
        network: Network.mainnet
    }
}