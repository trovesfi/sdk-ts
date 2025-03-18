import { ContractAddr, Web3Number } from "@/dataTypes"
import { BlockIdentifier, RpcProvider } from "starknet"

export enum RiskType {
    MARKET_RISK = 'MARKET_RISK',
    IMPERMANENT_LOSS = 'IMPERMANENT_LOSS',
    LIQUIDITY_RISK = 'LIQUIDITY_RISK',
    SMART_CONTRACT_RISK = 'SMART_CONTRACT_RISK',
    TECHNICAL_RISK = 'TECHNICAL_RISK',
    COUNTERPARTY_RISK = 'COUNTERPARTY_RISK', // e.g. bad debt
}

export interface RiskFactor {
    type: RiskType,
    value: number, // 0 to 5
    weight: number // 0 to 100
}

export interface TokenInfo {
    name: string,
    symbol: string,
    address: string,
    decimals: number,
    logo: string,
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

export enum FlowChartColors {
    Green = 'purple',
    Blue = '#35484f',
    Purple = '#6e53dc',
}

/**
 * @property risk.riskFactor.factor - The risk factors that are considered for the strategy.
 * @property risk.riskFactor.factor - The value of the risk factor from 0 to 10, 0 being the lowest and 10 being the highest.
 */
export interface IStrategyMetadata {
    name: string,
    description: string,
    address: ContractAddr,
    type: 'ERC4626' | 'ERC721' | 'Other',
    depositTokens: TokenInfo[],
    protocols: IProtocol[],
    auditUrl?: string,
    maxTVL: Web3Number,
    risk: {
        riskFactor: RiskFactor[],
        netRisk: number
    }
}

export interface IInvestmentFlow {
    title: string,
    subItems: {key: string, value: string}[],
    linkedFlows: IInvestmentFlow[],
    style?: any
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