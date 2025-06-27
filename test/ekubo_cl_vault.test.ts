import {
  CLVaultStrategySettings,
  EkuboCLVault,
} from "../dist";
import { ContractAddr, Web3Number } from "../dist";
import { RpcProvider } from "starknet";
import { IConfig, IStrategyMetadata, Network } from "../dist";
import { Global, PricerFromApi } from "dist";

const mockConfig: IConfig = {
  provider: new RpcProvider({
    nodeUrl: 'https://starknet-mainnet.public.blastapi.io/'
  }),
  network: Network.mainnet,
  stage: "production",
};
const mockPricer = new PricerFromApi(mockConfig, Global.getDefaultTokens());
const _mockMetadata: IStrategyMetadata<CLVaultStrategySettings> = {
  name: "Test",
  address: ContractAddr.from("0x0351b36d0d9d8b40010658825adeeddb1397436cd41acd0ff6c6e23aaa8b5b30"),
  description: "Test strategy",
  depositTokens: [
    Global.getDefaultTokens().find((token) => token.symbol === "STRK")!,
    Global.getDefaultTokens().find((token) => token.symbol === "USDC")!,
  ],
  additionalInfo: {
    feeBps: 1000,
    newBounds: { lower: -1, upper: 1 },
    rebalanceConditions: {
      customShouldRebalance: async () => true,
      minWaitHours: 1,
      direction: "any",
    },
  },
  launchBlock: 0,
  type: "Other",
  protocols: [],
  auditUrl: "",
  maxTVL: Web3Number.fromWei("0", 18),
  risk: { riskFactor: [], netRisk: 0, notARisks: [] },
  apyMethodology: "",
  faqs: [],
  points: [],
  contractDetails: [],
  investmentSteps: [],
};

describe("EkuboCLVault.getSwapInfoGivenAmounts", () => {
  it("should return a SwapInfo object for valid input", async () => {
    // Mocks
    const mockMetadata = _mockMetadata;
    const vault = new EkuboCLVault(mockConfig, mockPricer, mockMetadata);

    // PoolKey and balances
    const poolKey = {
      token0: mockMetadata.depositTokens[0].address,
      token1: mockMetadata.depositTokens[1].address,
      fee: "170141183460469235273462165868118016",
      tick_spacing: "1000",
      extension: "0",
    };
    const token0Bal = new Web3Number(
      "4.805677847956755887",
      mockMetadata.depositTokens[0].decimals
    );
    const token1Bal = new Web3Number(
      "0.597674",
      mockMetadata.depositTokens[1].decimals
    );
    const bounds = { lowerTick: -30038000n, upperTick: -29736000n };
    // Run
    const result = await vault.getSwapInfoGivenAmounts(
      poolKey,
      token0Bal,
      token1Bal,
      bounds,
      20
    );
    // expect(result).toEqual({ swap: true });
  });

  // test ETH/USDC
  it("should return a SwapInfo object for ETH/USDC", async () => {
    // Mocks
    let mockMetadata = {
      ..._mockMetadata,
      address: ContractAddr.from("0x160d8fa4569ef6a12e6bf47cb943d7b5ebba8a41a69a14c1d943050ba5ff947"),
      depositTokens: [
        Global.getDefaultTokens().find((token) => token.symbol === "ETH")!,
        Global.getDefaultTokens().find((token) => token.symbol === "USDC")!,
      ]
    }
    const vault = new EkuboCLVault(mockConfig, mockPricer, mockMetadata);

    // PoolKey and balances
    const poolKey = {
      token0: Global.getDefaultTokens().find((token) => token.symbol === "ETH")!.address,
      token1: Global.getDefaultTokens().find((token) => token.symbol === "USDC")!.address,
      fee: "170141183460469235273462165868118016",
      tick_spacing: "1000",
      extension: "0",
    };
    const token0Bal = new Web3Number(
      Number(0.00397977912695056).toFixed(18),
      Global.getDefaultTokens().find((token) => token.symbol === "ETH")!.decimals
    );
    const token1Bal = new Web3Number(
      "14.557182",
      Global.getDefaultTokens().find((token) => token.symbol === "USDC")!.decimals
    );
    const bounds = { lowerTick: -19987000n, upperTick: -19685000n };
    // Run
    const result = await vault.getSwapInfoGivenAmounts(
      poolKey,
      token0Bal,
      token1Bal,
      bounds,
      50
    );
    // expect(result).toEqual({ swap: true });
  }, 30000);
});
