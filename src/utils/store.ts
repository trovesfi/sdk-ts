import { IConfig } from '@/interfaces/common';
import { readFileSync } from 'fs';
import { Account } from 'starknet';

export interface StoreConfig {
    SECRET_FILE_FOLDER: string,
    NETWORK: string
}

export class Store {
    readonly config: IConfig;
    readonly storeConfig: StoreConfig;

    constructor(config: IConfig, storeConfig: StoreConfig) {
        this.config = config;
        this.storeConfig = storeConfig;
    }

    getAccount() {
        let data = JSON.parse(readFileSync(`${this.storeConfig.SECRET_FILE_FOLDER}/account_${process.env.NETWORK}.json`, {
            encoding: 'utf-8'
        }));
        return new Account(<any>this.config.provider, data.address, data.pk);
    }
}