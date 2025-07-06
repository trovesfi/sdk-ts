import { logger } from "@/utils/logger";
import BigNumber from "bignumber.js";

export class _Web3Number<T extends _Web3Number<T>> extends BigNumber {
  decimals: number;

  constructor(value: string | number, decimals: number) {
    super(value);
    this.decimals = decimals;
  }

  toWei() {
    return this.mul(10 ** this.decimals).toFixed(0);
  }

  multipliedBy(value: string | number | T): T {
    const _value = this.getStandardString(value);
    return this.construct(this.mul(_value).toString(), this.decimals);
  }

  dividedBy(value: string | number | T): T {
    const _value = this.getStandardString(value);
    return this.construct(this.div(_value).toString(), this.decimals);
  }

  plus(value: string | number | T): T {
    const _value = this.getStandardString(value);
    return this.construct(this.add(_value).toString(), this.decimals);
  }

  minus(n: number | string | T, base?: number): T {
    const _value = this.getStandardString(n);
    return this.construct(super.minus(_value, base).toString(), this.decimals);
  }

  protected construct(value: string | number, decimals: number): T {
    return new (this.constructor as {
      new (value: string | number, decimals: number): T;
    })(value, decimals);
  }

  toString(): string {
    return super.toString();
  }

  toJSON() {
    return this.toString();
  }

  valueOf() {
    return this.toString();
  }

  private maxToFixedDecimals() {
    return Math.min(this.decimals, 18);
  }

  private getStandardString(value: string | number | T): string {
    if (typeof value == "string") {
      return value;
    }
    return value.toFixed(this.maxToFixedDecimals());
  }

  minimum(value: string | number | T): T {
    const _value = new BigNumber(value);
    const _valueMe = new BigNumber(this.toString());
    const answer = _value.lessThanOrEqualTo(_valueMe) ? _value : _valueMe;
    return this.construct(answer.toString(), this.decimals);
  }

  maximum(value: string | number | T): T {
    const _value = new BigNumber(value);
    const _valueMe = new BigNumber(this.toString());
    console.warn(`maximum: _value: ${_value.toString()}, _valueMe: ${_valueMe.toString()}`);
    const answer = _value.greaterThanOrEqualTo(_valueMe) ? _value : _valueMe;
    return this.construct(answer.toString(), this.decimals);
  }
}

BigNumber.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: BigNumber.ROUND_DOWN });
_Web3Number.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: BigNumber.ROUND_DOWN });
