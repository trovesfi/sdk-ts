import { uint256 } from "starknet";

import { Call, Uint256 } from "starknet";
import { fetchBuildExecuteTransaction, fetchQuotes, Quote } from "@avnu/avnu-sdk";
import { assert } from "../utils";

export interface Route {
    token_from: string,
    token_to: string,
    exchange_address: string,
    percent: number,
    additional_swap_params: string[]
}

export interface SwapInfo {
    token_from_address: string, 
    token_from_amount: Uint256, 
    token_to_address: string,   
    token_to_amount: Uint256, 
    token_to_min_amount: Uint256,  
    beneficiary: string,  
    integrator_fee_amount_bps: number,
    integrator_fee_recipient: string,
    routes: Route[]
}


export class AvnuWrapper {
    async getQuotes(
        fromToken: string,
        toToken: string,
        amountWei: string,
        taker: string,
    ) {
        const params: any = {
            sellTokenAddress: fromToken,
            buyTokenAddress: toToken,
            sellAmount: amountWei,
            takerAddress: taker,
        };
        assert(fromToken != toToken, 'From and to tokens are the same');

        const quotes = await fetchQuotes(params);
        assert(quotes.length > 0, 'No quotes found');
        return quotes[0];
    }

    async getSwapInfo(
        quote: Quote,
        taker: string,
        integratorFeeBps: number,
        integratorFeeRecipient: string,
        minAmount: string
    ) {
        const calldata = await  fetchBuildExecuteTransaction(quote.quoteId);
        // its the multi swap function call
        const call: Call = calldata.calls[1];
        const callData: string[] = call.calldata as string[];
        const routesLen: number = Number(callData[11]);
        assert(routesLen > 0, 'No routes found');

        // use call data to re-construct routes
        let startIndex = 12;
        const routes: Route[] = [];
        for(let i=0; i<routesLen; ++i) {
            const swap_params_len = Number(callData[startIndex + 4]);
            const route: Route = {
                token_from: callData[startIndex],
                token_to: callData[startIndex + 1],
                exchange_address: callData[startIndex + 2],
                percent: Number(callData[startIndex + 3]),
                additional_swap_params: swap_params_len > 0 ? callData.slice(startIndex + 5, startIndex + 5 + swap_params_len): []
            }
            routes.push(route);
            startIndex += 5 + swap_params_len;
        }

        // swapInfo as expected by the strategy 
        const swapInfo: SwapInfo = {
            token_from_address: quote.sellTokenAddress, 
            token_from_amount: uint256.bnToUint256(quote.sellAmount),
            token_to_address: quote.buyTokenAddress,
            token_to_amount: uint256.bnToUint256(quote.buyAmount), 
            token_to_min_amount: uint256.bnToUint256(minAmount),
            beneficiary: taker,
            integrator_fee_amount_bps: integratorFeeBps,
            integrator_fee_recipient: integratorFeeRecipient,
            routes
        };
    
        return swapInfo;
    }
}