import { Account } from "starknet";
import { Global, IConfig } from "..";
import { readFileSync } from "fs";

export class Store {

    static getAccount(config: IConfig) {
        Global.assert(process.env.SECRET_FILE_FOLDER, 'invalid SECRET_FILE_FOLDER')
        Global.assert(process.env.NETWORK, 'invalid NETWORK')
        let data = JSON.parse(readFileSync(`${process.env.SECRET_FILE_FOLDER}/account_${process.env.NETWORK}.json`, {
            encoding: 'utf-8'
        }));
        return new Account(config.provider, data.address, data.pk);
    }
}