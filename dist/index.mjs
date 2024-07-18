// src/modules/pricer.ts
import axios from "axios";

// src/data/tokens.json
var tokens_default = [
  {
    name: "Ether",
    symbol: "ETH",
    address: "",
    decimals: 18,
    pricerKey: "ETH-USDT"
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    address: "",
    decimals: 6,
    pricerKey: "USDC-USDT"
  },
  {
    name: "Wrapped BTC",
    symbol: "WBTC",
    address: "",
    decimals: 8,
    pricerKey: "WBTC-USDT"
  },
  {
    name: "Tether USD",
    symbol: "USDT",
    address: "",
    decimals: 6,
    pricerKey: "USDT-USDT"
  },
  {
    name: "Dai Stablecoin",
    symbol: "DAIv0",
    address: "",
    decimals: 18,
    pricerKey: "DAI-USDT"
  },
  {
    name: "Starknet Wrapped Staked Ether",
    symbol: "wstETH",
    address: "",
    decimals: 18,
    pricerKey: "wstETH-USDT"
  },
  {
    name: "Starknet Token",
    symbol: "STRK",
    address: "",
    decimals: 18,
    pricerKey: "STRK-USDT"
  },
  {
    name: "zkLend Token",
    symbol: "ZEND",
    address: "",
    decimals: 18,
    pricerKey: "ZEND-USDT"
  },
  {
    name: "Dai Stablecoin",
    symbol: "DAI",
    address: "",
    decimals: 18,
    pricerKey: "DAI-USDT"
  }
];

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
  static async getTokens() {
    return tokens_default;
  }
  static assert(condition, message) {
    if (!condition) {
      throw new FatalError(message);
    }
  }
};

// src/modules/pricer.ts
var Pricer = class {
  constructor(config, tokens) {
    this.tokens = [];
    this.prices = {};
    /**
     * TOKENA and TOKENB are the two token names to get price of TokenA in terms of TokenB
     */
    this.PRICE_API = `https://api.coinbase.com/v2/prices/{{PRICER_KEY}}/buy`;
    this.config = config;
    this.tokens = tokens;
    this.start();
  }
  isReady() {
    return Object.keys(this.prices).length === this.tokens.length;
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
  getPrice(tokenName) {
    const STALE_TIME = 6e4;
    Global.assert(this.prices[tokenName], `Price of ${tokenName} not found`);
    const isStale = (/* @__PURE__ */ new Date()).getTime() - this.prices[tokenName].timestamp.getTime() > STALE_TIME;
    Global.assert(!isStale, `Price of ${tokenName} is stale`);
    return this.prices[tokenName];
  }
  _loadPrices() {
    this.tokens.forEach(async (token) => {
      try {
        if (token.symbol === "USDT") {
          this.prices[token.symbol] = {
            price: 1,
            timestamp: /* @__PURE__ */ new Date()
          };
          return;
        }
        if (!token.pricerKey) {
          throw new FatalError(`Pricer key not found for ${token.name}`);
        }
        const url = this.PRICE_API.replace("{{PRICER_KEY}}", token.pricerKey);
        const result = await axios.get(url);
        const data = result.data;
        const price = Number(data.data.amount);
        this.prices[token.symbol] = {
          price,
          timestamp: /* @__PURE__ */ new Date()
        };
        logger.verbose(`Fetched price of ${token.name} as ${price}`);
      } catch (error) {
        throw new FatalError(`Error fetching data from ${token.name}`, error);
      }
    });
  }
};

// src/modules/zkLend.ts
import axios2 from "axios";

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
    return this.mul(10 ** this.decimals).toString();
  }
  multipliedBy(value) {
    return new _Web3Number(this.mul(value).toString(), this.decimals);
  }
  dividedBy(value) {
    return new _Web3Number(this.div(value).toString(), this.decimals);
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
      const result = await axios2.get(_ZkLend.POOLS_URL);
      const data = result.data;
      data.forEach((pool) => {
        let collareralFactor = new Web3Number(0, 0);
        if (pool.collateral_factor) {
          collareralFactor = Web3Number.fromWei(pool.collateral_factor.value, pool.collateral_factor.decimals);
        }
        const token = {
          name: pool.token.name,
          symbol: pool.token.symbol,
          address: pool.address,
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
    const result = await axios2.get(url);
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
      const price = this.pricer.getPrice(token.symbol).price;
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

// src/interfaces/common.ts
import { RpcProvider } from "starknet";
function getMainnetConfig(rpcUrl = "https://starknet-mainnet.public.blastapi.io") {
  return {
    provider: new RpcProvider({
      nodeUrl: rpcUrl,
      blockIdentifier: "pending"
    })
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

// src/strategies/autoCompounderStrk.ts
import { Contract, uint256 } from "starknet";
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
    const cls = await this.config.provider.getClassAt(this.addr.address);
    this.contract = new Contract(cls.abi, this.addr.address, this.config.provider);
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
    const price = this.pricer.getPrice(this.metadata.underlying.name);
    const usd = assets.multipliedBy(price.price.toFixed(6));
    return {
      usd,
      assets
    };
  }
};

// src/notifs/telegram.ts
import TelegramBot from "node-telegram-bot-api";
var TelegramNotif = class {
  constructor(token, shouldPoll) {
    this.subscribers = ["6820228303"];
    this.bot = new TelegramBot(token, { polling: shouldPoll });
  }
  // listen to start msgs, register chatId and send registered msg
  activateChatBot() {
  }
  // send a given msg to all registered users
  sendMessage(msg) {
    logger.verbose(`Tg: Sending message: ${msg}`);
    for (let chatId of this.subscribers) {
      this.bot.sendMessage(chatId, msg).catch((err) => {
        logger.error(`Tg: Error sending message: ${err.message}`);
      }).then(() => {
        logger.verbose(`Tg: Message sent to ${chatId}`);
      });
    }
  }
};

// src/utils/store.ts
import { readFileSync } from "fs";
import { Account } from "starknet";
var Store = class {
  constructor(config, storeConfig) {
    this.config = config;
    this.storeConfig = storeConfig;
  }
  getAccount() {
    let data = JSON.parse(readFileSync(`${this.storeConfig.SECRET_FILE_FOLDER}/account_${process.env.NETWORK}.json`, {
      encoding: "utf-8"
    }));
    return new Account(this.config.provider, data.address, data.pk);
  }
};
export {
  AutoCompounderSTRK,
  ContractAddr,
  FatalError,
  Global,
  ILending,
  Initializable,
  MarginType,
  Pricer,
  Store,
  TelegramNotif,
  Web3Number,
  ZkLend,
  getMainnetConfig,
  logger
};
