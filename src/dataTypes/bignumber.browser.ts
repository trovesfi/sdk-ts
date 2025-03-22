import { _Web3Number } from "./_bignumber";

export class Web3Number extends _Web3Number<Web3Number> {
    static fromWei(weiNumber: string | number, decimals: number) {
        const bn = (new Web3Number(weiNumber, decimals)).dividedBy(10 ** decimals)
        return new Web3Number(bn.toString(), decimals);
    }
}