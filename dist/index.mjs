// src/modules/pricer.ts
import axios2 from "axios";

// src/global.ts
import axios from "axios";
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
var tokens = [{
  name: "Starknet",
  symbol: "STRK",
  logo: "https://assets.coingecko.com/coins/images/26433/small/starknet.png",
  address: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  decimals: 18,
  coingeckId: "starknet"
}];
var Global = class {
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
    const data = await axios.get("https://starknet.api.avnu.fi/v1/starknet/tokens");
    const tokensData = data.data.content;
    tokensData.forEach((token) => {
      if (!token.tags.includes("AVNU") || !token.tags.includes("Verified")) {
        return;
      }
      tokens.push({
        name: token.name,
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals,
        logo: token.logoUri,
        coingeckId: token.extensions.coingeckoId
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
};

// src/dataTypes/bignumber.ts
import BigNumber from "bignumber.js";
var Web3Number = class _Web3Number extends BigNumber {
  constructor(value, decimals) {
    super(value);
    this.decimals = decimals;
  }
  static fromWei(weiNumber, decimals) {
    const bn = new _Web3Number(weiNumber, decimals).dividedBy(10 ** decimals);
    return new _Web3Number(bn.toString(), decimals);
  }
  toWei() {
    return this.mul(10 ** this.decimals).toFixed(0);
  }
  multipliedBy(value) {
    let _value = Number(value).toFixed(6);
    return new _Web3Number(this.mul(_value).toString(), this.decimals);
  }
  dividedBy(value) {
    let _value = Number(value).toFixed(6);
    return new _Web3Number(this.div(_value).toString(), this.decimals);
  }
  plus(value) {
    return new _Web3Number(this.add(value).toString(), this.decimals);
  }
  minus(n, base) {
    return new _Web3Number(super.minus(n, base).toString(), this.decimals);
  }
  toString(base) {
    return super.toString(base);
  }
  // [customInspectSymbol](depth: any, inspectOptions: any, inspect: any) {
  // return this.toString();
  // }
};
BigNumber.config({ DECIMAL_PLACES: 18 });
Web3Number.config({ DECIMAL_PLACES: 18 });

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
    const url = this.EKUBO_API.replace("{{TOKEN_ADDRESS}}", token.address).replace("{{AMOUNT}}", amountIn.toWei());
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
          address: savedTokenInfo?.address || "",
          logo: "",
          decimals: pool.token.decimals,
          borrowFactor: Web3Number.fromWei(pool.borrow_factor.value, pool.borrow_factor.decimals),
          collareralFactor
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
      logger.warn("getPriceFromMyAPI error", e);
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
        logger.warn("getPrice coinbase error", e, retry);
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
    if (now.getTime() - priceTime.getTime() > 9e5) {
      throw new Error("Price is stale");
    }
    const price = Number(priceInfo.price);
    return {
      price,
      timestamp: new Date(priceInfo.timestamp)
    };
  }
};

// src/interfaces/common.ts
import { RpcProvider as RpcProvider2 } from "starknet";
var RiskType = /* @__PURE__ */ ((RiskType2) => {
  RiskType2["MARKET_RISK"] = "MARKET_RISK";
  RiskType2["IMPERMANENT_LOSS"] = "IMPERMANENT_LOSS";
  RiskType2["LIQUIDITY_RISK"] = "LIQUIDITY_RISK";
  RiskType2["SMART_CONTRACT_RISK"] = "SMART_CONTRACT_RISK";
  RiskType2["TECHNICAL_RISK"] = "TECHNICAL_RISK";
  RiskType2["COUNTERPARTY_RISK"] = "COUNTERPARTY_RISK";
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
import { Contract as Contract2, uint256 } from "starknet";
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
    this.contract = new Contract2(cls.abi, this.addr.address, provider);
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
    const assets = await this.contract.convert_to_assets(uint256.bnToUint256(balanceShares.toWei()));
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

// src/strategies/vesu-rebalance.ts
import { CairoCustomEnum, Contract as Contract3, num as num2, uint256 as uint2562 } from "starknet";

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

// src/utils/index.ts
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// src/strategies/vesu-rebalance.ts
import axios5 from "axios";
var VesuRebalance = class _VesuRebalance {
  // 10000 bps = 100%
  /**
   * Creates a new VesuRebalance strategy instance.
   * @param config - Configuration object containing provider and other settings
   * @param pricer - Pricer instance for token price calculations
   * @param metadata - Strategy metadata including deposit tokens and address
   * @throws {Error} If more than one deposit token is specified
   */
  constructor(config, pricer, metadata) {
    this.BASE_WEIGHT = 1e4;
    this.config = config;
    this.pricer = pricer;
    assert(metadata.depositTokens.length === 1, "VesuRebalance only supports 1 deposit token");
    this.metadata = metadata;
    this.address = metadata.address;
    this.contract = new Contract3(vesu_rebalance_abi_default, this.address.address, this.config.provider);
  }
  /**
   * Creates a deposit call to the strategy contract.
   * @param assets - Amount of assets to deposit
   * @param receiver - Address that will receive the strategy tokens
   * @returns Populated contract call for deposit
   */
  depositCall(assets, receiver) {
    const assetContract = new Contract3(vesu_rebalance_abi_default, this.metadata.depositTokens[0].address, this.config.provider);
    const call1 = assetContract.populate("approve", [this.address.address, uint2562.bnToUint256(assets.toWei())]);
    const call2 = this.contract.populate("deposit", [uint2562.bnToUint256(assets.toWei()), receiver.address]);
    return [call1, call2];
  }
  /**
   * Creates a withdrawal call to the strategy contract.
   * @param assets - Amount of assets to withdraw
   * @param receiver - Address that will receive the withdrawn assets
   * @param owner - Address that owns the strategy tokens
   * @returns Populated contract call for withdrawal
   */
  withdrawCall(assets, receiver, owner) {
    return [this.contract.populate("withdraw", [uint2562.bnToUint256(assets.toWei()), receiver.address, owner.address])];
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
    const assets = await this.contract.convert_to_assets(uint2562.bnToUint256(shares));
    const amount = Web3Number.fromWei(assets.toString(), this.metadata.depositTokens[0].decimals);
    let price = await this.pricer.getPrice(this.metadata.depositTokens[0].symbol);
    const usdValue = Number(amount.toFixed(6)) * price.price;
    return {
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
      amount,
      usdValue
    };
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
      const res = await axios5.get(`https://api.vesu.xyz/positions?walletAddress=${this.address.address}`);
      const data2 = await res.data;
      vesuPositions = data2.data;
    } catch (e) {
      console.error(`${_VesuRebalance.name}: Error fetching pools for ${this.address.address}`, e);
      isErrorPositionsAPI = true;
    }
    let isErrorPoolsAPI = false;
    let pools = [];
    try {
      const res = await axios5.get(`https://api.vesu.xyz/pools`);
      const data2 = await res.data;
      pools = data2.data;
    } catch (e) {
      console.error(`${_VesuRebalance.name}: Error fetching pools for ${this.address.address}`, e);
      isErrorPoolsAPI = true;
    }
    const totalAssets = (await this.getTVL()).amount;
    const info = allowedPools.map(async (p) => {
      const vesuPosition = vesuPositions.find((d) => d.pool.id.toString() === num2.getDecimalString(p.pool_id.address.toString()));
      const pool = pools.find((d) => d.id == num2.getDecimalString(p.pool_id.address));
      const assetInfo = pool?.assets.find((d) => ContractAddr.from(this.asset().address).eqString(d.address));
      let vTokenContract = new Contract3(vesu_rebalance_abi_default, p.v_token.address, this.config.provider);
      const bal = await vTokenContract.balanceOf(this.address.address);
      const assets = await vTokenContract.convert_to_assets(uint2562.bnToUint256(bal.toString()));
      const item = {
        pool_id: p.pool_id,
        pool_name: pool.name,
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
          defiSpringApy: Number(Web3Number.fromWei(assetInfo.stats.defiSpringSupplyApr.value, assetInfo.stats.defiSpringSupplyApr.decimals).toFixed(6)),
          netApy: 0
        },
        currentUtilization: isErrorPoolsAPI || !assetInfo ? 0 : Number(Web3Number.fromWei(assetInfo.stats.currentUtilization.value, assetInfo.stats.currentUtilization.decimals).toFixed(6)),
        maxUtilization: isErrorPoolsAPI || !assetInfo ? 0 : Number(Web3Number.fromWei(assetInfo.config.maxUtilization.value, assetInfo.config.maxUtilization.decimals).toFixed(6))
      };
      item.APY.netApy = item.APY.baseApy + item.APY.defiSpringApy;
      return item;
    });
    const data = await Promise.all(info);
    return {
      data,
      isErrorPositionsAPI,
      isErrorPoolsAPI,
      isError: isErrorPositionsAPI || isErrorPoolsAPI
    };
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
  netAPYGivenPools(pools) {
    const weightedApy = pools.reduce((acc, curr) => {
      const weight = curr.current_weight;
      return acc + curr.APY.netApy * weight;
    }, 0);
    return weightedApy;
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
  async getRebalancedPositions() {
    const { data: pools } = await this.getPools();
    const totalAssets = (await this.getTVL()).amount;
    if (totalAssets.eq(0)) return {
      changes: [],
      finalPools: []
    };
    const sumPools = pools.reduce((acc, curr) => acc.plus(curr.amount.toString()), Web3Number.fromWei("0", this.decimals()));
    assert(sumPools.lte(totalAssets), "Sum of pools.amount must be less than or equal to totalAssets");
    const sortedPools = [...pools].sort((a, b) => b.APY.netApy - a.APY.netApy);
    const targetAmounts = {};
    let remainingAssets = totalAssets;
    let isAnyPoolOverMaxWeight = false;
    for (const pool of sortedPools) {
      const maxAmount = totalAssets.multipliedBy(pool.max_weight * 0.9);
      const targetAmount = remainingAssets.gte(maxAmount) ? maxAmount : remainingAssets;
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
    const sumChanges = changes.reduce((sum, c) => sum.plus(c.changeAmt.toString()), Web3Number.fromWei("0", this.decimals()));
    const sumFinal = changes.reduce((sum, c) => sum.plus(c.finalAmt.toString()), Web3Number.fromWei("0", this.decimals()));
    const hasChanges = changes.some((c) => !c.changeAmt.eq(0));
    if (!sumChanges.eq(0)) throw new Error("Sum of changes must be zero");
    if (!sumFinal.eq(totalAssets)) throw new Error("Sum of final amounts must equal total assets");
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
    console.log("pools", pools);
    pools.forEach((p) => {
      if (p.changeAmt.eq(0)) return null;
      actions.push({
        pool_id: p.pool_id.address,
        feature: new CairoCustomEnum(p.isDeposit ? { DEPOSIT: {} } : { WITHDRAW: {} }),
        token: this.asset().address,
        amount: uint2562.bnToUint256(p.changeAmt.multipliedBy(p.isDeposit ? 1 : -1).toWei())
      });
    });
    if (actions.length === 0) return null;
    if (isOverWeightAdjustment) {
      return this.contract.populate("rebalance_weights", [actions]);
    }
    return this.contract.populate("rebalance", [actions]);
  }
  async getInvestmentFlows(pools) {
    const netYield = this.netAPYGivenPools(pools);
    const baseFlow = {
      title: "Your Deposit",
      subItems: [{ key: `Net yield`, value: `${(netYield * 100).toFixed(2)}%` }],
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
};
var _description = "Automatically diversify {{TOKEN}} holdings into different Vesu pools while reducing risk and maximizing yield. Defi spring STRK Rewards are auto-compounded as well.";
var _protocol = { name: "Vesu", logo: "https://static-assets-8zct.onrender.com/integrations/vesu/logo.png" };
var _riskFactor = [
  { type: "SMART_CONTRACT_RISK" /* SMART_CONTRACT_RISK */, value: 0.5, weight: 25 },
  { type: "TECHNICAL_RISK" /* TECHNICAL_RISK */, value: 0.5, weight: 25 },
  { type: "COUNTERPARTY_RISK" /* COUNTERPARTY_RISK */, value: 1, weight: 50 }
];
var VesuRebalanceStrategies = [{
  name: "Vesu STRK",
  description: _description.replace("{{TOKEN}}", "STRK"),
  address: ContractAddr.from("0xeeb729d554ae486387147b13a9c8871bc7991d454e8b5ff570d4bf94de71e1"),
  type: "ERC4626",
  depositTokens: [Global.getDefaultTokens().find((t) => t.symbol === "STRK")],
  protocols: [_protocol],
  maxTVL: Web3Number.fromWei("0", 18),
  risk: {
    riskFactor: _riskFactor,
    netRisk: _riskFactor.reduce((acc, curr) => acc + curr.value * curr.weight, 0) / 100
  }
}];

// src/notifs/telegram.ts
import TelegramBot from "node-telegram-bot-api";
var TelegramNotif = class {
  constructor(token, shouldPoll) {
    this.subscribers = [
      // '6820228303',
      "1505578076",
      // '5434736198', // maaza
      "1356705582",
      // langs
      "1388729514",
      // hwashere
      "6020162572",
      //minato
      "985902592"
    ];
    this.bot = new TelegramBot(token, { polling: shouldPoll });
  }
  // listen to start msgs, register chatId and send registered msg
  activateChatBot() {
    this.bot.on("message", (msg) => {
      const chatId = msg.chat.id;
      let text = msg.text.toLowerCase().trim();
      logger.verbose(`Tg: IncomingMsg: ID: ${chatId}, msg: ${text}`);
      if (text == "start") {
        this.bot.sendMessage(chatId, "Registered");
        this.subscribers.push(chatId);
        logger.verbose(`Tg: New subscriber: ${chatId}`);
      } else {
        this.bot.sendMessage(chatId, "Unrecognized command. Supported commands: start");
      }
    });
  }
  // send a given msg to all registered users
  sendMessage(msg) {
    logger.verbose(`Tg: Sending message: ${msg}`);
    for (let chatId of this.subscribers) {
      this.bot.sendMessage(chatId, msg).catch((err) => {
        logger.error(`Tg: Error sending msg to ${chatId}`);
        logger.error(`Tg: Error sending message: ${err.message}`);
      }).then(() => {
        logger.verbose(`Tg: Message sent to ${chatId}`);
      });
    }
  }
};

// src/node/pricer-redis.ts
import { createClient } from "redis";
var PricerRedis = class extends Pricer {
  constructor(config, tokens2) {
    super(config, tokens2);
    this.redisClient = null;
  }
  /** Reads prices from Pricer._loadPrices and uses a callback to set prices in redis */
  async startWithRedis(redisUrl) {
    await this.initRedis(redisUrl);
    logger.info(`Starting Pricer with Redis`);
    this._loadPrices(this._setRedisPrices.bind(this));
    setInterval(() => {
      this._loadPrices(this._setRedisPrices.bind(this));
    }, 3e4);
  }
  async close() {
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }
  }
  async initRedis(redisUrl) {
    logger.info(`Initialising Redis Client`);
    this.redisClient = await createClient({
      url: redisUrl
    });
    this.redisClient.on("error", (err) => console.log("Redis Client Error", err)).connect();
    logger.info(`Redis Client Initialised`);
  }
  /** sets current local price in redis */
  _setRedisPrices(tokenSymbol) {
    if (!this.redisClient) {
      throw new FatalError(`Redis client not initialised`);
    }
    this.redisClient.set(`Price:${tokenSymbol}`, JSON.stringify(this.prices[tokenSymbol])).catch((err) => {
      logger.warn(`Error setting price in redis for ${tokenSymbol}`);
    });
  }
  /** Returns price from redis */
  async getPrice(tokenSymbol) {
    const STALE_TIME = 6e4;
    if (!this.redisClient) {
      throw new FatalError(`Redis client not initialised`);
    }
    const data = await this.redisClient.get(`Price:${tokenSymbol}`);
    if (!data) {
      throw new FatalError(`Redis:Price of ${tokenSymbol} not found`);
    }
    logger.verbose(`Redis:Price of ${tokenSymbol} is ${data}`);
    const priceInfo = JSON.parse(data);
    priceInfo.timestamp = new Date(priceInfo.timestamp);
    const isStale = (/* @__PURE__ */ new Date()).getTime() - priceInfo.timestamp.getTime() > STALE_TIME;
    Global.assert(!isStale, `Price of ${tokenSymbol} is stale`);
    return priceInfo;
  }
};

// src/utils/store.ts
import fs, { readFileSync, writeFileSync } from "fs";
import { Account, constants } from "starknet";
import * as crypto2 from "crypto";

// src/utils/encrypt.ts
import * as crypto from "crypto";
var PasswordJsonCryptoUtil = class {
  constructor() {
    this.algorithm = "aes-256-gcm";
    this.keyLength = 32;
    // 256 bits
    this.saltLength = 16;
    // 128 bits
    this.ivLength = 12;
    // 96 bits for GCM
    this.tagLength = 16;
    // 128 bits
    this.pbkdf2Iterations = 1e5;
  }
  // Number of iterations for PBKDF2
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, this.pbkdf2Iterations, this.keyLength, "sha256");
  }
  encrypt(data, password) {
    const jsonString = JSON.stringify(data);
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    const key = this.deriveKey(password, salt);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv, { authTagLength: this.tagLength });
    let encrypted = cipher.update(jsonString, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, "hex")]).toString("base64");
  }
  decrypt(encryptedData, password) {
    const data = Buffer.from(encryptedData, "base64");
    const salt = data.subarray(0, this.saltLength);
    const iv = data.subarray(this.saltLength, this.saltLength + this.ivLength);
    const tag = data.subarray(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
    const encrypted = data.subarray(this.saltLength + this.ivLength + this.tagLength);
    const key = this.deriveKey(password, salt);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv, { authTagLength: this.tagLength });
    decipher.setAuthTag(tag);
    try {
      let decrypted = decipher.update(encrypted.toString("hex"), "hex", "utf8");
      decrypted += decipher.final("utf8");
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error("Decryption failed. This could be due to an incorrect password or corrupted data.");
    }
  }
};

// src/utils/store.ts
function getDefaultStoreConfig(network) {
  if (!process.env.HOME) {
    throw new Error("StoreConfig: HOME environment variable not found");
  }
  return {
    SECRET_FILE_FOLDER: `${process.env.HOME}/.starknet-store`,
    NETWORK: network,
    ACCOUNTS_FILE_NAME: "accounts.json",
    PASSWORD: crypto2.randomBytes(16).toString("hex")
  };
}
var Store = class _Store {
  constructor(config, storeConfig) {
    this.encryptor = new PasswordJsonCryptoUtil();
    this.config = config;
    const defaultStoreConfig = getDefaultStoreConfig(config.network);
    if (!storeConfig.PASSWORD) {
      _Store.logPassword(defaultStoreConfig.PASSWORD);
    }
    this.storeConfig = {
      ...defaultStoreConfig,
      ...storeConfig
    };
    _Store.ensureFolder(this.storeConfig.SECRET_FILE_FOLDER);
  }
  static logPassword(password) {
    logger.warn(`\u26A0\uFE0F=========================================\u26A0\uFE0F`);
    logger.warn(`Generated a random password for store`);
    logger.warn(`\u26A0\uFE0F Password: ${password}`);
    logger.warn(`This not stored anywhere, please you backup this password for future use`);
    logger.warn(`\u26A0\uFE0F=========================================\u26A0\uFE0F`);
  }
  getAccount(accountKey, txVersion = constants.TRANSACTION_VERSION.V2) {
    const accounts = this.loadAccounts();
    logger.verbose(`nAccounts loaded for network: ${Object.keys(accounts).length}`);
    const data = accounts[accountKey];
    if (!data) {
      throw new Error(`Account not found: ${accountKey}`);
    }
    logger.verbose(`Account loaded: ${accountKey} from network: ${this.config.network}`);
    logger.verbose(`Address: ${data.address}`);
    const acc = new Account(this.config.provider, data.address, data.pk, void 0, txVersion);
    return acc;
  }
  addAccount(accountKey, address, pk) {
    const allAccounts = this.getAllAccounts();
    if (!allAccounts[this.config.network]) {
      allAccounts[this.config.network] = {};
    }
    allAccounts[this.config.network][accountKey] = {
      address,
      pk
    };
    const encryptedData = this.encryptor.encrypt(allAccounts, this.storeConfig.PASSWORD);
    writeFileSync(this.getAccountFilePath(), encryptedData);
    logger.verbose(`Account added: ${accountKey} to network: ${this.config.network}`);
  }
  getAccountFilePath() {
    const path = `${this.storeConfig.SECRET_FILE_FOLDER}/${this.storeConfig.ACCOUNTS_FILE_NAME}`;
    logger.verbose(`Path: ${path}`);
    return path;
  }
  getAllAccounts() {
    const PATH = this.getAccountFilePath();
    if (!fs.existsSync(PATH)) {
      logger.verbose(`Accounts: files doesnt exist`);
      return {};
    }
    let encryptedData = readFileSync(PATH, {
      encoding: "utf-8"
    });
    let data = this.encryptor.decrypt(encryptedData, this.storeConfig.PASSWORD);
    return data;
  }
  /**
   * @description Load all accounts of the network
   * @returns NetworkAccounts
   */
  loadAccounts() {
    const allData = this.getAllAccounts();
    logger.verbose(`Accounts loaded for network: ${this.config.network}`);
    if (!allData[this.config.network]) {
      allData[this.config.network] = {};
    }
    return allData[this.config.network];
  }
  /**
   * @description List all accountKeys of the network
   * @returns string[]
   */
  listAccounts() {
    return Object.keys(this.loadAccounts());
  }
  static ensureFolder(folder) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    if (!fs.existsSync(`${folder}`)) {
      throw new Error(`Store folder not found: ${folder}`);
    }
  }
};
export {
  AutoCompounderSTRK,
  ContractAddr,
  FatalError,
  FlowChartColors,
  Global,
  ILending,
  Initializable,
  MarginType,
  Network,
  PasswordJsonCryptoUtil,
  Pragma,
  Pricer,
  PricerFromApi,
  PricerRedis,
  RiskType,
  Store,
  TelegramNotif,
  VesuRebalance,
  VesuRebalanceStrategies,
  Web3Number,
  ZkLend,
  assert,
  getDefaultStoreConfig,
  getMainnetConfig,
  logger
};
