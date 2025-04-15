import { ContractAddr, Web3Number } from "@/dataTypes"
import { BlockIdentifier, RpcProvider } from "starknet"
import React from 'react';

export enum RiskType {
    MARKET_RISK = 'Market Risk',
    // if non-correalted pairs, this is 3 (STRK/USDC)
    // if highly correalted pairs, this is 1 (e.g. xSTRK/STRK)
    // if correalted pairs, this is 2 (e.g. BTC/SOL)
    // If there is added leverage on top, can go till 5
    IMPERMANENT_LOSS = 'Impermanent Loss Risk',
    LIQUIDATION_RISK = 'Liquidation Risk',
    LOW_LIQUIDITY_RISK = 'Low Liquidity Risk',
    SMART_CONTRACT_RISK = 'Smart Contract Risk',
    ORACLE_RISK = 'Oracle Risk',
    TECHNICAL_RISK = 'Technical Risk',
    COUNTERPARTY_RISK = 'Counterparty Risk', // e.g. bad debt
}

export interface RiskFactor {
    type: RiskType,
    value: number, // 0 to 5
    weight: number // 0 to 100
}

export interface TokenInfo {
    name: string,
    symbol: string,
    address: ContractAddr,
    decimals: number,
    logo: string,
    coingeckId?: string,
    displayDecimals: number
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
export interface IStrategyMetadata<T> {
    name: string,
    description: string | React.ReactNode,
    address: ContractAddr,
    type: 'ERC4626' | 'ERC721' | 'Other',
    depositTokens: TokenInfo[],
    protocols: IProtocol[],
    auditUrl?: string,
    maxTVL: Web3Number,
    risk: {
        riskFactor: RiskFactor[],
        netRisk: number,
        notARisks: string[]
    },
    apyMethodology?: string,
    additionalInfo: T
}

export interface IInvestmentFlow {
    id?: string, // used to link flows
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

export const getRiskExplaination = (riskType: RiskType) => {
    switch (riskType) {
        case RiskType.MARKET_RISK:
            return "The risk of the market moving against the position."
        case RiskType.IMPERMANENT_LOSS:
            return "The temporary loss of value experienced by liquidity providers in AMMs when asset prices diverge compared to simply holding them."
        case RiskType.LIQUIDATION_RISK:
            return "The risk of losing funds due to the position being liquidated."
        case RiskType.LOW_LIQUIDITY_RISK:
            return "The risk of low liquidity in the pool, which can lead to high slippages or reduced in-abilities to quickly exit the position."
        case RiskType.ORACLE_RISK:
            return "The risk of the oracle being manipulated or incorrect."
        case RiskType.SMART_CONTRACT_RISK:
            return "The risk of the smart contract being vulnerable to attacks."
        case RiskType.TECHNICAL_RISK:
            return "The risk of technical issues e.g. backend failure."
        case RiskType.COUNTERPARTY_RISK:
            return "The risk of the counterparty defaulting e.g. bad debt on lending platforms."
    }
}  

export const getRiskColor = (risk: RiskFactor) => {
    const value = risk.value;
    if (value === 0) return 'green';
    if (value < 2.5) return 'yellow';
    return 'red';
}

export const getNoRiskTags = (risks: RiskFactor[]) => {
    const noRisks1 = risks.filter(risk => risk.value === 0).map(risk => risk.type);

    // const risks not present
    const noRisks2 = Object.values(RiskType).filter(risk => !risks.map(risk => risk.type).includes(risk));

    const mergedUnique = [...new Set([...noRisks1, ...noRisks2])];
    
    // add `No` to the start of each risk
    return mergedUnique.map(risk => `No ${risk}`);
}