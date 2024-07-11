import { ContractAddr, Pricer, ZkLend } from "../src/index";
import { Global } from "../src/global";
import { IConfig } from "../src/interfaces/common";
import { RpcProvider } from "starknet";

describe('zkLend', () => {
    const USER1 = ContractAddr.from('0x05b55db55f5884856860e63f3595b2ec6b2c9555f3f507b4ca728d8e427b7864')
    let config: IConfig = {
        provider: new RpcProvider({
            nodeUrl: 'https://starknet-mainnet.public.blastapi.io'
        })
    }
    let pricer: Pricer;
    beforeAll(async () => {
        const tokens = await Global.getTokens();
        pricer = new Pricer(config, tokens);
        pricer.start();
        await pricer.waitTillReady();
    });

    it('hf with some positions', async () => {
        const zkLend = new ZkLend(config, pricer);
        await zkLend.waitForInitilisation();
        const hf = await zkLend.get_health_factor(USER1);
        expect(hf).toBeGreaterThan(1);
    });

    /**
     * TODO:
     * 1. Check math for outlier tokens like ZEND, DAIV0, DAI, also
     * 2. HF with no debt
     * 3. HF with no col or debt positions
     * 4. Mock getPositions function and check hf compute is expected
     */
});