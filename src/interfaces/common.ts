import { RpcProvider } from "starknet"

export interface TokenInfo {
    name: string,
    symbol: string,
    address: string,
    decimals: number,
    pricerKey?: string
}

export interface IConfig {
    provider: RpcProvider
  }

export function getMainnetConfig(rpcUrl = "https://starknet-mainnet.public.blastapi.io") {
    return {
        provider: new RpcProvider({
            nodeUrl: rpcUrl,
            blockIdentifier: 'pending'
        })
    }
}