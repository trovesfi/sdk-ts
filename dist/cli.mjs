#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";
import inquirer from "inquirer";

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

// src/utils/logger.node.ts
import winston, { format } from "winston";
var colors = {
  error: "red",
  warn: "yellow",
  info: "blue",
  verbose: "white",
  debug: "white"
};
winston.addColors(colors);
var logger = winston.createLogger({
  level: "verbose",
  // Set the minimum logging level
  format: format.combine(
    format.colorize({ all: true }),
    // Apply custom colors
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    // Add timestamp to log messages
    format.printf(({ timestamp, level, message, ...meta }) => {
      let msg = `${timestamp} ${level}: ${message}`;
      if (meta && meta[Symbol.for("splat")]) {
        for (const arg of meta[Symbol.for("splat")]) {
          if (arg instanceof Error) {
            msg += `
${arg.stack}`;
          }
        }
      }
      return msg;
    })
  ),
  transports: [
    new winston.transports.Console()
    // Output logs to the console
  ]
});

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

// src/cli.ts
import chalk from "chalk";
import { RpcProvider } from "starknet";
var program = new Command();
var getConfig = (network) => {
  return {
    provider: new RpcProvider({
      nodeUrl: "https://starknet-mainnet.public.blastapi.io"
    }),
    network,
    stage: "production"
  };
};
async function createStore() {
  console.log(chalk.blue.bold("Welcome to the Account Secure project for Starknet!"));
  const networkAnswers = await inquirer.prompt([
    {
      type: "list",
      name: "network",
      message: chalk.yellow("What is the network?"),
      choices: ["mainnet", "sepolia", "devnet"]
    }
  ]);
  const network = networkAnswers.network;
  const defaultStoreConfig = getDefaultStoreConfig(network);
  const storeConfigAnswers = await inquirer.prompt([
    {
      type: "input",
      name: "secrets_folder",
      message: chalk.yellow(`What is your secrets folder? (${defaultStoreConfig.SECRET_FILE_FOLDER})`),
      default: defaultStoreConfig.SECRET_FILE_FOLDER,
      validate: (input) => true
    },
    {
      type: "input",
      name: "accounts_file",
      message: chalk.yellow(`What is your accounts file? (${defaultStoreConfig.ACCOUNTS_FILE_NAME})`),
      default: defaultStoreConfig.ACCOUNTS_FILE_NAME,
      validate: (input) => true
    },
    {
      type: "input",
      name: "encryption_password",
      message: chalk.yellow(`What is your decryption password? (To generate one, press enter)`),
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
  const accountAnswers = await inquirer.prompt([
    {
      type: "input",
      name: "account_key",
      message: chalk.yellow(`Provide a unique account key`),
      validate: (input) => input.length > 0 && !existingAccountKeys.includes(input) || "Please enter a unique account key"
    },
    {
      type: "input",
      name: "address",
      message: chalk.yellow(`What is your account address?`),
      validate: (input) => input.length > 0 || "Please enter a valid address"
    },
    {
      type: "input",
      name: "pk",
      message: chalk.yellow(`What is your account private key?`),
      validate: (input) => input.length > 0 || "Please enter a valid pk"
    }
  ]);
  const address = accountAnswers.address;
  const pk = accountAnswers.pk;
  const account_key = accountAnswers.account_key;
  store.addAccount(account_key, address, pk);
  console.log(`${chalk.blue("Account added:")} ${account_key} to network: ${store.config.network}`);
});
program.description("List account names of a network").command("list-accounts").action(async (options) => {
  const store = await createStore();
  const accounts = store.listAccounts();
  console.log(`${chalk.blue("Account keys:")} ${accounts.join(", ")}`);
});
program.description("List account names of a network").command("get-account").action(async (options) => {
  const store = await createStore();
  const existingAccountKeys = store.listAccounts();
  const accountAnswers = await inquirer.prompt([
    {
      type: "input",
      name: "account_key",
      message: chalk.yellow(`Provide a unique account key`),
      validate: (input) => input.length > 0 && existingAccountKeys.includes(input) || "Please enter a value account key"
    }
  ]);
  const account = store.getAccount(accountAnswers.account_key);
  console.log(`${chalk.blue("Account Address:")} ${account.address}`);
});
program.action(() => {
  program.help();
});
program.parse(process.argv);
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
