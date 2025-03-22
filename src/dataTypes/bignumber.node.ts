import util from 'util';
import { _Web3Number } from "./_bignumber";

export class Web3Number extends _Web3Number<Web3Number> {

    static fromWei(weiNumber: string | number, decimals: number) {
        const bn = (new Web3Number(weiNumber, decimals)).dividedBy(10 ** decimals)
        return new Web3Number(bn.toString(), decimals);
    }

    [util.inspect.custom](depth: any, opts: any): string {
        return this.toString();
    }

    [Symbol.for('nodejs.util.inspect.custom')](depth: any, inspectOptions: any, inspect: any): string {
        return this.toString();
    }

    inspect(depth: any, opts: any) {
        return this.toString();
    }
}

const amt = new Web3Number("1.2432", 18);
console.log(amt, 'checking inspect');