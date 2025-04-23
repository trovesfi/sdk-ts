// src/modules/pricer.ts
import axios2 from "axios";

// src/global.ts
import axios from "axios";

// src/dataTypes/_bignumber.ts
import BigNumber from "bignumber.js";
var _Web3Number = class extends BigNumber {
  constructor(value, decimals) {
    super(value);
    this.decimals = decimals;
  }
  toWei() {
    return this.mul(10 ** this.decimals).toFixed(0);
  }
  multipliedBy(value) {
    const _value = this.getStandardString(value);
    return this.construct(this.mul(_value).toString(), this.decimals);
  }
  dividedBy(value) {
    const _value = this.getStandardString(value);
    return this.construct(this.div(_value).toString(), this.decimals);
  }
  plus(value) {
    const _value = this.getStandardString(value);
    return this.construct(this.add(_value).toString(), this.decimals);
  }
  minus(n, base) {
    const _value = this.getStandardString(n);
    return this.construct(super.minus(_value, base).toString(), this.decimals);
  }
  construct(value, decimals) {
    return new this.constructor(value, decimals);
  }
  toString(decimals = this.maxToFixedDecimals()) {
    return super.toFixed(decimals);
  }
  toJSON() {
    return this.toString();
  }
  valueOf() {
    return this.toString();
  }
  maxToFixedDecimals() {
    return Math.min(this.decimals, 18);
  }
  getStandardString(value) {
    if (typeof value == "string") {
      return value;
    }
    return value.toFixed(this.maxToFixedDecimals());
  }
};
BigNumber.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: BigNumber.ROUND_DOWN });
_Web3Number.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: BigNumber.ROUND_DOWN });

// src/dataTypes/bignumber.browser.ts
var Web3Number = class _Web3Number2 extends _Web3Number {
  static fromWei(weiNumber, decimals) {
    const bn = new _Web3Number2(weiNumber, decimals).dividedBy(10 ** decimals);
    return new _Web3Number2(bn.toString(), decimals);
  }
};

// src/dataTypes/address.ts
import { num } from "starknet";
var ContractAddr = class _ContractAddr {
  constructor(address) {
    this.address = _ContractAddr.standardise(address);
  }
  static from(address) {
    return new _ContractAddr(address);
  }
  eq(other) {
    return this.address === other.address;
  }
  eqString(other) {
    return this.address === _ContractAddr.standardise(other);
  }
  static standardise(address) {
    let _a = address;
    if (!address) {
      _a = "0";
    }
    const a = num.getHexString(num.getDecimalString(_a.toString()));
    return a;
  }
  static eqString(a, b) {
    return _ContractAddr.standardise(a) === _ContractAddr.standardise(b);
  }
  toString() {
    return this.address;
  }
};

// src/global.ts
var logger = {
  ...console,
  verbose(message) {
    console.log(`[VERBOSE] ${message}`);
  }
};
var FatalError = class extends Error {
  constructor(message, err) {
    super(message);
    logger.error(message);
    if (err)
      logger.error(err.message);
    this.name = "FatalError";
  }
};
var defaultTokens = [{
  name: "Starknet",
  symbol: "STRK",
  logo: "https://assets.strkfarm.com/integrations/tokens/strk.svg",
  address: ContractAddr.from("0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"),
  decimals: 18,
  coingeckId: "starknet",
  displayDecimals: 2
}, {
  name: "xSTRK",
  symbol: "xSTRK",
  logo: "https://assets.strkfarm.com/integrations/tokens/xstrk.svg",
  address: ContractAddr.from("0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a"),
  decimals: 18,
  coingeckId: void 0,
  displayDecimals: 2
}, {
  name: "ETH",
  symbol: "ETH",
  logo: "https://assets.strkfarm.com/integrations/tokens/eth.svg",
  address: ContractAddr.from("0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"),
  decimals: 18,
  coingeckId: void 0,
  displayDecimals: 4
}, {
  name: "USDC",
  symbol: "USDC",
  logo: "https://assets.strkfarm.com/integrations/tokens/usdc.svg",
  address: ContractAddr.from("0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8"),
  decimals: 6,
  coingeckId: void 0,
  displayDecimals: 2
}, {
  name: "USDT",
  symbol: "USDT",
  logo: "https://assets.strkfarm.com/integrations/tokens/usdt.svg",
  address: ContractAddr.from("0x68f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8"),
  decimals: 6,
  coingeckId: void 0,
  displayDecimals: 2
}, {
  name: "WBTC",
  symbol: "WBTC",
  logo: "https://assets.strkfarm.com/integrations/tokens/wbtc.svg",
  address: ContractAddr.from("0x3fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac"),
  decimals: 8,
  coingeckId: void 0,
  displayDecimals: 6
}];
var tokens = defaultTokens;
var Global = class _Global {
  static fatalError(message, err) {
    logger.error(message);
    console.error(message, err);
    if (err)
      console.error(err);
    process.exit(1);
  }
  static httpError(url, err, message) {
    logger.error(`${url}: ${message}`);
    console.error(err);
  }
  static getDefaultTokens() {
    return tokens;
  }
  static async getTokens() {
    if (tokens.length) return tokens;
    const data = await axios.get("https://assets.strkfarm.com/integrations/tokens.json");
    const tokensData = data.data.content;
    tokensData.forEach((token) => {
      if (!token.tags.includes("AVNU") || !token.tags.includes("Verified")) {
        return;
      }
      tokens.push({
        name: token.name,
        symbol: token.symbol,
        address: ContractAddr.from(token.address),
        decimals: token.decimals,
        logo: token.logoUri,
        coingeckId: token.extensions.coingeckoId,
        displayDecimals: 2
      });
    });
    console.log(tokens);
    return tokens;
  }
  static assert(condition, message) {
    if (!condition) {
      throw new FatalError(message);
    }
  }
  static async getTokenInfoFromAddr(addr) {
    if (tokens.length == defaultTokens.length) {
      await _Global.getTokens();
    }
    const token = tokens.find((token2) => addr.eq(token2.address));
    if (!token) {
      throw new FatalError(`Token not found: ${addr.address}`);
    }
    return token;
  }
};

// src/modules/pricerBase.ts
var PricerBase = class {
  constructor(config, tokens2) {
    this.config = config;
    this.tokens = tokens2;
  }
  async getPrice(tokenSymbol) {
    throw new Error("Method not implemented");
  }
};

// src/modules/pricer.ts
var Pricer = class extends PricerBase {
  // e.g. ETH/USDC
  constructor(config, tokens2) {
    super(config, tokens2);
    this.prices = {};
    // code populates this map during runtime to determine which method to use for a given token
    // The method set will be the first one to try after first attempt
    this.methodToUse = {};
    /**
     * TOKENA and TOKENB are the two token names to get price of TokenA in terms of TokenB
     */
    this.PRICE_API = `https://api.coinbase.com/v2/prices/{{PRICER_KEY}}/buy`;
    this.EKUBO_API = "https://quoter-mainnet-api.ekubo.org/{{AMOUNT}}/{{TOKEN_ADDRESS}}/0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
  }
  isReady() {
    const allPricesExist = Object.keys(this.prices).length === this.tokens.length;
    if (!allPricesExist) return false;
    let atleastOneStale = false;
    for (let token of this.tokens) {
      const priceInfo = this.prices[token.symbol];
      const isStale = this.isStale(priceInfo.timestamp, token.symbol);
      if (isStale) {
        atleastOneStale = true;
        logger.warn(`Atleast one stale: ${token.symbol}: ${JSON.stringify(this.prices[token.symbol])}`);
        break;
      }
    }
    return allPricesExist && !atleastOneStale;
  }
  waitTillReady() {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        logger.verbose(`Waiting for pricer to initialise`);
        if (this.isReady()) {
          logger.verbose(`Pricer initialised`);
          clearInterval(interval);
          resolve();
        }
      }, 1e3);
    });
  }
  start() {
    this._loadPrices();
    setInterval(() => {
      this._loadPrices();
    }, 3e4);
  }
  isStale(timestamp, tokenName) {
    const STALE_TIME = 6e4;
    return (/* @__PURE__ */ new Date()).getTime() - timestamp.getTime() > STALE_TIME;
  }
  assertNotStale(timestamp, tokenName) {
    Global.assert(!this.isStale(timestamp, tokenName), `Price of ${tokenName} is stale`);
  }
  async getPrice(tokenSymbol) {
    Global.assert(this.prices[tokenSymbol], `Price of ${tokenSymbol} not found`);
    this.assertNotStale(this.prices[tokenSymbol].timestamp, tokenSymbol);
    return this.prices[tokenSymbol];
  }
  _loadPrices(onUpdate = () => {
  }) {
    this.tokens.forEach(async (token) => {
      const MAX_RETRIES = 10;
      let retry = 0;
      while (retry < MAX_RETRIES) {
        try {
          if (token.symbol === "USDT") {
            this.prices[token.symbol] = {
              price: 1,
              timestamp: /* @__PURE__ */ new Date()
            };
            onUpdate(token.symbol);
            return;
          }
          const price = await this._getPrice(token);
          this.prices[token.symbol] = {
            price,
            timestamp: /* @__PURE__ */ new Date()
          };
          onUpdate(token.symbol);
          logger.verbose(`Fetched price of ${token.name} as ${price}`);
          break;
        } catch (error) {
          if (retry < MAX_RETRIES) {
            logger.warn(`Error fetching data from ${token.name}, retry: ${retry}`);
            logger.warn(error);
            retry++;
            await new Promise((resolve) => setTimeout(resolve, retry * 2e3));
          } else {
            throw new FatalError(`Error fetching data from ${token.name}`, error);
          }
        }
      }
    });
    if (this.isReady() && this.config.heartbeatUrl) {
      console.log(`sending beat`);
      axios2.get(this.config.heartbeatUrl).catch((err) => {
        console.error("Pricer: Heartbeat err", err);
      });
    }
  }
  async _getPrice(token, defaultMethod = "all") {
    const methodToUse = this.methodToUse[token.symbol] || defaultMethod;
    logger.info(`Fetching price of ${token.symbol} using ${methodToUse}`);
    switch (methodToUse) {
      case "Coinbase":
        try {
          const result = await this._getPriceCoinbase(token);
          this.methodToUse[token.symbol] = "Coinbase";
          return result;
        } catch (error) {
          console.warn(`Coinbase: price err: message [${token.symbol}]: `, error.message);
        }
      case "Coinmarketcap":
        try {
          const result = await this._getPriceCoinMarketCap(token);
          this.methodToUse[token.symbol] = "Coinmarketcap";
          return result;
        } catch (error) {
          console.warn(`CoinMarketCap: price err [${token.symbol}]: `, Object.keys(error));
          console.warn(`CoinMarketCap: price err [${token.symbol}]: `, error.message);
        }
      case "Ekubo":
        try {
          const result = await this._getPriceEkubo(token);
          this.methodToUse[token.symbol] = "Ekubo";
          return result;
        } catch (error) {
          console.warn(`Ekubo: price err [${token.symbol}]: `, error.message);
          console.warn(`Ekubo: price err [${token.symbol}]: `, Object.keys(error));
        }
    }
    if (defaultMethod == "all") {
      return await this._getPrice(token, "Coinbase");
    }
    throw new FatalError(`Price not found for ${token.symbol}`);
  }
  async _getPriceCoinbase(token) {
    const url = this.PRICE_API.replace("{{PRICER_KEY}}", `${token.symbol}-USD`);
    const result = await axios2.get(url);
    const data = result.data;
    return Number(data.data.amount);
  }
  async _getPriceCoinMarketCap(token) {
    throw new Error("Not implemented");
  }
  async _getPriceEkubo(token, amountIn = new Web3Number(1, token.decimals), retry = 0) {
    const url = this.EKUBO_API.replace("{{TOKEN_ADDRESS}}", token.address.toString()).replace("{{AMOUNT}}", amountIn.toWei());
    const result = await axios2.get(url);
    const data = result.data;
    const outputUSDC = Number(Web3Number.fromWei(data.total_calculated, 6).toFixed(6));
    logger.verbose(`Ekubo: ${token.symbol} -> USDC: ${outputUSDC}, retry: ${retry}`);
    if (outputUSDC === 0 && retry < 3) {
      const amountIn2 = new Web3Number(100, token.decimals);
      return await this._getPriceEkubo(token, amountIn2, retry + 1);
    }
    const usdcPrice = 1;
    logger.verbose(`USDC Price: ${usdcPrice}`);
    return outputUSDC * usdcPrice;
  }
};

// src/modules/pragma.ts
import { Contract } from "starknet";

// src/data/pragma.abi.json
var pragma_abi_default = [
  {
    data: [
      {
        name: "previousOwner",
        type: "felt"
      },
      {
        name: "newOwner",
        type: "felt"
      }
    ],
    keys: [],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    data: [
      {
        name: "token",
        type: "felt"
      },
      {
        name: "source",
        type: "felt"
      }
    ],
    keys: [],
    name: "TokenSourceChanged",
    type: "event"
  },
  {
    name: "constructor",
    type: "constructor",
    inputs: [
      {
        name: "owner",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "get_price",
    type: "function",
    inputs: [
      {
        name: "token",
        type: "felt"
      }
    ],
    outputs: [
      {
        name: "price",
        type: "felt"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "get_price_with_time",
    type: "function",
    inputs: [
      {
        name: "token",
        type: "felt"
      }
    ],
    outputs: [
      {
        name: "price",
        type: "felt"
      },
      {
        name: "update_time",
        type: "felt"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "set_token_source",
    type: "function",
    inputs: [
      {
        name: "token",
        type: "felt"
      },
      {
        name: "source",
        type: "felt"
      }
    ],
    outputs: []
  }
];

// src/modules/pragma.ts
var Pragma = class {
  constructor(provider) {
    this.contractAddr = "0x023fb3afbff2c0e3399f896dcf7400acf1a161941cfb386e34a123f228c62832";
    this.contract = new Contract(pragma_abi_default, this.contractAddr, provider);
  }
  async getPrice(tokenAddr) {
    if (!tokenAddr) {
      throw new Error(`Pragma:getPrice - no token`);
    }
    const result = await this.contract.call("get_price", [tokenAddr]);
    const price = Number(result.price) / 10 ** 8;
    logger.verbose(`Pragma:${tokenAddr}: ${price}`);
    return price;
  }
};

// src/modules/zkLend.ts
import axios3 from "axios";

// src/interfaces/lending.ts
var MarginType = /* @__PURE__ */ ((MarginType2) => {
  MarginType2["SHARED"] = "shared";
  MarginType2["NONE"] = "none";
  return MarginType2;
})(MarginType || {});
var ILending = class {
  constructor(config, metadata) {
    this.tokens = [];
    this.initialised = false;
    this.metadata = metadata;
    this.config = config;
    this.init();
  }
  /** Wait for initialisation */
  waitForInitilisation() {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        logger.verbose(`Waiting for ${this.metadata.name} to initialise`);
        if (this.initialised) {
          logger.verbose(`${this.metadata.name} initialised`);
          clearInterval(interval);
          resolve();
        }
      }, 1e3);
    });
  }
};

// src/modules/zkLend.ts
var _ZkLend = class _ZkLend extends ILending {
  constructor(config, pricer) {
    super(config, {
      name: "zkLend",
      logo: "https://app.zklend.com/favicon.ico"
    });
    this.POSITION_URL = "https://app.zklend.com/api/users/{{USER_ADDR}}/all";
    this.pricer = pricer;
  }
  async init() {
    try {
      logger.verbose(`Initialising ${this.metadata.name}`);
      const result = await axios3.get(_ZkLend.POOLS_URL);
      const data = result.data;
      const savedTokens = await Global.getTokens();
      data.forEach((pool) => {
        let collareralFactor = new Web3Number(0, 0);
        if (pool.collateral_factor) {
          collareralFactor = Web3Number.fromWei(pool.collateral_factor.value, pool.collateral_factor.decimals);
        }
        const savedTokenInfo = savedTokens.find((t) => t.symbol == pool.token.symbol);
        const token = {
          name: pool.token.name,
          symbol: pool.token.symbol,
          address: savedTokenInfo?.address || ContractAddr.from(""),
          logo: "",
          decimals: pool.token.decimals,
          borrowFactor: Web3Number.fromWei(pool.borrow_factor.value, pool.borrow_factor.decimals),
          collareralFactor,
          displayDecimals: 2
        };
        this.tokens.push(token);
      });
      logger.info(`Initialised ${this.metadata.name} with ${this.tokens.length} tokens`);
      this.initialised = true;
    } catch (error) {
      return Global.httpError(_ZkLend.POOLS_URL, error);
    }
  }
  /**
   * @description Get the health factor of the user for given lending and debt tokens
   * @param lending_tokens 
   * @param debt_tokens 
   * @param user 
   * @returns hf (e.g. returns 1.5 for 150% health factor)
   */
  async get_health_factor_tokenwise(lending_tokens, debt_tokens, user) {
    const positions = await this.getPositions(user);
    logger.verbose(`${this.metadata.name}:: Positions: ${JSON.stringify(positions)}`);
    let effectiveDebt = new Web3Number(0, 6);
    positions.filter((pos) => {
      return debt_tokens.find((t) => t.symbol === pos.tokenSymbol);
    }).forEach((pos) => {
      const token = this.tokens.find((t) => t.symbol === pos.tokenSymbol);
      if (!token) {
        throw new FatalError(`Token ${pos.tokenName} not found in ${this.metadata.name}`);
      }
      effectiveDebt = effectiveDebt.plus(pos.debtUSD.dividedBy(token.borrowFactor.toFixed(6)).toString());
    });
    logger.verbose(`${this.metadata.name}:: Effective debt: ${effectiveDebt}`);
    if (effectiveDebt.isZero()) {
      return Infinity;
    }
    let effectiveCollateral = new Web3Number(0, 6);
    positions.filter((pos) => {
      const exp1 = lending_tokens.find((t) => t.symbol === pos.tokenSymbol);
      const exp2 = pos.marginType === "shared" /* SHARED */;
      return exp1 && exp2;
    }).forEach((pos) => {
      const token = this.tokens.find((t) => t.symbol === pos.tokenSymbol);
      if (!token) {
        throw new FatalError(`Token ${pos.tokenName} not found in ${this.metadata.name}`);
      }
      logger.verbose(`${this.metadata.name}:: Token: ${pos.tokenName}, Collateral factor: ${token.collareralFactor.toFixed(6)}`);
      effectiveCollateral = effectiveCollateral.plus(pos.supplyUSD.multipliedBy(token.collareralFactor.toFixed(6)).toString());
    });
    logger.verbose(`${this.metadata.name}:: Effective collateral: ${effectiveCollateral}`);
    const healthFactor = effectiveCollateral.dividedBy(effectiveDebt.toFixed(6)).toNumber();
    logger.verbose(`${this.metadata.name}:: Health factor: ${healthFactor}`);
    return healthFactor;
  }
  /**
   * @description Get the health factor of the user
   * - Considers all tokens for collateral and debt
   */
  async get_health_factor(user) {
    return this.get_health_factor_tokenwise(this.tokens, this.tokens, user);
  }
  async getPositionsSummary(user) {
    const pos = await this.getPositions(user);
    const collateralUSD = pos.reduce((acc, p) => acc + p.supplyUSD.toNumber(), 0);
    const debtUSD = pos.reduce((acc, p) => acc + p.debtUSD.toNumber(), 0);
    return {
      collateralUSD,
      debtUSD
    };
  }
  /**
   * @description Get the token-wise collateral and debt positions of the user 
   * @param user Contract address of the user
   * @returns Promise<ILendingPosition[]>
   */
  async getPositions(user) {
    const url = this.POSITION_URL.replace("{{USER_ADDR}}", user.address);
    const result = await axios3.get(url);
    const data = result.data;
    const lendingPosition = [];
    logger.verbose(`${this.metadata.name}:: Positions: ${JSON.stringify(data)}`);
    for (let i = 0; i < data.pools.length; i++) {
      const pool = data.pools[i];
      const token = this.tokens.find((t) => {
        return t.symbol === pool.token_symbol;
      });
      if (!token) {
        throw new FatalError(`Token ${pool.token_symbol} not found in ${this.metadata.name}`);
      }
      const debtAmount = Web3Number.fromWei(pool.data.debt_amount, token.decimals);
      const supplyAmount = Web3Number.fromWei(pool.data.supply_amount, token.decimals);
      const price = (await this.pricer.getPrice(token.symbol)).price;
      lendingPosition.push({
        tokenName: token.name,
        tokenSymbol: token.symbol,
        marginType: pool.data.is_collateral ? "shared" /* SHARED */ : "none" /* NONE */,
        debtAmount,
        debtUSD: debtAmount.multipliedBy(price.toFixed(6)),
        supplyAmount,
        supplyUSD: supplyAmount.multipliedBy(price.toFixed(6))
      });
    }
    ;
    return lendingPosition;
  }
};
_ZkLend.POOLS_URL = "https://app.zklend.com/api/pools";
var ZkLend = _ZkLend;

// src/modules/pricer-from-api.ts
import axios4 from "axios";
var PricerFromApi = class extends PricerBase {
  constructor(config, tokens2) {
    super(config, tokens2);
  }
  async getPrice(tokenSymbol) {
    try {
      return await this.getPriceFromMyAPI(tokenSymbol);
    } catch (e) {
      logger.warn("getPriceFromMyAPI error", JSON.stringify(e.message || e));
    }
    logger.log("getPrice coinbase", tokenSymbol);
    let retry = 0;
    const MAX_RETRIES = 5;
    for (retry = 1; retry < MAX_RETRIES + 1; retry++) {
      try {
        const priceInfo = await axios4.get(
          `https://api.coinbase.com/v2/prices/${tokenSymbol}-USDT/spot`
        );
        if (!priceInfo) {
          throw new Error("Failed to fetch price");
        }
        const data = await priceInfo.data;
        const price = Number(data.data.amount);
        return {
          price,
          timestamp: /* @__PURE__ */ new Date()
        };
      } catch (e) {
        logger.warn("getPrice coinbase error", JSON.stringify(e.message || e));
        await new Promise((resolve) => setTimeout(resolve, retry * 1e3));
      }
    }
    throw new Error(`Failed to fetch price for ${tokenSymbol}`);
  }
  async getPriceFromMyAPI(tokenSymbol) {
    logger.verbose(`getPrice from redis: ${tokenSymbol}`);
    const endpoint = "https://app.strkfarm.com";
    const url = `${endpoint}/api/price/${tokenSymbol}`;
    const priceInfoRes = await fetch(url);
    const priceInfo = await priceInfoRes.json();
    const now = /* @__PURE__ */ new Date();
    const priceTime = new Date(priceInfo.timestamp);
    const price = Number(priceInfo.price);
    return {
      price,
      timestamp: new Date(priceInfo.timestamp)
    };
  }
};

// src/modules/erc20.ts
import { Contract as Contract2 } from "starknet";

// src/data/erc20.abi.json
var erc20_abi_default = [
  {
    name: "LockingContract",
    type: "impl",
    interface_name: "src::mintable_lock_interface::ILockingContract"
  },
  {
    name: "src::mintable_lock_interface::ILockingContract",
    type: "interface",
    items: [
      {
        name: "set_locking_contract",
        type: "function",
        inputs: [
          {
            name: "locking_contract",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "get_locking_contract",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    name: "LockAndDelegate",
    type: "impl",
    interface_name: "src::mintable_lock_interface::ILockAndDelegate"
  },
  {
    name: "core::integer::u256",
    type: "struct",
    members: [
      {
        name: "low",
        type: "core::integer::u128"
      },
      {
        name: "high",
        type: "core::integer::u128"
      }
    ]
  },
  {
    name: "src::mintable_lock_interface::ILockAndDelegate",
    type: "interface",
    items: [
      {
        name: "lock_and_delegate",
        type: "function",
        inputs: [
          {
            name: "delegatee",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "lock_and_delegate_by_sig",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "delegatee",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          },
          {
            name: "nonce",
            type: "core::felt252"
          },
          {
            name: "expiry",
            type: "core::integer::u64"
          },
          {
            name: "signature",
            type: "core::array::Array::<core::felt252>"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "MintableToken",
    type: "impl",
    interface_name: "src::mintable_token_interface::IMintableToken"
  },
  {
    name: "src::mintable_token_interface::IMintableToken",
    type: "interface",
    items: [
      {
        name: "permissioned_mint",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "permissioned_burn",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "MintableTokenCamelImpl",
    type: "impl",
    interface_name: "src::mintable_token_interface::IMintableTokenCamel"
  },
  {
    name: "src::mintable_token_interface::IMintableTokenCamel",
    type: "interface",
    items: [
      {
        name: "permissionedMint",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "permissionedBurn",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "Replaceable",
    type: "impl",
    interface_name: "src::replaceability_interface::IReplaceable"
  },
  {
    name: "core::array::Span::<core::felt252>",
    type: "struct",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    name: "src::replaceability_interface::EICData",
    type: "struct",
    members: [
      {
        name: "eic_hash",
        type: "core::starknet::class_hash::ClassHash"
      },
      {
        name: "eic_init_data",
        type: "core::array::Span::<core::felt252>"
      }
    ]
  },
  {
    name: "core::option::Option::<src::replaceability_interface::EICData>",
    type: "enum",
    variants: [
      {
        name: "Some",
        type: "src::replaceability_interface::EICData"
      },
      {
        name: "None",
        type: "()"
      }
    ]
  },
  {
    name: "core::bool",
    type: "enum",
    variants: [
      {
        name: "False",
        type: "()"
      },
      {
        name: "True",
        type: "()"
      }
    ]
  },
  {
    name: "src::replaceability_interface::ImplementationData",
    type: "struct",
    members: [
      {
        name: "impl_hash",
        type: "core::starknet::class_hash::ClassHash"
      },
      {
        name: "eic_data",
        type: "core::option::Option::<src::replaceability_interface::EICData>"
      },
      {
        name: "final",
        type: "core::bool"
      }
    ]
  },
  {
    name: "src::replaceability_interface::IReplaceable",
    type: "interface",
    items: [
      {
        name: "get_upgrade_delay",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u64"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_impl_activation_time",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData"
          }
        ],
        outputs: [
          {
            type: "core::integer::u64"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "add_new_implementation",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "remove_implementation",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "replace_to",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "AccessControlImplExternal",
    type: "impl",
    interface_name: "src::access_control_interface::IAccessControl"
  },
  {
    name: "src::access_control_interface::IAccessControl",
    type: "interface",
    items: [
      {
        name: "has_role",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          },
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_role_admin",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          }
        ],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    name: "RolesImpl",
    type: "impl",
    interface_name: "src::roles_interface::IMinimalRoles"
  },
  {
    name: "src::roles_interface::IMinimalRoles",
    type: "interface",
    items: [
      {
        name: "is_governance_admin",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "is_upgrade_governor",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "register_governance_admin",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "remove_governance_admin",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "register_upgrade_governor",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "remove_upgrade_governor",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "renounce",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "ERC20Impl",
    type: "impl",
    interface_name: "openzeppelin::token::erc20::interface::IERC20"
  },
  {
    name: "openzeppelin::token::erc20::interface::IERC20",
    type: "interface",
    items: [
      {
        name: "name",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "symbol",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "decimals",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u8"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "total_supply",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "balance_of",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "allowance",
        type: "function",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "transfer",
        type: "function",
        inputs: [
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "transfer_from",
        type: "function",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "approve",
        type: "function",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "ERC20CamelOnlyImpl",
    type: "impl",
    interface_name: "openzeppelin::token::erc20::interface::IERC20CamelOnly"
  },
  {
    name: "openzeppelin::token::erc20::interface::IERC20CamelOnly",
    type: "interface",
    items: [
      {
        name: "totalSupply",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "balanceOf",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "transferFrom",
        type: "function",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "constructor",
    type: "constructor",
    inputs: [
      {
        name: "name",
        type: "core::felt252"
      },
      {
        name: "symbol",
        type: "core::felt252"
      },
      {
        name: "decimals",
        type: "core::integer::u8"
      },
      {
        name: "initial_supply",
        type: "core::integer::u256"
      },
      {
        name: "recipient",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "permitted_minter",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "provisional_governance_admin",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "upgrade_delay",
        type: "core::integer::u64"
      }
    ]
  },
  {
    name: "increase_allowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "added_value",
        type: "core::integer::u256"
      }
    ],
    outputs: [
      {
        type: "core::bool"
      }
    ],
    state_mutability: "external"
  },
  {
    name: "decrease_allowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "subtracted_value",
        type: "core::integer::u256"
      }
    ],
    outputs: [
      {
        type: "core::bool"
      }
    ],
    state_mutability: "external"
  },
  {
    name: "increaseAllowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "addedValue",
        type: "core::integer::u256"
      }
    ],
    outputs: [
      {
        type: "core::bool"
      }
    ],
    state_mutability: "external"
  },
  {
    name: "decreaseAllowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "subtractedValue",
        type: "core::integer::u256"
      }
    ],
    outputs: [
      {
        type: "core::bool"
      }
    ],
    state_mutability: "external"
  },
  {
    kind: "struct",
    name: "src::strk::erc20_lockable::ERC20Lockable::Transfer",
    type: "event",
    members: [
      {
        kind: "data",
        name: "from",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "to",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "value",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::strk::erc20_lockable::ERC20Lockable::Approval",
    type: "event",
    members: [
      {
        kind: "data",
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "value",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationAdded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "implementation_data",
        type: "src::replaceability_interface::ImplementationData"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationRemoved",
    type: "event",
    members: [
      {
        kind: "data",
        name: "implementation_data",
        type: "src::replaceability_interface::ImplementationData"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationReplaced",
    type: "event",
    members: [
      {
        kind: "data",
        name: "implementation_data",
        type: "src::replaceability_interface::ImplementationData"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationFinalized",
    type: "event",
    members: [
      {
        kind: "data",
        name: "impl_hash",
        type: "core::starknet::class_hash::ClassHash"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::access_control_interface::RoleGranted",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::access_control_interface::RoleRevoked",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::access_control_interface::RoleAdminChanged",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "previous_admin_role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "new_admin_role",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::roles_interface::GovernanceAdminAdded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "added_account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "added_by",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::roles_interface::GovernanceAdminRemoved",
    type: "event",
    members: [
      {
        kind: "data",
        name: "removed_account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "removed_by",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::roles_interface::UpgradeGovernorAdded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "added_account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "added_by",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::roles_interface::UpgradeGovernorRemoved",
    type: "event",
    members: [
      {
        kind: "data",
        name: "removed_account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "removed_by",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "enum",
    name: "src::strk::erc20_lockable::ERC20Lockable::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "Transfer",
        type: "src::strk::erc20_lockable::ERC20Lockable::Transfer"
      },
      {
        kind: "nested",
        name: "Approval",
        type: "src::strk::erc20_lockable::ERC20Lockable::Approval"
      },
      {
        kind: "nested",
        name: "ImplementationAdded",
        type: "src::replaceability_interface::ImplementationAdded"
      },
      {
        kind: "nested",
        name: "ImplementationRemoved",
        type: "src::replaceability_interface::ImplementationRemoved"
      },
      {
        kind: "nested",
        name: "ImplementationReplaced",
        type: "src::replaceability_interface::ImplementationReplaced"
      },
      {
        kind: "nested",
        name: "ImplementationFinalized",
        type: "src::replaceability_interface::ImplementationFinalized"
      },
      {
        kind: "nested",
        name: "RoleGranted",
        type: "src::access_control_interface::RoleGranted"
      },
      {
        kind: "nested",
        name: "RoleRevoked",
        type: "src::access_control_interface::RoleRevoked"
      },
      {
        kind: "nested",
        name: "RoleAdminChanged",
        type: "src::access_control_interface::RoleAdminChanged"
      },
      {
        kind: "nested",
        name: "GovernanceAdminAdded",
        type: "src::roles_interface::GovernanceAdminAdded"
      },
      {
        kind: "nested",
        name: "GovernanceAdminRemoved",
        type: "src::roles_interface::GovernanceAdminRemoved"
      },
      {
        kind: "nested",
        name: "UpgradeGovernorAdded",
        type: "src::roles_interface::UpgradeGovernorAdded"
      },
      {
        kind: "nested",
        name: "UpgradeGovernorRemoved",
        type: "src::roles_interface::UpgradeGovernorRemoved"
      }
    ]
  }
];

// src/modules/erc20.ts
var ERC20 = class {
  constructor(config) {
    this.config = config;
  }
  contract(addr) {
    const _addr = typeof addr === "string" ? addr : addr.address;
    return new Contract2(erc20_abi_default, _addr, this.config.provider);
  }
  async balanceOf(token, address, tokenDecimals) {
    const contract = this.contract(token);
    const balance = await contract.call("balanceOf", [address.toString()]);
    return Web3Number.fromWei(balance.toString(), tokenDecimals);
  }
};

// src/modules/avnu.ts
import { uint256 } from "starknet";
import { fetchBuildExecuteTransaction, fetchQuotes } from "@avnu/avnu-sdk";

// src/utils/index.ts
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// src/modules/avnu.ts
var AvnuWrapper = class _AvnuWrapper {
  async getQuotes(fromToken, toToken, amountWei, taker, retry = 0) {
    const MAX_RETRY = 5;
    logger.verbose(`${_AvnuWrapper.name}: getQuotes => Getting quotes for ${fromToken} -> ${toToken}, amount: ${amountWei}, taker: ${taker}, retry: ${retry}`);
    const params = {
      sellTokenAddress: fromToken,
      buyTokenAddress: toToken,
      sellAmount: amountWei,
      takerAddress: taker,
      //   excludeSources: ['Nostra', 'Haiko(Solvers)']
      excludeSources: ["Haiko(Solvers)"]
      // to resolve InvalidOraclePrice error
    };
    assert(fromToken != toToken, "From and to tokens are the same");
    const quotes = await fetchQuotes(params);
    if (quotes.length == 0) {
      if (retry < MAX_RETRY) {
        await new Promise((res) => setTimeout(res, 3e3));
        return await this.getQuotes(fromToken, toToken, amountWei, taker, retry + 1);
      }
      throw new Error("no quotes found");
    }
    return quotes[0];
  }
  async getSwapInfo(quote, taker, integratorFeeBps, integratorFeeRecipient, minAmount) {
    const calldata = await fetchBuildExecuteTransaction(quote.quoteId);
    const call = calldata.calls[1];
    const callData = call.calldata;
    const routesLen = Number(callData[11]);
    assert(routesLen > 0, "No routes found");
    let startIndex = 12;
    const routes = [];
    for (let i = 0; i < routesLen; ++i) {
      const swap_params_len = Number(callData[startIndex + 4]);
      const route = {
        token_from: callData[startIndex],
        token_to: callData[startIndex + 1],
        exchange_address: callData[startIndex + 2],
        percent: Number(callData[startIndex + 3]),
        additional_swap_params: swap_params_len > 0 ? callData.slice(startIndex + 5, startIndex + 5 + swap_params_len) : []
      };
      routes.push(route);
      startIndex += 5 + swap_params_len;
    }
    const _minAmount = minAmount || (quote.buyAmount * 95n / 100n).toString();
    logger.verbose(`${_AvnuWrapper.name}: getSwapInfo => buyToken: ${quote.buyTokenAddress}`);
    logger.verbose(`${_AvnuWrapper.name}: getSwapInfo => buyAmount: ${quote.buyAmount}, minAmount: ${_minAmount}`);
    const swapInfo = {
      token_from_address: quote.sellTokenAddress,
      token_from_amount: uint256.bnToUint256(quote.sellAmount),
      token_to_address: quote.buyTokenAddress,
      token_to_amount: uint256.bnToUint256(_minAmount),
      token_to_min_amount: uint256.bnToUint256(_minAmount),
      beneficiary: taker,
      integrator_fee_amount_bps: integratorFeeBps,
      integrator_fee_recipient: integratorFeeRecipient,
      routes
    };
    return swapInfo;
  }
};

// src/interfaces/common.ts
import { RpcProvider as RpcProvider2 } from "starknet";
var RiskType = /* @__PURE__ */ ((RiskType2) => {
  RiskType2["MARKET_RISK"] = "Market Risk";
  RiskType2["IMPERMANENT_LOSS"] = "Impermanent Loss Risk";
  RiskType2["LIQUIDATION_RISK"] = "Liquidation Risk";
  RiskType2["LOW_LIQUIDITY_RISK"] = "Low Liquidity Risk";
  RiskType2["SMART_CONTRACT_RISK"] = "Smart Contract Risk";
  RiskType2["ORACLE_RISK"] = "Oracle Risk";
  RiskType2["TECHNICAL_RISK"] = "Technical Risk";
  RiskType2["COUNTERPARTY_RISK"] = "Counterparty Risk";
  return RiskType2;
})(RiskType || {});
var Network = /* @__PURE__ */ ((Network2) => {
  Network2["mainnet"] = "mainnet";
  Network2["sepolia"] = "sepolia";
  Network2["devnet"] = "devnet";
  return Network2;
})(Network || {});
var FlowChartColors = /* @__PURE__ */ ((FlowChartColors2) => {
  FlowChartColors2["Green"] = "purple";
  FlowChartColors2["Blue"] = "#35484f";
  FlowChartColors2["Purple"] = "#6e53dc";
  return FlowChartColors2;
})(FlowChartColors || {});
function getMainnetConfig(rpcUrl = "https://starknet-mainnet.public.blastapi.io", blockIdentifier = "pending") {
  return {
    provider: new RpcProvider2({
      nodeUrl: rpcUrl,
      blockIdentifier
    }),
    stage: "production",
    network: "mainnet" /* mainnet */
  };
}
var getRiskExplaination = (riskType) => {
  switch (riskType) {
    case "Market Risk" /* MARKET_RISK */:
      return "The risk of the market moving against the position.";
    case "Impermanent Loss Risk" /* IMPERMANENT_LOSS */:
      return "The temporary loss of value experienced by liquidity providers in AMMs when asset prices diverge compared to simply holding them.";
    case "Liquidation Risk" /* LIQUIDATION_RISK */:
      return "The risk of losing funds due to the position being liquidated.";
    case "Low Liquidity Risk" /* LOW_LIQUIDITY_RISK */:
      return "The risk of low liquidity in the pool, which can lead to high slippages or reduced in-abilities to quickly exit the position.";
    case "Oracle Risk" /* ORACLE_RISK */:
      return "The risk of the oracle being manipulated or incorrect.";
    case "Smart Contract Risk" /* SMART_CONTRACT_RISK */:
      return "The risk of the smart contract being vulnerable to attacks.";
    case "Technical Risk" /* TECHNICAL_RISK */:
      return "The risk of technical issues e.g. backend failure.";
    case "Counterparty Risk" /* COUNTERPARTY_RISK */:
      return "The risk of the counterparty defaulting e.g. bad debt on lending platforms.";
  }
};
var getRiskColor = (risk) => {
  const value = risk.value;
  if (value === 0) return "green";
  if (value < 2.5) return "yellow";
  return "red";
};
var getNoRiskTags = (risks) => {
  const noRisks1 = risks.filter((risk) => risk.value === 0).map((risk) => risk.type);
  const noRisks2 = Object.values(RiskType).filter((risk) => !risks.map((risk2) => risk2.type).includes(risk));
  const mergedUnique = [.../* @__PURE__ */ new Set([...noRisks1, ...noRisks2])];
  return mergedUnique.map((risk) => `No ${risk}`);
};

// src/interfaces/initializable.ts
var Initializable = class {
  constructor() {
    this.initialized = false;
  }
  async waitForInitilisation() {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (this.initialized) {
          console.log("Initialised");
          clearInterval(interval);
          resolve();
        }
      }, 1e3);
    });
  }
};

// src/strategies/autoCompounderStrk.ts
import { Contract as Contract3, uint256 as uint2562 } from "starknet";
var AutoCompounderSTRK = class {
  constructor(config, pricer) {
    this.addr = ContractAddr.from("0x541681b9ad63dff1b35f79c78d8477f64857de29a27902f7298f7b620838ea");
    this.initialized = false;
    this.contract = null;
    this.metadata = {
      decimals: 18,
      underlying: {
        // zSTRK
        address: ContractAddr.from("0x06d8fa671ef84f791b7f601fa79fea8f6ceb70b5fa84189e3159d532162efc21"),
        name: "STRK",
        symbol: "STRK"
      },
      name: "AutoCompounderSTRK"
    };
    this.config = config;
    this.pricer = pricer;
    this.init();
  }
  async init() {
    const provider = this.config.provider;
    const cls = await provider.getClassAt(this.addr.address);
    this.contract = new Contract3(cls.abi, this.addr.address, provider);
    this.initialized = true;
  }
  async waitForInitilisation() {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (this.initialized) {
          clearInterval(interval);
          resolve();
        }
      }, 1e3);
    });
  }
  /** Returns shares of user */
  async balanceOf(user) {
    const result = await this.contract.balanceOf(user.address);
    return Web3Number.fromWei(result.toString(), this.metadata.decimals);
  }
  /** Returns underlying assets of user */
  async balanceOfUnderlying(user) {
    const balanceShares = await this.balanceOf(user);
    const assets = await this.contract.convert_to_assets(uint2562.bnToUint256(balanceShares.toWei()));
    return Web3Number.fromWei(assets.toString(), this.metadata.decimals);
  }
  /** Returns usd value of assets */
  async usdBalanceOfUnderlying(user) {
    const assets = await this.balanceOfUnderlying(user);
    const price = await this.pricer.getPrice(this.metadata.underlying.name);
    const usd = assets.multipliedBy(price.price.toFixed(6));
    return {
      usd,
      assets
    };
  }
};

// src/strategies/vesu-rebalance.tsx
import { CairoCustomEnum, Contract as Contract5, num as num3, uint256 as uint2563 } from "starknet";

// src/data/vesu-rebalance.abi.json
var vesu_rebalance_abi_default = [
  {
    type: "impl",
    name: "ExternalImpl",
    interface_name: "strkfarm_contracts::strategies::vesu_rebalance::interface::IVesuRebal"
  },
  {
    type: "enum",
    name: "strkfarm_contracts::strategies::vesu_rebalance::interface::Feature",
    variants: [
      {
        name: "DEPOSIT",
        type: "()"
      },
      {
        name: "WITHDRAW",
        type: "()"
      }
    ]
  },
  {
    type: "struct",
    name: "core::integer::u256",
    members: [
      {
        name: "low",
        type: "core::integer::u128"
      },
      {
        name: "high",
        type: "core::integer::u128"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::strategies::vesu_rebalance::interface::Action",
    members: [
      {
        name: "pool_id",
        type: "core::felt252"
      },
      {
        name: "feature",
        type: "strkfarm_contracts::strategies::vesu_rebalance::interface::Feature"
      },
      {
        name: "token",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "amount",
        type: "core::integer::u256"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::interfaces::IEkuboDistributor::Claim",
    members: [
      {
        name: "id",
        type: "core::integer::u64"
      },
      {
        name: "claimee",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "amount",
        type: "core::integer::u128"
      }
    ]
  },
  {
    type: "struct",
    name: "core::array::Span::<core::felt252>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::components::swap::Route",
    members: [
      {
        name: "token_from",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "token_to",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "exchange_address",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "percent",
        type: "core::integer::u128"
      },
      {
        name: "additional_swap_params",
        type: "core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::components::swap::AvnuMultiRouteSwap",
    members: [
      {
        name: "token_from_address",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "token_from_amount",
        type: "core::integer::u256"
      },
      {
        name: "token_to_address",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "token_to_amount",
        type: "core::integer::u256"
      },
      {
        name: "token_to_min_amount",
        type: "core::integer::u256"
      },
      {
        name: "beneficiary",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "integrator_fee_amount_bps",
        type: "core::integer::u128"
      },
      {
        name: "integrator_fee_recipient",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "routes",
        type: "core::array::Array::<strkfarm_contracts::components::swap::Route>"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::strategies::vesu_rebalance::interface::Settings",
    members: [
      {
        name: "default_pool_index",
        type: "core::integer::u8"
      },
      {
        name: "fee_bps",
        type: "core::integer::u32"
      },
      {
        name: "fee_receiver",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::strategies::vesu_rebalance::interface::PoolProps",
    members: [
      {
        name: "pool_id",
        type: "core::felt252"
      },
      {
        name: "max_weight",
        type: "core::integer::u32"
      },
      {
        name: "v_token",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    type: "interface",
    name: "strkfarm_contracts::strategies::vesu_rebalance::interface::IVesuRebal",
    items: [
      {
        type: "function",
        name: "rebalance",
        inputs: [
          {
            name: "actions",
            type: "core::array::Array::<strkfarm_contracts::strategies::vesu_rebalance::interface::Action>"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "rebalance_weights",
        inputs: [
          {
            name: "actions",
            type: "core::array::Array::<strkfarm_contracts::strategies::vesu_rebalance::interface::Action>"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "emergency_withdraw",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "emergency_withdraw_pool",
        inputs: [
          {
            name: "pool_index",
            type: "core::integer::u32"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "compute_yield",
        inputs: [],
        outputs: [
          {
            type: "(core::integer::u256, core::integer::u256)"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "harvest",
        inputs: [
          {
            name: "rewardsContract",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "claim",
            type: "strkfarm_contracts::interfaces::IEkuboDistributor::Claim"
          },
          {
            name: "proof",
            type: "core::array::Span::<core::felt252>"
          },
          {
            name: "swapInfo",
            type: "strkfarm_contracts::components::swap::AvnuMultiRouteSwap"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "set_settings",
        inputs: [
          {
            name: "settings",
            type: "strkfarm_contracts::strategies::vesu_rebalance::interface::Settings"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "set_allowed_pools",
        inputs: [
          {
            name: "pools",
            type: "core::array::Array::<strkfarm_contracts::strategies::vesu_rebalance::interface::PoolProps>"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "set_incentives_off",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "get_settings",
        inputs: [],
        outputs: [
          {
            type: "strkfarm_contracts::strategies::vesu_rebalance::interface::Settings"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_allowed_pools",
        inputs: [],
        outputs: [
          {
            type: "core::array::Array::<strkfarm_contracts::strategies::vesu_rebalance::interface::PoolProps>"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_previous_index",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "impl",
    name: "VesuERC4626Impl",
    interface_name: "strkfarm_contracts::interfaces::IERC4626::IERC4626"
  },
  {
    type: "interface",
    name: "strkfarm_contracts::interfaces::IERC4626::IERC4626",
    items: [
      {
        type: "function",
        name: "asset",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "total_assets",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "convert_to_shares",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "convert_to_assets",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "max_deposit",
        inputs: [
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "preview_deposit",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "deposit",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "max_mint",
        inputs: [
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "preview_mint",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "mint",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "max_withdraw",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "preview_withdraw",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "withdraw",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "max_redeem",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "preview_redeem",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "redeem",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    type: "impl",
    name: "VesuERC20Impl",
    interface_name: "openzeppelin_token::erc20::interface::IERC20Mixin"
  },
  {
    type: "enum",
    name: "core::bool",
    variants: [
      {
        name: "False",
        type: "()"
      },
      {
        name: "True",
        type: "()"
      }
    ]
  },
  {
    type: "struct",
    name: "core::byte_array::ByteArray",
    members: [
      {
        name: "data",
        type: "core::array::Array::<core::bytes_31::bytes31>"
      },
      {
        name: "pending_word",
        type: "core::felt252"
      },
      {
        name: "pending_word_len",
        type: "core::integer::u32"
      }
    ]
  },
  {
    type: "interface",
    name: "openzeppelin_token::erc20::interface::IERC20Mixin",
    items: [
      {
        type: "function",
        name: "total_supply",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "balance_of",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "allowance",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "transfer",
        inputs: [
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "transfer_from",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "approve",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "name",
        inputs: [],
        outputs: [
          {
            type: "core::byte_array::ByteArray"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "symbol",
        inputs: [],
        outputs: [
          {
            type: "core::byte_array::ByteArray"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "decimals",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u8"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "totalSupply",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "balanceOf",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "transferFrom",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    type: "impl",
    name: "CommonCompImpl",
    interface_name: "strkfarm_contracts::interfaces::common::ICommon"
  },
  {
    type: "interface",
    name: "strkfarm_contracts::interfaces::common::ICommon",
    items: [
      {
        type: "function",
        name: "upgrade",
        inputs: [
          {
            name: "new_class",
            type: "core::starknet::class_hash::ClassHash"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "pause",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "unpause",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "is_paused",
        inputs: [],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "impl",
    name: "RewardShareImpl",
    interface_name: "strkfarm_contracts::components::harvester::reward_shares::IRewardShare"
  },
  {
    type: "struct",
    name: "strkfarm_contracts::components::harvester::reward_shares::UserRewardsInfo",
    members: [
      {
        name: "pending_round_points",
        type: "core::integer::u128"
      },
      {
        name: "shares_owned",
        type: "core::integer::u128"
      },
      {
        name: "block_number",
        type: "core::integer::u64"
      },
      {
        name: "index",
        type: "core::integer::u32"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::components::harvester::reward_shares::RewardsInfo",
    members: [
      {
        name: "amount",
        type: "core::integer::u128"
      },
      {
        name: "shares",
        type: "core::integer::u128"
      },
      {
        name: "total_round_points",
        type: "core::integer::u128"
      },
      {
        name: "block_number",
        type: "core::integer::u64"
      }
    ]
  },
  {
    type: "interface",
    name: "strkfarm_contracts::components::harvester::reward_shares::IRewardShare",
    items: [
      {
        type: "function",
        name: "get_user_reward_info",
        inputs: [
          {
            name: "user",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "strkfarm_contracts::components::harvester::reward_shares::UserRewardsInfo"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_rewards_info",
        inputs: [
          {
            name: "index",
            type: "core::integer::u32"
          }
        ],
        outputs: [
          {
            type: "strkfarm_contracts::components::harvester::reward_shares::RewardsInfo"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_total_rewards",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u32"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_total_unminted_shares",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_additional_shares",
        inputs: [
          {
            name: "user",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u128, core::integer::u64, core::integer::u128)"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::interfaces::IVesu::IStonDispatcher",
    members: [
      {
        name: "contract_address",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::components::vesu::vesuStruct",
    members: [
      {
        name: "singleton",
        type: "strkfarm_contracts::interfaces::IVesu::IStonDispatcher"
      },
      {
        name: "pool_id",
        type: "core::felt252"
      },
      {
        name: "debt",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "col",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "oracle",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    type: "constructor",
    name: "constructor",
    inputs: [
      {
        name: "asset",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "access_control",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "allowed_pools",
        type: "core::array::Array::<strkfarm_contracts::strategies::vesu_rebalance::interface::PoolProps>"
      },
      {
        name: "settings",
        type: "strkfarm_contracts::strategies::vesu_rebalance::interface::Settings"
      },
      {
        name: "vesu_settings",
        type: "strkfarm_contracts::components::vesu::vesuStruct"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_security::reentrancyguard::ReentrancyGuardComponent::Event",
    kind: "enum",
    variants: []
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::erc4626::ERC4626Component::Deposit",
    kind: "struct",
    members: [
      {
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "assets",
        type: "core::integer::u256",
        kind: "data"
      },
      {
        name: "shares",
        type: "core::integer::u256",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::erc4626::ERC4626Component::Withdraw",
    kind: "struct",
    members: [
      {
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "receiver",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "assets",
        type: "core::integer::u256",
        kind: "data"
      },
      {
        name: "shares",
        type: "core::integer::u256",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::erc4626::ERC4626Component::Event",
    kind: "enum",
    variants: [
      {
        name: "Deposit",
        type: "strkfarm_contracts::components::erc4626::ERC4626Component::Deposit",
        kind: "nested"
      },
      {
        name: "Withdraw",
        type: "strkfarm_contracts::components::erc4626::ERC4626Component::Withdraw",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::Rewards",
    kind: "struct",
    members: [
      {
        name: "index",
        type: "core::integer::u32",
        kind: "data"
      },
      {
        name: "info",
        type: "strkfarm_contracts::components::harvester::reward_shares::RewardsInfo",
        kind: "data"
      },
      {
        name: "total_reward_shares",
        type: "core::integer::u128",
        kind: "data"
      },
      {
        name: "timestamp",
        type: "core::integer::u64",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::UserRewards",
    kind: "struct",
    members: [
      {
        name: "user",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "info",
        type: "strkfarm_contracts::components::harvester::reward_shares::UserRewardsInfo",
        kind: "data"
      },
      {
        name: "total_reward_shares",
        type: "core::integer::u128",
        kind: "data"
      },
      {
        name: "timestamp",
        type: "core::integer::u64",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::Event",
    kind: "enum",
    variants: [
      {
        name: "Rewards",
        type: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::Rewards",
        kind: "nested"
      },
      {
        name: "UserRewards",
        type: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::UserRewards",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_token::erc20::erc20::ERC20Component::Transfer",
    kind: "struct",
    members: [
      {
        name: "from",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "to",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "value",
        type: "core::integer::u256",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_token::erc20::erc20::ERC20Component::Approval",
    kind: "struct",
    members: [
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "value",
        type: "core::integer::u256",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_token::erc20::erc20::ERC20Component::Event",
    kind: "enum",
    variants: [
      {
        name: "Transfer",
        type: "openzeppelin_token::erc20::erc20::ERC20Component::Transfer",
        kind: "nested"
      },
      {
        name: "Approval",
        type: "openzeppelin_token::erc20::erc20::ERC20Component::Approval",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_introspection::src5::SRC5Component::Event",
    kind: "enum",
    variants: []
  },
  {
    type: "event",
    name: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Upgraded",
    kind: "struct",
    members: [
      {
        name: "class_hash",
        type: "core::starknet::class_hash::ClassHash",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Event",
    kind: "enum",
    variants: [
      {
        name: "Upgraded",
        type: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Upgraded",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_security::pausable::PausableComponent::Paused",
    kind: "struct",
    members: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_security::pausable::PausableComponent::Unpaused",
    kind: "struct",
    members: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_security::pausable::PausableComponent::Event",
    kind: "enum",
    variants: [
      {
        name: "Paused",
        type: "openzeppelin_security::pausable::PausableComponent::Paused",
        kind: "nested"
      },
      {
        name: "Unpaused",
        type: "openzeppelin_security::pausable::PausableComponent::Unpaused",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::common::CommonComp::Event",
    kind: "enum",
    variants: []
  },
  {
    type: "event",
    name: "strkfarm_contracts::strategies::vesu_rebalance::vesu_rebalance::VesuRebalance::Rebalance",
    kind: "struct",
    members: [
      {
        name: "yield_before",
        type: "core::integer::u128",
        kind: "data"
      },
      {
        name: "yield_after",
        type: "core::integer::u128",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::strategies::vesu_rebalance::vesu_rebalance::VesuRebalance::CollectFees",
    kind: "struct",
    members: [
      {
        name: "fee_collected",
        type: "core::integer::u128",
        kind: "data"
      },
      {
        name: "fee_collector",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::strategies::vesu_rebalance::vesu_rebalance::VesuRebalance::Event",
    kind: "enum",
    variants: [
      {
        name: "ReentrancyGuardEvent",
        type: "openzeppelin_security::reentrancyguard::ReentrancyGuardComponent::Event",
        kind: "flat"
      },
      {
        name: "ERC4626Event",
        type: "strkfarm_contracts::components::erc4626::ERC4626Component::Event",
        kind: "flat"
      },
      {
        name: "RewardShareEvent",
        type: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::Event",
        kind: "flat"
      },
      {
        name: "ERC20Event",
        type: "openzeppelin_token::erc20::erc20::ERC20Component::Event",
        kind: "flat"
      },
      {
        name: "SRC5Event",
        type: "openzeppelin_introspection::src5::SRC5Component::Event",
        kind: "flat"
      },
      {
        name: "UpgradeableEvent",
        type: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Event",
        kind: "flat"
      },
      {
        name: "PausableEvent",
        type: "openzeppelin_security::pausable::PausableComponent::Event",
        kind: "flat"
      },
      {
        name: "CommonCompEvent",
        type: "strkfarm_contracts::components::common::CommonComp::Event",
        kind: "flat"
      },
      {
        name: "Rebalance",
        type: "strkfarm_contracts::strategies::vesu_rebalance::vesu_rebalance::VesuRebalance::Rebalance",
        kind: "nested"
      },
      {
        name: "CollectFees",
        type: "strkfarm_contracts::strategies::vesu_rebalance::vesu_rebalance::VesuRebalance::CollectFees",
        kind: "nested"
      }
    ]
  }
];

// src/strategies/base-strategy.ts
var BaseStrategy = class {
  constructor(config) {
    this.config = config;
  }
  async getUserTVL(user) {
    throw new Error("Not implemented");
  }
  async getTVL() {
    throw new Error("Not implemented");
  }
  async depositCall(amountInfo, receiver) {
    throw new Error("Not implemented");
  }
  async withdrawCall(amountInfo, receiver, owner) {
    throw new Error("Not implemented");
  }
};

// src/node/headless.browser.ts
import axios5 from "axios";
async function getAPIUsingHeadlessBrowser(url) {
  const res = await axios5.get(url);
  return res.data;
}

// src/modules/harvests.ts
import { Contract as Contract4, num as num2 } from "starknet";
var Harvests = class _Harvests {
  constructor(config) {
    this.config = config;
  }
  getHarvests(addr) {
    throw new Error("Not implemented");
  }
  async getUnHarvestedRewards(addr) {
    const rewards = await this.getHarvests(addr);
    if (rewards.length == 0) return [];
    const unClaimed = [];
    const cls = await this.config.provider.getClassAt(rewards[0].rewardsContract.address);
    for (let reward of rewards) {
      const contract = new Contract4(cls.abi, reward.rewardsContract.address, this.config.provider);
      const isClaimed = await contract.call("is_claimed", [reward.claim.id]);
      logger.verbose(`${_Harvests.name}: isClaimed: ${isClaimed}`);
      if (isClaimed)
        return unClaimed;
      unClaimed.unshift(reward);
    }
    return unClaimed;
  }
};
var STRK = "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
var EkuboHarvests = class extends Harvests {
  async getHarvests(addr) {
    const EKUBO_API = `https://starknet-mainnet-api.ekubo.org/airdrops/${addr.address}?token=${STRK}`;
    const resultEkubo = await fetch(EKUBO_API);
    const items = await resultEkubo.json();
    const rewards = [];
    for (let i = 0; i < items.length; ++i) {
      const info = items[i];
      assert(info.token == STRK, "expected strk token only");
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
        actualReward: Web3Number.fromWei(info.claim.amount, 18),
        proof: info.proof
      });
    }
    return rewards.sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  }
};
var VesuHarvests = class _VesuHarvests extends Harvests {
  async getHarvests(addr) {
    const result = await fetch(`https://api.vesu.xyz/users/${addr.address}/strk-rewards/calldata`);
    const data = await result.json();
    const rewardsContract = ContractAddr.from("0x0387f3eb1d98632fbe3440a9f1385Aec9d87b6172491d3Dd81f1c35A7c61048F");
    const cls = await this.config.provider.getClassAt(rewardsContract.address);
    const contract = new Contract4(cls.abi, rewardsContract.address, this.config.provider);
    const _claimed_amount = await contract.call("amount_already_claimed", [addr.address]);
    const claimed_amount = Web3Number.fromWei(_claimed_amount.toString(), 18);
    logger.verbose(`${_VesuHarvests.name}: claimed_amount: ${claimed_amount.toString()}`);
    const actualReward = Web3Number.fromWei(data.data.amount, 18).minus(claimed_amount);
    logger.verbose(`${_VesuHarvests.name}: actualReward: ${actualReward.toString()}`);
    return [{
      rewardsContract,
      token: ContractAddr.from(STRK),
      startDate: /* @__PURE__ */ new Date(0),
      endDate: /* @__PURE__ */ new Date(0),
      claim: {
        id: 0,
        amount: Web3Number.fromWei(num2.getDecimalString(data.data.amount), 18),
        claimee: addr
      },
      actualReward,
      proof: data.data.proof
    }];
  }
  async getUnHarvestedRewards(addr) {
    return await this.getHarvests(addr);
  }
};

// src/data/vesu_pools.json
var vesu_pools_default = {
  data: [
    {
      id: "3592269722173619206547282200441502663108152440133676111551048111861909089850",
      name: "Unknown",
      extensionContractAddress: "0x002334189e831d804d4a11d3f71d4a982ec82614ac12ed2e9ca2f8da4e6374fa",
      owner: "0x0000000000000000000000000000000000000000000000000000000000000000",
      isVerified: false,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x0454904f43503a41882e5bc7600d161c82d8aba56d42f0f4b2695687502e8ae6",
            name: "vEther",
            symbol: "vETH",
            decimals: 18
          },
          listedBlockNumber: 918582,
          config: {
            debtFloor: {
              value: "1000000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "22284824652",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000387815702634657",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "0",
              decimals: 18
            },
            totalCollateralShares: {
              value: "0",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "0",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x053b1da8b8221588146617b7a69198b2fba742d36dab7906704e7f2e248ee2d4",
            name: "vWrapped BTC",
            symbol: "vWBTC",
            decimals: 18
          },
          listedBlockNumber: 918582,
          config: {
            debtFloor: {
              value: "1000000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "22284824652",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000387815702634657",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "0",
              decimals: 8
            },
            totalCollateralShares: {
              value: "0",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "0",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "400000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "533144972465446830773892583080325946324702730637763475927650793891202846521",
      name: "Unknown",
      extensionContractAddress: "0x002334189e831d804d4a11d3f71d4a982ec82614ac12ed2e9ca2f8da4e6374fa",
      owner: "0x01c27cb555fdb7704d63c4b7ca7e5dfa1bc73872e762896e77b64d08235a821d",
      isVerified: false,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x027577aafa5fd67143882468e743215401c151fc5524d631b82ef81942e666b0",
            name: "vEther",
            symbol: "vETH",
            decimals: 18
          },
          listedBlockNumber: 921222,
          config: {
            debtFloor: {
              value: "1000000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "22284824652",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000385179722378073",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "0",
              decimals: 18
            },
            totalCollateralShares: {
              value: "0",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "0",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x040993609a86bfea6cba8b4e873a56d8fc515d61a178a924905a6de12daf7995",
            name: "vWrapped BTC",
            symbol: "vWBTC",
            decimals: 18
          },
          listedBlockNumber: 921222,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000385179722378075",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "0",
              decimals: 8
            },
            totalCollateralShares: {
              value: "0",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "0",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "3052650897590517495160361655788186069302156761501841950875544829601534311039",
      name: "Unknown",
      extensionContractAddress: "0x002334189e831d804d4a11d3f71d4a982ec82614ac12ed2e9ca2f8da4e6374fa",
      owner: "0x01c27cb555fdb7704d63c4b7ca7e5dfa1bc73872e762896e77b64d08235a821d",
      isVerified: false,
      assets: [
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x04c4734c7d639f6d181a83c080dc37d277966985bd3332f8e817afb7fb7882e4",
            name: "vUSD Coin",
            symbol: "vUSDC",
            decimals: 18
          },
          listedBlockNumber: 921268,
          config: {
            debtFloor: {
              value: "1000000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "150000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "22284824652",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000385134331591183",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "900000000000000000",
              decimals: 18
            },
            reserve: {
              value: "0",
              decimals: 6
            },
            totalCollateralShares: {
              value: "0",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "0",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x04f8c48f0d97157162ec5b7f735ca9b89d23f84492dd2b4c64e8764cf5e6fd44",
            name: "vWrapped BTC",
            symbol: "vWBTC",
            decimals: 18
          },
          listedBlockNumber: 921268,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "150000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "22284824652",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000385134331591183",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "0",
              decimals: 8
            },
            totalCollateralShares: {
              value: "0",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "0",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "425248635297453184651007479084623816685082127746675242420913558143189363659",
      name: "NIGHT",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x01c27cb555fdb7704d63c4b7ca7e5dfa1bc73872e762896e77b64d08235a821d",
      isVerified: false,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x0203086f833c84083147ccf59ce58ab2aaf1161eb829f8bca09a656d4e7bab11",
            name: "Vesu Ether NIGHT",
            symbol: "vETH-NIGHT",
            decimals: 18
          },
          listedBlockNumber: 954825,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "100000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000351775553366549",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "900000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x057b2aba127f238c2b3c83837b8a3f73645f6f9e9f473f0310eb3bae35b1b7cd",
            name: "Vesu USD Coin NIGHT",
            symbol: "vUSDC-NIGHT",
            decimals: 18
          },
          listedBlockNumber: 954825,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "100000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000351775553366545",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "750000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "1000000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "151108224134777757031930412902733397146249197271167109043815023206058966971",
      name: "Brother Pools",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x0000000000000000000000000000000000000000000000000000000000000000",
      isVerified: false,
      assets: [
        {
          address: "0x03b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee",
          name: "STARKNET BROTHER",
          symbol: "BROTHER",
          decimals: 18,
          vToken: {
            address: "0x0483349dca8ae69eff6f3c12d5aec80e77357fd0d969aea8bf1f6620bd55ae2b",
            name: "Vesu STARKNET BROTHER Brother",
            symbol: "vBROTHER-Brother",
            decimals: 18
          },
          listedBlockNumber: 963489,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000343135813420956",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "500000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x01415bdf70ffe60626b653945c60aa96909493b7025c3dee02360b9d6cca6c43",
            name: "Vesu Ether Brother Pools",
            symbol: "vETH-BrotherPools",
            decimals: 18
          },
          listedBlockNumber: 963489,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000343135813420956",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "900000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x03b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "2553674781806235385475763491225202803829093496846204388866130609169683148867",
      name: "Ekubo Pools",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x0000000000000000000000000000000000000000000000000000000000000000",
      isVerified: false,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x02a1748b8a16e97720f9dfcadce19d7eb6b7fc94d0cfaa91911c92aaa0e4358a",
            name: "Vesu Ether Brother",
            symbol: "vETH-Brother",
            decimals: 18
          },
          listedBlockNumber: 963503,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000343121830302847",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "900000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87",
          name: "Ekubo Protocol",
          symbol: "EKUBO",
          decimals: 18,
          vToken: {
            address: "0x0518c1795ae0eee2c0ac7e519260453945cb02e5eb59391e2ad13902c113b319",
            name: "Vesu Ekubo Protocol Ekubo Pools",
            symbol: "vEKUBO-EkuboPools",
            decimals: 18
          },
          listedBlockNumber: 963503,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000343121830302847",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "500000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x02b15117ce7afda7e36d84ea2421cfa6542c099b06c44ead7725c4c6a2349e85",
            name: "Vesu USD Coin Ekubo Pools",
            symbol: "vUSDC-EkuboPools",
            decimals: 18
          },
          listedBlockNumber: 963503,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000343121830302847",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "900000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "1985822809855347709395094615970537244389350489856433399093735242497495846483",
      name: "EKUBO/USDC",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x0000000000000000000000000000000000000000000000000000000000000000",
      isVerified: false,
      assets: [
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x06a9293947aeba86f741d3df93a64cf20b8ea19833ec3c22a3f0139d0ce7aef5",
            name: "Vesu USD Coin EKUBO/USDC",
            symbol: "vUSDC-EKUBO/USDC",
            decimals: 18
          },
          listedBlockNumber: 976934,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000329646631323706",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87",
          name: "Ekubo Protocol",
          symbol: "EKUBO",
          decimals: 18,
          vToken: {
            address: "0x0655169f2dc42c36061748a221f49f8ffb70def5d413bade40b42b037eaef4ca",
            name: "Vesu Ekubo Protocol EKUBO/USDC",
            symbol: "vEKUBO-EKUBO/USDC",
            decimals: 18
          },
          listedBlockNumber: 976934,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000329646631323706",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87",
          maxLTV: {
            value: "900000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "900000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "782484296706413140817565378981992256291686830987606336003410833363463392268",
      name: "ETH/USDC Test",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x07a5c68b185b5d37eb857d1384392a0d63b99481b619afcd6612526371f51750",
      isVerified: false,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x070e57fb72d41ebd3ede252f755835489bbf660662160105b75981b3305831a5",
            name: "Vesu Ether ETH/USDC",
            symbol: "vETH-ETH/USDC",
            decimals: 18
          },
          listedBlockNumber: 1045647,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000260155427733507",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x066f4527be30499633375d392fa2066edbb1f366e213fc05293c810aed8dd48e",
            name: "Vesu USD Coin ETH/USDC",
            symbol: "vUSDC-ETH/USDC",
            decimals: 18
          },
          listedBlockNumber: 1045647,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000260155427733507",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "259303787566998862271055602151197015359833688437739690331932331559568889607",
      name: "reserve",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x01c27cb555fdb7704d63c4b7ca7e5dfa1bc73872e762896e77b64d08235a821d",
      isVerified: false,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x0559b9fa9e2569787df496d43c7e4ffc283ae9b03862b1ba2affcabe982fd330",
            name: "Vesu Ether reserve",
            symbol: "vETH-reserv",
            decimals: 18
          },
          listedBlockNumber: 1107800,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "50000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000196884117773641",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          vToken: {
            address: "0x048b064f0d44fce445f36b5f32f22782b04b355dfb5bda29ab9d59f118e078cd",
            name: "Vesu Tether USD reserve",
            symbol: "vUSDT-reserve",
            decimals: 18
          },
          listedBlockNumber: 1107800,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "50000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000196884117773641",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "900000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40573089230109660",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x05b4b37036bea67dfac80b463af81dc57c15df01d62895d502e0ee7f59da0fc1",
            name: "Vesu Starknet Token reserve",
            symbol: "vSTRK-reserve",
            decimals: 18
          },
          listedBlockNumber: 1124429,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "50000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000180055449664448",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "3125672915377342143909006614027791230693045604477635729801515778410103428153",
      name: "add",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x01c27cb555fdb7704d63c4b7ca7e5dfa1bc73872e762896e77b64d08235a821d",
      isVerified: false,
      assets: [
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x050b4063b4173518878fba846391486f803b899d80372d79a58918a9d62831a6",
            name: "Vesu USD Coin add",
            symbol: "vUSDC-add",
            decimals: 18
          },
          listedBlockNumber: 1124457,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000180027455847748",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "750000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          vToken: {
            address: "0x046aa486af7617bce0c543462dc9fca214cb6a4120c4ad4958bcfd418ab0f7a9",
            name: "Vesu Tether USD add",
            symbol: "vUSDT-add",
            decimals: 18
          },
          listedBlockNumber: 1124457,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000180027455847748",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "750000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40573089230109660",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x04a8ba3ffeb9b647381a1024e0f102d869fe53c934fa508de97962fdda616ee1",
            name: "Vesu Ether add",
            symbol: "vETH-add",
            decimals: 18
          },
          listedBlockNumber: 1124510,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000179973268048646",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "750000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x03bcbe40f28686735e7690bda26852bd9213df33cbc983f27294daed9ab615f9",
            name: "Vesu Starknet Token add",
            symbol: "vSTRK-add",
            decimals: 18
          },
          listedBlockNumber: 1124510,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000179973268048646",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "500000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x03b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee",
          name: "STARKNET BROTHER",
          symbol: "BROTHER",
          decimals: 18,
          vToken: {
            address: "0x042b6ed01077ed9a0bed223f5d873489de3c85272903adb5b6e3b144b0812f2e",
            name: "Vesu STARKNET BROTHER add",
            symbol: "vBROTHER-add",
            decimals: 18
          },
          listedBlockNumber: 1124549,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000179933382487834",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "750000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "400000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "1000000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "400000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x03b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "2371147735370462546723246951334941826090854707186877477915656490055246094889",
      name: "iPool",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x05250aacbfa2690e9573fbb74c9a6d2f9531be6e1bd85356ba16971e1c55a913",
      isVerified: false,
      assets: [
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x0100228d1d7c5dfd1c700b6a3c3f81de63d0aa2dadd67dea0eb90aaa2963f7dc",
            name: "Vesu Starknet Token iPool",
            symbol: "vSTRK-iPool",
            decimals: 18
          },
          listedBlockNumber: 1124590,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "50000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000179891247138859",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          name: "Endur xSTRK",
          symbol: "xSTRK",
          decimals: 18,
          vToken: {
            address: "0x05f69cf982200902355fe3a372173a4fdbed2407dd93d5b8a6211bd1419b306f",
            name: "Vesu Endur xSTRK iPool",
            symbol: "vxSTRK-iPool",
            decimals: 18
          },
          listedBlockNumber: 1124590,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "50000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000179891247138859",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "31569142064150416",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: {
              value: "115119666655106208",
              decimals: 18
            }
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          name: "Wrapped Staked Ether",
          symbol: "wstETH",
          decimals: 18,
          vToken: {
            address: "0x016dbdb05298996d9a3dba51416f5b98cac9f43f87f24e2edebf37116d4ba36c",
            name: "Vesu Wrapped Staked Ether iPool",
            symbol: "vwstETH-iPool",
            decimals: 18
          },
          listedBlockNumber: 1124612,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "50000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000179868556402468",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "29135988945557660",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: {
              value: "35791428571428564",
              decimals: 18
            }
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x04c278dd4ac53040a0ef3815a5f0fe3a706a130eabbf5a18654ea52df83b783f",
            name: "Vesu USD Coin iPool",
            symbol: "vUSDC-iPool",
            decimals: 18
          },
          listedBlockNumber: 1124799,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "50000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000179677002897622",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "1004836663776012053146929983717292045854472643888105827453844308307146422044",
      name: "Alterscope xSTRK",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x022120e98b4ddbe31d3f618d0143e43a80ee3fd9ee5d678478d6f590af478254",
      isVerified: false,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x06fd2ba91b417acec30d9110149fd421d161dd0b0e7f061fbb2195e69d112836",
            name: "Vesu ETH Alterscope wstETH",
            symbol: "vETH-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178967,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062071207586070",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x03bba9d5890e30080d671f828a2261a38c80641ad6966c6b7bae170abe319410",
            name: "Vesu WBTC Alterscope wstETH",
            symbol: "vWBTC-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178967,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062071207586070",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 8
            },
            totalCollateralShares: {
              value: "20000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x037b8b8edb470611a89bed71304fc113c1e250b178b86eadb45bfa0262e522c6",
            name: "Vesu USDC Alterscope wstETH",
            symbol: "vUSDC-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178967,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062071207586070",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          vToken: {
            address: "0x0714fb3198062b13a5e2180713a422d2daf37b1d66fc424cacec96e8fb23a7f8",
            name: "Vesu USDT Alterscope wstETH",
            symbol: "vUSDT-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178967,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062071207586070",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40573089230109660",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x00a0a1aa1882682c04e7308c0807ef78197fb523b16b206f5211e6728667cf7a",
            name: "Vesu STRK Alterscope wstETH",
            symbol: "vSTRK-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178967,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062071207586070",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          name: "Endur xSTRK",
          symbol: "xSTRK",
          decimals: 18,
          vToken: {
            address: "0x0738dd944e418727c3825b2a1160e45aaee0b08e9f84d5bfd52fb01ca6b695b3",
            name: "Vesu xSTRK Alterscope xSTRK",
            symbol: "vxSTRK-AlterscopexSTRK",
            decimals: 18
          },
          listedBlockNumber: 1178967,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062071207586070",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "31569142064150416",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: {
              value: "115119666655106208",
              decimals: 18
            }
          },
          risk: null,
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "830000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "700000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "550000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "750000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "720000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "1129317009595740662798266590704690378283717359139782594834794341553978002262",
      name: "Alterscope xSTRK",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x022120e98b4ddbe31d3f618d0143e43a80ee3fd9ee5d678478d6f590af478254",
      isVerified: true,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x07050e1231cd1ab65447fa7adddd7038f36c0a7b46740d369cd3cfe925818c78",
            name: "Vesu ETH Alterscope xSTRK",
            symbol: "vETH-Alterscope xSTRK",
            decimals: 18
          },
          listedBlockNumber: 1197971,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000052502639606330",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/eth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/eth"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x0050d54f68cbcaaba424b92666791d9755c52a636e8a709db977ed429f168a0e",
            name: "Vesu WBTC Alterscope xSTRK",
            symbol: "vWBTC-Alterscope xSTRK",
            decimals: 18
          },
          listedBlockNumber: 1197971,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000052502639606330",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 8
            },
            totalCollateralShares: {
              value: "20000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/wbtc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/wbtc"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x030ab9c447368fb18c9286f852fcf2082e6f64ec0be07fa08e6d63eb90524746",
            name: "Vesu STRK Alterscope xSTRK",
            symbol: "vSTRK-Alterscope xSTRK",
            decimals: 18
          },
          listedBlockNumber: 1197971,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000052502639606330",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/strk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/strk"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x013ff7f2ad3e9ae7c94391b8271d5ab84f0ba7d59e33f781f3202829e41a028b",
            name: "Vesu USDC Alterscope xSTRK",
            symbol: "vUSDC-Alterscope xSTRK",
            decimals: 18
          },
          listedBlockNumber: 1197971,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000052502639606330",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/usdc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/usdc"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          vToken: {
            address: "0x02359a0f14fadc38d236f3ef0550240e8059f2d1c3100df708bbd19e9aff48af",
            name: "Vesu USDT Alterscope xSTRK",
            symbol: "vUSDT-Alterscope xSTRK",
            decimals: 18
          },
          listedBlockNumber: 1197971,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000052502639606330",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40573089230109660",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/usdt.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/usdt"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          name: "Endur xSTRK",
          symbol: "xSTRK",
          decimals: 18,
          vToken: {
            address: "0x062b16a3c933bd60eddc9630c3d088f0a1e9dcd510fbbf4ff3fb3b6a3839fd8a",
            name: "Vesu xSTRK Alterscope xSTRK",
            symbol: "vxSTRK-Alterscope xSTRK",
            decimals: 18
          },
          listedBlockNumber: 1197971,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000052502639606350",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "32452407923310972130667",
              decimals: 18
            },
            totalCollateralShares: {
              value: "32452407923310972130667",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "32452407923310972130667",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "31569142064150416",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: {
              value: "115119666655106208",
              decimals: 18
            }
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/xstrk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1129317009595740662798266590704690378283717359139782594834794341553978002262/xstrk"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "830000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "700000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "550000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "750000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "720000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "1159811069645890520539813878756846008647087829665407214583864910459307655916",
      name: "Alterscope Cornerstone",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x022120e98b4ddbe31d3f618d0143e43a80ee3fd9ee5d678478d6f590af478254",
      isVerified: true,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x007e00dc3acb051de65ae4af053faa11840d003507d279e5c779f87adbf681f4",
            name: "Vesu ETH Alterscope CornerSt",
            symbol: "vETH-Alterscope CornerSt",
            decimals: 18
          },
          listedBlockNumber: 1179163,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000000000000000000",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "0",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1159811069645890520539813878756846008647087829665407214583864910459307655916/eth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1159811069645890520539813878756846008647087829665407214583864910459307655916/eth"
          },
          interestRate: {
            value: "0",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x035dce04586d74503e5e3751d726daf90b515d5badd84f24b4fa92013cb36816",
            name: "Vesu WBTC Alterscope CornerSt",
            symbol: "vWBTC-Alterscope CornerSt",
            decimals: 18
          },
          listedBlockNumber: 1179163,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000000000000000000",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 8
            },
            totalCollateralShares: {
              value: "20000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "0",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1159811069645890520539813878756846008647087829665407214583864910459307655916/wbtc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1159811069645890520539813878756846008647087829665407214583864910459307655916/wbtc"
          },
          interestRate: {
            value: "0",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x07b207a4f928f1b729c9ad26da5e99d6a13b3a23216c597ad545390048cd051f",
            name: "Vesu USDC Alterscope CornerSt",
            symbol: "vUSDC-Alterscope CornerSt",
            decimals: 18
          },
          listedBlockNumber: 1179163,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000000000000000000",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "0",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1159811069645890520539813878756846008647087829665407214583864910459307655916/usdc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1159811069645890520539813878756846008647087829665407214583864910459307655916/usdc"
          },
          interestRate: {
            value: "0",
            decimals: 18
          }
        },
        {
          address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          vToken: {
            address: "0x05d28fb04a9432a755d495df1d14c209d298834eac1b02a06c5dbf7e4db9e5a5",
            name: "Vesu USDT Alterscope CornerSt",
            symbol: "vUSDT-Alterscope CornerSt",
            decimals: 18
          },
          listedBlockNumber: 1179163,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000000000000000000",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40573089230109660",
              decimals: 18
            },
            borrowApr: {
              value: "0",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1159811069645890520539813878756846008647087829665407214583864910459307655916/usdt.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1159811069645890520539813878756846008647087829665407214583864910459307655916/usdt"
          },
          interestRate: {
            value: "0",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x00430ec0c793e5da2a567c663ab72337f22dd59040ef9d0a28b9d60c4b784e7d",
            name: "Vesu STRK Alterscope CornerSt",
            symbol: "vSTRK-Alterscope CornerSt",
            decimals: 18
          },
          listedBlockNumber: 1179163,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000000000000000000",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "0",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1159811069645890520539813878756846008647087829665407214583864910459307655916/strk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1159811069645890520539813878756846008647087829665407214583864910459307655916/strk"
          },
          interestRate: {
            value: "0",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "730000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "650000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "700000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "670000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "770000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "830000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "800000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "500000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "770000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "730000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "700000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "650000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "770000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "750000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "930000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "770000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "750000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "930000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "1301140954640322725373945719229815062445705809076381949099585786202465661889",
      name: "Re7 sSTRK",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x01c8989018428469248f9f722a95b77702e9eb51254bcfd663fb21cb876fce59",
      isVerified: true,
      assets: [
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x05afdf4d18501d1d9d4664390df8c0786a6db8f28e66caa8800f1c2f51396492",
            name: "Vesu Starknet Token Re7 sSTRK",
            symbol: "vSTRK-Re7sSTRK",
            decimals: 18
          },
          listedBlockNumber: 954842,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1025895911630068444",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "305649179312405935946041",
              decimals: 18
            },
            totalCollateralShares: {
              value: "591144037811419131335152",
              decimals: 18
            },
            totalNominalDebt: {
              value: "287591832882947136055656",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "600688464885219283106365",
              decimals: 18
            },
            totalDebt: {
              value: "295039285572813347160324",
              decimals: 18
            },
            currentUtilization: {
              value: "491168555449437548",
              decimals: 18
            },
            supplyApy: {
              value: "22682233946787235",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "45145571346432000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1301140954640322725373945719229815062445705809076381949099585786202465661889/strk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1301140954640322725373945719229815062445705809076381949099585786202465661889/strk"
          },
          interestRate: {
            value: "1451439408",
            decimals: 18
          }
        },
        {
          address: "0x0356f304b154d29d2a8fe22f1cb9107a9b564a733cf6b4cc47fd121ac1af90c9",
          name: "Staked Starknet Token",
          symbol: "sSTRK",
          decimals: 18,
          vToken: {
            address: "0x047b7947c36be505131384540cb52e869db715b359b98099ade4015bfc8be341",
            name: "Vesu Staked Starknet Token",
            symbol: "vsSTRK",
            decimals: 18
          },
          listedBlockNumber: 954842,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000351758644897725",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "925391149302088266375309",
              decimals: 18
            },
            totalCollateralShares: {
              value: "925391149302088266375309",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "925391149302088266375309",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: {
              value: "115100000000000000",
              decimals: 18
            }
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1301140954640322725373945719229815062445705809076381949099585786202465661889/sstrk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1301140954640322725373945719229815062445705809076381949099585786202465661889/sstrk"
          },
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x0356f304b154d29d2a8fe22f1cb9107a9b564a733cf6b4cc47fd121ac1af90c9",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "1749206066145585665304376624725901901307432885480056836110792804696449290137",
      name: "Re7 rUSDC",
      extensionContractAddress: "0x06ffa060b96fd027a7f5c32eb3c9b15505c089cf83b6fd318e3ce61fd8c3fac8",
      owner: "0x01c8989018428469248f9f722a95b77702e9eb51254bcfd663fb21cb876fce59",
      isVerified: true,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x013ec1d99495bd24f035d5b1b4b557776e6914cc1305c5dc3a89fcc1478cc7f9",
            name: "Vesu Ether Re7 rUSDC",
            symbol: "vETH-Re7rUSDC",
            decimals: 18
          },
          listedBlockNumber: 1240391,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1003052492877653633",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "10000000000002000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "10000000000002000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "10000000000002000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "48790166901120000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/eth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/eth"
          },
          interestRate: {
            value: "1568613905",
            decimals: 18
          }
        },
        {
          address: "0x02019e47a0bc54ea6b4853c6123ffc8158ea3ae2af4166928b0de6e89f06de6c",
          name: "Relend Network USDC - Starknet",
          symbol: "rUSDC-stark",
          decimals: 6,
          vToken: {
            address: "0x00c0cae460e74a70cb7d8828b99f1147612c33bfb490f72f17356935af1540de",
            name: "Vesu Relend Re7 rUSDC",
            symbol: "vrUSDC-stark-Re7rUSDC",
            decimals: 18
          },
          listedBlockNumber: 1240391,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "7174111083",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1002391988892795305",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "14989754388275",
              decimals: 6
            },
            totalCollateralShares: {
              value: "14998391827934623553782808",
              decimals: 18
            },
            totalNominalDebt: {
              value: "10246065834940110543277",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "15000024962585",
              decimals: 6
            },
            totalDebt: {
              value: "10270574310",
              decimals: 6
            },
            currentUtilization: {
              value: "684703814534855",
              decimals: 18
            },
            supplyApy: {
              value: "17138640812521",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "24722599068288000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/rusdc-stark.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/rusdc-stark"
          },
          interestRate: {
            value: "794836647",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x02a88a39089b710236066f08e2cb5119fd8827b41a210f6591b7c7c5f3b0be87",
            name: "Vesu wBTC Re7 rUSDC",
            symbol: "vWBTC-Re7rUSDC",
            decimals: 18
          },
          listedBlockNumber: 1240391,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1003052492877653627",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 8
            },
            totalCollateralShares: {
              value: "20000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "48790166901120000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/wbtc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/wbtc"
          },
          interestRate: {
            value: "1568613905",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x07d7b4fa4701a6e065e9bb1a6dc927b1513cea42dbdafd0168ed64070d136fc6",
            name: "Vesu USD Coin Re7 rUSDC",
            symbol: "vUSDC-Re7rUSDC",
            decimals: 18
          },
          listedBlockNumber: 1240391,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1003052492877653632",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "48790166901120000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/usdc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/usdc"
          },
          interestRate: {
            value: "1568613905",
            decimals: 18
          }
        },
        {
          address: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          name: "Wrapped Staked Ether",
          symbol: "wstETH",
          decimals: 18,
          vToken: {
            address: "0x05caa6da8f447af4426eb2c636eb7b908cd682690b5d128a7dc17ea3d0d36e4f",
            name: "Vesu wstETH Re7 rUSDC",
            symbol: "vwstETH-Re7rUSDC",
            decimals: 18
          },
          listedBlockNumber: 1240391,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1003052492877653625",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "29135988945557660",
              decimals: 18
            },
            borrowApr: {
              value: "48790166901120000",
              decimals: 18
            },
            lstApr: {
              value: "35791428571428564",
              decimals: 18
            }
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/wsteth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/wsteth"
          },
          interestRate: {
            value: "1568613905",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x07a377f3d47f2d806e660065835b2c66c8ba212337a00aa556713eb3e28035f9",
            name: "Vesu STRK Re7 rUSDC",
            symbol: "vSTRK-Re7rUSDC",
            decimals: 18
          },
          listedBlockNumber: 1240391,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1003052492877653627",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "4700000000000000002000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "4700000000000000002000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "4700000000000000002000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "48790166901120000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/strk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/strk"
          },
          interestRate: {
            value: "1568613905",
            decimals: 18
          }
        },
        {
          address: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          name: "Endur xSTRK",
          symbol: "xSTRK",
          decimals: 18,
          vToken: {
            address: "0x069d2c197680bd60bafe1804239968275a1c85a1cad921809277306634b332b5",
            name: "Vesu xSTRK Re7 rUSDC",
            symbol: "vxSTRK-Re7rUSDC",
            decimals: 18
          },
          listedBlockNumber: 1240391,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1003052492877653649",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "199655495109356002286887",
              decimals: 18
            },
            totalCollateralShares: {
              value: "199655495109356002286887",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "199655495109356002286887",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "31569142064150416",
              decimals: 18
            },
            borrowApr: {
              value: "48790166901120000",
              decimals: 18
            },
            lstApr: {
              value: "115119666655106208",
              decimals: 18
            }
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/xstrk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1749206066145585665304376624725901901307432885480056836110792804696449290137/xstrk"
          },
          interestRate: {
            value: "1568613905",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x02019e47a0bc54ea6b4853c6123ffc8158ea3ae2af4166928b0de6e89f06de6c",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x02019e47a0bc54ea6b4853c6123ffc8158ea3ae2af4166928b0de6e89f06de6c",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x02019e47a0bc54ea6b4853c6123ffc8158ea3ae2af4166928b0de6e89f06de6c",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x02019e47a0bc54ea6b4853c6123ffc8158ea3ae2af4166928b0de6e89f06de6c",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x02019e47a0bc54ea6b4853c6123ffc8158ea3ae2af4166928b0de6e89f06de6c",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x02019e47a0bc54ea6b4853c6123ffc8158ea3ae2af4166928b0de6e89f06de6c",
          maxLTV: {
            value: "940000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "2198503327643286920898110335698706244522220458610657370981979460625005526824",
      name: "Genesis",
      extensionContractAddress: "0x002334189e831d804d4a11d3f71d4a982ec82614ac12ed2e9ca2f8da4e6374fa",
      owner: "0x040ba3ce5615a5c605e0caa592b4883052c804f8b1b326c1cab2d5820f003aa1",
      isVerified: true,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x021fe2ca1b7e731e4a5ef7df2881356070c5d72db4b2d19f9195f6b641f75df0",
            name: "Vesu Ether",
            symbol: "vETH",
            decimals: 18
          },
          listedBlockNumber: 654244,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "160350400",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000990128141626599",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "1260460515310079805825",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2716231015769749650037",
              decimals: 18
            },
            totalNominalDebt: {
              value: "1454800639114204207278",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2716701593477527348627",
              decimals: 18
            },
            totalDebt: {
              value: "1456241078167447542802",
              decimals: 18
            },
            currentUtilization: {
              value: "536032769172627063",
              decimals: 18
            },
            supplyApy: {
              value: "822865304078279",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "1533925548288000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/eth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/eth"
          },
          interestRate: {
            value: "49316022",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x06b0ef784eb49c85f4d9447f30d7f7212be65ce1e553c18d516c87131e81dbd6",
            name: "Vesu Wrapped BTC",
            symbol: "vWBTC",
            decimals: 18
          },
          listedBlockNumber: 654244,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "160350400",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000906411687960806",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "122656673",
              decimals: 8
            },
            totalCollateralShares: {
              value: "1289089335972998787",
              decimals: 18
            },
            totalNominalDebt: {
              value: "62612686943806255",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "128923616",
              decimals: 8
            },
            totalDebt: {
              value: "6266943",
              decimals: 8
            },
            currentUtilization: {
              value: "48609736481483733",
              decimals: 18
            },
            supplyApy: {
              value: "50967414780348",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "1047952888704000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/wbtc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/wbtc"
          },
          interestRate: {
            value: "33691901",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x01610abab2ff987cdfb5e73cccbf7069cbb1a02bbfa5ee31d97cc30e29d89090",
            name: "Vesu USD Coin",
            symbol: "vUSDC",
            decimals: 18
          },
          listedBlockNumber: 654244,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "160350400",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1017784782312210095",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "1949500482775",
              decimals: 6
            },
            totalCollateralShares: {
              value: "5192592370745786239829803",
              decimals: 18
            },
            totalNominalDebt: {
              value: "3254915124644517443057961",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "5262303564356",
              decimals: 6
            },
            totalDebt: {
              value: "3312803081581",
              decimals: 6
            },
            currentUtilization: {
              value: "629534773330093965",
              decimals: 18
            },
            supplyApy: {
              value: "1025178804870918",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "1627145978112000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/usdc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/usdc"
          },
          interestRate: {
            value: "52313078",
            decimals: 18
          }
        },
        {
          address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          vToken: {
            address: "0x032dd20efeb027ee51e676280df60c609ac6f6dcff798e4523515bc1668ed715",
            name: "Vesu Tether USD",
            symbol: "vUSDT",
            decimals: 18
          },
          listedBlockNumber: 654244,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "160350400",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1023637241848385276",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "169325782076",
              decimals: 6
            },
            totalCollateralShares: {
              value: "280238210746765988218232",
              decimals: 18
            },
            totalNominalDebt: {
              value: "113335021818642467452524",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "285339731215",
              decimals: 6
            },
            totalDebt: {
              value: "116013949139",
              decimals: 6
            },
            currentUtilization: {
              value: "406581826670275045",
              decimals: 18
            },
            supplyApy: {
              value: "571593004111053",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40573089230109660",
              decimals: 18
            },
            borrowApr: {
              value: "1404862579584000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/usdt.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/usdt"
          },
          interestRate: {
            value: "45166621",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x037ae3f583c8d644b7556c93a04b83b52fa96159b2b0cbd83c14d3122aef80a2",
            name: "Vesu Starknet",
            symbol: "vSTRK",
            decimals: 18
          },
          listedBlockNumber: 654244,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "160350400",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000913347750086920",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "4177241752356957751345133",
              decimals: 18
            },
            totalCollateralShares: {
              value: "4361427225013712662058458",
              decimals: 18
            },
            totalNominalDebt: {
              value: "184488602644930758503654",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "4361898857252030937155314",
              decimals: 18
            },
            totalDebt: {
              value: "184657104895073185810181",
              decimals: 18
            },
            currentUtilization: {
              value: "42334109739400516",
              decimals: 18
            },
            supplyApy: {
              value: "44122488662081",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "1041701637888000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/strk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/strk"
          },
          interestRate: {
            value: "33490922",
            decimals: 18
          }
        },
        {
          address: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          name: "Wrapped Staked Ether",
          symbol: "wstETH",
          decimals: 18,
          vToken: {
            address: "0x0159133f57b09260c707ff9d3ce93abdedee740795cc64a9233a0d61f15af923",
            name: "Vesu Wrapped Staked Ether",
            symbol: "vWSTETH",
            decimals: 18
          },
          listedBlockNumber: 1122698,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "160350400",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000193211200345708",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "3838576956991241815008",
              decimals: 18
            },
            totalCollateralShares: {
              value: "3966243768998817832617",
              decimals: 18
            },
            totalNominalDebt: {
              value: "127671974731479272321",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "3966273599378209463340",
              decimals: 18
            },
            totalDebt: {
              value: "127696642386967648332",
              decimals: 18
            },
            currentUtilization: {
              value: "32195621201468950",
              decimals: 18
            },
            supplyApy: {
              value: "33229880068453",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "29135988945557660",
              decimals: 18
            },
            borrowApr: {
              value: "1031591935872000",
              decimals: 18
            },
            lstApr: {
              value: "35791428571428564",
              decimals: 18
            }
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/wsteth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/wsteth"
          },
          interestRate: {
            value: "33165893",
            decimals: 18
          }
        },
        {
          address: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          name: "Legacy Wrapped Staked Ether",
          symbol: "wstETH (legacy)",
          decimals: 18,
          vToken: {
            address: "0x044a8304cd9d00a1730e4acbc31fb3a2f8cf1272d95c39c76e338841026fd001",
            name: "Vesu Wrapped Staked Ether",
            symbol: "vWSTETH",
            decimals: 18
          },
          listedBlockNumber: 654244,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "160350400",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1016819831519622763",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "1816609340241574841",
              decimals: 18
            },
            totalCollateralShares: {
              value: "1927670174041987488",
              decimals: 18
            },
            totalNominalDebt: {
              value: "133239381298940827",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "1952089785485742628",
              decimals: 18
            },
            totalDebt: {
              value: "135480445244167787",
              decimals: 18
            },
            currentUtilization: {
              value: "69402773505346682",
              decimals: 18
            },
            supplyApy: {
              value: "74209745315571",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "1068690703104000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/wsteth (legacy).mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2198503327643286920898110335698706244522220458610657370981979460625005526824/wsteth (legacy)"
          },
          interestRate: {
            value: "34358626",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "820000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "740000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "740000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "710000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "820000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "740000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "740000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "750000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "590000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "930000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "720000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "660000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "650000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "930000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "630000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "580000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          maxLTV: {
            value: "810000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          maxLTV: {
            value: "710000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          maxLTV: {
            value: "730000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "570000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "460000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "590000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "570000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "550000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "750000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "720000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "630000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          maxLTV: {
            value: "810000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          maxLTV: {
            value: "710000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          maxLTV: {
            value: "730000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "550000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "2345856225134458665876812536882617294246962319062565703131100435311373119841",
      name: "Re7 xSTRK",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x01c8989018428469248f9f722a95b77702e9eb51254bcfd663fb21cb876fce59",
      isVerified: true,
      assets: [
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x01f876e2da54266911d8a7409cba487414d318a2b6540149520bf7e2af56b93c",
            name: "Vesu Starknet Token Re7 xSTRK",
            symbol: "vSTRK-Re7xSTRK",
            decimals: 18
          },
          listedBlockNumber: 954847,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "14353601013",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1031070481018800531",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "872173308935007980325649",
              decimals: 18
            },
            totalCollateralShares: {
              value: "8695718719271202198030607",
              decimals: 18
            },
            totalNominalDebt: {
              value: "7759143565261811300488312",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "8872397197063434667983523",
              decimals: 18
            },
            totalDebt: {
              value: "8000223888128426687657874",
              decimals: 18
            },
            currentUtilization: {
              value: "901698121763115173",
              decimals: 18
            },
            supplyApy: {
              value: "85006047297413919",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "90090479746944000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2345856225134458665876812536882617294246962319062565703131100435311373119841/strk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2345856225134458665876812536882617294246962319062565703131100435311373119841/strk"
          },
          interestRate: {
            value: "2896427461",
            decimals: 18
          }
        },
        {
          address: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          name: "Endur xSTRK",
          symbol: "xSTRK",
          decimals: 18,
          vToken: {
            address: "0x037ff012710c5175004687bc4d9e4c6e86d6ce5ca6fb6afee72ea02b1208fdb7",
            name: "Vesu Endur xSTRK",
            symbol: "vxSTRK",
            decimals: 18
          },
          listedBlockNumber: 954847,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000351753598072668",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "18465159504716621728848378",
              decimals: 18
            },
            totalCollateralShares: {
              value: "18465159504716621728848378",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "18465159504716621728848378",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "31569142064150416",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: {
              value: "115119666655106208",
              decimals: 18
            }
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2345856225134458665876812536882617294246962319062565703131100435311373119841/xstrk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2345856225134458665876812536882617294246962319062565703131100435311373119841/xstrk"
          },
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "2535243615249328221060622268479728814680175138265908305094759253778126318519",
      name: "Re7 wstETH",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x01c8989018428469248f9f722a95b77702e9eb51254bcfd663fb21cb876fce59",
      isVerified: true,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x07bf0e1b5aabaa681cd3dba25c4e0db42fb4f0f564eb275949628435d337fae1",
            name: "Vesu Ether Re7 wstETH",
            symbol: "vETH-Re7wstETH",
            decimals: 18
          },
          listedBlockNumber: 1125655,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1001762211610567276",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "162985052965624957635",
              decimals: 18
            },
            totalCollateralShares: {
              value: "311909629766495279717",
              decimals: 18
            },
            totalNominalDebt: {
              value: "148908379421911720417",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "312155840462664728123",
              decimals: 18
            },
            totalDebt: {
              value: "149170787497039770488",
              decimals: 18
            },
            currentUtilization: {
              value: "477872806339118558",
              decimals: 18
            },
            supplyApy: {
              value: "4861256492659068",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "10121305923072000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2535243615249328221060622268479728814680175138265908305094759253778126318519/eth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2535243615249328221060622268479728814680175138265908305094759253778126318519/eth"
          },
          interestRate: {
            value: "325402068",
            decimals: 18
          }
        },
        {
          address: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          name: "Wrapped Staked Ether",
          symbol: "wstETH",
          decimals: 18,
          vToken: {
            address: "0x06deac5804db38126cf33a245ad2a775cbf74d2978ef24c1112bc1218bf4e22b",
            name: "Vesu wstETH Re7 wstETH",
            symbol: "vwstETH-Re7wstETH",
            decimals: 18
          },
          listedBlockNumber: 1125655,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000178815108999249",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "159615278069544959422",
              decimals: 18
            },
            totalCollateralShares: {
              value: "159615278069544959422",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "159615278069544959422",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "29135988945557660",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: {
              value: "35791428571428564",
              decimals: 18
            }
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2535243615249328221060622268479728814680175138265908305094759253778126318519/wsteth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2535243615249328221060622268479728814680175138265908305094759253778126318519/wsteth"
          },
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "2612229586214495842527551768232431476062656055007024497123940017576986139174",
      name: "Alterscope wstETH",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x022120e98b4ddbe31d3f618d0143e43a80ee3fd9ee5d678478d6f590af478254",
      isVerified: true,
      assets: [
        {
          address: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          name: "Wrapped Staked Ether",
          symbol: "wstETH",
          decimals: 18,
          vToken: {
            address: "0x05fcb6c1732396efa054c66909beeb1d3bca94501153c1a6584b48d6e8463f20",
            name: "Vesu wstETH Alterscope wstETH",
            symbol: "vwstETH-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178905,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062086010028539",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "29135988945557660",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: {
              value: "35791428571428564",
              decimals: 18
            }
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/wsteth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/wsteth"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x07e89e7f1bc528785a5f14f0126b3cffd39f53db63d8bb60125b29f70f8b37bc",
            name: "Vesu ETH Alterscope wstETH",
            symbol: "vETH-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178905,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062086010028539",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/eth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/eth"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x057f0d0684968135afecdaac60fe9f9ccf8a276d6f5ac17b71212bc3bb4f5c01",
            name: "Vesu WBTC Alterscope wstETH",
            symbol: "vWBTC-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178905,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062086010028539",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 8
            },
            totalCollateralShares: {
              value: "20000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/wbtc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/wbtc"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x0383c278dac0a6f2dae49960dfd189af5ded9a42b4a1f7c2b00b8d11ff82ff5d",
            name: "Vesu USDC Alterscope wstETH",
            symbol: "vUSDC-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178905,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062086010028539",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/usdc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/usdc"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          vToken: {
            address: "0x06713e4ce7d33342208551c67eece4bce950df9fa9fe233f39561eac9d0cabae",
            name: "Vesu USDT Alterscope wstETH",
            symbol: "vUSDT-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178905,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062086010028539",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40573089230109660",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/usdt.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/usdt"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x02eed5de96c7bc425c0e3d92ba16957e66484dca2b9ad7a1ea76d37410950bfa",
            name: "Vesu STRK Alterscope wstETH",
            symbol: "vSTRK-Alterscope wstETH",
            decimals: 18
          },
          listedBlockNumber: 1178905,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000062086010028539",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/strk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/2612229586214495842527551768232431476062656055007024497123940017576986139174/strk"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          maxLTV: {
            value: "720000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "850000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          maxLTV: {
            value: "820000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "1921054942193708428619433636456748851087331856691656881799540576257302014718",
      name: "Braavos Vault",
      extensionContractAddress: "0x06ffa060b96fd027a7f5c32eb3c9b15505c089cf83b6fd318e3ce61fd8c3fac8",
      owner: "0x040e32e176dca8f7fba4fab267763172d4530add0719b62ad77d96a2903030ad",
      isVerified: true,
      assets: [
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x008288573352819b6af92ffd780d5dc29e38873c6c172a19fe228aaffd95376d",
            name: "Vesu Wrapped BTC Braavos Vault",
            symbol: "vWBTC-bv",
            decimals: 18
          },
          listedBlockNumber: 1259226,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "150000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000000000000000000",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "500000000000000000",
              decimals: 18
            },
            reserve: {
              value: "34304526",
              decimals: 8
            },
            totalCollateralShares: {
              value: "343045260000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "34304526",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "0",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1921054942193708428619433636456748851087331856691656881799540576257302014718/wbtc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1921054942193708428619433636456748851087331856691656881799540576257302014718/wbtc"
          },
          interestRate: {
            value: "0",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x0170c0736763bd33591e541bd81a0aede7f73ed523cb6c834ba58463991966c6",
            name: "Vesu USD Coin Braavos Vault",
            symbol: "vUSDC-bv",
            decimals: 18
          },
          listedBlockNumber: 1259226,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "150000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000000000000000000",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "0",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/1921054942193708428619433636456748851087331856691656881799540576257302014718/usdc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/1921054942193708428619433636456748851087331856691656881799540576257302014718/usdc"
          },
          interestRate: {
            value: "0",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "780000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "654335860926414800976850705344094927691632670467085266316814854013984546732",
      name: "Update",
      extensionContractAddress: "0x06ffa060b96fd027a7f5c32eb3c9b15505c089cf83b6fd318e3ce61fd8c3fac8",
      owner: "0x01c27cb555fdb7704d63c4b7ca7e5dfa1bc73872e762896e77b64d08235a821d",
      isVerified: false,
      assets: [
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x02564e985dce624392396d5262364b7e1a19e47f50e9cf307e376aa17346e03d",
            name: "Vesu USD Coin Update",
            symbol: "vUSDC-Update",
            decimals: 18
          },
          listedBlockNumber: 1284322,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000019102249991428",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "900000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          name: "Endur xSTRK",
          symbol: "xSTRK",
          decimals: 18,
          vToken: {
            address: "0x02da05de34bbfccfb8484ab63d5fedbd4b062dcfa189d0fc9a4086c420d38903",
            name: "Vesu Endur xSTRK Update",
            symbol: "vxSTRK-Update",
            decimals: 18
          },
          listedBlockNumber: 1284322,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000019102249991428",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "900000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "31569142064150416",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: {
              value: "115119666655106208",
              decimals: 18
            }
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "400000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "1610264895936553784928358313981672193725908570362488606221536525391950767501",
      name: "ExtNew",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x01c27cb555fdb7704d63c4b7ca7e5dfa1bc73872e762896e77b64d08235a821d",
      isVerified: false,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x042ff68ef33aba2711016ad7695e1f056dfc87613c2b84f30cc80d03c86fb3d2",
            name: "Vesu Ether ExtNew",
            symbol: "vETH-ExtNew",
            decimals: 18
          },
          listedBlockNumber: 1284794,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000018641470823448",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "900000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x044350aa930ceaaf193954bb4f7ca3a1f0f84e35bb681cc79e49684b6191a5b9",
            name: "Vesu USD Coin ExtNew",
            symbol: "vUSDC-ExtNew",
            decimals: 18
          },
          listedBlockNumber: 1284794,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000018641470823448",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "900000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: null,
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "3163948199181372152800322058764275087686391083665033264234338943786798617741",
      name: "Re7 Starknet Ecosystem",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x01c8989018428469248f9f722a95b77702e9eb51254bcfd663fb21cb876fce59",
      isVerified: true,
      assets: [
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x017f19582c61479f2fe0b6606300e975c0a8f439102f43eeecc1d0e9b3d84350",
            name: "Vesu USD Coin Re7 USDC",
            symbol: "vUSDC-Re7USDC",
            decimals: 18
          },
          listedBlockNumber: 1125655,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1013026725324980598",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "24944525369",
              decimals: 6
            },
            totalCollateralShares: {
              value: "130861290034884430061053",
              decimals: 18
            },
            totalNominalDebt: {
              value: "105589622733261570373225",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "131909635114",
              decimals: 6
            },
            totalDebt: {
              value: "106965109745",
              decimals: 6
            },
            currentUtilization: {
              value: "810896866271806128",
              decimals: 18
            },
            supplyApy: {
              value: "61465407195544570",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "73063911517056000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3163948199181372152800322058764275087686391083665033264234338943786798617741/usdc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3163948199181372152800322058764275087686391083665033264234338943786798617741/usdc"
          },
          interestRate: {
            value: "2349019789",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x07560a5077d454fe04d174c284fc3988c702ef7070ff2d1e1b81010e6688204e",
            name: "Vesu Starknet Token Re7 USDC",
            symbol: "vSTRK-Re7USDC",
            decimals: 18
          },
          listedBlockNumber: 1125655,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000000000000000000",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "6012718186813080081060",
              decimals: 18
            },
            totalCollateralShares: {
              value: "6012718186813080081060",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "6012718186813080081060",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "0",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3163948199181372152800322058764275087686391083665033264234338943786798617741/strk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3163948199181372152800322058764275087686391083665033264234338943786798617741/strk"
          },
          interestRate: {
            value: "0",
            decimals: 18
          }
        },
        {
          address: "0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87",
          name: "Ekubo Protocol",
          symbol: "EKUBO",
          decimals: 18,
          vToken: {
            address: "0x0502d4fbc6e273f399002ea4c98c746f15bd041e2a19b07b7b40b9e8331abccf",
            name: "Vesu Ekubo Re7 Starknet",
            symbol: "vEKUBO-Re7StarknetEcosystem",
            decimals: 18
          },
          listedBlockNumber: 1125655,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000000000000000000",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "273415566166264519628518",
              decimals: 18
            },
            totalCollateralShares: {
              value: "273415566166264519628518",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "273415566166264519628518",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "0",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3163948199181372152800322058764275087686391083665033264234338943786798617741/ekubo.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3163948199181372152800322058764275087686391083665033264234338943786798617741/ekubo"
          },
          interestRate: {
            value: "0",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "3496574735728882918499284446337009546448797063742922299223215375275805529443",
      name: "Alterscope CASH",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x022120e98b4ddbe31d3f618d0143e43a80ee3fd9ee5d678478d6f590af478254",
      isVerified: true,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x06e0ed468fc285132aa2bc8bbb99f85cb12c2bcaa54e5238436f9b5c6fb5941a",
            name: "Vesu Ether Alterscope CASH",
            symbol: "vETH-AlterscopeCASH",
            decimals: 18
          },
          listedBlockNumber: 1179283,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000061979114219273",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "850000000000000000",
              decimals: 18
            },
            reserve: {
              value: "5500000000000002000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "5500000000000002000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "5500000000000002000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/eth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/eth"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x0470ef9431a58d99884b7426c4294feadcd4d65a983278037018f8c5737f011a",
            name: "Vesu STRK Alterscope CASH",
            symbol: "vSTRK-AlterscopeCASH",
            decimals: 18
          },
          listedBlockNumber: 1179283,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000061979114219268",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/strk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/strk"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x0279e954817dd6f1082ca2c1010beb6ba84fa602bbd452902e88c466de451b0f",
            name: "Vesu WBTC Alterscope CASH",
            symbol: "vWBTC-AlterscopeCASH",
            decimals: 18
          },
          listedBlockNumber: 1179283,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000061979114219270",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2839",
              decimals: 8
            },
            totalCollateralShares: {
              value: "28390000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2839",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/wbtc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/wbtc"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x04d6cb9637b9af77fa7bfe4336777279eb8766ba30652e5186edc681effc0601",
            name: "Vesu USDC Alterscope CASH",
            symbol: "vUSDC-AlterscopeCASH",
            decimals: 18
          },
          listedBlockNumber: 1179283,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000061979114219274",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/usdc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/usdc"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          vToken: {
            address: "0x0361412b442c2d9d98909cca413254d4abc11fbcdeda00290088798deed2ac5f",
            name: "Vesu USDT Alterscope CASH",
            symbol: "vUSDT-AlterscopeCASH",
            decimals: 18
          },
          listedBlockNumber: 1179283,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000061979114219268",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 6
            },
            totalCollateralShares: {
              value: "2000000000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 6
            },
            totalDebt: {
              value: "0",
              decimals: 6
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40573089230109660",
              decimals: 18
            },
            borrowApr: {
              value: "499876862976000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/usdt.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/usdt"
          },
          interestRate: {
            value: "16071144",
            decimals: 18
          }
        },
        {
          address: "0x0498edfaf50ca5855666a700c25dd629d577eb9afccdf3b5977aec79aee55ada",
          name: "Cash",
          symbol: "CASH",
          decimals: 18,
          vToken: {
            address: "0x05eddd0067f51f0ce113efbd2ea38e1796a02194c680f5bd9ce2e5c679122267",
            name: "Vesu Cash Alterscope CASH",
            symbol: "vCASH-AlterscopeCASH",
            decimals: 18
          },
          listedBlockNumber: 1179283,
          config: {
            debtFloor: {
              value: "100000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "0",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "5861675589",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1001554553005352233",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "920000000000000000",
              decimals: 18
            },
            reserve: {
              value: "16062754693148745548482",
              decimals: 18
            },
            totalCollateralShares: {
              value: "20000000000000000002000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "3943148033692317782242",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "20012032559467388471439",
              decimals: 18
            },
            totalDebt: {
              value: "3949277866318642922957",
              decimals: 18
            },
            currentUtilization: {
              value: "197345164944292456",
              decimals: 18
            },
            supplyApy: {
              value: "1679281875863946",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "8473363623936000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/cash.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3496574735728882918499284446337009546448797063742922299223215375275805529443/cash"
          },
          interestRate: {
            value: "272420384",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x0498edfaf50ca5855666a700c25dd629d577eb9afccdf3b5977aec79aee55ada",
          maxLTV: {
            value: "600000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x0498edfaf50ca5855666a700c25dd629d577eb9afccdf3b5977aec79aee55ada",
          maxLTV: {
            value: "750000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x0498edfaf50ca5855666a700c25dd629d577eb9afccdf3b5977aec79aee55ada",
          maxLTV: {
            value: "700000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          debtAssetAddress: "0x0498edfaf50ca5855666a700c25dd629d577eb9afccdf3b5977aec79aee55ada",
          maxLTV: {
            value: "750000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
          debtAssetAddress: "0x0498edfaf50ca5855666a700c25dd629d577eb9afccdf3b5977aec79aee55ada",
          maxLTV: {
            value: "720000000000000000",
            decimals: 18
          }
        }
      ]
    },
    {
      id: "3592370751539490711610556844458488648008775713878064059760995781404350938653",
      name: "Re7 USDC",
      extensionContractAddress: "0x07cf3881eb4a58e76b41a792fa151510e7057037d80eda334682bd3e73389ec0",
      owner: "0x01c8989018428469248f9f722a95b77702e9eb51254bcfd663fb21cb876fce59",
      isVerified: true,
      assets: [
        {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
          vToken: {
            address: "0x00989d6902edd719fad6f0331122d084d0fc7cf03e7a254eee549fd9ad8e32e3",
            name: "Vesu Ether Re7 USDC",
            symbol: "vETH-Re7USDC",
            decimals: 18
          },
          listedBlockNumber: 954804,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000351796287134879",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "1186229387423944311",
              decimals: 18
            },
            totalCollateralShares: {
              value: "1186229387423944311",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "1186229387423944311",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "59416062575780290",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/eth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/eth"
          },
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          name: "Wrapped BTC",
          symbol: "WBTC",
          decimals: 8,
          vToken: {
            address: "0x03c48b0d8bc4913d7d789fb2717572dcd71bb599f2c6e81beeb24d865c8baf14",
            name: "Vesu Wrapped BTC Re7 USDC",
            symbol: "vWBTC-Re7USDC",
            decimals: 18
          },
          listedBlockNumber: 954804,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000351796287134896",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2049",
              decimals: 8
            },
            totalCollateralShares: {
              value: "20490000000000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2049",
              decimals: 8
            },
            totalDebt: {
              value: "0",
              decimals: 8
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/wbtc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/wbtc"
          },
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          vToken: {
            address: "0x028795e04b2abaf61266faa81cc02d4d1a6ef8574fef383cdf6185ca580648aa",
            name: "Vesu USD Coin Re7 USDC",
            symbol: "vUSDC-Re7USDC",
            decimals: 18
          },
          listedBlockNumber: 954804,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1010339280989976871",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "10323782211",
              decimals: 6
            },
            totalCollateralShares: {
              value: "12801094987780974439392",
              decimals: 18
            },
            totalNominalDebt: {
              value: "2503854836606311167985",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: true,
            totalSupplied: {
              value: "12853525106",
              decimals: 6
            },
            totalDebt: {
              value: "2529742895",
              decimals: 6
            },
            currentUtilization: {
              value: "196813160136056453",
              decimals: 18
            },
            supplyApy: {
              value: "3712832882653192",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "40622306152165980",
              decimals: 18
            },
            borrowApr: {
              value: "18689026361472000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/usdc.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/usdc"
          },
          interestRate: {
            value: "600856043",
            decimals: 18
          }
        },
        {
          address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          name: "Starknet Token",
          symbol: "STRK",
          decimals: 18,
          vToken: {
            address: "0x00b5581d0bc94bc984cf79017d0f4b079c7e926af3d79bd92ff66fb451b340df",
            name: "Vesu Starknet Token Re7 USDC",
            symbol: "vSTRK-Re7USDC",
            decimals: 18
          },
          listedBlockNumber: 954804,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000351796287134861",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "43362725988226402627573",
              decimals: 18
            },
            totalCollateralShares: {
              value: "43362725988226402627573",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "43362725988226402627573",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "41633532015344206",
              decimals: 18
            },
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/strk.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/strk"
          },
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        },
        {
          address: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          name: "Wrapped Staked Ether",
          symbol: "wstETH",
          decimals: 18,
          vToken: {
            address: "0x0341c0667fafa526400d29980aec17928732fdd585fd778d58a1f52836708b0e",
            name: "Vesu wstETH Re7 USDC",
            symbol: "vwstETH-Re7USDC",
            decimals: 18
          },
          listedBlockNumber: 1125191,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "3064241971",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000000000000000000",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "1000000000000000000",
              decimals: 18
            },
            reserve: {
              value: "2000",
              decimals: 18
            },
            totalCollateralShares: {
              value: "2000",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "2000",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: {
              value: "29135988945557660",
              decimals: 18
            },
            borrowApr: {
              value: "0",
              decimals: 18
            },
            lstApr: {
              value: "35791428571428564",
              decimals: 18
            }
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/wsteth.mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/wsteth"
          },
          interestRate: {
            value: "0",
            decimals: 18
          }
        },
        {
          address: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          name: "Legacy Wrapped Staked Ether",
          symbol: "wstETH (legacy)",
          decimals: 18,
          vToken: {
            address: "0x02ff9b23f4ada0f5efa0e5acbc6faf79cfed551563eef72fa91287ae38a8dd09",
            name: "Vesu W-Staked Ether Re7 USDC",
            symbol: "vwstETH-Re7USDC",
            decimals: 18
          },
          listedBlockNumber: 954804,
          config: {
            debtFloor: {
              value: "10000000000000000000",
              decimals: 18
            },
            isLegacy: false,
            feeRate: {
              value: "200000000000000000",
              decimals: 18
            },
            lastFullUtilizationRate: {
              value: "13035786672",
              decimals: 18
            },
            lastRateAccumulator: {
              value: "1000351796287134890",
              decimals: 18
            },
            lastUpdated: "2025-04-10T07:13:36.000Z",
            maxUtilization: {
              value: "950000000000000000",
              decimals: 18
            },
            reserve: {
              value: "1187642182629",
              decimals: 18
            },
            totalCollateralShares: {
              value: "1187642182629",
              decimals: 18
            },
            totalNominalDebt: {
              value: "0",
              decimals: 18
            }
          },
          stats: {
            canBeBorrowed: false,
            totalSupplied: {
              value: "1187642182629",
              decimals: 18
            },
            totalDebt: {
              value: "0",
              decimals: 18
            },
            currentUtilization: {
              value: "0",
              decimals: 18
            },
            supplyApy: {
              value: "0",
              decimals: 18
            },
            defiSpringSupplyApr: null,
            borrowApr: {
              value: "999498206592000",
              decimals: 18
            },
            lstApr: null
          },
          risk: {
            mdxUrl: "https://raw.githubusercontent.com/vesuxyz/docs/refs/heads/main/docs/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/wsteth (legacy).mdx",
            url: "https://docs.vesu.xyz/curators/risk-reports/3592370751539490711610556844458488648008775713878064059760995781404350938653/wsteth (legacy)"
          },
          interestRate: {
            value: "32134073",
            decimals: 18
          }
        }
      ],
      pairs: [
        {
          collateralAssetAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "680000000000000000",
            decimals: 18
          }
        },
        {
          collateralAssetAddress: "0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b",
          debtAssetAddress: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
          maxLTV: {
            value: "870000000000000000",
            decimals: 18
          }
        }
      ]
    }
  ]
};

// src/strategies/vesu-rebalance.tsx
var VesuRebalance = class _VesuRebalance extends BaseStrategy {
  // 10000 bps = 100%
  /**
   * Creates a new VesuRebalance strategy instance.
   * @param config - Configuration object containing provider and other settings
   * @param pricer - Pricer instance for token price calculations
   * @param metadata - Strategy metadata including deposit tokens and address
   * @throws {Error} If more than one deposit token is specified
   */
  constructor(config, pricer, metadata) {
    super(config);
    this.BASE_WEIGHT = 1e4;
    this.pricer = pricer;
    assert(metadata.depositTokens.length === 1, "VesuRebalance only supports 1 deposit token");
    this.metadata = metadata;
    this.address = metadata.address;
    this.contract = new Contract5(vesu_rebalance_abi_default, this.address.address, this.config.provider);
  }
  /**
   * Creates a deposit call to the strategy contract.
   * @param assets - Amount of assets to deposit
   * @param receiver - Address that will receive the strategy tokens
   * @returns Populated contract call for deposit
   */
  async depositCall(amountInfo, receiver) {
    assert(amountInfo.tokenInfo.address.eq(this.asset().address), "Deposit token mismatch");
    const assetContract = new Contract5(vesu_rebalance_abi_default, this.asset().address.address, this.config.provider);
    const call1 = assetContract.populate("approve", [this.address.address, uint2563.bnToUint256(amountInfo.amount.toWei())]);
    const call2 = this.contract.populate("deposit", [uint2563.bnToUint256(amountInfo.amount.toWei()), receiver.address]);
    return [call1, call2];
  }
  /**
   * Creates a withdrawal call to the strategy contract.
   * @param assets - Amount of assets to withdraw
   * @param receiver - Address that will receive the withdrawn assets
   * @param owner - Address that owns the strategy tokens
   * @returns Populated contract call for withdrawal
   */
  async withdrawCall(amountInfo, receiver, owner) {
    return [this.contract.populate("withdraw", [uint2563.bnToUint256(amountInfo.amount.toWei()), receiver.address, owner.address])];
  }
  /**
   * Returns the underlying asset token of the strategy.
   * @returns The deposit token supported by this strategy
   */
  asset() {
    return this.metadata.depositTokens[0];
  }
  /**
   * Returns the number of decimals used by the strategy token.
   * @returns Number of decimals (same as the underlying token)
   */
  decimals() {
    return this.metadata.depositTokens[0].decimals;
  }
  /**
   * Calculates the Total Value Locked (TVL) for a specific user.
   * @param user - Address of the user
   * @returns Object containing the amount in token units and USD value
   */
  async getUserTVL(user) {
    const shares = await this.contract.balanceOf(user.address);
    const assets = await this.contract.convert_to_assets(uint2563.bnToUint256(shares));
    const amount = Web3Number.fromWei(assets.toString(), this.metadata.depositTokens[0].decimals);
    let price = await this.pricer.getPrice(this.metadata.depositTokens[0].symbol);
    const usdValue = Number(amount.toFixed(6)) * price.price;
    return {
      tokenInfo: this.asset(),
      amount,
      usdValue
    };
  }
  /**
   * Calculates the total TVL of the strategy.
   * @returns Object containing the total amount in token units and USD value
   */
  async getTVL() {
    const assets = await this.contract.total_assets();
    const amount = Web3Number.fromWei(assets.toString(), this.metadata.depositTokens[0].decimals);
    let price = await this.pricer.getPrice(this.metadata.depositTokens[0].symbol);
    const usdValue = Number(amount.toFixed(6)) * price.price;
    return {
      tokenInfo: this.asset(),
      amount,
      usdValue
    };
  }
  static async getAllPossibleVerifiedPools(asset) {
    const data = await getAPIUsingHeadlessBrowser("https://api.vesu.xyz/pools");
    const verifiedPools = data.data.filter((d) => d.isVerified);
    const pools = verifiedPools.map((p) => {
      const hasMyAsset = p.assets.find((a) => asset.eqString(a.address));
      if (hasMyAsset) {
        return {
          pool_id: ContractAddr.from(p.id),
          max_weight: 1e4,
          v_token: ContractAddr.from(hasMyAsset.vToken.address),
          name: p.name
        };
      }
      return null;
    }).filter((p) => p !== null);
    return pools;
  }
  async getPoolInfo(p, pools, vesuPositions, totalAssets, isErrorPositionsAPI, isErrorPoolsAPI) {
    const vesuPosition = vesuPositions.find((d) => d.pool.id.toString() === num3.getDecimalString(p.pool_id.address.toString()));
    const _pool = pools.find((d) => {
      logger.verbose(`pool check: ${d.id == num3.getDecimalString(p.pool_id.address.toString())}, id: ${d.id}, pool_id: ${num3.getDecimalString(p.pool_id.address.toString())}`);
      return d.id == num3.getDecimalString(p.pool_id.address.toString());
    });
    logger.verbose(`pool: ${JSON.stringify(_pool)}`);
    logger.verbose(typeof _pool);
    logger.verbose(`name: ${_pool?.name}`);
    const name = _pool?.name;
    logger.verbose(`name2: ${name}, ${!name ? true : false}, ${name?.length}, ${typeof name}`);
    const assetInfo = _pool?.assets.find((d) => this.asset().address.eqString(d.address));
    if (!name) {
      logger.verbose(`Pool not found`);
      throw new Error(`Pool name ${p.pool_id.address.toString()} not found`);
    }
    if (!assetInfo) {
      throw new Error(`Asset ${this.asset().address.toString()} not found in pool ${p.pool_id.address.toString()}`);
    }
    let vTokenContract = new Contract5(vesu_rebalance_abi_default, p.v_token.address, this.config.provider);
    const bal = await vTokenContract.balanceOf(this.address.address);
    const assets = await vTokenContract.convert_to_assets(uint2563.bnToUint256(bal.toString()));
    logger.verbose(`Collateral: ${JSON.stringify(vesuPosition?.collateral)}`);
    logger.verbose(`supplyApy: ${JSON.stringify(assetInfo?.stats.supplyApy)}`);
    logger.verbose(`defiSpringSupplyApr: ${JSON.stringify(assetInfo?.stats.defiSpringSupplyApr)}`);
    logger.verbose(`currentUtilization: ${JSON.stringify(assetInfo?.stats.currentUtilization)}`);
    logger.verbose(`maxUtilization: ${JSON.stringify(assetInfo?.config.maxUtilization)}`);
    const item = {
      pool_id: p.pool_id,
      pool_name: _pool?.name,
      max_weight: p.max_weight,
      current_weight: isErrorPositionsAPI || !vesuPosition ? 0 : Number(Web3Number.fromWei(vesuPosition.collateral.value, this.decimals()).dividedBy(totalAssets.toString()).toFixed(6)),
      v_token: p.v_token,
      amount: Web3Number.fromWei(assets.toString(), this.decimals()),
      usdValue: isErrorPositionsAPI || !vesuPosition ? Web3Number.fromWei("0", this.decimals()) : Web3Number.fromWei(vesuPosition.collateral.usdPrice.value, vesuPosition.collateral.usdPrice.decimals),
      APY: isErrorPoolsAPI || !assetInfo ? {
        baseApy: 0,
        defiSpringApy: 0,
        netApy: 0
      } : {
        baseApy: Number(Web3Number.fromWei(assetInfo.stats.supplyApy.value, assetInfo.stats.supplyApy.decimals).toFixed(6)),
        defiSpringApy: assetInfo.stats.defiSpringSupplyApr ? Number(Web3Number.fromWei(assetInfo.stats.defiSpringSupplyApr.value, assetInfo.stats.defiSpringSupplyApr.decimals).toFixed(6)) : 0,
        netApy: 0
      },
      currentUtilization: isErrorPoolsAPI || !assetInfo ? 0 : Number(Web3Number.fromWei(assetInfo.stats.currentUtilization.value, assetInfo.stats.currentUtilization.decimals).toFixed(6)),
      maxUtilization: isErrorPoolsAPI || !assetInfo ? 0 : Number(Web3Number.fromWei(assetInfo.config.maxUtilization.value, assetInfo.config.maxUtilization.decimals).toFixed(6))
    };
    item.APY.netApy = item.APY.baseApy + item.APY.defiSpringApy;
    return item;
  }
  /**
   * Retrieves the list of allowed pools and their detailed information from multiple sources:
   * 1. Contract's allowed pools
   * 2. Vesu positions API for current positions
   * 3. Vesu pools API for APY and utilization data
   * 
   * @returns {Promise<{
   *   data: Array<PoolInfoFull>,
   *   isErrorPositionsAPI: boolean
   * }>} Object containing:
   *   - data: Array of pool information including IDs, weights, amounts, APYs and utilization
   *   - isErrorPositionsAPI: Boolean indicating if there was an error fetching position data
   */
  async getPools() {
    const allowedPools = (await this.contract.get_allowed_pools()).map((p) => ({
      pool_id: ContractAddr.from(p.pool_id),
      max_weight: Number(p.max_weight) / this.BASE_WEIGHT,
      v_token: ContractAddr.from(p.v_token)
    }));
    let isErrorPositionsAPI = false;
    let vesuPositions = [];
    try {
      const data2 = await getAPIUsingHeadlessBrowser(`https://api.vesu.xyz/positions?walletAddress=${this.address.address}`);
      vesuPositions = data2.data;
    } catch (e) {
      console.error(`${_VesuRebalance.name}: Error fetching positions for ${this.address.address}`, e);
      isErrorPositionsAPI = true;
    }
    let { pools, isErrorPoolsAPI } = await this.getVesuPools();
    const totalAssets = (await this.getTVL()).amount;
    const info = allowedPools.map((p) => this.getPoolInfo(p, pools, vesuPositions, totalAssets, isErrorPositionsAPI, isErrorPoolsAPI));
    const data = await Promise.all(info);
    return {
      data,
      isErrorPositionsAPI,
      isErrorPoolsAPI,
      isError: isErrorPositionsAPI || isErrorPoolsAPI
    };
  }
  async getVesuPools(retry = 0) {
    let isErrorPoolsAPI = false;
    let pools = [];
    try {
      const data = await getAPIUsingHeadlessBrowser("https://api.vesu.xyz/pools");
      pools = data.data;
      for (const pool of vesu_pools_default.data) {
        const found = pools.find((d) => d.id === pool.id);
        if (!found) {
          logger.verbose(`VesuRebalance: pools: ${JSON.stringify(pools)}`);
          logger.verbose(`VesuRebalance: Pool ${pool.id} not found in Vesu API, using hardcoded data`);
          throw new Error("pool not found [sanity check]");
        }
      }
    } catch (e) {
      logger.error(`${_VesuRebalance.name}: Error fetching pools for ${this.address.address}, retry ${retry}`, e);
      isErrorPoolsAPI = true;
      if (retry < 10) {
        await new Promise((resolve) => setTimeout(resolve, 5e3 * (retry + 1)));
        return await this.getVesuPools(retry + 1);
      }
    }
    return { pools, isErrorPoolsAPI };
  }
  /**
   * Calculates the weighted average APY across all pools based on USD value.
   * @returns {Promise<number>} The weighted average APY across all pools
   */
  async netAPY() {
    const { data: pools } = await this.getPools();
    return this.netAPYGivenPools(pools);
  }
  /**
   * Calculates the weighted average APY across all pools based on USD value.
   * @returns {Promise<number>} The weighted average APY across all pools
   */
  async netAPYGivenPools(pools) {
    const weightedApyNumerator = pools.reduce((acc, curr) => {
      const weight = curr.current_weight;
      return acc + curr.APY.netApy * Number(curr.amount.toString());
    }, 0);
    const totalAssets = (await this.getTVL()).amount;
    const weightedApy = weightedApyNumerator / Number(totalAssets.toString());
    return weightedApy * (1 - this.metadata.additionalInfo.feeBps / 1e4);
  }
  /**
   * Calculates optimal position changes to maximize APY while respecting max weights.
   * The algorithm:
   * 1. Sorts pools by APY (highest first)
   * 2. Calculates target amounts based on max weights
   * 3. For each pool that needs more funds:
   *    - Takes funds from lowest APY pools that are over their target
   * 4. Validates that total assets remain constant
   * 
   * @returns {Promise<{  
   *   changes: Change[],
   *   finalPools: PoolInfoFull[],
   *   isAnyPoolOverMaxWeight: boolean
   * }>} Object containing:
   *   - changes: Array of position changes
   *   - finalPools: Array of pool information after rebalance
   * @throws Error if rebalance is not possible while maintaining constraints
   */
  async getRebalancedPositions(_pools) {
    logger.verbose(`VesuRebalance: getRebalancedPositions`);
    if (!_pools) {
      const { data: _pools2 } = await this.getPools();
      _pools = _pools2;
    }
    const feeDeductions = await this.getFee(_pools);
    logger.verbose(`VesuRebalance: feeDeductions: ${JSON.stringify(feeDeductions)}`);
    const pools = _pools.map((p) => {
      const fee = feeDeductions.find((f) => p.v_token.eq(f.vToken))?.fee || Web3Number.fromWei("0", this.decimals());
      logger.verbose(`FeeAdjustment: ${p.pool_id} => ${fee.toString()}, amt: ${p.amount.toString()}`);
      return {
        ...p,
        amount: p.amount.minus(fee)
      };
    });
    let totalAssets = (await this.getTVL()).amount;
    if (totalAssets.eq(0)) return {
      changes: [],
      finalPools: []
    };
    feeDeductions.forEach((f) => {
      totalAssets = totalAssets.minus(f.fee);
    });
    const sumPools = pools.reduce((acc, curr) => acc.plus(curr.amount.toString()), Web3Number.fromWei("0", this.decimals()));
    logger.verbose(`Sum of pools: ${sumPools.toString()}`);
    logger.verbose(`Total assets: ${totalAssets.toString()}`);
    assert(sumPools.lte(totalAssets.multipliedBy(1.00001).toString()), "Sum of pools.amount must be less than or equal to totalAssets");
    const sortedPools = [...pools].sort((a, b) => b.APY.netApy - a.APY.netApy);
    const targetAmounts = {};
    let remainingAssets = totalAssets;
    logger.verbose(`Remaining assets: ${remainingAssets.toString()}`);
    let isAnyPoolOverMaxWeight = false;
    for (const pool of sortedPools) {
      const maxAmount = totalAssets.multipliedBy(pool.max_weight * 0.98);
      const targetAmount = remainingAssets.gte(maxAmount) ? maxAmount : remainingAssets;
      logger.verbose(`Target amount: ${targetAmount.toString()}`);
      logger.verbose(`Remaining assets: ${remainingAssets.toString()}`);
      logger.verbose(`Max amount: ${maxAmount.toString()}`);
      logger.verbose(`pool.max_weight: ${pool.max_weight}`);
      targetAmounts[pool.pool_id.address.toString()] = targetAmount;
      remainingAssets = remainingAssets.minus(targetAmount.toString());
      if (pool.current_weight > pool.max_weight) {
        isAnyPoolOverMaxWeight = true;
      }
    }
    assert(remainingAssets.lt(1e-5), "Remaining assets must be 0");
    const changes = sortedPools.map((pool) => {
      const target = targetAmounts[pool.pool_id.address.toString()] || Web3Number.fromWei("0", this.decimals());
      const change = Web3Number.fromWei(target.minus(pool.amount.toString()).toWei(), this.decimals());
      return {
        pool_id: pool.pool_id,
        changeAmt: change,
        finalAmt: target,
        isDeposit: change.gt(0)
      };
    });
    logger.verbose(`Changes: ${JSON.stringify(changes)}`);
    const sumChanges = changes.reduce((sum, c) => sum.plus(c.changeAmt.toString()), Web3Number.fromWei("0", this.decimals()));
    const sumFinal = changes.reduce((sum, c) => sum.plus(c.finalAmt.toString()), Web3Number.fromWei("0", this.decimals()));
    const hasChanges = changes.some((c) => !c.changeAmt.eq(0));
    logger.verbose(`Sum of changes: ${sumChanges.toString()}`);
    if (!sumChanges.eq(0)) throw new Error("Sum of changes must be zero");
    logger.verbose(`Sum of final: ${sumFinal.toString()}`);
    logger.verbose(`Total assets: ${totalAssets.toString()}`);
    if (!sumFinal.eq(totalAssets.toString())) throw new Error("Sum of final amounts must equal total assets");
    if (!hasChanges) throw new Error("No changes required");
    const finalPools = pools.map((p) => {
      const target = targetAmounts[p.pool_id.address.toString()] || Web3Number.fromWei("0", this.decimals());
      return {
        ...p,
        amount: target,
        usdValue: Web3Number.fromWei("0", this.decimals())
      };
    });
    return {
      changes,
      finalPools,
      isAnyPoolOverMaxWeight
    };
  }
  /**
   * Creates a rebalance Call object for the strategy contract
   * @param pools - Array of pool information including IDs, weights, amounts, APYs and utilization
   * @returns Populated contract call for rebalance
   */
  async getRebalanceCall(pools, isOverWeightAdjustment) {
    const actions = [];
    pools.sort((a, b) => b.isDeposit ? -1 : 1);
    pools.forEach((p) => {
      if (p.changeAmt.eq(0)) return null;
      actions.push({
        pool_id: p.pool_id.address,
        feature: new CairoCustomEnum(p.isDeposit ? { DEPOSIT: {} } : { WITHDRAW: {} }),
        token: this.asset().address.address,
        amount: uint2563.bnToUint256(p.changeAmt.multipliedBy(p.isDeposit ? 1 : -1).toWei())
      });
    });
    if (actions.length === 0) return null;
    if (isOverWeightAdjustment) {
      return this.contract.populate("rebalance_weights", [actions]);
    }
    return this.contract.populate("rebalance", [actions]);
  }
  async getInvestmentFlows(pools) {
    const netYield = await this.netAPYGivenPools(pools);
    const baseFlow = {
      title: "Your Deposit",
      subItems: [{ key: `Net yield`, value: `${(netYield * 100).toFixed(2)}%` }, { key: `Performance Fee`, value: `${(this.metadata.additionalInfo.feeBps / 100).toFixed(2)}%` }],
      linkedFlows: [],
      style: { backgroundColor: "#6e53dc" /* Purple */.valueOf() }
    };
    let _pools = [...pools];
    _pools = _pools.sort((a, b) => Number(b.amount.toString()) - Number(a.amount.toString()));
    _pools.forEach((p) => {
      const flow = {
        title: `Pool name: ${p.pool_name}`,
        subItems: [
          { key: `APY`, value: `${(p.APY.netApy * 100).toFixed(2)}%` },
          { key: "Weight", value: `${(p.current_weight * 100).toFixed(2)} / ${(p.max_weight * 100).toFixed(2)}%` }
        ],
        linkedFlows: [],
        style: p.amount.greaterThan(0) ? { backgroundColor: "#35484f" /* Blue */.valueOf() } : { color: "gray" }
      };
      baseFlow.linkedFlows.push(flow);
    });
    return [baseFlow];
  }
  async harvest(acc) {
    const vesuHarvest = new VesuHarvests(this.config);
    const harvests = await vesuHarvest.getUnHarvestedRewards(this.address);
    const harvest = harvests[0];
    const avnu = new AvnuWrapper();
    let swapInfo = {
      token_from_address: harvest.token.address,
      token_from_amount: uint2563.bnToUint256(harvest.actualReward.toWei()),
      token_to_address: this.asset().address.address,
      token_to_amount: uint2563.bnToUint256(0),
      token_to_min_amount: uint2563.bnToUint256(0),
      beneficiary: this.address.address,
      integrator_fee_amount_bps: 0,
      integrator_fee_recipient: this.address.address,
      routes: []
    };
    if (!this.asset().address.eqString(harvest.token.address)) {
      const quote = await avnu.getQuotes(
        harvest.token.address,
        this.asset().address.address,
        harvest.actualReward.toWei(),
        this.address.address
      );
      swapInfo = await avnu.getSwapInfo(quote, this.address.address, 0, this.address.address);
    }
    return [
      this.contract.populate("harvest", [
        harvest.rewardsContract.address,
        {
          id: harvest.claim.id,
          amount: harvest.claim.amount.toWei(),
          claimee: harvest.claim.claimee.address
        },
        harvest.proof,
        swapInfo
      ])
    ];
  }
  /**
   * Calculates the fees deducted in different vTokens based on the current and previous state.
   * @param previousTotalSupply - The total supply of the strategy token before the transaction
   * @returns {Promise<Array<{ vToken: ContractAddr, fee: Web3Number }>>} Array of fees deducted in different vTokens
   */
  async getFee(allowedPools) {
    const assets = Web3Number.fromWei((await this.contract.total_assets()).toString(), this.asset().decimals);
    const totalSupply = Web3Number.fromWei((await this.contract.total_supply()).toString(), this.asset().decimals);
    const prevIndex = Web3Number.fromWei((await this.contract.get_previous_index()).toString(), 18);
    const currIndex = new Web3Number(1, 18).multipliedBy(assets).dividedBy(totalSupply);
    logger.verbose(`Previous index: ${prevIndex.toString()}`);
    logger.verbose(`Assets: ${assets.toString()}`);
    logger.verbose(`Total supply: ${totalSupply.toString()}`);
    logger.verbose(`Current index: ${currIndex.toNumber()}`);
    if (currIndex.lt(prevIndex)) {
      logger.verbose(`getFee::Current index is less than previous index, no fees to be deducted`);
      return [];
    }
    const indexDiff = currIndex.minus(prevIndex);
    logger.verbose(`Index diff: ${indexDiff.toString()}`);
    const numerator = totalSupply.multipliedBy(indexDiff).multipliedBy(this.metadata.additionalInfo.feeBps);
    const denominator = 1e4;
    let fee = numerator.dividedBy(denominator);
    logger.verbose(`Fee: ${fee.toString()}`);
    if (fee.lte(0)) {
      return [];
    }
    const fees = [];
    let remainingFee = fee.plus(Web3Number.fromWei("100", this.asset().decimals));
    for (const pool of allowedPools) {
      const vToken = pool.v_token;
      const balance = pool.amount;
      if (remainingFee.lte(balance)) {
        fees.push({ vToken, fee: remainingFee });
        break;
      } else {
        fees.push({ vToken, fee: Web3Number.fromWei(balance.toString(), 18) });
        remainingFee = remainingFee.minus(Web3Number.fromWei(balance.toString(), 18));
      }
    }
    logger.verbose(`Fees: ${JSON.stringify(fees)}`);
    return fees;
  }
};
var _description = "Automatically diversify {{TOKEN}} holdings into different Vesu pools while reducing risk and maximizing yield. Defi spring STRK Rewards are auto-compounded as well.";
var _protocol = { name: "Vesu", logo: "https://static-assets-8zct.onrender.com/integrations/vesu/logo.png" };
var _riskFactor = [
  { type: "Smart Contract Risk" /* SMART_CONTRACT_RISK */, value: 0.5, weight: 25 },
  { type: "Counterparty Risk" /* COUNTERPARTY_RISK */, value: 1, weight: 50 },
  { type: "Oracle Risk" /* ORACLE_RISK */, value: 0.5, weight: 25 }
];
var AUDIT_URL = "https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf";
var VesuRebalanceStrategies = [{
  name: "Vesu Fusion STRK",
  description: _description.replace("{{TOKEN}}", "STRK"),
  address: ContractAddr.from("0x7fb5bcb8525954a60fde4e8fb8220477696ce7117ef264775a1770e23571929"),
  type: "ERC4626",
  depositTokens: [Global.getDefaultTokens().find((t) => t.symbol === "STRK")],
  protocols: [_protocol],
  auditUrl: AUDIT_URL,
  maxTVL: Web3Number.fromWei("0", 18),
  risk: {
    riskFactor: _riskFactor,
    netRisk: _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) / _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
    notARisks: getNoRiskTags(_riskFactor)
  },
  additionalInfo: {
    feeBps: 1e3
  }
}, {
  name: "Vesu Fusion ETH",
  description: _description.replace("{{TOKEN}}", "ETH"),
  address: ContractAddr.from("0x5eaf5ee75231cecf79921ff8ded4b5ffe96be718bcb3daf206690ad1a9ad0ca"),
  type: "ERC4626",
  auditUrl: AUDIT_URL,
  depositTokens: [Global.getDefaultTokens().find((t) => t.symbol === "ETH")],
  protocols: [_protocol],
  maxTVL: Web3Number.fromWei("0", 18),
  risk: {
    riskFactor: _riskFactor,
    netRisk: _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) / _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
    notARisks: getNoRiskTags(_riskFactor)
  },
  additionalInfo: {
    feeBps: 1e3
  }
}, {
  name: "Vesu Fusion USDC",
  description: _description.replace("{{TOKEN}}", "USDC"),
  address: ContractAddr.from("0xa858c97e9454f407d1bd7c57472fc8d8d8449a777c822b41d18e387816f29c"),
  type: "ERC4626",
  auditUrl: AUDIT_URL,
  depositTokens: [Global.getDefaultTokens().find((t) => t.symbol === "USDC")],
  protocols: [_protocol],
  maxTVL: Web3Number.fromWei("0", 6),
  risk: {
    riskFactor: _riskFactor,
    netRisk: _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) / _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
    notARisks: getNoRiskTags(_riskFactor)
  },
  additionalInfo: {
    feeBps: 1e3
  }
}, {
  name: "Vesu Fusion USDT",
  description: _description.replace("{{TOKEN}}", "USDT"),
  address: ContractAddr.from("0x115e94e722cfc4c77a2f15c4aefb0928c1c0029e5a57570df24c650cb7cec2c"),
  type: "ERC4626",
  depositTokens: [Global.getDefaultTokens().find((t) => t.symbol === "USDT")],
  auditUrl: AUDIT_URL,
  protocols: [_protocol],
  maxTVL: Web3Number.fromWei("0", 6),
  risk: {
    riskFactor: _riskFactor,
    netRisk: _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) / _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
    notARisks: getNoRiskTags(_riskFactor)
  },
  additionalInfo: {
    feeBps: 1e3
  }
  // }, {
  //     name: 'Vesu Fusion WBTC',
  //     description: _description.replace('{{TOKEN}}', 'WBTC'),
  //     address: ContractAddr.from('0x778007f8136a5b827325d21613803e796bda4d676fbe1e34aeab0b2a2ec027f'),
  //     type: 'ERC4626',
  //     depositTokens: [Global.getDefaultTokens().find(t => t.symbol === 'WBTC')!],
  // auditUrl: AUDIT_URL,
  //     protocols: [_protocol],
  //     maxTVL: Web3Number.fromWei('0', 8),
  //     risk: {
  //         riskFactor: _riskFactor,
  //         netRisk: _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) / _riskFactor.reduce((acc, curr) => acc + curr.weight, 0),
  //     },
  //     additionalInfo: {
  //         feeBps: 1000,
  //     },
}];

// src/strategies/ekubo-cl-vault.tsx
import { Contract as Contract6, num as num4, uint256 as uint2564 } from "starknet";

// src/data/cl-vault.abi.json
var cl_vault_abi_default = [
  {
    type: "impl",
    name: "ExternalImpl",
    interface_name: "strkfarm_contracts::strategies::cl_vault::interface::IClVault"
  },
  {
    type: "struct",
    name: "core::integer::u256",
    members: [
      {
        name: "low",
        type: "core::integer::u128"
      },
      {
        name: "high",
        type: "core::integer::u128"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::strategies::cl_vault::interface::MyPosition",
    members: [
      {
        name: "liquidity",
        type: "core::integer::u256"
      },
      {
        name: "amount0",
        type: "core::integer::u256"
      },
      {
        name: "amount1",
        type: "core::integer::u256"
      }
    ]
  },
  {
    type: "enum",
    name: "core::bool",
    variants: [
      {
        name: "False",
        type: "()"
      },
      {
        name: "True",
        type: "()"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::types::i129::i129",
    members: [
      {
        name: "mag",
        type: "core::integer::u128"
      },
      {
        name: "sign",
        type: "core::bool"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::interfaces::IEkuboCore::Bounds",
    members: [
      {
        name: "lower",
        type: "ekubo::types::i129::i129"
      },
      {
        name: "upper",
        type: "ekubo::types::i129::i129"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::interfaces::IEkuboCore::PositionKey",
    members: [
      {
        name: "salt",
        type: "core::integer::u64"
      },
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "bounds",
        type: "strkfarm_contracts::interfaces::IEkuboCore::Bounds"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::types::fees_per_liquidity::FeesPerLiquidity",
    members: [
      {
        name: "value0",
        type: "core::felt252"
      },
      {
        name: "value1",
        type: "core::felt252"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::types::position::Position",
    members: [
      {
        name: "liquidity",
        type: "core::integer::u128"
      },
      {
        name: "fees_per_liquidity_inside_last",
        type: "ekubo::types::fees_per_liquidity::FeesPerLiquidity"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::interfaces::IEkuboDistributor::Claim",
    members: [
      {
        name: "id",
        type: "core::integer::u64"
      },
      {
        name: "claimee",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "amount",
        type: "core::integer::u128"
      }
    ]
  },
  {
    type: "struct",
    name: "core::array::Span::<core::felt252>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::components::swap::Route",
    members: [
      {
        name: "token_from",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "token_to",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "exchange_address",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "percent",
        type: "core::integer::u128"
      },
      {
        name: "additional_swap_params",
        type: "core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::components::swap::AvnuMultiRouteSwap",
    members: [
      {
        name: "token_from_address",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "token_from_amount",
        type: "core::integer::u256"
      },
      {
        name: "token_to_address",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "token_to_amount",
        type: "core::integer::u256"
      },
      {
        name: "token_to_min_amount",
        type: "core::integer::u256"
      },
      {
        name: "beneficiary",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "integrator_fee_amount_bps",
        type: "core::integer::u128"
      },
      {
        name: "integrator_fee_recipient",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "routes",
        type: "core::array::Array::<strkfarm_contracts::components::swap::Route>"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::interfaces::IEkuboCore::PoolKey",
    members: [
      {
        name: "token0",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "token1",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "fee",
        type: "core::integer::u128"
      },
      {
        name: "tick_spacing",
        type: "core::integer::u128"
      },
      {
        name: "extension",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::strategies::cl_vault::interface::FeeSettings",
    members: [
      {
        name: "fee_bps",
        type: "core::integer::u256"
      },
      {
        name: "fee_collector",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::strategies::cl_vault::interface::ClSettings",
    members: [
      {
        name: "ekubo_positions_contract",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "bounds_settings",
        type: "strkfarm_contracts::interfaces::IEkuboCore::Bounds"
      },
      {
        name: "pool_key",
        type: "strkfarm_contracts::interfaces::IEkuboCore::PoolKey"
      },
      {
        name: "ekubo_positions_nft",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "contract_nft_id",
        type: "core::integer::u64"
      },
      {
        name: "ekubo_core",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "oracle",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "fee_settings",
        type: "strkfarm_contracts::strategies::cl_vault::interface::FeeSettings"
      }
    ]
  },
  {
    type: "interface",
    name: "strkfarm_contracts::strategies::cl_vault::interface::IClVault",
    items: [
      {
        type: "function",
        name: "deposit",
        inputs: [
          {
            name: "amount0",
            type: "core::integer::u256"
          },
          {
            name: "amount1",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "withdraw",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "strkfarm_contracts::strategies::cl_vault::interface::MyPosition"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "convert_to_shares",
        inputs: [
          {
            name: "amount0",
            type: "core::integer::u256"
          },
          {
            name: "amount1",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "convert_to_assets",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "strkfarm_contracts::strategies::cl_vault::interface::MyPosition"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "total_liquidity",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_position_key",
        inputs: [],
        outputs: [
          {
            type: "strkfarm_contracts::interfaces::IEkuboCore::PositionKey"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_position",
        inputs: [],
        outputs: [
          {
            type: "ekubo::types::position::Position"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "handle_fees",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "harvest",
        inputs: [
          {
            name: "rewardsContract",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "claim",
            type: "strkfarm_contracts::interfaces::IEkuboDistributor::Claim"
          },
          {
            name: "proof",
            type: "core::array::Span::<core::felt252>"
          },
          {
            name: "swapInfo1",
            type: "strkfarm_contracts::components::swap::AvnuMultiRouteSwap"
          },
          {
            name: "swapInfo2",
            type: "strkfarm_contracts::components::swap::AvnuMultiRouteSwap"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "get_settings",
        inputs: [],
        outputs: [
          {
            type: "strkfarm_contracts::strategies::cl_vault::interface::ClSettings"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "handle_unused",
        inputs: [
          {
            name: "swap_params",
            type: "strkfarm_contracts::components::swap::AvnuMultiRouteSwap"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "rebalance",
        inputs: [
          {
            name: "new_bounds",
            type: "strkfarm_contracts::interfaces::IEkuboCore::Bounds"
          },
          {
            name: "swap_params",
            type: "strkfarm_contracts::components::swap::AvnuMultiRouteSwap"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "set_settings",
        inputs: [
          {
            name: "fee_settings",
            type: "strkfarm_contracts::strategies::cl_vault::interface::FeeSettings"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "set_incentives_off",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    type: "impl",
    name: "VesuERC20Impl",
    interface_name: "openzeppelin_token::erc20::interface::IERC20Mixin"
  },
  {
    type: "struct",
    name: "core::byte_array::ByteArray",
    members: [
      {
        name: "data",
        type: "core::array::Array::<core::bytes_31::bytes31>"
      },
      {
        name: "pending_word",
        type: "core::felt252"
      },
      {
        name: "pending_word_len",
        type: "core::integer::u32"
      }
    ]
  },
  {
    type: "interface",
    name: "openzeppelin_token::erc20::interface::IERC20Mixin",
    items: [
      {
        type: "function",
        name: "total_supply",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "balance_of",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "allowance",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "transfer",
        inputs: [
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "transfer_from",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "approve",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "name",
        inputs: [],
        outputs: [
          {
            type: "core::byte_array::ByteArray"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "symbol",
        inputs: [],
        outputs: [
          {
            type: "core::byte_array::ByteArray"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "decimals",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u8"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "totalSupply",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "balanceOf",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "transferFrom",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    type: "impl",
    name: "RewardShareImpl",
    interface_name: "strkfarm_contracts::components::harvester::reward_shares::IRewardShare"
  },
  {
    type: "struct",
    name: "strkfarm_contracts::components::harvester::reward_shares::UserRewardsInfo",
    members: [
      {
        name: "pending_round_points",
        type: "core::integer::u128"
      },
      {
        name: "shares_owned",
        type: "core::integer::u128"
      },
      {
        name: "block_number",
        type: "core::integer::u64"
      },
      {
        name: "index",
        type: "core::integer::u32"
      }
    ]
  },
  {
    type: "struct",
    name: "strkfarm_contracts::components::harvester::reward_shares::RewardsInfo",
    members: [
      {
        name: "amount",
        type: "core::integer::u128"
      },
      {
        name: "shares",
        type: "core::integer::u128"
      },
      {
        name: "total_round_points",
        type: "core::integer::u128"
      },
      {
        name: "block_number",
        type: "core::integer::u64"
      }
    ]
  },
  {
    type: "interface",
    name: "strkfarm_contracts::components::harvester::reward_shares::IRewardShare",
    items: [
      {
        type: "function",
        name: "get_user_reward_info",
        inputs: [
          {
            name: "user",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "strkfarm_contracts::components::harvester::reward_shares::UserRewardsInfo"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_rewards_info",
        inputs: [
          {
            name: "index",
            type: "core::integer::u32"
          }
        ],
        outputs: [
          {
            type: "strkfarm_contracts::components::harvester::reward_shares::RewardsInfo"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_total_rewards",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u32"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_total_unminted_shares",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_additional_shares",
        inputs: [
          {
            name: "user",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u128, core::integer::u64, core::integer::u128)"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "impl",
    name: "CommonCompImpl",
    interface_name: "strkfarm_contracts::interfaces::common::ICommon"
  },
  {
    type: "interface",
    name: "strkfarm_contracts::interfaces::common::ICommon",
    items: [
      {
        type: "function",
        name: "upgrade",
        inputs: [
          {
            name: "new_class",
            type: "core::starknet::class_hash::ClassHash"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "pause",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "unpause",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "is_paused",
        inputs: [],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "constructor",
    name: "constructor",
    inputs: [
      {
        name: "name",
        type: "core::byte_array::ByteArray"
      },
      {
        name: "symbol",
        type: "core::byte_array::ByteArray"
      },
      {
        name: "access_control",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "ekubo_positions_contract",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "bounds_settings",
        type: "strkfarm_contracts::interfaces::IEkuboCore::Bounds"
      },
      {
        name: "pool_key",
        type: "strkfarm_contracts::interfaces::IEkuboCore::PoolKey"
      },
      {
        name: "ekubo_positions_nft",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "ekubo_core",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "oracle",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "fee_settings",
        type: "strkfarm_contracts::strategies::cl_vault::interface::FeeSettings"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_security::reentrancyguard::ReentrancyGuardComponent::Event",
    kind: "enum",
    variants: []
  },
  {
    type: "event",
    name: "openzeppelin_token::erc20::erc20::ERC20Component::Transfer",
    kind: "struct",
    members: [
      {
        name: "from",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "to",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "value",
        type: "core::integer::u256",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_token::erc20::erc20::ERC20Component::Approval",
    kind: "struct",
    members: [
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "value",
        type: "core::integer::u256",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_token::erc20::erc20::ERC20Component::Event",
    kind: "enum",
    variants: [
      {
        name: "Transfer",
        type: "openzeppelin_token::erc20::erc20::ERC20Component::Transfer",
        kind: "nested"
      },
      {
        name: "Approval",
        type: "openzeppelin_token::erc20::erc20::ERC20Component::Approval",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_introspection::src5::SRC5Component::Event",
    kind: "enum",
    variants: []
  },
  {
    type: "event",
    name: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferred",
    kind: "struct",
    members: [
      {
        name: "previous_owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "new_owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferStarted",
    kind: "struct",
    members: [
      {
        name: "previous_owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "new_owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_access::ownable::ownable::OwnableComponent::Event",
    kind: "enum",
    variants: [
      {
        name: "OwnershipTransferred",
        type: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferred",
        kind: "nested"
      },
      {
        name: "OwnershipTransferStarted",
        type: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferStarted",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Upgraded",
    kind: "struct",
    members: [
      {
        name: "class_hash",
        type: "core::starknet::class_hash::ClassHash",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Event",
    kind: "enum",
    variants: [
      {
        name: "Upgraded",
        type: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Upgraded",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_security::pausable::PausableComponent::Paused",
    kind: "struct",
    members: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_security::pausable::PausableComponent::Unpaused",
    kind: "struct",
    members: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "openzeppelin_security::pausable::PausableComponent::Event",
    kind: "enum",
    variants: [
      {
        name: "Paused",
        type: "openzeppelin_security::pausable::PausableComponent::Paused",
        kind: "nested"
      },
      {
        name: "Unpaused",
        type: "openzeppelin_security::pausable::PausableComponent::Unpaused",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::common::CommonComp::Event",
    kind: "enum",
    variants: []
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::Rewards",
    kind: "struct",
    members: [
      {
        name: "index",
        type: "core::integer::u32",
        kind: "data"
      },
      {
        name: "info",
        type: "strkfarm_contracts::components::harvester::reward_shares::RewardsInfo",
        kind: "data"
      },
      {
        name: "total_reward_shares",
        type: "core::integer::u128",
        kind: "data"
      },
      {
        name: "timestamp",
        type: "core::integer::u64",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::UserRewards",
    kind: "struct",
    members: [
      {
        name: "user",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "info",
        type: "strkfarm_contracts::components::harvester::reward_shares::UserRewardsInfo",
        kind: "data"
      },
      {
        name: "total_reward_shares",
        type: "core::integer::u128",
        kind: "data"
      },
      {
        name: "timestamp",
        type: "core::integer::u64",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::Event",
    kind: "enum",
    variants: [
      {
        name: "Rewards",
        type: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::Rewards",
        kind: "nested"
      },
      {
        name: "UserRewards",
        type: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::UserRewards",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::strategies::cl_vault::cl_vault::ConcLiquidityVault::Deposit",
    kind: "struct",
    members: [
      {
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "assets",
        type: "core::integer::u256",
        kind: "data"
      },
      {
        name: "shares",
        type: "core::integer::u256",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::strategies::cl_vault::cl_vault::ConcLiquidityVault::Withdraw",
    kind: "struct",
    members: [
      {
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "receiver",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "key"
      },
      {
        name: "assets",
        type: "core::integer::u256",
        kind: "data"
      },
      {
        name: "shares",
        type: "core::integer::u256",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::strategies::cl_vault::cl_vault::ConcLiquidityVault::Rebalance",
    kind: "struct",
    members: [
      {
        name: "old_bounds",
        type: "strkfarm_contracts::interfaces::IEkuboCore::Bounds",
        kind: "data"
      },
      {
        name: "old_liquidity",
        type: "core::integer::u256",
        kind: "data"
      },
      {
        name: "new_bounds",
        type: "strkfarm_contracts::interfaces::IEkuboCore::Bounds",
        kind: "data"
      },
      {
        name: "new_liquidity",
        type: "core::integer::u256",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::strategies::cl_vault::cl_vault::ConcLiquidityVault::HandleFees",
    kind: "struct",
    members: [
      {
        name: "token0_addr",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      },
      {
        name: "token0_origin_bal",
        type: "core::integer::u256",
        kind: "data"
      },
      {
        name: "token0_deposited",
        type: "core::integer::u256",
        kind: "data"
      },
      {
        name: "token1_addr",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      },
      {
        name: "token1_origin_bal",
        type: "core::integer::u256",
        kind: "data"
      },
      {
        name: "token1_deposited",
        type: "core::integer::u256",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::strategies::cl_vault::interface::FeeSettings",
    kind: "struct",
    members: [
      {
        name: "fee_bps",
        type: "core::integer::u256",
        kind: "data"
      },
      {
        name: "fee_collector",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "strkfarm_contracts::strategies::cl_vault::cl_vault::ConcLiquidityVault::Event",
    kind: "enum",
    variants: [
      {
        name: "ReentrancyGuardEvent",
        type: "openzeppelin_security::reentrancyguard::ReentrancyGuardComponent::Event",
        kind: "flat"
      },
      {
        name: "ERC20Event",
        type: "openzeppelin_token::erc20::erc20::ERC20Component::Event",
        kind: "flat"
      },
      {
        name: "SRC5Event",
        type: "openzeppelin_introspection::src5::SRC5Component::Event",
        kind: "flat"
      },
      {
        name: "OwnableEvent",
        type: "openzeppelin_access::ownable::ownable::OwnableComponent::Event",
        kind: "flat"
      },
      {
        name: "UpgradeableEvent",
        type: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Event",
        kind: "flat"
      },
      {
        name: "PausableEvent",
        type: "openzeppelin_security::pausable::PausableComponent::Event",
        kind: "flat"
      },
      {
        name: "CommonCompEvent",
        type: "strkfarm_contracts::components::common::CommonComp::Event",
        kind: "flat"
      },
      {
        name: "RewardShareEvent",
        type: "strkfarm_contracts::components::harvester::reward_shares::RewardShareComponent::Event",
        kind: "flat"
      },
      {
        name: "Deposit",
        type: "strkfarm_contracts::strategies::cl_vault::cl_vault::ConcLiquidityVault::Deposit",
        kind: "nested"
      },
      {
        name: "Withdraw",
        type: "strkfarm_contracts::strategies::cl_vault::cl_vault::ConcLiquidityVault::Withdraw",
        kind: "nested"
      },
      {
        name: "Rebalance",
        type: "strkfarm_contracts::strategies::cl_vault::cl_vault::ConcLiquidityVault::Rebalance",
        kind: "nested"
      },
      {
        name: "HandleFees",
        type: "strkfarm_contracts::strategies::cl_vault::cl_vault::ConcLiquidityVault::HandleFees",
        kind: "nested"
      },
      {
        name: "FeeSettings",
        type: "strkfarm_contracts::strategies::cl_vault::interface::FeeSettings",
        kind: "nested"
      }
    ]
  }
];

// src/data/ekubo-positions.abi.json
var ekubo_positions_abi_default = [
  {
    type: "impl",
    name: "PositionsHasInterface",
    interface_name: "ekubo::components::upgradeable::IHasInterface"
  },
  {
    type: "interface",
    name: "ekubo::components::upgradeable::IHasInterface",
    items: [
      {
        type: "function",
        name: "get_primary_interface_id",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "impl",
    name: "ILockerImpl",
    interface_name: "ekubo::interfaces::core::ILocker"
  },
  {
    type: "struct",
    name: "core::array::Span::<core::felt252>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    type: "interface",
    name: "ekubo::interfaces::core::ILocker",
    items: [
      {
        type: "function",
        name: "locked",
        inputs: [
          {
            name: "id",
            type: "core::integer::u32"
          },
          {
            name: "data",
            type: "core::array::Span::<core::felt252>"
          }
        ],
        outputs: [
          {
            type: "core::array::Span::<core::felt252>"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    type: "impl",
    name: "PositionsImpl",
    interface_name: "ekubo::interfaces::positions::IPositions"
  },
  {
    type: "struct",
    name: "ekubo::types::keys::PoolKey",
    members: [
      {
        name: "token0",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "token1",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "fee",
        type: "core::integer::u128"
      },
      {
        name: "tick_spacing",
        type: "core::integer::u128"
      },
      {
        name: "extension",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    type: "enum",
    name: "core::bool",
    variants: [
      {
        name: "False",
        type: "()"
      },
      {
        name: "True",
        type: "()"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::types::i129::i129",
    members: [
      {
        name: "mag",
        type: "core::integer::u128"
      },
      {
        name: "sign",
        type: "core::bool"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::types::bounds::Bounds",
    members: [
      {
        name: "lower",
        type: "ekubo::types::i129::i129"
      },
      {
        name: "upper",
        type: "ekubo::types::i129::i129"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::interfaces::positions::GetTokenInfoRequest",
    members: [
      {
        name: "id",
        type: "core::integer::u64"
      },
      {
        name: "pool_key",
        type: "ekubo::types::keys::PoolKey"
      },
      {
        name: "bounds",
        type: "ekubo::types::bounds::Bounds"
      }
    ]
  },
  {
    type: "struct",
    name: "core::array::Span::<ekubo::interfaces::positions::GetTokenInfoRequest>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<ekubo::interfaces::positions::GetTokenInfoRequest>"
      }
    ]
  },
  {
    type: "struct",
    name: "core::integer::u256",
    members: [
      {
        name: "low",
        type: "core::integer::u128"
      },
      {
        name: "high",
        type: "core::integer::u128"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::types::pool_price::PoolPrice",
    members: [
      {
        name: "sqrt_ratio",
        type: "core::integer::u256"
      },
      {
        name: "tick",
        type: "ekubo::types::i129::i129"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::interfaces::positions::GetTokenInfoResult",
    members: [
      {
        name: "pool_price",
        type: "ekubo::types::pool_price::PoolPrice"
      },
      {
        name: "liquidity",
        type: "core::integer::u128"
      },
      {
        name: "amount0",
        type: "core::integer::u128"
      },
      {
        name: "amount1",
        type: "core::integer::u128"
      },
      {
        name: "fees0",
        type: "core::integer::u128"
      },
      {
        name: "fees1",
        type: "core::integer::u128"
      }
    ]
  },
  {
    type: "struct",
    name: "core::array::Span::<ekubo::interfaces::positions::GetTokenInfoResult>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<ekubo::interfaces::positions::GetTokenInfoResult>"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::interfaces::extensions::twamm::OrderKey",
    members: [
      {
        name: "sell_token",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "buy_token",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "fee",
        type: "core::integer::u128"
      },
      {
        name: "start_time",
        type: "core::integer::u64"
      },
      {
        name: "end_time",
        type: "core::integer::u64"
      }
    ]
  },
  {
    type: "struct",
    name: "core::array::Span::<(core::integer::u64, ekubo::interfaces::extensions::twamm::OrderKey)>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<(core::integer::u64, ekubo::interfaces::extensions::twamm::OrderKey)>"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::interfaces::extensions::twamm::OrderInfo",
    members: [
      {
        name: "sale_rate",
        type: "core::integer::u128"
      },
      {
        name: "remaining_sell_amount",
        type: "core::integer::u128"
      },
      {
        name: "purchased_amount",
        type: "core::integer::u128"
      }
    ]
  },
  {
    type: "struct",
    name: "core::array::Span::<ekubo::interfaces::extensions::twamm::OrderInfo>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<ekubo::interfaces::extensions::twamm::OrderInfo>"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::interfaces::extensions::limit_orders::OrderKey",
    members: [
      {
        name: "token0",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "token1",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "tick",
        type: "ekubo::types::i129::i129"
      }
    ]
  },
  {
    type: "enum",
    name: "core::option::Option::<(core::integer::u64, core::integer::u128)>",
    variants: [
      {
        name: "Some",
        type: "(core::integer::u64, core::integer::u128)"
      },
      {
        name: "None",
        type: "()"
      }
    ]
  },
  {
    type: "struct",
    name: "core::array::Span::<(core::integer::u64, ekubo::interfaces::extensions::limit_orders::OrderKey)>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<(core::integer::u64, ekubo::interfaces::extensions::limit_orders::OrderKey)>"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::interfaces::extensions::limit_orders::OrderState",
    members: [
      {
        name: "initialized_ticks_crossed_snapshot",
        type: "core::integer::u64"
      },
      {
        name: "liquidity",
        type: "core::integer::u128"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::interfaces::extensions::limit_orders::GetOrderInfoResult",
    members: [
      {
        name: "state",
        type: "ekubo::interfaces::extensions::limit_orders::OrderState"
      },
      {
        name: "executed",
        type: "core::bool"
      },
      {
        name: "amount0",
        type: "core::integer::u128"
      },
      {
        name: "amount1",
        type: "core::integer::u128"
      }
    ]
  },
  {
    type: "struct",
    name: "core::array::Span::<ekubo::interfaces::extensions::limit_orders::GetOrderInfoResult>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<ekubo::interfaces::extensions::limit_orders::GetOrderInfoResult>"
      }
    ]
  },
  {
    type: "interface",
    name: "ekubo::interfaces::positions::IPositions",
    items: [
      {
        type: "function",
        name: "get_nft_address",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "upgrade_nft",
        inputs: [
          {
            name: "class_hash",
            type: "core::starknet::class_hash::ClassHash"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "set_twamm",
        inputs: [
          {
            name: "twamm_address",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "set_limit_orders",
        inputs: [
          {
            name: "limit_orders_address",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "get_twamm_address",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_limit_orders_address",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_tokens_info",
        inputs: [
          {
            name: "params",
            type: "core::array::Span::<ekubo::interfaces::positions::GetTokenInfoRequest>"
          }
        ],
        outputs: [
          {
            type: "core::array::Span::<ekubo::interfaces::positions::GetTokenInfoResult>"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_token_info",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          }
        ],
        outputs: [
          {
            type: "ekubo::interfaces::positions::GetTokenInfoResult"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_orders_info_with_block_timestamp",
        inputs: [
          {
            name: "params",
            type: "core::array::Span::<(core::integer::u64, ekubo::interfaces::extensions::twamm::OrderKey)>"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u64, core::array::Span::<ekubo::interfaces::extensions::twamm::OrderInfo>)"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_orders_info",
        inputs: [
          {
            name: "params",
            type: "core::array::Span::<(core::integer::u64, ekubo::interfaces::extensions::twamm::OrderKey)>"
          }
        ],
        outputs: [
          {
            type: "core::array::Span::<ekubo::interfaces::extensions::twamm::OrderInfo>"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "get_order_info",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::twamm::OrderKey"
          }
        ],
        outputs: [
          {
            type: "ekubo::interfaces::extensions::twamm::OrderInfo"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "mint",
        inputs: [
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          }
        ],
        outputs: [
          {
            type: "core::integer::u64"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "mint_with_referrer",
        inputs: [
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          },
          {
            name: "referrer",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u64"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "mint_v2",
        inputs: [
          {
            name: "referrer",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u64"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "check_liquidity_is_zero",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          }
        ],
        outputs: [],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "unsafe_burn",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "deposit_last",
        inputs: [
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          },
          {
            name: "min_liquidity",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "deposit_amounts_last",
        inputs: [
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          },
          {
            name: "amount0",
            type: "core::integer::u128"
          },
          {
            name: "amount1",
            type: "core::integer::u128"
          },
          {
            name: "min_liquidity",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "deposit",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          },
          {
            name: "min_liquidity",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "deposit_amounts",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          },
          {
            name: "amount0",
            type: "core::integer::u128"
          },
          {
            name: "amount1",
            type: "core::integer::u128"
          },
          {
            name: "min_liquidity",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "mint_and_deposit",
        inputs: [
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          },
          {
            name: "min_liquidity",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u64, core::integer::u128)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "mint_and_deposit_with_referrer",
        inputs: [
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          },
          {
            name: "min_liquidity",
            type: "core::integer::u128"
          },
          {
            name: "referrer",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u64, core::integer::u128)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "mint_and_deposit_and_clear_both",
        inputs: [
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          },
          {
            name: "min_liquidity",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u64, core::integer::u128, core::integer::u256, core::integer::u256)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "collect_fees",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u128, core::integer::u128)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "withdraw",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          },
          {
            name: "liquidity",
            type: "core::integer::u128"
          },
          {
            name: "min_token0",
            type: "core::integer::u128"
          },
          {
            name: "min_token1",
            type: "core::integer::u128"
          },
          {
            name: "collect_fees",
            type: "core::bool"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u128, core::integer::u128)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "withdraw_v2",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          },
          {
            name: "bounds",
            type: "ekubo::types::bounds::Bounds"
          },
          {
            name: "liquidity",
            type: "core::integer::u128"
          },
          {
            name: "min_token0",
            type: "core::integer::u128"
          },
          {
            name: "min_token1",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u128, core::integer::u128)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "get_pool_price",
        inputs: [
          {
            name: "pool_key",
            type: "ekubo::types::keys::PoolKey"
          }
        ],
        outputs: [
          {
            type: "ekubo::types::pool_price::PoolPrice"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "mint_and_increase_sell_amount",
        inputs: [
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::twamm::OrderKey"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u64, core::integer::u128)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "increase_sell_amount_last",
        inputs: [
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::twamm::OrderKey"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "increase_sell_amount",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::twamm::OrderKey"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "decrease_sale_rate_to",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::twamm::OrderKey"
          },
          {
            name: "sale_rate_delta",
            type: "core::integer::u128"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "decrease_sale_rate_to_self",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::twamm::OrderKey"
          },
          {
            name: "sale_rate_delta",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "withdraw_proceeds_from_sale_to_self",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::twamm::OrderKey"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "withdraw_proceeds_from_sale_to",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::twamm::OrderKey"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "swap_to_limit_order_price",
        inputs: [
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::limit_orders::OrderKey"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u128, core::integer::u128)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "swap_to_limit_order_price_and_maybe_mint_and_place_limit_order_to",
        inputs: [
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::limit_orders::OrderKey"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u128, core::integer::u128, core::option::Option::<(core::integer::u64, core::integer::u128)>)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "swap_to_limit_order_price_and_maybe_mint_and_place_limit_order",
        inputs: [
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::limit_orders::OrderKey"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u128, core::integer::u128, core::option::Option::<(core::integer::u64, core::integer::u128)>)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "place_limit_order",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::limit_orders::OrderKey"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "maybe_mint_and_place_limit_order",
        inputs: [
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::limit_orders::OrderKey"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::option::Option::<(core::integer::u64, core::integer::u128)>"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "mint_and_place_limit_order",
        inputs: [
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::limit_orders::OrderKey"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u64, core::integer::u128)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "close_limit_order",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::limit_orders::OrderKey"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u128, core::integer::u128)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "close_limit_order_to",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64"
          },
          {
            name: "order_key",
            type: "ekubo::interfaces::extensions::limit_orders::OrderKey"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "(core::integer::u128, core::integer::u128)"
          }
        ],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "get_limit_orders_info",
        inputs: [
          {
            name: "params",
            type: "core::array::Span::<(core::integer::u64, ekubo::interfaces::extensions::limit_orders::OrderKey)>"
          }
        ],
        outputs: [
          {
            type: "core::array::Span::<ekubo::interfaces::extensions::limit_orders::GetOrderInfoResult>"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "impl",
    name: "Owned",
    interface_name: "ekubo::components::owned::IOwned"
  },
  {
    type: "interface",
    name: "ekubo::components::owned::IOwned",
    items: [
      {
        type: "function",
        name: "get_owner",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "transfer_ownership",
        inputs: [
          {
            name: "new_owner",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    type: "impl",
    name: "Upgradeable",
    interface_name: "ekubo::interfaces::upgradeable::IUpgradeable"
  },
  {
    type: "interface",
    name: "ekubo::interfaces::upgradeable::IUpgradeable",
    items: [
      {
        type: "function",
        name: "replace_class_hash",
        inputs: [
          {
            name: "class_hash",
            type: "core::starknet::class_hash::ClassHash"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    type: "impl",
    name: "Clear",
    interface_name: "ekubo::components::clear::IClear"
  },
  {
    type: "struct",
    name: "ekubo::interfaces::erc20::IERC20Dispatcher",
    members: [
      {
        name: "contract_address",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    type: "interface",
    name: "ekubo::components::clear::IClear",
    items: [
      {
        type: "function",
        name: "clear",
        inputs: [
          {
            name: "token",
            type: "ekubo::interfaces::erc20::IERC20Dispatcher"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "clear_minimum",
        inputs: [
          {
            name: "token",
            type: "ekubo::interfaces::erc20::IERC20Dispatcher"
          },
          {
            name: "minimum",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        type: "function",
        name: "clear_minimum_to_recipient",
        inputs: [
          {
            name: "token",
            type: "ekubo::interfaces::erc20::IERC20Dispatcher"
          },
          {
            name: "minimum",
            type: "core::integer::u256"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "impl",
    name: "Expires",
    interface_name: "ekubo::components::expires::IExpires"
  },
  {
    type: "interface",
    name: "ekubo::components::expires::IExpires",
    items: [
      {
        type: "function",
        name: "expires",
        inputs: [
          {
            name: "at",
            type: "core::integer::u64"
          }
        ],
        outputs: [],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "struct",
    name: "ekubo::interfaces::core::ICoreDispatcher",
    members: [
      {
        name: "contract_address",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    type: "constructor",
    name: "constructor",
    inputs: [
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "core",
        type: "ekubo::interfaces::core::ICoreDispatcher"
      },
      {
        name: "nft_class_hash",
        type: "core::starknet::class_hash::ClassHash"
      },
      {
        name: "token_uri_base",
        type: "core::felt252"
      }
    ]
  },
  {
    type: "event",
    name: "ekubo::components::upgradeable::Upgradeable::ClassHashReplaced",
    kind: "struct",
    members: [
      {
        name: "new_class_hash",
        type: "core::starknet::class_hash::ClassHash",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "ekubo::components::upgradeable::Upgradeable::Event",
    kind: "enum",
    variants: [
      {
        name: "ClassHashReplaced",
        type: "ekubo::components::upgradeable::Upgradeable::ClassHashReplaced",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "ekubo::components::owned::Owned::OwnershipTransferred",
    kind: "struct",
    members: [
      {
        name: "old_owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      },
      {
        name: "new_owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "ekubo::components::owned::Owned::Event",
    kind: "enum",
    variants: [
      {
        name: "OwnershipTransferred",
        type: "ekubo::components::owned::Owned::OwnershipTransferred",
        kind: "nested"
      }
    ]
  },
  {
    type: "event",
    name: "ekubo::positions::Positions::PositionMintedWithReferrer",
    kind: "struct",
    members: [
      {
        name: "id",
        type: "core::integer::u64",
        kind: "data"
      },
      {
        name: "referrer",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data"
      }
    ]
  },
  {
    type: "event",
    name: "ekubo::positions::Positions::Event",
    kind: "enum",
    variants: [
      {
        name: "UpgradeableEvent",
        type: "ekubo::components::upgradeable::Upgradeable::Event",
        kind: "flat"
      },
      {
        name: "OwnedEvent",
        type: "ekubo::components::owned::Owned::Event",
        kind: "nested"
      },
      {
        name: "PositionMintedWithReferrer",
        type: "ekubo::positions::Positions::PositionMintedWithReferrer",
        kind: "nested"
      }
    ]
  }
];

// src/data/ekubo-math.abi.json
var ekubo_math_abi_default = [
  {
    name: "MathLibImpl",
    type: "impl",
    interface_name: "ekubo::interfaces::mathlib::IMathLib"
  },
  {
    name: "core::integer::u256",
    type: "struct",
    members: [
      {
        name: "low",
        type: "core::integer::u128"
      },
      {
        name: "high",
        type: "core::integer::u128"
      }
    ]
  },
  {
    name: "core::bool",
    type: "enum",
    variants: [
      {
        name: "False",
        type: "()"
      },
      {
        name: "True",
        type: "()"
      }
    ]
  },
  {
    name: "ekubo::types::i129::i129",
    type: "struct",
    members: [
      {
        name: "mag",
        type: "core::integer::u128"
      },
      {
        name: "sign",
        type: "core::bool"
      }
    ]
  },
  {
    name: "ekubo::types::delta::Delta",
    type: "struct",
    members: [
      {
        name: "amount0",
        type: "ekubo::types::i129::i129"
      },
      {
        name: "amount1",
        type: "ekubo::types::i129::i129"
      }
    ]
  },
  {
    name: "core::option::Option::<core::integer::u256>",
    type: "enum",
    variants: [
      {
        name: "Some",
        type: "core::integer::u256"
      },
      {
        name: "None",
        type: "()"
      }
    ]
  },
  {
    name: "ekubo::interfaces::mathlib::IMathLib",
    type: "interface",
    items: [
      {
        name: "amount0_delta",
        type: "function",
        inputs: [
          {
            name: "sqrt_ratio_a",
            type: "core::integer::u256"
          },
          {
            name: "sqrt_ratio_b",
            type: "core::integer::u256"
          },
          {
            name: "liquidity",
            type: "core::integer::u128"
          },
          {
            name: "round_up",
            type: "core::bool"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "amount1_delta",
        type: "function",
        inputs: [
          {
            name: "sqrt_ratio_a",
            type: "core::integer::u256"
          },
          {
            name: "sqrt_ratio_b",
            type: "core::integer::u256"
          },
          {
            name: "liquidity",
            type: "core::integer::u128"
          },
          {
            name: "round_up",
            type: "core::bool"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "liquidity_delta_to_amount_delta",
        type: "function",
        inputs: [
          {
            name: "sqrt_ratio",
            type: "core::integer::u256"
          },
          {
            name: "liquidity_delta",
            type: "ekubo::types::i129::i129"
          },
          {
            name: "sqrt_ratio_lower",
            type: "core::integer::u256"
          },
          {
            name: "sqrt_ratio_upper",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "ekubo::types::delta::Delta"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "max_liquidity_for_token0",
        type: "function",
        inputs: [
          {
            name: "sqrt_ratio_lower",
            type: "core::integer::u256"
          },
          {
            name: "sqrt_ratio_upper",
            type: "core::integer::u256"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "max_liquidity_for_token1",
        type: "function",
        inputs: [
          {
            name: "sqrt_ratio_lower",
            type: "core::integer::u256"
          },
          {
            name: "sqrt_ratio_upper",
            type: "core::integer::u256"
          },
          {
            name: "amount",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "max_liquidity",
        type: "function",
        inputs: [
          {
            name: "sqrt_ratio",
            type: "core::integer::u256"
          },
          {
            name: "sqrt_ratio_lower",
            type: "core::integer::u256"
          },
          {
            name: "sqrt_ratio_upper",
            type: "core::integer::u256"
          },
          {
            name: "amount0",
            type: "core::integer::u128"
          },
          {
            name: "amount1",
            type: "core::integer::u128"
          }
        ],
        outputs: [
          {
            type: "core::integer::u128"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "next_sqrt_ratio_from_amount0",
        type: "function",
        inputs: [
          {
            name: "sqrt_ratio",
            type: "core::integer::u256"
          },
          {
            name: "liquidity",
            type: "core::integer::u128"
          },
          {
            name: "amount",
            type: "ekubo::types::i129::i129"
          }
        ],
        outputs: [
          {
            type: "core::option::Option::<core::integer::u256>"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "next_sqrt_ratio_from_amount1",
        type: "function",
        inputs: [
          {
            name: "sqrt_ratio",
            type: "core::integer::u256"
          },
          {
            name: "liquidity",
            type: "core::integer::u128"
          },
          {
            name: "amount",
            type: "ekubo::types::i129::i129"
          }
        ],
        outputs: [
          {
            type: "core::option::Option::<core::integer::u256>"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "tick_to_sqrt_ratio",
        type: "function",
        inputs: [
          {
            name: "tick",
            type: "ekubo::types::i129::i129"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "sqrt_ratio_to_tick",
        type: "function",
        inputs: [
          {
            name: "sqrt_ratio",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "ekubo::types::i129::i129"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    kind: "enum",
    name: "ekubo::mathlib::MathLib::Event",
    type: "event",
    variants: []
  }
];

// src/data/erc4626.abi.json
var erc4626_abi_default = [
  {
    name: "MyERC4626Impl",
    type: "impl",
    interface_name: "lst::lst::interface::IERC4626"
  },
  {
    name: "core::integer::u256",
    type: "struct",
    members: [
      {
        name: "low",
        type: "core::integer::u128"
      },
      {
        name: "high",
        type: "core::integer::u128"
      }
    ]
  },
  {
    name: "lst::lst::interface::IERC4626",
    type: "interface",
    items: [
      {
        name: "asset",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "total_assets",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "convert_to_shares",
        type: "function",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "convert_to_assets",
        type: "function",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "max_deposit",
        type: "function",
        inputs: [
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "preview_deposit",
        type: "function",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "deposit",
        type: "function",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "max_mint",
        type: "function",
        inputs: [
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "preview_mint",
        type: "function",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "mint",
        type: "function",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "max_withdraw",
        type: "function",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "preview_withdraw",
        type: "function",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "withdraw",
        type: "function",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "max_redeem",
        type: "function",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "preview_redeem",
        type: "function",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "redeem",
        type: "function",
        inputs: [
          {
            name: "shares",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "LSTAdditionalImpl",
    type: "impl",
    interface_name: "lst::lst::interface::ILSTAdditional"
  },
  {
    name: "core::byte_array::ByteArray",
    type: "struct",
    members: [
      {
        name: "data",
        type: "core::array::Array::<core::bytes_31::bytes31>"
      },
      {
        name: "pending_word",
        type: "core::felt252"
      },
      {
        name: "pending_word_len",
        type: "core::integer::u32"
      }
    ]
  },
  {
    name: "lst::withdrawal_queue::interface::IWithdrawalQueueDispatcher",
    type: "struct",
    members: [
      {
        name: "contract_address",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    name: "contracts::staking::interface::IStakingDispatcher",
    type: "struct",
    members: [
      {
        name: "contract_address",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    name: "lst::lst::interface::Config",
    type: "struct",
    members: [
      {
        name: "deposit_fee_bps",
        type: "core::integer::u256"
      },
      {
        name: "withdraw_fee_bps",
        type: "core::integer::u256"
      },
      {
        name: "rewards_fee_bps",
        type: "core::integer::u256"
      },
      {
        name: "treasury",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "withdraw_queue",
        type: "lst::withdrawal_queue::interface::IWithdrawalQueueDispatcher"
      },
      {
        name: "staker",
        type: "contracts::staking::interface::IStakingDispatcher"
      },
      {
        name: "validator",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    name: "core::bool",
    type: "enum",
    variants: [
      {
        name: "False",
        type: "()"
      },
      {
        name: "True",
        type: "()"
      }
    ]
  },
  {
    name: "lst::lst::interface::DelegatorInfo",
    type: "struct",
    members: [
      {
        name: "is_active",
        type: "core::bool"
      },
      {
        name: "delegator_index",
        type: "core::integer::u32"
      }
    ]
  },
  {
    name: "lst::lst::interface::ILSTAdditional",
    type: "interface",
    items: [
      {
        name: "initializer",
        type: "function",
        inputs: [
          {
            name: "calldata",
            type: "core::array::Array::<core::felt252>"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "deposit_with_referral",
        type: "function",
        inputs: [
          {
            name: "assets",
            type: "core::integer::u256"
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "referral",
            type: "core::byte_array::ByteArray"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "set_config",
        type: "function",
        inputs: [
          {
            name: "config",
            type: "lst::lst::interface::Config"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "get_config",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "lst::lst::interface::Config"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "stake",
        type: "function",
        inputs: [
          {
            name: "delegator",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "send_to_withdraw_queue",
        type: "function",
        inputs: [
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "before_unstake",
        type: "function",
        inputs: [
          {
            name: "new_amount",
            type: "core::integer::u256"
          },
          {
            name: "old_amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "add_delegator",
        type: "function",
        inputs: [
          {
            name: "delegator",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "update_delegator_info",
        type: "function",
        inputs: [
          {
            name: "delegator",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "info",
            type: "lst::lst::interface::DelegatorInfo"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "is_delegator",
        type: "function",
        inputs: [
          {
            name: "delegator",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "claim_rewards",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "CommonCompImpl",
    type: "impl",
    interface_name: "lst::utils::common::ICommon"
  },
  {
    name: "lst::utils::common::ICommon",
    type: "interface",
    items: [
      {
        name: "upgrade",
        type: "function",
        inputs: [
          {
            name: "new_class",
            type: "core::starknet::class_hash::ClassHash"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "pause",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "unpause",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "is_paused",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "owner",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "transfer_ownership",
        type: "function",
        inputs: [
          {
            name: "new_owner",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "renounce_ownership",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "AccessControlImpl",
    type: "impl",
    interface_name: "openzeppelin_access::accesscontrol::interface::IAccessControl"
  },
  {
    name: "openzeppelin_access::accesscontrol::interface::IAccessControl",
    type: "interface",
    items: [
      {
        name: "has_role",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          },
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_role_admin",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          }
        ],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "grant_role",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          },
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "revoke_role",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          },
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "renounce_role",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          },
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "ERC4626MetadataImpl",
    type: "impl",
    interface_name: "openzeppelin_token::erc20::interface::IERC20Metadata"
  },
  {
    name: "openzeppelin_token::erc20::interface::IERC20Metadata",
    type: "interface",
    items: [
      {
        name: "name",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::byte_array::ByteArray"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "symbol",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::byte_array::ByteArray"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "decimals",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u8"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    name: "ERC20Impl",
    type: "impl",
    interface_name: "openzeppelin_token::erc20::interface::IERC20"
  },
  {
    name: "openzeppelin_token::erc20::interface::IERC20",
    type: "interface",
    items: [
      {
        name: "total_supply",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "balance_of",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "allowance",
        type: "function",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "transfer",
        type: "function",
        inputs: [
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "transfer_from",
        type: "function",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "approve",
        type: "function",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "ERC20CamelOnlyImpl",
    type: "impl",
    interface_name: "openzeppelin_token::erc20::interface::IERC20CamelOnly"
  },
  {
    name: "openzeppelin_token::erc20::interface::IERC20CamelOnly",
    type: "interface",
    items: [
      {
        name: "totalSupply",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "balanceOf",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "transferFrom",
        type: "function",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "constructor",
    type: "constructor",
    inputs: [
      {
        name: "name",
        type: "core::byte_array::ByteArray"
      },
      {
        name: "symbol",
        type: "core::byte_array::ByteArray"
      },
      {
        name: "asset",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "config",
        type: "lst::lst::interface::Config"
      }
    ]
  },
  {
    kind: "struct",
    name: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Upgraded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "class_hash",
        type: "core::starknet::class_hash::ClassHash"
      }
    ]
  },
  {
    kind: "enum",
    name: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "Upgraded",
        type: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Upgraded"
      }
    ]
  },
  {
    kind: "struct",
    name: "openzeppelin_security::pausable::PausableComponent::Paused",
    type: "event",
    members: [
      {
        kind: "data",
        name: "account",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "openzeppelin_security::pausable::PausableComponent::Unpaused",
    type: "event",
    members: [
      {
        kind: "data",
        name: "account",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "enum",
    name: "openzeppelin_security::pausable::PausableComponent::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "Paused",
        type: "openzeppelin_security::pausable::PausableComponent::Paused"
      },
      {
        kind: "nested",
        name: "Unpaused",
        type: "openzeppelin_security::pausable::PausableComponent::Unpaused"
      }
    ]
  },
  {
    kind: "enum",
    name: "openzeppelin_security::reentrancyguard::ReentrancyGuardComponent::Event",
    type: "event",
    variants: []
  },
  {
    kind: "struct",
    name: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferred",
    type: "event",
    members: [
      {
        kind: "key",
        name: "previous_owner",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "key",
        name: "new_owner",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferStarted",
    type: "event",
    members: [
      {
        kind: "key",
        name: "previous_owner",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "key",
        name: "new_owner",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "enum",
    name: "openzeppelin_access::ownable::ownable::OwnableComponent::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "OwnershipTransferred",
        type: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferred"
      },
      {
        kind: "nested",
        name: "OwnershipTransferStarted",
        type: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferStarted"
      }
    ]
  },
  {
    kind: "enum",
    name: "lst::utils::common::CommonComp::Event",
    type: "event",
    variants: []
  },
  {
    kind: "struct",
    name: "lst::lst::erc4626::ERC4626Component::Deposit",
    type: "event",
    members: [
      {
        kind: "key",
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "key",
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "assets",
        type: "core::integer::u256"
      },
      {
        kind: "data",
        name: "shares",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "struct",
    name: "lst::lst::erc4626::ERC4626Component::Withdraw",
    type: "event",
    members: [
      {
        kind: "key",
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "key",
        name: "receiver",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "key",
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "assets",
        type: "core::integer::u256"
      },
      {
        kind: "data",
        name: "shares",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "enum",
    name: "lst::lst::erc4626::ERC4626Component::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "Deposit",
        type: "lst::lst::erc4626::ERC4626Component::Deposit"
      },
      {
        kind: "nested",
        name: "Withdraw",
        type: "lst::lst::erc4626::ERC4626Component::Withdraw"
      }
    ]
  },
  {
    kind: "struct",
    name: "openzeppelin_token::erc20::erc20::ERC20Component::Transfer",
    type: "event",
    members: [
      {
        kind: "key",
        name: "from",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "key",
        name: "to",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "value",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "struct",
    name: "openzeppelin_token::erc20::erc20::ERC20Component::Approval",
    type: "event",
    members: [
      {
        kind: "key",
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "key",
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "value",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "enum",
    name: "openzeppelin_token::erc20::erc20::ERC20Component::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "Transfer",
        type: "openzeppelin_token::erc20::erc20::ERC20Component::Transfer"
      },
      {
        kind: "nested",
        name: "Approval",
        type: "openzeppelin_token::erc20::erc20::ERC20Component::Approval"
      }
    ]
  },
  {
    kind: "enum",
    name: "lst::utils::access_control::MyAccessControlComp::Event",
    type: "event",
    variants: []
  },
  {
    kind: "struct",
    name: "openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleGranted",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleRevoked",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleAdminChanged",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "previous_admin_role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "new_admin_role",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "enum",
    name: "openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "RoleGranted",
        type: "openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleGranted"
      },
      {
        kind: "nested",
        name: "RoleRevoked",
        type: "openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleRevoked"
      },
      {
        kind: "nested",
        name: "RoleAdminChanged",
        type: "openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleAdminChanged"
      }
    ]
  },
  {
    kind: "enum",
    name: "openzeppelin_introspection::src5::SRC5Component::Event",
    type: "event",
    variants: []
  },
  {
    kind: "struct",
    name: "lst::lst::interface::DispatchToStake",
    type: "event",
    members: [
      {
        kind: "key",
        name: "delegator",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "amount",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "struct",
    name: "lst::lst::interface::DispatchToWithdrawQueue",
    type: "event",
    members: [
      {
        kind: "data",
        name: "amount",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "struct",
    name: "lst::lst::lst::LST::DelegatorUpdate",
    type: "event",
    members: [
      {
        kind: "key",
        name: "delegator",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "info",
        type: "lst::lst::interface::DelegatorInfo"
      }
    ]
  },
  {
    kind: "struct",
    name: "lst::lst::interface::Fee",
    type: "event",
    members: [
      {
        kind: "data",
        name: "amount",
        type: "core::integer::u256"
      },
      {
        kind: "key",
        name: "token",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "key",
        name: "receiver",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "lst::lst::lst::LST::Referral",
    type: "event",
    members: [
      {
        kind: "key",
        name: "referrer",
        type: "core::byte_array::ByteArray"
      },
      {
        kind: "key",
        name: "referee",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "assets",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "enum",
    name: "lst::lst::lst::LST::Event",
    type: "event",
    variants: [
      {
        kind: "flat",
        name: "UpgradeableEvent",
        type: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Event"
      },
      {
        kind: "flat",
        name: "PausableEvent",
        type: "openzeppelin_security::pausable::PausableComponent::Event"
      },
      {
        kind: "flat",
        name: "ReentrancyGuardEvent",
        type: "openzeppelin_security::reentrancyguard::ReentrancyGuardComponent::Event"
      },
      {
        kind: "flat",
        name: "OwnableEvent",
        type: "openzeppelin_access::ownable::ownable::OwnableComponent::Event"
      },
      {
        kind: "flat",
        name: "CommonCompEvent",
        type: "lst::utils::common::CommonComp::Event"
      },
      {
        kind: "flat",
        name: "ERC4626Event",
        type: "lst::lst::erc4626::ERC4626Component::Event"
      },
      {
        kind: "flat",
        name: "ERC20Event",
        type: "openzeppelin_token::erc20::erc20::ERC20Component::Event"
      },
      {
        kind: "flat",
        name: "MyAccessControlCompEvent",
        type: "lst::utils::access_control::MyAccessControlComp::Event"
      },
      {
        kind: "flat",
        name: "AccessControlComponentEvent",
        type: "openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::Event"
      },
      {
        kind: "flat",
        name: "SRC5Event",
        type: "openzeppelin_introspection::src5::SRC5Component::Event"
      },
      {
        kind: "nested",
        name: "DispatchToStake",
        type: "lst::lst::interface::DispatchToStake"
      },
      {
        kind: "nested",
        name: "DispatchToWithdrawQueue",
        type: "lst::lst::interface::DispatchToWithdrawQueue"
      },
      {
        kind: "nested",
        name: "DelegatorUpdate",
        type: "lst::lst::lst::LST::DelegatorUpdate"
      },
      {
        kind: "nested",
        name: "Fee",
        type: "lst::lst::interface::Fee"
      },
      {
        kind: "nested",
        name: "Referral",
        type: "lst::lst::lst::LST::Referral"
      }
    ]
  }
];

// src/strategies/ekubo-cl-vault.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var EkuboCLVault = class _EkuboCLVault extends BaseStrategy {
  /**
   * Creates a new VesuRebalance strategy instance.
   * @param config - Configuration object containing provider and other settings
   * @param pricer - Pricer instance for token price calculations
   * @param metadata - Strategy metadata including deposit tokens and address
   * @throws {Error} If more than one deposit token is specified
   */
  constructor(config, pricer, metadata) {
    super(config);
    this.BASE_WEIGHT = 1e4;
    this.pricer = pricer;
    assert(metadata.depositTokens.length === 2, "EkuboCL only supports 2 deposit token");
    this.metadata = metadata;
    this.address = metadata.address;
    this.contract = new Contract6(cl_vault_abi_default, this.address.address, this.config.provider);
    this.lstContract = new Contract6(erc4626_abi_default, this.metadata.additionalInfo.lstContract.address, this.config.provider);
    const EKUBO_POSITION = "0x02e0af29598b407c8716b17f6d2795eca1b471413fa03fb145a5e33722184067";
    this.ekuboPositionsContract = new Contract6(ekubo_positions_abi_default, EKUBO_POSITION, this.config.provider);
    const EKUBO_MATH = "0x04a72e9e166f6c0e9d800af4dc40f6b6fb4404b735d3f528d9250808b2481995";
    this.ekuboMathContract = new Contract6(ekubo_math_abi_default, EKUBO_MATH, this.config.provider);
    this.avnu = new AvnuWrapper();
  }
  async matchInputAmounts(amountInfo) {
    const bounds = await this.getCurrentBounds();
    const res = await this._getExpectedAmountsForLiquidity(
      amountInfo.token0.amount,
      amountInfo.token1.amount,
      bounds,
      false
    );
    return {
      token0: {
        tokenInfo: amountInfo.token0.tokenInfo,
        amount: res.amount0
      },
      token1: {
        tokenInfo: amountInfo.token1.tokenInfo,
        amount: res.amount1
      }
    };
  }
  /** Returns minimum amounts give given two amounts based on what can be added for liq */
  async getMinDepositAmounts(amountInfo) {
    const shares = await this.tokensToShares(amountInfo);
    const { amount0, amount1 } = await this.contract.call("convert_to_assets", [uint2564.bnToUint256(shares.toWei())]);
    return {
      token0: {
        tokenInfo: amountInfo.token0.tokenInfo,
        amount: Web3Number.fromWei(amount0.toString(), amountInfo.token0.tokenInfo.decimals)
      },
      token1: {
        tokenInfo: amountInfo.token1.tokenInfo,
        amount: Web3Number.fromWei(amount1.toString(), amountInfo.token1.tokenInfo.decimals)
      }
    };
  }
  async depositCall(amountInfo, receiver) {
    const updateAmountInfo = await this.getMinDepositAmounts(amountInfo);
    const token0Contract = new Contract6(erc4626_abi_default, amountInfo.token0.tokenInfo.address.address, this.config.provider);
    const token1Contract = new Contract6(erc4626_abi_default, amountInfo.token1.tokenInfo.address.address, this.config.provider);
    const call1 = token0Contract.populate("approve", [this.address.address, uint2564.bnToUint256(updateAmountInfo.token0.amount.toWei())]);
    const call2 = token1Contract.populate("approve", [this.address.address, uint2564.bnToUint256(updateAmountInfo.token1.amount.toWei())]);
    const call3 = this.contract.populate("deposit", [uint2564.bnToUint256(updateAmountInfo.token0.amount.toWei()), uint2564.bnToUint256(updateAmountInfo.token1.amount.toWei()), receiver.address]);
    const calls = [];
    if (updateAmountInfo.token0.amount.greaterThan(0)) calls.push(call1);
    if (updateAmountInfo.token1.amount.greaterThan(0)) calls.push(call2);
    return [...calls, call3];
  }
  async tokensToShares(amountInfo) {
    const shares = await this.contract.call("convert_to_shares", [
      uint2564.bnToUint256(amountInfo.token0.amount.toWei()),
      uint2564.bnToUint256(amountInfo.token1.amount.toWei())
    ]);
    return Web3Number.fromWei(shares.toString(), 18);
  }
  async withdrawCall(amountInfo, receiver, owner) {
    const shares = await this.tokensToShares(amountInfo);
    logger.verbose(`${_EkuboCLVault.name}: withdrawCall: shares=${shares.toString()}`);
    return [this.contract.populate("withdraw", [
      uint2564.bnToUint256(shares.toWei()),
      receiver.address
    ])];
  }
  rebalanceCall(newBounds, swapParams) {
    return [this.contract.populate("rebalance", [
      {
        lower: _EkuboCLVault.tickToi129(Number(newBounds.lowerTick)),
        upper: _EkuboCLVault.tickToi129(Number(newBounds.upperTick))
      },
      swapParams
    ])];
  }
  handleUnusedCall(swapParams) {
    return [this.contract.populate("handle_unused", [
      swapParams
    ])];
  }
  handleFeesCall() {
    return [this.contract.populate("handle_fees", [])];
  }
  /**
   * Calculates assets before and now in a given token of TVL per share to observe growth
   * @returns {Promise<number>} The weighted average APY across all pools
   */
  async netAPY(blockIdentifier = "pending", sinceBlocks = 2e4) {
    const tvlNow = await this._getTVL(blockIdentifier);
    const supplyNow = await this.totalSupply(blockIdentifier);
    const priceNow = await this.getCurrentPrice(blockIdentifier);
    let blockNow = typeof blockIdentifier == "number" ? blockIdentifier : (await this.config.provider.getBlockLatestAccepted()).block_number;
    const blockNowTime = typeof blockIdentifier == "number" ? (await this.config.provider.getBlockWithTxs(blockIdentifier)).timestamp : (/* @__PURE__ */ new Date()).getTime() / 1e3;
    const blockBefore = blockNow - sinceBlocks;
    const adjustedSupplyNow = supplyNow.minus(await this.getHarvestRewardShares(blockBefore, blockNow));
    let blockBeforeInfo = await this.config.provider.getBlockWithTxs(blockBefore);
    const tvlBefore = await this._getTVL(blockBefore);
    const supplyBefore = await this.totalSupply(blockBefore);
    const priceBefore = await this.getCurrentPrice(blockBefore);
    const tvlInToken0Now = tvlNow.amount0.multipliedBy(priceNow.price).plus(tvlNow.amount1);
    const tvlPerShareNow = tvlInToken0Now.multipliedBy(1e18).dividedBy(adjustedSupplyNow);
    const tvlInToken0Bf = tvlBefore.amount0.multipliedBy(priceBefore.price).plus(tvlBefore.amount1);
    const tvlPerShareBf = tvlInToken0Bf.multipliedBy(1e18).dividedBy(supplyBefore);
    const timeDiffSeconds = blockNowTime - blockBeforeInfo.timestamp;
    logger.verbose(`tvlInToken0Now: ${tvlInToken0Now.toString()}`);
    logger.verbose(`tvlInToken0Bf: ${tvlInToken0Bf.toString()}`);
    logger.verbose(`tvlPerShareNow: ${tvlPerShareNow.toString()}`);
    logger.verbose(`tvlPerShareBf: ${tvlPerShareBf.toString()}`);
    logger.verbose(`Price before: ${priceBefore.price.toString()}`);
    logger.verbose(`Price now: ${priceNow.price.toString()}`);
    logger.verbose(`Supply before: ${supplyBefore.toString()}`);
    logger.verbose(`Supply now: ${adjustedSupplyNow.toString()}`);
    logger.verbose(`Time diff in seconds: ${timeDiffSeconds}`);
    const apyForGivenBlocks = Number(tvlPerShareNow.minus(tvlPerShareBf).multipliedBy(1e4).dividedBy(tvlPerShareBf)) / 1e4;
    return apyForGivenBlocks * (365 * 24 * 3600) / timeDiffSeconds;
  }
  async getHarvestRewardShares(fromBlock, toBlock) {
    const len = Number(await this.contract.call("get_total_rewards"));
    let shares = Web3Number.fromWei(0, 18);
    for (let i = len - 1; i > 0; --i) {
      let record = await this.contract.call("get_rewards_info", [i]);
      logger.verbose(`${_EkuboCLVault.name}: getHarvestRewardShares: ${i}`);
      console.log(record);
      const block = Number(record.block_number);
      if (block < fromBlock) {
        return shares;
      } else if (block > toBlock) {
        continue;
      } else {
        shares = shares.plus(Web3Number.fromWei(record.shares.toString(), 18));
      }
      logger.verbose(`${_EkuboCLVault.name}: getHarvestRewardShares: ${i} => ${shares.toWei()}`);
    }
    return shares;
  }
  async balanceOf(user, blockIdentifier = "pending") {
    let bal = await this.contract.call("balance_of", [user.address]);
    return Web3Number.fromWei(bal.toString(), 18);
  }
  async getUserTVL(user, blockIdentifier = "pending") {
    let bal = await this.balanceOf(user, blockIdentifier);
    const assets = await this.contract.call("convert_to_assets", [uint2564.bnToUint256(bal.toWei())], {
      blockIdentifier
    });
    const poolKey = await this.getPoolKey(blockIdentifier);
    this.assertValidDepositTokens(poolKey);
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const amount0 = Web3Number.fromWei(assets.amount0.toString(), token0Info.decimals);
    const amount1 = Web3Number.fromWei(assets.amount1.toString(), token1Info.decimals);
    const P0 = await this.pricer.getPrice(token0Info.symbol);
    const P1 = await this.pricer.getPrice(token1Info.symbol);
    const token0Usd = Number(amount0.toFixed(13)) * P0.price;
    const token1Usd = Number(amount1.toFixed(13)) * P1.price;
    return {
      usdValue: token0Usd + token1Usd,
      token0: {
        tokenInfo: token0Info,
        amount: amount0,
        usdValue: token0Usd
      },
      token1: {
        tokenInfo: token1Info,
        amount: amount1,
        usdValue: token1Usd
      }
    };
  }
  async _getTVL(blockIdentifier = "pending") {
    const result = await this.contract.call("total_liquidity", [], {
      blockIdentifier
    });
    const bounds = await this.getCurrentBounds(blockIdentifier);
    const { amount0, amount1 } = await this.getLiquidityToAmounts(Web3Number.fromWei(result.toString(), 18), bounds, blockIdentifier);
    return { amount0, amount1 };
  }
  async totalSupply(blockIdentifier = "pending") {
    const res = await this.contract.call("total_supply", [], {
      blockIdentifier
    });
    return Web3Number.fromWei(res.toString(), 18);
  }
  assertValidDepositTokens(poolKey) {
    assert(poolKey.token0.eq(this.metadata.depositTokens[0].address), "Expected token0 in depositTokens[0]");
    assert(poolKey.token1.eq(this.metadata.depositTokens[1].address), "Expected token1 in depositTokens[1]");
  }
  async getTVL(blockIdentifier = "pending") {
    const { amount0, amount1 } = await this._getTVL(blockIdentifier);
    const poolKey = await this.getPoolKey(blockIdentifier);
    this.assertValidDepositTokens(poolKey);
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const P0 = await this.pricer.getPrice(token0Info.symbol);
    const P1 = await this.pricer.getPrice(token1Info.symbol);
    const token0Usd = Number(amount0.toFixed(13)) * P0.price;
    const token1Usd = Number(amount1.toFixed(13)) * P1.price;
    return {
      usdValue: token0Usd + token1Usd,
      token0: {
        tokenInfo: token0Info,
        amount: amount0,
        usdValue: token0Usd
      },
      token1: {
        tokenInfo: token1Info,
        amount: amount1,
        usdValue: token1Usd
      }
    };
  }
  async getUncollectedFees() {
    const nftID = await this.getCurrentNFTID();
    const poolKey = await this.getPoolKey();
    const currentBounds = await this.getCurrentBounds();
    const result = await this.ekuboPositionsContract.call("get_token_info", [
      nftID,
      {
        token0: poolKey.token0.address,
        token1: poolKey.token1.address,
        fee: poolKey.fee,
        tick_spacing: poolKey.tick_spacing,
        extension: poolKey.extension
      },
      {
        lower: _EkuboCLVault.tickToi129(Number(currentBounds.lowerTick)),
        upper: _EkuboCLVault.tickToi129(Number(currentBounds.upperTick))
      }
    ]);
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const P0 = await this.pricer.getPrice(token0Info.symbol);
    const P1 = await this.pricer.getPrice(token1Info.symbol);
    const token0Web3 = Web3Number.fromWei(result.fees0.toString(), token0Info.decimals);
    const token1Web3 = Web3Number.fromWei(result.fees1.toString(), token1Info.decimals);
    const token0Usd = Number(token0Web3.toFixed(13)) * P0.price;
    const token1Usd = Number(token1Web3.toFixed(13)) * P1.price;
    return {
      usdValue: token0Usd + token1Usd,
      token0: {
        tokenInfo: token0Info,
        amount: token0Web3,
        usdValue: token0Usd
      },
      token1: {
        tokenInfo: token1Info,
        amount: token1Web3,
        usdValue: token1Usd
      }
    };
  }
  async getCurrentNFTID() {
    const result = await this.contract.call("get_position_key", []);
    return Number(result.salt.toString());
  }
  async truePrice() {
    const result = await this.lstContract.call("convert_to_assets", [uint2564.bnToUint256(BigInt(1e18).toString())]);
    const truePrice = Number(BigInt(result.toString()) * BigInt(1e9) / BigInt(1e18)) / 1e9;
    return truePrice;
  }
  async getCurrentPrice(blockIdentifier = "pending") {
    const poolKey = await this.getPoolKey(blockIdentifier);
    return this._getCurrentPrice(poolKey, blockIdentifier);
  }
  async _getCurrentPrice(poolKey, blockIdentifier = "pending") {
    const priceInfo = await this.ekuboPositionsContract.call("get_pool_price", [
      {
        token0: poolKey.token0.address,
        token1: poolKey.token1.address,
        fee: poolKey.fee,
        tick_spacing: poolKey.tick_spacing,
        extension: poolKey.extension
      }
    ], {
      blockIdentifier
    });
    const sqrtRatio = _EkuboCLVault.div2Power128(BigInt(priceInfo.sqrt_ratio.toString()));
    console.log(`EkuboCLVault: getCurrentPrice: blockIdentifier: ${blockIdentifier}, sqrtRatio: ${sqrtRatio}, ${priceInfo.sqrt_ratio.toString()}`);
    const price = sqrtRatio * sqrtRatio;
    const tick = _EkuboCLVault.priceToTick(price, true, Number(poolKey.tick_spacing));
    console.log(`EkuboCLVault: getCurrentPrice: blockIdentifier: ${blockIdentifier}, price: ${price}, tick: ${tick.mag}, ${tick.sign}`);
    return {
      price,
      tick: tick.mag * (tick.sign == 0 ? 1 : -1),
      sqrtRatio: priceInfo.sqrt_ratio.toString()
    };
  }
  async getCurrentBounds(blockIdentifier = "pending") {
    const result = await this.contract.call("get_position_key", [], {
      blockIdentifier
    });
    return {
      lowerTick: _EkuboCLVault.i129ToNumber(result.bounds.lower),
      upperTick: _EkuboCLVault.i129ToNumber(result.bounds.upper)
    };
  }
  static div2Power128(num5) {
    return Number(BigInt(num5.toString()) * 1000000n / BigInt(2 ** 128)) / 1e6;
  }
  static priceToTick(price, isRoundDown, tickSpacing) {
    const value = isRoundDown ? Math.floor(Math.log(price) / Math.log(1.000001)) : Math.ceil(Math.log(price) / Math.log(1.000001));
    const tick = Math.floor(value / tickSpacing) * tickSpacing;
    return this.tickToi129(tick);
  }
  async getPoolKey(blockIdentifier = "pending") {
    if (this.poolKey) {
      return this.poolKey;
    }
    const result = await this.contract.call("get_settings", [], {
      blockIdentifier
    });
    const poolKey = {
      token0: ContractAddr.from(result.pool_key.token0.toString()),
      token1: ContractAddr.from(result.pool_key.token1.toString()),
      fee: result.pool_key.fee.toString(),
      tick_spacing: result.pool_key.tick_spacing.toString(),
      extension: result.pool_key.extension.toString()
    };
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    assert(token0Info.decimals == token1Info.decimals, "Tested only for equal decimals");
    this.poolKey = poolKey;
    return poolKey;
  }
  async getNewBounds() {
    const poolKey = await this.getPoolKey();
    const currentPrice = await this._getCurrentPrice(poolKey);
    const newLower = currentPrice.tick + Number(this.metadata.additionalInfo.newBounds.lower) * Number(poolKey.tick_spacing);
    const newUpper = currentPrice.tick + Number(this.metadata.additionalInfo.newBounds.upper) * Number(poolKey.tick_spacing);
    return {
      lowerTick: BigInt(newLower),
      upperTick: BigInt(newUpper)
    };
  }
  /**
   * Computes the expected amounts to fully utilize amount in
   * to add liquidity to the pool
   * @param amount0: amount of token0
   * @param amount1: amount of token1
   * @returns {amount0, amount1}
   */
  async _getExpectedAmountsForLiquidity(amount0, amount1, bounds, justUseInputAmount = true) {
    assert(amount0.greaterThan(0) || amount1.greaterThan(0), "Amount is 0");
    const sampleLiq = 1e20;
    const { amount0: sampleAmount0, amount1: sampleAmount1 } = await this.getLiquidityToAmounts(Web3Number.fromWei(sampleLiq.toString(), 18), bounds);
    logger.verbose(`${_EkuboCLVault.name}: _getExpectedAmountsForLiquidity => sampleAmount0: ${sampleAmount0.toString()}, sampleAmount1: ${sampleAmount1.toString()}`);
    assert(!sampleAmount0.eq(0) || !sampleAmount1.eq(0), "Sample amount is 0");
    const price = await (await this.getCurrentPrice()).price;
    logger.verbose(`${_EkuboCLVault.name}: _getExpectedAmountsForLiquidity => price: ${price}`);
    if (amount1.eq(0) && amount0.greaterThan(0)) {
      if (sampleAmount1.eq(0)) {
        return {
          amount0,
          amount1: Web3Number.fromWei("0", amount1.decimals),
          ratio: Infinity
        };
      } else if (sampleAmount0.eq(0)) {
        return {
          amount0: Web3Number.fromWei("0", amount0.decimals),
          amount1: amount0.multipliedBy(price),
          ratio: 0
        };
      }
    } else if (amount0.eq(0) && amount1.greaterThan(0)) {
      if (sampleAmount0.eq(0)) {
        return {
          amount0: Web3Number.fromWei("0", amount0.decimals),
          amount1,
          ratio: 0
        };
      } else if (sampleAmount1.eq(0)) {
        return {
          amount0: amount1.dividedBy(price),
          amount1: Web3Number.fromWei("0", amount1.decimals),
          ratio: Infinity
        };
      }
    }
    assert(sampleAmount0.decimals == sampleAmount1.decimals, "Sample amounts have different decimals");
    const ratioWeb3Number = sampleAmount0.multipliedBy(1e18).dividedBy(sampleAmount1.toString()).dividedBy(1e18);
    const ratio = Number(ratioWeb3Number.toFixed(18));
    logger.verbose(`${_EkuboCLVault.name}: ${this.metadata.name} => ratio: ${ratio.toString()}`);
    if (justUseInputAmount)
      return this._solveExpectedAmountsEq(amount0, amount1, ratioWeb3Number, price);
    if (amount1.eq(0) && amount0.greaterThan(0)) {
      const _amount1 = amount0.dividedBy(ratioWeb3Number);
      return {
        amount0,
        amount1: _amount1,
        ratio
      };
    } else if (amount0.eq(0) && amount1.greaterThan(0)) {
      const _amount0 = amount1.multipliedBy(ratio);
      return {
        amount0: _amount0,
        amount1,
        ratio
      };
    } else {
      throw new Error("Both amounts are non-zero, cannot compute expected amounts");
    }
  }
  _solveExpectedAmountsEq(availableAmount0, availableAmount1, ratio, price) {
    const y = ratio.multipliedBy(availableAmount1).minus(availableAmount0).dividedBy(ratio.plus(1 / price));
    const x = y.dividedBy(price);
    return {
      amount0: availableAmount0.plus(x),
      amount1: availableAmount1.minus(y),
      ratio: Number(ratio.toString())
    };
  }
  async getSwapInfoToHandleUnused(considerRebalance = true) {
    const poolKey = await this.getPoolKey();
    const erc20Mod = new ERC20(this.config);
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const token0Bal1 = await erc20Mod.balanceOf(poolKey.token0, this.address.address, token0Info.decimals);
    const token1Bal1 = await erc20Mod.balanceOf(poolKey.token1, this.address.address, token1Info.decimals);
    logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => token0Bal1: ${token0Bal1.toString()}, token1Bal1: ${token1Bal1.toString()}`);
    const token0Price = await this.pricer.getPrice(token0Info.symbol);
    const token1Price = await this.pricer.getPrice(token1Info.symbol);
    const token0PriceUsd = token0Price.price * Number(token0Bal1.toFixed(13));
    const token1PriceUsd = token1Price.price * Number(token1Bal1.toFixed(13));
    if (token0PriceUsd > 1 && token1PriceUsd > 1) {
      throw new Error("Both tokens are non-zero and above $1, call handle_fees first");
    }
    let token0Bal = token0Bal1;
    let token1Bal = token1Bal1;
    if (considerRebalance) {
      logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => considerRebalance: true`);
      const tvl = await this.getTVL();
      token0Bal = token0Bal.plus(tvl.token0.amount.toString());
      token1Bal = token1Bal.plus(tvl.token1.amount.toString());
    } else {
      logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => considerRebalance: false`);
    }
    logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => token0Bal: ${token0Bal.toString()}, token1Bal: ${token1Bal.toString()}`);
    const newBounds = await this.getNewBounds();
    logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => newBounds: ${newBounds.lowerTick}, ${newBounds.upperTick}`);
    return await this.getSwapInfoGivenAmounts(poolKey, token0Bal, token1Bal, newBounds);
  }
  async getSwapInfoGivenAmounts(poolKey, token0Bal, token1Bal, bounds) {
    let expectedAmounts = await this._getExpectedAmountsForLiquidity(token0Bal, token1Bal, bounds);
    logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => expectedAmounts: ${expectedAmounts.amount0.toString()}, ${expectedAmounts.amount1.toString()}`);
    let retry = 0;
    const maxRetry = 10;
    while (retry < maxRetry) {
      retry++;
      if (expectedAmounts.amount0.lessThan(token0Bal) && expectedAmounts.amount1.lessThan(token1Bal)) {
        throw new Error("Both tokens are decreased, something is wrong");
      }
      if (expectedAmounts.amount0.greaterThan(token0Bal) && expectedAmounts.amount1.greaterThan(token1Bal)) {
        throw new Error("Both tokens are increased, something is wrong");
      }
      const tokenToSell = expectedAmounts.amount0.lessThan(token0Bal) ? poolKey.token0 : poolKey.token1;
      const tokenToBuy = tokenToSell == poolKey.token0 ? poolKey.token1 : poolKey.token0;
      let amountToSell = tokenToSell == poolKey.token0 ? token0Bal.minus(expectedAmounts.amount0) : token1Bal.minus(expectedAmounts.amount1);
      const remainingSellAmount = tokenToSell == poolKey.token0 ? expectedAmounts.amount0 : expectedAmounts.amount1;
      const tokenToBuyInfo = await Global.getTokenInfoFromAddr(tokenToBuy);
      const expectedRatio = expectedAmounts.ratio;
      logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => tokenToSell: ${tokenToSell.address}, tokenToBuy: ${tokenToBuy.address}, amountToSell: ${amountToSell.toWei()}`);
      logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => remainingSellAmount: ${remainingSellAmount.toString()}`);
      logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => expectedRatio: ${expectedRatio}`);
      if (amountToSell.eq(0)) {
        return {
          token_from_address: tokenToSell.address,
          token_from_amount: uint2564.bnToUint256(0),
          token_to_address: tokenToSell.address,
          token_to_amount: uint2564.bnToUint256(0),
          token_to_min_amount: uint2564.bnToUint256(0),
          beneficiary: this.address.address,
          integrator_fee_amount_bps: 0,
          integrator_fee_recipient: this.address.address,
          routes: []
        };
      }
      const quote = await this.avnu.getQuotes(tokenToSell.address, tokenToBuy.address, amountToSell.toWei(), this.address.address);
      if (remainingSellAmount.eq(0)) {
        const minAmountOut = Web3Number.fromWei(quote.buyAmount.toString(), tokenToBuyInfo.decimals).multipliedBy(0.9999);
        return await this.avnu.getSwapInfo(quote, this.address.address, 0, this.address.address, minAmountOut.toWei());
      }
      const amountOut = Web3Number.fromWei(quote.buyAmount.toString(), tokenToBuyInfo.decimals);
      const swapPrice = tokenToSell == poolKey.token0 ? amountOut.dividedBy(amountToSell) : amountToSell.dividedBy(amountOut);
      const newRatio = tokenToSell == poolKey.token0 ? remainingSellAmount.dividedBy(token1Bal.plus(amountOut)) : token0Bal.plus(amountOut).dividedBy(remainingSellAmount);
      logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => amountOut: ${amountOut.toString()}`);
      logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => swapPrice: ${swapPrice.toString()}`);
      logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => newRatio: ${newRatio.toString()}`);
      if (Number(newRatio.toString()) > expectedRatio * 1.0000001 || Number(newRatio.toString()) < expectedRatio * 0.9999999) {
        expectedAmounts = await this._solveExpectedAmountsEq(token0Bal, token1Bal, new Web3Number(Number(expectedRatio).toFixed(13), 18), Number(swapPrice.toString()));
        logger.verbose(`${_EkuboCLVault.name}: getSwapInfoToHandleUnused => expectedAmounts: ${expectedAmounts.amount0.toString()}, ${expectedAmounts.amount1.toString()}`);
      } else {
        const minAmountOut = Web3Number.fromWei(quote.buyAmount.toString(), tokenToBuyInfo.decimals).multipliedBy(0.9999);
        return await this.avnu.getSwapInfo(quote, this.address.address, 0, this.address.address, minAmountOut.toWei());
      }
      retry++;
    }
    throw new Error("Failed to get swap info");
  }
  /**
   * Attempts to rebalance the vault by iteratively adjusting swap amounts if initial attempt fails.
   * Uses binary search approach to find optimal swap amount.
   * 
   * @param newBounds - The new tick bounds to rebalance to 
   * @param swapInfo - Initial swap parameters for rebalancing
   * @param acc - Account to estimate gas fees with
   * @param retry - Current retry attempt number (default 0)
   * @param adjustmentFactor - Percentage to adjust swap amount by (default 1)
   * @param isToken0Deficit - Whether token0 balance needs increasing (default true)
   * @returns Array of contract calls needed for rebalancing
   * @throws Error if max retries reached without successful rebalance
   */
  async rebalanceIter(swapInfo, acc, estimateCall, isSellTokenToken0 = true, retry = 0, lowerLimit = 0n, upperLimit = 0n) {
    const MAX_RETRIES = 40;
    logger.verbose(
      `Rebalancing ${this.metadata.name}: retry=${retry}, lowerLimit=${lowerLimit}, upperLimit=${upperLimit}, isSellTokenToken0=${isSellTokenToken0}`
    );
    const fromAmount = uint2564.uint256ToBN(swapInfo.token_from_amount);
    logger.verbose(
      `Selling ${fromAmount.toString()} of token ${swapInfo.token_from_address}`
    );
    try {
      const calls = await estimateCall(swapInfo);
      await acc.estimateInvokeFee(calls);
      return calls;
    } catch (err) {
      if (retry >= MAX_RETRIES) {
        logger.error(`Rebalance failed after ${MAX_RETRIES} retries`);
        throw err;
      }
      logger.error(`Rebalance attempt ${retry + 1} failed, adjusting swap amount...`);
      const newSwapInfo = { ...swapInfo };
      const currentAmount = Web3Number.fromWei(fromAmount.toString(), 18);
      logger.verbose(`Current amount: ${currentAmount.toString()}`);
      if (err.message.includes("invalid token0 balance") || err.message.includes("invalid token0 amount")) {
        if (!isSellTokenToken0) {
          logger.verbose("Reducing swap amount - excess token0");
          let nextAmount = (fromAmount + lowerLimit) / 2n;
          upperLimit = fromAmount;
          if (nextAmount <= lowerLimit) {
            logger.error("Convergence failed: nextAmount <= lowerLimit");
            throw err;
          }
          newSwapInfo.token_from_amount = uint2564.bnToUint256(nextAmount);
        } else {
          logger.verbose("Increasing swap amount - deficit token0");
          let nextAmount = (fromAmount + upperLimit) / 2n;
          if (upperLimit == 0n) {
            nextAmount = fromAmount * 2n;
          }
          lowerLimit = fromAmount;
          if (upperLimit != 0n && nextAmount >= upperLimit) {
            logger.error("Convergence failed: nextAmount >= upperLimit");
            throw err;
          }
          newSwapInfo.token_from_amount = uint2564.bnToUint256(nextAmount);
        }
      } else if (err.message.includes("invalid token1 amount") || err.message.includes("invalid token1 balance")) {
        if (isSellTokenToken0) {
          logger.verbose("Reducing swap amount - excess token1");
          let nextAmount = (fromAmount + lowerLimit) / 2n;
          upperLimit = fromAmount;
          if (nextAmount <= lowerLimit) {
            logger.error("Convergence failed: nextAmount <= lowerLimit");
            throw err;
          }
          newSwapInfo.token_from_amount = uint2564.bnToUint256(nextAmount);
        } else {
          logger.verbose("Increasing swap amount - deficit token1");
          let nextAmount = (fromAmount + upperLimit) / 2n;
          if (upperLimit == 0n) {
            nextAmount = fromAmount * 2n;
          }
          lowerLimit = fromAmount;
          if (upperLimit != 0n && nextAmount >= upperLimit) {
            logger.error("Convergence failed: nextAmount >= upperLimit");
            throw err;
          }
          newSwapInfo.token_from_amount = uint2564.bnToUint256(nextAmount);
        }
      } else {
        logger.error("Unexpected error:", err);
        throw err;
      }
      newSwapInfo.token_to_min_amount = uint2564.bnToUint256("0");
      return this.rebalanceIter(
        newSwapInfo,
        acc,
        estimateCall,
        isSellTokenToken0,
        retry + 1,
        lowerLimit,
        upperLimit
      );
    }
  }
  static tickToi129(tick) {
    if (tick < 0) {
      return {
        mag: -tick,
        sign: 1
      };
    } else {
      return {
        mag: tick,
        sign: 0
      };
    }
  }
  static priceToSqrtRatio(price) {
    return BigInt(Math.floor(Math.sqrt(price) * 10 ** 9)) * BigInt(2 ** 128) / BigInt(1e9);
  }
  static i129ToNumber(i129) {
    return i129.mag * (i129.sign.toString() == "false" ? 1n : -1n);
  }
  static tickToPrice(tick) {
    return Math.pow(1.000001, Number(tick));
  }
  async getLiquidityToAmounts(liquidity, bounds, blockIdentifier = "pending", _poolKey = null, _currentPrice = null) {
    const currentPrice = _currentPrice || await this.getCurrentPrice(blockIdentifier);
    const lowerPrice = _EkuboCLVault.tickToPrice(bounds.lowerTick);
    const upperPrice = _EkuboCLVault.tickToPrice(bounds.upperTick);
    logger.verbose(`${_EkuboCLVault.name}: getLiquidityToAmounts => currentPrice: ${currentPrice.price}, lowerPrice: ${lowerPrice}, upperPrice: ${upperPrice}`);
    const result = await this.ekuboMathContract.call("liquidity_delta_to_amount_delta", [
      uint2564.bnToUint256(currentPrice.sqrtRatio),
      {
        mag: liquidity.toWei(),
        sign: 0
      },
      uint2564.bnToUint256(_EkuboCLVault.priceToSqrtRatio(lowerPrice).toString()),
      uint2564.bnToUint256(_EkuboCLVault.priceToSqrtRatio(upperPrice).toString())
    ], {
      blockIdentifier
    });
    const poolKey = _poolKey || await this.getPoolKey(blockIdentifier);
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const amount0 = Web3Number.fromWei(_EkuboCLVault.i129ToNumber(result.amount0).toString(), token0Info.decimals);
    const amount1 = Web3Number.fromWei(_EkuboCLVault.i129ToNumber(result.amount1).toString(), token1Info.decimals);
    return {
      amount0,
      amount1
    };
  }
  async harvest(acc) {
    const ekuboHarvests = new EkuboHarvests(this.config);
    const unClaimedRewards = await ekuboHarvests.getUnHarvestedRewards(this.address);
    const poolKey = await this.getPoolKey();
    const token0Info = await Global.getTokenInfoFromAddr(poolKey.token0);
    const token1Info = await Global.getTokenInfoFromAddr(poolKey.token1);
    const bounds = await this.getCurrentBounds();
    const calls = [];
    for (let claim of unClaimedRewards) {
      const fee = claim.claim.amount.multipliedBy(this.metadata.additionalInfo.feeBps).dividedBy(1e4);
      const postFeeAmount = claim.claim.amount.minus(fee);
      const isToken1 = claim.token.eq(poolKey.token1);
      logger.verbose(`${_EkuboCLVault.name}: harvest => Processing claim, isToken1: ${isToken1} amount: ${postFeeAmount.toWei()}`);
      const token0Amt = isToken1 ? new Web3Number(0, token0Info.decimals) : postFeeAmount;
      const token1Amt = isToken1 ? postFeeAmount : new Web3Number(0, token0Info.decimals);
      logger.verbose(`${_EkuboCLVault.name}: harvest => token0Amt: ${token0Amt.toString()}, token1Amt: ${token1Amt.toString()}`);
      const swapInfo = await this.getSwapInfoGivenAmounts(poolKey, token0Amt, token1Amt, bounds);
      swapInfo.token_to_address = token0Info.address.address;
      logger.verbose(`${_EkuboCLVault.name}: harvest => swapInfo: ${JSON.stringify(swapInfo)}`);
      logger.verbose(`${_EkuboCLVault.name}: harvest => claim: ${JSON.stringify(claim)}`);
      const harvestEstimateCall = async (swapInfo1) => {
        const swap1Amount = Web3Number.fromWei(uint2564.uint256ToBN(swapInfo1.token_from_amount).toString(), 18);
        const remainingAmount = postFeeAmount.minus(swap1Amount);
        const swapInfo2 = { ...swapInfo, token_from_amount: uint2564.bnToUint256(remainingAmount.toWei()) };
        swapInfo2.token_to_address = token1Info.address.address;
        const calldata = [
          claim.rewardsContract.address,
          {
            id: claim.claim.id,
            amount: claim.claim.amount.toWei(),
            claimee: claim.claim.claimee.address
          },
          claim.proof.map((p) => num4.getDecimalString(p)),
          swapInfo,
          swapInfo2
        ];
        logger.verbose(`${_EkuboCLVault.name}: harvest => calldata: ${JSON.stringify(calldata)}`);
        return [this.contract.populate("harvest", calldata)];
      };
      const _callsFinal = await this.rebalanceIter(swapInfo, acc, harvestEstimateCall);
      logger.verbose(`${_EkuboCLVault.name}: harvest => _callsFinal: ${JSON.stringify(_callsFinal)}`);
      calls.push(..._callsFinal);
    }
    return calls;
  }
  async getInvestmentFlows() {
    const netYield = await this.netAPY();
    const poolKey = await this.getPoolKey();
    const linkedFlow = {
      title: this.metadata.name,
      subItems: [{ key: "Pool", value: `${(_EkuboCLVault.div2Power128(BigInt(poolKey.fee)) * 100).toFixed(2)}%, ${poolKey.tick_spacing} tick spacing` }],
      linkedFlows: [],
      style: { backgroundColor: "#35484f" /* Blue */.valueOf() }
    };
    const baseFlow = {
      id: "base",
      title: "Your Deposit",
      subItems: [{ key: `Net yield`, value: `${(netYield * 100).toFixed(2)}%` }, { key: `Performance Fee`, value: `${(this.metadata.additionalInfo.feeBps / 100).toFixed(2)}%` }],
      linkedFlows: [linkedFlow],
      style: { backgroundColor: "#6e53dc" /* Purple */.valueOf() }
    };
    const rebalanceFlow = {
      id: "rebalance",
      title: "Automated Rebalance",
      subItems: [{
        key: "Range selection",
        value: `${this.metadata.additionalInfo.newBounds.lower * Number(poolKey.tick_spacing)} to ${this.metadata.additionalInfo.newBounds.upper * Number(poolKey.tick_spacing)} ticks`
      }],
      linkedFlows: [linkedFlow],
      style: { backgroundColor: "purple" /* Green */.valueOf() }
    };
    return [baseFlow, rebalanceFlow];
  }
};
var _description2 = "Deploys your {{POOL_NAME}} into an Ekubo liquidity pool, automatically rebalancing positions around the current price to optimize yield and reduce the need for manual adjustments. Trading fees and DeFi Spring rewards are automatically compounded back into the strategy. In return, you receive an ERC-20 token representing your share of the strategy. The APY is calculated based on 7-day historical performance.";
var _protocol2 = { name: "Ekubo", logo: "https://app.ekubo.org/favicon.ico" };
var _riskFactor2 = [
  { type: "Smart Contract Risk" /* SMART_CONTRACT_RISK */, value: 0.5, weight: 25 },
  { type: "Impermanent Loss Risk" /* IMPERMANENT_LOSS */, value: 1, weight: 75 }
];
var AUDIT_URL2 = "https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf";
var EkuboCLVaultStrategies = [{
  name: "Ekubo xSTRK/STRK",
  description: /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("p", { children: _description2.replace("{{POOL_NAME}}", "xSTRK/STRK") }),
    /* @__PURE__ */ jsxs("ul", { style: { marginLeft: "20px", listStyle: "circle", fontSize: "12px" }, children: [
      /* @__PURE__ */ jsx("li", { style: { marginTop: "10px" }, children: "During withdrawal, you may receive either or both tokens depending on market conditions and prevailing prices." }),
      /* @__PURE__ */ jsx("li", { style: { marginTop: "10px" }, children: "Sometimes you might see a negative APY \u2014 this is usually not a big deal. It happens when xSTRK's price drops on DEXes, but things typically bounce back within a few days or a week." })
    ] })
  ] }),
  address: ContractAddr.from("0x01f083b98674bc21effee29ef443a00c7b9a500fd92cf30341a3da12c73f2324"),
  type: "Other",
  // must be same order as poolKey token0 and token1
  depositTokens: [Global.getDefaultTokens().find((t) => t.symbol === "xSTRK"), Global.getDefaultTokens().find((t) => t.symbol === "STRK")],
  protocols: [_protocol2],
  auditUrl: AUDIT_URL2,
  maxTVL: Web3Number.fromWei("0", 18),
  risk: {
    riskFactor: _riskFactor2,
    netRisk: _riskFactor2.reduce((acc, curr) => acc + curr.value * curr.weight, 0) / _riskFactor2.reduce((acc, curr) => acc + curr.weight, 0),
    notARisks: getNoRiskTags(_riskFactor2)
  },
  apyMethodology: "APY based on 7-day historical performance, including fees and rewards.",
  additionalInfo: {
    newBounds: {
      lower: -1,
      upper: 1
    },
    lstContract: ContractAddr.from("0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a"),
    feeBps: 1e3
  }
}];
export {
  AutoCompounderSTRK,
  AvnuWrapper,
  BaseStrategy,
  ContractAddr,
  ERC20,
  EkuboCLVault,
  EkuboCLVaultStrategies,
  FatalError,
  FlowChartColors,
  Global,
  ILending,
  Initializable,
  MarginType,
  Network,
  Pragma,
  Pricer,
  PricerFromApi,
  RiskType,
  VesuRebalance,
  VesuRebalanceStrategies,
  Web3Number,
  ZkLend,
  getMainnetConfig,
  getNoRiskTags,
  getRiskColor,
  getRiskExplaination,
  logger
};
