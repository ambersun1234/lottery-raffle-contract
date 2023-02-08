import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "hardhat-deploy";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    goerli: {
      url: process.env.GOERLI_RPC_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      saveDeployments: true,
      chainId: 5,
      gasPrice: 15 * 1000000000
    },
  },
  namedAccounts: {
    deployer: { default: 0 },
    player: { default: 1 },
  },
  mocha: {
    timeout: 300000,
  },
};

export default config;
