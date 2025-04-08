#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli.ts
var import_commander = require("commander");
var import_inquirer = __toESM(require("inquirer"));

// src/utils/store.ts
var import_fs = __toESM(require("fs"));
var import_starknet10 = require("starknet");
var crypto2 = __toESM(require("crypto"));

// src/utils/encrypt.ts
var crypto = __toESM(require("crypto"));
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

// src/modules/pricer.ts
var import_axios2 = __toESM(require("axios"));

// src/global.ts
var import_axios = __toESM(require("axios"));

// src/dataTypes/bignumber.node.ts
var import_util = __toESM(require("util"));

// src/dataTypes/_bignumber.ts
var import_bignumber = __toESM(require("bignumber.js"));
var _Web3Number = class extends import_bignumber.default {
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
import_bignumber.default.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: import_bignumber.default.ROUND_DOWN });
_Web3Number.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: import_bignumber.default.ROUND_DOWN });

// src/dataTypes/bignumber.node.ts
var Web3Number = class _Web3Number2 extends _Web3Number {
  static fromWei(weiNumber, decimals) {
    const bn = new _Web3Number2(weiNumber, decimals).dividedBy(10 ** decimals);
    return new _Web3Number2(bn.toString(), decimals);
  }
  [import_util.default.inspect.custom](depth, opts) {
    return this.toString();
  }
  [Symbol.for("nodejs.util.inspect.custom")](depth, inspectOptions, inspect) {
    return this.toString();
  }
  inspect(depth, opts) {
    return this.toString();
  }
};

// src/dataTypes/address.ts
var import_starknet = require("starknet");
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
    const a = import_starknet.num.getHexString(import_starknet.num.getDecimalString(_a.toString()));
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
  logo: "https://assets.coingecko.com/coins/images/26433/small/starknet.png",
  address: ContractAddr.from("0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"),
  decimals: 18,
  coingeckId: "starknet",
  displayDecimals: 2
}, {
  name: "xSTRK",
  symbol: "xSTRK",
  logo: "https://dashboard.endur.fi/endur-fi.svg",
  address: ContractAddr.from("0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a"),
  decimals: 18,
  coingeckId: void 0,
  displayDecimals: 2
}, {
  name: "ETH",
  symbol: "ETH",
  logo: "https://opbnb.bscscan.com/token/images/ether.svg",
  address: ContractAddr.from("0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"),
  decimals: 18,
  coingeckId: void 0,
  displayDecimals: 4
}, {
  name: "USDC",
  symbol: "USDC",
  logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  address: ContractAddr.from("0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8"),
  decimals: 6,
  coingeckId: void 0,
  displayDecimals: 2
}, {
  name: "USDT",
  symbol: "USDT",
  logo: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  address: ContractAddr.from("0x68f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8"),
  decimals: 6,
  coingeckId: void 0,
  displayDecimals: 2
}, {
  name: "WBTC",
  symbol: "WBTC",
  logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png",
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
    const data = await import_axios.default.get("https://starknet.api.avnu.fi/v1/starknet/tokens");
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

// src/modules/pragma.ts
var import_starknet2 = require("starknet");

// src/modules/zkLend.ts
var import_axios3 = __toESM(require("axios"));

// src/dataTypes/bignumber.browser.ts
var Web3Number2 = class _Web3Number2 extends _Web3Number {
  static fromWei(weiNumber, decimals) {
    const bn = new _Web3Number2(weiNumber, decimals).dividedBy(10 ** decimals);
    return new _Web3Number2(bn.toString(), decimals);
  }
};

// src/interfaces/lending.ts
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
      const result = await import_axios3.default.get(_ZkLend.POOLS_URL);
      const data = result.data;
      const savedTokens = await Global.getTokens();
      data.forEach((pool) => {
        let collareralFactor = new Web3Number2(0, 0);
        if (pool.collateral_factor) {
          collareralFactor = Web3Number2.fromWei(pool.collateral_factor.value, pool.collateral_factor.decimals);
        }
        const savedTokenInfo = savedTokens.find((t) => t.symbol == pool.token.symbol);
        const token = {
          name: pool.token.name,
          symbol: pool.token.symbol,
          address: savedTokenInfo?.address || ContractAddr.from(""),
          logo: "",
          decimals: pool.token.decimals,
          borrowFactor: Web3Number2.fromWei(pool.borrow_factor.value, pool.borrow_factor.decimals),
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
    let effectiveDebt = new Web3Number2(0, 6);
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
    let effectiveCollateral = new Web3Number2(0, 6);
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
    const result = await import_axios3.default.get(url);
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
      const debtAmount = Web3Number2.fromWei(pool.data.debt_amount, token.decimals);
      const supplyAmount = Web3Number2.fromWei(pool.data.supply_amount, token.decimals);
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
var import_axios4 = __toESM(require("axios"));

// src/modules/erc20.ts
var import_starknet3 = require("starknet");

// src/modules/avnu.ts
var import_starknet4 = require("starknet");
var import_avnu_sdk = require("@avnu/avnu-sdk");

// src/interfaces/common.ts
var import_starknet5 = require("starknet");
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
var getNoRiskTags = (risks) => {
  const noRisks1 = risks.filter((risk) => risk.value === 0).map((risk) => risk.type);
  const noRisks2 = Object.values(RiskType).filter((risk) => !risks.map((risk2) => risk2.type).includes(risk));
  const mergedUnique = [.../* @__PURE__ */ new Set([...noRisks1, ...noRisks2])];
  return mergedUnique.map((risk) => `No ${risk}`);
};

// src/strategies/autoCompounderStrk.ts
var import_starknet6 = require("starknet");

// src/strategies/vesu-rebalance.ts
var import_starknet8 = require("starknet");

// src/node/headless.browser.ts
var import_axios5 = __toESM(require("axios"));

// src/modules/harvests.ts
var import_starknet7 = require("starknet");

// src/strategies/vesu-rebalance.ts
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

// src/strategies/ekubo-cl-vault.ts
var import_starknet9 = require("starknet");
var _description2 = "Deploys your {{POOL_NAME}} into an Ekubo liquidity pool, automatically rebalancing positions around the current price to optimize yield and reduce the need for manual adjustments. Trading fees and DeFi Spring rewards are automatically compounded back into the strategy. In return, you receive an ERC-20 token representing your share of the strategy. The APY is calculated based on 7-day historical performance.";
var _protocol2 = { name: "Ekubo", logo: "https://app.ekubo.org/favicon.ico" };
var _riskFactor2 = [
  { type: "Smart Contract Risk" /* SMART_CONTRACT_RISK */, value: 0.5, weight: 25 },
  { type: "Impermanent Loss Risk" /* IMPERMANENT_LOSS */, value: 1, weight: 75 }
];
var AUDIT_URL2 = "https://assets.strkfarm.com/strkfarm/audit_report_vesu_and_ekubo_strats.pdf";
var EkuboCLVaultStrategies = [{
  name: "Ekubo xSTRK/STRK",
  description: _description2.replace("{{POOL_NAME}}", "xSTRK/STRK"),
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

// src/notifs/telegram.ts
var import_node_telegram_bot_api = __toESM(require("node-telegram-bot-api"));

// src/node/pricer-redis.ts
var import_redis = require("redis");

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
  getAccount(accountKey, txVersion = import_starknet10.constants.TRANSACTION_VERSION.V2) {
    const accounts = this.loadAccounts();
    logger.verbose(`nAccounts loaded for network: ${Object.keys(accounts).length}`);
    const data = accounts[accountKey];
    if (!data) {
      throw new Error(`Account not found: ${accountKey}`);
    }
    logger.verbose(`Account loaded: ${accountKey} from network: ${this.config.network}`);
    logger.verbose(`Address: ${data.address}`);
    const acc = new import_starknet10.Account(this.config.provider, data.address, data.pk, void 0, txVersion);
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
    (0, import_fs.writeFileSync)(this.getAccountFilePath(), encryptedData);
    logger.verbose(`Account added: ${accountKey} to network: ${this.config.network}`);
  }
  getAccountFilePath() {
    const path = `${this.storeConfig.SECRET_FILE_FOLDER}/${this.storeConfig.ACCOUNTS_FILE_NAME}`;
    logger.verbose(`Path: ${path}`);
    return path;
  }
  getAllAccounts() {
    const PATH = this.getAccountFilePath();
    if (!import_fs.default.existsSync(PATH)) {
      logger.verbose(`Accounts: files doesnt exist`);
      return {};
    }
    let encryptedData = (0, import_fs.readFileSync)(PATH, {
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
    if (!import_fs.default.existsSync(folder)) {
      import_fs.default.mkdirSync(folder, { recursive: true });
    }
    if (!import_fs.default.existsSync(`${folder}`)) {
      throw new Error(`Store folder not found: ${folder}`);
    }
  }
};

// src/cli.ts
var import_chalk = __toESM(require("chalk"));
var import_starknet11 = require("starknet");
var program = new import_commander.Command();
var getConfig = (network) => {
  return {
    provider: new import_starknet11.RpcProvider({
      nodeUrl: "https://starknet-mainnet.public.blastapi.io"
    }),
    network,
    stage: "production"
  };
};
async function createStore() {
  console.log(import_chalk.default.blue.bold("Welcome to the Account Secure project for Starknet!"));
  const networkAnswers = await import_inquirer.default.prompt([
    {
      type: "list",
      name: "network",
      message: import_chalk.default.yellow("What is the network?"),
      choices: ["mainnet", "sepolia", "devnet"]
    }
  ]);
  const network = networkAnswers.network;
  const defaultStoreConfig = getDefaultStoreConfig(network);
  const storeConfigAnswers = await import_inquirer.default.prompt([
    {
      type: "input",
      name: "secrets_folder",
      message: import_chalk.default.yellow(`What is your secrets folder? (${defaultStoreConfig.SECRET_FILE_FOLDER})`),
      default: defaultStoreConfig.SECRET_FILE_FOLDER,
      validate: (input) => true
    },
    {
      type: "input",
      name: "accounts_file",
      message: import_chalk.default.yellow(`What is your accounts file? (${defaultStoreConfig.ACCOUNTS_FILE_NAME})`),
      default: defaultStoreConfig.ACCOUNTS_FILE_NAME,
      validate: (input) => true
    },
    {
      type: "input",
      name: "encryption_password",
      message: import_chalk.default.yellow(`What is your decryption password? (To generate one, press enter)`),
      default: defaultStoreConfig.PASSWORD,
      validate: (input) => true
    }
  ]);
  const config = getConfig(network);
  const secrets_folder = storeConfigAnswers.secrets_folder;
  const accounts_file = storeConfigAnswers.accounts_file;
  const encryption_password = storeConfigAnswers.encryption_password;
  const store = new Store(config, {
    SECRET_FILE_FOLDER: secrets_folder,
    ACCOUNTS_FILE_NAME: accounts_file,
    PASSWORD: storeConfigAnswers.encryption_password,
    NETWORK: network
  });
  if (defaultStoreConfig.PASSWORD === encryption_password) {
    Store.logPassword(encryption_password);
  }
  return store;
}
program.version("1.0.0").description("Manage accounts securely on your disk with encryption");
program.description("Add accounts securely to your disk with encryption").command("add-account").action(async (options) => {
  const store = await createStore();
  const existingAccountKeys = store.listAccounts();
  const accountAnswers = await import_inquirer.default.prompt([
    {
      type: "input",
      name: "account_key",
      message: import_chalk.default.yellow(`Provide a unique account key`),
      validate: (input) => input.length > 0 && !existingAccountKeys.includes(input) || "Please enter a unique account key"
    },
    {
      type: "input",
      name: "address",
      message: import_chalk.default.yellow(`What is your account address?`),
      validate: (input) => input.length > 0 || "Please enter a valid address"
    },
    {
      type: "input",
      name: "pk",
      message: import_chalk.default.yellow(`What is your account private key?`),
      validate: (input) => input.length > 0 || "Please enter a valid pk"
    }
  ]);
  const address = accountAnswers.address;
  const pk = accountAnswers.pk;
  const account_key = accountAnswers.account_key;
  store.addAccount(account_key, address, pk);
  console.log(`${import_chalk.default.blue("Account added:")} ${account_key} to network: ${store.config.network}`);
});
program.description("List account names of a network").command("list-accounts").action(async (options) => {
  const store = await createStore();
  const accounts = store.listAccounts();
  console.log(`${import_chalk.default.blue("Account keys:")} ${accounts.join(", ")}`);
});
program.description("List account names of a network").command("get-account").action(async (options) => {
  const store = await createStore();
  const existingAccountKeys = store.listAccounts();
  const accountAnswers = await import_inquirer.default.prompt([
    {
      type: "input",
      name: "account_key",
      message: import_chalk.default.yellow(`Provide a unique account key`),
      validate: (input) => input.length > 0 && existingAccountKeys.includes(input) || "Please enter a value account key"
    }
  ]);
  const account = store.getAccount(accountAnswers.account_key);
  console.log(`${import_chalk.default.blue("Account Address:")} ${account.address}`);
});
program.action(() => {
  program.help();
});
program.parse(process.argv);
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
